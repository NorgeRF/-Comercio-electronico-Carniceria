const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');
const adminProductController = require('../controllers/adminProductController');
const sessionAuth = require('../middleware/sessionAuth');

// Middleware para verificar autenticacion
router.use(sessionAuth.requireAuth);

// Rutas de perfil
router.get('/profile', adminAuthController.showProfile);
router.post('/profile/update', adminAuthController.updateProfile);
router.post('/profile/change-password', adminAuthController.changePassword);

// Rutas de gestion de usuarios (solo admin)
router.get('/users', adminAuthController.listUsers);
router.post('/users/create', adminAuthController.createUser);
router.post('/users/:id/toggle-status', adminAuthController.toggleUserStatus);
router.post('/users/:id/delete', adminAuthController.deleteUser);

// Rutas de productos
router.get('/products', adminProductController.listProducts);
router.get('/products/new', adminProductController.showCreateForm);
router.post('/products', adminProductController.createProduct);
router.get('/products/:id/edit', adminProductController.showEditForm);
router.post('/products/:id', adminProductController.updateProduct);

// Rutas API para productos (AJAX)
router.delete('/api/products/:id', adminProductController.deleteProduct);
router.post('/api/products/:id/restore', adminProductController.restoreProduct);
router.get('/api/products/:id/quick-view', adminProductController.quickView);

module.exports = router;
