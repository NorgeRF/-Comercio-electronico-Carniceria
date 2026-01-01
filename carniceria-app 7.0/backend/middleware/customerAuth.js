// middleware/customerAuth.js
module.exports = {
    // Verificar si el cliente está autenticado
    isCustomerAuthenticated: (req, res, next) => {
        if (req.session && req.session.customerId) {
            return next();
        }
        res.status(401).json({ error: 'Cliente no autenticado' });
    },
    
    // Verificar si el admin está autenticado
    isAdminAuthenticated: (req, res, next) => {
        if (req.session && req.session.userId) {
            return next();
        }
        res.status(401).json({ error: 'Admin no autenticado' });
    }
};