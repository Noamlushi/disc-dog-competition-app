const Competition = require('../models/Competition');
const Team = require('../models/Team');

// Get all competitions
exports.getAll = async (req, res) => {
    try {
        const competitions = await Competition.find().sort({ date: -1 });
        res.json(competitions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get single competition
exports.getOne = async (req, res) => {
    try {
        const competition = await Competition.findById(req.params.id);
        if (!competition) return res.status(404).json({ error: 'Not found' });
        res.json(competition);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Create competition
exports.create = async (req, res) => {
    try {
        const newItem = new Competition(req.body);
        const saved = await newItem.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Update competition
exports.update = async (req, res) => {
    try {
        const updated = await Competition.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Delete competition
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedComp = await Competition.findByIdAndDelete(id);

        if (!deletedComp) {
            return res.status(404).json({ error: 'Competition not found' });
        }

        // Delete all teams associated with this competition
        await Team.deleteMany({ competitionId: id });

        res.json({ message: 'Competition deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Bulk update order for a specific run type in a competition
exports.updateOrder = async (req, res) => {
    const { runType, teamOrders } = req.body; // teamOrders: [{ teamId, newOrder }]

    if (!runType || !teamOrders) {
        return res.status(400).json({ error: 'Missing runType or teamOrders' });
    }

    try {
        const operations = teamOrders.map(({ teamId, newOrder }) => ({
            updateOne: {
                filter: { _id: teamId, "registrations.runType": runType },
                update: { $set: { "registrations.$.order": newOrder } }
            }
        }));

        if (operations.length > 0) {
            await Team.bulkWrite(operations);
        }

        res.json({ message: 'Order updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
