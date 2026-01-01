import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function LiveTournamentTree({ competitionId }) {
    const [matches, setMatches] = useState([]);
    const [teams, setTeams] = useState([]);

    useEffect(() => {
        const fetchState = async () => {
            try {
                const [compRes, teamsRes] = await Promise.all([
                    fetch(`http://localhost:3000/api/competitions/${competitionId}`),
                    fetch(`http://localhost:3000/api/competitions/${competitionId}/teams`)
                ]);
                const compData = await compRes.json();
                const teamsData = await teamsRes.json();

                if (compData.timeTrial?.status === 'bracket') {
                    setMatches(compData.timeTrial.matches);
                }
                setTeams(teamsData);
            } catch (err) {
                console.error(err);
            }
        };

        fetchState();
        const interval = setInterval(fetchState, 5000);
        return () => clearInterval(interval);
    }, [competitionId]);

    const getTeamName = (id) => {
        const t = teams.find(team => team._id === id);
        return t ? `${t.ownerName} & ${t.dogName}` : 'TBD';
    };

    // A simple visual representation for Top 16
    // Since implementing a generic dynamic tree is complex in one go, we will hardcode the layout for Top 16/8/4/2 structure or use a flex list.
    // For MVP, we will list matches by round.

    if (matches.length === 0) {
        return (
            <div className="text-center text-white py-20">
                <h2 className="text-4xl font-bold opacity-50">Tournament Bracket Starting Soon...</h2>
            </div>
        );
    }

    return (
        <div className="p-8 min-h-screen">
            <h2 className="text-center text-3xl font-bold text-white mb-12">🏆 Tournament Bracket 🏆</h2>

            <div className="flex justify-center gap-12 overflow-x-auto pb-12">
                {/* Round 1 (Top 16) */}
                <div className="space-y-8 flex flex-col justify-center">
                    <h3 className="text-center text-blue-300 font-bold mb-4">Round of 16</h3>
                    {matches.filter(m => m.round === 16).map(match => (
                        <MatchCard key={match.id} match={match} getTeamName={getTeamName} />
                    ))}
                </div>

                {/* Quarter Finals */}
                <div className="space-y-16 flex flex-col justify-center">
                    <h3 className="text-center text-blue-300 font-bold mb-4">Quarter Finals</h3>
                    {/* Placeholders or filtered if we implement auto-generation */}
                    {matches.filter(m => m.round === 8).map(match => (
                        <MatchCard key={match.id} match={match} getTeamName={getTeamName} />
                    ))}
                    {matches.filter(m => m.round === 8).length === 0 && <div className="text-white/30 text-center italic">Waiting...</div>}
                </div>

                {/* Semi Finals */}
                <div className="space-y-32 flex flex-col justify-center">
                    <h3 className="text-center text-blue-300 font-bold mb-4">Semi Finals</h3>
                    {matches.filter(m => m.round === 4).map(match => (
                        <MatchCard key={match.id} match={match} getTeamName={getTeamName} />
                    ))}
                    {matches.filter(m => m.round === 4).length === 0 && <div className="text-white/30 text-center italic">Waiting...</div>}

                </div>

                {/* Final */}
                <div className="space-y-64 flex flex-col justify-center">
                    <h3 className="text-center text-yellow-300 font-bold mb-4 text-2xl">FINAL</h3>
                    {matches.filter(m => m.round === 2).map(match => (
                        <MatchCard key={match.id} match={match} getTeamName={getTeamName} isFinal />
                    ))}
                    {matches.filter(m => m.round === 2).length === 0 && <div className="text-white/30 text-center italic">Waiting...</div>}
                </div>
            </div>
        </div>
    );
}

function MatchCard({ match, getTeamName, isFinal }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-64 bg-slate-800 border-2 rounded-xl overflow-hidden shadow-xl ${isFinal ? 'border-yellow-500 ring-4 ring-yellow-500/20' : 'border-slate-600'}`}
        >
            <div className={`p-3 flex justify-between border-b border-slate-700 ${match.winnerId === match.team1Id ? 'bg-green-900/40 text-green-300' : 'text-gray-300'}`}>
                <span className="font-bold truncate">{getTeamName(match.team1Id)}</span>
                <span className="font-mono">{match.team1Time ? (match.team1Time / 1000).toFixed(2) : '-.--'}</span>
            </div>
            <div className={`p-3 flex justify-between ${match.winnerId === match.team2Id ? 'bg-green-900/40 text-green-300' : 'text-gray-300'}`}>
                <span className="font-bold truncate">{getTeamName(match.team2Id)}</span>
                <span className="font-mono">{match.team2Time ? (match.team2Time / 1000).toFixed(2) : '-.--'}</span>
            </div>
        </motion.div>
    );
}
