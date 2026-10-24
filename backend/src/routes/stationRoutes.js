const express = require('express');
const router = express.Router();
const stationController = require('../controllers/stationController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/', stationController.getAllStations);
router.get('/:id', stationController.getStationById);
router.post('/', verifyToken, requireRole('ADMIN'), stationController.createStation);
router.put('/:id', verifyToken, requireRole('ADMIN', 'OPERATOR'), stationController.updateStation);
router.delete('/:id', verifyToken, requireRole('ADMIN'), stationController.deleteStation);

module.exports = router;
