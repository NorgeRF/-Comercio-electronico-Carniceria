const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

async function createUserWithRealHash() {
  console.log('🔐 Creando usuario con hash REAL...');
  
  const password = 'Admin1234';
  
  try {
    // Generar hash REAL
    console.log('Generando hash para:', password);
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    
    console.log('✅ Hash generado:', hash);
    console.log('Longitud:', hash.length);
    
    // Verificar que funciona
    const isValid = await bcrypt.compare(password, hash);
    console.log('Verificación con bcrypt:', isValid);
    
    // Insertar en la base de datos
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'db',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'carniceria',
      password: process.env.DB_PASSWORD || 'carne123',
      database: process.env.DB_NAME || 'carniceria_db'
    });
    
    // Actualizar usuario existente
    await connection.execute(
      'UPDATE usuarios SET password_hash = ?, intentos_fallidos = 0, bloqueado_hasta = NULL WHERE email = ?',
      [hash, 'admin@carniceria.com']
    );
    
    console.log('✅ Usuario actualizado en la BD');
    console.log('📋 Credenciales:');
    console.log('   Email: admin@carniceria.com');
    console.log('   Password: Admin1234');
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Solo ejecutar si es llamado directamente
if (require.main === module) {
  createUserWithRealHash();
}

module.exports = { createUserWithRealHash };
