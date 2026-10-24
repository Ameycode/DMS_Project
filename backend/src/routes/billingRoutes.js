const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/my', verifyToken, billingController.getUserBills);
router.get('/all', verifyToken, requireRole('ADMIN', 'OPERATOR'), billingController.getAllBills);
router.get('/:id', verifyToken, billingController.getBillById);
router.post('/:id/pay', verifyToken, billingController.simulatePayment);

module.exports = router;
