const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');

// Crear intención de pago
exports.createPaymentIntent = async (req, res) => {
    try {
        const { amount, orderId, metadata } = req.body;
        
        // Validar monto mínimo
        if (amount < 50) { // Mínimo 0.50€
            return res.status(400).json({ error: 'El monto mínimo es 0.50€' });
        }
        
        // Crear intención de pago en Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convertir a céntimos
            currency: 'eur',
            metadata: {
                orderId: orderId,
                ...metadata
            },
            description: `Pedido ${orderId} - Carnicería Tenerife`
        });
        
        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
        
    } catch (error) {
        console.error('Error al crear intención de pago:', error);
        res.status(500).json({ 
            error: 'Error al procesar el pago',
            details: error.message 
        });
    }
};

// Webhook para eventos de Stripe
exports.stripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('Error de webhook:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Manejar el evento
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            await handleSuccessfulPayment(paymentIntent);
            break;
            
        case 'payment_intent.payment_failed':
            const failedPayment = event.data.object;
            await handleFailedPayment(failedPayment);
            break;
            
        // Puedes añadir más casos según necesites
        default:
            console.log(`Evento no manejado: ${event.type}`);
    }
    
    res.json({ received: true });
};

// Manejar pago exitoso
async function handleSuccessfulPayment(paymentIntent) {
    try {
        const { orderId } = paymentIntent.metadata;
        
        // Actualizar pedido en la base de datos
        const order = await Order.findOne({ where: { codigo_pedido: orderId } });
        
        if (order) {
            await order.update({
                estado: 'confirmado',
                metodo_pago: 'tarjeta',
                stripe_payment_id: paymentIntent.id
            });
            
            console.log(`? Pago confirmado para pedido: ${orderId}`);
            
            // Aquí podrías enviar notificaciones por email o WhatsApp
        }
    } catch (error) {
        console.error('Error al procesar pago exitoso:', error);
    }
}

// Manejar pago fallido
async function handleFailedPayment(paymentIntent) {
    try {
        const { orderId } = paymentIntent.metadata;
        
        // Actualizar pedido como fallido
        const order = await Order.findOne({ where: { codigo_pedido: orderId } });
        
        if (order && order.estado === 'pendiente') {
            await order.update({
                estado: 'cancelado',
                notas: `Pago fallido: ${paymentIntent.last_payment_error?.message || 'Razón desconocida'}`
            });
            
            console.log(`? Pago fallido para pedido: ${orderId}`);
        }
    } catch (error) {
        console.error('Error al procesar pago fallido:', error);
    }
}

// Obtener métodos de pago de un cliente
exports.getCustomerPaymentMethods = async (req, res) => {
    try {
        const { customerId } = req.params;
        
        const paymentMethods = await stripe.paymentMethods.list({
            customer: customerId,
            type: 'card'
        });
        
        res.json(paymentMethods.data);
    } catch (error) {
        console.error('Error al obtener métodos de pago:', error);
        res.status(500).json({ 
            error: 'Error al obtener métodos de pago',
            details: error.message 
        });
    }
};

// Crear cliente en Stripe
exports.createStripeCustomer = async (req, res) => {
    try {
        const { email, name, phone } = req.body;
        
        const customer = await stripe.customers.create({
            email: email,
            name: name,
            phone: phone,
            metadata: {
                app: 'carniceria-tenerife'
            }
        });
        
        res.json({
            customerId: customer.id,
            message: 'Cliente creado en Stripe'
        });
    } catch (error) {
        console.error('Error al crear cliente en Stripe:', error);
        res.status(500).json({ 
            error: 'Error al crear cliente',
            details: error.message 
        });
    }
};