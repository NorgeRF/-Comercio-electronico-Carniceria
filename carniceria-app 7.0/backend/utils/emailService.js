const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: process.env.EMAIL_PORT == 465,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            },
            tls: {
                rejectUnauthorized: false
            }
        });
    }
    
    // Verificar conexión
    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('? Servicio de email configurado correctamente');
            return true;
        } catch (error) {
            console.error('? Error configurando email:', error);
            return false;
        }
    }
    
    // Enviar email genérico
    async sendEmail(to, subject, html, attachments = []) {
        try {
            const mailOptions = {
                from: `"Carnicería Tenerife" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
                to: Array.isArray(to) ? to.join(', ') : to,
                subject: subject,
                html: html,
                attachments: attachments
            };
            
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`?? Email enviado a: ${to}`);
            return { success: true, messageId: info.messageId };
            
        } catch (error) {
            console.error('? Error enviando email:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Enviar confirmación de pedido
    async sendOrderConfirmation(order) {
        const subject = `? Confirmación de Pedido #${order.codigo_pedido}`;
        
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #c62828; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .order-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #ddd; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .btn { display: inline-block; background: #c62828; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
        .status-badge { display: inline-block; padding: 5px 10px; border-radius: 15px; font-weight: bold; }
        .status-pendiente { background: #fff3cd; color: #856404; }
        .status-confirmado { background: #d1ecf1; color: #0c5460; }
        .status-preparando { background: #d4edda; color: #155724; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>?? ¡Pedido Confirmado!</h1>
            <p>Carnicería Tenerife</p>
        </div>
        
        <div class="content">
            <h2>Hola ${order.cliente_nombre},</h2>
            <p>Hemos recibido tu pedido correctamente. Aquí tienes los detalles:</p>
            
            <div class="order-details">
                <h3>?? Detalles del Pedido</h3>
                <p><strong>Código:</strong> ${order.codigo_pedido}</p>
                <p><strong>Fecha:</strong> ${new Date(order.created_at).toLocaleDateString('es-ES')}</p>
                <p><strong>Estado:</strong> <span class="status-badge status-${order.estado}">${order.estado}</span></p>
                <p><strong>Total:</strong> €${order.total.toFixed(2)}</p>
                <p><strong>Método de pago:</strong> ${order.metodo_pago}</p>
                
                <h4>?? Dirección de Entrega</h4>
                <p>${order.cliente_direccion}<br>
                   ${order.cliente_ciudad} ${order.cliente_codigo_postal || ''}</p>
                
                <h4>?? Productos</h4>
                <ul>
                    ${order.items.map(item => `
                        <li>${item.nombre} - ${item.cantidad}${item.unidad} - €${(item.precio_unitario * item.cantidad).toFixed(2)}</li>
                    `).join('')}
                </ul>
            </div>
            
            <p><strong>?? Tiempo de entrega estimado:</strong> 24-48 horas</p>
            
            <p>Te contactaremos para confirmar la hora exacta de entrega.</p>
            
            <p>
                <a href="${process.env.APP_URL}/seguimiento/${order.codigo_pedido}" class="btn">
                    ?? Seguir mi pedido
                </a>
            </p>
            
            <div class="footer">
                <p>Carnicería Tenerife</p>
                <p>C/ Principal, 123 - Santa Cruz de Tenerife</p>
                <p>?? 922 123 456 | ?? info@carniceriatenerife.com</p>
                <p><a href="${process.env.APP_URL}">${process.env.APP_URL}</a></p>
            </div>
        </div>
    </div>
</body>
</html>
        `;
        
        return await this.sendEmail(order.cliente_email, subject, html);
    }
    
    // Enviar notificación de cambio de estado
    async sendOrderStatusUpdate(order, previousStatus) {
        const subject = `?? Actualización de Pedido #${order.codigo_pedido}`;
        
        const statusMessages = {
            'confirmado': 'tu pedido ha sido confirmado y está en preparación.',
            'preparando': 'estamos preparando tu pedido.',
            'enviado': 'tu pedido ha salido para entrega.',
            'entregado': 'tu pedido ha sido entregado.',
            'cancelado': 'tu pedido ha sido cancelado.'
        };
        
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ff9800; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>?? Actualización de Pedido</h1>
        </div>
        
        <div class="content">
            <h2>Hola ${order.cliente_nombre},</h2>
            <p>El estado de tu pedido <strong>#${order.codigo_pedido}</strong> ha cambiado:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <div style="font-size: 2rem; color: #c62828; margin-bottom: 10px;">
                    ${order.estado === 'entregado' ? '?' : 
                      order.estado === 'enviado' ? '??' : 
                      order.estado === 'preparando' ? '?????' : 
                      order.estado === 'confirmado' ? '??' : '?'}
                </div>
                <h3 style="color: #c62828;">${order.estado.charAt(0).toUpperCase() + order.estado.slice(1)}</h3>
            </div>
            
            <p>${statusMessages[order.estado] || 'El estado de tu pedido ha cambiado.'}</p>
            
            ${order.estado === 'enviado' ? `
                <p><strong>?? El repartidor te contactará antes de la entrega.</strong></p>
                <p>Por favor, asegúrate de estar disponible en la dirección proporcionada.</p>
            ` : ''}
            
            ${order.estado === 'entregado' ? `
                <p>¡Esperamos que disfrutes de nuestros productos!</p>
                <p>Si tienes alguna consulta, no dudes en contactarnos.</p>
            ` : ''}
            
            ${order.estado === 'cancelado' ? `
                <p>Si necesitas más información sobre la cancelación, por favor contacta con nosotros.</p>
            ` : ''}
            
            <p>
                <a href="${process.env.APP_URL}/seguimiento/${order.codigo_pedido}" 
                   style="display: inline-block; background: #c62828; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                    ?? Ver detalles del pedido
                </a>
            </p>
            
            <div class="footer">
                <p>Carnicería Tenerife</p>
                <p>?? 922 123 456 | ?? info@carniceriatenerife.com</p>
            </div>
        </div>
    </div>
</body>
</html>
        `;
        
        return await this.sendEmail(order.cliente_email, subject, html);
    }
    
    // Enviar email de recuperación de contraseña
    async sendPasswordReset(email, token) {
        const resetLink = `${process.env.APP_URL}/reset-password?token=${token}`;
        const subject = '?? Restablecer contraseña - Carnicería Tenerife';
        
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #c62828; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .btn { display: inline-block; background: #c62828; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .token { background: #f0f0f0; padding: 10px; border-radius: 5px; font-family: monospace; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>?? Restablecer Contraseña</h1>
        </div>
        
        <div class="content">
            <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
            
            <p>Para crear una nueva contraseña, haz clic en el siguiente botón:</p>
            
            <p style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" class="btn">
                    Restablecer Contraseña
                </a>
            </p>
            
            <p>O copia y pega este enlace en tu navegador:</p>
            <div class="token">${resetLink}</div>
            
            <p><strong>?? Este enlace expirará en 1 hora.</strong></p>
            
            <p>Si no solicitaste restablecer tu contraseña, puedes ignorar este email.</p>
            
            <div class="footer">
                <p>Carnicería Tenerife - Panel de Administración</p>
                <p>?? 922 123 456</p>
            </div>
        </div>
    </div>
</body>
</html>
        `;
        
        return await this.sendEmail(email, subject, html);
    }
    
    // Enviar email de contacto
    async sendContactForm(data) {
        const subject = `?? Nuevo mensaje de contacto - ${data.subject || 'Consulta'}`;
        
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #c62828; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .message { background: white; padding: 20px; border-radius: 5px; border: 1px solid #ddd; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>?? Nuevo Mensaje de Contacto</h1>
        </div>
        
        <div class="content">
            <h3>Información del remitente:</h3>
            <p><strong>Nombre:</strong> ${data.name}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Teléfono:</strong> ${data.phone || 'No proporcionado'}</p>
            <p><strong>Asunto:</strong> ${data.subject || 'Consulta general'}</p>
            
            <div class="message">
                <h4>Mensaje:</h4>
                <p>${data.message.replace(/\n/g, '<br>')}</p>
            </div>
            
            <p><strong>?? Fecha:</strong> ${new Date().toLocaleString('es-ES')}</p>
            
            <p>
                <a href="mailto:${data.email}" 
                   style="display: inline-block; background: #c62828; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                    ?? Responder
                </a>
            </p>
            
            <div class="footer">
                <p>Sistema de contacto - Carnicería Tenerife</p>
            </div>
        </div>
    </div>
</body>
</html>
        `;
        
        // Enviar a administración
        const adminEmail = process.env.EMAIL_ADMIN || process.env.EMAIL_USER;
        return await this.sendEmail(adminEmail, subject, html);
    }
    
    // Enviar factura
    async sendInvoice(order, pdfBuffer) {
        const subject = `?? Factura Pedido #${order.codigo_pedido}`;
        
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #c62828; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>?? Factura Electrónica</h1>
        </div>
        
        <div class="content">
            <h2>Hola ${order.cliente_nombre},</h2>
            <p>Adjunto encontrarás la factura correspondiente a tu pedido <strong>#${order.codigo_pedido}</strong>.</p>
            
            <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #ddd;">
                <h3>Resumen del Pedido</h3>
                <p><strong>Fecha:</strong> ${new Date(order.created_at).toLocaleDateString('es-ES')}</p>
                <p><strong>Total:</strong> €${order.total.toFixed(2)}</p>
                <p><strong>IVA (21%):</strong> €${(order.total * 0.21).toFixed(2)}</p>
                <p><strong>NIF:</strong> B12345678</p>
            </div>
            
            <p>Esta factura es válida a efectos fiscales. Consérvala para cualquier consulta.</p>
            
            <p><strong>?? Datos de la empresa:</strong></p>
            <p>Carnicería Tenerife S.L.<br>
               C/ Principal, 123<br>
               38001 Santa Cruz de Tenerife<br>
               NIF: B12345678</p>
            
            <div class="footer">
                <p>Factura electrónica generada automáticamente</p>
                <p>Para consultas: facturacion@carniceriatenerife.com</p>
            </div>
        </div>
    </div>
</body>
</html>
        `;
        
        const attachments = [{
            filename: `factura-${order.codigo_pedido}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
        }];
        
        return await this.sendEmail(order.cliente_email, subject, html, attachments);
    }
}

module.exports = new EmailService();