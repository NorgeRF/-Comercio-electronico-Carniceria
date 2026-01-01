const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { body, validationResult } = require('express-validator');

// Middleware de validación para crear producto
const validateProduct = [
    body('nombre').notEmpty().withMessage('El nombre es requerido'),
    body('precio').isFloat({ min: 0 }).withMessage('El precio debe ser un número positivo'),
    body('categoria').notEmpty().withMessage('La categoría es requerida'),
    body('unidad').notEmpty().withMessage('La unidad es requerida')
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
router.get('/', productController.getAllProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/category/:category', productController.getProductsByCategory);
router.get('/search', productController.searchProducts);
router.get('/:id', productController.getProductById);

// Rutas protegidas (requieren autenticación)
router.post('/', validateProduct, handleValidationErrors, productController.createProduct);
router.put('/:id', validateProduct, handleValidationErrors, productController.updateProduct);
router.delete('/:id', productController.deleteProduct);
router.patch('/:id/stock', productController.updateStock);

module.exports = router;