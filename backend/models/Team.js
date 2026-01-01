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
        }],
        // Phase 8: Freestyle Detailed Scoring
        freestyle: {
            dog: {
                prey: { type: Number, default: 0 },
                retrieve: { type: Number, default: 0 },
                athleticism: { type: Number, default: 0 },
                grip: { type: Number, default: 0 }
            },
            player: {
                fieldPresentation: { type: Number, default: 0 },
                releases: { type: Number, default: 0 },
                discManagement: { type: Number, default: 0 },
                flow: { type: Number, default: 0 }
            },
            team: {
                over: { type: Number, default: 0 },
                vault: { type: Number, default: 0 },
                multipull: { type: Number, default: 0 },
                dogCatch: { type: Number, default: 0 },
                teamMovement: { type: Number, default: 0 },
                passing: { type: Number, default: 0 },
                distanceMovement: { type: Number, default: 0 }
            },
            execution: {
                throws: { type: Number, default: 0 },
                catches: { type: Number, default: 0 }
            }
        }
    }]
});

module.exports = mongoose.model('Team', teamSchema);
