const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, 'views');
const files = [
    '404.ejs',
    'contact.ejs',
    'orders.ejs',
    'payment.ejs',
    'products.ejs'
];

files.forEach(filename => {
    const filePath = path.join(viewsDir, filename);
    
    try {
        // Leer como ASCII
        const content = fs.readFileSync(filePath, 'ascii');
        
        // Convertir caracteres problemáticos
        const utf8Content = content
            .replace(/í/g, 'í')
            .replace(/á/g, 'á')
            .replace(/é/g, 'é')
            .replace(/ó/g, 'ó')
            .replace(/ú/g, 'ú')
            .replace(/ñ/g, 'ñ')
            .replace(/Í/g, 'Í')
            .replace(/Á/g, 'Á')
            .replace(/É/g, 'É')
            .replace(/Ó/g, 'Ó')
            .replace(/Ú/g, 'Ú')
            .replace(/Ñ/g, 'Ñ');
        
        // Guardar como UTF-8
        fs.writeFileSync(filePath, utf8Content, 'utf8');
        
        console.log(`✅ Convertido: ${filename}`);
    } catch (error) {
        console.error(`❌ Error con ${filename}:`, error.message);
    }
});

console.log('🎉 Conversión completada');
