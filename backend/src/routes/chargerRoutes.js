const express = require('express');
const router = express.Router();
const chargerController = require('../controllers/chargerController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/', chargerController.getAllChargers);
router.get('/:id', chargerController.getChargerById);
router.post('/', verifyToken, requireRole('ADMIN'), chargerController.createCharger);
router.put('/:id', verifyToken, requireRole('ADMIN', 'OPERATOR'), chargerController.updateCharger);
router.delete('/:id', verifyToken, requireRole('ADMIN'), chargerController.deleteCharger);

module.exports = router;
