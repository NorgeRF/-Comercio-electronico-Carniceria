// file name: scripts/verify-password.js
const bcrypt = require('bcryptjs');

// El hash de tu SQL
const hashFromSQL = '$2a$10$N9qo8uLOickgx2ZMRZoMye.Lb2wZ2W6Zt7cJ5lWfCQz7zQ1qG4JXK';
const testPassword = 'Admin1234';

bcrypt.compare(testPassword, hashFromSQL)
  .then(result => {
    console.log('?? Verificación de contraseña:');
    console.log(`Hash: ${hashFromSQL}`);
    console.log(`Password probado: ${testPassword}`);
    console.log(`¿Coincide?: ${result ? '? SÍ' : '? NO'}`);
    
    if (!result) {
      console.log('\n?? Generando nuevo hash para Admin1234...');
      bcrypt.genSalt(10)
        .then(salt => bcrypt.hash(testPassword, salt))
        .then(newHash => {
          console.log(`\nNuevo hash para insertar en SQL:`);
          console.log(`INSERT IGNORE INTO usuarios (nombre, email, password_hash, rol) VALUES`);
          console.log(`('Administrador', 'admin@carniceria.com', '${newHash}', 'admin');`);
        });
    }
  })
  .catch(err => console.error('Error:', err));