# Guía de Despliegue - GymFlow

Esta aplicación está construida con **React** (Frontend) y **Express** (Backend), utilizando **SQLite** como base de datos.

## 1. Hosting Recomendado

Para una aplicación de este tipo, necesitas un entorno que soporte **Node.js**.

### Opción A: Hostinger (VPS)
Si usas Hostinger, el plan de "Hosting Compartido" estándar **no** suele ser suficiente para aplicaciones Node.js personalizadas con base de datos. Te recomendamos un **VPS (Servidor Virtual Privado)**:
1. Compra un plan VPS en Hostinger.
2. Instala una imagen de **Ubuntu con Node.js**.
3. Sube tu código usando Git o FTP.
4. Ejecuta `npm install` y `npm run build`.
5. Usa un gestor de procesos como **PM2** para mantener la app siempre activa.

### Opción B: Render o Railway (Más fácil)
Son plataformas modernas donde solo conectas tu repositorio de GitHub:
1. Crea una cuenta en [Render.com](https://render.com) o [Railway.app](https://railway.app).
2. Conecta este repositorio.
3. Configura el comando de inicio: `npm start`.
4. **Importante**: SQLite es un archivo (`gym.db`). En estas plataformas, los archivos se borran al reiniciar a menos que configures un **Disco Persistente (Volume)**.

## 2. Configuración de Base de Datos

### Gestión de SQLite
Actualmente la app usa SQLite, que guarda todo en el archivo `gym.db`.
- **Ventaja**: No necesitas configurar un servidor de base de datos aparte.
- **Desventaja**: Si borras el archivo, borras los datos.

### Pasar a PostgreSQL (Recomendado para producción)
Si planeas tener muchos usuarios, te recomiendo cambiar a PostgreSQL:
1. Crea una base de datos en Hostinger o un servicio como Supabase.
2. Cambia la librería `better-sqlite3` por `pg` en el servidor.
3. Actualiza las consultas SQL en `server.ts` (la sintaxis es casi idéntica).

## 3. Ponerlo en Línea (Paso a Paso)

1. **Build**: Ejecuta `npm run build` localmente para generar la carpeta `dist`.
2. **Variables de Entorno**: Asegúrate de configurar `NODE_ENV=production` en tu servidor.
3. **Puerto**: El servidor está configurado para escuchar en el puerto `3000`. Asegúrate de que tu hosting permita tráfico en ese puerto o usa un Proxy Inverso (como Nginx) para redirigir el tráfico del puerto 80 al 3000.

---
*Nota: Si necesitas ayuda específica con un panel de control de Hostinger, consulta su documentación sobre "Node.js Deployment".*
