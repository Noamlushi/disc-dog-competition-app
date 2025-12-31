import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Play, Square, Check } from 'lucide-react';

export default function MultipleScoringPage() {
    const { id, teamId } = useParams();
    const navigate = useNavigate();

    const [team, setTeam] = useState(null);
    const [competition, setCompetition] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [time, setTime] = useState(0); // Time in milliseconds
    const [completedStages, setCompletedStages] = useState([false, false, false, false]);
    const timerRef = useRef(null);

    useEffect(() => {
        // Fetch team data
        fetch(`http://localhost:3000/api/competitions/${id}/teams`)
            .then(res => res.json())
            .then(teams => {
                const foundTeam = teams.find(t => t._id === teamId);
                setTeam(foundTeam);

                // Load existing result if any
                const multipleReg = foundTeam?.registrations?.find(r => r.runType === 'Multiple Challenge');
                if (multipleReg?.totalScore) {
                    setTime(multipleReg.totalScore * 1000); // Convert seconds to ms
                }
            });

        // Fetch competition data
        fetch(`http://localhost:3000/api/competitions/${id}`)
            .then(res => res.json())
            .then(data => setCompetition(data));

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [id, teamId]);

    const handleStart = () => {
        setIsRunning(true);
        setTime(0);
        setCompletedStages([false, false, false, false]);

        timerRef.current = setInterval(() => {
            setTime(prevTime => {
                const newTime = prevTime + 10;
                // Auto-stop at 60 seconds (disqualified)
                if (newTime >= 60000) {
                    handleStop();
                    return 60000;
                }
                return newTime;
            });
        }, 10);
    };

    const handleStop = () => {
        setIsRunning(false);
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
    };

    const handleStageClick = (stageIndex) => {
        if (!isRunning) return;

        // Check if previous stages are completed (except for stage 0)
        if (stageIndex > 0 && !completedStages[stageIndex - 1]) return;

        // Toggle stage completion
        const newStages = [...completedStages];
        newStages[stageIndex] = !newStages[stageIndex];
        setCompletedStages(newStages);

        // Auto-stop timer if this is the 4th catch being completed
        if (stageIndex === 3 && newStages[3]) {
            handleStop();
        }
    };

    const handleSave = async () => {
        if (!team) return;

        const finalTime = (time / 1000).toFixed(2); // Convert to seconds

        // Update the Multiple Challenge registration
        const updatedRegistrations = team.registrations.map(reg => {
            if (reg.runType === 'Multiple Challenge') {
                return {
                    ...reg,
                    status: 'completed',
                    totalScore: parseFloat(finalTime),
                    attempts: [] // No attempts needed for time-based scoring
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
            navigate(`/competition/${id}/start?run=Multiple Challenge`);
        } catch (err) {
            console.error('Failed to save:', err);
            alert('Failed to save score');
        }
    };

    if (!team || !competition) {
        return <div className="p-8 text-center text-xl">Loading...</div>;
    }

    const minutes = Math.floor(time / 60000);
    const seconds = Math.floor((time % 60000) / 1000);
    const centiseconds = Math.floor((time % 1000) / 10);
    const allStagesCompleted = completedStages.every(stage => stage);

    const stages = [
        { name: 'Catch 1', zone: 'Cyan Zone', color: 'from-cyan-400 to-cyan-600' },
        { name: 'Catch 2', zone: 'Red Zone', color: 'from-red-400 to-red-600' },
        { name: 'Catch 3', zone: 'Purple Zone', color: 'from-purple-400 to-purple-600' },
        { name: 'Catch 4', zone: 'Jackpot (Center)', color: 'from-yellow-400 to-orange-500' }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sticky Header */}
            <div className="sticky top-0 z-50 bg-white shadow-md border-b-2 border-blue-900">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-2 font-semibold"
                        >
                            <ArrowLeft size={20} /> Back
                        </button>
                        <h1 className="text-2xl font-bold text-gray-800">
                            {team.ownerName} & {team.dogName}
                        </h1>
                        <div className="w-20"></div>
                    </div>

                    {/* Timer Display */}
                    <div className="text-center">
                        <div className="text-sm text-gray-500 font-semibold mb-2">Time</div>
                        <div className="text-7xl font-black text-blue-900 font-mono">
                            {String(minutes).padStart(2, '0')}:
                            {String(seconds).padStart(2, '0')}.
                            <span className="text-5xl">{String(centiseconds).padStart(2, '0')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Control Buttons */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <button
                        onClick={handleStart}
                        disabled={isRunning}
                        className={`py-6 px-8 rounded-xl text-2xl font-bold flex items-center justify-center gap-3 transition-all transform ${isRunning
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700 active:scale-95 shadow-lg'
                            }`}
                    >
                        <Play size={32} />
                        Start Run
                    </button>
                    <button
                        onClick={handleStop}
                        disabled={!isRunning || !allStagesCompleted}
                        className={`py-6 px-8 rounded-xl text-2xl font-bold flex items-center justify-center gap-3 transition-all transform ${!isRunning || !allStagesCompleted
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-red-600 text-white hover:bg-red-700 active:scale-95 shadow-lg'
                            }`}
                    >
                        <Square size={32} />
                        Finish Run
                    </button>
                </div>

                {/* Stage Progress */}
                <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Course Progress</h3>
                    <div className="space-y-3">
                        {stages.map((stage, index) => {
                            const isCompleted = completedStages[index];
                            const isAvailable = index === 0 || completedStages[index - 1];
                            const isClickable = isRunning && isAvailable;

                            return (
                                <button
                                    key={index}
                                    onClick={() => handleStageClick(index)}
                                    disabled={!isClickable}
                                    className={`w-full py-6 rounded-xl text-2xl font-bold transition-all transform flex items-center justify-between px-8 ${isCompleted
                                        ? 'bg-gray-400 text-white'
                                        : isClickable
                                            ? `bg-gradient-to-r ${stage.color} text-white hover:scale-[1.02] active:scale-[0.98] shadow-lg`
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="text-4xl">{index + 1}</span>
                                        <div className="text-left">
                                            <div className="text-2xl">{stage.name}</div>
                                            <div className="text-sm opacity-90">{stage.zone}</div>
                                        </div>
                                    </div>
                                    {isCompleted && (
                                        <Check size={40} className="text-white" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
                    <h4 className="font-bold text-blue-900 mb-2">Instructions:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-blue-800">
                        <li>Click "Start Run" to begin the timer</li>
                        <li>Click each catch button in order as the dog completes them</li>
                        <li>After all 4 catches are completed, click "Finish Run"</li>
                        <li>Click "Save Result" to record the time</li>
                    </ol>
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={isRunning || time === 0}
                    className={`w-full py-5 rounded-xl text-2xl font-bold shadow-lg flex items-center justify-center gap-3 transition-all transform ${isRunning || time === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700 hover:scale-[1.02] active:scale-[0.98]'
                        }`}
                >
                    <Save size={28} />
                    Save Result
                </button>
            </div>
        </div>
    );
}
