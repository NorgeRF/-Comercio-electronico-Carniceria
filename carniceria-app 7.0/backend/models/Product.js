const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Producto', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    precio: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    categoria: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    unidad: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    imagen: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    destacado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    stock: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: {
            min: 0
        }
    },
    stock_minimo: {
        type: DataTypes.INTEGER,
        defaultValue: 10,
        validate: {
            min: 0
        }
    },
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'productos',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['categoria']
        },
        {
            fields: ['destacado']
        },
        {
            fields: ['activo']
        },
        {
            fields: ['stock']
        }
    ]
});

// MÉTODO PARA ESTABLECER RELACIONES - COMPLETO
Product.associate = function(models) {
    // Relación con OrderItems
    Product.hasMany(models.OrderItem, {
        foreignKey: 'producto_id',
        as: 'pedido_items',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
    });
    
    // Relación muchos a muchos con Pedidos a través de OrderItems
    Product.belongsToMany(models.Order, {
        through: models.OrderItem,
        foreignKey: 'producto_id',
        otherKey: 'pedido_id',
        as: 'pedidos'
    });
};

module.exports = Product;