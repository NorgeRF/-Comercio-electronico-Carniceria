const bcrypt = require('bcrypt');
const { User } = require('../models');

// Verificar si necesita setup
exports.checkSetupRequired = async (req, res, next) => {
  try {
    console.log('?? Verificando setup required...');
    console.log('?? Ruta actual:', req.path);
    
    const userCount = await User.count();
    console.log(`?? Total usuarios en DB: ${userCount}`);
    
    // Si no hay usuarios, redirigir al setup
    if (userCount === 0 && req.path !== '/setup') {
      console.log('?? Redirigiendo a /admin/setup');
      return res.redirect('/admin/setup');
    }
    
    console.log('? Setup no requerido');
    next();
  } catch (error) {
    console.error('? Error verificando setup:', error);
    console.error('?? Stack:', error.stack);
    next();
  }
};

// Mostrar formulario de setup
exports.showSetupForm = (req, res) => {
  console.log('?? Mostrando formulario setup');
  res.render('admin/setup', {
    title: 'Configuración Inicial - Administración',
    error_msg: req.flash('error_msg'),
    success_msg: req.flash('success_msg')
  });
};

// Procesar setup
exports.processSetup = async (req, res) => {
  const { nombre, email, password, confirm_password } = req.body;
  
  console.log('?? Procesando setup...');
  console.log('?? Datos:', { nombre, email });
  
  try {
    // Validaciones
    if (!nombre || !email || !password || !confirm_password) {
      req.flash('error_msg', 'Todos los campos son obligatorios');
      return res.redirect('/admin/setup');
    }
    
    if (password !== confirm_password) {
      req.flash('error_msg', 'Las contraseñas no coinciden');
      return res.redirect('/admin/setup');
    }
    
    if (password.length < 6) {
      req.flash('error_msg', 'La contraseña debe tener al menos 6 caracteres');
      return res.redirect('/admin/setup');
    }
    
    // Verificar si ya hay usuarios
    const existingUsers = await User.count();
    console.log(`?? Usuarios existentes: ${existingUsers}`);
    
    if (existingUsers > 0) {
      req.flash('error_msg', 'El setup ya fue realizado anteriormente');
      return res.redirect('/admin/login');
    }
    
    // Crear usuario admin
    console.log('?? Creando usuario admin...');
    await User.create({
      nombre: nombre,
      email: email,
      password_hash: password, // El hook lo hashea
      rol: 'admin',
      activo: true,
      verificado: true
    });
    
    console.log(`? Usuario admin creado: ${email}`);
    
    req.flash('success_msg', 'Usuario administrador creado exitosamente. Ahora puedes iniciar sesión.');
    res.redirect('/admin/login');
    
  } catch (error) {
    console.error('? Error en setup:', error.message);
    console.error('?? Stack:', error.stack);
    req.flash('error_msg', `Error al crear usuario: ${error.message}`);
    res.redirect('/admin/setup');
  }
};