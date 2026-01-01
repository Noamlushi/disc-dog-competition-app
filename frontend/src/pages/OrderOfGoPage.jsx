import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ArrowLeft, Save, Calendar, GripVertical } from 'lucide-react';

const RUN_TYPES = [
    'Distance Beginners', 'Distance Advanced', 'Multiple Challenge', 'Frisgility', 'Shuffle',
    'Wheel of Fortune', 'Criss Cross', 'Time Trial', 'Freestyle'
];

export default function OrderOfGoPage() {
    const { id } = useParams();
    const [teams, setTeams] = useState([]);
    const [selectedRun, setSelectedRun] = useState(RUN_TYPES[0]);
    const [orderedTeams, setOrderedTeams] = useState([]);

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
            // Refresh main teams list to ensure sync
            const res = await fetch(`http://localhost:3000/api/competitions/${id}/teams`);
            const data = await res.json();
            setTeams(data);
        } catch (err) {
            console.error(err);
            alert('Failed to save order');
        }
    };

    return (
        <div className="container mx-auto p-4 min-h-screen">
            <Link to={`/competition/${id}`} className="text-gray-600 hover:text-blue-800 flex items-center gap-2 mb-6">
                <ArrowLeft size={20} /> Back to Management
            </Link>

            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-blue-900">Manage Order of Go</h1>
                    <p className="text-gray-500">Drag and drop teams to set the running order.</p>
                </div>
                <button
                    onClick={handleSaveOrder}
                    className="bg-green-600 text-white px-8 py-3 rounded-xl hover:bg-green-700 flex items-center gap-2 font-bold shadow-lg"
                >
                    <Save size={20} /> Save Order
                </button>
            </div>

            {/* Run Type Tabs */}
            <div className="flex overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
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

            {orderedTeams.length === 0 ? (
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
            )}
        </div>
    );
}
