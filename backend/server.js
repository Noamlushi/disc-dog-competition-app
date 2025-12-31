const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Competition = require('./models/Competition');
const Team = require('./models/Team');

const app = express();
const PORT = 3000;

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/dog-frisbee')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is up', app: 'Dog Frisbee Scoring' });
});

// --- Competitions API ---

// Get all competitions
app.get('/api/competitions', async (req, res) => {
  try {
    const competitions = await Competition.find().sort({ date: -1 });
    res.json(competitions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create competition
app.post('/api/competitions', async (req, res) => {
  try {
    const newItem = new Competition(req.body);
    const saved = await newItem.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get single competition
app.get('/api/competitions/:id', async (req, res) => {
  try {
    const competition = await Competition.findById(req.params.id);
    if (!competition) return res.status(404).json({ error: 'Not found' });
    res.json(competition);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Teams API ---

// Get teams for a competition
app.get('/api/competitions/:id/teams', async (req, res) => {
  try {
    const teams = await Team.find({ competitionId: req.params.id });
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add team to competition
app.post('/api/competitions/:id/teams', async (req, res) => {
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
});

// Update team details and registrations
app.put('/api/teams/:id', async (req, res) => {
  try {
    const updated = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete team
app.delete('/api/teams/:id', async (req, res) => {
  try {
    await Team.findByIdAndDelete(req.params.id);
    res.json({ message: 'Team deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk update order for a specific run type in a competition
app.put('/api/competitions/:id/order', async (req, res) => {
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
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
