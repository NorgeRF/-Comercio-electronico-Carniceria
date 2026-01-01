const jwt = require('jsonwebtoken');

// Middleware para verificar autenticación
exports.verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ 
            error: 'Acceso denegado. Token requerido.' 
        });
    }
    
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        res.status(400).json({ 
            error: 'Token inválido o expirado.' 
        });
    }
};

// Middleware para verificar rol de administrador
exports.isAdmin = (req, res, next) => {
    if (req.user && req.user.rol === 'admin') {
        next();
    } else {
        res.status(403).json({ 
            error: 'Acceso denegado. Se requieren permisos de administrador.' 
        });
    }
};

// Middleware para verificar sesión (para vistas)
exports.isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        res.locals.user = req.session.user;
        next();
    } else {
        res.redirect('/admin/login');
    }
};