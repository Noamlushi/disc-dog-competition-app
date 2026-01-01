const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');

// Standard Team Routes (Direct access by Team ID)
router.put('/:id', teamController.updateTeam);
router.delete('/:id', teamController.deleteTeam);

module.exports = router;
