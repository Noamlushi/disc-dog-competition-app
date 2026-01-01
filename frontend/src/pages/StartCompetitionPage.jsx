import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Play, Flag } from 'lucide-react';
import DistanceEditModal from '../components/DistanceEditModal';

const RUN_TYPES = [
    'Distance Beginners', 'Distance Advanced', 'Multiple Challenge', 'Frisgility', 'Shuffle',
    'Wheel of Fortune', 'Criss Cross', 'Time Trial', 'Freestyle'
];

export default function StartCompetitionPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const runParam = searchParams.get('run');
    const [selectedRun, setSelectedRun] = useState(runParam || RUN_TYPES[0]);
    const [teams, setTeams] = useState([]);
    const [sortedTeams, setSortedTeams] = useState([]);
    const [editingTeam, setEditingTeam] = useState(null); // State for modal (only for editing)

    useEffect(() => {
        fetchTeams();
    }, [id, selectedRun]);

    const fetchTeams = () => {
        fetch(`http://localhost:3000/api/competitions/${id}/teams`)
            .then(res => res.json())
            .then(data => setTeams(data));
    };

    useEffect(() => {
        // Filter and sort teams for the selected run
        const registered = teams.filter(t =>
            t.registrations?.some(r => r.runType === selectedRun)
        );

        const sorted = [...registered].sort((a, b) => {
            const orderA = a.registrations.find(r => r.runType === selectedRun)?.order || 999;
            const orderB = b.registrations.find(r => r.runType === selectedRun)?.order || 999;
            return orderA - orderB;
        });

        setSortedTeams(sorted);
    }, [teams, selectedRun]);

    const handleUpdateResult = async (updatedAttempts, newTotalScore) => {
        if (!editingTeam) return;

        const teamId = editingTeam._id;
        const updatedRegistrations = editingTeam.registrations.map(reg => {
            if (reg.runType === selectedRun) {
                return {
                    ...reg,
                    totalScore: newTotalScore,
                    attempts: updatedAttempts,
                    status: 'completed'
                };
            }
            return reg;
        });

        try {
            await fetch(`http://localhost:3000/api/teams/${editingTeam._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ registrations: updatedRegistrations }),
            });
            setEditingTeam(null);
            fetchTeams();
        } catch (err) {
            console.error(err);
            alert("Failed to update result");
        }
    };

    const handleEnterResult = (team) => {
        // For Distance, navigate to the full scoring page
        // For Distance, navigate to the full scoring page with query param
        if (selectedRun === 'Distance Beginners' || selectedRun === 'Distance Advanced') {
            navigate(`/competition/${id}/score/distance/${team._id}?runType=${encodeURIComponent(selectedRun)}`);
        } else if (selectedRun === 'Multiple Challenge') {
            navigate(`/competition/${id}/score/multiple/${team._id}`);
        } else if (selectedRun === 'Frisgility') { // Internal name matches RUN_TYPES
            navigate(`/competition/${id}/score/frisagility/${team._id}`);
        } else if (selectedRun === 'Freestyle') {
            navigate(`/competition/${id}/score/freestyle/${team._id}`);
        } else {
            // For other run types, could open modal or navigate to other pages
            alert(`Scoring for ${selectedRun} not yet implemented`);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <Link to={`/competition/${id}`} className="text-gray-600 hover:text-blue-800 flex items-center gap-2 mb-6">
                <ArrowLeft size={20} /> Back to Management
            </Link>

            <div className="bg-white rounded-lg shadow-xl overflow-hidden min-h-[600px] flex flex-col">
                {/* Header */}
                <div className="bg-blue-900 text-white p-6 flex justify-between items-center">
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <Play size={24} /> Start Competition
                    </h1>
                    <div className="text-blue-200">
                        Event: <span className="font-bold text-white ml-2">{selectedRun}</span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex overflow-x-auto bg-gray-100 border-b">
                    {RUN_TYPES.map(type => (
                        <button
                            key={type}
                            onClick={() => setSelectedRun(type)}
                            className={`px-6 py-4 font-medium whitespace-nowrap transition-colors ${selectedRun === type
                                ? 'bg-white text-blue-900 border-b-2 border-blue-900'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-6 flex-1 bg-gray-50">
                    {sortedTeams.length === 0 ? (
                        <div className="text-center text-gray-500 py-12">
                            <Flag size={48} className="mx-auto mb-4 text-gray-300" />
                            <p className="text-xl">No teams registered for {selectedRun}</p>
                        </div>
                    ) : (
                        <div className="space-y-4 max-w-4xl mx-auto">
                            {sortedTeams.map((team, index) => (
                                <div key={team._id} className="bg-white p-4 rounded-lg shadow flex items-center justify-between border-l-4 border-blue-500">
                                    <div className="flex items-center gap-6">
                                        <div className="text-2xl font-bold text-gray-300 w-12 text-center">
                                            #{index + 1}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800">{team.ownerName}</h3>
                                            <p className="text-gray-500">{team.dogName}</p>
                                        </div>
                                    </div>
                                    {team.registrations?.find(r => r.runType === selectedRun)?.status === 'completed' ? (
                                        <div className="flex items-center gap-4">
                                            <div className="text-green-600 font-bold text-xl">
                                                {selectedRun === 'Multiple Challenge'
                                                    ? `${team.registrations.find(r => r.runType === selectedRun).totalScore.toFixed(2)}s`
                                                    : `${team.registrations.find(r => r.runType === selectedRun).totalScore.toFixed(1)} pts`
                                                }
                                            </div>
                                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">Completed</span>
                                            {(selectedRun === 'Distance Beginners' || selectedRun === 'Distance Advanced') && (
                                                <button
                                                    onClick={() => setEditingTeam(team)}
                                                    className="text-blue-600 hover:text-blue-800 text-sm font-bold underline px-2"
                                                >
                                                    Edit Results
                                                </button>
                                            )}
                                            {selectedRun === 'Freestyle' && (
                                                <button
                                                    onClick={() => handleEnterResult(team)}
                                                    className="text-blue-600 hover:text-blue-800 text-sm font-bold underline px-2"
                                                >
                                                    Continue Judging
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleEnterResult(team)}
                                            className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 font-medium shadow-sm active:transform active:scale-95 transition-all"
                                        >
                                            Enter Result
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Results Modal - Only for Distance editing */}
            {/* Edit Results Modal - Only for Distance editing */}
            {(selectedRun === 'Distance Beginners' || selectedRun === 'Distance Advanced') && (
                <DistanceEditModal
                    isOpen={!!editingTeam}
                    team={editingTeam}
                    runType={selectedRun}
                    onClose={() => setEditingTeam(null)}
                    onSave={handleUpdateResult}
                />
            )}
        </div>
    );
}
