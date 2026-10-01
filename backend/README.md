# Backend - API FastAPI (Despliegue en Amazon EC2)

API REST desarrollada con **FastAPI**, **SQLAlchemy** y **Boto3** para la plataforma de videos. Conectada a **Amazon RDS** (PostgreSQL o MySQL) y **Amazon S3** (Buckets de Videos y Miniaturas).

---

## 📁 Estructura del Backend
- `main.py`: Definición de la app FastAPI, endpoints y CORS.
- `models.py`: Modelos SQLAlchemy para la BD (`User`, `Video`, `Comment`).
- `schemas.py`: Esquemas de validación Pydantic para requests y responses.
- `database.py`: Conexión a la base de datos (RDS o SQLite de respaldo).
- `auth_utils.py`: Hashing y verificación de contraseñas seguras con PBKDF2-HMAC-SHA256.
- `s3_utils.py`: Funciones para subida y eliminación de videos y miniaturas en S3.
- `requirements.txt`: Dependencias del proyecto.
- `setup_ec2.sh`: Script para automatizar la instalación y arranque en EC2.
- `fastapi.service`: Archivo para configurar FastAPI como servicio en segundo plano (`systemd`).
- `.env.example`: Plantilla de variables de entorno.

---

## 🛠️ Endpoints implementados

### Usuarios
- `POST /users`: Registro de cuenta (Nombre, Correo, Contraseña).
- `POST /login`: Inicio de sesión (Correo, Contraseña).
- `GET /users/{id}`: Información del perfil, conteo de videos y lista de videos del usuario.

### Videos
- `POST /videos`: Publicación de video (Sube archivos MP4 y JPG/PNG directo a sus respectivos buckets de S3).
- `POST /videos/json`: Publicación directa pasando URLs.
- `GET /videos`: Catálogo principal de videos (con soporte para `?user_id=X`).
- `GET /videos/{id}`: Detalle de reproducción (incrementa vistas, carga comentarios y videos recomendados).
- `GET /videos/{id}/recommended`: Videos recomendados dinámicamente.
- `PUT /videos/{id}`: Actualización de título y descripción.
- `DELETE /videos/{id}`: Eliminación de video y limpieza en S3.

### Comentarios
- `POST /videos/{id}/comments`: Agregar comentario a un video.
- `GET /videos/{id}/comments`: Listar comentarios de un video.

### Documentación
- `GET /docs`: Swagger UI interactivo.

---

## 🚀 Pasos para desplegar en Amazon EC2

### 1. Requisitos en AWS
1. **Instancia EC2**: Ubuntu 22.04 / 24.04 o Amazon Linux 2023 (tipo `t2.micro` o `t3.micro`).
2. **Security Group de EC2**:
   - Inbound Rule: **SSH (puerto 22)** desde tu IP o 0.0.0.0/0.
   - Inbound Rule: **Custom TCP (puerto 8000)** desde 0.0.0.0/0 (para acceder a la API y `/docs`).
3. **IAM Role para EC2**:
   - Adjuntar a la instancia un IAM Role con la política `AmazonS3FullAccess` (o `LabRole` si estás en AWS Academy Learner Lab).
4. **Base de Datos RDS (PostgreSQL o MySQL)**:
   - En el Security Group de RDS, permitir tráfico en el puerto 5432 (PostgreSQL) o 3306 (MySQL) desde el Security Group de tu EC2.

### 2. Conexión y clonación en EC2
Conéctate por SSH a tu instancia:
```bash
ssh -i tu-llave.pem ubuntu@<IP_PUBLICA_EC2>
```

Clona tu repositorio:
```bash
git clone <URL_DE_TU_REPOSITORIO>
cd First-term-exam-Practical/backend
```

### 3. Configurar variables de entorno
Copia la plantilla y edita las variables:
```bash
cp .env.example .env
nano .env
```

Configura tu base de datos de RDS y tus buckets de S3:
```ini
DATABASE_URL=postgresql://postgres:tu_password@tu-rds-endpoint.us-east-1.rds.amazonaws.com:5432/nombre_db
AWS_REGION=us-east-1
S3_BUCKET_VIDEOS=tu-bucket-videos
S3_BUCKET_THUMBNAILS=tu-bucket-miniaturas
```

### 4. Ejecutar la API
Puedes usar el script automatizado:
```bash
chmod +x setup_ec2.sh
./setup_ec2.sh
```

O hacerlo paso a paso:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 5. Mantener la API corriendo en segundo plano (Opcional pero recomendado)
Para que no se apague al cerrar la terminal:
```bash
sudo cp fastapi.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable fastapi
sudo systemctl start fastapi
sudo systemctl status fastapi
```

Verifica la API en tu navegador:
`http://<IP_PUBLICA_EC2>:8000/docs`
