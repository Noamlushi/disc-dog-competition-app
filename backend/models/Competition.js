const mongoose = require('mongoose');

const competitionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    date: { type: Date, required: true },
    timeTrial: {
        status: { type: String, enum: ['qualifiers', 'bracket'], default: 'qualifiers' },
        bracketSize: { type: Number, default: 16 }, // 16, 8, or 4
        matches: [{
            id: String, // e.g. "R16-M1"
            round: Number, // 1=R16, 2=Qtr, 3=Semi, 4=Final
            team1Id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
            team2Id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
            winnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
            team1Time: Number,
            team2Time: Number,
            status: { type: String, enum: ['pending', 'active', 'completed'], default: 'pending' },
            nextMatchId: String,
            nextMatchSlot: Number,
            videoUrl: String
        }]
    }
});

module.exports = mongoose.model('Competition', competitionSchema);
