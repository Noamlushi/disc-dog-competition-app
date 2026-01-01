import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ArrowLeft, Save, Calendar, GripVertical, Sparkles, LayoutList } from 'lucide-react';
import AutoScheduleModal from '../components/AutoScheduleModal';
import ScheduleBoard from '../components/ScheduleBoard';

const RUN_TYPES = [
    'Distance Beginners', 'Distance Advanced', 'Multiple Challenge', 'Frisgility', 'Shuffle',
    'Wheel of Fortune', 'Criss Cross', 'Time Trial', 'Freestyle'
];

export default function OrderOfGoPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [teams, setTeams] = useState([]);
    const [selectedRun, setSelectedRun] = useState(RUN_TYPES[0]);
    const [orderedTeams, setOrderedTeams] = useState([]);

    // Auto-Schedule State
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'board'
    const [scheduleData, setScheduleData] = useState(null); // { schedule, advisor }
    const [scheduleConfig, setScheduleConfig] = useState(null); // to store fieldsCount etc.
    const [selectedParticipantId, setSelectedParticipantId] = useState(null);

    useEffect(() => {
        fetch(`http://localhost:3000/api/competitions/${id}/teams`)
            .then(res => res.json())
            .then(data => setTeams(data));
    }, [id]);

    useEffect(() => {
        // Filter teams for selected run type
        const filtered = teams.filter(t =>
            t.registrations?.some(r => r.runType === selectedRun)
        );

        // Sort by existing order
        const sorted = [...filtered].sort((a, b) => {
            const orderA = a.registrations.find(r => r.runType === selectedRun)?.order || 999;
            const orderB = b.registrations.find(r => r.runType === selectedRun)?.order || 999;
            return orderA - orderB;
        });

        setOrderedTeams(sorted);
    }, [teams, selectedRun]);

    const handleDragEnd = (result) => {
        if (!result.destination) return;

        const items = Array.from(orderedTeams);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setOrderedTeams(items);
    };

    const handleSaveOrder = async () => {
        // --- BOARD MODE SAVE (Smart Schedule) ---
        if (viewMode === 'board' && scheduleData) {
            try {
                // Group schedule actions by team (participantId)
                // Map<participantId, Array<{ category, order, startTime, fieldId }>>
                const teamUpdates = new Map();

                scheduleData.schedule.forEach((item, index) => {
                    const pId = item.participantId;
                    if (!teamUpdates.has(pId)) {
                        teamUpdates.set(pId, []);
                    }
                    teamUpdates.get(pId).push({
                        category: item.category,
                        order: index + 1,
                        startTime: item.startTime,
                        fieldId: item.fieldId
                    });
                });

                // Create update promises
                const promises = Array.from(teamUpdates.entries()).map(async ([teamId, updates]) => {
                    // We need the original team object to preserve other registrations
                    const team = teams.find(t => t._id === teamId);
                    if (!team) return;

                    const updatedRegistrations = team.registrations.map(reg => {
                        // Check if this registration was scheduled
                        const update = updates.find(u => u.category === reg.runType);
                        if (update) {
                            return {
                                ...reg,
                                order: update.order,
                                scheduledTime: update.startTime,
                                arena: update.fieldId.toString()
                            };
                        }
                        return reg;
                    });

                    return fetch(`http://localhost:3000/api/teams/${team._id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ registrations: updatedRegistrations }),
                    });
                });

                await Promise.all(promises);
                alert('Smart Schedule saved successfully! All categories updated.');
                navigate(`/competition/${id}/start`);

            } catch (err) {
                console.error(err);
                alert('Failed to save schedule');
            }
            return;
        }

        // --- LIST MODE SAVE (Manual Drag & Drop) ---
        // Create batched updates: simply update the 'order' field based on index
        const updates = orderedTeams.map((team, index) => {
            // Find current registration to preserve other fields
            const reg = team.registrations.find(r => r.runType === selectedRun);
            const updatedRegs = team.registrations.map(r => {
                if (r.runType === selectedRun) {
                    return { ...r, order: index + 1 };
                }
                return r;
            });

            return fetch(`http://localhost:3000/api/teams/${team._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ registrations: updatedRegs }),
            });
        });

        try {
            await Promise.all(updates);
            alert('Order saved successfully!');
            navigate(`/competition/${id}/start`);
        } catch (err) {
            console.error(err);
            alert('Failed to save order');
        }
    };

    const handleGenerateSchedule = async (options) => {
        setIsScheduleModalOpen(false);

        // 1. Prepare Participants Map
        // We only care about the currently filtered/ordered teams for simplicity, 
        // OR we might want to schedule ALL teams across ALL categories if that's the goal.
        // The prompt says "Manage Order of Go" page operates usually on a selectedRun?
        // HOWEVER, "Auto-Schedule" usually implies scheduling the Whole Day (mult-category).
        // Let's assume we want to schedule the *displayed* teams/category or better yet:
        // If the user wants to schedule properly, they usually need ALL categories.
        // Let's fetch ALL teams (which we have in `teams`) and map their categories.

        const participants = teams.map(t => ({
            id: t._id,
            name: t.ownerName,
            categories: t.registrations.map(r => r.runType)
        }));

        // 2. Prepare Category Settings (Mock or Hardcoded for now based on context)
        // Ideally this comes from a config. For now, we'll set defaults.
        const categorySettings = {};
        RUN_TYPES.forEach(type => {
            categorySettings[type] = { duration: 3 }; // Default 3 mins per run
            // Adjust specific ones if known
            if (type === 'Freestyle') categorySettings[type].duration = 4;
            if (type === 'Target') categorySettings[type].duration = 2;
        });

        // 3. Call API
        try {
            const res = await fetch('http://localhost:3000/api/competitions/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    participants,
                    categorySettings,
                    fieldsCount: options.fieldsCount,
                    options: {
                        startTime: options.startTime,
                        targetEndTime: options.targetEndTime,
                        minRestTime: options.minRestTime
                    }
                })
            });
            const data = await res.json();

            if (data.error) throw new Error(data.error);

            setScheduleData(data);
            setScheduleConfig(options);
            setViewMode('board');

        } catch (err) {
            console.error(err);
            alert('Failed to generate schedule: ' + err.message);
        }
    };

    return (
        <div className="container mx-auto p-4 min-h-screen pb-20">
            <Link to={`/competition/${id}`} className="text-gray-600 hover:text-blue-800 flex items-center gap-2 mb-6">
                <ArrowLeft size={20} /> Back to Management
            </Link>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-blue-900">Manage Order of Go</h1>
                    <p className="text-gray-500">
                        {viewMode === 'list'
                            ? "Drag and drop teams to set the running order."
                            : "View and optimize the generated schedule."}
                    </p>
                </div>

                <div className="flex gap-3">
                    {/* View Toggle (Only if data exists) */}
                    {scheduleData && (
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <LayoutList size={20} />
                            </button>
                            <button
                                onClick={() => setViewMode('board')}
                                className={`p-2 rounded-md ${viewMode === 'board' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Calendar size={20} />
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => setIsScheduleModalOpen(true)}
                        className="bg-white text-blue-600 border-2 border-blue-600 px-6 py-3 rounded-xl hover:bg-blue-50 flex items-center gap-2 font-bold transition-all active:scale-95"
                    >
                        <Sparkles size={20} /> Smart Auto-Schedule
                    </button>

                    <button
                        onClick={handleSaveOrder}
                        className="bg-green-600 text-white px-8 py-3 rounded-xl hover:bg-green-700 flex items-center gap-2 font-bold shadow-lg transition-all active:scale-95"
                    >
                        <Save size={20} /> Save Order
                    </button>
                </div>
            </div>

            {/* Run Type Tabs (Hide in Board Mode for cleaner view? Or keep?) */}
            {viewMode === 'list' && (
                <div className="flex overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200 mb-6 pb-2 md:pb-0">
                    {RUN_TYPES.map(type => (
                        <button
                            key={type}
                            onClick={() => setSelectedRun(type)}
                            className={`px-6 py-4 font-bold whitespace-nowrap transition-colors ${selectedRun === type
                                ? 'bg-blue-50 text-blue-900 border-b-2 border-blue-900'
                                : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            )}

            {/* VIEW CONTENT */}
            {viewMode === 'list' ? (
                // LIST MODE
                orderedTeams.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl shadow-lg border-2 border-dashed border-gray-300">
                        <Calendar size={64} className="mx-auto text-gray-300 mb-4" />
                        <h2 className="text-2xl font-bold text-gray-700 mb-2">No Teams Registered</h2>
                        <p className="text-gray-500">No teams found for {selectedRun}.</p>
                    </div>
                ) : (
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="teams-list">
                            {(provided) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className="space-y-3 max-w-3xl mx-auto"
                                >
                                    {orderedTeams.map((team, index) => (
                                        <Draggable key={team._id} draggableId={team._id} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={`bg-white p-4 rounded-xl border flex items-center justify-between shadow-sm transition-shadow ${snapshot.isDragging ? 'shadow-xl ring-2 ring-blue-500 z-50' : 'border-gray-200 hover:border-blue-300'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div {...provided.dragHandleProps} className="text-gray-400 cursor-grab hover:text-blue-600">
                                                            <GripVertical size={24} />
                                                        </div>
                                                        <div className="w-10 text-center font-bold text-gray-300 text-xl">
                                                            #{index + 1}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-bold text-gray-800 text-lg">{team.ownerName}</h3>
                                                            <p className="text-gray-500 text-sm">{team.dogName}</p>
                                                        </div>
                                                    </div>

                                                    {/* Status Badge */}
                                                    {team.registrations.find(r => r.runType === selectedRun)?.status === 'completed' && (
                                                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase">
                                                            Completed
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                )
            ) : (
                // BOARD MODE
                <ScheduleBoard
                    schedule={scheduleData.schedule}
                    advisor={scheduleData.advisor}
                    fieldsCount={scheduleConfig?.fieldsCount || 2}
                    selectedParticipantId={selectedParticipantId}
                    onParticipantClick={(pid) => setSelectedParticipantId(prev => prev === pid ? null : pid)}
                />
            )}

            {/* MODAL */}
            <AutoScheduleModal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                onGenerate={handleGenerateSchedule}
            />
        </div>
    );
}
