const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { body, validationResult } = require('express-validator');

// Middleware de validación para crear pedido
const validateOrder = [
    body('cliente_nombre').notEmpty().withMessage('El nombre del cliente es requerido'),
    body('cliente_telefono').notEmpty().withMessage('El teléfono es requerido'),
    body('cliente_direccion').notEmpty().withMessage('La dirección es requerida'),
    body('cliente_ciudad').notEmpty().withMessage('La ciudad es requerida'),
    body('total').isFloat({ min: 0 }).withMessage('El total debe ser un número positivo'),
    body('metodo_pago').isIn(['tarjeta', 'transferencia', 'efectivo']).withMessage('Método de pago inválido'),
    body('items').isArray({ min: 1 }).withMessage('Debe incluir al menos un producto')
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
router.post('/', validateOrder, handleValidationErrors, orderController.createOrder);
router.get('/stats', orderController.getOrderStats);
router.get('/:id', orderController.getOrderById);

// Rutas protegidas (requieren autenticación)
router.get('/', orderController.getAllOrders);
router.patch('/:id/status', orderController.updateOrderStatus);

module.exports = router;