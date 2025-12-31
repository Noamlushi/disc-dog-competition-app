const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    id: { type: mongoose.Schema.Types.ObjectId }, // Added id field
    competitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Competition', required: true },
    ownerName: { type: String, required: true },
    dogName: { type: String, required: true },
    registrations: [{
        runType: { type: String, required: true },
        order: { type: Number, default: 999 },
        // Phase 4: Detailed Scoring
        status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
        totalScore: { type: Number, default: 0 },
        // Phase 7: Scheduling
        arena: { type: String },
        startTime: { type: Date },
        attempts: [{
            zone: Number,
            jump: Boolean,
            bonusZone: Boolean,
            points: Number,
            isFootFault: Boolean
        }]
    }]
});

module.exports = mongoose.model('Team', teamSchema);
