import ScheduleCard from './ScheduleCard';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';

export default function ScheduleBoard({ schedule, fieldsCount, advisor, selectedParticipantId, onParticipantClick }) {
    // Split schedule into columns by fieldId
    const columns = Array.from({ length: fieldsCount }, (_, i) =>
        schedule.filter(item => item.fieldId === i + 1)
    );

    return (
        <div className="space-y-6">
            {/* Advisor / Summary Header */}
            {advisor && (
                <div className={`
                    p-4 rounded-xl border flex flex-col md:flex-row gap-4 items-start md:items-center justify-between
                    ${advisor.isOptimal
                        ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                        : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'}
                `}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${advisor.isOptimal ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                            {advisor.isOptimal ? <CheckCircle size={24} /> : <Clock size={24} />}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">
                                {advisor.isOptimal ? 'Optimal Schedule Generated' : 'Schedule Completed with Adjustments'}
                            </h3>
                            <p className="text-sm opacity-80">
                                Finishes at <span className="font-mono font-bold">{advisor.metrics.actualEnd}</span>
                                {advisor.metrics.totalDelayMinutes > 0 && ` (+${advisor.metrics.totalDelayMinutes}m delay)`}
                            </p>
                        </div>
                    </div>
                    {/* Messages */}
                    <div className="flex flex-col gap-1">
                        {advisor.messages.map((msg, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm font-medium">
                                <AlertCircle size={14} className={msg.severity === 'HIGH' ? 'text-red-500' : 'text-amber-500'} />
                                <span>{msg.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Columns Grid */}
            <div
                className="grid gap-6"
                style={{ gridTemplateColumns: `repeat(${fieldsCount}, minmax(0, 1fr))` }}
            >
                {columns.map((colItems, colIndex) => (
                    <div key={colIndex} className="space-y-4">
                        <div className="text-center font-bold text-gray-400 uppercase tracking-widest text-sm py-2 border-b-2 border-gray-100 dark:border-slate-800">
                            Field {colIndex + 1}
                        </div>
                        <div className="space-y-3">
                            {colItems.map((item, idx) => (
                                <ScheduleCard
                                    key={`${item.fieldId}-${item.startTime}`}
                                    item={item}
                                    isHighlighted={selectedParticipantId === item.participantId}
                                    isDimmed={selectedParticipantId && selectedParticipantId !== item.participantId}
                                    onClick={() => onParticipantClick(item.participantId)}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
