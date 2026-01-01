// backend/scripts/generate-hash.js
const bcrypt = require('bcrypt');

const password = 'Admin1234';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
        console.error('Error generando hash:', err);
        return;
    }
    console.log(`Password: ${password}`);
    console.log(`Hash: ${hash}`);
    console.log('\nPara verificar:');
    console.log(`bcrypt.compare("Admin1234", "${hash}")`);
});