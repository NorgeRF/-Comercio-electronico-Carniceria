// models/Order.js - CORREGIDO
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define('Pedido', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    codigo_pedido: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true
    },
    cliente_nombre: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    cliente_telefono: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    cliente_email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        validate: {
            isEmail: true
        }
    },
    cliente_direccion: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    cliente_ciudad: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    cliente_codigo_postal: {
        type: DataTypes.STRING(10),
        allowNull: true
    },
    total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    estado: {
        type: DataTypes.ENUM('pendiente', 'confirmado', 'preparando', 'enviado', 'entregado', 'cancelado', 'pendiente_pago'),
        defaultValue: 'pendiente'
    },
    metodo_pago: {
        type: DataTypes.ENUM('tarjeta', 'transferencia', 'efectivo', 'contra_reembolso', 'bizum'),
        allowNull: false
    },
    notas: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    
    // CORREGIDO: usar cliente_id (con "e") como en tu SQL
    cliente_id: {  // <-- ¡ESTE ES EL NOMBRE CORRECTO!
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'cliente_id'  // <-- Esto asegura que use el nombre correcto en BD
    },
    
    usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'usuario_id'
    },
    
    whatsapp_enviado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'whatsapp_enviado'
    },
    stripe_payment_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'stripe_payment_id'
    },
    
    telefono_bizum: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'telefono_bizum'
    },
    payment_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'payment_id'
    },
    payment_status: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: null,
        field: 'payment_status'
    },
    pagado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'pagado'
    },
    fecha_pago: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'fecha_pago'
    },
    
    fecha_entrega: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'fecha_entrega'
    },
    hora_entrega: {
        type: DataTypes.TIME,
        allowNull: true,
        field: 'hora_entrega'
    }
}, {
    tableName: 'pedidos',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['estado'] },
        { fields: ['codigo_pedido'] },
        { fields: ['created_at'] },
        { fields: ['cliente_id'] },  // <-- cliente_id, no client_id
        { fields: ['usuario_id'] },
        { fields: ['payment_status'] },
        { fields: ['pagado'] }
    ]
});

// MÉTODO PARA ESTABLECER RELACIONES - CORREGIDO
Order.associate = function(models) {
    // Relación con Customer (cliente que hizo el pedido)
    Order.belongsTo(models.Customer, {
        foreignKey: 'cliente_id',  // <-- cliente_id
        as: 'cliente',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
    });
    
    // Relación con User (admin/empleado que procesó)
    Order.belongsTo(models.User, {
        foreignKey: 'usuario_id',
        as: 'procesado_por',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
    });
    
    // Relación con OrderItems
    Order.hasMany(models.OrderItem, {
        foreignKey: 'pedido_id',
        as: 'items',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    
    // Relación muchos a muchos con Productos
    Order.belongsToMany(models.Product, {
        through: models.OrderItem,
        foreignKey: 'pedido_id',
        otherKey: 'producto_id',
        as: 'productos'
    });
};

module.exports = Order;