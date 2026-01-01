import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Play, Flag, Gavel, MonitorPlay, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import DistanceEditModal from '../components/DistanceEditModal';
import ThemeToggle from '../components/ThemeToggle';

const RUN_TYPES = [
    'Distance Beginners', 'Distance Advanced', 'Multiple Challenge', 'Frisgility', 'Shuffle',
    'Wheel of Fortune', 'Criss Cross', 'Time Trial', 'Freestyle'
];

export default function StartCompetitionPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const runParam = searchParams.get('run');

    // Determine View Mode from URL Path
    const isJudgeMode = location.pathname.endsWith('/judge');
    const isLiveMode = location.pathname.endsWith('/live');
    const viewMode = isJudgeMode ? 'judge' : (isLiveMode ? 'leaderboard' : 'menu');

    // STATES
    const [selectedRun, setSelectedRun] = useState(runParam || RUN_TYPES[0]);
    const [teams, setTeams] = useState([]);
    const [sortedTeams, setSortedTeams] = useState([]);
    const [editingTeam, setEditingTeam] = useState(null);

    useEffect(() => {
        fetchTeams();
        // Polling loop for Leaderboard
        const interval = setInterval(() => {
            if (viewMode === 'leaderboard') fetchTeams();
        }, 5000);
        return () => clearInterval(interval);
    }, [id, selectedRun, viewMode]);

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
            if (viewMode === 'leaderboard') {
                // RANKING LOGIC
                // In Live Mode, we want to see who is WINNING, so sort by score descending
                const regA = a.registrations.find(r => r.runType === selectedRun);
                const regB = b.registrations.find(r => r.runType === selectedRun);

                // Check if completed
                const statusA = regA?.status === 'completed' ? 1 : 0;
                const statusB = regB?.status === 'completed' ? 1 : 0;
                if (statusA !== statusB) return statusB - statusA;

                // Score Descending (Higher is better generally, except Time Trial)
                const isTime = ['Multiple Challenge', 'Time Trial'].includes(selectedRun);
                if (isTime) {
                    // Lower time is better (assuming non-zero)
                    const scoreA = regA.totalScore || 9999;
                    const scoreB = regB.totalScore || 9999;
                    return scoreA - scoreB;
                } else {
                    return (regB.totalScore || 0) - (regA.totalScore || 0);
                }

            } else {
                // ORDER OF GO LOGIC
                const orderA = a.registrations.find(r => r.runType === selectedRun)?.order || 999;
                const orderB = b.registrations.find(r => r.runType === selectedRun)?.order || 999;
                return orderA - orderB;
            }
        });

        setSortedTeams(sorted);
    }, [teams, selectedRun, viewMode]);

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

    // --- Tournament Management Logic --
    // We need competition data to start the tournament
    const [competition, setCompetition] = useState(null);
    const [showConfirmStart, setShowConfirmStart] = useState(false);

    useEffect(() => {
        fetch(`http://localhost:3000/api/competitions/${id}`)
            .then(res => res.json())
            .then(data => setCompetition(data))
            .catch(err => console.error("Error fetching comp:", err));
    }, [id]);

    const generateBracketMatches = (qualifiedTeams, size) => {
        const matches = [];
        const createRound = (roundName, numMatches, teamsForRound = [], roundNum) => {
            const roundMatches = [];
            for (let i = 0; i < numMatches; i++) {
                const isFirstRound = teamsForRound.length > 0;
                const team1 = isFirstRound ? teamsForRound[i] : null;
                const team2 = isFirstRound ? teamsForRound[teamsForRound.length - 1 - i] : null;

                const nextMatchIndex = Math.floor(i / 2);
                const nextMatchSlot = (i % 2 === 0) ? 1 : 2;

                let nextRoundPrefix = '';
                if (numMatches === 8) nextRoundPrefix = 'Qtr';
                if (numMatches === 4) nextRoundPrefix = 'Semi';
                if (numMatches === 2) nextRoundPrefix = 'Final';

                const nextMatchId = nextRoundPrefix ? `${nextRoundPrefix}-M${nextMatchIndex + 1}` : null;

                roundMatches.push({
                    id: `${roundName}-M${i + 1}`,
                    round: roundNum,
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

        if (size >= 16) matches.push(...createRound('R16', 8, qualifiedTeams, 16));
        if (size >= 8) {
            const teams = size === 8 ? qualifiedTeams : [];
            matches.push(...createRound('Qtr', 4, teams, 8));
        }
        if (size >= 4) {
            const teams = size === 4 ? qualifiedTeams : [];
            matches.push(...createRound('Semi', 2, teams, 4));
        }
        matches.push(...createRound('Final', 1, [], 2));
        return matches;
    };

    const startTournament = async (size) => {
        if (!competition) return;

        // Use the sortedTeams to ensure we get the ordered list
        const qualifiedTeams = sortedTeams.slice(0, size);
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

        // Navigate to the bracket view manager
        // Ensure the manager defaults to bracket tab by adding a hint or relying on state
        navigate(`/competition/${id}/time-trial/manager?tab=bracket`);
    };

    const handleEnterResult = (team) => {
        if (selectedRun === 'Distance Beginners' || selectedRun === 'Distance Advanced') {
            navigate(`/competition/${id}/score/distance/${team._id}?runType=${encodeURIComponent(selectedRun)}`);
        } else if (selectedRun === 'Multiple Challenge') {
            navigate(`/competition/${id}/score/multiple/${team._id}`);
        } else if (selectedRun === 'Frisgility') {
            navigate(`/competition/${id}/score/frisagility/${team._id}`);
        } else if (selectedRun === 'Freestyle') {
            navigate(`/competition/${id}/score/freestyle/${team._id}`);
        } else if (selectedRun === 'Time Trial') {
            navigate(`/competition/${id}/time-trial/manager?teamId=${team._id}`);
        } else {
            alert(`Scoring for ${selectedRun} not yet implemented`);
        }
    };

    // --- RENDER VIEWS ---

    if (viewMode === 'menu') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center p-8 relative overflow-hidden transition-colors duration-300">
                {/* Theme Toggle */}
                <div className="absolute top-6 right-6 z-50">
                    <ThemeToggle />
                </div>

                {/* Background decorative elements */}
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500 rounded-full blur-[150px]" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500 rounded-full blur-[150px]" />
                </div>

                <div className="z-10 w-full max-w-5xl">
                    <button onClick={() => navigate(`/competition/${id}`)} className="text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 mb-12 transition-colors">
                        <ArrowLeft /> Back to Dashboard
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <motion.button
                            whileHover={{ scale: 1.02, y: -5 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate(`/competition/${id}/judge`)}
                            className="bg-white dark:bg-slate-800 rounded-3xl p-10 shadow-xl dark:shadow-2xl flex flex-col items-center text-center gap-8 group relative overflow-hidden transition-all"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-cyan-500" />
                            <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                <Gavel size={40} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">Judge Mode</h2>
                                <p className="text-slate-500 dark:text-slate-400">Access scoring interfaces, edit results, and manage the competition flow.</p>
                            </div>
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.02, y: -5 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate(`/competition/${id}/live`)}
                            className="bg-white dark:bg-slate-800 rounded-3xl p-10 shadow-xl dark:shadow-2xl flex flex-col items-center text-center gap-8 group relative overflow-hidden border border-transparent hover:border-purple-500 transition-all"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-pink-500" />
                            <div className="w-24 h-24 bg-purple-50 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all duration-300">
                                <MonitorPlay size={40} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">Live Board</h2>
                                <p className="text-slate-500 dark:text-slate-400">Real-time leaderboard, order of go, and audience display view.</p>
                            </div>
                        </motion.button>
                    </div>
                </div>
            </div>
        );
    }

    if (viewMode === 'leaderboard') {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-black text-gray-900 dark:text-white p-6 font-sans transition-colors duration-300">
                <div className="absolute top-6 right-6 z-50">
                    <ThemeToggle />
                </div>

                {/* Leaderboard Header */}
                <div className="flex justify-between items-center mb-8 bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 backdrop-blur-sm shadow-sm">
                    <button onClick={() => navigate(`/competition/${id}/start`)} className="text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2">
                        <ArrowLeft /> Exit
                    </button>

                    {/* Run Type Selector */}
                    <div className="flex bg-gray-100 dark:bg-slate-950 p-1 rounded-xl overflow-x-auto max-w-[600px] no-scrollbar">
                        {RUN_TYPES.map(type => (
                            <button
                                key={type}
                                onClick={() => setSelectedRun(type)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${selectedRun === type
                                    ? 'bg-purple-600 text-white shadow-lg'
                                    : 'text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-slate-300'
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            <span className="text-red-500 text-xs font-bold tracking-wider">LIVE</span>
                        </div>
                    </div>
                </div>

                {/* Leaderboard Content */}
                <div className="max-w-6xl mx-auto space-y-4">
                    {/* Header Row - Hidden on mobile */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-6 text-gray-500 dark:text-slate-500 font-bold uppercase text-sm tracking-wider">
                        <div className="col-span-1">Rank</div>
                        <div className="col-span-1">#</div>
                        <div className="col-span-4">Team</div>
                        <div className="col-span-3 text-right">Score</div>
                        <div className="col-span-3 text-right">Status</div>
                    </div>

                    {/* List */}
                    <div className="space-y-3">
                        {sortedTeams.map((team, index) => {
                            const reg = team.registrations.find(r => r.runType === selectedRun);
                            const rawScore = reg?.totalScore || 0;
                            const isTimeTrial = ['Time Trial', 'Multiple Challenge'].includes(selectedRun);

                            // Fix Units: Time Trial is stored in ms, need seconds
                            const displayScore = isTimeTrial ? (rawScore / 1000).toFixed(2) + 's' : rawScore.toFixed(2);

                            const isCompleted = reg?.status === 'completed';
                            const rank = index + 1;

                            let rankStyle = "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-300";
                            let icon = null;

                            if (rank === 1 && isCompleted) {
                                rankStyle = "bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-900/10 border-yellow-200 dark:border-yellow-700/50 text-yellow-600 dark:text-yellow-500";
                                icon = <Trophy size={20} className="text-yellow-500" />;
                            } else if (rank === 2 && isCompleted) {
                                rankStyle = "bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-300";
                            } else if (rank === 3 && isCompleted) {
                                rankStyle = "bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400";
                            }

                            return (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={team._id}
                                    className={`flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 px-6 py-4 rounded-2xl border shadow-sm dark:shadow-lg ${rankStyle}`}
                                >
                                    {/* Mobile: Top Row with Rank and Status */}
                                    <div className="flex md:contents justify-between items-center w-full">
                                        <div className="flex items-center gap-4 md:contents">
                                            <div className="col-span-1 font-black text-2xl flex items-center gap-2">
                                                <span className="md:hidden text-sm font-normal text-gray-400">Rank</span>
                                                {rank}{icon}
                                            </div>
                                            <div className="col-span-1 font-mono text-gray-400 dark:text-slate-500 hidden md:block">
                                                #{index + 1}
                                            </div>
                                        </div>

                                        {/* Mobile Status - Shown top right */}
                                        <div className="md:col-span-3 flex justify-end">
                                            {isCompleted ? (
                                                <span className="px-3 py-1 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 rounded-full text-xs font-bold border border-green-200 dark:border-green-500/30">COMPLETED</span>
                                            ) : (
                                                <span className="px-3 py-1 bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-500 rounded-full text-xs font-bold">UP NEXT</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Middle Section: Team Info */}
                                    <div className="col-span-4 flex flex-col justify-center">
                                        <div className="font-bold text-xl text-gray-800 dark:text-white leading-tight">{team.ownerName}</div>
                                        <div className="text-sm opacity-60">{team.dogName}</div>
                                    </div>

                                    {/* Score Section */}
                                    <div className="col-span-3 md:text-right flex items-center md:block justify-between mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-slate-800">
                                        <span className="md:hidden text-sm uppercase font-bold text-gray-400">Score</span>
                                        <span className="text-3xl font-black font-mono">
                                            {displayScore}
                                        </span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // --- JUDGE MODE (Existing Render) ---
    return (
        <div className="container mx-auto p-4 bg-gray-50 dark:bg-slate-900 min-h-screen transition-colors duration-300">
            <div className="absolute top-6 right-6 z-50">
                <ThemeToggle />
            </div>

            <Link to="#" onClick={() => navigate(`/competition/${id}/start`)} className="text-gray-600 dark:text-gray-400 hover:text-blue-800 dark:hover:text-blue-400 flex items-center gap-2 mb-6">
                <ArrowLeft size={20} /> Back to Menu
            </Link>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl overflow-hidden min-h-[600px] flex flex-col transition-colors">
                {/* Header */}
                <div className="bg-blue-900 dark:bg-blue-950 text-white p-6 flex justify-between items-center">
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <Play size={24} /> Judge Console
                    </h1>
                    <div className="text-blue-200">
                        Event: <span className="font-bold text-white ml-2">{selectedRun}</span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex overflow-x-auto bg-gray-100 dark:bg-slate-900 border-b dark:border-slate-700">
                    {RUN_TYPES.map(type => (
                        <button
                            key={type}
                            onClick={() => setSelectedRun(type)}
                            className={`px-6 py-4 font-medium whitespace-nowrap transition-colors ${selectedRun === type
                                ? 'bg-white dark:bg-slate-800 text-blue-900 dark:text-blue-400 border-b-2 border-blue-900 dark:border-blue-500'
                                : 'text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-6 flex-1 bg-gray-50 dark:bg-slate-900/50">
                    {sortedTeams.length === 0 ? (
                        <div className="text-center text-gray-500 dark:text-slate-500 py-12">
                            <Flag size={48} className="mx-auto mb-4 text-gray-300 dark:text-slate-700" />
                            <p className="text-xl">No teams registered for {selectedRun}</p>
                        </div>
                    ) : (
                        <div className="space-y-4 max-w-4xl mx-auto">
                            {sortedTeams.map((team, index) => (
                                <div key={team._id} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow flex items-center justify-between border-l-4 border-blue-500 dark:border-blue-600">
                                    <div className="flex items-center gap-6">
                                        <div className="text-2xl font-bold text-gray-300 dark:text-slate-600 w-12 text-center">
                                            #{index + 1}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{team.ownerName}</h3>
                                            <p className="text-gray-500 dark:text-gray-400">{team.dogName}</p>
                                        </div>
                                    </div>
                                    {team.registrations?.find(r => r.runType === selectedRun)?.status === 'completed' ? (
                                        <div className="flex items-center gap-4">
                                            <div className="text-green-600 dark:text-green-400 font-bold text-xl">
                                                {selectedRun === 'Multiple Challenge' || selectedRun === 'Time Trial'
                                                    ? `${(team.registrations.find(r => r.runType === selectedRun).totalScore / (selectedRun === 'Time Trial' ? 1000 : 1)).toFixed(2)}s`
                                                    : `${team.registrations.find(r => r.runType === selectedRun).totalScore.toFixed(1)} pts`
                                                }
                                            </div>
                                            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm font-medium">Completed</span>
                                            {(selectedRun === 'Distance Beginners' || selectedRun === 'Distance Advanced') && (
                                                <button
                                                    onClick={() => setEditingTeam(team)}
                                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-bold underline px-2"
                                                >
                                                    Edit Results
                                                </button>
                                            )}
                                            {selectedRun === 'Freestyle' && (
                                                <button
                                                    onClick={() => handleEnterResult(team)}
                                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-bold underline px-2"
                                                >
                                                    Continue Judging
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleEnterResult(team)}
                                            className="bg-blue-600 dark:bg-blue-700 text-white px-6 py-2 rounded-full hover:bg-blue-700 dark:hover:bg-blue-600 font-medium shadow-sm active:transform active:scale-95 transition-all"
                                        >
                                            Enter Result
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Time Trial Tournament Setup - Only visible for Time Trial */}
                    {selectedRun === 'Time Trial' && sortedTeams.length > 0 && (
                        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/50">
                            <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-4 flex items-center gap-2 text-xl">
                                <Trophy size={24} /> Tournament Actions
                            </h3>

                            {!showConfirmStart ? (
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-1">
                                        <p className="text-sm text-blue-800 dark:text-blue-400 mb-2">
                                            Create Tournament from current rankings:
                                        </p>
                                        <div className="flex gap-2">
                                            {[16, 8, 4].map(size => (
                                                <button
                                                    key={size}
                                                    onClick={() => setShowConfirmStart(size)}
                                                    disabled={sortedTeams.length < size}
                                                    className="flex-1 bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 py-3 rounded-lg border-2 border-blue-100 dark:border-blue-800 font-bold hover:border-blue-300 disabled:opacity-50 transition-colors shadow-sm"
                                                >
                                                    Top {size}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {(competition?.timeTrial?.status === 'bracket') && (
                                        <button
                                            onClick={() => navigate(`/competition/${id}/time-trial/manager?tab=bracket`)}
                                            className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 shadow-md flex items-center justify-center gap-2"
                                        >
                                            Go to Active Bracket <ArrowLeft className="rotate-180" size={20} />
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="animate-fade-in bg-white dark:bg-slate-800 p-4 rounded-lg shadow-inner">
                                    <div className="bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded-lg mb-4 text-yellow-800 dark:text-yellow-200 text-sm flex items-center gap-2">
                                        <Flag className="text-yellow-600" size={20} />
                                        <span><strong>Warning:</strong> Starting the Top {showConfirmStart} will lock qualifiers. This cannot be undone.</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => startTournament(showConfirmStart)}
                                            className="flex-1 bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 shadow-lg text-lg"
                                        >
                                            Confirm Start
                                        </button>
                                        <button
                                            onClick={() => setShowConfirmStart(null)}
                                            className="flex-1 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg font-bold hover:bg-gray-300"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

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
