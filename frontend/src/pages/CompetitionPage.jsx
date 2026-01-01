import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Dog, Save, ArrowLeft, BarChart2, Trash2, Edit, ListOrdered, Play } from 'lucide-react';
import EditTeamModal from '../components/EditTeamModal';

const RUN_TYPES = [
    'Distance Beginners', 'Distance Advanced', 'Multiple Challenge', 'Frisgility', 'Shuffle',
    'Wheel of Fortune', 'Criss Cross', 'Time Trial', 'Freestyle'
];

export default function CompetitionPage() {
    const { id } = useParams();
    const [competition, setCompetition] = useState(null);
    const [teams, setTeams] = useState([]);
    const [ownerName, setOwnerName] = useState('');
    const [dogName, setDogName] = useState('');
    const [editingTeam, setEditingTeam] = useState(null);

    useEffect(() => {
        fetch(`http://localhost:3000/api/competitions/${id}`)
            .then(res => res.json())
            .then(data => setCompetition(data));

        fetch(`http://localhost:3000/api/competitions/${id}/teams`)
            .then(res => res.json())
            .then(data => setTeams(data));
    }, [id]);

    const handleAddTeam = async (e) => {
        e.preventDefault();
        if (!ownerName || !dogName) return;

        try {
            const res = await fetch(`http://localhost:3000/api/competitions/${id}/teams`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ownerName, dogName, registrations: [] }),
            });
            const newTeam = await res.json();
            setTeams([...teams, newTeam]);
            setOwnerName('');
            setDogName('');
        } catch (err) {
            console.error('Failed to add team', err);
        }
    };

    const handleDeleteTeam = async (teamId) => {
        if (!confirm('Are you sure you want to delete this team?')) return;
        try {
            await fetch(`http://localhost:3000/api/teams/${teamId}`, { method: 'DELETE' });
            setTeams(teams.filter(t => t._id !== teamId));
        } catch (err) {
            console.error('Failed to delete team', err);
        }
    };

    const handleUpdateTeam = async (updatedTeam) => {
        try {
            const res = await fetch(`http://localhost:3000/api/teams/${updatedTeam._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedTeam),
            });
            const savedTeam = await res.json();
            setTeams(teams.map(t => t._id === savedTeam._id ? savedTeam : t));
            setEditingTeam(null);
        } catch (err) {
            console.error('Failed to update team', err);
        }
    };

    const toggleRun = async (teamId, runType) => {
        const team = teams.find(t => t._id === teamId);
        if (!team) return;

        const isRegistered = team.registrations?.some(r => r.runType === runType);
        let newRegistrations;

        if (isRegistered) {
            newRegistrations = team.registrations.filter(r => r.runType !== runType);
        } else {
            newRegistrations = [...(team.registrations || []), { runType, order: 999 }];
        }

        // Optimistic update
        const updatedTeam = { ...team, registrations: newRegistrations };
        setTeams(teams.map(t => t._id === teamId ? updatedTeam : t));

        try {
            await fetch(`http://localhost:3000/api/teams/${teamId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ registrations: newRegistrations }),
            });
        } catch (err) {
            console.error('Failed to update run', err);
        }
    };

    if (!competition) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="container mx-auto p-4">
            <div className="mb-6 flex flex-wrap gap-4 justify-between items-center">
                <Link to="/" className="text-gray-600 hover:text-blue-800 flex items-center gap-2">
                    <ArrowLeft size={20} /> Back
                </Link>
                <div className="flex gap-2">
                    <Link to={`/competition/${id}/order`} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 flex items-center gap-2">
                        <ListOrdered size={20} /> Order of Go
                    </Link>
                    <Link to={`/competition/${id}/start`} className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 flex items-center gap-2">
                        <Play size={20} /> Start
                    </Link>
                    <Link to={`/competition/${id}/results`} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2">
                        <BarChart2 size={20} /> Results & Export
                    </Link>
                </div>
            </div>

            <h1 className="text-3xl font-bold text-blue-900 mb-2 text-center">{competition.name}</h1>
            <p className="text-center text-gray-600 mb-8">{new Date(competition.date).toLocaleDateString()}</p>

            {/* Add Team Form */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-8 max-w-3xl mx-auto">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Register New Team</h2>
                <form onSubmit={handleAddTeam} className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name</label>
                        <div className="relative">
                            <User className="absolute left-2 top-2.5 text-gray-400" size={18} />
                            <input
                                type="text"
                                className="w-full border p-2 pl-8 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                value={ownerName}
                                onChange={(e) => setOwnerName(e.target.value)}
                                placeholder="Owner's Name"
                            />
                        </div>
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dog Name</label>
                        <div className="relative">
                            <Dog className="absolute left-2 top-2.5 text-gray-400" size={18} />
                            <input
                                type="text"
                                className="w-full border p-2 pl-8 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                value={dogName}
                                onChange={(e) => setDogName(e.target.value)}
                                placeholder="Dog's Name"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
                    >
                        <Save size={18} /> Register
                    </button>
                </form>
            </div>

            {/* Teams List */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-100 border-b">
                                <th className="p-4 font-bold text-gray-700 w-16">Actions</th>
                                <th className="p-4 font-bold text-gray-700">Owner</th>
                                <th className="p-4 font-bold text-gray-700">Dog</th>
                                {RUN_TYPES.map(type => (
                                    <th key={type} className="p-4 text-xs font-bold text-gray-600 text-center w-24">
                                        {type}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {teams.length === 0 ? (
                                <tr>
                                    <td colSpan={3 + RUN_TYPES.length} className="p-8 text-center text-gray-500">
                                        No teams registered yet.
                                    </td>
                                </tr>
                            ) : teams.map((team) => (
                                <tr key={team._id} className="border-b hover:bg-gray-50">
                                    <td className="p-4 flex gap-2">
                                        <button onClick={() => setEditingTeam(team)} className="text-blue-600 hover:text-blue-800">
                                            <Edit size={18} />
                                        </button>
                                        <button onClick={() => handleDeleteTeam(team._id)} className="text-red-600 hover:text-red-800">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                    <td className="p-4 font-medium">{team.ownerName}</td>
                                    <td className="p-4 text-gray-600">{team.dogName}</td>
                                    {RUN_TYPES.map(type => (
                                        <td key={type} className="p-4 text-center">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                                checked={team.registrations?.some(r => r.runType === type)}
                                                onChange={() => toggleRun(team._id, type)}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingTeam && (
                <EditTeamModal
                    team={editingTeam}
                    onClose={() => setEditingTeam(null)}
                    onSave={handleUpdateTeam}
                />
            )}
        </div>
    );
}
