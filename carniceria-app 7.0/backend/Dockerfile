FROM node:18-alpine

WORKDIR /app

# Instalar dependencias necesarias
RUN apk add --no-cache mysql-client bash curl python3 make g++

# 1. Copiar SOLO los archivos de dependencias
COPY package*.json ./

# Instalar dependencias y reconstruir bcrypt específicamente para Alpine
RUN npm install && \
    npm rebuild bcrypt --build-from-source

# 3. Copiar el resto de la aplicacion
COPY . .

# 4. Crear directorios necesarios
RUN mkdir -p uploads public/images && chmod -R 755 uploads public/images

# 5. Exponer puerto
EXPOSE 3000

# 6. Establecer locale para UTF-8
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# 6. Comando de inicio
CMD ["sh", "-c", "echo '?? Iniciando aplicacion...' && npm start"]


