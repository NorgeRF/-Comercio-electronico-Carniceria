const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OrderItem = sequelize.define('PedidoItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    pedido_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'pedidos',
            key: 'id'
        }
    },
    producto_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'productos',
            key: 'id'
        }
    },
    cantidad: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0.01
        }
    },
    precio_unitario: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    notas: {
        type: DataTypes.STRING(255),
        allowNull: true
    }
}, {
    tableName: 'pedido_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['pedido_id']
        },
        {
            fields: ['producto_id']
        }
    ]
});

// MÉTODO PARA ESTABLECER RELACIONES - COMPLETO
OrderItem.associate = function(models) {
    OrderItem.belongsTo(models.Order, {
        foreignKey: 'pedido_id',
        as: 'pedido',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    
    OrderItem.belongsTo(models.Product, {
        foreignKey: 'producto_id',
        as: 'producto',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
    });
};

module.exports = OrderItem;