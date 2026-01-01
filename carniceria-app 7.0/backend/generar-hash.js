const bcrypt = require('bcrypt');

async function generateHash() {
  const password = 'Admin1234';
  const saltRounds = 10;
  
  console.log('🔐 Generando hash para:', password);
  
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('✅ Hash generado:');
    console.log(hash);
    console.log('\n📋 Longitud:', hash.length);
    console.log('🏷️  Prefijo:', hash.substring(0, 10));
    
    // Verificar que funciona
    const isValid = await bcrypt.compare(password, hash);
    console.log('✔️  Verificación:', isValid ? 'CORRECTO' : 'INCORRECTO');
    
    return hash;
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

generateHash();
