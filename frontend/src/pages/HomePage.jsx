import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Calendar, Trash2 } from 'lucide-react';

export default function HomePage() {
    const [competitions, setCompetitions] = useState([]);
    const [newCompName, setNewCompName] = useState('');
    const [newCompDate, setNewCompDate] = useState('');

    const [deleteId, setDeleteId] = useState(null); // State for delete modal

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

    const confirmDelete = (id) => {
        setDeleteId(id);
    };

    const handleDelete = async () => {
        if (!deleteId) return;

        try {
            const res = await fetch(`http://localhost:3000/api/competitions/${deleteId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setCompetitions(competitions.filter(c => c._id !== deleteId));
                setDeleteId(null);
            } else {
                alert("Failed to delete competition");
            }
        } catch (err) {
            console.error(err);
            alert("Error deleting competition");
        }
    };

    return (
        <div className="container mx-auto p-4 relative">
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
                            onClick={(e) => { e.stopPropagation(); confirmDelete(comp._id); }}
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

            {/* Delete Confirmation Modal */}
            {deleteId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Competition?</h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete this competition? <br />
                            <span className="font-bold text-red-600">ALL registered teams and scores will be permanently deleted.</span>
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteId(null)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
