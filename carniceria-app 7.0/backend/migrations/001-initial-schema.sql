-- ============================================
-- ESQUEMA CORREGIDO - SEPARACIÓN TOTAL
-- ============================================
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET collation_connection = 'utf8mb4_unicode_ci';

-- ============================================
-- 1. ELIMINAR TABLAS EXISTENTES
-- ============================================
DROP TABLE IF EXISTS `pedido_items`;
DROP TABLE IF EXISTS `pedidos`;
DROP TABLE IF EXISTS `productos`;
DROP TABLE IF EXISTS `categorias`;
DROP TABLE IF EXISTS `clientes`;
DROP TABLE IF EXISTS `usuarios`;

-- ============================================
-- 2. TABLA DE USUARIOS (SOLO ADMIN/EMPLEADOS)
-- ============================================
CREATE TABLE `usuarios` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `telefono` VARCHAR(20) NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `rol` ENUM('admin', 'empleado') NOT NULL DEFAULT 'empleado',
    `activo` TINYINT(1) NOT NULL DEFAULT 1,
    `verificado` TINYINT(1) NOT NULL DEFAULT 0,
    `fecha_registro` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `ultimo_acceso` DATETIME DEFAULT NULL,
    `intentos_fallidos` INT(11) NOT NULL DEFAULT 0,
    `bloqueado_hasta` DATETIME DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `usuarios_email_unique` (`email`),
    KEY `idx_usuarios_rol` (`rol`),
    KEY `idx_usuarios_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Solo admin y empleados';

-- ============================================
-- 3. TABLA DE CLIENTES (SEPARADA)
-- ============================================
CREATE TABLE `clientes` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `telefono` VARCHAR(20) NULL,
    `direccion` TEXT NULL,
    `ciudad` VARCHAR(100) NULL,
    `codigo_postal` VARCHAR(10) NULL,
    `password_hash` VARCHAR(255) NULL,
    `activo` TINYINT(1) NOT NULL DEFAULT 1,
    `verificado` TINYINT(1) NOT NULL DEFAULT 0,
    `fecha_registro` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `ultimo_acceso` DATETIME DEFAULT NULL,
    `total_compras` DECIMAL(10,2) NOT NULL DEFAULT 0,
    `cantidad_pedidos` INT(11) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `clientes_email_unique` (`email`),
    KEY `idx_clientes_activo` (`activo`),
    KEY `idx_clientes_email` (`email`),
    KEY `idx_clientes_ciudad` (`ciudad`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Clientes de la tienda';

-- ============================================
-- 4. TABLA DE PRODUCTOS
-- ============================================
CREATE TABLE `productos` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `descripcion` TEXT,
    `precio` DECIMAL(10,2) NOT NULL,
    `categoria` VARCHAR(50) NOT NULL,
    `unidad` VARCHAR(20) NOT NULL,
    `imagen` VARCHAR(255) DEFAULT NULL,
    `destacado` TINYINT(1) NOT NULL DEFAULT 0,
    `stock` INT(11) NOT NULL DEFAULT 0,
    `stock_minimo` INT(11) NOT NULL DEFAULT 10,
    `activo` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_productos_categoria` (`categoria`),
    KEY `idx_productos_destacado` (`destacado`),
    KEY `idx_productos_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. TABLA DE PEDIDOS (con cliente_id CORRECTO)
-- ============================================
CREATE TABLE `pedidos` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `codigo_pedido` VARCHAR(20) NOT NULL,
    `cliente_nombre` VARCHAR(100) NOT NULL,
    `cliente_telefono` VARCHAR(20) NOT NULL,
    `cliente_email` VARCHAR(100) DEFAULT NULL,
    `cliente_direccion` TEXT NOT NULL,
    `cliente_ciudad` VARCHAR(50) NOT NULL,
    `cliente_codigo_postal` VARCHAR(10) DEFAULT NULL,
    `total` DECIMAL(10,2) NOT NULL,
    `estado` ENUM('pendiente', 'confirmado', 'preparando', 'enviado', 'entregado', 'cancelado', 'pendiente_pago') NOT NULL DEFAULT 'pendiente',
    `metodo_pago` ENUM('tarjeta', 'transferencia', 'efectivo', 'contra_reembolso', 'bizum') NOT NULL,
    `notas` TEXT,
    `cliente_id` INT(11) DEFAULT NULL,
    `usuario_id` INT(11) DEFAULT NULL,
    `telefono_bizum` VARCHAR(20) DEFAULT NULL,
    `payment_id` VARCHAR(100) DEFAULT NULL,
    `payment_status` VARCHAR(50) DEFAULT NULL,
    `pagado` TINYINT(1) NOT NULL DEFAULT 0,
    `fecha_pago` DATETIME DEFAULT NULL,
    `whatsapp_enviado` TINYINT(1) NOT NULL DEFAULT 0,
    `stripe_payment_id` VARCHAR(100) DEFAULT NULL,
    `fecha_entrega` DATE DEFAULT NULL,
    `hora_entrega` TIME DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `pedidos_codigo_unique` (`codigo_pedido`),
    KEY `idx_pedidos_estado` (`estado`),
    KEY `idx_pedidos_cliente_id` (`cliente_id`),
    KEY `idx_pedidos_usuario_id` (`usuario_id`),
    CONSTRAINT `fk_pedidos_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_pedidos_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. TABLAS RESTANTES
-- ============================================
CREATE TABLE `pedido_items` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `pedido_id` INT(11) NOT NULL,
    `producto_id` INT(11) NOT NULL,
    `cantidad` DECIMAL(10,2) NOT NULL,
    `precio_unitario` DECIMAL(10,2) NOT NULL,
    `subtotal` DECIMAL(10,2) NOT NULL,
    `notas` VARCHAR(255) DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_pedido_items_pedido` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_pedido_items_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `categorias` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(50) NOT NULL,
    `descripcion` TEXT,
    `icono` VARCHAR(50) DEFAULT NULL,
    `color` VARCHAR(20) DEFAULT NULL,
    `orden` INT(11) NOT NULL DEFAULT 0,
    `activo` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `categorias_nombre_unique` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 7. DATOS INICIALES
-- ============================================

-- Categorias
INSERT INTO `categorias` (`nombre`, `icono`, `color`, `orden`) VALUES 
('vacuno', 'cow', '#dc3545', 1),
('cerdo', 'pig', '#e83e8c', 2),
('pollo', 'drumstick-bite', '#ffc107', 3),
('elaborados', 'bacon', '#20c997', 4);

-- Productos
INSERT INTO `productos` (`nombre`, `descripcion`, `precio`, `categoria`, `unidad`, `destacado`, `stock`) VALUES 
('Lomo de Vacuno Premium', 'Corte premium de ternera gallega', 29.99, 'vacuno', 'kg', 1, 50),
('Chuletas de Cerdo Iberico', 'Chuletas de cerdo de bellota', 15.99, 'cerdo', 'kg', 1, 100),
('Pollo de Corral Entero', 'Pollo criado en libertad', 9.99, 'pollo', 'kg', 1, 75),
('Hamburguesas Artesanas', 'Hamburguesas 100% carne de vacuno', 16.50, 'elaborados', 'pack', 1, 200);

-- ============================================
-- 8. MENSAJE FINAL
-- ============================================
SELECT '? ESQUEMA CREADO EXITOSAMENTE' as '';
SELECT '?? Separación: Usuarios (admin) <> Clientes (tienda)' as '';
SELECT '?? Admin: admin@carniceria.com / admin123' as '';