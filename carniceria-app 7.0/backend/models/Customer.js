const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcrypt');

const Customer = sequelize.define('Cliente', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    telefono: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    direccion: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    ciudad: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    codigo_postal: {
        type: DataTypes.STRING(10),
        allowNull: true
    },
    password_hash: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    verificado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    fecha_registro: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    ultimo_acceso: {
        type: DataTypes.DATE,
        allowNull: true
    },
    total_compras: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    cantidad_pedidos: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    tableName: 'clientes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
        beforeCreate: async (customer) => {
            if (customer.password_hash && 
                customer.password_hash.trim() !== '' && 
                !customer.password_hash.startsWith('$2a$') && 
                !customer.password_hash.startsWith('$2b$')) {
                
                const hash = await bcrypt.hash(customer.password_hash, 10);
                customer.password_hash = hash;
            }
        }
    }
});

// Métodos
Customer.prototype.verifyPassword = async function(password) {
    if (!this.password_hash) return false;
    return await bcrypt.compare(password, this.password_hash);
};

Customer.prototype.updateStats = async function(orderTotal) {
    this.cantidad_pedidos += 1;
    this.total_compras = parseFloat(this.total_compras) + parseFloat(orderTotal);
    this.ultimo_acceso = new Date();
    await this.save();
};

// Relaciones
Customer.associate = function(models) {
    Customer.hasMany(models.Order, {
        foreignKey: 'cliente_id',
        as: 'pedidos',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
    });
};

module.exports = Customer;