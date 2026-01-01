const crypto = require('crypto');

/**
 * Muestra formulario de login para clientes
 */
exports.showCustomerLogin = (req, res) => {
  if (req.session.customerId) {
    return res.redirect('/mi-cuenta');
  }
  
  res.render('customer/login', {
    title: 'Acceso Clientes - Carnicería Tenerife',
    success_msg: req.flash('success_msg'),
    error_msg: req.flash('error_msg'),
    whatsapp_number: process.env.WHATSAPP_NUMBER || '+34600000000',
    currentYear: new Date().getFullYear()
  });
};

/**
 * Login para clientes (ÁREA SEPARADA del admin)
 */
exports.customerLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const { Customer } = require('../models'); // CAMBIADO: usar Customer, no User
    
    const customer = await Customer.findOne({ 
      where: { email }
    });
    
    if (!customer) {
      req.flash('error_msg', 'Cliente no encontrado');
      return res.redirect('/login-cliente');
    }
    
    // Verificar si tiene contraseña configurada
    if (!customer.password_hash) {
      req.flash('error_msg', 'No tienes contraseña configurada. Regístrate primero.');
      return res.redirect('/registro-cliente');
    }
    
    // Verificar contraseña
    const isValid = await customer.verifyPassword(password);
    
    if (!isValid) {
      req.flash('error_msg', 'Email o contraseña incorrectos');
      return res.redirect('/login-cliente');
    }
    
    // Verificar si está activo
    if (!customer.activo) {
      req.flash('error_msg', 'Cuenta desactivada. Contacta con soporte.');
      return res.redirect('/login-cliente');
    }
    
    // Crear sesión de CLIENTE
    req.session.customerId = customer.id;
    req.session.customer = {
      id: customer.id,
      nombre: customer.nombre,
      email: customer.email,
      telefono: customer.telefono || '',
      direccion: customer.direccion || '',
      ciudad: customer.ciudad || '',
      codigo_postal: customer.codigo_postal || '',
      fecha_registro: customer.fecha_registro
    };
    
    // Actualizar último acceso
    customer.ultimo_acceso = new Date();
    await customer.save();
    
    console.log(`? Login cliente exitoso: ${customer.email}`);
    
    // Redirigir según si tiene datos completos
    if (!customer.telefono || !customer.direccion || !customer.ciudad) {
      req.flash('warning_msg', 'Por favor, completa tu perfil para hacer pedidos');
      return res.redirect('/mi-perfil');
    }
    
    req.flash('success_msg', `Bienvenido de nuevo, ${customer.nombre}`);
    res.redirect('/mi-cuenta');
    
  } catch (error) {
    console.error('Error en login cliente:', error);
    req.flash('error_msg', 'Error en el servidor');
    res.redirect('/login-cliente');
  }
};

/**
 * Logout para clientes
 */
exports.customerLogout = (req, res) => {
  req.session.customerId = null;
  req.session.customer = null;
  req.flash('success_msg', 'Sesión cerrada correctamente');
  res.redirect('/');
};

/**
 * Formulario para crear contraseña (cuando vienen del email)
 */
exports.showCreatePassword = (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    req.flash('error_msg', 'Token inválido');
    return res.redirect('/login-cliente');
  }
  
  res.render('customer/create-password', {
    title: 'Crear Contraseña - Carnicería Tenerife',
    token: token,
    error_msg: req.flash('error_msg'),
    whatsapp_number: process.env.WHATSAPP_NUMBER || '+34600000000',
    currentYear: new Date().getFullYear()
  });
};

/**
 * Procesar creación de contraseña
 */
exports.createPassword = async (req, res) => {
  try {
    const { token, password, confirm_password } = req.body;
    
    if (password !== confirm_password) {
      req.flash('error_msg', 'Las contraseñas no coinciden');
      return res.redirect(`/crear-contrasena?token=${token}`);
    }
    
    if (password.length < 6) {
      req.flash('error_msg', 'La contraseña debe tener al menos 6 caracteres');
      return res.redirect(`/crear-contrasena?token=${token}`);
    }
    
    req.flash('success_msg', 'Contraseña creada exitosamente. Ahora puedes iniciar sesión.');
    res.redirect('/login-cliente');
    
  } catch (error) {
    console.error('Error creando contraseña:', error);
    req.flash('error_msg', 'Error al crear contraseña');
    res.redirect('/login-cliente');
  }
};

// NUEVO: Mostrar formulario de registro
exports.showCustomerRegister = (req, res) => {
  if (req.session.customerId) {
    return res.redirect('/mi-cuenta');
  }
  
  res.render('customer/register', {
    title: 'Registro Cliente - Carnicería Tenerife',
    error_msg: req.flash('error_msg'),
    success_msg: req.flash('success_msg'),
    whatsapp_number: process.env.WHATSAPP_NUMBER || '+34600000000'
  });
};

// NUEVO: Procesar registro
exports.customerRegister = async (req, res) => {
  try {
    const { nombre, email, password, telefono, direccion, ciudad, codigo_postal } = req.body;
    
    const { Customer } = require('../models');
    
    // Validaciones
    if (!nombre || !email || !password) {
      req.flash('error_msg', 'Nombre, email y contraseña son obligatorios');
      return res.redirect('/registro-cliente');
    }
    
    if (password.length < 6) {
      req.flash('error_msg', 'La contraseña debe tener al menos 6 caracteres');
      return res.redirect('/registro-cliente');
    }
    
    // Verificar si ya existe
    const existingCustomer = await Customer.findOne({ where: { email } });
    if (existingCustomer) {
      req.flash('error_msg', 'Este email ya está registrado');
      return res.redirect('/registro-cliente');
    }
    
    // Crear cliente
    const customer = await Customer.create({
      nombre,
      email,
      telefono: telefono || null,
      direccion: direccion || null,
      ciudad: ciudad || null,
      codigo_postal: codigo_postal || null,
      password_hash: password,
      activo: true,
      verificado: false
    });
    
    // Auto-login
    req.session.customerId = customer.id;
    req.session.customer = {
      id: customer.id,
      nombre: customer.nombre,
      email: customer.email,
      telefono: customer.telefono,
      direccion: customer.direccion,
      ciudad: customer.ciudad
    };
    
    console.log(`? Nuevo cliente registrado: ${customer.email}`);
    req.flash('success_msg', `¡Bienvenido ${customer.nombre}! Tu cuenta ha sido creada.`);
    res.redirect('/mi-cuenta');
    
  } catch (error) {
    console.error('Error registro cliente:', error);
    req.flash('error_msg', 'Error en el registro');
    res.redirect('/registro-cliente');
  }
};