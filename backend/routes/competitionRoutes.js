const express = require('express');
const router = express.Router();
const competitionController = require('../controllers/competitionController');
const teamController = require('../controllers/teamController');

// Standard Competition Routes
router.get('/', competitionController.getAll);
router.post('/', competitionController.create);
router.get('/:id', competitionController.getOne);
router.put('/:id', competitionController.update);
router.delete('/:id', competitionController.delete);
router.put('/:id/order', competitionController.updateOrder);

// Nested Team Routes (Accessing teams via competition ID)
router.get('/:id/teams', teamController.getTeamsByCompetition);
router.post('/:id/teams', teamController.addTeam);

module.exports = router;
