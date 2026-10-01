#!/bin/bash
# ==============================================================
# Script de instalación y arranque para la API FastAPI en EC2
# Compatible con Ubuntu 22.04 / 24.04 y Amazon Linux 2023
# ==============================================================

set -e

echo "=== Actualizando paquetes del sistema ==="
if [ -f /etc/debian_version ]; then
    sudo apt-get update -y
    sudo apt-get install -y python3 python3-pip python3-venv git
elif [ -f /etc/system-release ]; then
    sudo dnf update -y
    sudo dnf install -y python3 python3-pip git
fi

echo "=== Configurando entorno virtual de Python ==="
python3 -m venv venv
source venv/bin/activate

echo "=== Instalando dependencias ==="
pip install --upgrade pip
pip install -r requirements.txt

echo "=== Creando archivo .env si no existe ==="
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Se ha creado un archivo .env con valores por defecto. Edítalo con: nano .env"
fi

echo "=== Iniciando FastAPI con Uvicorn en el puerto 8000 ==="
echo "La documentación estará disponible en: http://<IP_PUBLICA_EC2>:8000/docs"
uvicorn main:app --host 0.0.0.0 --port 8000
