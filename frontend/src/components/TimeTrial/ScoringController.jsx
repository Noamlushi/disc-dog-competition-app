import { useState, useEffect, useRef } from 'react';
import { Play, Check, Square, RotateCcw } from 'lucide-react';

export default function ScoringController({ teamName, onSave, onReset, initialTime = 0 }) {
    const [time, setTime] = useState(initialTime);
    const [isRunning, setIsRunning] = useState(false);
    const [catches, setCatches] = useState(0); // 0, 1, or 2
    const timerRef = useRef(null);

    // Timer Logic
    useEffect(() => {
        if (isRunning) {
            timerRef.current = setInterval(() => {
                setTime(prev => prev + 10); // 10ms increments
            }, 10);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [isRunning]);

    const handleStart = () => {
        setIsRunning(true);
        if (time === 0) {
            // Only reset catches if starting fresh
            setCatches(0);
        }
    };

    const handleCatch = () => {
        if (catches < 2) {
            setCatches(prev => prev + 1);
        }
    };

    const handleFinish = () => {
        setIsRunning(false);
        onSave(time);
    };

    const handleInternalReset = () => {
        setIsRunning(false);
        setTime(0);
        setCatches(0);
        if (onReset) onReset();
    };

    // Format time
    const minutes = Math.floor(time / 60000);
    const seconds = Math.floor((time % 60000) / 1000);
    const centiseconds = Math.floor((time % 1000) / 10);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 transition-colors">
            {/* Header */}
            <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">{teamName}</h3>
                <div className="text-6xl font-black font-mono text-blue-900 dark:text-blue-400">
                    {String(minutes).padStart(2, '0')}:
                    {String(seconds).padStart(2, '0')}.
                    <span className="text-4xl">{String(centiseconds).padStart(2, '0')}</span>
                </div>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 gap-6">

                {/* 1. START Button */}
                {!isRunning && time === 0 && (
                    <button
                        onClick={handleStart}
                        className="w-full py-8 text-4xl font-black text-white bg-green-600 rounded-2xl shadow-lg hover:bg-green-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                    >
                        <Play size={48} fill="currentColor" /> START TIMER
                    </button>
                )}

                {/* 2. CATCH Button */}
                {isRunning && (
                    <button
                        onClick={handleCatch}
                        disabled={catches >= 2}
                        className={`w-full py-8 text-3xl font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 ${catches >= 2
                                ? 'bg-blue-800/50 text-blue-200 cursor-not-allowed opacity-50'
                                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'
                            }`}
                    >
                        <Check size={40} />
                        {catches >= 2 ? 'CATCH CONFIRMED (2/2)' : `CATCH CONFIRMED (${catches}/2)`}
                    </button>
                )}

                {/* 3. FINISH Button */}
                {isRunning && (
                    <button
                        onClick={handleFinish}
                        disabled={catches < 2}
                        className={`w-full py-8 text-4xl font-black rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 ${catches < 2
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-slate-700 dark:text-gray-600'
                                : 'bg-red-600 text-white hover:bg-red-700 active:scale-[0.98] animate-pulse'
                            }`}
                    >
                        <Square size={48} fill="currentColor" /> FINISH (STOP)
                    </button>
                )}

                {/* Reset Button */}
                <div className="flex justify-center mt-4">
                    <button
                        onClick={handleInternalReset}
                        className="text-orange-500 hover:text-orange-600 font-bold flex items-center gap-2 px-6 py-3 rounded-xl border border-orange-200 hover:bg-orange-50 transition-colors"
                    >
                        <RotateCcw size={20} /> FALSE START / RESET
                    </button>
                </div>
            </div>
        </div>
    );
}
