const { google } = require('googleapis');
const ValidadorGrado = require('./validadorGrado');

class ValidadorComida {
    constructor(sheets, spreadsheetId) {
        this.sheets = sheets;
        this.spreadsheetId = spreadsheetId;
        this.validadorGrado = new ValidadorGrado(sheets, spreadsheetId);
    }

    async registrarReclamo(codigo, tipoPermitido) {
        try {
            const nombreHoja = tipoPermitido === 'REFRIGERIO' ? 'Refrigerios' : 'Almuerzos';
            const fecha = new Date().toLocaleDateString('es-ES'); // Formato: DD/MM/YYYY

            // 1. Obtener datos actuales de la hoja
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: `${nombreHoja}!A:ZZ` // Obtener todas las columnas posibles
            });

            const filas = response.data.values || [];
            if (filas.length === 0) {
                throw new Error(`La hoja ${nombreHoja} está vacía`);
            }

            // 2. Encontrar o crear fila para el código
            let filaIndice = filas.findIndex(fila => fila[0] === codigo);
            if (filaIndice === -1) {
                // Si el código no existe, agregarlo
                await this.sheets.spreadsheets.values.append({
                    spreadsheetId: this.spreadsheetId,
                    range: `${nombreHoja}!A:A`,
                    valueInputOption: 'RAW',
                    resource: {
                        values: [[codigo]]
                    }
                });
                filaIndice = filas.length;
            }

            // 3. Encontrar o crear columna para la fecha actual
            const encabezados = filas[0] || [];
            let columnaIndice = encabezados.indexOf(fecha);
            
            if (columnaIndice === -1) {
                // Si la columna de la fecha no existe, crearla
                columnaIndice = encabezados.length;
                const columnaLetra = this.numeroAColumna(columnaIndice + 1);

                // Actualizar encabezado con la nueva fecha
                await this.sheets.spreadsheets.values.update({
                    spreadsheetId: this.spreadsheetId,
                    range: `${nombreHoja}!${columnaLetra}1`,
                    valueInputOption: 'RAW',
                    resource: {
                        values: [[fecha]]
                    }
                });
            }

            // 4. Verificar si ya reclamó hoy
            const reclamoHoy = filas[filaIndice] && filas[filaIndice][columnaIndice] === 'X';
            if (reclamoHoy) {
                return {
                    success: false,
                    message: `Ya reclamaste tu ${tipoPermitido.toLowerCase()} hoy`
                };
            }

            // 5. Registrar el reclamo
            const columnaLetra = this.numeroAColumna(columnaIndice + 1);
            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: `${nombreHoja}!${columnaLetra}${filaIndice + 1}`,
                valueInputOption: 'RAW',
                resource: {
                    values: [['X']]
                }
            });

            return {
                success: true,
                message: 'Reclamo registrado exitosamente'
            };
        } catch (error) {
            console.error('Error al registrar reclamo:', error);
            throw new Error('Error al registrar reclamo');
        }
    }

    numeroAColumna(num) {
        let columna = '';
        while (num > 0) {
            num--;
            columna = String.fromCharCode(65 + (num % 26)) + columna;
            num = Math.floor(num / 26);
        }
        return columna;
    }

    determinarTipoPermitido(tipoAlimentacion) {
        const horaActual = new Date().getHours();
        let puedeReclamar = false;
        let tipoPermitido = 'NINGUNO';

        if (tipoAlimentacion === 'REFRIGERIO' && horaActual >= 5 && horaActual < 11) {
            puedeReclamar = true;
            tipoPermitido = 'REFRIGERIO';
        } else if (tipoAlimentacion === 'ALMUERZO' && horaActual >= 12 && horaActual < 20) {
            puedeReclamar = true;
            tipoPermitido = 'ALMUERZO';
        } else if (tipoAlimentacion === 'REFRIGERIO Y ALMUERZO') {
            if (horaActual >= 5 && horaActual < 11) {
                puedeReclamar = true;
                tipoPermitido = 'REFRIGERIO';
            } else if (horaActual >= 12 && horaActual < 20) {
                puedeReclamar = true;
                tipoPermitido = 'ALMUERZO';
            }
        }

        return { puedeReclamar, tipoPermitido };
    }

    async verificarEstudiante(codigo) {
        try {
            // Primero validar el grado
            const validacionGrado = await this.validadorGrado.validarGradoEstudiante(codigo);
            
            // Si el grado no está permitido, retornar inmediatamente
            if (!validacionGrado.success) {
                return validacionGrado; // Ya incluye el mensaje y gradoNoPermitido: true
            }

            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'A:D'
            });

            const datos = response.data.values;
            const estudiante = datos.find(row => row[0] === codigo);

            if (!estudiante) {
                await Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Código no encontrado en la base de datos',
                    timer: 2000,
                    showConfirmButton: false,
                    position: 'top',
                    background: '#f44336',
                    color: '#fff',
                    toast: true
                });
                return {
                    success: false,
                    message: 'Código no válido'
                };
            }

            const [_, nombre, tipoAlimentacion, imagenOriginal] = estudiante;
            const { puedeReclamar, tipoPermitido } = this.determinarTipoPermitido(tipoAlimentacion);

            if (!puedeReclamar) {
                return {
                    success: false,
                    message: 'No es un horario válido para reclamar'
                };
            }

            // Validar si ya reclamó
            const validacionReclamo = await this.registrarReclamo(codigo, tipoPermitido);
            if (!validacionReclamo.success) {
                return validacionReclamo;
            }

            // Procesar imagen
            let imagenFinal = null;
            if (imagenOriginal) {
                const match = imagenOriginal.match(/\/d\/([a-zA-Z0-9_-]+)/);
                if (match && match[1]) {
                    imagenFinal = `https://drive.google.com/uc?export=view&id=${match[1]}`;
                } else {
                    imagenFinal = imagenOriginal;
                }
            }

            return {
                success: true,
                nombre,
                tipoAlimentacion,
                puedeReclamar,
                tipoPermitido,
                imagen: imagenFinal,
                grado: validacionGrado.grado
            };
        } catch (error) {
            console.error('Error en verificación:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al verificar el estudiante',
                timer: 2000,
                showConfirmButton: false,
                position: 'top',
                background: '#f44336',
                color: '#fff',
                toast: true
            });
            throw error;
        }
    }
}

module.exports = ValidadorComida;