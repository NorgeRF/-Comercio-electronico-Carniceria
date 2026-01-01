// Configuración global
const CONFIG = {
    apiBaseUrl: '/api',
    cartStorageKey: 'carniceria_cart',
    orderStorageKey: 'carniceria_order_data',
    currency: 'EUR',
    locale: 'es-ES',
    whatsappNumber: '+34600000000'
};

// Carrito de compras (YA FUNCIONA - NO TOCAR)
class ShoppingCart {
    constructor() {
        this.items = this.loadFromStorage();
        this.updateCartCount();
    }
    
    loadFromStorage() {
        const stored = localStorage.getItem(CONFIG.cartStorageKey);
        return stored ? JSON.parse(stored) : [];
    }
    
    saveToStorage() {
        localStorage.setItem(CONFIG.cartStorageKey, JSON.stringify(this.items));
        this.updateCartCount();
    }
    
    addItem(product, quantity = 1) {
        const existingIndex = this.items.findIndex(item => item.id == product.id);
        
        if (existingIndex > -1) {
            this.items[existingIndex].quantity += quantity;
        } else {
            this.items.push({
                id: product.id,
                name: product.name,
                price: parseFloat(product.price),
                unit: product.unit,
                quantity: quantity
            });
        }
        
        this.saveToStorage();
        this.showNotification(`${product.name} añadido - €${product.price}`);
        return this.items;
    }
    
    updateCartCount() {
        const countElements = document.querySelectorAll('.cart-count');
        const totalItems = this.getTotalItems();
        countElements.forEach(el => el.textContent = totalItems);
    }
    
    getTotalItems() {
        return this.items.reduce((total, item) => total + item.quantity, 0);
    }
    
    getTotalPrice() {
        return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    }
    
    showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            background: #28a745; color: white; padding: 15px 20px;
            border-radius: 5px; z-index: 9999;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        `;
        notification.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
    
    clear() {
        this.items = [];
        this.saveToStorage();
    }
}

// Instancia global del carrito
const cart = new ShoppingCart();

// ============================================
// SERVICIO DE PEDIDOS (NUEVO - PARA CREAR PEDIDOS)
// ============================================

class OrderService {
    // Verificar si el cliente está autenticado
    static async isAuthenticated() {
        try {
            const response = await fetch('/api/customer/profile');
            const data = await response.json();
            return data.success === true;
        } catch (error) {
            return false;
        }
    }
    
    // Obtener perfil del cliente
    static async getCustomerProfile() {
        try {
            const response = await fetch('/api/customer/profile');
            return await response.json();
        } catch (error) {
            return null;
        }
    }
    
    // Crear pedido
    static async createOrder(paymentMethod = 'efectivo', notes = '') {
        try {
            // Verificar que el carrito tenga productos
            if (!cart || cart.items.length === 0) {
                throw new Error('El carrito está vacío');
            }
            
            // Preparar datos del pedido
            const orderData = {
                productos: cart.items.map(item => ({
                    id: item.id,
                    cantidad: item.quantity,
                    precio: item.price,
                    notas: notes
                })),
                total: cart.getTotalPrice(),
                metodo_pago: paymentMethod,
                notas: notes
            };
            
            console.log('?? Enviando pedido:', orderData);
            
            // Enviar al backend
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Error al crear pedido');
            }
            
            return result;
            
        } catch (error) {
            console.error('? Error creando pedido:', error);
            throw error;
        }
    }
    
    // Función principal para crear pedidos
    static async submitOrder(paymentMethod = 'efectivo', notes = '') {
        try {
            // 1. Verificar autenticación
            const isAuthenticated = await this.isAuthenticated();
            if (!isAuthenticated) {
                const goToLogin = confirm('Debes iniciar sesión para hacer un pedido. ¿Ir a la página de login?');
                if (goToLogin) {
                    window.location.href = '/login-cliente';
                }
                return false;
            }
            
            // 2. Verificar perfil completo
            const profile = await this.getCustomerProfile();
            if (profile && profile.success) {
                const customer = profile.customer;
                if (!customer.telefono || !customer.direccion || !customer.ciudad) {
                    const completeProfile = confirm('Completa tu perfil (teléfono, dirección, ciudad) antes de hacer un pedido. ¿Completarlo ahora?');
                    if (completeProfile) {
                        window.location.href = '/mi-perfil';
                    }
                    return false;
                }
            }
            
            // 3. Crear pedido
            const result = await this.createOrder(paymentMethod, notes);
            
            if (result.success) {
                // Mostrar éxito
                alert(`? ¡Pedido creado!\nCódigo: ${result.order.codigo_pedido}\nTotal: €${result.order.total.toFixed(2)}`);
                
                // Vaciar carrito
                cart.clear();
                
                // Redirigir a mis pedidos
                setTimeout(() => {
                    window.location.href = '/mis-pedidos';
                }, 2000);
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('? Error en submitOrder:', error);
            alert(`? Error: ${error.message}`);
            return false;
        }
    }
}

// ============================================
// INICIALIZACIÓN DE LA PÁGINA DE PEDIDOS
// ============================================

function initializeOrdersPage() {
    console.log('?? Inicializando página de pedidos...');
    
    // Botón para crear pedido
    const createOrderBtn = document.getElementById('create-order-btn');
    if (createOrderBtn) {
        createOrderBtn.addEventListener('click', async function() {
            // Deshabilitar botón mientras procesa
            this.disabled = true;
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
            
            try {
                // Obtener método de pago seleccionado
                const paymentMethod = document.querySelector('input[name="payment-method"]:checked')?.value || 'efectivo';
                const notes = document.getElementById('order-notes')?.value || '';
                
                await OrderService.submitOrder(paymentMethod, notes);
            } finally {
                // Rehabilitar botón
                this.disabled = false;
                this.innerHTML = originalText;
            }
        });
    }
    
    // Mostrar/ocultar campos de Bizum
    document.querySelectorAll('input[name="payment-method"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const bizumFields = document.getElementById('bizum-fields');
            if (bizumFields) {
                bizumFields.style.display = this.value === 'bizum' ? 'block' : 'none';
            }
        });
    });
}

// ============================================
// FUNCIÓN PRINCIPAL PARA CAPTURAR CLICKS (YA FUNCIONA)
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('? Script cargado');
    
    // Actualizar contador del carrito
    cart.updateCartCount();
    
    // Capturar clicks en botones de añadir al carrito
    document.addEventListener('click', function(e) {
        let button = e.target;
        
        // Si es un icono, buscar el botón padre
        if (button.tagName === 'I' || button.tagName === 'SPAN') {
            button = button.closest('button, .btn, .add-to-cart');
        }
        
        // Verificar si es botón de añadir al carrito
        if (button && (
            button.classList.contains('add-to-cart') ||
            button.classList.contains('add-to-cart-btn') ||
            button.textContent.includes('Añadir') ||
            button.textContent.includes('añadir')
        )) {
            e.preventDefault();
            e.stopPropagation();
            
            // Extraer datos del botón
            const productData = {
                id: button.dataset.id || 'sin-id',
                name: button.dataset.name || button.dataset.nombre || 'Producto',
                price: button.dataset.price || button.dataset.precio || '0',
                unit: button.dataset.unit || button.dataset.unidad || 'unidad'
            };
            
            // Si no hay nombre, buscar en título cercano
            if (!productData.name || productData.name === 'Producto') {
                const card = button.closest('.card, .product-item, .col');
                if (card) {
                    const title = card.querySelector('h3, h4, h5, .card-title');
                    if (title) {
                        productData.name = title.textContent.trim();
                    }
                }
            }
            
            // Si no hay precio, buscar en elemento de precio cercano
            if (!productData.price || productData.price === '0') {
                const card = button.closest('.card, .product-item, .col');
                if (card) {
                    const priceElement = card.querySelector('.price, .precio');
                    if (priceElement) {
                        const priceText = priceElement.textContent;
                        const match = priceText.match(/(\d+[\.,]\d{2})/);
                        if (match) {
                            productData.price = match[1].replace(',', '.');
                        }
                    }
                }
            }
            
            // Añadir al carrito
            cart.addItem(productData, 1);
        }
    });
    
    // Inicializar página de pedidos si estamos en ella
    if (window.location.pathname === '/pedidos') {
        initializeOrdersPage();
    }
});

// ============================================
// FUNCIONES GLOBALES PARA USO DESDE HTML
// ============================================

// Función para crear pedido desde cualquier lugar
window.crearPedido = async function() {
    return await OrderService.submitOrder();
};

// Función para ver carrito
window.verCarrito = function() {
    console.log('?? Carrito:', cart.items);
    alert(`Tienes ${cart.getTotalItems()} productos en el carrito\nTotal: €${cart.getTotalPrice().toFixed(2)}`);
};

// Función para vaciar carrito
window.vaciarCarrito = function() {
    if (confirm('¿Vaciar todo el carrito?')) {
        cart.clear();
        alert('Carrito vaciado');
    }
};

// Exportar para uso global
window.cart = cart;
window.OrderService = OrderService;

console.log('?? Sistema de carrito y pedidos listo');