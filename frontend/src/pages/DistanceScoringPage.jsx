import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, X } from 'lucide-react';

export default function DistanceScoringPage() {
    const { id, teamId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const runType = searchParams.get('runType') || 'Distance Beginners';

    const [team, setTeam] = useState(null);
    const [competition, setCompetition] = useState(null);
    const [attempts, setAttempts] = useState([]);
    const [isAirborne, setIsAirborne] = useState(false);
    const [isSweetSpot, setIsSweetSpot] = useState(false);

    useEffect(() => {
        // Fetch team data
        fetch(`http://localhost:3000/api/competitions/${id}/teams`)
            .then(res => res.json())
            .then(teams => {
                const foundTeam = teams.find(t => t._id === teamId);
                setTeam(foundTeam);

                // Load existing attempts if any
                const distanceReg = foundTeam?.registrations?.find(r => r.runType === runType);
                if (distanceReg?.attempts) {
                    setAttempts(distanceReg.attempts.map((a, idx) => ({ ...a, id: idx })));
                }
            });

        // Fetch competition data
        fetch(`http://localhost:3000/api/competitions/${id}`)
            .then(res => res.json())
            .then(data => setCompetition(data));
    }, [id, teamId]);

    const handleZoneClick = (zone) => {
        // Calculate points for this throw
        let points = 0;

        // Base points by zone
        if (zone === 1) points = 0;
        else if (zone === 2) points = 1;
        else if (zone === 3) points = 2;
        else if (zone === 4) points = 3;
        else if (zone === 5) points = 4;

        // Add bonuses
        if (isAirborne) points += 0.5;
        if (isSweetSpot) points += 0.5;

        // Create new attempt
        const newAttempt = {
            id: Date.now(),
            zone,
            jump: isAirborne,
            bonusZone: isSweetSpot,
            points,
            isFootFault: false
        };

        setAttempts([...attempts, newAttempt]);

        // Reset toggles after adding
        setIsAirborne(false);
        setIsSweetSpot(false);
    };

    const handleDeleteAttempt = (attemptId) => {
        setAttempts(attempts.filter(a => a.id !== attemptId));
    };

    // Calculate final score: top 5 throws, max 25 points
    const calculateFinalScore = () => {
        const sorted = [...attempts].sort((a, b) => b.points - a.points);
        const top5 = sorted.slice(0, 5);
        const sum = top5.reduce((total, a) => total + a.points, 0);
        return Math.min(sum, 25.0);
    };

    const handleSave = async () => {
        if (!team) return;

        const finalScore = calculateFinalScore();

        // Update the Distance registration
        const updatedRegistrations = team.registrations.map(reg => {
            if (reg.runType === runType) {
                return {
                    ...reg,
                    status: 'completed',
                    totalScore: finalScore,
                    attempts: attempts.map(({ id, ...rest }) => rest) // Remove temporary id
                };
            }
            return reg;
        });

        try {
            await fetch(`http://localhost:3000/api/teams/${teamId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ registrations: updatedRegistrations }),
            });
            alert('Score saved successfully!');
            navigate(`/competition/${id}/judge?run=${encodeURIComponent(runType)}`);
        } catch (err) {
            console.error('Failed to save:', err);
            alert('Failed to save score');
        }
    };

    if (!team || !competition) {
        return <div className="p-8 text-center text-xl">Loading...</div>;
    }

    const finalScore = calculateFinalScore();
    const totalCatches = attempts.length;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-20 transition-colors duration-300">
            {/* Sticky Header */}
            <div className="sticky top-0 z-50 bg-white dark:bg-slate-800 shadow-md border-b-2 border-blue-900 dark:border-blue-700 transition-colors">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-2 font-semibold"
                        >
                            <ArrowLeft size={20} /> Back
                        </button>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                            {team.ownerName} & {team.dogName}
                        </h1>
                        <div className="w-20"></div>
                    </div>

                    <div className="flex items-center justify-center gap-8">
                        <div className="text-center">
                            <div className="text-sm text-gray-500 dark:text-gray-400 font-semibold mb-1">Final Score</div>
                            <div className="text-5xl font-black text-blue-900 dark:text-blue-400">
                                {finalScore.toFixed(1)}
                                <span className="text-2xl text-gray-400 dark:text-gray-600 font-normal"> / 25.0</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-sm text-gray-500 dark:text-gray-400 font-semibold mb-1">Attempts</div>
                            <div className="text-5xl font-black text-gray-700 dark:text-gray-300">{totalCatches}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Bonus Toggles */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <button
                        onClick={() => setIsAirborne(!isAirborne)}
                        className={`py-4 px-6 rounded-lg text-lg font-bold border-2 transition-all ${isAirborne
                            ? 'bg-blue-900 dark:bg-blue-700 border-blue-900 dark:border-blue-700 text-white'
                            : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:border-blue-400 dark:hover:border-blue-500'
                            }`}
                    >
                        Airborne Catch (+0.5)
                    </button>
                    <button
                        onClick={() => setIsSweetSpot(!isSweetSpot)}
                        className={`py-4 px-6 rounded-lg text-lg font-bold border-2 transition-all ${isSweetSpot
                            ? 'bg-orange-600 border-orange-600 text-white'
                            : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:border-orange-400 dark:hover:border-orange-500'
                            }`}
                    >
                        Bonus (+0.5)
                    </button>
                </div>

                {/* Field Layout - Zones from 5 (top/far) to 1 (bottom/near) */}
                <div className="space-y-3 mb-8">
                    <div className="text-center text-sm text-gray-500 dark:text-gray-400 font-semibold mb-2">← Far</div>

                    {[5, 4, 3, 2, 1].map(zone => (
                        <button
                            key={zone}
                            onClick={() => handleZoneClick(zone)}
                            className={`w-full py-8 rounded-xl text-4xl font-black text-white shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-between px-8 ${zone === 5 ? 'bg-gradient-to-r from-amber-500 to-orange-600' :
                                zone === 4 ? 'bg-gradient-to-r from-purple-500 to-violet-600' :
                                    zone === 3 ? 'bg-gradient-to-r from-blue-500 to-indigo-600' :
                                        zone === 2 ? 'bg-gradient-to-r from-sky-400 to-blue-500' :
                                            'bg-gradient-to-r from-gray-400 to-gray-500 dark:from-gray-600 dark:to-gray-700'
                                }`}
                        >
                            <span className="text-6xl">{zone}</span>
                            <span className="text-2xl font-bold opacity-90">
                                {zone === 1 ? '0 points' : `${zone - 1} points`}
                            </span>
                        </button>
                    ))}

                    <div className="text-center text-sm text-gray-500 dark:text-gray-400 font-semibold mt-2">Near (Throwing Line) →</div>

                    {/* Miss and Foot Fault Buttons */}
                    <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t-2 border-gray-300 dark:border-slate-700">
                        <button
                            onClick={() => {
                                const newAttempt = {
                                    id: Date.now(),
                                    zone: 0,
                                    jump: false,
                                    bonusZone: false,
                                    points: 0,
                                    isFootFault: false
                                };
                                setAttempts([...attempts, newAttempt]);
                            }}
                            className="py-6 rounded-xl text-2xl font-bold bg-gradient-to-r from-gray-300 to-gray-400 dark:from-slate-600 dark:to-slate-500 text-gray-700 dark:text-white shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Miss (0 pts)
                        </button>
                        <button
                            onClick={() => {
                                const newAttempt = {
                                    id: Date.now(),
                                    zone: 0,
                                    jump: false,
                                    bonusZone: false,
                                    points: 0,
                                    isFootFault: true
                                };
                                setAttempts([...attempts, newAttempt]);
                            }}
                            className="py-6 rounded-xl text-2xl font-bold bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Foot Fault
                        </button>
                    </div>
                </div>

                {/* Attempts List */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 mb-6 transition-colors">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center justify-between">
                        <span>Attempts List</span>
                        <span className="bg-blue-900 dark:bg-blue-700 text-white px-4 py-1 rounded-full text-sm">{attempts.length}</span>
                    </h3>

                    {attempts.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                            Click a zone to start recording
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {attempts.map((attempt, idx) => (
                                <div
                                    key={attempt.id}
                                    className="flex items-center justify-between bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="text-gray-400 dark:text-gray-500 font-mono font-bold text-sm bg-white dark:bg-slate-800 px-2 py-1 rounded border dark:border-slate-600">
                                            #{idx + 1}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {attempt.isFootFault ? (
                                                <span className="font-bold text-red-600 dark:text-red-400">Foot Fault</span>
                                            ) : attempt.zone === 0 ? (
                                                <span className="font-bold text-gray-500 dark:text-gray-400">Miss</span>
                                            ) : (
                                                <>
                                                    <span className="font-bold text-gray-700 dark:text-gray-200">Zone {attempt.zone}</span>
                                                    {attempt.jump && <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-semibold">Airborne</span>}
                                                    {attempt.bonusZone && <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded text-xs font-semibold">Bonus</span>}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-2xl font-black text-blue-900 dark:text-blue-400">
                                            {attempt.points.toFixed(1)}
                                        </div>
                                        <button
                                            onClick={() => handleDeleteAttempt(attempt.id)}
                                            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                            title="Delete"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-5 rounded-xl text-2xl font-bold shadow-lg flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Save size={28} />
                    Save Result
                </button>
            </div>
        </div>
    );
}
