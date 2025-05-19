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

const ValidadorComida = require('./validarComida');
const validador = new ValidadorComida(sheets, spreadsheetId);

app.use(cors());
app.use(express.json());

function formatearFecha(fecha) {
    const opciones = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    };
    return new Intl.DateTimeFormat('es-ES', opciones).format(fecha);
}

// ENDPOINT PRINCIPAL - PROCESAR TODO
app.post('/procesar', async (req, res) => {
    const tempFile = path.join(__dirname, `temp-${Date.now()}.txt`);
    try {
        const { codigo } = req.body;

        if (!codigo) {
            return res.status(400).json({ success: false, message: 'Código obligatorio' });
        }

        const resultado = await validador.verificarEstudiante(codigo, { soloValidar: true });
        if (!resultado.success) {
            return res.status(400).json(resultado);
        }

        const { nombre, tipoPermitido, palabraDelDia, grado } = resultado;
        const fechaFormateada = formatearFecha(new Date());

        // ESC/POS
        const negritaON = '\x1B\x45\x01';
        const negritaOFF = '\x1B\x45\x00';
        const tamañoMedio = '\x1D\x21\x10';
        const tamañoNormal = '\x1D\x21\x00';
        const cortar = '\x1B\x69';
        const salto = '\n';

        const ticketText =
            tamañoMedio +
            negritaON + 'TICKET DE VALIDACION' + negritaOFF + salto +
            tamañoNormal +
            'CODIGO: ' + codigo + salto +
            'FECHA: ' + fechaFormateada + salto +
            'PALABRA DEL DIA: ' + palabraDelDia.toUpperCase() + salto +
            '--------------------------' +
            salto.repeat(4) +
            cortar;

        fs.writeFileSync(tempFile, ticketText, { encoding: 'ascii' });

        const printCommand = `copy /b "${tempFile}" "\\\\localhost\\XP-80C"`;

        exec(printCommand, async (error, stdout, stderr) => {
            if (error) {
                console.error('🖨️ Error al imprimir:', error);
                return res.status(500).json({ success: false, message: 'Error al imprimir el ticket' });
            }

            console.log('✅ Impresión exitosa');

            try {
                await validador.registrarReclamo(codigo, tipoPermitido);
                res.json({ success: true, nombre, tipoPermitido, grado });
            } catch (registroError) {
                console.error('⚠️ Error al registrar reclamo:', registroError);
                res.json({ success: true, nombre, tipoPermitido, grado, advertencia: 'Impresión realizada, pero no se registró en el sistema.' });
            }

            fs.unlink(tempFile, () => {});
        });

    } catch (error) {
        console.error('❌ Error general en /procesar:', error);
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});