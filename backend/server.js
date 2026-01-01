const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Import Routes
const competitionRoutes = require('./routes/competitionRoutes');
const teamRoutes = require('./routes/teamRoutes');

const app = express();
const PORT = 3000;

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/dog-frisbee')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is up', app: 'Dog Frisbee Scoring' });
});

// Mount Routes
app.use('/api/competitions', competitionRoutes);
app.use('/api/teams', teamRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
