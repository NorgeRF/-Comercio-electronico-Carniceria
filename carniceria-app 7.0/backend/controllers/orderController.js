const Order = require('../models/Order');
const Product = require('../models/Product');
const { sequelize } = require('../config/database');

// Crear un nuevo pedido
exports.createOrder = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const orderData = req.body;
        
        // Generar código de pedido único
        const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const lastOrder = await Order.findOne({
            order: [['created_at', 'DESC']],
            transaction
        });
        
        let secuencia = 1;
        if (lastOrder && lastOrder.codigo_pedido.includes(fecha)) {
            const lastSeq = parseInt(lastOrder.codigo_pedido.split('-').pop());
            secuencia = lastSeq + 1;
        }
        
        const codigoPedido = `PED-${fecha}-${secuencia.toString().padStart(4, '0')}`;
        
        // Crear el pedido
        const order = await Order.create({
            ...orderData,
            codigo_pedido: codigoPedido
        }, { transaction });
        
        // Procesar items del pedido
        const items = orderData.items || [];
        for (const item of items) {
            const product = await Product.findByPk(item.producto_id, { transaction });
            
            if (!product) {
                throw new Error(`Producto no encontrado: ${item.producto_id}`);
            }
            
            if (product.stock < item.cantidad) {
                throw new Error(`Stock insuficiente para: ${product.nombre}`);
            }
            
            // Actualizar stock
            await product.update({
                stock: product.stock - item.cantidad
            }, { transaction });
            
            // Crear item del pedido (asumiendo modelo OrderItem)
            // await OrderItem.create({ ... }, { transaction });
        }
        
        await transaction.commit();
        
        // Enviar notificación por WhatsApp
        await sendWhatsAppNotification(order);
        
        res.status(201).json({
            success: true,
            order: order,
            codigo_pedido: codigoPedido,
            message: 'Pedido creado exitosamente'
        });
        
    } catch (error) {
        await transaction.rollback();
        console.error('Error al crear pedido:', error);
        res.status(500).json({
            success: false,
            error: 'Error al crear pedido',
            details: error.message
        });
    }
};

// Obtener todos los pedidos
exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.findAll({
            order: [['created_at', 'DESC']],
            include: [
                {
                    model: require('../models/OrderItem'),
                    as: 'items',
                    include: [{
                        model: Product,
                        as: 'producto'
                    }]
                }
            ]
        });
        res.json(orders);
    } catch (error) {
        console.error('Error al obtener pedidos:', error);
        res.status(500).json({ 
            error: 'Error al obtener pedidos',
            details: error.message 
        });
    }
};

// Obtener pedido por ID
exports.getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findByPk(id, {
            include: [
                {
                    model: require('../models/OrderItem'),
                    as: 'items',
                    include: [{
                        model: Product,
                        as: 'producto'
                    }]
                }
            ]
        });
        
        if (!order) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }
        
        res.json(order);
    } catch (error) {
        console.error('Error al obtener pedido:', error);
        res.status(500).json({ 
            error: 'Error al obtener pedido',
            details: error.message 
        });
    }
};

// Actualizar estado del pedido
exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        
        const validStatus = ['pendiente', 'confirmado', 'preparando', 'enviado', 'entregado', 'cancelado'];
        if (!validStatus.includes(estado)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }
        
        const order = await Order.findByPk(id);
        if (!order) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }
        
        await order.update({ estado });
        
        // Si el pedido se cancela, restaurar stock
        if (estado === 'cancelado' && order.estado !== 'cancelado') {
            await restoreStock(order.id);
        }
        
        res.json({
            success: true,
            order: order,
            message: 'Estado del pedido actualizado'
        });
        
    } catch (error) {
        console.error('Error al actualizar estado del pedido:', error);
        res.status(500).json({ 
            error: 'Error al actualizar estado del pedido',
            details: error.message 
        });
    }
};

// Función para restaurar stock
async function restoreStock(orderId) {
    // Implementar lógica para restaurar stock cuando se cancela un pedido
}

// Función para enviar notificación por WhatsApp
async function sendWhatsAppNotification(order) {
    try {
        const { Client } = require('whatsapp-web.js');
        const qrcode = require('qrcode-terminal');
        
        // Configurar cliente de WhatsApp
        const client = new Client({
            puppeteer: {
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });
        
        client.on('qr', qr => {
            qrcode.generate(qr, { small: true });
        });
        
        client.on('ready', async () => {
            console.log('WhatsApp client is ready!');
            
            // Construir mensaje
            const message = `
?? *NUEVO PEDIDO RECIBIDO*
--------------------
Código: ${order.codigo_pedido}
Cliente: ${order.cliente_nombre}
Teléfono: ${order.cliente_telefono}
Total: €${order.total}
--------------------
Dirección: ${order.cliente_direccion}
${order.cliente_ciudad} ${order.cliente_codigo_postal}
--------------------
Método de pago: ${order.metodo_pago}
--------------------
¡Gracias por tu pedido! Te contactaremos pronto.
            `;
            
            // Enviar al cliente
            await client.sendMessage(`${order.cliente_telefono}@c.us`, message);
            
            // Enviar al administrador (número configurado en .env)
            const adminNumber = process.env.WHATSAPP_ADMIN || process.env.WHATSAPP_NUMBER;
            await client.sendMessage(`${adminNumber}@c.us`, message);
            
            // Marcar como enviado
            await order.update({ whatsapp_enviado: true });
            
            await client.destroy();
        });
        
        await client.initialize();
        
    } catch (error) {
        console.error('Error al enviar WhatsApp:', error);
    }
}

// Obtener estadísticas de pedidos
exports.getOrderStats = async (req, res) => {
    try {
        const stats = await Order.findAll({
            attributes: [
                'estado',
                [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
                [sequelize.fn('SUM', sequelize.col('total')), 'ingresos']
            ],
            group: ['estado']
        });
        
        const totalOrders = await Order.count();
        const totalRevenue = await Order.sum('total');
        
        res.json({
            stats: stats,
            totalOrders: totalOrders,
            totalRevenue: totalRevenue || 0
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ 
            error: 'Error al obtener estadísticas',
            details: error.message 
        });
    }
};