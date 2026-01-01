const Team = require('../models/Team');

// Get teams for a competition
exports.getTeamsByCompetition = async (req, res) => {
    try {
        const teams = await Team.find({ competitionId: req.params.id });
        res.json(teams);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Add team to competition
exports.addTeam = async (req, res) => {
    try {
        const newTeam = new Team({
            ...req.body,
            competitionId: req.params.id,
            registrations: [] // Initialize empty
        });
        const saved = await newTeam.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Update team details and registrations
exports.updateTeam = async (req, res) => {
    try {
        const updated = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Delete team
exports.deleteTeam = async (req, res) => {
    try {
        await Team.findByIdAndDelete(req.params.id);
        res.json({ message: 'Team deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
