const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { exec } = require('child_process');

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

app.post('/verificar', async (req, res) => {
    try {
        const { codigo } = req.body;
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'A:D' // Incluir la columna D que contiene las imágenes
        });

        const datos = response.data.values;
        const estudiante = datos.find(row => row[0] === codigo);

        if (estudiante) {
            res.json({ 
                success: true, 
                nombre: estudiante[1], 
                imagen: estudiante[3] // URL de la imagen
            });
        } else {
            res.status(400).json({ success: false, message: 'Código no válido' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Función para verificar el estado de la impresora
function verificarImpresora() {
    return new Promise((resolve, reject) => {
        const exec = require('child_process').exec;
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

app.post('/imprimir', async (req, res) => {
    const tempFile = path.join(__dirname, 'temp.zpl'); // Archivo temporal para el comando ZPL
    try {
        const { contenido } = req.body;

        // Validar que el cuerpo de la solicitud tenga el formato correcto
        if (!contenido || !contenido.codigo) {
            return res.status(400).json({ success: false, message: 'El campo "contenido.codigo" es obligatorio' });
        }

        // Crear el comando ZPL con texto alineado y sin caracteres especiales
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
^FDFECHA: ${new Date().toLocaleString()}^FS
^FO50,200
^GB700,1,3^FS
^XZ
        `;

        if (testMode) {
            // En modo de prueba, solo logueamos el comando ZPL
            console.log('MODO DE PRUEBA - Comando ZPL que se enviaría:', zplCommand);
            res.json({ 
                success: true, 
                message: 'Ticket procesado en modo de prueba (no impreso)',
                testMode: true,
                zplCommand 
            });
            return;
        }

        // Guardar el comando ZPL en un archivo temporal
        fs.writeFileSync(tempFile, zplCommand);
        console.log('Archivo temporal ZPL creado en:', tempFile);

        // Enviar a la impresora usando el comando de Windows
        const exec = require('child_process').exec;
        const printCommand = `copy "${tempFile}" "\\\\localhost\\ZDesigner ZD230-203dpi ZPL"`;

        exec(printCommand, (error, stdout, stderr) => {
            // Eliminar el archivo temporal
            try {
                fs.unlinkSync(tempFile);
                console.log('Archivo temporal eliminado:', tempFile);
            } catch (unlinkError) {
                console.error('Error al eliminar el archivo temporal:', unlinkError);
            }

            if (error) {
                console.error('Error al imprimir:', error);
                console.error('Detalles del error:', stderr);
                res.status(500).json({ success: false, error: error.message });
                return;
            }

            console.log('Salida del comando de impresión:', stdout);
            res.json({ success: true, message: 'Ticket impreso correctamente' });
        });

    } catch (error) {
        console.error('Error en el endpoint /imprimir:', error);

        // Intentar eliminar el archivo temporal si ocurre un error
        try {
            if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
                console.log('Archivo temporal eliminado tras error:', tempFile);
            }
        } catch (unlinkError) {
            console.error('Error al eliminar el archivo temporal tras error:', unlinkError);
        }

        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
    console.log(`Modo de prueba ${testMode ? 'activado' : 'desactivado'}`);
});