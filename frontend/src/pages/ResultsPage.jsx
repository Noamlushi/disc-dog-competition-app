import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ResultsPage() {
    const { id } = useParams();
    const [teams, setTeams] = useState([]);
    const [competition, setCompetition] = useState(null);

    useEffect(() => {
        fetch(`http://localhost:3000/api/competitions/${id}/teams`)
            .then(res => res.json())
            .then(data => setTeams(data));

        fetch(`http://localhost:3000/api/competitions/${id}`)
            .then(res => res.json())
            .then(data => setCompetition(data));
    }, [id]);

    const handleExport = () => {
        if (!teams.length) return;

        // Process Distance teams
        const distanceTeams = teams.filter(t =>
            t.registrations?.some(r => r.runType === 'Distance' && r.status === 'completed')
        );

        const data = distanceTeams.map(team => {
            const reg = team.registrations.find(r => r.runType === 'Distance');
            const row = {
                'Owner': team.ownerName,
                'Dog': team.dogName,
                'Total Score': reg.totalScore || 0
            };

            // detailed attempts
            if (reg.attempts) {
                reg.attempts.forEach((attempt, index) => {
                    const label = `Throw ${index + 1}`;
                    row[label] = attempt.isFootFault ? 0 : attempt.points;
                    // Optional: Detailed info in separate columns if needed
                    // row[`${label} Details`] = `Zone ${attempt.zone} ${attempt.jump ? '+J' : ''}`;
                });
            }
            return row;
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Distance Results");
        XLSX.writeFile(wb, `${competition?.name || 'competition'}_results.xlsx`);
    };

    return (
        <div className="container mx-auto p-4">
            <Link to={`/competition/${id}`} className="text-gray-600 hover:text-blue-800 flex items-center gap-2 mb-8">
                <ArrowLeft size={20} /> Back to Competition
            </Link>

            <div className="bg-white p-12 rounded-lg shadow-md text-center">
                <h1 className="text-3xl font-bold text-blue-900 mb-4">{competition?.name} Results</h1>
                <div className="mb-8 text-gray-600">
                    <p>Total Teams: {teams.length}</p>
                    <p>Completed Runs: {teams.filter(t => t.registrations?.some(r => r.status === 'completed')).length}</p>
                </div>

                <button
                    onClick={handleExport}
                    className="bg-green-600 text-white px-8 py-4 rounded-xl hover:bg-green-700 flex items-center gap-3 mx-auto text-xl font-bold shadow-lg active:scale-95 transition-transform"
                >
                    <Download size={24} /> Export Results to Excel
                </button>
            </div>
        </div>
    );
}
