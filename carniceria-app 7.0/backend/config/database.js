const { Sequelize } = require('sequelize');
require('dotenv').config();

// ============================================
// CONFIGURACIÓN PARA MySQL/MariaDB
// ============================================
const sequelize = new Sequelize(
    process.env.DB_NAME || 'carniceria_db',
    process.env.DB_USER || 'carniceria',
    process.env.DB_PASSWORD || 'carne123',
    {
        host: process.env.DB_HOST || 'db',
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        dialectModule: require('mysql2'),
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        define: {
            charset: 'utf8mb4',
            collate: 'utf8mb4_unicode_ci',
            timestamps: true,
            underscored: true,
            freezeTableName: true
        },
        dialectOptions: {
            decimalNumbers: true,
            supportBigNumbers: true
        },
        timezone: '+00:00'
    }
);

// ============================================
// FUNCIÓN PARA TESTEAR CONEXIÓN
// ============================================
async function testConnection() {
    let attempts = 5;
    
    while (attempts > 0) {
        try {
            console.log(`🔧 Intentando conectar a MySQL/MariaDB (intento ${6 - attempts}/5)...`);
            
            await sequelize.authenticate();
            console.log('✅ CONEXIÓN EXITOSA a MySQL/MariaDB');
            
            // Verificar la base de datos existe
            const [results] = await sequelize.query('SELECT DATABASE() as db');
            console.log(`📊 Base de datos conectada: ${results[0].db}`);
            
            // Verificar tablas
            const [tables] = await sequelize.query('SHOW TABLES');
            console.log(`📦 Tablas en la base de datos: ${tables.length}`);
            
            if (tables.length > 0) {
                console.log('📋 Tablas encontradas:');
                tables.forEach(table => {
                    console.log(`   - ${Object.values(table)[0]}`);
                });
            }
            
            // NO sincronizar aquí - la sincronización se hará desde models/index.js si es necesario
            console.log('⚙️  Base de datos lista para usar');
            return true;
            
        } catch (error) {
            attempts--;
            console.error(`❌ Error conexión MySQL (Intentos restantes: ${attempts}):`, error.message);
            
            if (attempts === 0) {
                console.error('💥 No se pudo conectar a MySQL después de 5 intentos');
                console.log('⚠️  La aplicación funcionará sin base de datos');
                console.log('🔧 Solución de problemas:');
                console.log('   1. Verifica que el contenedor de MySQL esté corriendo');
                console.log('   2. Verifica las credenciales en .env');
                console.log('   3. Verifica que el usuario tenga permisos');
                console.log('   4. Verifica el puerto y host de conexión');
                return false;
            }
            
            console.log('⏳ Esperando 3 segundos antes de reintentar...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
}

// ============================================
// FUNCIONES ADICIONALES PARA DIAGNÓSTICO
// ============================================

// Verificar tablas específicas
async function checkTables() {
    try {
        const [tables] = await sequelize.query('SHOW TABLES');
        const tableNames = tables.map(table => Object.values(table)[0]);
        
        // Verificar tablas esenciales
        const essentialTables = ['productos', 'pedidos', 'usuarios'];
        const missingTables = essentialTables.filter(table => !tableNames.includes(table));
        
        if (missingTables.length > 0) {
            console.log(`⚠️  Tablas faltantes: ${missingTables.join(', ')}`);
            return false;
        }
        
        console.log('✅ Todas las tablas esenciales existen');
        return true;
        
    } catch (error) {
        console.error('❌ Error verificando tablas:', error.message);
        return false;
    }
}

// Contar productos en la base de datos
async function countProducts() {
    try {
        const [results] = await sequelize.query('SELECT COUNT(*) as count FROM productos');
        return results[0].count;
    } catch (error) {
        console.error('❌ Error contando productos:', error.message);
        return 0;
    }
}

// Obtener información de la base de datos
async function getDatabaseInfo() {
    try {
        const [version] = await sequelize.query('SELECT VERSION() as version');
        const [charset] = await sequelize.query('SHOW VARIABLES LIKE "character_set_database"');
        const [collation] = await sequelize.query('SHOW VARIABLES LIKE "collation_database"');
        
        return {
            version: version[0].version,
            charset: charset[0].Value,
            collation: collation[0].Value,
            connected: true
        };
    } catch (error) {
        return {
            version: 'Desconocido',
            charset: 'Desconocido',
            collation: 'Desconocido',
            connected: false,
            error: error.message
        };
    }
}

// ============================================
// FUNCIÓN PARA VERIFICAR Y PREPARAR BASE DE DATOS
// ============================================
async function prepareDatabase() {
    try {
        // 1. Testear conexión
        const connected = await testConnection();
        if (!connected) {
            console.log('⚠️  Continuando sin conexión a base de datos');
            return false;
        }
        
        // 2. Verificar tablas
        const tablesOk = await checkTables();
        if (!tablesOk) {
            console.log('⚠️  Algunas tablas no existen. Se crearán si se usa sync()');
        }
        
        // 3. Contar productos
        const productCount = await countProducts();
        console.log(`📊 Productos en la base de datos: ${productCount}`);
        
        // 4. Obtener info de la DB
        const dbInfo = await getDatabaseInfo();
        console.log(`💾 Versión MySQL: ${dbInfo.version}`);
        console.log(`🔤 Charset: ${dbInfo.charset}`);
        console.log(`🔡 Collation: ${dbInfo.collation}`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Error preparando base de datos:', error.message);
        return false;
    }
}

// ============================================
// EXPORTAR TODO
// ============================================
module.exports = { 
    sequelize, 
    testConnection,
    checkTables,
    countProducts,
    getDatabaseInfo,
    prepareDatabase
};