import { useState, useEffect } from 'react';
import { X, Trash2, Plus, Save, AlertCircle } from 'lucide-react';

export default function DistanceEditModal({ isOpen, onClose, team, onSave }) {
    const [attempts, setAttempts] = useState([]);

    useEffect(() => {
        if (team && team.registrations) {
            const reg = team.registrations.find(r => r.runType === 'Distance');
            if (reg && reg.attempts) {
                // deep clone to avoid mutating props
                setAttempts(JSON.parse(JSON.stringify(reg.attempts)));
            }
        }
    }, [team, isOpen]);

    if (!isOpen || !team) return null;

    // --- Logic Reuse (Phase 5) ---
    const calculatePoints = (attempt) => {
        if (attempt.isFootFault) return 0;
        if (attempt.zone === 0) return 0; // Miss

        // Zone 1=0, 2=1, 3=2, 4=3, 5=4
        let pts = Math.max(0, attempt.zone - 1);

        if (attempt.zone >= 2) {
            if (attempt.jump) pts += 0.5;
            if (attempt.bonusZone) pts += 0.5;
        }
        return pts;
    };

    const updateAttempt = (index, field, value) => {
        const newAttempts = [...attempts];
        newAttempts[index] = { ...newAttempts[index], [field]: value };

        // Auto-recalc points for this row
        newAttempts[index].points = calculatePoints(newAttempts[index]);
        setAttempts(newAttempts);
    };

    const handleZoneChange = (index, zone) => {
        const newAttempts = [...attempts];
        const newZone = parseInt(zone);

        newAttempts[index].zone = newZone;

        // Reset modifiers if zone < 2
        if (newZone < 2) {
            newAttempts[index].jump = false;
            newAttempts[index].bonusZone = false;
        }

        newAttempts[index].points = calculatePoints(newAttempts[index]);
        setAttempts(newAttempts);
    };

    const addThrow = () => {
        const newThrow = {
            id: Date.now(), // new temp ID
            zone: 1, // Default to Zone 1 (0 pts)
            jump: false,
            bonusZone: false,
            points: 0,
            isFootFault: false
        };
        setAttempts([...attempts, newThrow]);
    };

    const removeThrow = (index) => {
        const newAttempts = attempts.filter((_, i) => i !== index);
        setAttempts(newAttempts);
    };

    // Recalculate Total Score
    // 1. Sort Descending
    const sortedAttempts = [...attempts].sort((a, b) => b.points - a.points);
    // 2. Take Top 5
    const top5 = sortedAttempts.slice(0, 5);
    // 3. Sum
    const sum = top5.reduce((acc, curr) => acc + curr.points, 0);
    // 4. Hard Cap
    const totalScore = Math.min(sum, 25);

    const handleSave = () => {
        // Pass back the updated attempts and recalculation
        onSave(attempts, totalScore);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-blue-900 text-white p-6 rounded-t-2xl flex justify-between items-center sticky top-0 z-10">
                    <div>
                        <h2 className="text-2xl font-bold">Edit Results</h2>
                        <p className="text-blue-200">{team.ownerName} & {team.dogName}</p>
                    </div>
                    <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-full transition-colors">
                        <X size={28} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
                    <div className="space-y-4">
                        {attempts.length === 0 && (
                            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border-2 border-dashed">
                                <p>No throws recorded.</p>
                                <button onClick={addThrow} className="mt-4 text-blue-600 font-bold hover:underline">Add First Throw</button>
                            </div>
                        )}

                        {attempts.map((attempt, idx) => (
                            <div key={attempt.id || idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center gap-4 transition-all hover:shadow-md">
                                <div className="font-mono text-gray-400 font-bold w-8">#{idx + 1}</div>

                                {/* Zone Selector */}
                                <div className="flex flex-col">
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1">Zone</label>
                                    <select
                                        value={attempt.isFootFault ? 'FF' : (attempt.zone === 0 ? 'MISS' : attempt.zone)}
                                        onChange={(e) => {
                                            if (e.target.value === 'FF') {
                                                updateAttempt(idx, 'isFootFault', true);
                                                updateAttempt(idx, 'zone', 0);
                                            } else if (e.target.value === 'MISS') {
                                                updateAttempt(idx, 'isFootFault', false);
                                                updateAttempt(idx, 'zone', 0);
                                            } else {
                                                updateAttempt(idx, 'isFootFault', false);
                                                handleZoneChange(idx, e.target.value);
                                            }
                                        }}
                                        className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 font-bold text-gray-800 w-32 focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="1">Zone 1 (0)</option>
                                        <option value="2">Zone 2 (1)</option>
                                        <option value="3">Zone 3 (2)</option>
                                        <option value="4">Zone 4 (3)</option>
                                        <option value="5">Zone 5 (4)</option>
                                        <option value="MISS">Miss (0)</option>
                                        <option value="FF">Foot Fault</option>
                                    </select>
                                </div>

                                {/* Modifiers */}
                                <div className="flex items-center gap-4 border-l pl-4 border-gray-200">
                                    <label className={`flex items-center gap-2 font-medium cursor-pointer select-none ${attempt.zone < 2 ? 'opacity-30 pointer-events-none' : ''}`}>
                                        <input
                                            type="checkbox"
                                            checked={attempt.jump}
                                            onChange={(e) => updateAttempt(idx, 'jump', e.target.checked)}
                                            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        Airborne (+0.5)
                                    </label>
                                    <label className={`flex items-center gap-2 font-medium cursor-pointer select-none ${attempt.zone < 2 ? 'opacity-30 pointer-events-none' : ''}`}>
                                        <input
                                            type="checkbox"
                                            checked={attempt.bonusZone}
                                            onChange={(e) => updateAttempt(idx, 'bonusZone', e.target.checked)}
                                            className="w-5 h-5 rounded text-orange-500 focus:ring-orange-500"
                                        />
                                        Sweet Spot (+0.5)
                                    </label>
                                </div>

                                {/* Points Display */}
                                <div className="ml-auto text-xl font-bold bg-gray-100 px-4 py-2 rounded-lg min-w-[80px] text-center text-blue-900">
                                    {attempt.isFootFault ? <span className="text-red-600 text-sm">FOOT FAULT</span> : attempt.points.toFixed(1)}
                                </div>

                                {/* Delete */}
                                <button
                                    onClick={() => removeThrow(idx)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                    title="Delete Throw"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={addThrow}
                        className="mt-6 w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={20} /> Add Manual Throw
                    </button>
                </div>

                {/* Footer */}
                <div className="p-6 bg-white border-t border-gray-200 rounded-b-2xl sticky bottom-0 z-10 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-sm text-gray-500 font-medium">New Total Score</div>
                            <div className="text-4xl font-black text-blue-900">{totalScore.toFixed(1)} <span className="text-lg text-gray-400 font-normal">/ 25.0</span></div>
                        </div>
                        {totalScore === 25 && (
                            <div className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1">
                                <AlertCircle size={12} /> CAPPED
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-3 font-bold text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
                        <button
                            onClick={handleSave}
                            className="px-8 py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 active:transform active:scale-95 flex items-center gap-2"
                        >
                            <Save size={20} /> Update Result
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
