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
                        const isFreestyle = runType === 'Freestyle';

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

                        // Freestyle Columns
                        // Freestyle Columns
                        if (isFreestyle) {
                            const f = reg?.freestyle || {};
                            const dog = f.dog || {};
                            const player = f.player || {};
                            const teamScores = f.team || {};
                            const exec = f.execution || {};

                            // Safe Access Helpers
                            const val = (v) => (v !== undefined && v !== null) ? Number(v) : 0;

                            row['Prey'] = val(dog.prey);
                            row['Retrieve'] = val(dog.retrieve);
                            row['Athleticism'] = val(dog.athleticism);
                            row['Grip'] = val(dog.grip);

                            row['Field Pres.'] = val(player.fieldPresentation);
                            row['Releases'] = val(player.releases);
                            row['Disc Mgmt.'] = val(player.discManagement);
                            row['Flow'] = val(player.flow);

                            // Safe Team Items Calculation
                            let top4 = 0;
                            try {
                                top4 = Object.values(teamScores || {})
                                    .map(v => val(v))
                                    .sort((a, b) => b - a)
                                    .slice(0, 4)
                                    .reduce((a, b) => a + b, 0);
                            } catch (err) { console.error('Error calculating team scores', err); }
                            row['Team Items (Top 4)'] = top4;

                            // Safe Execution Calculation
                            const throws = val(exec.throws);
                            const catches = val(exec.catches);
                            const ratio = throws > 0 ? (catches / throws) : 0;

                            row['Exec Ratio'] = `${catches}/${throws}`;
                            row['Exec Score'] = (ratio * 10).toFixed(2);

                            // Recalculate Total for export consistency
                            const dogSum = val(dog.prey) + val(dog.retrieve) + val(dog.athleticism) + val(dog.grip);
                            const playerSum = val(player.fieldPresentation) + val(player.releases) + val(player.discManagement) + val(player.flow);

                            const total = dogSum + playerSum + top4 + (ratio * 10);
                            row['Total Score'] = total.toFixed(2);
                        }

                        // Time Trial Columns
                        if (runType === 'Time Trial') {
                            // Qualifier Time
                            const qt = reg.qualifierTime || reg.totalScore || 0;
                            row['Qualifier Time'] = qt > 0 ? (qt / 1000).toFixed(2) : 'No Time';

                            // Bracket Info
                            let rank = 'Qualifier';
                            let finalResult = '-';

                            if (competition && competition.timeTrial && competition.timeTrial.matches) {
                                const matches = competition.timeTrial.matches;
                                // Find all matches this team played
                                const teamMatches = matches.filter(m => m.team1Id === team._id || m.team2Id === team._id);

                                if (teamMatches.length > 0) {
                                    // Sort by round (16 -> 8 -> 4 -> 2)
                                    // The smallest round number (2 = Final) is the furthest they went
                                    teamMatches.sort((a, b) => a.round - b.round);
                                    const bestMatch = teamMatches[0]; // E.g. Final is round 2
                                    const isWinner = bestMatch.winnerId === team._id;

                                    if (bestMatch.round === 2) {
                                        rank = isWinner ? 'Winner 🥇' : 'Runner Up 🥈';
                                    } else if (bestMatch.round === 4) {
                                        rank = 'Top 4';
                                    } else if (bestMatch.round === 8) {
                                        rank = 'Top 8';
                                    } else if (bestMatch.round === 16) {
                                        rank = 'Top 16';
                                    }
                                }
                            }
                            row['Tournament Rank'] = rank;
                        }

                        if (isTimeBased) {
                            row['Final Result (Time)'] = isCompleted ? reg.totalScore?.toFixed(2) : '-';
                        } else if (!isFreestyle) {
                            row['Final Result (Score)'] = isCompleted ? reg.totalScore?.toFixed(1) : '-';
                        }

                        row['Status'] = isCompleted ? 'Completed' : 'טרם בוצע';
                        return row;
                    });

                    const ws = XLSX.utils.json_to_sheet(data);

                    const wscols = [{ wch: 20 }, { wch: 15 }, { wch: 20 }];
                    if (runType === 'Freestyle') {
                        for (let i = 0; i < 15; i++) wscols.push({ wch: 12 });
                    } else {
                        wscols.push({ wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 });
                    }
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
