const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const flash = require('connect-flash');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// 1. MIDDLEWARE BÁSICO
// ============================================
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ============================================
// 2. SESSION (MemoryStore para MySQL/MariaDB)
// ============================================
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'carniceria_secret_123456789',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
  },
  store: new session.MemoryStore()
};

app.use(session(sessionConfig));
app.use(flash());

// ============================================
// 3. MOTOR DE PLANTILLAS Y HELPERS EJS
// ============================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ============================================
// HELPERS PARA EJS (TODOS LOS NECESARIOS)
// ============================================

// 1. Iconos para productos
app.locals.getProductIcon = function(categoria) {
    const iconMap = {
        'vacuno': 'cow',
        'cerdo': 'pig',
        'pollo': 'drumstick-bite',
        'cordero': 'sheep',
        'elaborados': 'bacon',
        'embutidos': 'bacon',
        'quesos': 'cheese',
        'mariscos': 'fish',
        'pescado': 'fish',
        'aves': 'dove',
        'huevos': 'egg',
        'lacteos': 'cheese',
        'panaderia': 'bread-slice',
        'frutas': 'apple-alt',
        'verduras': 'carrot',
        'bebidas': 'wine-bottle',
        'congelados': 'snowflake',
        'otros': 'shopping-basket',
        'default': 'shopping-basket'
    };
    
    return iconMap[categoria?.toLowerCase()] || iconMap.default;
};

// 2. Clases para stock
app.locals.getStockClass = function(stock) {
    if (stock === undefined || stock === null) return 'stock-unknown';
    if (stock === 0) return 'stock-empty';
    if (stock < 10) return 'stock-low';
    if (stock < 50) return 'stock-medium';
    return 'stock-high';
};

// 3. Texto para stock
app.locals.getStockText = function(stock) {
    if (stock === undefined || stock === null) return 'Stock desconocido';
    if (stock === 0) return 'Agotado';
    if (stock < 10) return `Bajo (${stock})`;
    if (stock < 50) return `Disponible (${stock})`;
    return `En stock (${stock})`;
};

// 4. Formatear precios
app.locals.formatPrice = function(price) {
    if (!price) return '€0.00';
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2
    }).format(price);
};

// 5. Formatear fecha
app.locals.formatDate = function(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

// 6. Formatear fecha y hora
app.locals.formatDateTime = function(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// 7. Truncar texto largo
app.locals.truncateText = function(text, maxLength = 100) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

// 8. Clases para estado de pedidos
app.locals.getOrderStatusClass = function(status) {
    const statusMap = {
        'pendiente': 'status-pending',
        'confirmado': 'status-confirmed',
        'preparando': 'status-preparing',
        'enviado': 'status-shipped',
        'entregado': 'status-delivered',
        'cancelado': 'status-cancelled',
        'pendiente_pago': 'status-payment-pending'
    };
    return statusMap[status] || 'status-unknown';
};

// 9. Texto para estado de pedidos
app.locals.getOrderStatusText = function(status) {
    const statusMap = {
        'pendiente': 'Pendiente',
        'confirmado': 'Confirmado',
        'preparando': 'En preparación',
        'enviado': 'Enviado',
        'entregado': 'Entregado',
        'cancelado': 'Cancelado',
        'pendiente_pago': 'Pendiente de pago'
    };
    return statusMap[status] || 'Desconocido';
};

// 10. Generar estrellas de rating
app.locals.generateStars = function(rating) {
    if (!rating) rating = 0;
    let stars = '';
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
        if (i <= fullStars) {
            stars += '<i class="fas fa-star"></i>';
        } else if (i === fullStars + 1 && halfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }
    return stars;
};

// 11. Colores para categorías
app.locals.getCategoryColor = function(categoria) {
    const colorMap = {
        'vacuno': '#dc3545',
        'cerdo': '#e83e8c',
        'pollo': '#ffc107',
        'cordero': '#fd7e14',
        'elaborados': '#20c997',
        'embutidos': '#6f42c1',
        'quesos': '#17a2b8',
        'mariscos': '#007bff',
        'pescado': '#28a745',
        'default': '#6c757d'
    };
    return colorMap[categoria?.toLowerCase()] || colorMap.default;
};

// 12. Badges para categorías
app.locals.getCategoryBadge = function(categoria) {
    const badgeMap = {
        'vacuno': 'vacuno',
        'cerdo': 'cerdo',
        'pollo': 'pollo',
        'cordero': 'cordero',
        'elaborados': 'elaborados',
        'embutidos': 'embutidos',
        'quesos': 'quesos',
        'mariscos': 'mariscos',
        'pescado': 'pescado',
        'default': 'otros'
    };
    return badgeMap[categoria?.toLowerCase()] || badgeMap.default;
};

// 13. Mostrar unidad de medida
app.locals.getUnitDisplay = function(unidad) {
    const unitMap = {
        'kg': 'kg',
        'gr': 'g',
        'unidad': 'unidad',
        'paquete': 'paquete',
        'docena': 'docena',
        'litro': 'L',
        'default': 'unidad'
    };
    return unitMap[unidad?.toLowerCase()] || unitMap.default;
};

// 14. Calcular total de carrito
app.locals.calculateCartTotal = function(items) {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((total, item) => {
        return total + (item.precio * (item.cantidad || 1));
    }, 0);
};

// 15. Verificar si es administrador
app.locals.isAdmin = function(user) {
    return user && user.rol === 'admin';
};

// 16. Verificar si está autenticado
app.locals.isAuthenticated = function(req) {
    return req.session && req.session.userId;
};

// 17. Formatear número de teléfono
app.locals.formatPhone = function(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 9) {
        return `+34 ${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
    }
    return phone;
};

// 18. Obtener iniciales para avatar
app.locals.getInitials = function(name) {
    if (!name) return '?';
    return name
        .split(' ')
        .map(part => part.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2);
};

// 19. Generar enlace de WhatsApp
app.locals.whatsappLink = function(phone, message = '') {
    if (!phone) return '#';
    const cleanPhone = phone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
};

// 20. Helper para Bizum
app.locals.formatBizumPhone = function(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 9) {
        return `+34 ${cleaned}`;
    }
    return phone;
};

// 21. Helper para verificar si Bizum está habilitado
app.locals.isBizumEnabled = function() {
    return process.env.BIZUM_ENABLED === 'true' || process.env.NODE_ENV === 'development';
};

// 22. Helper para formatear fecha extensa
app.locals.formatFullDate = function(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

// ============================================
// 4. MIDDLEWARE PARA VARIABLES GLOBALES
// ============================================
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.whatsapp_number = process.env.WHATSAPP_NUMBER || '+34600000000';
  res.locals.currentYear = new Date().getFullYear();
  res.locals.stripePublicKey = process.env.STRIPE_PUBLIC_KEY || '';
  
  // Variables para Bizum
  res.locals.bizumEnabled = process.env.BIZUM_ENABLED === 'true' || process.env.NODE_ENV === 'development';
  res.locals.bizumInstructions = "Paga directamente desde tu móvil con Bizum. Necesitas tener la app instalada y configurada.";
  
  res.locals.dbConnected = false;
  res.locals.req = req;
  res.locals.user = req.session?.user || null;
  
  // NUEVO: Variable para cliente logueado en frontend
  res.locals.customer = req.session?.customer || null;
  
  next();
});

// ============================================
// 5. HEALTH CHECK
// ============================================
app.get('/health', async (req, res) => {
  const health = {
    status: 'OK',
    service: 'Carnicería Tenerife',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {}
  };
  
  try {
    const { sequelize } = require('./config/database');
    await sequelize.authenticate();
    health.checks.database = 'OK';
    health.dbConnected = true;
  } catch (error) {
    health.checks.database = 'ERROR: ' + error.message;
    health.dbConnected = false;
  }
  
  res.status(200).json(health);
});

// ============================================
// 6. CONEXIÓN A MYSQL/MARIADB
// ============================================
let dbConnected = false;
let Product, Order, User, Category, OrderItem, Customer;
let retryCount = 0;
const MAX_RETRIES = 10;

// Función principal de inicialización
async function initializeDatabase() {
  try {
    console.log(`🔧 Intento ${retryCount + 1}/${MAX_RETRIES}: Conectando a MySQL/MariaDB...`);
    
    if (retryCount > 0) {
      const waitTime = retryCount * 2000;
      console.log(`⏱️ Esperando ${waitTime/1000} segundos...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Importar y verificar base de datos
    const { sequelize } = require('./config/database');
    await sequelize.authenticate();
    console.log('✅ Conexión básica establecida');
    
    // Verificar tablas principales
    const [results] = await sequelize.query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name IN ('usuarios', 'productos', 'pedidos', 'clientes')
    `);
    
    const tableCount = results[0].table_count;
    console.log(`📊 Tablas principales encontradas: ${tableCount}/4`);
    
    if (tableCount < 2) {
      throw new Error('Base de datos no está lista aún');
    }
    
    // Inicializar modelos
    console.log('🔧 Importando modelos...');
    const models = require('./models');
    Product = models.Product;
    Order = models.Order;
    User = models.User;
    Category = models.Category;
    OrderItem = models.OrderItem;
    Customer = models.Customer; // Modelo de clientes
    
    // Configurar relaciones
    if (models.setupAssociations) {
      models.setupAssociations();
      console.log('✅ Relaciones configuradas');
    }
    
    // Verificar datos existentes
    console.log('🔍 Verificando datos existentes...');
    const [users] = await sequelize.query('SELECT COUNT(*) as count FROM usuarios');
    const [products] = await sequelize.query('SELECT COUNT(*) as count FROM productos');
    const [categories] = await sequelize.query('SELECT COUNT(*) as count FROM categorias');
    const [customers] = await sequelize.query('SELECT COUNT(*) as count FROM clientes');
    
    const userCount = users[0].count;
    const productCount = products[0].count;
    const categoryCount = categories[0].count;
    const customerCount = customers[0].count;
    
    // Marcar como conectado
    dbConnected = true;
    app.locals.dbConnected = true;
    retryCount = 0;
    
    console.log('='.repeat(60));
    console.log('🎉 BASE DE DATOS CONECTADA EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log(`📈 Resumen:`);
    console.log(`   👤 Usuarios: ${userCount}`);
    console.log(`   🍖 Productos: ${productCount}`);
    console.log(`   🏷️  Categorías: ${categoryCount}`);
    console.log(`   🛒 Clientes: ${customerCount}`);
    console.log('='.repeat(60));
    
    if (userCount === 0) {
      console.log('⚠️ SETUP REQUERIDO:');
      console.log('   Accede a /admin para crear el primer usuario administrador');
    } else {
      console.log('🚀 El sistema está listo para usar');
    }
    console.log('='.repeat(60));
    
    return true;
    
  } catch (error) {
    retryCount++;
    
    if (retryCount >= MAX_RETRIES) {
      console.error(`❌ Máximo de intentos alcanzado (${MAX_RETRIES})`);
      console.error('🔥 Posibles soluciones:');
      console.error('   1. Verifica que MySQL/MariaDB esté corriendo');
      console.error('   2. Verifica las credenciales en config/database.js');
      console.error('   3. Verifica que el puerto 3306 esté accesible');
      
      dbConnected = false;
      app.locals.dbConnected = false;
      return false;
    }
    
    console.error(`❌ Error en intento ${retryCount}: ${error.message}`);
    console.log(`⏱️ Reintentando en 5 segundos... (${retryCount}/${MAX_RETRIES})`);
    
    setTimeout(initializeDatabase, 5000);
    return false;
  }
}

// ============================================
// 7. MIDDLEWARE PARA ESTADO DE DB
// ============================================
app.use((req, res, next) => {
  res.locals.dbConnected = dbConnected;
  next();
});

// ============================================
// 8. SETUP WIZARD
// ============================================
const setupController = require('./controllers/setupController');

// Middleware para verificar si necesita setup
app.use('/admin', setupController.checkSetupRequired);

// Ruta de setup
app.get('/admin/setup', setupController.showSetupForm);
app.post('/admin/setup', setupController.processSetup);

// ============================================
// 9. RUTAS PRINCIPALES DEL FRONTEND
// ============================================
app.get('/', async (req, res) => {
  try {
    if (dbConnected && Product) {
      const featuredProducts = await Product.findAll({
        where: { destacado: true, activo: true },
        limit: 6
      });
      
      return res.render('index', { 
        title: 'Carnicería Tenerife - Productos Cárnicos de Calidad',
        whatsapp_number: process.env.WHATSAPP_NUMBER,
        products: featuredProducts,
        dbConnected: true,
        current: 'home'
      });
    }
  } catch (error) {
    console.error('Error cargando productos de DB:', error.message);
  }
  
  // Fallback a datos de ejemplo
  const featuredProducts = [
    {
      id: 1,
      nombre: 'Lomo de Vacuno Premium',
      descripcion: 'Corte premium de ternera gallega',
      precio: 29.99,
      categoria: 'vacuno',
      unidad: 'kg',
      destacado: true,
      stock: 50
    },
    {
      id: 2,
      nombre: 'Chuletas de Cerdo Ibérico',
      descripcion: 'Chuletas de cerdo de bellota',
      precio: 15.99,
      categoria: 'cerdo',
      unidad: 'kg',
      destacado: true,
      stock: 100
    },
    {
      id: 3,
      nombre: 'Pollo de Corral Entero',
      descripcion: 'Pollo criado en libertad',
      precio: 9.99,
      categoria: 'pollo',
      unidad: 'kg',
      destacado: true,
      stock: 75
    },
    {
      id: 4,
      nombre: 'Hamburguesas Artesanas',
      descripcion: 'Hamburguesas 100% carne de vacuno',
      precio: 16.50,
      categoria: 'elaborados',
      unidad: 'kg',
      destacado: true,
      stock: 200
    }
  ];
  
  res.render('index', { 
    title: 'Carnicería Tenerife - Productos Cárnicos de Calidad',
    whatsapp_number: process.env.WHATSAPP_NUMBER,
    products: featuredProducts,
    dbConnected: false,
    current: 'home'
  });
});

// Ruta para productos
app.get('/productos', async (req, res) => {
  try {
    if (dbConnected && Product) {
      const products = await Product.findAll({
        where: { activo: true },
        order: [['categoria', 'ASC'], ['nombre', 'ASC']]
      });
      
      return res.render('products', { 
        title: 'Nuestros Productos - Carnicería Tenerife',
        products: products,
        dbConnected: true,
        current: 'products'
      });
    }
  } catch (error) {
    console.error('Error cargando productos:', error.message);
  }
  
  // Fallback a datos de ejemplo
  const products = [
    {
      id: 1,
      nombre: 'Lomo de Vacuno Premium',
      descripcion: 'Corte premium de ternera gallega',
      precio: 29.99,
      categoria: 'vacuno',
      unidad: 'kg',
      destacado: true,
      stock: 50
    }
  ];
  
  res.render('products', { 
    title: 'Nuestros Productos - Carnicería Tenerife',
    products: products,
    dbConnected: false,
    current: 'products'
  });
});

// Ruta para pedidos
app.get('/pedidos', (req, res) => {
  res.render('orders', { 
    title: 'Realizar Pedido - Carnicería Tenerife',
    whatsapp_number: process.env.WHATSAPP_NUMBER,
    current: 'orders'
  });
});

// Ruta para contacto
app.get('/contacto', (req, res) => {
  res.render('contact', { 
    title: 'Contacto - Carnicería Tenerife',
    whatsapp_number: process.env.WHATSAPP_NUMBER,
    current: 'contact'
  });
});

// Ruta para pagos
app.get('/pago', (req, res) => {
  res.render('payment', { 
    title: 'Pago Seguro - Carnicería Tenerife',
    stripePublicKey: process.env.STRIPE_PUBLIC_KEY || 'pk_test_dummy',
    bizumEnabled: process.env.BIZUM_ENABLED === 'true' || process.env.NODE_ENV === 'development',
    whatsapp_number: process.env.WHATSAPP_NUMBER
  });
});

// ============================================
// IMPORTAR CONTROLADORES
// ============================================
const adminAuthController = require('./controllers/adminAuthController');
const adminProductController = require('./controllers/adminProductController');
const adminOrderController = require('./controllers/adminOrderController');
const adminCustomerController = require('./controllers/adminCustomerController');
const customerAuthController = require('./controllers/customerAuthController');
const sessionAuth = require('./middleware/sessionAuth');
const upload = require('./middleware/upload');

// ============================================
// RUTAS PARA CLIENTES (REGISTRO/LOGIN)
// ============================================

// Página de registro cliente
app.get('/registro-cliente', (req, res) => {
    if (req.session.customerId) {
        return res.redirect('/mi-cuenta');
    }
    
    res.render('customer/register', {
        title: 'Registro Cliente - Carnicería Tenerife',
        error_msg: req.flash('error_msg'),
        success_msg: req.flash('success_msg'),
        whatsapp_number: process.env.WHATSAPP_NUMBER
    });
});

// API Registro cliente
app.post('/api/clientes/registro', async (req, res) => {
    try {
        const { nombre, email, password, telefono, direccion, ciudad, codigo_postal } = req.body;
        
        // Validaciones
        if (!nombre || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Nombre, email y contraseña son obligatorios' 
            });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'La contraseña debe tener al menos 6 caracteres' 
            });
        }
        
        // Verificar si ya existe
        const existingCustomer = await Customer.findOne({ where: { email } });
        if (existingCustomer) {
            return res.status(400).json({ 
                success: false, 
                message: 'Este email ya está registrado' 
            });
        }
        
        // Crear cliente
        const cliente = await Customer.create({
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
        req.session.customerId = cliente.id;
        req.session.customer = {
            id: cliente.id,
            nombre: cliente.nombre,
            email: cliente.email,
            telefono: cliente.telefono,
            direccion: cliente.direccion,
            ciudad: cliente.ciudad
        };
        
        res.json({
            success: true,
            message: 'Registro exitoso',
            cliente: {
                id: cliente.id,
                nombre: cliente.nombre,
                email: cliente.email
            }
        });
        
    } catch (error) {
        console.error('❌ Error registro cliente:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error en el registro' 
        });
    }
});

// API Login cliente
app.post('/api/clientes/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const cliente = await Customer.findOne({ where: { email } });
        
        if (!cliente) {
            return res.status(401).json({ 
                success: false, 
                message: 'Email o contraseña incorrectos' 
            });
        }
        
        if (!cliente.activo) {
            return res.status(403).json({ 
                success: false, 
                message: 'Cuenta desactivada. Contacta con soporte.' 
            });
        }
        
        if (!cliente.password_hash) {
            return res.status(403).json({ 
                success: false, 
                message: 'Debes crear una contraseña primero' 
            });
        }
        
        const isValid = await cliente.verifyPassword(password);
        if (!isValid) {
            return res.status(401).json({ 
                success: false, 
                message: 'Email o contraseña incorrectos' 
            });
        }
        
        // Crear sesión
        req.session.customerId = cliente.id;
        req.session.customer = {
            id: cliente.id,
            nombre: cliente.nombre,
            email: cliente.email,
            telefono: cliente.telefono,
            direccion: cliente.direccion,
            ciudad: cliente.ciudad
        };
        
        // Actualizar último acceso
        cliente.ultimo_acceso = new Date();
        await cliente.save();
        
        res.json({
            success: true,
            message: 'Login exitoso',
            cliente: {
                id: cliente.id,
                nombre: cliente.nombre,
                email: cliente.email
            }
        });
        
    } catch (error) {
        console.error('❌ Error login cliente:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error en el login' 
        });
    }
});

// API Logout cliente
app.post('/api/clientes/logout', (req, res) => {
    req.session.customerId = null;
    req.session.customer = null;
    res.json({
        success: true,
        message: 'Sesión cerrada'
    });
});

// ============================================
// RUTA PARA CREAR PEDIDOS (CON AUTENTICACIÓN)
// ============================================

// Crear nuevo pedido desde la tienda online
app.post('/api/orders', async (req, res) => {
  try {
    console.log('🛒 Recibiendo nuevo pedido...');
    
    const { 
      productos,
      total,
      metodo_pago,
      notas,
      fecha_entrega,
      hora_entrega
    } = req.body;
    
    // ============================================
    // VALIDACIÓN: DEBE ESTAR AUTENTICADO
    // ============================================
    if (!req.session.customerId || !req.session.customer) {
      return res.status(401).json({
        success: false,
        message: 'Debes iniciar sesión para realizar un pedido'
      });
    }
    
    // Obtener datos del cliente autenticado
    const cliente = req.session.customer;
    
    // Validaciones adicionales
    if (!cliente.nombre || !cliente.telefono || !cliente.direccion || !cliente.ciudad) {
      return res.status(400).json({
        success: false,
        message: 'Completa tu perfil (dirección, teléfono) antes de pedir'
      });
    }
    
    if (!productos || !Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El carrito está vacío'
      });
    }
    
    const { Order, OrderItem, Product, sequelize } = require('./models');
    const { Op } = require('sequelize');
    
    // Generar código de pedido único
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const ultimoPedido = await Order.findOne({
      where: {
        codigo_pedido: {
          [Op.like]: `PED-${fecha}-%`
        }
      },
      order: [['created_at', 'DESC']]
    });
    
    let secuencia = 1;
    if (ultimoPedido) {
      const ultimoCodigo = ultimoPedido.codigo_pedido;
      const ultimaSecuencia = parseInt(ultimoCodigo.split('-')[2]) || 0;
      secuencia = ultimaSecuencia + 1;
    }
    
    const codigo_pedido = `PED-${fecha}-${secuencia.toString().padStart(4, '0')}`;
    
    // Si es pago con Bizum, el estado inicial es pendiente_pago
    const estadoInicial = metodo_pago === 'bizum' ? 'pendiente_pago' : 'pendiente';
    
    // ============================================
    // CREAR PEDIDO CON CLIENTE AUTENTICADO
    // ============================================
    const nuevoPedido = await Order.create({
      codigo_pedido,
      cliente_nombre: cliente.nombre,
      cliente_telefono: cliente.telefono,
      cliente_email: cliente.email,
      cliente_direccion: cliente.direccion,
      cliente_ciudad: cliente.ciudad,
      cliente_codigo_postal: cliente.codigo_postal || null,
      total: parseFloat(total) || 0,
      estado: estadoInicial,
      metodo_pago: metodo_pago || 'efectivo',
      notas: notas || null,
      fecha_entrega: fecha_entrega || null,
      hora_entrega: hora_entrega || null,
      whatsapp_enviado: false,
      
      // RELACIÓN CORRECTA: cliente_id apunta a tabla clientes
      cliente_id: req.session.customerId,
      
      payment_id: null,
      payment_status: null,
      telefono_bizum: null,
      pagado: false
    });
    
    console.log(`✅ Pedido creado: ${codigo_pedido} para cliente ${cliente.email}`);
    
    // Crear los items del pedido
    const itemsCreados = [];
    
    for (const producto of productos) {
      const { id, cantidad, precio, notas: notas_item } = producto;
      
      const productoDB = await Product.findByPk(id);
      
      if (!productoDB) {
        console.warn(`⚠️ Producto ID ${id} no encontrado, omitiendo...`);
        continue;
      }
      
      // Verificar stock
      if (productoDB.stock !== null && productoDB.stock < cantidad) {
        console.warn(`⚠️ Stock insuficiente para ${productoDB.nombre}`);
      }
      
      const item = await OrderItem.create({
        pedido_id: nuevoPedido.id,
        producto_id: id,
        cantidad: parseFloat(cantidad) || 1,
        precio_unitario: parseFloat(precio) || productoDB.precio,
        subtotal: (parseFloat(cantidad) || 1) * (parseFloat(precio) || productoDB.precio),
        notas: notas_item || null
      });
      
      itemsCreados.push(item);
    }
    
    // Actualizar estadísticas del cliente
    try {
      const customer = await Customer.findByPk(req.session.customerId);
      if (customer) {
        await customer.updateStats(parseFloat(total) || 0);
      }
    } catch (statsError) {
      console.warn('⚠️ Error actualizando estadísticas:', statsError.message);
    }
    
    console.log(`✅ ${itemsCreados.length} items creados para pedido ${codigo_pedido}`);
    
    // Respuesta exitosa
    res.status(201).json({
      success: true,
      message: 'Pedido creado exitosamente',
      order: {
        id: nuevoPedido.id,
        codigo_pedido: nuevoPedido.codigo_pedido,
        total: nuevoPedido.total,
        estado: nuevoPedido.estado,
        metodo_pago: nuevoPedido.metodo_pago,
        created_at: nuevoPedido.created_at
      },
      items_count: itemsCreados.length
    });
    
  } catch (error) {
    console.error('❌ Error creando pedido:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar el pedido',
      error: error.message
    });
  }
});

// ============================================
// API PARA PEDIDOS ANÓNIMOS (MANTENER PARA COMPATIBILIDAD)
// ============================================
app.post('/api/pedidos-anonimos', async (req, res) => {
  try {
    console.log('🛒 Recibiendo pedido anónimo...');
    
    const { 
      cliente_nombre,
      cliente_telefono,
      cliente_email,
      cliente_direccion,
      cliente_ciudad,
      cliente_codigo_postal,
      productos,
      total,
      metodo_pago,
      notas,
      fecha_entrega,
      hora_entrega
    } = req.body;
    
    // Validaciones básicas
    if (!cliente_nombre || !cliente_telefono || !cliente_direccion || !cliente_ciudad) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos obligatorios del cliente'
      });
    }
    
    if (!productos || !Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El carrito está vacío'
      });
    }
    
    const { Order, OrderItem, Product, sequelize } = require('./models');
    const { Op } = require('sequelize');
    
    // Generar código de pedido único
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const ultimoPedido = await Order.findOne({
      where: {
        codigo_pedido: {
          [Op.like]: `PED-${fecha}-%`
        }
      },
      order: [['created_at', 'DESC']]
    });
    
    let secuencia = 1;
    if (ultimoPedido) {
      const ultimoCodigo = ultimoPedido.codigo_pedido;
      const ultimaSecuencia = parseInt(ultimoCodigo.split('-')[2]) || 0;
      secuencia = ultimaSecuencia + 1;
    }
    
    const codigo_pedido = `PED-${fecha}-${secuencia.toString().padStart(4, '0')}`;
    
    // Si es pago con Bizum, el estado inicial es pendiente_pago
    const estadoInicial = metodo_pago === 'bizum' ? 'pendiente_pago' : 'pendiente';
    
    // Crear cliente automático si tiene email
    let cliente_id = null;
    if (cliente_email) {
      try {
        const existingCustomer = await Customer.findOne({
          where: { email: cliente_email }
        });
        
        if (existingCustomer) {
          cliente_id = existingCustomer.id;
          console.log(`✅ Cliente encontrado: ${cliente_email}`);
          
          await existingCustomer.updateStats(total);
          
        } else {
          // Crear nuevo cliente
          const newCustomer = await Customer.create({
            nombre: cliente_nombre,
            email: cliente_email,
            telefono: cliente_telefono || null,
            direccion: cliente_direccion || null,
            ciudad: cliente_ciudad || null,
            codigo_postal: cliente_codigo_postal || null,
            password_hash: null,
            activo: true,
            verificado: false,
            total_compras: parseFloat(total || 0),
            cantidad_pedidos: 1
          });
          
          cliente_id = newCustomer.id;
          console.log(`✅ Cliente creado: ID ${cliente_id}`);
        }
      } catch (error) {
        console.error('⚠️ Error con cliente:', error.message);
      }
    }
    
    // Crear el pedido
    const nuevoPedido = await Order.create({
      codigo_pedido,
      cliente_nombre,
      cliente_telefono,
      cliente_email: cliente_email || null,
      cliente_direccion,
      cliente_ciudad,
      cliente_codigo_postal: cliente_codigo_postal || null,
      total: parseFloat(total) || 0,
      estado: estadoInicial,
      metodo_pago: metodo_pago || 'efectivo',
      notas: notas || null,
      fecha_entrega: fecha_entrega || null,
      hora_entrega: hora_entrega || null,
      whatsapp_enviado: false,
      cliente_id: cliente_id,
      usuario_id: null,
      payment_id: null,
      payment_status: null,
      telefono_bizum: null,
      pagado: false
    });
    
    console.log(`✅ Pedido anónimo creado: ${codigo_pedido}`);
    
    // Crear los items del pedido
    const itemsCreados = [];
    
    for (const producto of productos) {
      const { id, cantidad, precio, notas: notas_item } = producto;
      
      const productoDB = await Product.findByPk(id);
      
      if (!productoDB) {
        console.warn(`⚠️ Producto ID ${id} no encontrado, omitiendo...`);
        continue;
      }
      
      const item = await OrderItem.create({
        pedido_id: nuevoPedido.id,
        producto_id: id,
        cantidad: parseFloat(cantidad) || 1,
        precio_unitario: parseFloat(precio) || productoDB.precio,
        subtotal: (parseFloat(cantidad) || 1) * (parseFloat(precio) || productoDB.precio),
        notas: notas_item || null
      });
      
      itemsCreados.push(item);
    }
    
    console.log(`✅ ${itemsCreados.length} items creados para pedido ${codigo_pedido}`);
    
    // Respuesta exitosa
    res.status(201).json({
      success: true,
      message: 'Pedido creado exitosamente',
      order: {
        id: nuevoPedido.id,
        codigo_pedido: nuevoPedido.codigo_pedido,
        total: nuevoPedido.total,
        estado: nuevoPedido.estado,
        metodo_pago: nuevoPedido.metodo_pago,
        created_at: nuevoPedido.created_at
      },
      items_count: itemsCreados.length,
      customer_created: cliente_id ? true : false
    });
    
  } catch (error) {
    console.error('❌ Error creando pedido anónimo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar el pedido',
      error: error.message
    });
  }
});

// ============================================
// OTRAS RUTAS API
// ============================================
app.get('/api/test', (req, res) => {
  res.json({
    message: '✅ API funcionando',
    dbConnected: dbConnected,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/products', async (req, res) => {
  try {
    if (dbConnected && Product) {
      const products = await Product.findAll({
        where: { activo: true }
      });
      return res.json(products);
    }
  } catch (error) {
    console.error('Error API productos:', error.message);
  }
  
  res.json([
    {
      id: 1,
      nombre: 'Lomo de Vacuno Premium',
      precio: 29.99,
      categoria: 'vacuno',
      unidad: 'kg'
    }
  ]);
});

// Obtener productos para el frontend
app.get('/api/productos', async (req, res) => {
  try {
    const { destacados, categoria, search, limit } = req.query;
    
    const { Product } = require('./models');
    const { Op } = require('sequelize');
    const where = { activo: true };
    
    if (destacados === 'true') {
      where.destacado = true;
    }
    
    if (categoria) {
      where.categoria = categoria;
    }
    
    if (search) {
      where[Op.or] = [
        { nombre: { [Op.like]: `%${search}%` } },
        { descripcion: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const products = await Product.findAll({
      where,
      order: [['nombre', 'ASC']],
      limit: limit ? parseInt(limit) : 100
    });
    
    res.json({
      success: true,
      count: products.length,
      products: products.map(p => ({
        id: p.id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        precio: p.precio,
        categoria: p.categoria,
        unidad: p.unidad,
        imagen: p.imagen,
        destacado: p.destacado,
        stock: p.stock
      }))
    });
    
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener productos' 
    });
  }
});

// Obtener categorías
app.get('/api/categories', async (req, res) => {
  try {
    const { Product, sequelize } = require('./models');
    const { Op } = require('sequelize');
    
    const categories = await Product.findAll({
      attributes: [
        'categoria',
        [sequelize.fn('COUNT', sequelize.col('id')), 'product_count']
      ],
      where: { activo: true },
      group: ['categoria'],
      order: [['categoria', 'ASC']],
      raw: true
    });
    
    res.json({
      success: true,
      categories: categories.map(c => ({
        nombre: c.categoria,
        count: c.product_count
      }))
    });
    
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({ success: false, message: 'Error al obtener categorías' });
  }
});

// ============================================
// API PARA PAGOS
// ============================================

// Procesar pago con Stripe
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount, orderId, customerEmail } = req.body;
    
    // Aquí integrarías con Stripe
    // Por ahora devolvemos un mock
    res.json({
      success: true,
      clientSecret: 'pi_mock_secret_' + Date.now(),
      paymentIntentId: 'pi_mock_' + Date.now(),
      amount: amount,
      message: 'Modo de prueba - No se procesó pago real'
    });
    
  } catch (error) {
    console.error('Error en payment intent:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al procesar pago' 
    });
  }
});

// ============================================
// API PARA PAGOS BIZUM
// ============================================

// 1. Crear pago con Bizum
app.post('/api/bizum/create-payment', async (req, res) => {
  try {
    console.log('💰 Recibiendo solicitud de pago Bizum...');
    
    const { 
      orderId, 
      amount, 
      phone,
      customerName,
      customerEmail,
      orderCode 
    } = req.body;
    
    // Validaciones básicas
    if (!phone || !amount || !customerName) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos: teléfono, monto o nombre'
      });
    }
    
    // Validar formato de teléfono español
    const phoneRegex = /^[6-9]\d{8}$/;
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Teléfono inválido. Debe ser un móvil español de 9 dígitos (ej: 612345678)'
      });
    }
    
    // Validar monto
    const paymentAmount = parseFloat(amount);
    if (paymentAmount <= 0.5 || paymentAmount > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Monto inválido. Debe estar entre 0.50€ y 1000€'
      });
    }
    
    // Generar ID único para el pago
    const paymentId = `BIZ-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
    
    // Guardar en base de datos si está conectada
    if (dbConnected && Order) {
      try {
        // Buscar pedido por código o ID
        let order;
        if (orderCode) {
          order = await Order.findOne({ where: { codigo_pedido: orderCode } });
        } else if (orderId) {
          order = await Order.findByPk(orderId);
        }
        
        if (order) {
          await order.update({
            metodo_pago: 'bizum',
            telefono_bizum: cleanPhone,
            payment_id: paymentId,
            payment_status: 'pending_bizum',
            estado: 'pendiente_pago'
          });
          
          console.log(`✅ Pago Bizum asociado a pedido ${order.codigo_pedido}: ${paymentId}`);
        }
      } catch (dbError) {
        console.warn('⚠️ Error en base de datos:', dbError.message);
      }
    }
    
    // Simular respuesta de Bizum (modo desarrollo)
    const bizumResponse = {
      success: true,
      paymentId: paymentId,
      status: 'PENDING',
      message: 'Pago Bizum iniciado correctamente',
      instructions: '1. Abre la app Bizum en tu móvil\n2. Busca la notificación de pago\n3. Confirma la operación',
      phone: `+34${cleanPhone}`,
      amount: paymentAmount,
      orderCode: orderCode || `PED-BIZ-${Date.now().toString(36).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      testMode: true,
      nextStep: 'check_status',
      checkInterval: 5000
    };
    
    console.log(`✅ Pago Bizum simulado creado: ${paymentId} para ${cleanPhone}`);
    
    res.json(bizumResponse);
    
  } catch (error) {
    console.error('❌ Error en pago Bizum:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar pago Bizum',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Contacta con soporte'
    });
  }
});

// 2. Verificar estado de pago Bizum
app.get('/api/bizum/check-status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { simulate } = req.query;
    
    console.log(`💰 Verificando estado Bizum: ${paymentId}`);
    
    if (!paymentId || !paymentId.startsWith('BIZ-')) {
      return res.status(400).json({
        success: false,
        message: 'ID de pago Bizum inválido'
      });
    }
    
    // Lógica de simulación
    let status = 'PENDING';
    
    if (simulate) {
      status = simulate.toUpperCase();
    } else {
      // Simular cambio de estado basado en tiempo
      const idParts = paymentId.split('-');
      if (idParts.length >= 2) {
        const paymentTime = parseInt(idParts[1], 36);
        const elapsedSeconds = (Date.now() - paymentTime) / 1000;
        
        if (elapsedSeconds > 120) {
          status = 'EXPIRED';
        } else if (elapsedSeconds > 15) {
          status = Math.random() > 0.2 ? 'COMPLETED' : 'FAILED';
        }
      }
    }
    
    // Actualizar pedido si está completado
    if (status === 'COMPLETED' && dbConnected && Order) {
      try {
        const order = await Order.findOne({
          where: { 
            payment_id: paymentId,
            payment_status: 'pending_bizum'
          }
        });
        
        if (order) {
          await order.update({
            payment_status: 'completed',
            estado: 'confirmado',
            pagado: true,
            fecha_pago: new Date()
          });
          
          console.log(`💰 Pago Bizum COMPLETADO: ${paymentId} -> Pedido ${order.codigo_pedido}`);
        }
      } catch (dbError) {
        console.error('Error actualizando pedido:', dbError);
      }
    }
    
    const response = {
      success: true,
      paymentId: paymentId,
      status: status,
      checkedAt: new Date().toISOString(),
      message: getBizumStatusMessage(status),
      nextCheck: status === 'PENDING' ? 5000 : null
    };
    
    console.log(`✅ Estado Bizum ${paymentId}: ${status}`);
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Error verificando estado Bizum:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar estado',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Función auxiliar para mensajes de estado de Bizum
function getBizumStatusMessage(status) {
  const messages = {
    'PENDING': 'Esperando confirmación en tu móvil. Abre la app Bizum para completar el pago.',
    'COMPLETED': '¡Pago confirmado correctamente! Tu pedido está siendo procesado.',
    'FAILED': 'El pago ha sido rechazado. Por favor, intenta con otro método.',
    'EXPIRED': 'El tiempo para completar el pago ha expirado. Por favor, inicia un nuevo pago.',
    'CANCELLED': 'Pago cancelado por el usuario.',
    'PROCESSING': 'Procesando el pago...',
    'WAITING_AUTHORIZATION': 'Esperando autorización en tu banco.',
    'REFUNDED': 'Pago reembolsado.',
    'AUTHORIZED': 'Pago autorizado, pendiente de captura.'
  };
  
  return messages[status] || 'Estado desconocido. Contacta con soporte.';
}

// ============================================
// RUTA PARA VERIFICAR ESTADO DE ELIMINACION
// ============================================

// API: Verificar si se puede eliminar permanentemente un producto
app.get('/api/admin/products/:id/check-delete-status', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Cargar modelos
        const { Product, OrderItem } = require('./models');
        
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
        console.error('Error verificando estado de eliminaci�n:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al verificar estado del producto' 
        });
    }
});

// ============================================
// API PARA OBTENER IM�GENES POR CATEGOR�A
// ============================================
app.get('/api/images/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        
        // Usar la funci�n del controlador
        const controller = require('./controllers/adminProductController');
        return await controller.getCategoryImages(req, res);
        
    } catch (error) {
        console.error('Error obteniendo im�genes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener im�genes'
        });
    }
});

// ============================================
// API PARA AUTENTICACIÓN (JSON)
// ============================================

// --- API PARA CLIENTES ---

// Login cliente (API - JSON)
app.post('/api/customer/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const { User } = require('./models');
    const user = await User.findOne({ 
      where: { 
        email: email,
        rol: 'cliente' // SOLO clientes
      }
    });
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Cliente no encontrado' 
      });
    }
    
    // Verificar si tiene contraseña configurada
    if (!user.password_hash) {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes contraseña configurada' 
      });
    }
    
    // Verificar contraseña
    const isValid = await user.verifyPassword(password);
    
    if (!isValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Email o contraseña incorrectos' 
      });
    }
    
    // Verificar si está activo
    if (!user.activo) {
      return res.status(403).json({ 
        success: false, 
        message: 'Cuenta desactivada' 
      });
    }
    
    // Crear sesión de CLIENTE
    req.session.customerId = user.id;
    req.session.customer = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      telefono: user.telefono,
      direccion: user.direccion,
      ciudad: user.ciudad
    };
    
    console.log(`✅ Login cliente API: ${user.email}`);
    
    res.json({
      success: true,
      message: 'Login exitoso',
      customer: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        telefono: user.telefono,
        ciudad: user.ciudad
      }
    });
    
  } catch (error) {
    console.error('❌ Error en API login cliente:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor' 
    });
  }
});

// Logout cliente (API)
app.post('/api/customer/logout', (req, res) => {
  req.session.customerId = null;
  req.session.customer = null;
  
  res.json({
    success: true,
    message: 'Sesión cerrada correctamente'
  });
});

// Perfil cliente (API)
app.get('/api/customer/profile', (req, res) => {
  if (!req.session.customerId) {
    return res.status(401).json({ 
      success: false, 
      message: 'No autenticado' 
    });
  }
  
  res.json({
    success: true,
    customer: req.session.customer
  });
});

// --- API PARA ADMIN ---

// Login admin (API - JSON)
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 API Login admin recibido:', email);
    
    const { User } = require('./models');
    const user = await User.findOne({ 
      where: { 
        email: email,
        rol: ['admin', 'empleado'] // Solo admin/empleado
      }
    });
    
    if (!user) {
      console.log('❌ Usuario admin no encontrado');
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciales incorrectas' 
      });
    }
    
    console.log('✅ Usuario encontrado:', user.nombre, 'Rol:', user.rol);
    
    if (!user.activo) {
      return res.status(403).json({ 
        success: false, 
        message: 'Esta cuenta está desactivada' 
      });
    }
    
    // Verificar contraseña con bcrypt (directo, no usando verifyPassword para evitar logs)
    const isMatch = await require('bcrypt').compare(password, user.password_hash);
    
    if (!isMatch) {
      console.log('❌ Contraseña incorrecta');
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciales incorrectas' 
      });
    }
    
    // Crear sesión
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol
    };
    
    // Resetear intentos fallidos
    await user.update({ 
      intentos_fallidos: 0,
      ultimo_acceso: new Date(),
      bloqueado_hasta: null 
    });
    
    console.log(`✅ Login admin API exitoso: ${user.email}`);
    
    res.json({
      success: true,
      message: 'Login exitoso',
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol
      }
    });
    
  } catch (error) {
    console.error('❌ Error en API login admin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error del servidor' 
    });
  }
});

// Logout admin (API)
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Error cerrando sesión admin:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error cerrando sesión' 
      });
    }
    
    res.json({
      success: true,
      message: 'Sesión cerrada correctamente'
    });
  });
});

// Dashboard admin (API)
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'No autenticado' 
      });
    }
    
    const { Op } = require('sequelize');
    const { User, Order, Product } = require('./models');
    
    // Verificar que el usuario es admin/empleado
    const user = await User.findByPk(req.session.userId);
    if (!user || !['admin', 'empleado'].includes(user.rol)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Acceso denegado' 
      });
    }
    
    // Fechas para cálculos
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    
    // Obtener estadísticas
    const [
      totalCustomers,
      totalOrders,
      totalProducts,
      pendingOrders,
      pendingPaymentOrders,
      salesToday,
      monthlySales,
      recentOrders
    ] = await Promise.all([
      // Clientes
      User.count({ where: { rol: 'cliente' } }),
      // Pedidos totales
      Order.count(),
      // Productos activos
      Product.count({ where: { activo: true } }),
      // Pedidos pendientes
      Order.count({ where: { estado: 'pendiente' } }),
      // Pedidos pendientes de pago
      Order.count({ where: { estado: 'pendiente_pago' } }),
      // Ventas de hoy
      Order.sum('total', {
        where: { created_at: { [Op.between]: [today, tomorrow] } }
      }) || 0,
      // Ventas del mes
      Order.sum('total', {
        where: { created_at: { [Op.between]: [firstDayOfMonth, firstDayNextMonth] } }
      }) || 0,
      // Pedidos recientes
      Order.findAll({
        order: [['created_at', 'DESC']],
        limit: 10,
        attributes: ['id', 'codigo_pedido', 'cliente_nombre', 'total', 'estado', 'created_at']
      })
    ]);
    
    res.json({
      success: true,
      dashboard: {
        user: {
          nombre: user.nombre,
          email: user.email,
          rol: user.rol
        },
        stats: {
          total_customers: totalCustomers,
          total_orders: totalOrders,
          total_products: totalProducts,
          pending_orders: pendingOrders,
          pending_payment_orders: pendingPaymentOrders,
          sales_today: salesToday,
          monthly_sales: monthlySales
        },
        recent_orders: recentOrders.map(order => ({
          id: order.id,
          codigo_pedido: order.codigo_pedido,
          cliente_nombre: order.cliente_nombre,
          total: order.total,
          estado: order.estado,
          created_at: order.created_at
        }))
      }
    });
    
  } catch (error) {
    console.error('❌ Error en dashboard API:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error obteniendo dashboard' 
    });
  }
});

// ============================================
// RUTAS DE ADMINISTRACIÓN
// ============================================

// Ruta de login (sin protección)
app.get('/admin/login', sessionAuth.redirectIfAuthenticated, adminAuthController.showLogin);
app.post('/admin/login', adminAuthController.login);
app.get('/admin/logout', adminAuthController.logout);

// Middleware para proteger rutas de admin (excepto login y setup)
app.use('/admin', (req, res, next) => {
  // Permitir acceso a login, logout y setup sin autenticación
  if (req.path === '/login' || req.path === '/logout' || req.path === '/setup') {
    return next();
  }
  
  // Verificar autenticación para otras rutas de admin
  if (req.session && req.session.userId) {
    res.locals.user = req.session.user;
    return next();
  }
  
  req.flash('error_msg', 'Por favor, inicia sesión para continuar');
  res.redirect('/admin/login');
});

// Dashboard principal
app.get('/admin', async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const { sequelize } = require('./config/database');
    
    // Fechas para cálculos
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    
    console.log('📊 Cargando dashboard...');
    
    if (dbConnected && Product && Order) {
      // 1. TOTAL DE PRODUCTOS ACTIVOS
      const totalProducts = await Product.count({
        where: { activo: true }
      });
      
      // 2. TOTAL DE PEDIDOS (todos los estados)
      const totalOrders = await Order.count();
      
      // 3. PEDIDOS PENDIENTES DE PROCESO (estado = pendiente)
      const pendingOrders = await Order.count({
        where: { estado: 'pendiente' }
      });
      
      // 4. PEDIDOS PENDIENTES DE PAGO (estado = pendiente_pago)
      const pendingPaymentOrders = await Order.count({
        where: { estado: 'pendiente_pago' }
      });
      
      // 5. CALCULAR TOTALES DE VENTAS
      let salesToday = 0;
      let monthlySales = 0;
      
      try {
        // VENTAS DE HOY (todos los estados para ver datos)
        salesToday = await Order.sum('total', {
          where: {
            created_at: {
              [Op.between]: [today, tomorrow]
            }
          }
        }) || 0;
        
        // VENTAS DEL MES (todos los estados para ver datos)
        monthlySales = await Order.sum('total', {
          where: {
            created_at: {
              [Op.between]: [firstDayOfMonth, firstDayNextMonth]
            }
          }
        }) || 0;
        
      } catch (salesError) {
        console.error('❌ Error calculando ventas:', salesError.message);
      }
      
      // 6. PEDIDOS RECIENTES (últimos 10)
      const recentOrders = await Order.findAll({
        order: [['created_at', 'DESC']],
        limit: 10
      });
      
      // 7. ESTADÍSTICAS POR ESTADO (para gráfico)
      let statusStats = [];
      try {
        statusStats = await Order.findAll({
          attributes: [
            'estado',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
            [sequelize.fn('SUM', sequelize.col('total')), 'total']
          ],
          group: ['estado'],
          raw: true
        });
      } catch (statsError) {
        console.error('❌ Error stats estado:', statsError.message);
      }
      
      res.render('admin/dashboard', {
        title: 'Panel de Administración',
        totalProducts,
        totalOrders,
        pendingOrders,
        pendingPaymentOrders,
        salesToday,
        monthlySales,
        recentOrders: recentOrders || [],
        statusStats: statusStats || [],
        user: req.session.user,
        formatPrice: app.locals.formatPrice,
        getOrderStatusText: app.locals.getOrderStatusText,
        whatsapp_number: process.env.WHATSAPP_NUMBER || '+34600000000'
      });
      
    } else {
      // Fallback si la BD no está conectada
      res.render('admin/dashboard', {
        title: 'Panel de Administración',
        totalProducts: 0,
        totalOrders: 0,
        pendingOrders: 0,
        pendingPaymentOrders: 0,
        salesToday: 0,
        monthlySales: 0,
        recentOrders: [],
        statusStats: [],
        user: req.session.user,
        formatPrice: app.locals.formatPrice,
        getOrderStatusText: app.locals.getOrderStatusText,
        whatsapp_number: process.env.WHATSAPP_NUMBER || '+34600000000'
      });
    }
    
  } catch (error) {
    console.error('❌ Error crítico en dashboard:', error);
    res.render('admin/dashboard', {
      title: 'Panel de Administración - Error',
      totalProducts: 0,
      totalOrders: 0,
      pendingOrders: 0,
      pendingPaymentOrders: 0,
      salesToday: 0,
      monthlySales: 0,
      recentOrders: [],
      statusStats: [],
      user: req.session.user,
      formatPrice: app.locals.formatPrice,
      getOrderStatusText: app.locals.getOrderStatusText,
      whatsapp_number: process.env.WHATSAPP_NUMBER || '+34600000000',
      error_msg: ['Error cargando datos del dashboard']
    });
  }
});

// Rutas de productos (CRUD)
app.get('/admin/products', adminProductController.listProducts);
app.get('/admin/products/new', adminProductController.showCreateForm);
app.post('/admin/products', upload.uploadProductImage, adminProductController.createProduct);
app.get('/admin/products/:id/edit', adminProductController.showEditForm);
app.post('/admin/products/:id', upload.uploadProductImage, adminProductController.updateProduct);

// Rutas API para productos (AJAX)
app.delete('/api/admin/products/:id', adminProductController.deleteProduct);
app.post('/api/admin/products/:id/restore', adminProductController.restoreProduct);
app.get('/api/admin/products/:id/quick-view', adminProductController.quickView);
app.get('/api/images/category/:category', adminProductController.getCategoryImages);


// ============================================
// RUTAS DE PEDIDOS (ADMIN)
// ============================================

// Rutas de pedidos
app.get('/admin/orders', adminOrderController.listOrders);
app.get('/admin/orders/report', adminOrderController.salesReport);
app.get('/admin/orders/:id', adminOrderController.viewOrder);
app.post('/admin/orders/:id/status', adminOrderController.updateOrderStatus);
app.post('/admin/orders/:id/whatsapp', adminOrderController.sendWhatsAppNotification);
app.delete('/api/admin/orders/:id', adminOrderController.deleteOrder);

// ============================================
// RUTAS DE CLIENTES (ADMIN)
// ============================================

// Lista de clientes
app.get('/admin/customers', adminCustomerController.listCustomers);
// Ver detalle de cliente
app.get('/admin/customers/:id', adminCustomerController.viewCustomer);
// Crear cliente (formulario)
app.post('/admin/customers', adminCustomerController.createCustomer);
// Actualizar cliente (AJAX)
app.post('/admin/customers/:id/update', adminCustomerController.updateCustomer);
// API: Eliminar/desactivar cliente
app.delete('/api/customers/:id', adminCustomerController.deleteCustomer);
// API: Reactivar cliente
app.post('/api/customers/:id/restore', adminCustomerController.restoreCustomer);
// API: Resetear contraseña
app.post('/api/customers/:id/reset-password', adminCustomerController.resetPassword);
// API: Buscar clientes (autocompletar)
app.get('/api/customers/search', adminCustomerController.searchCustomers);

// ============================================
// NUEVAS RUTAS PARA CLIENTES (ÁREA PERSONAL)
// ============================================

// Login clientes (ÁREA SEPARADA DEL ADMIN)
app.get('/login-cliente', customerAuthController.showCustomerLogin);
app.post('/login-cliente', customerAuthController.customerLogin);
app.get('/logout-cliente', customerAuthController.customerLogout);

// Crear contraseña (para clientes nuevos)
app.get('/crear-contrasena', customerAuthController.showCreatePassword);
app.post('/crear-contrasena', customerAuthController.createPassword);



// ============================================
// RUTAS PARA �REA PERSONAL DEL CLIENTE (ACTUALIZADAS)
// ============================================

// Mi Cuenta (Dashboard)
app.get('/mi-cuenta', async (req, res) => {
  try {
    console.log('?? Accediendo a /mi-cuenta...');
    
    if (!req.session.customerId) {
      req.flash('error_msg', 'Por favor, inicia sesi�n para acceder a tu �rea personal');
      return res.redirect('/login-cliente');
    }
    
    // Cargar datos REALES de la BD
    const { Customer, Order } = require('./models');
    const { Op } = require('sequelize');
    
    const customer = await Customer.findByPk(req.session.customerId);
    
    if (!customer) {
      req.session.customerId = null;
      req.session.customer = null;
      req.flash('error_msg', 'Cliente no encontrado. Por favor, inicia sesi�n nuevamente.');
      return res.redirect('/login-cliente');
    }
    
    // Actualizar sesi�n con datos COMPLETOS de BD
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
    
    // Obtener estad�sticas
    const totalPedidos = await Order.count({
      where: { cliente_id: req.session.customerId }
    }) || 0;
    
    const totalGastado = await Order.sum('total', {
      where: { cliente_id: req.session.customerId }
    }) || 0;
    
    const pedidosPendientes = await Order.count({
      where: {
        cliente_id: req.session.customerId,
        estado: { [Op.in]: ['pendiente', 'pendiente_pago', 'confirmado', 'preparando'] }
      }
    }) || 0;
    
    // Pedidos recientes
    const pedidos = await Order.findAll({
      where: { cliente_id: req.session.customerId },
      order: [['created_at', 'DESC']],
      limit: 5
    });
    
    res.render('customer/dashboard', {
      title: 'Mi Cuenta - Carnicer�a Tenerife',
      customer: req.session.customer,
      pedidos: pedidos || [],
      estadisticas: {
        totalPedidos: totalPedidos,
        totalGastado: totalGastado,
        pedidosPendientes: pedidosPendientes
      },
      formatPrice: app.locals.formatPrice,
      formatDate: app.locals.formatDate,
      getOrderStatusText: app.locals.getOrderStatusText,
      whatsapp_number: process.env.WHATSAPP_NUMBER,
      currentYear: new Date().getFullYear()
    });
    
  } catch (error) {
    console.error('? Error cargando dashboard:', error);
    req.flash('error_msg', 'Error al cargar tu �rea personal');
    res.redirect('/login-cliente');
  }
});

// Mis Pedidos
app.get('/mis-pedidos', async (req, res) => {
  try {
    console.log('?? Accediendo a /mis-pedidos...');
    
    // Verificar autenticaci�n
    if (!req.session.customerId || !req.session.customer) {
      console.log('? No autenticado, redirigiendo a login');
      req.flash('error_msg', 'Por favor, inicia sesi�n para ver tus pedidos');
      return res.redirect('/login-cliente');
    }
    
    console.log('?? Cliente ID:', req.session.customerId);
    console.log('?? Cliente datos:', req.session.customer);
    
    // Cargar modelos
    const { Order, OrderItem, Product } = require('./models');
    
    // Buscar pedidos del cliente
    const pedidos = await Order.findAll({
      where: { 
        cliente_id: req.session.customerId 
      },
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [{
            model: Product,
            as: 'producto',
            attributes: ['id', 'nombre', 'categoria', 'unidad', 'precio']
          }]
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 50
    });
    
    console.log(`? Encontrados ${pedidos.length} pedidos para cliente ${req.session.customerId}`);
    
    // Si no hay pedidos, mostrar mensaje amigable
    if (!pedidos || pedidos.length === 0) {
      console.log('??  Cliente no tiene pedidos a�n');
      return res.render('customer/orders', {
        title: 'Mis Pedidos - Carnicer�a Tenerife',
        customer: req.session.customer,
        pedidos: [],
        hasOrders: false,
        message: 'A�n no tienes pedidos. �Haz tu primer pedido!',
        formatPrice: app.locals.formatPrice,
        formatDate: app.locals.formatDate,
        getOrderStatusText: app.locals.getOrderStatusText,
        getOrderStatusClass: app.locals.getOrderStatusClass,
        whatsapp_number: process.env.WHATSAPP_NUMBER,
        currentYear: new Date().getFullYear()
      });
    }
    
    // Procesar pedidos para la vista
    const pedidosProcesados = pedidos.map(pedido => {
      // Calcular total si es necesario
      let totalCalculado = pedido.total;
      if (pedido.items && pedido.items.length > 0) {
        totalCalculado = pedido.items.reduce((sum, item) => {
          return sum + (item.cantidad * item.precio_unitario);
        }, 0);
      }
      
      return {
        id: pedido.id,
        codigo_pedido: pedido.codigo_pedido,
        created_at: pedido.created_at,
        updated_at: pedido.updated_at,
        cliente_nombre: pedido.cliente_nombre,
        cliente_telefono: pedido.cliente_telefono,
        cliente_email: pedido.cliente_email,
        cliente_direccion: pedido.cliente_direccion,
        cliente_ciudad: pedido.cliente_ciudad,
        total: totalCalculado,
        estado: pedido.estado,
        metodo_pago: pedido.metodo_pago,
        notas: pedido.notas,
        fecha_entrega: pedido.fecha_entrega,
        hora_entrega: pedido.hora_entrega,
        whatsapp_enviado: pedido.whatsapp_enviado,
        items: pedido.items || []
      };
    });
    
    res.render('customer/orders', {
      title: 'Mis Pedidos - Carnicer�a Tenerife',
      customer: req.session.customer,
      pedidos: pedidosProcesados,
      hasOrders: true,
      formatPrice: app.locals.formatPrice,
      formatDate: app.locals.formatDate,
      formatDateTime: app.locals.formatDateTime,
      getOrderStatusText: app.locals.getOrderStatusText,
      getOrderStatusClass: app.locals.getOrderStatusClass,
      whatsapp_number: process.env.WHATSAPP_NUMBER,
      currentYear: new Date().getFullYear()
    });
    
  } catch (error) {
    console.error('? Error cargando mis pedidos:', error);
    req.flash('error_msg', 'Error al cargar tus pedidos. Por favor, intenta m�s tarde.');
    res.redirect('/mi-cuenta');
  }
});

// Mi Perfil
app.get('/mi-perfil', async (req, res) => {
  try {
    if (!req.session.customerId) {
      return res.redirect('/login-cliente');
    }
    
    const { Customer } = require('./models');
    
    const customer = await Customer.findByPk(req.session.customerId);
    
    if (!customer) {
      req.flash('error_msg', 'Cliente no encontrado');
      return res.redirect('/mi-cuenta');
    }
    
    // Actualizar sesi�n con datos actualizados
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
    
    res.render('customer/profile', {
      title: 'Mi Perfil - Carnicer�a Tenerife',
      customer: req.session.customer,
      success_msg: req.flash('success_msg'),
      error_msg: req.flash('error_msg'),
      formatDate: app.locals.formatDate,
      formatPhone: app.locals.formatPhone,
      whatsapp_number: process.env.WHATSAPP_NUMBER,
      currentYear: new Date().getFullYear()
    });
    
  } catch (error) {
    console.error('Error cargando perfil:', error);
    req.flash('error_msg', 'Error al cargar tu perfil');
    res.redirect('/mi-cuenta');
  }
});

// API para actualizar perfil del cliente
app.post('/api/clientes/update-profile', async (req, res) => {
  try {
    if (!req.session.customerId) {
      return res.status(401).json({ 
        success: false, 
        message: 'No autenticado' 
      });
    }
    
    const { nombre, telefono, direccion, ciudad, codigo_postal } = req.body;
    
    // Validaciones
    if (!nombre || !telefono || !direccion || !ciudad) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, tel�fono, direcci�n y ciudad son obligatorios'
      });
    }
    
    const { Customer } = require('./models');
    const customer = await Customer.findByPk(req.session.customerId);
    
    if (!customer) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cliente no encontrado' 
      });
    }
    
    // Actualizar datos
    await customer.update({
      nombre,
      telefono,
      direccion,
      ciudad,
      codigo_postal: codigo_postal || null
    });
    
    // Actualizar sesi�n
    req.session.customer = {
      id: customer.id,
      nombre: customer.nombre,
      email: customer.email,
      telefono: customer.telefono,
      direccion: customer.direccion,
      ciudad: customer.ciudad,
      codigo_postal: customer.codigo_postal
    };
    
    res.json({
      success: true,
      message: 'Perfil actualizado correctamente',
      customer: req.session.customer
    });
    
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar perfil' 
    });
  }
});

// ============================================
// RUTAS DE PRUEBA Y DIAGNÓSTICO
// ============================================
app.get('/test', (req, res) => {
  res.json({
    message: '✅ Servidor funcionando',
    timestamp: new Date().toISOString(),
    dbConnected: dbConnected,
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/test-db', async (req, res) => {
  try {
    if (dbConnected && Product) {
      const count = await Product.count();
      const sampleProduct = await Product.findOne();
      
      res.json({
        success: true,
        message: '✅ Base de datos conectada (MySQL/MariaDB)',
        productCount: count,
        sampleProduct: sampleProduct ? {
          id: sampleProduct.id,
          nombre: sampleProduct.nombre,
          stock: sampleProduct.stock
        } : null
      });
    } else {
      res.json({
        success: false,
        message: '❌ Base de datos no conectada',
        dbConnected: dbConnected
      });
    }
  } catch (error) {
    res.json({
      success: false,
      message: '❌ Error en base de datos',
      error: error.message
    });
  }
});

// ============================================
// ERROR HANDLING
// ============================================
app.use((req, res) => {
  res.status(404).render('404', { 
    title: 'Página no encontrada',
    message: 'La página que buscas no existe.',
    whatsapp_number: process.env.WHATSAPP_NUMBER,
    currentYear: new Date().getFullYear()
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Error del servidor:', err.message);
  
  if (err.name && err.name.includes('Sequelize')) {
    return res.status(503).render('error', {
      title: 'Base de datos no disponible',
      message: 'Estamos experimentando problemas técnicos.',
      error: process.env.NODE_ENV === 'development' ? err : null,
      whatsapp_number: process.env.WHATSAPP_NUMBER,
      currentYear: new Date().getFullYear()
    });
  }
  
  res.status(500).render('error', {
    title: 'Error del servidor',
    message: 'Algo salió mal. Por favor, intenta nuevamente más tarde.',
    error: process.env.NODE_ENV === 'development' ? err : null,
    whatsapp_number: process.env.WHATSAPP_NUMBER,
    currentYear: new Date().getFullYear()
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
const server = app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 SERVIDOR CARNICERÍA TENERIFE INICIADO');
  console.log('='.repeat(60));
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`❤️  Health: http://localhost:${PORT}/health`);
  console.log(`🧪 Test: http://localhost:${PORT}/test`);
  console.log(`⚠️  Admin Setup: http://localhost:${PORT}/admin`);
  console.log(`👤 Login Clientes: http://localhost:${PORT}/login-cliente`);
  console.log(`🏷️  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💳 Métodos de pago: Tarjeta, Transferencia, Efectivo, Bizum`);
  console.log('='.repeat(60));
  
  // Iniciar conexión a base de datos con retardo inicial
  console.log('⏱️ Esperando 5 segundos antes de conectar a la base de datos...');
  setTimeout(() => {
    console.log('🔧 Iniciando proceso de conexión a la base de datos...');
    initializeDatabase().catch(error => {
      console.error('❌ Error en initializeDatabase:', error.message);
    });
  }, 5000);
});

// Manejo de cierre
process.on('SIGTERM', () => {
  console.log('🛑 Recibido SIGTERM, cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Recibido SIGINT, cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    process.exit(0);
  });
});

module.exports = app;