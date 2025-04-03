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
let testMode = false;

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
    const tempFile = path.join(__dirname, 'ZDesigner ZD230-203dpi ZPL'); // Definir el archivo temporal al inicio
    try {
        console.log('Solicitud recibida en /imprimir');
        const { codigo } = req.body;
        console.log('Código recibido:', codigo);

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'A:B'
        });

        const datos = response.data.values;
        const estudiante = datos.find(row => row[0] === codigo);
        console.log('Estudiante encontrado:', estudiante);

        if (!estudiante) {
            console.error('Código no válido:', codigo);
            return res.status(400).json({ success: false, message: 'Código no válido' });
        }

        const nombreEstudiante = estudiante[1];
        console.log('Nombre del estudiante:', nombreEstudiante);

        const zplCommand = `
^XA
^PW609
^LL406
^FO30,30
^A0N,40,40
^FDTICKET DE VALIDACION^FS
^FO30,80
^A0N,30,30
^FDCODIGO: ${codigo}^FS
^FO30,130
^A0N,30,30
^FDESTUDIANTE: ${nombreEstudiante}^FS
^FO30,180
^A0N,30,30
^FDFECHA: ${new Date().toLocaleString()}^FS
^FO30,230
^GB550,2,3^FS
^XZ
        `;
        console.log('Comando ZPL generado:', zplCommand);

        fs.writeFileSync(tempFile, zplCommand);
        console.log('Archivo temporal ZPL creado en:', tempFile);

        const printCommand = `print /D:"ZDesigner ZD230-203dpi ZPL" "${tempFile}"`;
        console.log('Comando de impresión generado:', printCommand);

        exec(printCommand, (error, stdout, stderr) => {
            try {
                if (error) {
                    console.error('Error al imprimir con "print":', error);
                    console.error('Detalles del error:', stderr);

                    // Intentar con el comando "copy" si "print" falla
                    const fallbackCommand = `copy "${tempFile}" "USB001"`;
                    console.log('Intentando con comando alternativo:', fallbackCommand);

                    exec(fallbackCommand, (fallbackError, fallbackStdout, fallbackStderr) => {
                        if (fallbackError) {
                            console.error('Error al imprimir con comando alternativo "copy":', fallbackError);
                            console.error('Detalles del error alternativo:', fallbackStderr);
                            return res.status(500).json({ success: false, error: fallbackError.message });
                        }

                        console.log('Salida del comando alternativo "copy":', fallbackStdout);
                        res.json({ success: true, message: 'Ticket impreso correctamente con comando alternativo' });
                    });

                    return;
                }

                console.log('Salida del comando de impresión "print":', stdout);
                res.json({ success: true, message: 'Ticket impreso correctamente' });
            } finally {
                // Asegurarse de eliminar el archivo temporal en todos los casos
                try {
                    fs.unlinkSync(tempFile);
                    console.log('Archivo temporal eliminado:', tempFile);
                } catch (unlinkError) {
                    console.error('Error al eliminar el archivo temporal:', unlinkError);
                }
            }
        });
    } catch (error) {
        console.error('Error en el endpoint /imprimir:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        // Asegurarse de eliminar el archivo temporal si ocurre un error antes de la impresión
        try {
            if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
                console.log('Archivo temporal eliminado en finally:', tempFile);
            }
        } catch (unlinkError) {
            console.error('Error al eliminar el archivo temporal en finally:', unlinkError);
        }
    }
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
    console.log(`Modo de prueba ${testMode ? 'activado' : 'desactivado'}`);
});