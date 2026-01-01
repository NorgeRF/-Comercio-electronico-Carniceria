// file name: scripts/debug-login.js
const { User } = require('../models');
const bcrypt = require('bcryptjs');

async function debugLogin() {
    console.log('?? DEBUG DEL LOGIN');
    console.log('===================');
    
    try {
        // 1. Buscar el usuario
        const user = await User.findOne({ 
            where: { email: 'admin@carniceria.com' } 
        });
        
        console.log('1. ¿Usuario encontrado?', user ? '? SÍ' : '? NO');
        
        if (user) {
            console.log('2. Datos del usuario:');
            console.log('   - ID:', user.id);
            console.log('   - Email:', user.email);
            console.log('   - Rol:', user.rol);
            console.log('   - Activo:', user.activo);
            console.log('   - Hash almacenado:', user.password_hash);
            console.log('   - Longitud del hash:', user.password_hash.length);
            
            // 3. Probar contraseña MANUALMENTE
            console.log('\n3. Probando contraseñas:');
            
            const testPasswords = [
                'Admin1234',
                'admin1234', 
                'Admin123',
                'admin123',
                'admin',
                'password',
                'Admin'
            ];
            
            for (const password of testPasswords) {
                const match = await bcrypt.compare(password, user.password_hash);
                console.log(`   - "${password}": ${match ? '? COINCIDE' : '? NO coincide'}`);
            }
            
            // 4. Generar NUEVO hash
            console.log('\n4. Generando NUEVO hash para "Admin1234":');
            const salt = await bcrypt.genSalt(10);
            const newHash = await bcrypt.hash('Admin1234', salt);
            console.log('   Nuevo hash:', newHash);
            console.log('   Longitud:', newHash.length);
            
            // 5. Comparar con el actual
            const matchNew = await bcrypt.compare('Admin1234', newHash);
            console.log('   ¿Nuevo hash funciona?:', matchNew ? '? SÍ' : '? NO');
            
        }
        
    } catch (error) {
        console.error('? ERROR:', error.message);
        console.error(error.stack);
    }
}

debugLogin();