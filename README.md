# Genius Portal - Backend

Backend de la aplicación Genius Educa para gestión de fichas de estimulación y rutinas semanales.

## Características

- ✅ Autenticación de niñeras (registro y login)
- ✅ Gestión de rutinas semanales
- ✅ Historial de cambios
- ✅ Base de datos SQLite
- ✅ API REST con autenticación JWT

## Instalación Local

### Requisitos
- Node.js 16+
- npm o yarn

### Pasos

1. **Clonar el repositorio**
```bash
git clone https://github.com/geniuseducando/genius-portal.git
cd genius-portal
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con tus valores
```

4. **Iniciar servidor en desarrollo**
```bash
npm run dev
```

5. **Servidor en producción**
```bash
npm start
```

## Endpoints de API

### Autenticación
- `POST /api/auth/register` - Registrar niñera
- `POST /api/auth/login` - Login de niñera

### Rutinas
- `GET /api/routines` - Obtener todas las rutinas del usuario
- `POST /api/routines` - Crear nueva rutina
- `GET /api/routines/:id` - Obtener rutina específica
- `PUT /api/routines/:id` - Actualizar rutina
- `DELETE /api/routines/:id` - Eliminar rutina

### Salud
- `GET /api/health` - Verificar estado del servidor

## Despliegue en Render

Ver instrucciones en el manual de usuario.

## Licencia

MIT
