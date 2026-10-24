const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/dashboard', verifyToken, requireRole('ADMIN', 'OPERATOR'), analyticsController.getDashboardSummary);
router.get('/notifications', verifyToken, analyticsController.getNotifications);
router.patch('/notifications/:id/read', verifyToken, analyticsController.markNotificationRead);

module.exports = router;
