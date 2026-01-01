import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Play, Square, RotateCcw } from 'lucide-react';

export default function FrisagilityScoringPage() {
    const { id, teamId } = useParams();
    const navigate = useNavigate();

    const [team, setTeam] = useState(null);
    const [competition, setCompetition] = useState(null);

    // Timer State
    const [timeLeft, setTimeLeft] = useState(60000); // 60 seconds in ms
    const [isRunning, setIsRunning] = useState(false);
    const [isFinished, setIsFinished] = useState(false);

    // Scoring State
    const [actions, setActions] = useState([]); // Log of actions { id, name, points, type }
    const [isThrowUnlocked, setIsThrowUnlocked] = useState(false); // Throws unlocked only after obstacle
    // Obstacle State
    const [hurdle1Knocked, setHurdle1Knocked] = useState(false);
    const [hurdle2Knocked, setHurdle2Knocked] = useState(false);
    // Bonus State
    const [isJackpotClaimed, setIsJackpotClaimed] = useState(false);

    const timerRef = useRef(null);

    useEffect(() => {
        // Fetch team data
        fetch(`http://localhost:3000/api/competitions/${id}/teams`)
            .then(res => res.json())
            .then(teams => {
                const foundTeam = teams.find(t => t._id === teamId);
                setTeam(foundTeam);
            });

        // Fetch competition data
        fetch(`http://localhost:3000/api/competitions/${id}`)
            .then(res => res.json())
            .then(data => setCompetition(data));

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [id, teamId]);

    // Timer Logic
    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    const newTime = prev - 100; // Update every 100ms
                    if (newTime <= 0) {
                        clearInterval(timerRef.current);
                        setIsRunning(false);
                        setIsFinished(true);
                        return 0;
                    }
                    return newTime;
                });
            }, 100);
        } else if (timeLeft === 0) {
            setIsFinished(true);
            setIsRunning(false);
        }
        return () => clearInterval(timerRef.current);
    }, [isRunning]);

    const handleStart = () => {
        setIsRunning(true);
        setIsFinished(false);
    };

    const handleStop = () => {
        setIsRunning(false);
        clearInterval(timerRef.current);
    };

    // Action Handlers
    const addAction = (name, points, type, meta = {}) => {
        const newAction = {
            id: Date.now(),
            name,
            points,
            type,
            meta
        };
        setActions([newAction, ...actions]);

        // Logic: Obstacle unlocks throws, Throws lock throws (until next obstacle)
        if (type === 'obstacle') {
            setIsThrowUnlocked(true);
        } else if (type === 'throw') {
            setIsThrowUnlocked(false);
        } else if (type === 'fault_knock') {
            if (meta.hurdleId === 1) setHurdle1Knocked(true);
            if (meta.hurdleId === 2) setHurdle2Knocked(true);
        } else if (type === 'bonus') {
            setIsJackpotClaimed(true);
        }
    };

    const handleUndo = () => {
        if (actions.length === 0) return;
        const [lastAction, ...remainingActions] = actions;
        setActions(remainingActions);

        // Restore state based on previous action?
        // It's tricky to restore simple toggle state from history completely without re-playing.
        // Simplified Logic: If we undid a throw, we should arguably unlock throws again (back to obstacle state).
        // If we undid an obstacle, we should lock throws (back to pre-obstacle state).

        if (lastAction.type === 'throw') {
            setIsThrowUnlocked(true);
        } else if (lastAction.type === 'obstacle') {
            setIsThrowUnlocked(false); // Assuming we can't do throws without the obstacle we just removed
        } else if (lastAction.type === 'fault_knock') {
            if (lastAction.meta?.hurdleId === 1) setHurdle1Knocked(false);
            if (lastAction.meta?.hurdleId === 2) setHurdle2Knocked(false);
        } else if (lastAction.type === 'bonus') {
            setIsJackpotClaimed(false);
        }
    };

    const calculateTotalScore = () => {
        return actions.reduce((sum, action) => sum + action.points, 0);
    };

    const handleSave = async () => {
        if (!team) return;

        const totalScore = calculateTotalScore();

        // Update registration
        const updatedRegistrations = team.registrations.map(reg => {
            if (reg.runType === 'Frisgility') { // Keeping internal type name
                return {
                    ...reg,
                    status: 'completed',
                    totalScore: totalScore,
                    // Store actions as attempts if needed, or structured differently
                    attempts: actions.map(a => ({
                        zone: 0, // Not strictly zone based
                        points: a.points,
                        jump: false,
                        bonusZone: false
                    }))
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
            navigate(`/competition/${id}/judge?run=Frisgility`);
        } catch (err) {
            console.error('Failed to save:', err);
            alert('Failed to save score');
        }
    };

    if (!team || !competition) return <div className="p-8 text-center text-xl">Loading...</div>;

    const totalScore = calculateTotalScore();
    const seconds = Math.floor(timeLeft / 1000);
    const centiseconds = Math.floor((timeLeft % 1000) / 10);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-20 transition-colors duration-300">
            {/* Sticky Header */}
            <div className="sticky top-0 z-50 bg-white dark:bg-slate-800 shadow-md border-b-2 border-blue-900 dark:border-blue-700 transition-colors">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <button
                            onClick={() => navigate(`/competition/${id}/judge?run=Frisgility`)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-2 font-semibold"
                        >
                            <ArrowLeft size={20} /> Back
                        </button>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                            {team.ownerName} & {team.dogName}
                        </h1>
                        <div className="w-20"></div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 items-center">
                        <div className="text-center border-r border-gray-200 dark:border-slate-600">
                            <div className="text-sm text-gray-500 dark:text-gray-400 font-semibold mb-1">Total Score</div>
                            <div className="text-6xl font-black text-blue-900 dark:text-blue-400">{totalScore}</div>
                        </div>
                        <div className={`text-center ${timeLeft < 10000 && timeLeft > 0 ? 'text-red-600 dark:text-red-400 animate-pulse' : 'text-gray-800 dark:text-gray-200'}`}>
                            <div className="text-sm text-gray-500 dark:text-gray-400 font-semibold mb-1">Time Left</div>
                            <div className="text-5xl font-mono font-bold">
                                {seconds}.<span className="text-3xl">{String(centiseconds).padStart(2, '0')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6 max-w-2xl">
                {/* Timer Controls */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <button
                        onClick={handleStart}
                        disabled={isRunning || timeLeft === 0}
                        className={`py-6 rounded-xl text-2xl font-bold text-white shadow-lg transition-transform ${isRunning || timeLeft === 0 ? 'bg-gray-300 dark:bg-slate-700 cursor-not-allowed text-gray-500 dark:text-gray-500' : 'bg-green-600 hover:bg-green-700 active:scale-95'
                            }`}
                    >
                        {timeLeft === 60000 ? 'Start Run' : 'Resume'}
                    </button>
                    <button
                        onClick={handleStop}
                        disabled={!isRunning}
                        className={`py-6 rounded-xl text-2xl font-bold text-white shadow-lg transition-transform ${!isRunning ? 'bg-gray-300 dark:bg-slate-700 cursor-not-allowed text-gray-500 dark:text-gray-500' : 'bg-red-600 hover:bg-red-700 active:scale-95'
                            }`}
                    >
                        Stop Timer
                    </button>
                </div>

                {/* Main Action Grid */}
                <div className="space-y-6 mb-8">

                    {/* Obstacles Row */}
                    <div className="grid grid-cols-4 gap-3 bg-gray-100 dark:bg-slate-800 p-4 rounded-xl transition-colors">

                        {/* Hurdle 1 (Left) */}
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => addAction('Hurdle 1 Knocked', 0, 'fault_knock', { hurdleId: 1 })}
                                disabled={!isRunning || hurdle1Knocked}
                                className={`py-2 rounded font-bold text-sm border-2 transition-all ${hurdle1Knocked
                                    ? 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-900 text-red-500 dark:text-red-400 cursor-not-allowed'
                                    : !isRunning
                                        ? 'border-gray-300 dark:border-slate-600 text-gray-400 dark:text-gray-500'
                                        : 'bg-white dark:bg-slate-700 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                                    }`}
                            >
                                {hurdle1Knocked ? 'Knocked' : 'Knock'}
                            </button>
                            <button
                                onClick={() => addAction('Hurdle 1 Cleared', 5, 'obstacle')}
                                disabled={!isRunning || timeLeft === 0 || hurdle1Knocked}
                                className={`h-full py-4 rounded-lg font-bold text-white shadow-md transition-all active:scale-[0.98] flex flex-col items-center justify-center ${!isRunning || hurdle1Knocked
                                    ? 'bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-gray-500'
                                    : 'bg-gradient-to-b from-emerald-500 to-emerald-600'
                                    }`}
                            >
                                <span>Hurdle 1</span>
                                <span className="text-xs opacity-75">(5)</span>
                            </button>
                        </div>

                        {/* Tunnel (Center - Wide) */}
                        <div className="col-span-2 flex flex-col justify-end">
                            <button
                                onClick={() => addAction('Tunnel Cleared', 5, 'obstacle')}
                                disabled={!isRunning || timeLeft === 0}
                                className={`h-32 rounded-xl text-2xl font-black text-white shadow-lg transition-all transform active:scale-[0.98] flex flex-col items-center justify-center border-b-4 border-emerald-800 dark:border-emerald-900 ${!isRunning
                                    ? 'bg-gray-300 dark:bg-slate-700 border-gray-400 dark:border-slate-600 text-gray-500 dark:text-gray-500'
                                    : 'bg-gradient-to-r from-emerald-600 to-teal-600'
                                    }`}
                            >
                                <span>Tunnel</span>
                                <span className="text-lg opacity-80">(5)</span>
                            </button>
                        </div>

                        {/* Hurdle 2 (Right) */}
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => addAction('Hurdle 2 Knocked', 0, 'fault_knock', { hurdleId: 2 })}
                                disabled={!isRunning || hurdle2Knocked}
                                className={`py-2 rounded font-bold text-sm border-2 transition-all ${hurdle2Knocked
                                    ? 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-900 text-red-500 dark:text-red-400 cursor-not-allowed'
                                    : !isRunning
                                        ? 'border-gray-300 dark:border-slate-600 text-gray-400 dark:text-gray-500'
                                        : 'bg-white dark:bg-slate-700 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                                    }`}
                            >
                                {hurdle2Knocked ? 'Knocked' : 'Knock'}
                            </button>
                            <button
                                onClick={() => addAction('Hurdle 2 Cleared', 5, 'obstacle')}
                                disabled={!isRunning || timeLeft === 0 || hurdle2Knocked}
                                className={`h-full py-4 rounded-lg font-bold text-white shadow-md transition-all active:scale-[0.98] flex flex-col items-center justify-center ${!isRunning || hurdle2Knocked
                                    ? 'bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-gray-500'
                                    : 'bg-gradient-to-b from-emerald-500 to-emerald-600'
                                    }`}
                            >
                                <span>Hurdle 2</span>
                                <span className="text-xs opacity-75">(5)</span>
                            </button>
                        </div>
                    </div>

                    {/* Throw Buttons */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => addAction('Zone 1 Catch', 3, 'throw')}
                            disabled={!isRunning || !isThrowUnlocked}
                            className={`py-12 rounded-xl text-2xl font-bold text-white shadow-md transition-all active:scale-[0.98] ${!isRunning || !isThrowUnlocked
                                ? 'bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-600'
                                : 'bg-red-500 hover:bg-red-600'
                                }`}
                        >
                            Zone 1 - Red<br /><span className="text-lg opacity-90">(3 pts)</span>
                        </button>
                        <button
                            onClick={() => addAction('Zone 2 Catch', 10, 'throw')}
                            disabled={!isRunning || !isThrowUnlocked}
                            className={`py-12 rounded-xl text-2xl font-bold text-white shadow-md transition-all active:scale-[0.98] ${!isRunning || !isThrowUnlocked
                                ? 'bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-600'
                                : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                        >
                            Zone 2 - Blue<br /><span className="text-lg opacity-90">(10 pts)</span>
                        </button>
                    </div>


                </div>

                {/* Jackpot Bonus - Only when time is 0 */}
                {timeLeft === 0 && (
                    <button
                        onClick={() => addAction('Jackpot Bonus', 10, 'bonus')}
                        disabled={isJackpotClaimed}
                        className={`w-full py-6 mb-8 rounded-xl text-3xl font-black text-white shadow-xl transition-all ${isJackpotClaimed
                            ? 'bg-gray-400 dark:bg-slate-600 cursor-not-allowed'
                            : 'bg-gradient-to-r from-amber-400 to-orange-500 animate-bounce'
                            }`}
                    >
                        {isJackpotClaimed ? 'Jackpot Claimed 🏆' : '🏆 Jackpot Bonus (+10)'}
                    </button>
                )}

                {/* Action Log / History */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 mb-20 transition-colors">
                    <div className="flex items-center justify-between mb-4 border-b dark:border-slate-700 pb-2">
                        <h3 className="font-bold text-gray-700 dark:text-gray-300">Action History</h3>
                        <button
                            onClick={handleUndo}
                            disabled={actions.length === 0}
                            className="flex items-center gap-1 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-30"
                        >
                            <RotateCcw size={16} /> Undo Last Action
                        </button>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                        {actions.length === 0 && <div className="text-center text-gray-300 dark:text-gray-600 py-4">No actions yet</div>}
                        {actions.map((action, idx) => (
                            <div key={action.id} className="flex justify-between items-center bg-gray-50 dark:bg-slate-700/50 p-2 rounded text-sm">
                                <span className="text-gray-500 dark:text-gray-500 font-mono">#{actions.length - idx}</span>
                                <span className="font-medium text-gray-800 dark:text-gray-200">{action.name}</span>
                                <span className={`font-bold ${action.points > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                    +{action.points}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Fixed Bottom Save Button */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-800 border-t dark:border-slate-700 box-border transition-colors">
                    <div className="container mx-auto max-w-2xl">
                        <button
                            onClick={handleSave}
                            className="w-full py-4 rounded-xl text-xl font-bold bg-gray-900 dark:bg-slate-700 text-white shadow-lg hover:bg-gray-800 dark:hover:bg-slate-600 flex items-center justify-center gap-2"
                        >
                            <Save size={24} /> Save Final Result
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
