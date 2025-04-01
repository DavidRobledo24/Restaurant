# Sistema de Validación e Impresión de Tickets
Este proyecto implementa un sistema de validación de códigos con impresión automática de tickets usando una impresora Zebra ZD230.

## Requisitos Previos
- Node.js instalado
- Impresora Zebra ZD230 conectada y configurada
- Navegador web moderno

## Instalación

1. Instalar las dependencias necesarias:
```bash
npm install express cors
```

2. Configurar la impresora Zebra ZD230:
   - Asegurarse que la impresora esté conectada vía USB
   - Configurar la impresora como predeterminada en Windows
   - Verificar que el nombre de la impresora sea "ZDesigner ZD230-203dpi ZPL"

## Estructura del Proyecto

```
proyecto-tickets/
├── server.js              # Servidor Node.js para manejar la impresión
├── prueba 1/             # Directorio del frontend
│   ├── index.html        # Página principal
│   ├── main.js           # Lógica del frontend
│   ├── styles.css        # Estilos de la página
│   └── particles.js      # Efectos visuales de partículas
└── README.md             # Documentación del proyecto
```

### Frontend (prueba 1/index.html)
```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cafetería</title>
    <link rel="icon" type="image/x-icon" href="favicon.ico">
    <link rel="stylesheet" href="styles.css">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</head>
<body>
    <div class="content">
        <h1>Bienvenido a mi proyecto</h1>
        <p>Este es un proyecto de prueba</p>
        
        <div class="input-container">
            <input type="text" id="numeroInput" placeholder="Ingresa un número" maxlength="5">
        </div>
    </div>

    <script src="particles.js"></script>
    <script src="main.js"></script>
</body>
</html>
```

### Estilos (prueba 1/styles.css)
```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: Arial, sans-serif;
    line-height: 1.6;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    color: white;
}

.content {
    position: relative;
    z-index: 1;
    padding: 20px;
    text-align: center;
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 15px;
    backdrop-filter: blur(5px);
    margin-top: 50px;
}

h1 {
    color: white;
    margin-bottom: 20px;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

p {
    color: rgba(255, 255, 255, 0.9);
    margin-bottom: 30px;
}

.input-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    max-width: 300px;
    margin: 20px auto;
    position: relative;
    padding: 3px;
    border-radius: 7px;
    background: linear-gradient(90deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #8800ff, #ff0000);
    background-size: 200% 100%;
    animation: gradientMove 3s linear infinite;
}

@keyframes gradientMove {
    0% { background-position: 0% 0%; }
    100% { background-position: 200% 0%; }
}

#numeroInput {
    width: 100%;
    padding: 12px;
    font-size: 16px;
    border: none;
    border-radius: 5px;
    outline: none;
    transition: background 0.3s ease;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    -webkit-appearance: textfield;
    -moz-appearance: textfield;
    appearance: textfield;
}

#numeroInput::placeholder {
    color: rgba(255, 255, 255, 0.6);
}

#numeroInput:focus {
    background: rgba(0, 0, 0, 0.9);
}

#numeroInput::-webkit-inner-spin-button,
#numeroInput::-webkit-outer-spin-button {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    margin: 0;
    display: none;
}

#numeroInput[type=number] {
    -webkit-appearance: textfield;
    -moz-appearance: textfield;
    appearance: textfield;
}
```

### Lógica Frontend (prueba 1/main.js)
```javascript
// Array de códigos válidos para pruebas
const codigosValidos = ['12345', '98765', '11111', '22222', '55555'];

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    // Obtener el input numérico
    const numeroInput = document.getElementById('numeroInput');

    // Prevenir la entrada de caracteres no numéricos y limitar a 5 dígitos
    numeroInput.addEventListener('keypress', function(e) {
        if (!/^\d*$/.test(e.key) && !e.ctrlKey && e.key !== 'Enter' && e.key !== 'Backspace') {
            e.preventDefault();
            return;
        }
        
        if (this.value.length >= 5 && e.key !== 'Enter' && e.key !== 'Backspace' && !e.ctrlKey) {
            e.preventDefault();
        }
    });

    // Validar cuando se pega contenido
    numeroInput.addEventListener('paste', function(e) {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        if (/^\d*$/.test(pastedText)) {
            const limitedText = pastedText.slice(0, 5);
            this.value = limitedText;
            if (limitedText.length === 5) {
                validarCodigo(limitedText);
            }
        }
    });

    // Limpiar caracteres no numéricos y limitar longitud
    numeroInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^\d]/g, '').slice(0, 5);
        if (this.value.length === 5) {
            validarCodigo(this.value);
        }
    });
});

// Función para validar el código ingresado
function validarCodigo(codigo) {
    if (codigosValidos.includes(codigo)) {
        fetch('http://localhost:3000/imprimir', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ contenido: { codigo } })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                Swal.fire({
                    title: '¡Código válido! ✅',
                    icon: 'success',
                    timer: 1000,
                    showConfirmButton: false,
                    position: 'top',
                    background: '#4CAF50',
                    color: '#fff',
                    toast: true
                });
                // Limpiar el input inmediatamente después de validar
                const input = document.getElementById('numeroInput');
                input.value = '';
                input.focus();
            } else {
                throw new Error(data.error || 'Error al imprimir');
            }
        })
        .catch(error => {
            Swal.fire({
                title: 'Error al imprimir ❌',
                text: error.message,
                icon: 'error',
                timer: 2000,
                showConfirmButton: false,
                position: 'top',
                background: '#f44336',
                color: '#fff',
                toast: true
            });
            // Limpiar el input en caso de error
            const input = document.getElementById('numeroInput');
            input.value = '';
            input.focus();
        });
    } else {
        Swal.fire({
            title: 'Código no válido ❌',
            icon: 'error',
            timer: 1000,
            showConfirmButton: false,
            position: 'top',
            background: '#f44336',
            color: '#fff',
            toast: true
        });
        // Limpiar el input inmediatamente si el código no es válido
        const input = document.getElementById('numeroInput');
        input.value = '';
        input.focus();
    }
}
```

### Servidor (server.js)
```javascript
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.post('/imprimir', async (req, res) => {
    try {
        const { contenido } = req.body;
        
        // Crear el comando ZPL
        const zplCommand = `
^XA
^FO50,50
^A0N,30,30
^FDTicket de Validación^FS
^FO50,100
^A0N,25,25
^FDCódigo: ${contenido.codigo}^FS
^FO50,150
^A0N,25,25
^FDFecha: ${new Date().toLocaleString()}^FS
^FO50,200
^GB700,1,3^FS
^XZ`;

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

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
```

## Características Implementadas

1. **Validación de Input**
   - Solo permite números
   - Máximo 5 dígitos
   - Validación automática al alcanzar 5 dígitos
   - Limpieza automática del input después de cada validación
   - Focus automático después de cada validación

2. **Alertas Personalizadas**
   - Uso de SweetAlert2 para notificaciones modernas
   - Alertas tipo toast en la parte superior
   - Colores diferentes para éxito y error
   - Desaparición automática después de 1-2 segundos

3. **Servidor Express**
   - Manejo de peticiones POST para impresión
   - Implementación de CORS
   - Manejo de errores simplificado
   - Respuestas JSON estructuradas

4. **Impresión de Tickets**
   - Generación de comandos ZPL
   - Formato personalizado del ticket
   - Inclusión de código y fecha
   - Envío directo a la impresora Zebra

## Uso del Sistema

1. Iniciar el servidor:
```bash
node server.js
```

2. Abrir el archivo `prueba 1/index.html` en un navegador web
```bash
python -m http.server 8000
```

3. Ingresar un código de 5 dígitos:
   - Si el código es válido, se imprimirá un ticket
   - Si el código es inválido, se mostrará un mensaje de error
   - El campo se limpiará automáticamente después de cada validación
   - El cursor permanecerá en el campo para continuar ingresando códigos

## Códigos Válidos
- 12345
- 98765
- 11111
- 22222
- 55555

## Solución de Problemas

1. **Problemas de Conexión con la Impresora**
   - Verificar que la impresora esté encendida y conectada
   - Comprobar que el nombre de la impresora sea correcto
   - Asegurarse que el servidor se ejecute como administrador

2. **Errores de Impresión**
   - Verificar que la impresora tenga papel
   - Comprobar que no haya atascos
   - Revisar los logs del servidor para más detalles

## Mantenimiento

- Mantener actualizada la lista de códigos válidos
- Revisar regularmente los logs del servidor
- Actualizar las dependencias cuando sea necesario
- Hacer copias de seguridad del código

## Notas Adicionales

- El sistema está diseñado para funcionar en Windows
- Se recomienda usar Chrome o Firefox para mejor compatibilidad
- La impresora debe estar configurada para interpretar comandos ZPL 