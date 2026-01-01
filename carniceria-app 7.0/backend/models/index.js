const Product = require('./Product');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const User = require('./User');
const Customer = require('./Customer');

// Cargar todos los modelos
const models = {
    Product,
    Order,
    OrderItem,
    User,
    Customer
};

// Función para establecer relaciones automáticamente
const setupAssociations = () => {
    try {
        console.log('?? Estableciendo relaciones entre modelos...');
        
        // Establecer relaciones si los modelos tienen método associate
        Object.keys(models).forEach(modelName => {
            if (typeof models[modelName].associate === 'function') {
                console.log(`   ?? Estableciendo relaciones para: ${modelName}`);
                models[modelName].associate(models);
            }
        });
        
        console.log('? Relaciones establecidas correctamente');
        
    } catch (error) {
        console.error('? Error estableciendo relaciones:', error.message);
        console.error('?? Stack trace:', error.stack);
    }
};

// Función para sincronizar modelos con la base de datos
const syncModels = async (force = false) => {
    try {
        // Primero establecer relaciones
        setupAssociations();
        
        // Luego sincronizar modelos
        for (const modelName in models) {
            if (models[modelName] && typeof models[modelName].sync === 'function') {
                await models[modelName].sync({ force });
                console.log(`? ${modelName} sincronizado`);
            }
        }
        console.log('?? Todos los modelos sincronizados con la base de datos');
    } catch (error) {
        console.error('? Error sincronizando modelos:', error.message);
        throw error;
    }
};

module.exports = {
    Product,
    Order,
    OrderItem,
    User,
    Customer,
    setupAssociations,
    syncModels,
    sequelize: require('../config/database').sequelize
};