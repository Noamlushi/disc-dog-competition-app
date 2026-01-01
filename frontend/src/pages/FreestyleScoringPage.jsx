import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Star, Gavel, Timer, Check, X, ClipboardType } from 'lucide-react';

export default function FreestyleScoringPage() {
    const { id, teamId } = useParams();
    const navigate = useNavigate();

    const [team, setTeam] = useState(null);
    const [judgeRole, setJudgeRole] = useState(null); // 'dog', 'player', 'team', 'execution', null
    const [timeLeft, setTimeLeft] = useState(120);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    // Scores State
    const [dogScores, setDogScores] = useState({ prey: 0, retrieve: 0, athleticism: 0, grip: 0 });
    const [playerScores, setPlayerScores] = useState({ fieldPresentation: 0, releases: 0, discManagement: 0, flow: 0 });
    const [teamScores, setTeamScores] = useState({
        over: 0, vault: 0, multipull: 0, dogCatch: 0,
        teamMovement: 0, passing: 0, distanceMovement: 0
    });
    const [executionScores, setExecutionScores] = useState({ throws: 0, catches: 0 });

    useEffect(() => {
        fetch(`http://localhost:3000/api/competitions/${id}/teams`)
            .then(res => res.json())
            .then(teams => {
                const foundTeam = teams.find(t => t._id === teamId);
                setTeam(foundTeam);

                // Load existing scores if present
                const reg = foundTeam?.registrations?.find(r => r.runType === 'Freestyle');
                if (reg?.freestyle) {
                    if (reg.freestyle.dog) setDogScores(prev => ({ ...prev, ...reg.freestyle.dog }));
                    if (reg.freestyle.player) setPlayerScores(prev => ({ ...prev, ...reg.freestyle.player }));
                    if (reg.freestyle.team) setTeamScores(prev => ({ ...prev, ...reg.freestyle.team }));
                    if (reg.freestyle.execution) setExecutionScores(prev => ({ ...prev, ...reg.freestyle.execution }));
                }
            });
    }, [id, teamId]);

    // Timer Logic
    useEffect(() => {
        let interval;
        if (isTimerRunning && timeLeft > 0) {
            interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
        } else if (timeLeft === 0) {
            setIsTimerRunning(false);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, timeLeft]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleSave = async () => {
        if (!team) return;

        // Calculate Totals for Summary (Optional client-side calc)
        // Note: Real calc happens during export or final tally, but we save granular here.

        const updatedRegistrations = team.registrations.map(reg => {
            if (reg.runType === 'Freestyle') {
                return {
                    ...reg,
                    status: 'completed',
                    freestyle: {
                        ...reg.freestyle,
                        // Only update the section for the current judge role
                        topLevelUpdate: true, // Marker
                        ...(judgeRole === 'dog' && { dog: dogScores }),
                        ...(judgeRole === 'player' && { player: playerScores }),
                        ...(judgeRole === 'team' && { team: teamScores }),
                        ...(judgeRole === 'execution' && { execution: executionScores }),
                    }
                };
            }
            return reg;
        });

        // We need to fetch latest first to merge? Or assume backend handles merge?
        // Simple put replacs entire object usually. 
        // For robustness in this MVP w/o optimistic concurrency: 
        // We actually map over the EXISTING 'team' state which we fetched on mount.
        // Issue: If 4 judges edit simultaneously, they overwrite each other.
        // FIX: Ideally separate endpoints or atomic updates. 
        // For MVP: We will assume sequential saving or risk overwrite.
        // BETTER MVP FIX: Re-fetch before save inside handleSave?
        // Let's implement a re-fetch merge strategy.

        try {
            // 1. Re-fetch fresh team data
            const res = await fetch(`http://localhost:3000/api/competitions/${id}/teams`);
            const latestTeams = await res.json();
            const latestTeam = latestTeams.find(t => t._id === teamId);
            const latestReg = latestTeam.registrations.find(r => r.runType === 'Freestyle');
            const currentFreestyle = latestReg?.freestyle || {};

            // 2. Merge local changes
            const mergedFreestyle = {
                ...currentFreestyle,
                ...(judgeRole === 'dog' && { dog: dogScores }),
                ...(judgeRole === 'player' && { player: playerScores }),
                ...(judgeRole === 'team' && { team: teamScores }),
                ...(judgeRole === 'execution' && { execution: executionScores }),
            };

            // 3. Calculate New Total Score
            const dog = mergedFreestyle.dog || {};
            const dogTotal = (dog.prey || 0) + (dog.retrieve || 0) + (dog.athleticism || 0) + (dog.grip || 0);

            const player = mergedFreestyle.player || {};
            const playerTotal = (player.fieldPresentation || 0) + (player.releases || 0) + (player.discManagement || 0) + (player.flow || 0);

            const teamObj = mergedFreestyle.team || {};
            const teamTotal = Object.values(teamObj).sort((a, b) => b - a).slice(0, 4).reduce((a, b) => a + b, 0);

            const exec = mergedFreestyle.execution || {};
            const execRatio = exec.throws > 0 ? (exec.catches / exec.throws) : 0;
            const execTotal = execRatio * 10;

            const newTotalScore = dogTotal + playerTotal + teamTotal + execTotal;

            const newRegs = latestTeam.registrations.map(r => {
                if (r.runType === 'Freestyle') {
                    return {
                        ...r,
                        status: 'completed',
                        totalScore: newTotalScore, // IMPLICITLY SAVE TOTAL
                        freestyle: mergedFreestyle
                    };
                }
                return r;
            });

            // 3. Save
            await fetch(`http://localhost:3000/api/teams/${teamId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ registrations: newRegs }),
            });

            alert('Score saved successfully!');
            setJudgeRole(null); // Return to menu
        } catch (err) {
            console.error(err);
            alert('Failed to save score');
        }
    };

    // --- Sub-Components ---

    // --- Sub-Components ---
    // (ScoreSlider removed)

    const StepScore = ({ label, value, onChange }) => {
        const update = (delta) => {
            let newVal = value + delta;
            newVal = Math.round(newVal * 10) / 10;
            if (newVal < 0) newVal = 0;
            if (newVal > 2.5) newVal = 2.5;
            onChange(newVal);
        };

        return (
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow border border-gray-100 dark:border-slate-700 mb-4 transition-colors">
                <label className="block font-bold text-lg text-gray-700 dark:text-gray-300 mb-2">{label}</label>
                <div className="flex justify-between items-center gap-2">
                    <div className="flex gap-1">
                        <button onClick={() => update(-1.0)} className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-200 dark:hover:bg-slate-600 active:scale-95 transition-all">-1</button>
                        <button onClick={() => update(-0.1)} className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-200 dark:hover:bg-slate-600 active:scale-95 transition-all">-.1</button>
                    </div>

                    <input
                        type="number"
                        min="0" max="2.5" step="0.1"
                        value={value}
                        onChange={(e) => {
                            let val = parseFloat(e.target.value);
                            if (isNaN(val)) val = 0;
                            if (val > 2.5) val = 2.5;
                            if (val < 0) val = 0;
                            onChange(val);
                        }}
                        className="w-20 h-12 text-center text-3xl font-black text-blue-900 dark:text-blue-400 border-b-2 border-blue-100 dark:border-blue-800 bg-transparent focus:border-blue-500 outline-none"
                    />

                    <div className="flex gap-1">
                        <button onClick={() => update(0.1)} className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 active:scale-95 transition-all">+.1</button>
                        <button onClick={() => update(1.0)} className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold hover:bg-blue-200 dark:hover:bg-blue-900/60 active:scale-95 transition-all">+1</button>
                    </div>
                </div>
            </div>
        );
    };

    // --- Render ---

    if (!team) return <div className="p-8 text-center text-xl">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-20 transition-colors duration-300">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 shadow sticky top-0 z-10 transition-colors">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <button onClick={() => judgeRole ? setJudgeRole(null) : navigate(`/competition/${id}/judge?run=Freestyle`)} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2">
                        <ArrowLeft size={20} /> Back
                    </button>
                    <div className="text-center">
                        <h1 className="font-bold text-xl dark:text-white">{team.ownerName} & {team.dogName}</h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Freestyle</p>
                    </div>
                    {/* Timer */}
                    <div
                        onClick={() => setIsTimerRunning(!isTimerRunning)}
                        className={`px-4 py-2 rounded-lg font-mono text-2xl font-black cursor-pointer select-none ${timeLeft <= 10
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200'
                            }`}
                    >
                        {formatTime(timeLeft)}
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-2xl">

                {/* ROLE SELECTION view */}
                {!judgeRole && (
                    <div className="grid grid-cols-1 gap-6">
                        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-4">Select Judge Role</h2>

                        <button onClick={() => setJudgeRole('dog')} className="p-8 bg-white dark:bg-slate-800 rounded-2xl shadow hover:shadow-lg transition-all border-l-8 border-yellow-500 flex items-center gap-6">
                            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded-full text-yellow-700 dark:text-yellow-500"><Star size={32} /></div>
                            <div className="text-left">
                                <h3 className="text-2xl font-black text-gray-800 dark:text-white">Dog Judge</h3>
                                <p className="text-gray-500 dark:text-gray-400">Prey, Retrieve, Athleticism, Grip</p>
                            </div>
                        </button>

                        <button onClick={() => setJudgeRole('player')} className="p-8 bg-white dark:bg-slate-800 rounded-2xl shadow hover:shadow-lg transition-all border-l-8 border-blue-500 flex items-center gap-6">
                            <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full text-blue-700 dark:text-blue-400"><Gavel size={32} /></div>
                            <div className="text-left">
                                <h3 className="text-2xl font-black text-gray-800 dark:text-white">Player Judge</h3>
                                <p className="text-gray-500 dark:text-gray-400">Presentation, Releases, Flow...</p>
                            </div>
                        </button>

                        <button onClick={() => setJudgeRole('team')} className="p-8 bg-white dark:bg-slate-800 rounded-2xl shadow hover:shadow-lg transition-all border-l-8 border-purple-500 flex items-center gap-6">
                            <div className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-full text-purple-700 dark:text-purple-400"><ClipboardType size={32} /></div>
                            <div className="text-left">
                                <h3 className="text-2xl font-black text-gray-800 dark:text-white">Team Judge</h3>
                                <p className="text-gray-500 dark:text-gray-400">Elements (Over, Vault, Multipull...)</p>
                            </div>
                        </button>

                        <button onClick={() => setJudgeRole('execution')} className="p-8 bg-white dark:bg-slate-800 rounded-2xl shadow hover:shadow-lg transition-all border-l-8 border-green-500 flex items-center gap-6">
                            <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full text-green-700 dark:text-green-400"><Check size={32} /></div>
                            <div className="text-left">
                                <h3 className="text-2xl font-black text-gray-800 dark:text-white">Execution Judge</h3>
                                <p className="text-gray-500 dark:text-gray-400">Catch Ratio Counter</p>
                            </div>
                        </button>
                    </div>
                )}

                {/* DOG JUDGE */}
                {judgeRole === 'dog' && (
                    <div className="space-y-8">
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800 mb-6 text-yellow-800 dark:text-yellow-400 font-bold flex items-center gap-2">
                            <Star size={20} /> Dog Judge Interface
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow space-y-4 transition-colors">
                            <StepScore label="Prey Drive" value={dogScores.prey} onChange={v => setDogScores(p => ({ ...p, prey: v }))} />
                            <StepScore label="Retrieving" value={dogScores.retrieve} onChange={v => setDogScores(p => ({ ...p, retrieve: v }))} />
                            <StepScore label="Athleticism" value={dogScores.athleticism} onChange={v => setDogScores(p => ({ ...p, athleticism: v }))} />
                            <StepScore label="Grip" value={dogScores.grip} onChange={v => setDogScores(p => ({ ...p, grip: v }))} />

                            <div className="mt-8 pt-6 border-t dark:border-slate-700 flex justify-between items-center">
                                <span className="font-bold text-gray-500 dark:text-gray-400">Total Dog Score</span>
                                <span className="text-3xl font-black text-yellow-600 dark:text-yellow-500">
                                    {(dogScores.prey + dogScores.retrieve + dogScores.athleticism + dogScores.grip).toFixed(1)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* PLAYER JUDGE */}
                {judgeRole === 'player' && (
                    <div className="space-y-8">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800 mb-6 text-blue-800 dark:text-blue-400 font-bold flex items-center gap-2">
                            <Gavel size={20} /> Player Judge Interface
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow space-y-4 transition-colors">
                            <StepScore label="Field Presentation" value={playerScores.fieldPresentation} onChange={v => setPlayerScores(p => ({ ...p, fieldPresentation: v }))} />
                            <StepScore label="Releases & Throws" value={playerScores.releases} onChange={v => setPlayerScores(p => ({ ...p, releases: v }))} />
                            <StepScore label="Disc Management" value={playerScores.discManagement} onChange={v => setPlayerScores(p => ({ ...p, discManagement: v }))} />
                            <StepScore label="Flow (Joint Movement)" value={playerScores.flow} onChange={v => setPlayerScores(p => ({ ...p, flow: v }))} />

                            <div className="mt-8 pt-6 border-t dark:border-slate-700 flex justify-between items-center">
                                <span className="font-bold text-gray-500 dark:text-gray-400">Total Player Score</span>
                                <span className="text-3xl font-black text-blue-600 dark:text-blue-400">
                                    {(playerScores.fieldPresentation + playerScores.releases + playerScores.discManagement + playerScores.flow).toFixed(1)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* TEAM JUDGE */}
                {judgeRole === 'team' && (
                    <div className="space-y-8">
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800 mb-6 text-purple-800 dark:text-purple-400 font-bold flex items-center gap-2">
                            <ClipboardType size={20} /> Team Elements (Score 0-2.5)
                        </div>
                        <div className="space-y-4">
                            <StepScore label="Over" value={teamScores.over} onChange={v => setTeamScores(p => ({ ...p, over: v }))} />
                            <StepScore label="Vault" value={teamScores.vault} onChange={v => setTeamScores(p => ({ ...p, vault: v }))} />
                            <StepScore label="Multipull" value={teamScores.multipull} onChange={v => setTeamScores(p => ({ ...p, multipull: v }))} />
                            <StepScore label="Dog Catch" value={teamScores.dogCatch} onChange={v => setTeamScores(p => ({ ...p, dogCatch: v }))} />
                            <StepScore label="Team Movement" value={teamScores.teamMovement} onChange={v => setTeamScores(p => ({ ...p, teamMovement: v }))} />
                            <StepScore label="Passing" value={teamScores.passing} onChange={v => setTeamScores(p => ({ ...p, passing: v }))} />
                            <StepScore label="Distance Movement" value={teamScores.distanceMovement} onChange={v => setTeamScores(p => ({ ...p, distanceMovement: v }))} />

                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow mt-6 transition-colors">
                                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Note: System automatically counts Top 4 elements</div>
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-gray-500 dark:text-gray-400">Calculated Score</span>
                                    <span className="text-3xl font-black text-purple-600 dark:text-purple-400">
                                        {(
                                            Object.values(teamScores)
                                                .sort((a, b) => b - a) // Sort descending
                                                .slice(0, 4) // Take top 4
                                                .reduce((a, b) => a + b, 0)
                                        ).toFixed(1)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* EXECUTION JUDGE */}
                {judgeRole === 'execution' && (
                    <div className="space-y-8">
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800 mb-6 text-green-800 dark:text-green-400 font-bold flex items-center gap-2">
                            <Check size={20} /> Execution Judge (Ratio)
                        </div>

                        {/* Score Display */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow text-center mb-6 transition-colors">
                            <div className="flex justify-between items-center mb-4">
                                <span className="font-bold text-gray-500 dark:text-gray-400">Execution Score (Max 10)</span>
                                <span className="text-4xl font-black text-green-600 dark:text-green-400">
                                    {executionScores.throws > 0
                                        ? ((executionScores.catches / executionScores.throws) * 10).toFixed(2)
                                        : '0.00'
                                    }
                                </span>
                            </div>
                            <div className="flex justify-center gap-8 text-sm text-gray-500 dark:text-gray-400 font-mono">
                                <div>Throws: <span className="font-bold text-gray-800 dark:text-gray-200">{executionScores.throws}</span></div>
                                <div>Catches: <span className="font-bold text-green-600 dark:text-green-400">{executionScores.catches}</span></div>
                                <div>Misses: <span className="font-bold text-red-500 dark:text-red-400">{executionScores.throws - executionScores.catches}</span></div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-6">
                            <button
                                onClick={() => setExecutionScores(p => ({ throws: p.throws + 1, catches: p.catches + 1 }))}
                                className="py-8 bg-green-500 hover:bg-green-600 text-white rounded-2xl shadow-lg active:scale-95 transition-all flex flex-col items-center justify-center gap-2"
                            >
                                <Check size={48} />
                                <span className="text-2xl font-black">CATCH</span>
                                <span className="text-sm opacity-90">(+1 Throw, +1 Catch)</span>
                            </button>

                            <button
                                onClick={() => setExecutionScores(p => ({ ...p, throws: p.throws + 1 }))}
                                className="py-8 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl border-2 border-red-200 dark:border-red-900/50 hover:bg-red-200 dark:hover:bg-red-900/40 active:scale-95 transition-all flex flex-col items-center justify-center gap-2"
                            >
                                <X size={48} />
                                <span className="text-2xl font-black">MISS</span>
                                <span className="text-sm opacity-75">(+1 Throw)</span>
                            </button>
                        </div>

                        {/* Manual Adjustments */}
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="text-center">
                                <span className="text-xs text-gray-400 uppercase">Adjust Catch</span>
                                <div className="flex justify-center gap-2 mt-1">
                                    <button onClick={() => setExecutionScores(p => ({ ...p, catches: Math.max(0, p.catches - 1), throws: Math.max(0, p.throws - 1) }))} className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-slate-600">-</button>
                                </div>
                            </div>
                            <div className="text-center">
                                <span className="text-xs text-gray-400 uppercase">Adjust Miss</span>
                                <div className="flex justify-center gap-2 mt-1">
                                    <button onClick={() => setExecutionScores(p => ({ ...p, throws: Math.max(0, p.throws - 1) }))} className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-slate-600">-</button>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

            </div>

            {/* Sticky Save Button (only when role selected) */}
            {judgeRole && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-800 border-t dark:border-slate-700 transition-colors">
                    <div className="container mx-auto max-w-2xl">
                        <button
                            onClick={handleSave}
                            className="w-full py-4 bg-gray-900 dark:bg-slate-700 text-white text-xl font-bold rounded-xl shadow-lg hover:bg-gray-800 dark:hover:bg-slate-600 flex items-center justify-center gap-2"
                        >
                            <Save size={24} /> Save {judgeRole.charAt(0).toUpperCase() + judgeRole.slice(1)} Score
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
