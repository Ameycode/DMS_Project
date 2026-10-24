const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/', verifyToken, requireRole('ADMIN', 'OPERATOR'), maintenanceController.getAllMaintenance);
router.post('/report', verifyToken, requireRole('ADMIN', 'OPERATOR'), maintenanceController.reportIssue);
router.patch('/:id/resolve', verifyToken, requireRole('ADMIN', 'OPERATOR'), maintenanceController.resolveIssue);

module.exports = router;
