# Sistema de Validación e Impresión de Tickets
Sistema de validación de códigos con impresión automática de tickets usando una impresora Zebra ZD230 e integración con Google Sheets.

## Requisitos Previos
- Node.js
- Impresora Zebra ZD230
- Credenciales de Google Cloud Platform

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar impresora Zebra ZD230:
   - Conectar vía USB
   - Configurar como predeterminada
   - Nombre: "ZDesigner ZD230-203dpi ZPL"

3. Configurar las credenciales de Google Sheets:
   - Colocar el archivo de credenciales `bd-restaurante-455516-0e578bc4c013.json` en la raíz del proyecto

## Estructura del Proyecto

```
proyecto-tickets/
├── server.js              # Servidor Node.js principal
├── package.json          # Configuración del proyecto
├── cache/               # Directorio para caché de imágenes
├── iniciar_servidor.bat  # Script para iniciar el servidor
├── crear_acceso_directo.bat # Script para crear acceso directo
├── desactivar_inicio_automatico.bat # Script para desactivar inicio
├── Principal/            # Directorio del frontend
│   ├── index.html       # Página principal
│   ├── main.js          # Lógica del frontend
│   ├── styles.css       # Estilos de la página
│   └── particles.js     # Efectos visuales
└── README.md            # Documentación
```

## Características Principales

1. **Integración con Google Sheets**
   - Validación de códigos contra base de datos en tiempo real
   - Obtención de información del estudiante
   - Verificación de tipo de alimentación

2. **Gestión de Imágenes**
   - Caché local de imágenes de estudiantes
   - Redimensionamiento automático
   - Proxy para imágenes de Google Drive

3. **Control de Horarios**
   - Validación según tipo de alimentación
   - Horarios específicos para refrigerio y almuerzo
   - Control automático de acceso

4. **Sistema de Impresión**
   - Generación dinámica de tickets ZPL
   - Modo de prueba para debugging
   - Palabra del día en cada ticket
   - Formateo personalizado de fecha y hora

5. **Scripts de Automatización**
   - Inicio automático del servidor
   - Creación de accesos directos
   - Control de servicios

## APIs y Endpoints

### Servidor
- `GET /test` - Verificar conexión
- `POST /toggleTestMode` - Cambiar modo de prueba
- `GET /testMode` - Consultar estado del modo de prueba
- `POST /verificar` - Validar código y obtener datos
- `GET /proxy-image` - Proxy para imágenes
- `POST /imprimir` - Imprimir ticket

## Horarios de Servicio
- **Refrigerio**: 9:00 - 11:00
- **Almuerzo**: 12:00 - 14:00

## Comandos

```bash
# Iniciar todo
npm run dev

# Solo servidor
npm run dev:server

# Solo cliente
npm run dev:client
```

## Scripts de Automatización
- `iniciar_servidor.bat`: Inicia el sistema
- `crear_acceso_directo.bat`: Configura inicio automático
- `desactivar_inicio_automatico.bat`: Elimina inicio automático

## Endpoints Principales
- `POST /verificar`: Valida código y devuelve datos
- `GET /proxy-image`: Proxy para imágenes
- `POST /imprimir`: Imprime ticket
- `GET /testMode`: Consulta modo prueba
- `POST /toggleTestMode`: Cambia modo prueba

## Solución de Problemas Comunes

1. **Error de Impresión**
   - Verificar conexión USB
   - Comprobar modo prueba
   - Revisar nombre impresora

2. **Error Google Sheets**
   - Verificar credenciales
   - Comprobar permisos
   - Validar formato datos

3. **Error de Imágenes**
   - Limpiar /cache
   - Verificar permisos
   - Comprobar enlaces Drive

   Mejorar el registro de reclamos.

   Manejo de las imagenes dentro del sistema - comprimir imagenes.
   Modulo para la descarga de imagenes locales con el nombre del codigo correspondiente.

   Validacion diaria de cambios en la base de datos.

   Lectura de codigo a tiempo de real, validacion instantanea

   