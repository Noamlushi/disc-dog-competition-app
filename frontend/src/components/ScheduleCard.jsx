import { AlertTriangle } from 'lucide-react';

export default function ScheduleCard({ item, isHighlighted, isDimmed, onClick }) {
    return (
        <div
            onClick={onClick}
            className={`
                relative p-4 rounded-xl border transition-all cursor-pointer select-none
                ${isHighlighted
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 shadow-md ring-2 ring-blue-500/20 z-10'
                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 shadow-sm hover:border-blue-300'
                }
                ${isDimmed ? 'opacity-30 grayscale' : 'opacity-100'}
            `}
        >
            {/* Time Range */}
            <div className="flex justify-between items-start mb-2">
                <div className="font-mono text-sm font-black text-gray-700 dark:text-gray-300">
                    {item.startTime} - {item.endTime}
                </div>
                {item.note && (
                    <div className="text-amber-500" title={item.note}>
                        <AlertTriangle size={16} />
                    </div>
                )}
            </div>

            {/* Content */}
            <div>
                <h4 className="font-bold text-gray-800 dark:text-white leading-tight mb-1">{item.participantName}</h4>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400">
                    {item.category}
                </span>
            </div>

            {/* Note Text */}
            {item.note && (
                <div className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-500 flex items-center gap-1">
                    {item.note}
                </div>
            )}
        </div>
    );
}
