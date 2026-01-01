// Middleware para requerir autenticacion
exports.requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    res.locals.user = req.session.user;
    return next();
  }
  
  req.flash('error_msg', 'Por favor, inicia sesion para continuar');
  res.redirect('/admin/login');
};

// Middleware para redirigir si ya esta autenticado
exports.redirectIfAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect('/admin');
  }
  next();
};

// Middleware para verificar rol de administrador
exports.requireAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.rol === 'admin') {
    return next();
  }
  
  req.flash('error_msg', 'No tienes permisos de administrador para acceder a esta seccion');
  res.redirect('/admin');
};
