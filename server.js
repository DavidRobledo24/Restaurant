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
            range: 'A:B'
        });

        const datos = response.data.values;
        const estudiante = datos.find(row => row[0] === codigo);

        if (estudiante) {
            res.json({ success: true, nombre: estudiante[1] });
        } else {
            res.status(400).json({ success: false, message: 'Código no válido' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/imprimir', async (req, res) => {
    try {
        const { codigo } = req.body;
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'A:B'
        });

        const datos = response.data.values;
        const estudiante = datos.find(row => row[0] === codigo);

        if (!estudiante) {
            return res.status(400).json({ success: false, message: 'Código no válido' });
        }

        const nombreEstudiante = estudiante[1];

        const zplCommand = `
^XA
^FO200,50
^A0N,30,30
^FDTICKET DE VALIDACION^FS
^FO200,100
^A0N,25,25
^FDCODIGO: ${codigo}^FS
^FO200,150
^A0N,25,25
^FDESTUDIANTE: ${nombreEstudiante}^FS
^FO200,200
^A0N,25,25
^FDFECHA: ${new Date().toLocaleString()}^FS
^FO50,250
^GB700,1,3^FS
^XZ
        `;

        if (testMode) {
            console.log('--------------------------');
            console.log('MODO DE PRUEBA ACTIVADO');
            console.log('Comando ZPL que se enviaría:');
            console.log(zplCommand);
            console.log('--------------------------');

            res.json({ 
                success: true, 
                message: 'Ticket procesado en modo de prueba (no impreso)',
                testMode: true,
                zplCommand 
            });
            return;
        }

        const tempFile = path.join(__dirname, 'temp.zpl');
        fs.writeFileSync(tempFile, zplCommand);

        const printCommand = `print /D:"\\localhost\ZDesigner ZD230-203dpi ZPL" "${tempFile}"`;
        console.log("Enviando comando a la impresora:", printCommand);

        exec(printCommand, (error, stdout, stderr) => {
            fs.unlinkSync(tempFile);

            if (error) {
                console.error('Error al imprimir:', error);
                res.status(500).json({ success: false, error: error.message });
                return;
            }

            res.json({ success: true, message: 'Ticket impreso correctamente' });
        });
    } catch (error) {
        console.error('Error al imprimir:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
    console.log(`Modo de prueba ${testMode ? 'activado' : 'desactivado'}`);
});
