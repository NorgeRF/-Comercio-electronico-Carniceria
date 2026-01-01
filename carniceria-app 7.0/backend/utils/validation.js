const { body, validationResult } = require('express-validator');

// Validaciones comunes
const commonValidations = {
    email: body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email inválido'),
    
    phone: body('phone')
        .matches(/^(\+34|0034|34)?[6789]\d{8}$/)
        .withMessage('Teléfono español inválido'),
    
    name: body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    
    password: body('password')
        .isLength({ min: 6 })
        .withMessage('La contraseña debe tener al menos 6 caracteres')
        .matches(/\d/)
        .withMessage('La contraseña debe contener al menos un número'),
    
    price: body('price')
        .isFloat({ min: 0 })
        .withMessage('El precio debe ser un número positivo'),
    
    quantity: body('quantity')
        .isFloat({ min: 0.1 })
        .withMessage('La cantidad debe ser mayor que 0'),
    
    address: body('address')
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage('La dirección debe tener entre 5 y 200 caracteres')
};

// Esquemas de validación
const validationSchemas = {
    // Registro de usuario
    register: [
        commonValidations.name,
        commonValidations.email,
        commonValidations.password,
        body('confirmPassword')
            .custom((value, { req }) => value === req.body.password)
            .withMessage('Las contraseñas no coinciden')
    ],
    
    // Login
    login: [
        commonValidations.email,
        body('password').notEmpty().withMessage('La contraseña es requerida')
    ],
    
    // Producto
    product: [
        body('nombre')
            .trim()
            .isLength({ min: 3, max: 100 })
            .withMessage('El nombre debe tener entre 3 y 100 caracteres'),
        
        body('descripcion')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('La descripción no puede exceder 500 caracteres'),
        
        commonValidations.price,
        
        body('categoria')
            .isIn(['vacuno', 'cerdo', 'pollo', 'cordero', 'elaborados', 'mariscos', 'quesos', 'otros'])
            .withMessage('Categoría inválida'),
        
        body('unidad')
            .isIn(['kg', 'gr', 'unidad', 'paquete'])
            .withMessage('Unidad inválida'),
        
        body('stock')
            .optional()
            .isInt({ min: 0 })
            .withMessage('El stock debe ser un número entero positivo')
    ],
    
    // Pedido
    order: [
        commonValidations.name.custom((value, { req }) => {
            req.body.cliente_nombre = value;
            return true;
        }),
        
        commonValidations.phone.custom((value, { req }) => {
            req.body.cliente_telefono = value;
            return true;
        }),
        
        commonValidations.email.optional().custom((value, { req }) => {
            if (value) req.body.cliente_email = value;
            return true;
        }),
        
        commonValidations.address.custom((value, { req }) => {
            req.body.cliente_direccion = value;
            return true;
        }),
        
        body('ciudad')
            .trim()
            .isLength({ min: 2, max: 50 })
            .withMessage('La ciudad debe tener entre 2 y 50 caracteres')
            .custom((value, { req }) => {
                req.body.cliente_ciudad = value;
                return true;
            }),
        
        body('codigo_postal')
            .optional()
            .matches(/^\d{5}$/)
            .withMessage('Código postal inválido (5 dígitos)')
            .custom((value, { req }) => {
                if (value) req.body.cliente_codigo_postal = value;
                return true;
            }),
        
        commonValidations.price.custom((value, { req }) => {
            req.body.total = value;
            return true;
        }),
        
        body('metodo_pago')
            .isIn(['tarjeta', 'transferencia', 'efectivo'])
            .withMessage('Método de pago inválido'),
        
        body('items')
            .isArray({ min: 1 })
            .withMessage('Debe incluir al menos un producto'),
        
        body('items.*.producto_id')
            .isInt({ min: 1 })
            .withMessage('ID de producto inválido'),
        
        body('items.*.cantidad')
            .isFloat({ min: 0.1 })
            .withMessage('Cantidad inválida'),
        
        body('items.*.precio_unitario')
            .isFloat({ min: 0 })
            .withMessage('Precio unitario inválido')
    ],
    
    // Pago
    payment: [
        body('amount')
            .isFloat({ min: 0.5 })
            .withMessage('El monto mínimo es 0.50€'),
        
        body('orderId')
            .trim()
            .notEmpty()
            .withMessage('ID de pedido requerido'),
        
        body('paymentMethod')
            .optional()
            .isIn(['card', 'transfer', 'cash'])
            .withMessage('Método de pago inválido')
    ],
    
    // Contacto
    contact: [
        commonValidations.name,
        commonValidations.email,
        commonValidations.phone.optional(),
        body('subject')
            .trim()
            .isLength({ min: 3, max: 100 })
            .withMessage('El asunto debe tener entre 3 y 100 caracteres'),
        body('message')
            .trim()
            .isLength({ min: 10, max: 1000 })
            .withMessage('El mensaje debe tener entre 10 y 1000 caracteres')
    ]
};

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    
    next();
};

// Validar archivo de imagen
const validateImage = (req, res, next) => {
    if (!req.file) {
        return next(); // No es requerido siempre
    }
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
            success: false,
            error: 'Tipo de archivo no permitido. Solo se aceptan imágenes (JPEG, PNG, GIF, WebP)'
        });
    }
    
    if (req.file.size > maxSize) {
        return res.status(400).json({
            success: false,
            error: 'La imagen es demasiado grande. Máximo 5MB'
        });
    }
    
    next();
};

// Validar stock disponible
const validateStock = async (items, transaction = null) => {
    const { Product } = require('../models');
    const errors = [];
    
    for (const item of items) {
        const product = await Product.findByPk(item.producto_id, { transaction });
        
        if (!product) {
            errors.push(`Producto no encontrado: ${item.producto_id}`);
            continue;
        }
        
        if (product.stock < item.cantidad) {
            errors.push(`Stock insuficiente para: ${product.nombre}. Disponible: ${product.stock}, Solicitado: ${item.cantidad}`);
        }
    }
    
    return errors;
};

module.exports = {
    validationSchemas,
    handleValidationErrors,
    validateImage,
    validateStock,
    commonValidations
};