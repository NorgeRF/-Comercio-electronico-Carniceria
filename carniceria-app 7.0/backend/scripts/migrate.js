const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigrations() {
    let connection;
    
    try {
        console.log('?? Iniciando migraciones de base de datos MySQL/MariaDB...');
        
        // Configuración de conexión
        const config = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'carniceria',
            password: process.env.DB_PASSWORD || 'carne123',
            database: process.env.DB_NAME || 'carniceria_db',
            multipleStatements: true
        };
        
        // Conectar a la base de datos
        connection = await mysql.createConnection(config);
        console.log('? Conectado a MySQL/MariaDB');
        
        // 1. Leer el archivo de migración SQL
        const migrationFile = path.join(__dirname, '../migrations/001-initial-schema.sql');
        
        if (!fs.existsSync(migrationFile)) {
            console.error('? Archivo de migración no encontrado:', migrationFile);
            console.log('?? Creando archivo de migración básico...');
            
            // Crear un archivo de migración básico para MySQL
            const basicSQL = `
-- Migración inicial para MySQL/MariaDB - Carnicería Tenerife

-- 1. Tabla de productos
CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL CHECK (precio >= 0),
    categoria VARCHAR(50) NOT NULL,
    unidad VARCHAR(20) NOT NULL,
    imagen VARCHAR(255),
    destacado BOOLEAN DEFAULT FALSE,
    stock INT DEFAULT 0 CHECK (stock >= 0),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_categoria (categoria),
    INDEX idx_destacado (destacado),
    INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabla de pedidos
CREATE TABLE IF NOT EXISTS pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_pedido VARCHAR(20) UNIQUE NOT NULL,
    cliente_nombre VARCHAR(100) NOT NULL,
    cliente_telefono VARCHAR(20) NOT NULL,
    cliente_email VARCHAR(100),
    cliente_direccion TEXT NOT NULL,
    cliente_ciudad VARCHAR(50) NOT NULL,
    cliente_codigo_postal VARCHAR(10),
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    estado ENUM('pendiente', 'confirmado', 'preparando', 'enviado', 'entregado', 'cancelado') DEFAULT 'pendiente',
    metodo_pago ENUM('tarjeta', 'transferencia', 'efectivo') NOT NULL,
    notas TEXT,
    whatsapp_enviado BOOLEAN DEFAULT FALSE,
    stripe_payment_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_estado (estado),
    INDEX idx_codigo (codigo_pedido),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabla de items del pedido
CREATE TABLE IF NOT EXISTS pedido_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad DECIMAL(10,2) NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10,2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id),
    INDEX idx_pedido_id (pedido_id),
    INDEX idx_producto_id (producto_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('admin', 'empleado') DEFAULT 'empleado',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_rol (rol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Insertar datos iniciales
INSERT INTO productos (nombre, descripcion, precio, categoria, unidad, destacado, stock) VALUES
('Lomo de Vacuno Premium', 'Corte premium de ternera gallega', 29.99, 'vacuno', 'kg', TRUE, 50),
('Chuletas de Cerdo Ibérico', 'Chuletas de cerdo de bellota', 15.99, 'cerdo', 'kg', TRUE, 100),
('Pollo de Corral Entero', 'Pollo criado en libertad', 9.99, 'pollo', 'kg', TRUE, 75)
ON DUPLICATE KEY UPDATE nombre = nombre;

INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
('Administrador', 'admin@carniceria.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye.Lb2wZ2W6Zt7cJ5lWfCQz7zQ1qG4JXK', 'admin')
ON DUPLICATE KEY UPDATE email = email;

SELECT '? Migración MySQL/MariaDB completada exitosamente' as mensaje;
`;
            
            fs.writeFileSync(migrationFile, basicSQL);
            console.log('? Archivo de migración creado:', migrationFile);
        }
        
        // 2. Leer el SQL
        const sql = fs.readFileSync(migrationFile, 'utf8');
        
        // 3. Separar en sentencias (MySQL usa ; como separador)
        const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
        
        // 4. Ejecutar cada sentencia
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i].trim();
            
            if (statement.length > 0 && !statement.startsWith('--')) {
                try {
                    console.log(`?? Ejecutando sentencia ${i + 1}/${statements.length}...`);
                    await connection.execute(statement + ';');
                } catch (error) {
                    // Ignorar errores de "tabla ya existe" o similares
                    if (!error.message.includes('already exists') && 
                        !error.message.includes('Duplicate')) {
                        console.warn(`??  Error en sentencia ${i + 1}: ${error.message}`);
                    }
                }
            }
        }
        
        console.log('? Migraciones aplicadas exitosamente');
        
        // 5. Verificar tablas creadas
        const [tables] = await connection.execute('SHOW TABLES');
        console.log('?? Tablas en la base de datos:');
        tables.forEach(table => {
            console.log(`   - ${table[Object.keys(table)[0]]}`);
        });
        
        // 6. Contar registros
        const [productCount] = await connection.execute('SELECT COUNT(*) as count FROM productos');
        const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM usuarios');
        
        console.log(`?? Productos: ${productCount[0].count}`);
        console.log(`?? Usuarios: ${userCount[0].count}`);
        
    } catch (error) {
        console.error('? Error durante las migraciones:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('?? Conexión cerrada');
        }
    }
}

// Ejecutar migraciones si se llama directamente
if (require.main === module) {
    runMigrations().then(() => {
        console.log('?? Proceso de migración completado');
        process.exit(0);
    }).catch(error => {
        console.error('?? Error fatal:', error);
        process.exit(1);
    });
}

module.exports = runMigrations;