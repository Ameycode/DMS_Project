const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.post('/start', verifyToken, sessionController.startSession);
router.post('/:id/complete', verifyToken, sessionController.completeSession);
router.get('/active', verifyToken, requireRole('ADMIN', 'OPERATOR'), sessionController.getActiveSessions);
router.get('/:id', verifyToken, sessionController.getSessionById);

module.exports = router;
