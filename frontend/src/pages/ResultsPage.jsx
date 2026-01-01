import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ResultsPage() {
    const { id } = useParams();
    const [teams, setTeams] = useState([]);
    const [competition, setCompetition] = useState(null);

    useEffect(() => {
        // Fetch Teams
        fetch(`http://localhost:3000/api/competitions/${id}/teams`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch teams');
                return res.json();
            })
            .then(data => setTeams(data))
            .catch(err => console.error("Error fetching teams:", err));

        // Fetch Competition Details using the EXACT endpoint structure
        fetch(`http://localhost:3000/api/competitions/${id}`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch competition');
                return res.json();
            })
            .then(data => {
                console.log("Competition loaded:", data);
                setCompetition(data);
            })
            .catch(err => console.error("Error fetching competition:", err));
    }, [id]);

    const handleExport = () => {
        console.log("Starting export...");
        if (!teams.length) {
            alert("No teams data found to export.");
            return;
        }

        try {
            const wb = XLSX.utils.book_new();

            const RUN_TYPES = [
                'Distance Beginners', 'Distance Advanced', 'Multiple Challenge', 'Frisgility', 'Shuffle',
                'Wheel of Fortune', 'Criss Cross', 'Time Trial', 'Freestyle'
            ];

            let hasData = false;

            RUN_TYPES.forEach(runType => {
                // 1. Filter teams
                const runTeams = teams.filter(t =>
                    t.registrations?.some(r => r.runType === runType || (runType === 'Distance Beginners' && r.runType === 'Distance'))
                );

                if (runTeams.length > 0) {
                    hasData = true;
                    // ... (rest of sorting and mapping logic remains same, ensuring loop integrity)

                    // 2. Sort Logic (move 'Not Performed' to bottom)
                    runTeams.sort((a, b) => {
                        const getReg = (t) => t.registrations.find(r => r.runType === runType || (runType === 'Distance Beginners' && r.runType === 'Distance'));
                        const regA = getReg(a);
                        const regB = getReg(b);
                        const statusA = regA?.status === 'completed' ? 1 : 0;
                        const statusB = regB?.status === 'completed' ? 1 : 0;
                        if (statusA !== statusB) return statusB - statusA;
                        if (statusA === 1) { // Both completed - check time vs score
                            const isTimeBased = ['Multiple Challenge', 'Time Trial'].includes(runType);
                            return isTimeBased ? (regA.totalScore - regB.totalScore) : (regB.totalScore - regA.totalScore);
                        }
                        return 0;
                    });

                    // 3. Map Data
                    const data = runTeams.map(team => {
                        const reg = team.registrations.find(r => r.runType === runType || (runType === 'Distance Beginners' && r.runType === 'Distance'));
                        const isCompleted = reg?.status === 'completed';
                        const isDistance = runType.includes('Distance') || runType === 'Distance Beginners';
                        const isTimeBased = ['Multiple Challenge', 'Time Trial'].includes(runType);

                        const row = {
                            'Owner Name': team.ownerName || '-',
                            'Dog Name': team.dogName || '-',
                            'Run Type': runType
                        };

                        if (isDistance) {
                            for (let i = 1; i <= 5; i++) {
                                let val = '0';
                                if (isCompleted && reg.attempts && reg.attempts[i - 1]) {
                                    const att = reg.attempts[i - 1];
                                    val = att.isFootFault ? '0' : att.points.toString();
                                }
                                row[`Attempt ${i}`] = val;
                            }
                        }

                        if (isTimeBased) {
                            row['Final Result (Time)'] = isCompleted ? reg.totalScore?.toFixed(2) : '-';
                        } else {
                            row['Final Result (Score)'] = isCompleted ? reg.totalScore?.toFixed(1) : '-';
                        }
                        row['Status'] = isCompleted ? 'Completed' : 'טרם בוצע';
                        return row;
                    });

                    const ws = XLSX.utils.json_to_sheet(data);
                    const wscols = [{ wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 }];
                    ws['!cols'] = wscols;
                    XLSX.utils.book_append_sheet(wb, ws, runType.substring(0, 31));
                }
            });

            if (!hasData) {
                alert("No registered teams found for any run type.");
                return;
            }

            // 4. Filename & Download
            // Ensure we have a string for the name
            let baseName = 'Results';
            if (competition && competition.name) {
                // Remove any characters that aren't letters, numbers, spaces, or dashes
                baseName = competition.name.replace(/[^a-zA-Z0-9\u0590-\u05ff\- ]/g, '_').trim();
            }
            if (!baseName) baseName = 'Results';

            const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
            const filename = `${baseName}_${dateStr}.xlsx`;

            console.log(`Generating file: ${filename}`);

            // MANUAL BLOB METHOD - Most reliable for control
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename; // This is crucial
            document.body.appendChild(a);
            a.click();

            // Cleanup
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 100);

        } catch (error) {
            console.error("Export failed:", error);
            alert(`Export failed: ${error.message}`);
        }
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
