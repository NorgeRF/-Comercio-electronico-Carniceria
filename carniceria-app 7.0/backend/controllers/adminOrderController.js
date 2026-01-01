const { Order, OrderItem, Product, User, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Listar todos los pedidos
 */
exports.listOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const search = req.query.search;

    // Construir condiciones de búsqueda
    const where = {};
    
    if (status && status !== 'todos') {
      where.estado = status;
    }
    
    if (search) {
      where[Op.or] = [
        { codigo_pedido: { [Op.like]: `%${search}%` } },
        { cliente_nombre: { [Op.like]: `%${search}%` } },
        { cliente_email: { [Op.like]: `%${search}%` } },
        { cliente_telefono: { [Op.like]: `%${search}%` } }
      ];
    }

    // Obtener pedidos con paginación
    const { count, rows: orders } = await Order.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'procesado_por',
          attributes: ['id', 'nombre', 'email']
        }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    // Estadísticas
    const stats = await Order.findAll({
      attributes: [
        'estado',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('total')), 'total']
      ],
      group: ['estado'],
      raw: true
    });

    res.render('admin/orders/list', {
      title: 'Gestión de Pedidos',
      orders,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalOrders: count,
      stats,
      status,
      search,
      success_msg: req.flash('success_msg'),
      error_msg: req.flash('error_msg')
    });

  } catch (error) {
    console.error('Error listando pedidos:', error);
    req.flash('error_msg', 'Error al cargar los pedidos');
    res.redirect('/admin');
  }
};

/**
 * Ver detalle de un pedido
 */
exports.viewOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findByPk(id, {
      include: [
        {
          model: User,
          as: 'procesado_por',
          attributes: ['id', 'nombre', 'email']
        },
        {
          model: OrderItem,
          as: 'items',
          include: [{
            model: Product,
            as: 'producto',
            attributes: ['id', 'nombre', 'categoria', 'unidad', 'precio']
          }]
        }
      ]
    });

    if (!order) {
      req.flash('error_msg', 'Pedido no encontrado');
      return res.redirect('/admin/orders');
    }

    res.render('admin/orders/view', {
      title: `Pedido #${order.codigo_pedido}`,
      order,
      success_msg: req.flash('success_msg'),
      error_msg: req.flash('error_msg')
    });

  } catch (error) {
    console.error('Error viendo pedido:', error);
    req.flash('error_msg', 'Error al cargar el pedido');
    res.redirect('/admin/orders');
  }
};

/**
 * Actualizar estado de un pedido
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, notas_admin } = req.body;

    const order = await Order.findByPk(id);
    
    if (!order) {
      req.flash('error_msg', 'Pedido no encontrado');
      return res.redirect('/admin/orders');
    }

    // Actualizar estado
    await order.update({
      estado,
      notas: notas_admin ? `${order.notas || ''}\n[Admin]: ${notas_admin}` : order.notas,
      usuario_id: req.session.userId // Registrar quién actualizó
    });

    // Si el pedido se cancela, revertir stock
    if (estado === 'cancelado' && order.estado !== 'cancelado') {
      const items = await OrderItem.findAll({ where: { pedido_id: id } });
      
      for (const item of items) {
        await Product.increment('stock', {
          by: item.cantidad,
          where: { id: item.producto_id }
        });
      }
    }

    req.flash('success_msg', `Estado del pedido actualizado a: ${estado}`);
    res.redirect(`/admin/orders/${id}`);

  } catch (error) {
    console.error('Error actualizando pedido:', error);
    req.flash('error_msg', 'Error al actualizar el pedido');
    res.redirect(`/admin/orders/${req.params.id}`);
  }
};

/**
 * Eliminar un pedido (solo para admin)
 */
/**
 * Eliminar un pedido (solo para admin)
 */
exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`??? Intentando eliminar pedido ID: ${id}`);
    
    // Verificar que el usuario est� autenticado como admin
    if (!req.session.userId || !req.session.user) {
      console.log('? Usuario no autenticado');
      return res.status(401).json({ 
        success: false, 
        message: 'No autenticado' 
      });
    }

    // Verificar que el usuario es admin
    const { User } = require('../models');
    const user = await User.findByPk(req.session.userId);
    
    if (!user || user.rol !== 'admin') {
      console.log('? Usuario no es admin');
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permisos para esta acci�n' 
      });
    }

    const { Order, OrderItem, sequelize } = require('../models');
    const order = await Order.findByPk(id);
    
    if (!order) {
      console.log(`? Pedido ${id} no encontrado`);
      return res.status(404).json({ 
        success: false, 
        message: 'Pedido no encontrado' 
      });
    }

    // Estados permitidos para eliminar - DEBE COINCIDIR CON EL HTML
    const estadosPermitidos = ['pendiente', 'cancelado', 'pendiente_pago'];
    
    if (!estadosPermitidos.includes(order.estado)) {
      console.log(`? Estado no permitido: ${order.estado}`);
      return res.status(400).json({ 
        success: false, 
        message: `Solo se pueden eliminar pedidos en estado: ${estadosPermitidos.join(', ')}` 
      });
    }

    console.log(`? Eliminando pedido #${order.codigo_pedido} (Estado: ${order.estado})`);

    // Si es un pedido pendiente_pago, podemos eliminarlo directamente
    // Si es un pedido con pago procesado, podr�amos necesitar revertir transacciones
    
    // Usar transacci�n para asegurar integridad
    await sequelize.transaction(async (t) => {
      // 1. Eliminar items del pedido
      await OrderItem.destroy({
        where: { pedido_id: id },
        transaction: t
      });

      // 2. Eliminar el pedido
      await order.destroy({ transaction: t });
    });

    console.log(`? Pedido #${order.codigo_pedido} eliminado correctamente`);
    
    res.json({ 
      success: true, 
      message: `Pedido #${order.codigo_pedido} eliminado correctamente` 
    });

  } catch (error) {
    console.error('? Error eliminando pedido:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar el pedido',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

/**
 * Generar reporte de ventas - VERSIÓN CORREGIDA Y FUNCIONAL
 */
exports.salesReport = async (req, res) => {
  try {
    console.log('📊 Iniciando generación de reporte de ventas...');
    
    const { fecha_inicio, fecha_fin } = req.query;
    
    // Construir condiciones WHERE - SOLO PEDIDOS CONFIRMADOS/ENTREGADOS
    const where = {
      estado: { 
        [Op.in]: ['confirmado', 'preparando', 'enviado', 'entregado'] 
      }
    };

    // Calcular fechas
    let startDate, endDate;
    
    if (fecha_inicio && fecha_fin) {
      startDate = new Date(fecha_inicio);
      endDate = new Date(fecha_fin);
      endDate.setHours(23, 59, 59, 999); // Incluir todo el día final
      
      where.created_at = {
        [Op.between]: [startDate, endDate]
      };
      console.log(`📅 Filtro de fecha: ${fecha_inicio} a ${fecha_fin}`);
    } else {
      // Últimos 30 días por defecto
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      
      where.created_at = {
        [Op.between]: [startDate, endDate]
      };
      console.log(`📅 Filtro por defecto: últimos 30 días`);
    }

    // 1. OBTENER PEDIDOS POR DÍA (SOLO VENTAS CONFIRMADAS)
    console.log('📊 Obteniendo pedidos por día...');
    const ordersByDay = await Order.findAll({
      where,
      attributes: [
        [sequelize.fn('DATE', sequelize.col('created_at')), 'fecha'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_pedidos'],
        [sequelize.fn('SUM', sequelize.col('total')), 'venta_total'],
        [sequelize.fn('AVG', sequelize.col('total')), 'promedio_venta'],
        [sequelize.fn('MIN', sequelize.col('total')), 'venta_minima'],
        [sequelize.fn('MAX', sequelize.col('total')), 'venta_maxima']
      ],
      group: [sequelize.fn('DATE', sequelize.col('created_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'DESC']],
      raw: true
    });

    console.log(`✅ Pedidos por día obtenidos: ${ordersByDay.length} días`);

    // 2. OBTENER PRODUCTOS MÁS VENDIDOS (CONSULTA SQL MEJORADA)
    console.log('📦 Obteniendo productos más vendidos...');
    let topProducts = [];
    
    try {
      // Formatear fechas para la consulta SQL
      const formattedStartDate = startDate.toISOString().slice(0, 19).replace('T', ' ');
      const formattedEndDate = endDate.toISOString().slice(0, 19).replace('T', ' ');
      
      console.log(`📅 Fechas para consulta SQL:`);
      console.log(`   - Inicio: ${formattedStartDate}`);
      console.log(`   - Fin: ${formattedEndDate}`);
      
      // Consulta SQL corregida y simplificada - SOLO PEDIDOS CONFIRMADOS
      const query = `
        SELECT 
          pi.producto_id,
          p.nombre,
          p.categoria,
          p.unidad,
          COALESCE(SUM(pi.cantidad), 0) as total_vendido,
          COALESCE(SUM(pi.subtotal), 0) as ingreso_total
        FROM pedido_items pi
        INNER JOIN productos p ON pi.producto_id = p.id
        INNER JOIN pedidos ped ON pi.pedido_id = ped.id
        WHERE ped.estado IN ('confirmado', 'preparando', 'enviado', 'entregado')
          AND ped.created_at BETWEEN ? AND ?
        GROUP BY pi.producto_id, p.nombre, p.categoria, p.unidad
        ORDER BY total_vendido DESC
        LIMIT 10
      `;
      
      console.log(`🔍 Ejecutando consulta SQL...`);
      const productResults = await sequelize.query(query, {
        replacements: [formattedStartDate, formattedEndDate],
        type: sequelize.QueryTypes.SELECT
      });
      
      console.log(`✅ Resultados de consulta: ${productResults.length} productos`);
      
      // Transformar resultados
      topProducts = Array.isArray(productResults) ? productResults.map(row => ({
        producto: {
          nombre: row.nombre || 'Producto Desconocido',
          categoria: row.categoria || 'Sin categoría',
          unidad: row.unidad || 'unidad'
        },
        get: (field) => {
          if (field === 'total_vendido') return row.total_vendido || 0;
          if (field === 'ingreso_total') return row.ingreso_total || 0;
          if (field === 'producto_id') return row.producto_id || null;
          return null;
        }
      })) : [];

      console.log(`✅ Productos más vendidos procesados: ${topProducts.length}`);
      
    } catch (productError) {
      console.error('❌ Error obteniendo productos más vendidos:', productError.message);
      console.error('📋 Detalles del error:', productError);
      // Continuar con array vacío si hay error
      topProducts = [];
    }

    // 3. OBTENER MÉTODOS DE PAGO (SOLO DE PEDIDOS CONFIRMADOS)
    console.log('💳 Obteniendo métodos de pago...');
    let paymentMethods = [];
    
    try {
      paymentMethods = await Order.findAll({
        where,
        attributes: [
          'metodo_pago',
          [sequelize.fn('COUNT', sequelize.col('id')), 'total_pedidos'],
          [sequelize.fn('SUM', sequelize.col('total')), 'total_ingresos']
        ],
        group: ['metodo_pago'],
        raw: true
      });

      console.log(`✅ Métodos de pago obtenidos: ${paymentMethods.length}`);
    } catch (paymentError) {
      console.error('❌ Error obteniendo métodos de pago:', paymentError.message);
      paymentMethods = [];
    }

    // 4. OBTENER ESTADÍSTICAS POR ESTADO
    console.log('📈 Obteniendo estadísticas por estado...');
    let statsByStatus = [];
    
    try {
      statsByStatus = await Order.findAll({
        where: {
          estado: { [Op.in]: ['confirmado', 'preparando', 'enviado', 'entregado'] },
          created_at: {
            [Op.between]: [startDate, endDate]
          }
        },
        attributes: [
          'estado',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('total')), 'total']
        ],
        group: ['estado'],
        raw: true
      });

      console.log(`✅ Estadísticas por estado obtenidas:`, statsByStatus);
    } catch (statsError) {
      console.error('❌ Error obteniendo estadísticas por estado:', statsError.message);
      statsByStatus = [];
    }

    // 5. CALCULAR ESTADÍSTICAS GLOBALES
    const totalVentas = ordersByDay.reduce((sum, day) => sum + parseFloat(day.venta_total || 0), 0);
    const totalPedidos = ordersByDay.reduce((sum, day) => sum + parseInt(day.total_pedidos || 0), 0);
    const ticketPromedio = totalPedidos > 0 ? totalVentas / totalPedidos : 0;

    console.log('📊 Estadísticas calculadas:');
    console.log(`   - Ventas totales: €${totalVentas.toFixed(2)}`);
    console.log(`   - Pedidos totales: ${totalPedidos}`);
    console.log(`   - Ticket promedio: €${ticketPromedio.toFixed(2)}`);
    console.log(`   - Días con ventas: ${ordersByDay.length}`);
    console.log(`   - Productos top: ${topProducts.length}`);
    console.log(`   - Métodos de pago: ${paymentMethods.length}`);
    console.log(`   - Estadísticas por estado: ${statsByStatus.length}`);

    // 6. PREPARAR DATOS PARA LA VISTA
    const ordersByDayFormatted = Array.isArray(ordersByDay) ? ordersByDay.map(day => ({
      get: (field) => {
        switch(field) {
          case 'fecha': return day.fecha;
          case 'total_pedidos': return day.total_pedidos || 0;
          case 'venta_total': return day.venta_total || 0;
          case 'promedio_venta': return day.promedio_venta || 0;
          case 'venta_minima': return day.venta_minima || 0;
          case 'venta_maxima': return day.venta_maxima || 0;
          default: return null;
        }
      }
    })) : [];

    const paymentMethodsFormatted = Array.isArray(paymentMethods) ? paymentMethods.map(method => ({
      metodo_pago: method.metodo_pago || 'Desconocido',
      get: (field) => {
        if (field === 'total_pedidos') return method.total_pedidos || 0;
        if (field === 'total_ingresos') return method.total_ingresos || 0;
        return null;
      }
    })) : [];

    const statsByStatusFormatted = Array.isArray(statsByStatus) ? statsByStatus.map(stat => ({
      estado: stat.estado,
      get: (field) => {
        if (field === 'count') return stat.count || 0;
        if (field === 'total') return stat.total || 0;
        return null;
      }
    })) : [];

    // 7. RENDERIZAR VISTA
    console.log('🎨 Renderizando vista de reporte...');
    
    res.render('admin/orders/report', {
      title: 'Reporte de Ventas',
      ordersByDay: ordersByDayFormatted,
      topProducts,
      paymentMethods: paymentMethodsFormatted,
      statsByStatus: statsByStatusFormatted,
      fecha_inicio: fecha_inicio || '',
      fecha_fin: fecha_fin || '',
      success_msg: req.flash('success_msg'),
      error_msg: req.flash('error_msg')
    });

    console.log('✅ Reporte generado y enviado exitosamente');

  } catch (error) {
    console.error('❌ ERROR CRÍTICO generando reporte:', error.message);
    console.error('📋 Stack trace completo:', error.stack);
    
    // Enviar página de error amigable
    req.flash('error_msg', `Error técnico al generar el reporte. Por favor, intenta más tarde.`);
    
    // Renderizar página de error o redirigir
    try {
      res.render('admin/orders/report', {
        title: 'Reporte de Ventas - Error',
        ordersByDay: [],
        topProducts: [],
        paymentMethods: [],
        statsByStatus: [],
        fecha_inicio: '',
        fecha_fin: '',
        success_msg: [],
        error_msg: ['Error al generar el reporte. Por favor, intenta más tarde.']
      });
    } catch (renderError) {
      console.error('❌ Error al renderizar página de error:', renderError.message);
      res.redirect('/admin/orders');
    }
  }
};

/**
 * Enviar notificación por WhatsApp
 */
exports.sendWhatsAppNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { mensaje } = req.body;

    const order = await Order.findByPk(id);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
    }

    // Aquí integrarías con tu servicio de WhatsApp
    // Por ahora solo marcamos como enviado
    await order.update({ whatsapp_enviado: true });

    // Mensaje de ejemplo para WhatsApp
    const whatsappMessage = mensaje || 
      `Hola ${order.cliente_nombre}, tu pedido #${order.codigo_pedido} está ${order.estado}. Total: €${order.total}`;

    console.log(`📱 WhatsApp para ${order.cliente_telefono}: ${whatsappMessage}`);

    res.json({ 
      success: true, 
      message: 'Notificación enviada',
      whatsapp_link: `https://wa.me/${order.cliente_telefono}?text=${encodeURIComponent(whatsappMessage)}`
    });

  } catch (error) {
    console.error('Error enviando WhatsApp:', error);
    res.status(500).json({ success: false, message: 'Error al enviar notificación' });
  }
};