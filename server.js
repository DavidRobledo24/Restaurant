const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const app = express();
const port = 3000;

// Variable para controlar el modo de prueba
let testMode = true; // true = no imprime tickets, false = imprime tickets normalmente

// Configura tus credenciales
const auth = new google.auth.GoogleAuth({
  keyFile: './prueba 1/bd-restaurante-455516-0e578bc4c013.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

// ID del Google Sheet y rango
const spreadsheetId = '1tgzjQeTLgSlX7dPWexUeHlho9VezCIGUC2BI6fTzFCA';
const range = 'Estudiantes!A:A'; // Cambiado para solo incluir la columna A

app.use(cors());
app.use(express.json());

// Endpoint de prueba
app.get('/test', (req, res) => {
    console.log('Prueba de conexión recibida');
    res.json({ message: 'Conexión exitosa con el servidor' });
});

// Endpoint para cambiar el modo de prueba
app.post('/toggleTestMode', (req, res) => {
    testMode = !testMode;
    console.log(`Modo de prueba ${testMode ? 'activado' : 'desactivado'}`);
    res.json({ 
        success: true, 
        testMode,
        message: `Modo de prueba ${testMode ? 'activado' : 'desactivado'}`
    });
});

// Endpoint para consultar el estado del modo de prueba
app.get('/testMode', (req, res) => {
    res.json({ 
        testMode,
        message: `Modo de prueba está ${testMode ? 'activado' : 'desactivado'}`
    });
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
    try {
        const { contenido } = req.body;
        
        // Crear el comando ZPL con texto más a la derecha y sin caracteres especiales
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
^XZ`;

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
        const tempFile = path.join(__dirname, 'temp.zpl');
        fs.writeFileSync(tempFile, zplCommand);

        // Enviar a la impresora usando el comando de Windows
        const exec = require('child_process').exec;
        const printCommand = `copy "${tempFile}" "\\\\localhost\\ZDesigner ZD230-203dpi ZPL"`;
        
        exec(printCommand, (error, stdout, stderr) => {
            // Eliminar el archivo temporal
            fs.unlinkSync(tempFile);

            if (error) {
                res.status(500).json({ success: false, error: error.message });
                return;
            }

            res.json({ success: true, message: 'Ticket impreso correctamente' });
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/estudiantes', async (req, res) => {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (rows.length) {
      const estudiantes = rows.map(row => ({
        codigo: row[0],
        nombre: row[1],
        imagen: row[2],
      }));
      res.json(estudiantes);
    } else {
      res.status(404).send('No data found.');
    }
  } catch (error) {
    res.status(500).send('Error retrieving data');
  }
});

app.get('/validar-codigo/:codigo', async (req, res) => {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    const codigoIngresado = req.params.codigo;

    if (rows.length) {
      const codigos = rows.map(row => row[0]);
      const existe = codigos.includes(codigoIngresado);

      if (existe) {
        res.json({ success: true, message: 'Código válido' });
      } else {
        res.json({ success: false, message: 'Código no encontrado' });
      }
    } else {
      res.status(404).send('No data found.');
    }
  } catch (error) {
    console.error('Error retrieving data:', error);
    res.status(500).send('Error retrieving data');
  }
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
    console.log(`Modo de prueba ${testMode ? 'activado' : 'desactivado'}`);
    // Verificar estado inicial de la impresora
    verificarImpresora().then(() => {
        console.log('Verificación inicial de impresora completada');
    }).catch(error => {
        console.error('Error en verificación inicial de impresora:', error);
    });
}); 