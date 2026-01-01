const { User, Order, Customer, sequelize } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Listar clientes (AHORA de tabla clientes)
exports.listCustomers = async (req, res) => {
  try {
    const { page = 1, search = '', sortBy = 'fecha_registro', order = 'DESC' } = req.query;
    const limit = 20;
    const offset = (page - 1) * limit;

    const where = {};

    if (search) {
      where[Op.or] = [
        { nombre: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { telefono: { [Op.like]: `%${search}%` } }
      ];
    }

    const totalCustomers = await Customer.count({ where }); // CAMBIADO: Customer.count

    const customers = await Customer.findAll({ // CAMBIADO: Customer.findAll
      where,
      order: [[sortBy, order]],
      limit,
      offset
    });

    const stats = await Customer.findOne({ // CAMBIADO: Customer.findOne
      where,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN activo = true THEN 1 ELSE 0 END')), 'activos'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN verificado = true THEN 1 ELSE 0 END')), 'verificados'],
        [sequelize.fn('AVG', sequelize.col('total_compras')), 'promedio_compras']
      ],
      raw: true
    });

    res.render('admin/customers', {
      title: 'Gestión de Clientes',
      customers,
      stats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCustomers / limit),
        totalCustomers
      },
      search,
      sortBy,
      order,
      user: req.session.user,
      whatsapp_number: process.env.WHATSAPP_NUMBER || '+34600000000'
    });
  } catch (error) {
    console.error('Error listando clientes:', error);
    req.flash('error_msg', 'Error al cargar lista de clientes');
    res.redirect('/admin');
  }
};

exports.viewCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByPk(id); // CAMBIADO: Customer.findByPk

    if (!customer) {
      req.flash('error_msg', 'Cliente no encontrado');
      return res.redirect('/admin/customers');
    }

    const pedidos = await Order.findAll({
      where: { cliente_id: id },
      order: [['created_at', 'DESC']],
      limit: 10
    });

    const orderStats = await Order.findOne({
      where: { cliente_id: id },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_orders'],
        [sequelize.fn('SUM', sequelize.col('total')), 'total_spent'],
        [sequelize.fn('AVG', sequelize.col('total')), 'avg_order']
      ],
      raw: true
    });

    res.render('admin/customer-details', {
      title: `Detalle Cliente: ${customer.nombre}`,
      customer,
      pedidos,
      orderStats: orderStats || { total_orders: 0, total_spent: 0, avg_order: 0 },
      user: req.session.user
    });
  } catch (error) {
    console.error('Error viendo cliente:', error);
    req.flash('error_msg', 'Error al cargar detalle del cliente');
    res.redirect('/admin/customers');
  }
};

exports.createCustomer = async (req, res) => {
  try {
    const { nombre, email, telefono, direccion, ciudad, codigo_postal } = req.body;

    const existingCustomer = await Customer.findOne({ where: { email } }); // CAMBIADO: Customer
    if (existingCustomer) {
      req.flash('error_msg', 'El email ya está registrado');
      return res.redirect('/admin/customers');
    }

    const tempPassword = crypto.randomBytes(4).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const newCustomer = await Customer.create({ // CAMBIADO: Customer.create
      nombre,
      email,
      telefono,
      direccion,
      ciudad,
      codigo_postal,
      password_hash: hashedPassword,
      activo: true,
      verificado: true
    });

    console.log(`Cliente creado: ${email}`);
    req.flash('success_msg', 'Cliente creado exitosamente');
    res.redirect(`/admin/customers/${newCustomer.id}`);
  } catch (error) {
    console.error('Error creando cliente:', error);
    req.flash('error_msg', 'Error al crear cliente');
    res.redirect('/admin/customers');
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const customer = await Customer.findByPk(id); // CAMBIADO: Customer.findByPk
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    if (updates.activo !== undefined) updates.activo = updates.activo === 'on';
    if (updates.verificado !== undefined) updates.verificado = updates.verificado === 'on';

    await customer.update(updates);
    res.json({ success: true, message: 'Cliente actualizado correctamente' });
  } catch (error) {
    console.error('Error actualizando cliente:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar cliente' });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByPk(id); // CAMBIADO: Customer.findByPk
    
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    const activeOrders = await Order.count({
      where: {
        cliente_id: id,
        estado: { [Op.notIn]: ['entregado', 'cancelado'] }
      }
    });

    if (activeOrders > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar. Tiene ${activeOrders} pedido(s) activo(s).`
      });
    }

    await customer.update({ activo: false });
    res.json({ success: true, message: 'Cliente desactivado correctamente' });
  } catch (error) {
    console.error('Error eliminando cliente:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar cliente' });
  }
};

exports.restoreCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByPk(id); // CAMBIADO: Customer.findByPk
    
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    await customer.update({ activo: true });
    res.json({ success: true, message: 'Cliente reactivado correctamente' });
  } catch (error) {
    console.error('Error reactivando cliente:', error);
    res.status(500).json({ success: false, message: 'Error al reactivar cliente' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByPk(id); // CAMBIADO: Customer.findByPk
    
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    const newPassword = crypto.randomBytes(6).toString('hex');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await customer.update({
      password_hash: hashedPassword,
      verificado: false
    });

    res.json({
      success: true,
      message: 'Contraseña regenerada exitosamente',
      newPassword: newPassword
    });
  } catch (error) {
    console.error('Error reseteando contraseña:', error);
    res.status(500).json({ success: false, message: 'Error al resetear contraseña' });
  }
};

exports.searchCustomers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);

    const customers = await Customer.findAll({ // CAMBIADO: Customer.findAll
      where: {
        [Op.or]: [
          { nombre: { [Op.like]: `%${q}%` } },
          { email: { [Op.like]: `%${q}%` } },
          { telefono: { [Op.like]: `%${q}%` } }
        ]
      },
      attributes: ['id', 'nombre', 'email', 'telefono', 'ciudad'],
      limit: 10
    });

    res.json(customers);
  } catch (error) {
    console.error('Error buscando clientes:', error);
    res.status(500).json([]);
  }
};