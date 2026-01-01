import { useState } from 'react';
import { X, Play, Clock, LayoutGrid, CalendarRange } from 'lucide-react';

export default function AutoScheduleModal({ isOpen, onClose, onGenerate }) {
    const [config, setConfig] = useState({
        fieldsCount: 2,
        startTime: "09:00",
        targetEndTime: "14:00",
        minRestTime: 20
    });

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onGenerate(config);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <CalendarRange className="text-blue-600" />
                        Smart Auto-Schedule
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Fields Count */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                            <LayoutGrid size={16} /> Number of Fields
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="10"
                            value={config.fieldsCount}
                            onChange={(e) => setConfig({ ...config, fieldsCount: parseInt(e.target.value) })}
                            className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 font-mono text-lg font-bold focus:border-blue-500 outline-none transition-colors"
                        />
                    </div>

                    {/* Time Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Start Time</label>
                            <input
                                type="time"
                                value={config.startTime}
                                onChange={(e) => setConfig({ ...config, startTime: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 font-mono font-bold focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Target End</label>
                            <input
                                type="time"
                                value={config.targetEndTime}
                                onChange={(e) => setConfig({ ...config, targetEndTime: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 font-mono font-bold focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Rest Time */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                            <Clock size={16} /> Minimum Rest (Min)
                        </label>
                        <input
                            type="number"
                            min="5"
                            value={config.minRestTime}
                            onChange={(e) => setConfig({ ...config, minRestTime: parseInt(e.target.value) })}
                            className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 font-mono text-lg font-bold focus:border-blue-500 outline-none"
                        />
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            <Play size={20} fill="currentColor" />
                            Generate Schedule
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
