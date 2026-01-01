const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { body, validationResult } = require('express-validator');

// Middleware de validación para pago
const validatePayment = [
    body('amount').isFloat({ min: 0.5 }).withMessage('El monto mínimo es 0.50€'),
    body('orderId').notEmpty().withMessage('El ID del pedido es requerido')
];

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Rutas públicas
router.post('/create-intent', validatePayment, handleValidationErrors, paymentController.createPaymentIntent);
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.stripeWebhook);

// Rutas protegidas (requieren autenticación)
router.post('/customer', paymentController.createStripeCustomer);
router.get('/customer/:customerId/methods', paymentController.getCustomerPaymentMethods);

module.exports = router;