const express = require('express');
const router = express.Router();
const tariffController = require('../controllers/tariffController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/', tariffController.getAllTariffs);
router.post('/', verifyToken, requireRole('ADMIN'), tariffController.createTariff);
router.put('/:id', verifyToken, requireRole('ADMIN'), tariffController.updateTariff);

module.exports = router;
