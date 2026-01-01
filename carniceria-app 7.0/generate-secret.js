#!/usr/bin/env node
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Generar secret
const secret = crypto.randomBytes(64).toString('hex');

// Ruta del archivo .env
const envPath = path.join(__dirname, '.env');

// Leer .env actual
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

// Reemplazar o añadir JWT_SECRET
if (envContent.includes('JWT_SECRET=')) {
  envContent = envContent.replace(
    /JWT_SECRET=.*/,
    `JWT_SECRET=${secret}`
  );
} else {
  envContent += `\nJWT_SECRET=${secret}\n`;
}

// Guardar
fs.writeFileSync(envPath, envContent);
console.log('? JWT_SECRET generado y guardado en .env');
console.log(`?? Clave generada: ${secret.substring(0, 20)}...`);