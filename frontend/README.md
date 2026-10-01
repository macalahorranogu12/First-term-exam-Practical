# Frontend - Single Page Application (SPA en React + Vite)

Aplicación web desarrollada con **React** y **Vite**, diseñada para ser alojada en un **Bucket S3 de Amazon Web Services (Bucket 1: Frontend)** como sitio estático.

---

## 📄 Páginas implementadas (según requerimientos)

1. **Página 1: Registro / Login (`AuthPage`)**:
   - Registro de usuarios (`POST /users`): Nombre, Correo y Contraseña.
   - Inicio de sesión (`POST /login`): Correo y Contraseña.
   - Persistencia de sesión con `localStorage`.

2. **Página 2: Principal (`HomePage`)**:
   - Catálogo dinámico de videos desde la API (`GET /videos`).
   - Cada tarjeta muestra: Miniatura, Título, Usuario autor, Número de vistas y Fecha de publicación.

3. **Página 3: Reproductor (`PlayerPage`)**:
   - Reproducción de video HTML5 (`video_url` alojado en S3).
   - Título, Descripción, Usuario, Número de vistas (incrementadas automáticamente).
   - Sección interactiva de Comentarios (`POST /videos/{id}/comments` y `GET /videos/{id}/comments`).
   - Lista dinámica de Videos recomendados (`recommended_videos`).

4. **Página 4: Perfil del usuario (`ProfilePage`)**:
   - Información básica del usuario y contador de videos subidos (`GET /users/{id}`).
   - Publicación de videos con subida de archivo `.mp4` y miniatura (`.jpg`/`.png`) a S3 (`POST /videos`).
   - Actualización de título y descripción (`PUT /videos/{id}`).
   - Eliminación de videos (`DELETE /videos/{id}`).

---

## 🚀 Despliegue en Amazon S3 (Bucket Frontend)

### 1. Configurar la URL de la API
Crea un archivo `.env` en la carpeta `frontend/`:
```bash
cp .env.example .env
```
Y edita `VITE_API_URL` con la IP pública de tu EC2:
```ini
VITE_API_URL=http://<IP_PUBLICA_EC2>:8000
```
*(Nota: Si no lo configuras antes de compilar, la aplicación incluye un botón de configuración ⚙️ en la barra superior para ingresar o cambiar la IP de la API en vivo).*

### 2. Generar el compilado de producción (`dist/`)
```bash
npm install
npm run build
```
Esto creará la carpeta:
```
dist/
├── assets/
│   ├── index-xxxx.css
│   └── index-xxxx.js
├── favicon.svg
├── icons.svg
└── index.html
```

### 3. Configurar el Bucket S3 en AWS
1. **Crear Bucket:** Ejemplo `frontend-martincalahorrano`.
2. **Desactivar "Block all public access"** (Bloquear todo el acceso público).
3. **Habilitar Static Website Hosting:**
   - Ve a **Properties > Static website hosting > Edit**.
   - Selecciona **Enable**.
   - Hosting type: **Host a static website**.
   - Index document: `index.html`.
   - Error document: `index.html`.
   - Guarda los cambios.
4. **Política de Bucket (Permissions > Bucket policy):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::NOMBRE_DE_TU_BUCKET_FRONTEND/*"
    }
  ]
}
```

### 4. Subir únicamente el contenido de `dist/` a S3
Sube los archivos y carpetas que están **adentro** de `dist/`:
- Sube `index.html`, `favicon.svg`, `icons.svg` y la carpeta `assets/`.
- ⚠️ **NO subas:** `src/`, `node_modules/`, `package.json`, ni la carpeta padre `dist` misma.

Abre la **URL del endpoint del sitio web estático** que te da AWS en la pestaña *Properties* (ej: `http://nombre-bucket.s3-website-us-east-1.amazonaws.com`).
