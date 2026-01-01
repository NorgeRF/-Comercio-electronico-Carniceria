Proyecto en Desarrollo para la Gestión del Comercio Online de Cárniceria

Completamente Dokerizado 

📋 PREREQUISITOS
# 1. Actualizar sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar dependencias
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# 3. Agregar repositorio oficial de Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. Instalar Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# 5. Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 6. Verificar instalación
docker --version
docker-compose --version

📥 INSTALACIÓN DE DOCKER Y DOCKER COMPOSE

# 1. Construir las imágenes
docker-compose build

# 2. Levantar todos los servicios
docker-compose up -d


# 3. Ver logs en tiempo real
docker-compose logs -f

# 4. Ver estado de los contenedores
docker-compose ps

# Luego en el navegador
http://localhost:3000 (Comercio Online)
http://localhost:3000/admin (Gestión)

contacto creador: norgerf@gmail.com
