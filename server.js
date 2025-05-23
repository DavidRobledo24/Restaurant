const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { exec } = require('child_process');
const axios = require('axios');
const sharp = require('sharp');

const app = express();
const port = 3000;

const credentials = require('./bd-restaurante-455516-0e578bc4c013.json');
const spreadsheetId = '1tgzjQeTLgSlX7dPWexUeHlho9VezCIGUC2BI6fTzFCA';

const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/spreadsheets'
    ]
});

const sheets = google.sheets({ version: 'v4', auth });

// Modo de Prueba
let testMode = true;

app.use(cors());
app.use(express.json());

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

const ValidadorComida = require('./validarComida');
const validador = new ValidadorComida(sheets, spreadsheetId);

// Verificar código y devolver imagen/nombre
app.post('/verificar', async (req, res) => {
    try {
        const { codigo } = req.body;
        const resultado = await validador.verificarEstudiante(codigo);
        
        if (resultado.success) {
            res.json(resultado);
        } else {
            res.status(400).json(resultado);
        }
    } catch (error) {
        console.error('Error en verificar:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
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

// Array de palabras relacionadas con comida
const foodWords = [
    "apple", "banana", "bread", "butter", "carrot", "cheese", "chicken", "chocolate", "coffee", "cookie",
    "corn", "cream", "cucumber", "egg", "fish", "flour", "garlic", "grape", "honey", "ice cream",
    "juice", "lemon", "lettuce", "meat", "milk", "mushroom", "noodles", "onion", "orange", "pasta",
    "peach", "pear", "pepper", "pizza", "potato", "rice", "salad", "salt", "sandwich", "soup",
    "spinach", "steak", "strawberry", "sugar", "tea", "tomato", "water", "watermelon", "yogurt", "zucchini"
];

// Función para obtener la palabra del día
function obtenerPalabraDelDia() {
    const fechaActual = new Date();
    const diaDelAño = Math.floor((fechaActual - new Date(fechaActual.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    return foodWords[diaDelAño % foodWords.length]; // Seleccionar palabra basada en el día del año
}

// Función para formatear la fecha
function formatearFecha(fecha) {
    const opciones = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false // Deshabilitar formato AM/PM
    };
    return new Intl.DateTimeFormat('es-ES', opciones).format(fecha);
}

app.post('/imprimir', async (req, res) => {
    const tempFile = path.join(__dirname, 'temp.zpl'); 
    try {
        const { contenido } = req.body;

        if (!contenido || !contenido.codigo) {
            return res.status(400).json({ success: false, message: 'El campo "contenido.codigo" es obligatorio' });
        }

        const palabraDelDia = obtenerPalabraDelDia(); 
        const fechaFormateada = formatearFecha(new Date()); 

        const zplCommand = `
^XA
^FO200,50
^A0N,30,30
^FDTICKET DE VALIDACION^FS
^FO200,100
^A0N,25,25
^FDCODIGO: ${contenido.codigo}^FS
^FO200,150
^A0N,25,25
^FDFECHA: ${fechaFormateada}^FS
^FO200,200
^A0N,25,25
^FDPALABRA DEL DIA: ${palabraDelDia.toUpperCase()}^FS
^FO50,250
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