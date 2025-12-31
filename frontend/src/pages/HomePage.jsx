import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Calendar, Trash2 } from 'lucide-react';

export default function HomePage() {
    const [competitions, setCompetitions] = useState([]);
    const [newCompName, setNewCompName] = useState('');
    const [newCompDate, setNewCompDate] = useState('');

    useEffect(() => {
        fetch('http://localhost:3000/api/competitions')
            .then(res => res.json())
            .then(data => setCompetitions(data))
            .catch(err => console.error('Failed to fetch competitions', err));
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newCompName || !newCompDate) return;

        try {
            const res = await fetch('http://localhost:3000/api/competitions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newCompName, date: newCompDate }),
            });
            const data = await res.json();
            setCompetitions([data, ...competitions]);
            setNewCompName('');
            setNewCompDate('');
        } catch (err) {
            console.error('Failed to create competition', err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this competition? ALL TEAMS will be permanently deleted.")) {
            return;
        }

        try {
            const res = await fetch(`http://localhost:3000/api/competitions/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setCompetitions(competitions.filter(c => c._id !== id));
            } else {
                alert("Failed to delete competition");
            }
        } catch (err) {
            console.error(err);
            alert("Error deleting competition");
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold text-blue-900 mb-8 text-center">Dog Frisbee Competitions</h1>

            {/* Create Form */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-8 max-w-2xl mx-auto">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Create New Competition</h2>
                <form onSubmit={handleCreate} className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Competition Name</label>
                        <input
                            type="text"
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            value={newCompName}
                            onChange={(e) => setNewCompName(e.target.value)}
                            placeholder="e.g. Summer Championship 2025"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input
                            type="date"
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            value={newCompDate}
                            onChange={(e) => setNewCompDate(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
                    >
                        <Plus size={20} /> Create
                    </button>
                </form>
            </div>

            {/* Competitions List */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {competitions.map((comp) => (
                    <div key={comp._id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow relative group">
                        <button 
                            onClick={() => handleDelete(comp._id)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-red-600 p-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete Competition"
                        >
                            <Trash2 size={20} />
                        </button>
                        <h3 className="text-xl font-bold text-gray-800 mb-2 pr-8">{comp.name}</h3>
                        <div className="text-gray-600 flex items-center gap-2 mb-4">
                            <Calendar size={18} />
                            {new Date(comp.date).toLocaleDateString()}
                        </div>
                        <Link
                            to={`/competition/${comp._id}`}
                            className="block text-center bg-gray-100 text-blue-800 font-semibold py-2 rounded hover:bg-gray-200"
                        >
                            Manage & View Details
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}
