const bcrypt = require('bcrypt');
const { User } = require('../models');

exports.showLogin = (req, res) => {
  res.render('admin/login', {
    title: 'Iniciar Sesion - Administracion',
    error_msg: req.flash('error_msg'),
    success_msg: req.flash('success_msg')
  });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  
  console.log('=== INICIO DE LOGIN ===');
  console.log('Email recibido:', email);
  
  try {
    // Buscar usuario
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      console.log('Usuario no encontrado');
      req.flash('error_msg', 'Credenciales incorrectas');
      return res.redirect('/admin/login');
    }
    
    console.log('Usuario encontrado:', user.nombre);
    console.log('Rol:', user.rol);
    console.log('Activo:', user.activo);
    
    if (!user.activo) {
      console.log('Usuario inactivo');
      req.flash('error_msg', 'Esta cuenta esta desactivada');
      return res.redirect('/admin/login');
    }
    
    // Verificar contrasena con bcrypt
    console.log('Verificando contrasena...');
    console.log('Hash en DB (primeros 30 chars):', user.password_hash.substring(0, 30));
    
    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log('Resultado bcrypt.compare:', isMatch);
    
    if (!isMatch) {
      console.log('Contrasena incorrecta');
      await user.increment('intentos_fallidos');
      
      if (user.intentos_fallidos >= 5) {
        await user.update({ bloqueado_hasta: new Date(Date.now() + 30 * 60 * 1000) });
        req.flash('error_msg', 'Cuenta bloqueada por 30 minutos. Demasiados intentos fallidos.');
      } else {
        req.flash('error_msg', 'Contrasena incorrecta');
      }
      
      return res.redirect('/admin/login');
    }
    
    // Si la contrasena es correcta
    console.log('Contrasena correcta - Creando sesion');
    
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol
    };
    
    await user.update({ 
      intentos_fallidos: 0,
      ultimo_acceso: new Date(),
      bloqueado_hasta: null 
    });
    
    console.log('Sesion creada para:', user.nombre);
    req.flash('success_msg', `Bienvenido ${user.nombre}`);
    return res.redirect('/admin');
    
  } catch (error) {
    console.error('Error en login:', error);
    req.flash('error_msg', 'Error del servidor');
    return res.redirect('/admin/login');
  }
};

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error al cerrar sesion:', err);
    }
    res.redirect('/admin/login');
  });
};

// ============================================
// FUNCIONES ADICIONALES PARA PERFIL
// ============================================

/**
 * Mostrar perfil de usuario
 * @param {object} req - Request de Express
 * @param {object} res - Response de Express
 */
exports.showProfile = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!user) {
      req.flash('error_msg', 'Usuario no encontrado');
      return res.redirect('/admin/login');
    }

    res.render('admin/profile', {
      title: 'Mi Perfil - Administracion',
      user: user,
      activeTab: req.query.tab || 'info',
      success_msg: req.flash('success_msg'),
      error_msg: req.flash('error_msg')
    });

  } catch (error) {
    console.error('Error en showProfile:', error.message);
    req.flash('error_msg', 'Error al cargar el perfil');
    res.redirect('/admin');
  }
};

/**
 * Actualizar informacion del perfil
 * @param {object} req - Request de Express
 * @param {object} res - Response de Express
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { nombre, email } = req.body;
    
    const user = await User.findByPk(userId);
    
    if (!user) {
      req.flash('error_msg', 'Usuario no encontrado');
      return res.redirect('/admin/login');
    }
    
    // Validar que el email no este en uso por otro usuario
    if (email !== user.email) {
      const existingUser = await User.findOne({ 
        where: { 
          email: email,
          id: { [Sequelize.Op.ne]: userId }
        }
      });
      
      if (existingUser) {
        req.flash('error_msg', 'El correo electronico ya esta en uso');
        return res.redirect('/admin/profile?tab=info');
      }
    }
    
    // Actualizar datos
    await user.update({
      nombre: nombre,
      email: email,
      updated_at: new Date()
    });
    
    // Actualizar sesion
    req.session.user = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol
    };
    
    req.flash('success_msg', 'Perfil actualizado correctamente');
    res.redirect('/admin/profile?tab=info');
    
  } catch (error) {
    console.error('Error en updateProfile:', error.message);
    req.flash('error_msg', 'Error al actualizar el perfil');
    res.redirect('/admin/profile?tab=info');
  }
};

/**
 * Cambiar contrasena del usuario
 * @param {object} req - Request de Express
 * @param {object} res - Response de Express
 */
exports.changePassword = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { current_password, new_password, confirm_password } = req.body;
    
    const user = await User.findByPk(userId);
    
    if (!user) {
      req.flash('error_msg', 'Usuario no encontrado');
      return res.redirect('/admin/login');
    }
    
    // Validaciones
    if (!current_password || !new_password || !confirm_password) {
      req.flash('error_msg', 'Todos los campos son obligatorios');
      return res.redirect('/admin/profile?tab=security');
    }
    
    if (new_password !== confirm_password) {
      req.flash('error_msg', 'Las nuevas contrasenas no coinciden');
      return res.redirect('/admin/profile?tab=security');
    }
    
    if (new_password.length < 6) {
      req.flash('error_msg', 'La nueva contrasena debe tener al menos 6 caracteres');
      return res.redirect('/admin/profile?tab=security');
    }
    
    // Verificar contrasena actual
    const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password_hash);
    
    if (!isCurrentPasswordValid) {
      req.flash('error_msg', 'La contrasena actual es incorrecta');
      return res.redirect('/admin/profile?tab=security');
    }
    
    // Generar nuevo hash
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(new_password, saltRounds);
    
    // Actualizar contrasena
    await user.update({
      password_hash: newPasswordHash,
      updated_at: new Date()
    });
    
    req.flash('success_msg', 'Contrasena cambiada correctamente');
    res.redirect('/admin/profile?tab=security');
    
  } catch (error) {
    console.error('Error en changePassword:', error.message);
    req.flash('error_msg', 'Error al cambiar la contrasena');
    res.redirect('/admin/profile?tab=security');
  }
};

/**
 * Listar todos los usuarios (solo para administradores)
 * @param {object} req - Request de Express
 * @param {object} res - Response de Express
 */
exports.listUsers = async (req, res) => {
  try {
    // Solo administradores pueden ver la lista de usuarios
    if (req.session.user.rol !== 'admin') {
      req.flash('error_msg', 'No tienes permisos para acceder a esta seccion');
      return res.redirect('/admin');
    }
    
    const users = await User.findAll({
      attributes: ['id', 'nombre', 'email', 'rol', 'activo', 'ultimo_acceso', 'created_at'],
      order: [['created_at', 'DESC']]
    });
    
    res.render('admin/users', {
      title: 'Gestion de Usuarios - Administracion',
      users: users,
      success_msg: req.flash('success_msg'),
      error_msg: req.flash('error_msg')
    });
    
  } catch (error) {
    console.error('Error en listUsers:', error.message);
    req.flash('error_msg', 'Error al cargar la lista de usuarios');
    res.redirect('/admin');
  }
};

/**
 * Crear nuevo usuario (solo para administradores)
 * @param {object} req - Request de Express
 * @param {object} res - Response de Express
 */
exports.createUser = async (req, res) => {
  try {
    // Solo administradores pueden crear usuarios
    if (req.session.user.rol !== 'admin') {
      req.flash('error_msg', 'No tienes permisos para realizar esta accion');
      return res.redirect('/admin');
    }
    
    const { nombre, email, password, confirm_password, rol } = req.body;
    
    // Validaciones
    if (!nombre || !email || !password || !confirm_password || !rol) {
      req.flash('error_msg', 'Todos los campos son obligatorios');
      return res.redirect('/admin/users');
    }
    
    if (password !== confirm_password) {
      req.flash('error_msg', 'Las contrasenas no coinciden');
      return res.redirect('/admin/users');
    }
    
    if (password.length < 6) {
      req.flash('error_msg', 'La contrasena debe tener al menos 6 caracteres');
      return res.redirect('/admin/users');
    }
    
    // Verificar si el email ya existe
    const existingUser = await User.findOne({ where: { email } });
    
    if (existingUser) {
      req.flash('error_msg', 'El correo electronico ya esta registrado');
      return res.redirect('/admin/users');
    }
    
    // Generar hash de la contrasena
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    // Crear usuario
    await User.create({
      nombre,
      email,
      password_hash,
      rol,
      activo: 1
    });
    
    req.flash('success_msg', 'Usuario creado correctamente');
    res.redirect('/admin/users');
    
  } catch (error) {
    console.error('Error en createUser:', error.message);
    req.flash('error_msg', 'Error al crear el usuario');
    res.redirect('/admin/users');
  }
};

/**
 * Cambiar estado de usuario (activar/desactivar)
 * @param {object} req - Request de Express
 * @param {object} res - Response de Express
 */
exports.toggleUserStatus = async (req, res) => {
  try {
    // Solo administradores pueden cambiar el estado de usuarios
    if (req.session.user.rol !== 'admin') {
      req.flash('error_msg', 'No tienes permisos para realizar esta accion');
      return res.redirect('/admin');
    }
    
    const { id } = req.params;
    const user = await User.findByPk(id);
    
    if (!user) {
      req.flash('error_msg', 'Usuario no encontrado');
      return res.redirect('/admin/users');
    }
    
    // No permitir desactivarse a si mismo
    if (user.id === req.session.userId) {
      req.flash('error_msg', 'No puedes desactivar tu propia cuenta');
      return res.redirect('/admin/users');
    }
    
    // Cambiar estado
    const newStatus = !user.activo;
    await user.update({ activo: newStatus });
    
    req.flash('success_msg', `Usuario ${newStatus ? 'activado' : 'desactivado'} correctamente`);
    res.redirect('/admin/users');
    
  } catch (error) {
    console.error('Error en toggleUserStatus:', error.message);
    req.flash('error_msg', 'Error al cambiar el estado del usuario');
    res.redirect('/admin/users');
  }
};

/**
 * Eliminar usuario (solo para administradores)
 * @param {object} req - Request de Express
 * @param {object} res - Response de Express
 */
exports.deleteUser = async (req, res) => {
  try {
    // Solo administradores pueden eliminar usuarios
    if (req.session.user.rol !== 'admin') {
      req.flash('error_msg', 'No tienes permisos para realizar esta accion');
      return res.redirect('/admin');
    }
    
    const { id } = req.params;
    const user = await User.findByPk(id);
    
    if (!user) {
      req.flash('error_msg', 'Usuario no encontrado');
      return res.redirect('/admin/users');
    }
    
    // No permitir eliminarse a si mismo
    if (user.id === req.session.userId) {
      req.flash('error_msg', 'No puedes eliminar tu propia cuenta');
      return res.redirect('/admin/users');
    }
    
    // Eliminar usuario
    await user.destroy();
    
    req.flash('success_msg', 'Usuario eliminado correctamente');
    res.redirect('/admin/users');
    
  } catch (error) {
    console.error('Error en deleteUser:', error.message);
    req.flash('error_msg', 'Error al eliminar el usuario');
    res.redirect('/admin/users');
  }
};
