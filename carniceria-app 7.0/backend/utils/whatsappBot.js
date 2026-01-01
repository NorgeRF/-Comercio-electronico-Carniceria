const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

class WhatsAppBot {
    constructor() {
        this.client = null;
        this.isReady = false;
        this.sessionPath = path.join(__dirname, '../../whatsapp_session');
        
        // Crear directorio de sesión si no existe
        if (!fs.existsSync(this.sessionPath)) {
            fs.mkdirSync(this.sessionPath, { recursive: true });
        }
    }
    
    async initialize() {
        return new Promise((resolve, reject) => {
            console.log('?? Inicializando WhatsApp Bot...');
            
            this.client = new Client({
                authStrategy: new LocalAuth({
                    clientId: "carniceria-bot",
                    dataPath: this.sessionPath
                }),
                puppeteer: {
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--disable-gpu'
                    ]
                }
            });
            
            // Generar QR
            this.client.on('qr', (qr) => {
                console.log('?? Escanea este código QR con WhatsApp:');
                qrcode.generate(qr, { small: true });
                
                // También guardar QR como imagen (opcional)
                this.generateQRImage(qr);
            });
            
            // Cuando esté listo
            this.client.on('ready', () => {
                console.log('? WhatsApp Bot está listo!');
                this.isReady = true;
                resolve();
            });
            
            // Manejar mensajes entrantes
            this.client.on('message', async (message) => {
                await this.handleIncomingMessage(message);
            });
            
            // Manejar errores
            this.client.on('auth_failure', (msg) => {
                console.error('? Error de autenticación:', msg);
                reject(new Error('Error de autenticación de WhatsApp'));
            });
            
            this.client.on('disconnected', (reason) => {
                console.log('?? WhatsApp desconectado:', reason);
                this.isReady = false;
                
                // Intentar reconectar después de 5 segundos
                setTimeout(() => {
                    console.log('?? Intentando reconectar WhatsApp...');
                    this.initialize().catch(console.error);
                }, 5000);
            });
            
            // Inicializar cliente
            this.client.initialize().catch(reject);
        });
    }
    
    // Generar imagen QR (opcional)
    generateQRImage(qr) {
        const qrCode = require('qrcode');
        const filePath = path.join(this.sessionPath, 'whatsapp_qr.png');
        
        qrCode.toFile(filePath, qr, (err) => {
            if (err) {
                console.error('Error generando QR image:', err);
            } else {
                console.log(`?? QR guardado como: ${filePath}`);
            }
        });
    }
    
    // Manejar mensajes entrantes
    async handleIncomingMessage(message) {
        try {
            const contact = await message.getContact();
            const chat = await message.getChat();
            const body = message.body.toLowerCase();
            
            console.log(`?? Mensaje recibido de: ${contact.name || contact.number}`);
            console.log(`?? Contenido: ${message.body}`);
            
            // Comandos básicos
            if (body === 'hola' || body === 'buenos días' || body === 'buenas') {
                await this.sendGreeting(message);
            } else if (body.includes('precio') || body.includes('cuánto')) {
                await this.sendPriceList(message);
            } else if (body.includes('horario') || body.includes('hora')) {
                await this.sendBusinessHours(message);
            } else if (body.includes('dirección') || body.includes('dónde')) {
                await this.sendLocation(message);
            } else if (body.includes('pedido') || body.includes('comprar')) {
                await this.handleOrderRequest(message);
            } else if (body === 'ayuda' || body === 'menu') {
                await this.sendHelpMenu(message);
            } else {
                await this.sendDefaultResponse(message);
            }
            
        } catch (error) {
            console.error('Error manejando mensaje:', error);
        }
    }
    
    // Enviar saludo
    async sendGreeting(message) {
        const response = `
¡Hola! ??

Soy el asistente virtual de *Carnicería Tenerife*.

¿En qué puedo ayudarte hoy?

*Comandos disponibles:*
• *Precios* - Ver lista de precios
• *Horario* - Conocer nuestro horario
• *Dirección* - Nuestra ubicación
• *Pedido* - Realizar un pedido
• *Ayuda* - Ver este menú

También puedes visitar nuestra web: https://tudominio.com
        `;
        
        await message.reply(response);
    }
    
    // Enviar lista de precios
    async sendPriceList(message) {
        const response = `
?? *LISTA DE PRECIOS*

*Carnes Frescas:*
• Lomo de Vacuno: €29.99/kg
• Chuletas de Cerdo: €15.99/kg
• Pollo Entero: €9.99/kg
• Costillas de Cordero: €22.99/kg

*Productos Elaborados:*
• Hamburguesas Artesanas: €16.50/kg
• Salchichón de Bellota: €19.99/kg
• Chorizo Picante: €14.99/kg

*Mariscos:*
• Salmón Fresco: €18.99/kg
• Gambón Rojo: €32.99/kg

*Quesos:*
• Queso Curado de Cabra: €23.50/kg

?? *Envío gratuito en pedidos superiores a €50*

?? *Para hacer un pedido, escribe: "Quiero hacer un pedido"*
        `;
        
        await message.reply(response);
    }
    
    // Enviar horario
    async sendBusinessHours(message) {
        const response = `
?? *HORARIO DE ATENCIÓN*

*Lunes a Viernes:* 8:00 - 20:00
*Sábados:* 8:00 - 15:00
*Domingos y Festivos:* Cerrado

?? *Teléfono:* 922 123 456
?? *Email:* info@carniceriatenerife.com

*Entregas a domicilio:* 24-48 horas
        `;
        
        await message.reply(response);
    }
    
    // Enviar ubicación
    async sendLocation(message) {
        const response = `
?? *NUESTRA UBICACIÓN*

*Carnicería Tenerife*
C/ Principal, 123
38001 Santa Cruz de Tenerife
Tenerife, España

?? *WhatsApp:* +34 600 000 000
?? *Web:* https://tudominio.com

*Cómo llegar:*
?? Aparcamiento disponible en la calle
?? Parada de guagua a 100m
        `;
        
        await message.reply(response);
        
        // También enviar ubicación en Google Maps
        const mapsUrl = 'https://maps.google.com/?q=Calle+Principal+123,+Santa+Cruz+de+Tenerife';
        await message.reply(`??? *Google Maps:* ${mapsUrl}`);
    }
    
    // Manejar solicitud de pedido
    async handleOrderRequest(message) {
        const response = `
?? *REALIZAR PEDIDO*

Para hacer un pedido, por favor:

1. *Visita nuestra web:* https://tudominio.com/pedidos
2. *Selecciona los productos* que deseas
3. *Completa el formulario* con tus datos
4. *Elige el método de pago* (tarjeta, transferencia o efectivo)

*O si prefieres:*
Puedes enviarme directamente tu pedido en este formato:
Nombre: [Tu nombre]
Teléfono: [Tu teléfono]
Dirección: [Tu dirección completa]
Productos:

    Producto 1, cantidad, precio

    Producto 2, cantidad, precio
    Total: €[total]
    
    
¿Necesitas ayuda con algo más? ??
        `;
        
        await message.reply(response);
    }
    
    // Enviar menú de ayuda
    async sendHelpMenu(message) {
        const response = `
? *MENÚ DE AYUDA*

*Comandos disponibles:*
• *Hola* - Saludo e información básica
• *Precios* - Ver lista de precios actualizada
• *Horario* - Conocer nuestro horario de atención
• *Dirección* - Nuestra ubicación y cómo llegar
• *Pedido* - Cómo realizar un pedido
• *Ayuda* - Ver este menú

*Contacto directo:*
?? *Teléfono:* 922 123 456
?? *WhatsApp:* +34 600 000 000
?? *Email:* info@carniceriatenerife.com
?? *Web:* https://tudominio.com

*Servicios:*
? Entregas a domicilio en Tenerife
? Pago seguro online
? Productos de máxima calidad
? Atención personalizada
        `;
        
        await message.reply(response);
    }
    
    // Respuesta por defecto
    async sendDefaultResponse(message) {
        const response = `
?? *Asistente Virtual*

No entendí completamente tu mensaje.

Puedes usar uno de estos comandos:
• *Hola* - Para saludar
• *Precios* - Ver precios
• *Horario* - Nuestro horario
• *Dirección* - Dónde estamos
• *Pedido* - Cómo pedir
• *Ayuda* - Ver menú de ayuda

O si prefieres hablar con una persona:
?? Llama al 922 123 456
?? Envíanos un mensaje por aquí

¡Estamos aquí para ayudarte! ??
        `;
        
        await message.reply(response);
    }
    
    // Enviar mensaje a un número
    async sendMessage(to, message) {
        if (!this.isReady) {
            throw new Error('WhatsApp Bot no está listo');
        }
        
        try {
            // Formatear número (eliminar espacios y añadir código de país si falta)
            let phoneNumber = to.trim();
            
            if (!phoneNumber.startsWith('+')) {
                if (phoneNumber.startsWith('34')) {
                    phoneNumber = '+' + phoneNumber;
                } else if (phoneNumber.startsWith('0')) {
                    phoneNumber = '+34' + phoneNumber.substring(1);
                } else {
                    phoneNumber = '+34' + phoneNumber;
                }
            }
            
            // Eliminar espacios y caracteres especiales
            phoneNumber = phoneNumber.replace(/\s/g, '');
            
            // Enviar mensaje
            const chatId = `${phoneNumber}@c.us`;
            await this.client.sendMessage(chatId, message);
            
            console.log(`? Mensaje enviado a: ${phoneNumber}`);
            return true;
            
        } catch (error) {
            console.error('Error enviando mensaje:', error);
            throw error;
        }
    }
    
    // Enviar notificación de nuevo pedido
    async sendNewOrderNotification(orderData) {
        const message = `
?? *NUEVO PEDIDO RECIBIDO*
--------------------
*Código:* ${orderData.codigo_pedido}
*Cliente:* ${orderData.cliente_nombre}
*Teléfono:* ${orderData.cliente_telefono}
*Email:* ${orderData.cliente_email || 'No proporcionado'}
--------------------
*Dirección:*
${orderData.cliente_direccion}
${orderData.cliente_ciudad} ${orderData.cliente_codigo_postal || ''}
--------------------
*Método de pago:* ${orderData.metodo_pago}
*Total:* €${orderData.total.toFixed(2)}
--------------------
*Productos:*
${orderData.items.map((item, index) => 
    `${index + 1}. ${item.nombre} - ${item.cantidad}${item.unidad} - €${(item.precio_unitario * item.cantidad).toFixed(2)}`
).join('\n')}
--------------------
*Notas:* ${orderData.notas || 'Ninguna'}
--------------------
?? *Acción requerida:* Confirmar el pedido y programar entrega
        `;
        
        // Enviar al administrador
        const adminNumber = process.env.WHATSAPP_ADMIN || process.env.WHATSAPP_NUMBER;
        await this.sendMessage(adminNumber, message);
        
        // También enviar confirmación al cliente
        const customerMessage = `
? *PEDIDO CONFIRMADO*
--------------------
¡Hola ${orderData.cliente_nombre}!
--------------------
Hemos recibido tu pedido *#${orderData.codigo_pedido}*
--------------------
*Resumen:*
Total: €${orderData.total.toFixed(2)}
Método de pago: ${orderData.metodo_pago}
--------------------
*Estado:* En preparación
*Tiempo de entrega:* 24-48 horas
--------------------
Te contactaremos para confirmar la hora de entrega.
--------------------
?? *Contacto:* 922 123 456
?? *WhatsApp:* ${process.env.WHATSAPP_NUMBER}
--------------------
¡Gracias por confiar en Carnicería Tenerife! ??
        `;
        
        await this.sendMessage(orderData.cliente_telefono, customerMessage);
    }
    
    // Cerrar sesión
    async logout() {
        if (this.client) {
            await this.client.logout();
            this.isReady = false;
            console.log('?? WhatsApp Bot desconectado');
        }
    }
}

module.exports = WhatsAppBot;