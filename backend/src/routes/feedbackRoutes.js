const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { verifyToken } = require('../middleware/auth');

router.post('/', verifyToken, feedbackController.submitFeedback);
router.get('/station/:stationId', feedbackController.getStationFeedback);

module.exports = router;
