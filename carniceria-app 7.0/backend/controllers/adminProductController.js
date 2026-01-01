// file name: controllers/adminProductController.js
const { Product, sequelize } = require('../models');
const { Op } = require('sequelize');
const OrderItem = require('../models/OrderItem');
const upload = require('../middleware/upload');
const fs = require('fs');
const path = require('path');

module.exports = {
    // Listar productos para admin
    listProducts: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            const search = req.query.search || '';
            const categoria = req.query.categoria || '';
            const activo = req.query.activo || '';

            let where = {};

            // Filtro de búsqueda
            if (search) {
                where[Op.or] = [
                    { nombre: { [Op.like]: `%${search}%` } },
                    { descripcion: { [Op.like]: `%${search}%` } }
                ];
            }

            // Filtro por categoría
            if (categoria) {
                where.categoria = categoria;
            }

            // Filtro por estado activo/inactivo
            if (activo === 'true') {
                where.activo = true;
            } else if (activo === 'false') {
                where.activo = false;
            }

            const { count, rows: products } = await Product.findAndCountAll({
                where,
                limit,
                offset,
                order: [['created_at', 'DESC']]
            });

            const totalPages = Math.ceil(count / limit);

            res.render('admin/products/list', {
                title: 'Gestión de Productos',
                products,
                currentPage: page,
                totalPages,
                totalProducts: count,
                search,
                categoria,
                activo,
                categories: [
                    'vacuno', 'cerdo', 'pollo', 'cordero', 
                    'elaborados', 'embutidos', 'quesos', 
                    'mariscos', 'pescado', 'otros'
                ]
            });

        } catch (error) {
            console.error('Error al listar productos:', error);
            req.flash('error_msg', 'Error al cargar los productos');
            res.redirect('/admin');
        }
    },

    // Mostrar formulario para crear producto
    showCreateForm: (req, res) => {
        res.render('admin/products/create', {
            title: 'Crear Nuevo Producto',
            product: {},
            categories: [
                'vacuno', 'cerdo', 'pollo', 'cordero', 
                'elaborados', 'embutidos', 'quesos', 
                'mariscos', 'pescado', 'otros'
            ],
            units: ['kg', 'gr', 'unidad', 'paquete', 'docena', 'litro']
        });
    },

    // CREAR PRODUCTO - VERSIÓN DEFINITIVA CORREGIDA
    createProduct: async (req, res) => {
        try {
            console.log('📦 === INICIANDO CREACIÓN DE PRODUCTO ===');
            console.log('📋 Campos recibidos en req.body:', JSON.stringify(req.body, null, 2));
            console.log('📁 Archivo recibido:', req.file ? req.file.filename : 'Ninguno');
            
            // Extraer TODOS los datos del formulario
            const {
                nombre,
                descripcion,
                precio,
                categoria,
                unidad,
                stock,
                destacado,
                activo,
                imagen_url
            } = req.body;

            console.log('🔍 VALORES EXTRAÍDOS:');
            console.log('  Nombre:', nombre);
            console.log('  Precio:', precio);
            console.log('  Categoría:', categoria);
            console.log('  Unidad:', unidad);
            console.log('  Stock:', stock);
            console.log('  Destacado:', destacado);
            console.log('  Activo:', activo);
            console.log('  Imagen URL:', imagen_url);

            // Validaciones básicas
            const errors = [];
            
            if (!nombre || nombre.trim() === '') {
                errors.push('El nombre es obligatorio');
            }
            
            if (!precio || isNaN(parseFloat(precio)) || parseFloat(precio) <= 0) {
                errors.push('El precio debe ser un número positivo');
            }
            
            if (!categoria || categoria.trim() === '') {
                errors.push('La categoría es obligatoria');
            }
            
            if (!unidad || unidad.trim() === '') {
                errors.push('La unidad es obligatoria');
            }
            
            if (errors.length > 0) {
                console.log('❌ Errores de validación:', errors);
                req.flash('error_msg', errors.join(', '));
                return res.redirect('/admin/products/new');
            }

            console.log('✅ Validaciones pasadas');

            // MANEJO DE IMÁGENES - SIMPLIFICADO
            let imagenPath = null;
            
            // 1. Prioridad: Archivo subido
            if (req.file) {
                console.log('📁 Procesando archivo subido:', req.file.filename);
                
                try {
                    // Mover archivo temporal a carpeta pública
                    imagenPath = upload.moveToPublic(req.file.filename, categoria);
                    console.log('✅ Imagen movida a:', imagenPath);
                    
                } catch (moveError) {
                    console.error('❌ Error moviendo archivo:', moveError);
                    // Eliminar archivo temporal
                    const tempPath = path.join(__dirname, '../uploads', req.file.filename);
                    if (fs.existsSync(tempPath)) {
                        fs.unlinkSync(tempPath);
                    }
                    
                    req.flash('error_msg', 'Error procesando la imagen');
                    return res.redirect('/admin/products/new');
                }
            }
            // 2. Prioridad: URL de imagen
            else if (imagen_url && imagen_url.trim() !== '') {
                imagenPath = imagen_url.trim();
                console.log('✅ Usando URL de imagen:', imagenPath);
            }
            // 3. Sin imagen (permitido)
            
            console.log('🖼️ Ruta final de imagen:', imagenPath || 'Sin imagen');

            // CONVERTIR VALORES - ¡ESTO ES CLAVE!
            const precioNum = parseFloat(precio);
            
            // Stock: usar valor del formulario o 0 si está vacío
            let stockNum = 0;
            if (stock !== undefined && stock !== null && stock !== '') {
                stockNum = parseInt(stock);
                if (isNaN(stockNum)) stockNum = 0;
            }
            
            // Checkboxes: si vienen como 'on', 'true', o están marcados
            const destacadoBool = destacado === 'on' || destacado === 'true' || destacado === true;
            
            // ¡¡IMPORTANTE!!: Por defecto, productos NUEVOS deben ser ACTIVOS
            // Solo desactivar si explícitamente no se marca el checkbox
            const activoBool = (activo === 'on' || activo === 'true' || activo === true || activo === undefined);

            console.log('🔢 VALORES CONVERTIDOS:');
            console.log('  Precio:', precioNum);
            console.log('  Stock:', stockNum);
            console.log('  Destacado:', destacadoBool);
            console.log('  Activo:', activoBool);

            // CREAR PRODUCTO EN LA BASE DE DATOS
            const product = await Product.create({
                nombre: nombre.trim(),
                descripcion: descripcion ? descripcion.trim() : null,
                precio: precioNum,
                categoria: categoria.trim(),
                unidad: unidad.trim(),
                imagen: imagenPath,
                stock: stockNum,
                destacado: destacadoBool,
                activo: activoBool  // ¡SIEMPRE TRUE PARA NUEVOS PRODUCTOS!
            });

            console.log('🎉 PRODUCTO CREADO EXITOSAMENTE');
            console.log('  ID:', product.id);
            console.log('  Nombre:', product.nombre);
            console.log('  Activo:', product.activo);
            console.log('  Stock:', product.stock);
            console.log('  Imagen:', product.imagen);
            
            req.flash('success_msg', 'Producto creado exitosamente');
            res.redirect('/admin/products');

        } catch (error) {
            console.error('❌ ERROR CRÍTICO al crear producto:', error);
            console.error('❌ Stack trace:', error.stack);
            
            // Limpiar archivo temporal si existe
            if (req.file && req.file.filename) {
                try {
                    const tempPath = path.join(__dirname, '../uploads', req.file.filename);
                    if (fs.existsSync(tempPath)) {
                        fs.unlinkSync(tempPath);
                        console.log('🗑️ Archivo temporal eliminado:', req.file.filename);
                    }
                } catch (cleanupError) {
                    console.error('Error limpiando archivo:', cleanupError);
                }
            }
            
            let errorMessage = 'Error al crear el producto';
            if (error.name === 'SequelizeValidationError') {
                const errors = error.errors.map(err => err.message);
                errorMessage = errors.join(', ');
                console.log('❌ Errores de validación Sequelize:', errors);
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            req.flash('error_msg', errorMessage);
            res.redirect('/admin/products/new');
        }
    },

    // Mostrar formulario para editar producto
    showEditForm: async (req, res) => {
        try {
            const { id } = req.params;

            const product = await Product.findByPk(id, {
                include: [{
                    model: OrderItem,
                    as: 'pedido_items',
                    required: false
                }]
            });

            if (!product) {
                req.flash('error_msg', 'Producto no encontrado');
                return res.redirect('/admin/products');
            }

            // Contar pedidos asociados
            const pedidosCount = product.pedido_items ? product.pedido_items.length : 0;

            res.render('admin/products/create', {
                title: 'Editar Producto',
                product,
                pedidosCount,
                categories: [
                    'vacuno', 'cerdo', 'pollo', 'cordero', 
                    'elaborados', 'embutidos', 'quesos', 
                    'mariscos', 'pescado', 'otros'
                ],
                units: ['kg', 'gr', 'unidad', 'paquete', 'docena', 'litro']
            });

        } catch (error) {
            console.error('Error al cargar producto:', error);
            req.flash('error_msg', 'Error al cargar el producto');
            res.redirect('/admin/products');
        }
    },

    // ACTUALIZAR PRODUCTO - VERSIÓN DEFINITIVA CORREGIDA
    updateProduct: async (req, res) => {
        try {
            const { id } = req.params;
            console.log('📦 === ACTUALIZANDO PRODUCTO ID:', id, '===');
            console.log('📋 Campos recibidos:', JSON.stringify(req.body, null, 2));
            console.log('📁 Archivo:', req.file ? req.file.filename : 'Ninguno');
            
            // Extraer TODOS los campos
            const {
                nombre,
                descripcion,
                precio,
                categoria,
                unidad,
                stock,
                destacado,
                activo,
                imagen_url,
                mantener_imagen
            } = req.body;

            console.log('🔍 VALORES PARA ACTUALIZACIÓN:');
            console.log('  Activo checkbox:', activo);
            console.log('  Destacado checkbox:', destacado);
            console.log('  Stock:', stock);
            console.log('  Mantener imagen:', mantener_imagen);

            const product = await Product.findByPk(id);

            if (!product) {
                req.flash('error_msg', 'Producto no encontrado');
                return res.redirect('/admin/products');
            }

            // MANEJO DE IMÁGENES EN ACTUALIZACIÓN
            let nuevaImagen = product.imagen;
            
            // Solo cambiar imagen si NO se marca "mantener imagen"
            if (!mantener_imagen || mantener_imagen !== 'on') {
                console.log('🔄 Cambiando imagen...');
                
                // Opción 1: Nuevo archivo subido
                if (req.file) {
                    console.log('📁 Nuevo archivo subido');
                    
                    // Eliminar imagen anterior si existe y es local
                    if (product.imagen && product.imagen.startsWith('/uploads/')) {
                        upload.deleteFile(product.imagen);
                    }
                    
                    // Mover nueva imagen
                    nuevaImagen = upload.moveToPublic(req.file.filename, categoria || product.categoria);
                    console.log('✅ Nueva imagen:', nuevaImagen);
                }
                // Opción 2: URL externa
                else if (imagen_url && imagen_url.trim() !== '') {
                    console.log('🔗 Usando URL externa:', imagen_url);
                    
                    // Eliminar imagen anterior si es local
                    if (product.imagen && product.imagen.startsWith('/uploads/')) {
                        upload.deleteFile(product.imagen);
                    }
                    
                    nuevaImagen = imagen_url.trim();
                }
                // Opción 3: Ambos vacíos = eliminar imagen
                else if (!req.file && (!imagen_url || imagen_url.trim() === '')) {
                    console.log('🗑️ Eliminando imagen (campos vacíos)');
                    
                    // Eliminar imagen anterior si es local
                    if (product.imagen && product.imagen.startsWith('/uploads/')) {
                        upload.deleteFile(product.imagen);
                    }
                    
                    nuevaImagen = null;
                }
            } else {
                console.log('💾 Manteniendo imagen actual:', product.imagen);
            }

            console.log('🖼️ Imagen final:', nuevaImagen);

            // CONVERTIR VALORES PARA ACTUALIZACIÓN
            const precioNum = parseFloat(precio);
            
            // Stock: usar valor del formulario
            let stockNum = product.stock; // Mantener actual por defecto
            if (stock !== undefined && stock !== null && stock !== '') {
                stockNum = parseInt(stock);
                if (isNaN(stockNum)) stockNum = 0;
            }
            
            // Checkboxes: convertir 'on'/'true' a booleano
            const destacadoBool = destacado === 'on' || destacado === 'true' || destacado === true;
            const activoBool = activo === 'on' || activo === 'true' || activo === true;

            console.log('🔢 VALORES CONVERTIDOS PARA UPDATE:');
            console.log('  Precio:', precioNum);
            console.log('  Stock:', stockNum);
            console.log('  Destacado:', destacadoBool);
            console.log('  Activo:', activoBool);

            // ACTUALIZAR PRODUCTO
            await product.update({
                nombre: nombre.trim(),
                descripcion: descripcion ? descripcion.trim() : null,
                precio: precioNum,
                categoria: categoria.trim(),
                unidad: unidad.trim(),
                imagen: nuevaImagen,
                stock: stockNum,
                destacado: destacadoBool,
                activo: activoBool  // ¡Tomar el valor del checkbox!
            });

            console.log('✅ PRODUCTO ACTUALIZADO EXITOSAMENTE');
            console.log('  Nombre:', product.nombre);
            console.log('  Activo:', product.activo);
            console.log('  Stock:', product.stock);
            console.log('  Imagen:', product.imagen);
            
            req.flash('success_msg', 'Producto actualizado exitosamente');
            res.redirect('/admin/products');

        } catch (error) {
            console.error('❌ Error al actualizar producto:', error);
            
            // Limpiar archivo temporal si existe
            if (req.file && req.file.filename) {
                try {
                    const tempPath = path.join(__dirname, '../uploads', req.file.filename);
                    if (fs.existsSync(tempPath)) {
                        fs.unlinkSync(tempPath);
                    }
                } catch (cleanupError) {
                    console.error('Error limpiando archivo:', cleanupError);
                }
            }
            
            let errorMessage = 'Error al actualizar el producto';
            if (error.name === 'SequelizeValidationError') {
                const errors = error.errors.map(err => err.message);
                errorMessage = errors.join(', ');
            }
            
            req.flash('error_msg', errorMessage);
            res.redirect(`/admin/products/${req.params.id}/edit`);
        }
    },

    // Eliminar producto (soft delete)
    deleteProduct: async (req, res) => {
        try {
            const { id } = req.params;
            const { permanent, force } = req.query;

            const product = await Product.findByPk(id, {
                include: [{
                    model: OrderItem,
                    as: 'pedido_items',
                    required: false,
                    attributes: ['id']
                }]
            });

            if (!product) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Producto no encontrado' 
                });
            }

            const hasOrders = product.pedido_items && product.pedido_items.length > 0;
            const orderCount = hasOrders ? product.pedido_items.length : 0;

            if (permanent === 'true') {
                if (hasOrders && force !== 'true') {
                    return res.json({ 
                        success: false, 
                        message: `Este producto tiene ${orderCount} pedido(s) asociado(s). ¿Estás seguro de eliminarlo de todos modos?`,
                        hasOrders: true,
                        orderCount: orderCount,
                        productId: id
                    });
                }

                try {
                    // Eliminar imagen si existe
                    if (product.imagen) {
                        upload.deleteFile(product.imagen);
                    }
                    
                    await product.destroy({ force: true });
                    
                    return res.json({ 
                        success: true, 
                        message: 'Producto eliminado permanentemente',
                        permanently: true
                    });
                    
                } catch (error) {
                    console.error('Error en eliminación permanente:', error);
                    
                    if (error.name === 'SequelizeForeignKeyConstraintError') {
                        return res.status(400).json({ 
                            success: false, 
                            message: 'No se puede eliminar: el producto está vinculado a pedidos que no pueden ser modificados.'
                        });
                    }
                    
                    throw error;
                }
                
            } else {
                // SOFT DELETE: solo desactivar
                await product.update({ activo: false });
                
                return res.json({ 
                    success: true, 
                    message: 'Producto desactivado exitosamente',
                    permanently: false
                });
            }

        } catch (error) {
            console.error('Error al eliminar producto:', error);
            
            if (error.name === 'SequelizeForeignKeyConstraintError') {
                return res.status(400).json({ 
                    success: false, 
                    message: 'No se puede eliminar el producto porque está asociado a pedidos existentes.' 
                });
            }
            
            res.status(500).json({ 
                success: false, 
                message: 'Error al procesar la solicitud' 
            });
        }
    },

    // Restaurar producto
    restoreProduct: async (req, res) => {
        try {
            const { id } = req.params;

            const product = await Product.findByPk(id);

            if (!product) {
                return res.status(404).json({ success: false, message: 'Producto no encontrado' });
            }

            await product.update({ activo: true });

            res.json({ success: true, message: 'Producto activado exitosamente' });

        } catch (error) {
            console.error('Error al restaurar producto:', error);
            res.status(500).json({ success: false, message: 'Error al activar el producto' });
        }
    },

    // Vista rápida del producto
    quickView: async (req, res) => {
        try {
            const { id } = req.params;

            const product = await Product.findByPk(id, {
                include: [{
                    model: OrderItem,
                    as: 'pedido_items',
                    required: false
                }]
            });

            if (!product) {
                return res.status(404).json({ success: false, message: 'Producto no encontrado' });
            }

            const pedidosCount = product.pedido_items ? product.pedido_items.length : 0;

            res.json({ 
                success: true, 
                product,
                pedidosCount,
                canDeletePermanently: pedidosCount === 0
            });

        } catch (error) {
            console.error('Error en quick view:', error);
            res.status(500).json({ success: false, message: 'Error al cargar el producto' });
        }
    },

    // Verificar si se puede eliminar permanentemente
    checkDeleteStatus: async (req, res) => {
        try {
            const { id } = req.params;

            const product = await Product.findByPk(id, {
                include: [{
                    model: OrderItem,
                    as: 'pedido_items',
                    required: false,
                    attributes: ['id']
                }]
            });

            if (!product) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Producto no encontrado' 
                });
            }

            const hasOrders = product.pedido_items && product.pedido_items.length > 0;
            const orderCount = hasOrders ? product.pedido_items.length : 0;

            res.json({
                success: true,
                canDeletePermanently: !hasOrders,
                hasOrders: hasOrders,
                orderCount: orderCount,
                product: {
                    id: product.id,
                    nombre: product.nombre,
                    activo: product.activo
                }
            });

        } catch (error) {
            console.error('Error verificando estado de eliminación:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error al verificar estado del producto' 
            });
        }
    },

    // Obtener imágenes por categoría
    getCategoryImages: async (req, res) => {
        try {
            const { category } = req.params;
            const fs = require('fs');
            const path = require('path');
            
            // Mapeo de categorías a carpetas
            const categoryMap = {
                'vacuno': 'vacuno',
                'cerdo': 'cerdo',
                'pollo': 'pollo',
                'cordero': 'cordero',
                'elaborados': 'elaborados',
                'embutidos': 'elaborados',
                'quesos': 'queso',
                'mariscos': 'mariscos',
                'pescado': 'pescado'
            };
            
            const folder = categoryMap[category] || 'otros';
            const folderPath = path.join(__dirname, '../public/images', folder);
            
            let images = [];
            
            if (fs.existsSync(folderPath)) {
                const files = fs.readdirSync(folderPath);
                images = files
                    .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
                    .map(file => `/images/${folder}/${file}`);
            }
            
            res.json({
                success: true,
                category: category,
                folder: folder,
                images: images
            });
            
        } catch (error) {
            console.error('Error obteniendo imágenes:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener imágenes'
            });
        }
    }
};