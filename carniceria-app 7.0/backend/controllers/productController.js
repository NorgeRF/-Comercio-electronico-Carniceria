const Product = require('../models/Product');

// Obtener todos los productos
exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.findAll({
            where: { activo: true },
            order: [['categoria', 'ASC'], ['nombre', 'ASC']]
        });
        res.json(products);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ 
            error: 'Error al obtener productos',
            details: error.message 
        });
    }
};

// Obtener productos destacados
exports.getFeaturedProducts = async (req, res) => {
    try {
        const products = await Product.findAll({
            where: { 
                destacado: true,
                activo: true 
            },
            limit: 8
        });
        res.json(products);
    } catch (error) {
        console.error('Error al obtener productos destacados:', error);
        res.status(500).json({ 
            error: 'Error al obtener productos destacados',
            details: error.message 
        });
    }
};

// Obtener productos por categoría
exports.getProductsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const products = await Product.findAll({
            where: { 
                categoria: category,
                activo: true 
            },
            order: [['nombre', 'ASC']]
        });
        res.json(products);
    } catch (error) {
        console.error('Error al obtener productos por categoría:', error);
        res.status(500).json({ 
            error: 'Error al obtener productos por categoría',
            details: error.message 
        });
    }
};

// Obtener un producto por ID
exports.getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findByPk(id);
        
        if (!product || !product.activo) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        res.json(product);
    } catch (error) {
        console.error('Error al obtener producto:', error);
        res.status(500).json({ 
            error: 'Error al obtener producto',
            details: error.message 
        });
    }
};

// Crear un nuevo producto (admin)
exports.createProduct = async (req, res) => {
    try {
        const productData = req.body;
        const product = await Product.create(productData);
        res.status(201).json(product);
    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({ 
            error: 'Error al crear producto',
            details: error.message 
        });
    }
};

// Actualizar producto (admin)
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const productData = req.body;
        
        const product = await Product.findByPk(id);
        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        await product.update(productData);
        res.json(product);
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ 
            error: 'Error al actualizar producto',
            details: error.message 
        });
    }
};

// Eliminar producto (soft delete)
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        
        const product = await Product.findByPk(id);
        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        await product.update({ activo: false });
        res.json({ message: 'Producto eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ 
            error: 'Error al eliminar producto',
            details: error.message 
        });
    }
};

// Actualizar stock
exports.updateStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { cantidad } = req.body;
        
        const product = await Product.findByPk(id);
        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        const nuevoStock = product.stock + cantidad;
        if (nuevoStock < 0) {
            return res.status(400).json({ error: 'Stock insuficiente' });
        }
        
        await product.update({ stock: nuevoStock });
        res.json({ 
            message: 'Stock actualizado',
            nuevoStock: nuevoStock 
        });
    } catch (error) {
        console.error('Error al actualizar stock:', error);
        res.status(500).json({ 
            error: 'Error al actualizar stock',
            details: error.message 
        });
    }
};

// Buscar productos
exports.searchProducts = async (req, res) => {
    try {
        const { query } = req.query;
        
        const products = await Product.findAll({
            where: {
                [Sequelize.Op.or]: [
                    { nombre: { [Sequelize.Op.iLike]: `%${query}%` } },
                    { descripcion: { [Sequelize.Op.iLike]: `%${query}%` } },
                    { categoria: { [Sequelize.Op.iLike]: `%${query}%` } }
                ],
                activo: true
            },
            limit: 20
        });
        
        res.json(products);
    } catch (error) {
        console.error('Error al buscar productos:', error);
        res.status(500).json({ 
            error: 'Error al buscar productos',
            details: error.message 
        });
    }
};