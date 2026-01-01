const nodemailer = require('nodemailer');

class CustomerEmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: process.env.EMAIL_PORT || 587,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    }

    async sendWelcomeEmail(customer, tempPassword) {
        try {
            const mailOptions = {
                from: `"Carnicería Tenerife" <${process.env.EMAIL_USER}>`,
                to: customer.email,
                subject: 'Bienvenido a Carnicería Tenerife - Tus Credenciales',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #dc3545;">¡Bienvenido a Carnicería Tenerife!</h2>
                        <p>Hola <strong>${customer.nombre}</strong>,</p>
                        <p>Gracias por registrarte en nuestra tienda online. Aquí tienes tus credenciales de acceso:</p>
                        
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <p><strong>Email:</strong> ${customer.email}</p>
                            <p><strong>Contraseña temporal:</strong> ${tempPassword}</p>
                        </div>
                        
                        <p>Por seguridad, te recomendamos cambiar tu contraseña después del primer acceso.</p>
                        
                        <div style="margin: 30px 0;">
                            <a href="${process.env.APP_URL}/login" 
                               style="background: #dc3545; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">
                               Acceder a Mi Cuenta
                            </a>
                        </div>
                        
                        <p>Con tu cuenta podrás:</p>
                        <ul>
                            <li>Realizar pedidos más rápido</li>
                            <li>Ver tu historial de compras</li>
                            <li>Guardar tus direcciones favoritas</li>
                            <li>Recibir ofertas especiales</li>
                        </ul>
                        
                        <p>Si tienes alguna pregunta, no dudes en contactarnos:</p>
                        <p>
                            📞 ${process.env.WHATSAPP_NUMBER || '+34600000000'}<br>
                            📧 ${process.env.EMAIL_USER}
                        </p>
                        
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        
                        <p style="color: #666; font-size: 12px;">
                            Carnicería Tenerife © ${new Date().getFullYear()}<br>
                            Este es un email automático, por favor no responder.
                        </p>
                    </div>
                `
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`Email de bienvenida enviado a: ${customer.email}`);
            return true;
        } catch (error) {
            console.error('Error enviando email de bienvenida:', error);
            return false;
        }
    }

    async sendPasswordResetEmail(customer, newPassword) {
        try {
            const mailOptions = {
                from: `"Carnicería Tenerife" <${process.env.EMAIL_USER}>`,
                to: customer.email,
                subject: 'Contraseña Actualizada - Carnicería Tenerife',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #dc3545;">Contraseña Actualizada</h2>
                        <p>Hola <strong>${customer.nombre}</strong>,</p>
                        <p>Tu contraseña ha sido actualizada. Aquí tienes tus nuevas credenciales:</p>
                        
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <p><strong>Email:</strong> ${customer.email}</p>
                            <p><strong>Nueva contraseña:</strong> ${newPassword}</p>
                        </div>
                        
                        <p>Por seguridad, te recomendamos cambiar esta contraseña después de acceder.</p>
                        
                        <div style="margin: 30px 0;">
                            <a href="${process.env.APP_URL}/login" 
                               style="background: #dc3545; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">
                               Acceder a Mi Cuenta
                            </a>
                        </div>
                        
                        <p>Si no solicitaste este cambio, por favor contacta con soporte inmediatamente.</p>
                        
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        
                        <p style="color: #666; font-size: 12px;">
                            Carnicería Tenerife © ${new Date().getFullYear()}<br>
                            Este es un email automático, por favor no responder.
                        </p>
                    </div>
                `
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`Email de reset de contraseña enviado a: ${customer.email}`);
            return true;
        } catch (error) {
            console.error('Error enviando email de reset:', error);
            return false;
        }
    }
}

module.exports = new CustomerEmailService();