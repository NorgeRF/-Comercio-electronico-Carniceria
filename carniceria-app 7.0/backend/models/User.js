const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcrypt');

const User = sequelize.define('Usuario', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        comment: 'Identificador único del usuario'
    },
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'nombre',
        validate: {
            notEmpty: {
                msg: 'El nombre es obligatorio'
            },
            len: {
                args: [2, 100],
                msg: 'El nombre debe tener entre 2 y 100 caracteres'
            }
        },
        comment: 'Nombre completo del usuario'
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'email',
        unique: {
            name: 'usuarios_email_unique',
            msg: 'Este email ya está registrado'
        },
        validate: {
            isEmail: {
                msg: 'Por favor, introduce un email válido'
            },
            notEmpty: {
                msg: 'El email es obligatorio'
            }
        },
        comment: 'Email único para login'
    },
    telefono: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'telefono',
        comment: 'Teléfono de contacto'
    },
    password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false, // CAMBIADO: true ? false (admin DEBE tener contraseña)
        field: 'password_hash',
        validate: {
            notEmpty: {
                msg: 'La contraseña es obligatoria'
            }
        },
        comment: 'Hash bcrypt de la contraseña'
    },
    rol: {
        type: DataTypes.ENUM('admin', 'empleado'),
        field: 'rol',
        defaultValue: 'empleado',
        validate: {
            isIn: {
                args: [['admin', 'empleado']],
                msg: 'El rol debe ser admin o empleado'
            }
        },
        comment: 'Rol del usuario en el sistema'
    },
    activo: {
        type: DataTypes.BOOLEAN,
        field: 'activo',
        defaultValue: true,
        comment: 'Estado del usuario (activo/inactivo)'
    },
    verificado: {
        type: DataTypes.BOOLEAN,
        field: 'verificado',
        defaultValue: false,
        comment: 'Si el usuario ha verificado su email'
    },
    fecha_registro: {
        type: DataTypes.DATE,
        field: 'fecha_registro',
        defaultValue: DataTypes.NOW,
        comment: 'Fecha de registro del usuario'
    },
    ultimo_acceso: {
        type: DataTypes.DATE,
        field: 'ultimo_acceso',
        allowNull: true,
        comment: 'Fecha y hora del último acceso'
    },
    intentos_fallidos: {
        type: DataTypes.INTEGER,
        field: 'intentos_fallidos',
        defaultValue: 0,
        validate: {
            min: 0
        },
        comment: 'Número de intentos fallidos de login'
    },
    bloqueado_hasta: {
        type: DataTypes.DATE,
        field: 'bloqueado_hasta',
        allowNull: true,
        comment: 'Hasta cuándo está bloqueada la cuenta por intentos fallidos'
    }
}, {
    tableName: 'usuarios',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: false,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['email'],
            name: 'idx_usuarios_email'
        },
        {
            fields: ['rol'],
            name: 'idx_usuarios_rol'
        },
        {
            fields: ['activo'],
            name: 'idx_usuarios_activo'
        }
    ],
    hooks: {
        beforeCreate: async (user) => {
            try {
                console.log('?? beforeCreate hook para usuario:', user.email);
                console.log('?? Rol:', user.rol);
                
                // SIEMPRE hashear la contraseña para admin/empleado
                if (user.password_hash && 
                    user.password_hash.trim() !== '' && 
                    !user.password_hash.startsWith('$2a$') && 
                    !user.password_hash.startsWith('$2b$')) {
                    
                    console.log(`?? Hasheando contraseña para nuevo usuario: ${user.email}`);
                    const hash = await bcrypt.hash(user.password_hash, 10);
                    user.password_hash = hash;
                    console.log(`? Hash generado: ${hash.substring(0, 30)}...`);
                }
                
            } catch (error) {
                console.error('? Error en beforeCreate hook:', error);
                throw error;
            }
        },
        beforeUpdate: async (user) => {
            try {
                // Si se está actualizando la contraseña y no está hasheada
                if (user.changed('password_hash') && 
                    user.password_hash && 
                    user.password_hash.trim() !== '' && 
                    !user.password_hash.startsWith('$2a$') && 
                    !user.password_hash.startsWith('$2b$')) {
                    
                    console.log(`?? Hasheando contraseña actualizada para: ${user.email}`);
                    const hash = await bcrypt.hash(user.password_hash, 10);
                    user.password_hash = hash;
                }
            } catch (error) {
                console.error('? Error en beforeUpdate hook:', error);
                throw error;
            }
        }
    }
});

/**
 * MÉTODO PARA ESTABLECER RELACIONES - ¡ESTE FALTA!
 */
User.associate = function(models) {
    // Relación con Pedidos (un usuario admin/empleado puede procesar muchos pedidos)
    User.hasMany(models.Order, {
        foreignKey: 'usuario_id',
        as: 'pedidos_procesados',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
    });
};

/**
 * Método de instancia para verificar contraseña
 */
User.prototype.verifyPassword = async function(password) {
    try {
        console.log('?? === VERIFICACIÓN DE CONTRASEÑA ===');
        console.log(`?? Usuario: ${this.email}`);
        console.log(`?? Rol: ${this.rol}`);
        
        // OBTENER password_hash CORRECTAMENTE
        const passwordHash = this.getDataValue('password_hash');
        console.log(`?? Hash almacenado (getDataValue): ${passwordHash ? 'EXISTE' : 'NULL/UNDEFINED'}`);
        
        if (!passwordHash || passwordHash.trim() === '') {
            console.error('? ERROR: password_hash es NULL o VACÍO');
            return false;
        }
        
        // Verificar si la cuenta está bloqueada
        if (this.bloqueado_hasta && this.bloqueado_hasta > new Date()) {
            console.log('?? Cuenta bloqueada temporalmente');
            return false;
        }
        
        // Verificar si la cuenta está activa
        if (!this.activo) {
            console.log('? Cuenta inactiva');
            return false;
        }
        
        // Realizar la comparación con bcrypt
        console.log('?? Comparando con bcrypt...');
        const isValid = await bcrypt.compare(password, passwordHash);
        
        console.log(`? Resultado bcrypt.compare: ${isValid}`);
        
        if (isValid) {
            // Resetear intentos fallidos en éxito
            this.intentos_fallidos = 0;
            this.bloqueado_hasta = null;
            this.ultimo_acceso = new Date();
            await this.save();
            console.log('? Login exitoso - Intentos reseteados');
        } else {
            // Incrementar intentos fallidos solo para admin/empleado
            if (this.rol === 'admin' || this.rol === 'empleado') {
                this.intentos_fallidos += 1;
                console.log(`?? Intento fallido #${this.intentos_fallidos}`);
                
                // Bloquear después de 5 intentos fallidos
                if (this.intentos_fallidos >= 5) {
                    const bloqueoHasta = new Date(Date.now() + 15 * 60 * 1000);
                    this.bloqueado_hasta = bloqueoHasta;
                    console.log(`?? Cuenta bloqueada hasta: ${bloqueoHasta.toLocaleString()}`);
                }
                
                await this.save();
            }
        }
        
        return isValid;
        
    } catch (error) {
        console.error('? ERROR en verifyPassword:', error.message);
        console.error('?? Stack trace:', error.stack);
        return false;
    }
};

/**
 * Método para verificar si es administrador
 */
User.prototype.isAdmin = function() {
    return this.rol === 'admin';
};

/**
 * Método para verificar si es empleado
 */
User.prototype.isEmployee = function() {
    return this.rol === 'empleado';
};

/**
 * Método para verificar si puede acceder al panel de administración
 */
User.prototype.canAccessAdmin = function() {
    return this.rol === 'admin' || this.rol === 'empleado';
};

// Exportar modelo
module.exports = User;