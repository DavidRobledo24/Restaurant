const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { exec } = require('child_process');
const axios = require('axios'); // Asegúrate de instalar axios con `npm install axios`
const sharp = require('sharp'); // Asegúrate de instalar sharp con `npm install sharp`

const app = express();
const port = 3000;

// Cargar credenciales de Google Sheets
const credentials = require('./bd-restaurante-455516-0e578bc4c013.json');
const spreadsheetId = '1tgzjQeTLgSlX7dPWexUeHlho9VezCIGUC2BI6fTzFCA';

// Autenticación con Google Sheets API
const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
});

const sheets = google.sheets({ version: 'v4', auth });

// Modo de Prueba
let testMode = true;

app.use(cors());
app.use(express.json());

// Endpoint de prueba
app.get('/test', (req, res) => {
    res.json({ message: 'Conexión exitosa con el servidor' });
});

app.post('/toggleTestMode', (req, res) => {
    testMode = !testMode;
    res.json({ success: true, testMode });
});

app.get('/testMode', (req, res) => {
    res.json({
        testMode,
        message: `Modo de prueba está ${testMode ? 'activado' : 'desactivado'}`
    });
});

// Obtener códigos y nombres
async function obtenerCodigos() {
    try {
        const range = 'A:B';
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range
        });

        const filas = response.data.values;
        if (!filas || filas.length === 0) return {};

        let codigosMap = {};
        filas.forEach(fila => {
            if (fila.length >= 2) {
                const [codigo, nombre] = fila;
                codigosMap[codigo] = nombre;
            }
        });

        return codigosMap;
    } catch (error) {
        console.error('Error obteniendo códigos:', error);
        return {};
    }
}

// Verificar enlace de imagen
async function verificarEnlaceImagen(url) {
    try {
        const response = await axios.head(url); // Realizar una solicitud HEAD para verificar el enlace
        return response.status === 200; // Retornar true si el enlace es accesible
    } catch (error) {
        console.error('Error verificando enlace de imagen:', error.message);
        return false;
    }
}

// Verificar código y devolver imagen/nombre
app.post('/verificar', async (req, res) => {
    try {
        const { codigo } = req.body;

        // Consultar solo el rango necesario
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'A:D' // Incluye columna de la imagen y tipo de alimentación
        });

        const datos = response.data.values;
        const estudiante = datos.find(row => row[0] === codigo); // Buscar solo el código específico

        if (estudiante) {
            const nombre = estudiante[1];
            const tipoAlimentacion = estudiante[2] || 'NINGUNO'; // Columna C
            const imagenOriginal = estudiante[3] || null;
            let imagenFinal = null;

            // Determinar el tipo de alimentación permitido según la hora actual
            const horaActual = new Date().getHours();
            let puedeReclamar = false;
            let tipoPermitido = 'NINGUNO';

            if (tipoAlimentacion === 'REFRIGERIO' && horaActual >= 9 && horaActual < 11) {
                puedeReclamar = true;
                tipoPermitido = 'REFRIGERIO';
            } else if (tipoAlimentacion === 'ALMUERZO' && horaActual >= 12 && horaActual < 14) {
                puedeReclamar = true;
                tipoPermitido = 'ALMUERZO';
            } else if (tipoAlimentacion === 'REFRIGERIO Y ALMUERZO' && horaActual >= 9 && horaActual < 14) {
                if (horaActual >= 9 && horaActual < 11) {
                    puedeReclamar = true;
                    tipoPermitido = 'REFRIGERIO'; // Usar tipoPermitido para indicar la opción actual
                } else if (horaActual >= 12 && horaActual < 14) {
                    puedeReclamar = true;
                    tipoPermitido = 'ALMUERZO'; // Usar tipoPermitido para indicar la opción actual
                }
            }

            if (imagenOriginal) {
                const match = imagenOriginal.match(/\/d\/([a-zA-Z0-9_-]+)/);
                if (match && match[1]) {
                    const fileId = match[1];
                    imagenFinal = `https://drive.google.com/uc?export=view&id=${fileId}`;
                } else {
                    imagenFinal = imagenOriginal; // Usar el enlace original si no es de Google Drive
                }
            }

            res.json({
                success: true,
                nombre,
                tipoAlimentacion,
                puedeReclamar,
                tipoPermitido,
                imagen: imagenFinal
            });
        } else {
            res.status(400).json({ success: false, message: 'Código no válido' });
        }
    } catch (error) {
        console.error('Error en verificar:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Crear el directorio de caché si no existe
const cacheDir = path.join(__dirname, 'cache');
if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir);
}

app.get('/proxy-image', async (req, res) => {
    const { id } = req.query; // Obtener el ID de la imagen desde la query string
    if (!id) {
        return res.status(400).json({ success: false, message: 'Falta el parámetro "id"' });
    }

    const cachedImagePath = path.join(cacheDir, `${id}.jpg`); // Ruta de la imagen en caché

    // Verificar si la imagen ya está en caché
    if (fs.existsSync(cachedImagePath)) {
        console.log(`Sirviendo imagen desde caché: ${cachedImagePath}`);
        return res.sendFile(cachedImagePath);
    }

    const googleDriveUrl = `https://drive.google.com/uc?export=view&id=${id}`;
    try {
        const response = await axios.get(googleDriveUrl, { responseType: 'stream' });
        const tempImagePath = path.join(cacheDir, `${id}-temp.jpg`);
        const writeStream = fs.createWriteStream(tempImagePath);

        response.data.pipe(writeStream);

        writeStream.on('finish', async () => {
            try {
                // Redimensionar la imagen y guardarla en caché
                await sharp(tempImagePath)
                    .resize(300, 300) // Cambiar el tamaño a 300x300 píxeles
                    .toFile(cachedImagePath);

                fs.unlinkSync(tempImagePath); // Eliminar la imagen temporal
                console.log(`Imagen redimensionada y guardada en caché: ${cachedImagePath}`);
                res.sendFile(cachedImagePath);
            } catch (error) {
                console.error('Error al redimensionar la imagen:', error.message);
                res.status(500).json({ success: false, message: 'Error al procesar la imagen' });
            }
        });

        writeStream.on('error', (error) => {
            console.error('Error al guardar la imagen temporal:', error.message);
            res.status(500).json({ success: false, message: 'Error al guardar la imagen' });
        });
    } catch (error) {
        console.error('Error al obtener la imagen desde Google Drive:', error.message);
        res.status(500).json({ success: false, message: 'No se pudo obtener la imagen' });
    }
});

// Verificar estado de impresora
function verificarImpresora() {
    return new Promise((resolve, reject) => {
        exec('wmic printer get name,portname,status', (error, stdout, stderr) => {
            if (error) {
                console.error('Error al verificar impresora:', error);
                reject(error);
                return;
            }
            console.log('Estado de las impresoras:', stdout);
            resolve(stdout);
        });
    });
}

// Endpoint para imprimir
app.post('/imprimir', async (req, res) => {
    const tempFile = path.join(__dirname, 'temp.zpl');
    try {
        const { contenido } = req.body;
        if (!contenido || !contenido.codigo) {
            return res.status(400).json({ success: false, message: 'El campo "contenido.codigo" es obligatorio' });
        }

        const zplCommand = `
^XA
^FO200,50
^A0N,30,30^GB700,1,3^FS
^FDTICKET DE VALIDACION^FS
^FO200,100
^A0N,25,25
^FDCODIGO: ${contenido.codigo}^FS
^FO200,150
^A0N,25,25
^FDFECHA: ${new Date().toLocaleString()}^FS
^FO50,200
^GB700,1,3^FS
^XZ
        `;

        if (testMode) {
            console.log('MODO DE PRUEBA - Comando ZPL que se enviaría:', zplCommand);
            res.json({
                success: true,
                message: 'Ticket procesado en modo de prueba (no impreso)',
                testMode: true,
                zplCommand
            });
            return;
        }

        fs.writeFileSync(tempFile, zplCommand);
        console.log('Archivo temporal ZPL creado:', tempFile);

        const printCommand = `copy "${tempFile}" "\\\\localhost\\ZDesigner ZD230-203dpi ZPL"`;

        exec(printCommand, (error, stdout, stderr) => {
            if (error) {
                console.error('Error al imprimir:', error);
                res.status(500).json({ success: false, error: error.message });
                return;
            }

            console.log('Impresión exitosa:', stdout);
            res.json({ success: true, message: 'Ticket impreso correctamente' });

            if (fs.existsSync(tempFile)) {
                try {
                    fs.unlinkSync(tempFile);
                    console.log('Archivo temporal eliminado:', tempFile);
                } catch (unlinkError) {
                    console.error('Error al eliminar archivo temporal:', unlinkError);
                }
            }
        });
    } catch (error) {
        console.error('Error en /imprimir:', error);

        if (fs.existsSync(tempFile)) {
            try {
                fs.unlinkSync(tempFile);
            } catch (unlinkError) {
                console.error('Error limpiando archivo tras fallo:', unlinkError);
            }
        }

        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
    console.log(`Modo de prueba ${testMode ? 'activado' : 'desactivado'}`);
});