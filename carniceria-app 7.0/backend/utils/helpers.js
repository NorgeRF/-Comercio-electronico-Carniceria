// Formatear precio
exports.formatPrice = (price) => {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2
    }).format(price);
};

// Generar código único
exports.generateUniqueCode = (prefix = '') => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}${timestamp}-${random}`.toUpperCase();
};

// Validar email
exports.isValidEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

// Validar teléfono español
exports.isValidSpanishPhone = (phone) => {
    const re = /^(\+34|0034|34)?[6789]\d{8}$/;
    return re.test(phone.replace(/\s/g, ''));
};

// Formatear fecha
exports.formatDate = (date, format = 'es-ES') => {
    return new Date(date).toLocaleDateString(format, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Calcular subtotal del carrito
exports.calculateCartTotal = (cart) => {
    return cart.reduce((total, item) => {
        return total + (item.price * item.quantity);
    }, 0);
};

// Calcular IVA
exports.calculateIVA = (amount, percentage = 21) => {
    return amount * (percentage / 100);
};

// Slugify para URLs
exports.slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

// Paginación
exports.paginate = (array, page = 1, limit = 10) => {
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    
    return {
        data: array.slice(startIndex, endIndex),
        page: parseInt(page),
        limit: parseInt(limit),
        total: array.length,
        totalPages: Math.ceil(array.length / limit),
        hasNext: endIndex < array.length,
        hasPrev: startIndex > 0
    };
};

// Enviar email (simulación)
exports.sendEmail = async (to, subject, html) => {
    // En producción, usar nodemailer o servicio externo
    console.log(`?? Email enviado a: ${to}`);
    console.log(`?? Asunto: ${subject}`);
    console.log(`?? Contenido: ${html.substring(0, 100)}...`);
    
    return true;
};

// Enviar notificación por WhatsApp (simulación)
exports.sendWhatsAppNotification = async (phone, message) => {
    // En producción, usar whatsapp-web.js o API de WhatsApp Business
    console.log(`?? WhatsApp enviado a: ${phone}`);
    console.log(`?? Mensaje: ${message.substring(0, 100)}...`);
    
    return true;
};

// Generar PDF de recibo
exports.generateReceiptPDF = async (orderData) => {
    // En producción, usar pdfkit o similar
    console.log(`?? Generando recibo para pedido: ${orderData.codigo_pedido}`);
    
    return {
        filename: `recibo-${orderData.codigo_pedido}.pdf`,
        buffer: Buffer.from('Simulación de PDF')
    };
};