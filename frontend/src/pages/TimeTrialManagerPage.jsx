import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Timer, Users, Lock, ChevronRight } from 'lucide-react';
import ScoringController from '../components/TimeTrial/ScoringController';

export default function TimeTrialManagerPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    // State
    const [activeTab, setActiveTab] = useState('qualifiers'); // 'qualifiers' or 'bracket'
    const [competition, setCompetition] = useState(null);
    const [teams, setTeams] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [showConfirmStart, setShowConfirmStart] = useState(null); // '16', '8', '4' or null

    // Polling & Initial Data
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [id]);

    // Auto-open modal if teamId query param exists
    useEffect(() => {
        // Auto-switch to bracket if status is 'bracket'
        if (competition?.timeTrial?.status === 'bracket' && activeTab !== 'bracket') {
            setActiveTab('bracket');
        }

        if (teams.length > 0) {
            const params = new URLSearchParams(window.location.search);
            const teamIdParam = params.get('teamId');
            const tabParam = params.get('tab');

            if (tabParam) setActiveTab(tabParam);

            if (teamIdParam && !selectedTeam) {
                const teamToScore = teams.find(t => t._id === teamIdParam);
                if (teamToScore) {
                    setSelectedTeam(teamToScore);
                    // Clear param so refresh doesn't reopen
                    window.history.replaceState({}, '', `/competition/${id}/time-trial/manager`);
                }
            }
        }
    }, [teams, id, competition]);

    const fetchData = async () => {
        try {
            const [compRes, teamsRes] = await Promise.all([
                fetch(`http://localhost:3000/api/competitions/${id}`),
                fetch(`http://localhost:3000/api/competitions/${id}/teams`)
            ]);
            const compData = await compRes.json();
            const teamsData = await teamsRes.json();

            setCompetition(compData);
            setTeams(teamsData);
        } catch (err) {
            console.error('Error fetching data:', err);
        }
    };

    // --- Qualifier Logic ---
    const getQualifierTeams = () => {
        return teams.filter(t => t.registrations.some(r => r.runType === 'Time Trial'))
            .map(t => {
                const reg = t.registrations.find(r => r.runType === 'Time Trial');
                return { ...t, qualifierTime: reg.qualifierTime || 0, status: reg.status };
            })
            .sort((a, b) => {
                // Sort by time (ascending), but 0 (no time) goes to bottom
                if (a.qualifierTime === 0 && b.qualifierTime === 0) return 0;
                if (a.qualifierTime === 0) return 1;
                if (b.qualifierTime === 0) return -1;
                return a.qualifierTime - b.qualifierTime;
            });
    };

    const handleQualifierSave = async (time) => {
        if (!selectedTeam) return;

        const updatedRegistrations = selectedTeam.registrations.map(reg => {
            if (reg.runType === 'Time Trial') {
                return { ...reg, status: 'completed', qualifierTime: time, totalScore: time }; // Save as totalScore too for consistency
            }
            return reg;
        });

        await fetch(`http://localhost:3000/api/teams/${selectedTeam._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ registrations: updatedRegistrations }),
        });

        setSelectedTeam(null);
        fetchData(); // Refresh immediately
    };

    // --- Tournament Generation Logic ---
    const generateBracketMatches = (qualifiedTeams, size) => {
        const matches = [];
        let matchCounter = 1;

        // Helper to get next match link
        // For a match index i (0-based) in a round with N matches:
        // It feeds into match floor(i/2) in the next round.
        // If i is even, it goes to Slot 1 (team1). If odd, Slot 2 (team2).

        const createRound = (roundName, numMatches, teamsForRound = [], roundNum) => {
            const roundMatches = [];
            for (let i = 0; i < numMatches; i++) {
                const isFirstRound = teamsForRound.length > 0;
                const team1 = isFirstRound ? teamsForRound[i] : null;
                const team2 = isFirstRound ? teamsForRound[teamsForRound.length - 1 - i] : null; // Seed: top vs bottom

                const nextMatchIndex = Math.floor(i / 2);
                const nextMatchSlot = (i % 2 === 0) ? 1 : 2;

                // Determine next round name for linkage
                let nextRoundPrefix = '';
                if (numMatches === 8) nextRoundPrefix = 'Qtr';
                if (numMatches === 4) nextRoundPrefix = 'Semi';
                if (numMatches === 2) nextRoundPrefix = 'Final';

                const nextMatchId = nextRoundPrefix ? `${nextRoundPrefix}-M${nextMatchIndex + 1}` : null;

                roundMatches.push({
                    id: `${roundName}-M${i + 1}`,
                    round: roundNum, // 16, 8, 4, 2
                    team1Id: team1 ? team1._id : null,
                    team2Id: team2 ? team2._id : null,
                    team1Time: 0,
                    team2Time: 0,
                    status: (team1 && team2) ? 'active' : 'pending',
                    nextMatchId,
                    nextMatchSlot
                });
            }
            return roundMatches;
        };

        // Generate rounds based on size
        // Note: roundNum matches "size of round" logic: 16 -> 8 -> 4 -> 2
        // But for sorting, usually we use: 1=R16, 2=Qtr, 3=Semi, 4=Final. 
        // Let's stick to "Teams Remaining" convention or just distinct rounds.
        // Let's use: 16 (R16), 8 (Qtr), 4 (Semi), 2 (Final).

        if (size >= 16) {
            matches.push(...createRound('R16', 8, qualifiedTeams, 16));
        }
        if (size >= 8) {
            const teams = size === 8 ? qualifiedTeams : []; // If starting at 8, seed here
            matches.push(...createRound('Qtr', 4, teams, 8));
        }
        if (size >= 4) {
            const teams = size === 4 ? qualifiedTeams : [];
            matches.push(...createRound('Semi', 2, teams, 4));
        }
        matches.push(...createRound('Final', 1, [], 2));

        // Correct the "nextMatchId" linkage for the specific start size
        // (The generic logic above works relative to typical full tree, but might need adjustment if starting at Top 8)
        // Actually, the simple logic handles it if we name them consistently.

        return matches;
    };

    const startTournament = async (size) => {
        // Confirmation is now handled in the UI before calling this, or we can use the state here if needed.
        // But since the button will set the state, this function is the FINAL action.

        const qualifiedTeams = getQualifierTeams().slice(0, size);
        const matches = generateBracketMatches(qualifiedTeams, size);

        const updatedComp = {
            ...competition,
            timeTrial: {
                ...competition.timeTrial,
                status: 'bracket',
                bracketSize: size,
                matches: matches
            }
        };

        await fetch(`http://localhost:3000/api/competitions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedComp),
        });

        // Reset UI state
        setShowConfirmStart(null);
        setActiveTab('bracket');
        fetchData();
    };

    // --- Bracket Logic ---
    const handleMatchSave = async (teamSide, time) => {
        if (!selectedMatch) return;

        // Deep copy matches to mutate
        const matches = JSON.parse(JSON.stringify(competition.timeTrial.matches));
        const matchIndex = matches.findIndex(m => m.id === selectedMatch.id);
        const match = matches[matchIndex];

        if (teamSide === 1) match.team1Time = time;
        if (teamSide === 2) match.team2Time = time;

        // Check for winner
        let promoted = false;
        if (match.team1Time > 0 && match.team2Time > 0) {
            match.status = 'completed';
            // Lower time wins
            const winnerId = match.team1Time < match.team2Time ? match.team1Id : match.team2Id;
            match.winnerId = winnerId;

            // Promote Winner to Next Match
            if (match.nextMatchId) {
                const nextMatch = matches.find(m => m.id === match.nextMatchId);
                if (nextMatch) {
                    if (match.nextMatchSlot === 1) nextMatch.team1Id = winnerId;
                    else nextMatch.team2Id = winnerId;

                    // Activate next match if both are ready
                    if (nextMatch.team1Id && nextMatch.team2Id) {
                        nextMatch.status = 'active';
                    }
                    promoted = true;
                }
            }
        } else {
            match.status = 'active';
        }

        const updatedComp = {
            ...competition,
            timeTrial: { ...competition.timeTrial, matches }
        };

        await fetch(`http://localhost:3000/api/competitions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedComp),
        });

        fetchData();
        if (match.status === 'completed') {
            setSelectedMatch(null);
            if (promoted) alert(`Match Completed! Winner advanced to ${match.nextMatchId}`);
        }
    };


    if (!competition) return <div className="p-8 text-center">Loading...</div>;

    const qualifiers = getQualifierTeams();
    const isBracketMode = competition.timeTrial?.status === 'bracket';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
            {/* Header */}
            <header className="bg-white dark:bg-slate-800 shadow p-4 sticky top-0 z-10 transition-colors">
                <div className="container mx-auto flex justify-between items-center">
                    <button onClick={() => navigate(`/competition/${id}/judge`)} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600">
                        <ArrowLeft /> Back
                    </button>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                        <Timer /> Time Trial Manager
                    </h1>
                    <div className="w-20"></div>
                </div>

                {/* Tabs */}
                <div className="container mx-auto mt-4 flex gap-4 border-b border-gray-200 dark:border-slate-700">
                    {!isBracketMode && (
                        <button
                            onClick={() => setActiveTab('qualifiers')}
                            className={`pb-2 px-4 font-bold border-b-4 transition-colors ${activeTab === 'qualifiers' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-400'}`}
                        >
                            Qualifiers
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('bracket')}
                        className={`pb-2 px-4 font-bold border-b-4 transition-colors ${activeTab === 'bracket' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-400'}`}
                    >
                        <span className="flex items-center gap-2">
                            Tournament Bracket {isBracketMode && <Lock size={14} className="text-green-500" />}
                        </span>
                    </button>
                </div>
            </header>

            <main className="container mx-auto p-4 max-w-6xl">
                {/* QUALIFIERS TAB - Only show if tournament NOT started */}
                {activeTab === 'qualifiers' && !isBracketMode && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* List */}
                        <div className="lg:col-span-2 space-y-4">
                            <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200">Registered Teams</h2>
                            {qualifiers.map((team, idx) => (
                                <div key={team._id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow flex justify-between items-center transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="font-mono font-bold text-gray-400 text-lg">#{idx + 1}</div>
                                        <div>
                                            <div className="font-bold text-gray-800 dark:text-white">{team.ownerName} & {team.dogName}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                {team.qualifierTime > 0
                                                    ? `Best Time: ${(team.qualifierTime / 1000).toFixed(2)}s`
                                                    : 'No time recorded'}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedTeam(team)}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700"
                                    >
                                        Judge Run
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Sidebar / Actions */}
                        <div className="space-y-6">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-900/50">
                                <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-4 flex items-center gap-2">
                                    <Trophy size={20} /> Tournament Setup
                                </h3>
                                {!showConfirmStart ? (
                                    <>
                                        <p className="text-sm text-blue-800 dark:text-blue-400 mb-4">
                                            When qualifiers are finished, select the bracket size to automatically seed the tournament.
                                        </p>
                                        <div className="grid grid-cols-1 gap-2">
                                            {[16, 8, 4].map(size => (
                                                <button
                                                    key={size}
                                                    onClick={() => setShowConfirmStart(size)}
                                                    disabled={qualifiers.length < size}
                                                    className="bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 py-3 rounded-lg border-2 border-blue-100 dark:border-blue-800 font-bold hover:border-blue-300 disabled:opacity-50 transition-colors"
                                                >
                                                    Start Top {size}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="animate-fade-in">
                                        <div className="bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded-lg mb-4 text-yellow-800 dark:text-yellow-200 text-sm">
                                            <strong>Warning:</strong> Starting the Top {showConfirmStart} will lock qualifiers. This cannot be undone.
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => startTournament(showConfirmStart)}
                                                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 shadow-lg"
                                            >
                                                Confirm Start
                                            </button>
                                            <button
                                                onClick={() => setShowConfirmStart(null)}
                                                className="flex-1 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg font-bold hover:bg-gray-300"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* BRACKET TAB */}
                {activeTab === 'bracket' && (
                    <div>
                        {!isBracketMode ? (
                            <div className="text-center py-20 text-gray-400 space-y-4">
                                <Lock size={48} className="mx-auto mb-4 opacity-50" />
                                <h3 className="text-xl font-bold">Tournament Locked</h3>
                                <p>Qualifiers are still in progress. Start the tournament from the sidebar.</p>
                                {qualifiers.length >= 4 && (
                                    <div className="max-w-md mx-auto bg-blue-50 dark:bg-slate-800 p-6 rounded-xl border border-blue-100 dark:border-slate-700 mt-8">
                                        <p className="mb-4 text-gray-700 dark:text-gray-300 font-medium">Ready to start?</p>
                                        <div className="flex gap-2 justify-center">
                                            {[16, 8, 4].map(size => (
                                                <button
                                                    key={size}
                                                    onClick={() => startTournament(size)}
                                                    disabled={qualifiers.length < size}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 disabled:opacity-50"
                                                >
                                                    Top {size}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6">
                                <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200">Active Matches</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {competition.timeTrial.matches.map(match => {
                                        const team1 = teams.find(t => t._id === match.team1Id);
                                        const team2 = teams.find(t => t._id === match.team2Id);
                                        if (!team1 || !team2) return null;

                                        return (
                                            <div key={match.id} className={`bg-white dark:bg-slate-800 p-4 rounded-xl shadow border-2 cursor-pointer transition-all ${match.status === 'completed' ? 'border-green-500 opacity-75' : 'border-gray-200 dark:border-slate-700 hover:border-blue-400'}`}
                                                onClick={() => setSelectedMatch(match)}
                                            >
                                                <div className="flex justify-between items-center text-sm font-bold text-gray-400 mb-2">
                                                    <span>{match.id}</span>
                                                    <span className="uppercase">{match.status}</span>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className={`p-2 rounded flex justify-between ${match.winnerId === team1._id ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-50 dark:bg-slate-700 dark:text-gray-300'}`}>
                                                        <span>{team1.ownerName}</span>
                                                        <span>{(match.team1Time / 1000).toFixed(2)}s</span>
                                                    </div>
                                                    <div className={`p-2 rounded flex justify-between ${match.winnerId === team2._id ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-50 dark:bg-slate-700 dark:text-gray-300'}`}>
                                                        <span>{team2.ownerName}</span>
                                                        <span>{(match.team2Time / 1000).toFixed(2)}s</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* MODAL: SCORING CONTROLLER */}
            {selectedTeam && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="max-w-xl w-full">
                        <ScoringController
                            teamName={`${selectedTeam.ownerName} & ${selectedTeam.dogName}`}
                            onSave={handleQualifierSave}
                            onReset={() => { }}
                            initialTime={0}
                        />
                        <button
                            onClick={() => setSelectedTeam(null)}
                            className="mt-4 w-full py-3 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL: MATCH SCORING */}
            {selectedMatch && (
                <div className="fixed inset-0 bg-black/90 z-50 flex flex-col p-4 overflow-y-auto">
                    <div className="flex justify-between items-center mb-8 container mx-auto max-w-5xl">
                        <h2 className="text-2xl font-bold text-white">Match Scoring: {selectedMatch.id}</h2>
                        <button
                            onClick={() => setSelectedMatch(null)}
                            className="text-white hover:text-gray-300 text-lg font-bold"
                        >
                            Close X
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 container mx-auto max-w-5xl flex-1">
                        {/* Team 1 Controller */}
                        <div className="flex flex-col gap-4">
                            <div className="text-white font-bold text-center text-xl">
                                {teams.find(t => t._id === selectedMatch.team1Id)?.ownerName}
                            </div>
                            <ScoringController
                                teamName="Team 1"
                                initialTime={selectedMatch.team1Time}
                                onSave={(time) => handleMatchSave(1, time)}
                            />
                        </div>

                        {/* Team 2 Controller */}
                        <div className="flex flex-col gap-4">
                            <div className="text-white font-bold text-center text-xl">
                                {teams.find(t => t._id === selectedMatch.team2Id)?.ownerName}
                            </div>
                            <ScoringController
                                teamName="Team 2"
                                initialTime={selectedMatch.team2Time}
                                onSave={(time) => handleMatchSave(2, time)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
