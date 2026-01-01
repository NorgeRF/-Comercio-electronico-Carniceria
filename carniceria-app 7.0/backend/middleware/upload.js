// file name: middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Crear directorios necesarios
const uploadsDir = path.join(__dirname, '../uploads');
const publicUploadsDir = path.join(__dirname, '../public/uploads');
const publicImagesDir = path.join(__dirname, '../public/images');

// Crear directorios si no existen
[uploadsDir, publicUploadsDir, publicImagesDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configuración de almacenamiento TEMPORAL
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir); // Guardar temporalmente en uploads/
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = 'product-' + uniqueSuffix + ext;
        cb(null, filename);
    }
});

// Filtrar tipos de archivo
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)'));
    }
};

// Configurar multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: fileFilter
});

// Middleware para subir imágenes de productos
exports.uploadProductImage = upload.single('imagen');

// Función para mover archivo a pública - CORREGIDA
exports.moveToPublic = (tempFilename, categoria) => {
    try {
        const tempPath = path.join(uploadsDir, tempFilename);
        
        // Verificar que el archivo temporal existe
        if (!fs.existsSync(tempPath)) {
            throw new Error(`Archivo temporal no encontrado: ${tempFilename}`);
        }
        
        // Crear nombre seguro para la categoría
        const categoriaFolder = categoria 
            ? categoria.toLowerCase().replace(/[^a-z0-9]/g, '_')
            : 'otros';
        
        const categoriaPath = path.join(publicUploadsDir, categoriaFolder);
        
        // Crear carpeta de categoría si no existe
        if (!fs.existsSync(categoriaPath)) {
            fs.mkdirSync(categoriaPath, { recursive: true });
        }
        
        // Nuevo nombre con categoría y timestamp
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1E9);
        const ext = path.extname(tempFilename).toLowerCase();
        const newFilename = `${categoriaFolder}_${timestamp}_${random}${ext}`;
        const newPath = path.join(categoriaPath, newFilename);
        
        // Mover archivo
        fs.renameSync(tempPath, newPath);
        
        console.log(`? Archivo movido: ${tempFilename} -> ${newPath}`);
        
        // Retornar ruta pública
        return `/uploads/${categoriaFolder}/${newFilename}`;
        
    } catch (error) {
        console.error('? Error moviendo archivo:', error);
        throw error;
    }
};

// Función para eliminar archivo - MEJORADA
exports.deleteFile = (filepath) => {
    try {
        if (!filepath) return;
        
        let fullPath = null;
        
        // Determinar la ruta completa
        if (filepath.startsWith('/uploads/')) {
            fullPath = path.join(__dirname, '../public', filepath);
        } else if (filepath.startsWith('/images/')) {
            fullPath = path.join(__dirname, '../public', filepath);
        } else if (fs.existsSync(filepath)) {
            fullPath = filepath;
        }
        
        if (fullPath && fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            console.log(`??? Archivo eliminado: ${filepath}`);
            return true;
        }
        
        console.log(`?? Archivo no encontrado: ${filepath}`);
        return false;
        
    } catch (error) {
        console.error('? Error eliminando archivo:', error);
        return false;
    }
};

// Función para obtener imágenes existentes por categoría
exports.getExistingImages = (categoria) => {
    try {
        const categoriaFolder = categoria.toLowerCase();
        
        // Buscar en ambas ubicaciones
        const pathsToCheck = [
            path.join(publicImagesDir, categoriaFolder),
            path.join(publicUploadsDir, categoriaFolder)
        ];
        
        let images = [];
        
        pathsToCheck.forEach(imgPath => {
            if (fs.existsSync(imgPath)) {
                const files = fs.readdirSync(imgPath)
                    .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
                    .map(file => {
                        // Determinar la ruta pública
                        if (imgPath.includes('public/images')) {
                            return `/images/${categoriaFolder}/${file}`;
                        } else {
                            return `/uploads/${categoriaFolder}/${file}`;
                        }
                    });
                
                images = [...images, ...files];
            }
        });
        
        return images;
        
    } catch (error) {
        console.error('Error obteniendo imágenes existentes:', error);
        return [];
    }
};

// Limpiar archivos temporales viejos
exports.cleanupTempFiles = () => {
    try {
        const files = fs.readdirSync(uploadsDir);
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 horas
        
        files.forEach(file => {
            const filePath = path.join(uploadsDir, file);
            try {
                const stats = fs.statSync(filePath);
                
                if (now - stats.mtimeMs > maxAge) {
                    fs.unlinkSync(filePath);
                    console.log(`?? Archivo temporal eliminado: ${file}`);
                }
            } catch (statError) {
                console.error(`Error obteniendo stats de ${file}:`, statError);
            }
        });
    } catch (error) {
        console.error('Error limpiando archivos temporales:', error);
    }
};

// Función para copiar imagen de ejemplo si no hay imágenes
exports.copySampleImage = (categoria) => {
    try {
        const categoriaFolder = categoria.toLowerCase();
        const targetDir = path.join(publicUploadsDir, categoriaFolder);
        
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        
        const sampleImage = path.join(__dirname, '../public/images/sample.jpg');
        if (fs.existsSync(sampleImage)) {
            const destPath = path.join(targetDir, 'sample_product.jpg');
            fs.copyFileSync(sampleImage, destPath);
            return `/uploads/${categoriaFolder}/sample_product.jpg`;
        }
        
        return null;
    } catch (error) {
        console.error('Error copiando imagen de ejemplo:', error);
        return null;
    }
};