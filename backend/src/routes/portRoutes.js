const express = require('express');
const router = express.Router();
const portController = require('../controllers/portController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/', portController.getAllPorts);
router.get('/mapping/hierarchy', portController.getChargerPortHierarchyView);
router.get('/:id', portController.getPortById);
router.post('/', verifyToken, requireRole('ADMIN'), portController.createPort);
router.patch('/:id/status', verifyToken, requireRole('ADMIN', 'OPERATOR'), portController.updatePortStatus);

module.exports = router;
