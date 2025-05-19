const ValidadorGrado = require('./validadorGrado');

class ValidadorComida {
    constructor(sheets, spreadsheetId) {
        this.sheets = sheets;
        this.spreadsheetId = spreadsheetId;
        this.validadorGrado = new ValidadorGrado(sheets, spreadsheetId);
    }

    async registrarReclamo(codigo, tipoPermitido) {
        const nombreHoja = tipoPermitido === 'REFRIGERIO' ? 'Refrigerios' : 'Almuerzos';
        const fecha = new Date();
        const fechaFormateada = fecha.toLocaleDateString('es-ES');
        const horaFormateada = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
        const registroCompleto = `${fechaFormateada} ${horaFormateada}`;

        const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: `${nombreHoja}!A:ZZ`
        });

        const filas = response.data.values || [];
        if (filas.length === 0) throw new Error(`La hoja ${nombreHoja} está vacía`);

        let encabezados = filas[0];
        let columnaIndice = encabezados.indexOf(fechaFormateada);

        if (columnaIndice === -1) {
            columnaIndice = encabezados.length;
            const columnaLetra = this.numeroAColumna(columnaIndice + 1);
            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: `${nombreHoja}!${columnaLetra}1`,
                valueInputOption: 'RAW',
                resource: {
                    values: [[fechaFormateada]]
                }
            });
            encabezados.push(fechaFormateada);
        }

        let filaIndice = filas.findIndex(fila => fila[0] === codigo);
        if (filaIndice === -1) {
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

        const columnaLetra = this.numeroAColumna(columnaIndice + 1);
        await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `${nombreHoja}!${columnaLetra}${filaIndice + 1}`,
            valueInputOption: 'RAW',
            resource: {
                values: [[registroCompleto]]
            }
        });

        return {
            success: true,
            message: 'Reclamo registrado exitosamente'
        };
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
        } else if (tipoAlimentacion === 'ALMUERZO' && horaActual >= 11 && horaActual < 20) {
            puedeReclamar = true;
            tipoPermitido = 'ALMUERZO';
        } else if (tipoAlimentacion === 'REFRIGERIO Y ALMUERZO') {
            if (horaActual >= 5 && horaActual < 11) {
                puedeReclamar = true;
                tipoPermitido = 'REFRIGERIO';
            } else if (horaActual >= 11 && horaActual < 20) {
                puedeReclamar = true;
                tipoPermitido = 'ALMUERZO';
            }
        }

        return { puedeReclamar, tipoPermitido };
    }

    async validarReclamoPrevio(codigo, tipoPermitido) {
        const nombreHoja = tipoPermitido === 'REFRIGERIO' ? 'Refrigerios' : 'Almuerzos';
        const fechaFormateada = new Date().toLocaleDateString('es-ES');

        const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: `${nombreHoja}!A:ZZ`
        });

        const filas = response.data.values || [];
        if (filas.length === 0) return false;

        const encabezados = filas[0];
        const columnaIndice = encabezados.indexOf(fechaFormateada);
        if (columnaIndice === -1) return false;

        const filaIndice = filas.findIndex(fila => fila[0] === codigo);
        if (filaIndice === -1) return false;

        const filaEstudiante = filas[filaIndice] || [];
        return !!filaEstudiante[columnaIndice];
    }

    obtenerLinkDirectoDesdeDrive(urlOriginal) {
        const match = urlOriginal.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
        if (match && match[1]) {
            return `https://drive.google.com/uc?export=view&id=${match[1]}`;
        }
        return urlOriginal;
    }

    async verificarEstudiante(codigo, opciones = {}) {
        const validacionGrado = await this.validadorGrado.validarGradoEstudiante(codigo);
        if (!validacionGrado.success) return validacionGrado;

        const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: 'A:D'
        });

        const datos = response.data.values;
        const estudiante = datos.find(row => row[0] === codigo);
        if (!estudiante) return { success: false, message: 'Código no válido' };

        const [_, nombre, tipoAlimentacion, imagenOriginal] = estudiante;
        const { puedeReclamar, tipoPermitido } = this.determinarTipoPermitido(tipoAlimentacion);
        if (!puedeReclamar) return { success: false, message: 'No es un horario válido para reclamar' };

        const yaReclamo = await this.validarReclamoPrevio(codigo, tipoPermitido);
        if (yaReclamo) {
            return {
                success: false,
                message: `Ya reclamaste tu ${tipoPermitido.toLowerCase()} hoy`
            };
        }

        if (!opciones.soloValidar) {
            await this.registrarReclamo(codigo, tipoPermitido);
        }

        const palabraDelDia = this.obtenerPalabraDelDia();
        const imagenFinal = this.obtenerLinkDirectoDesdeDrive(imagenOriginal);

        return {
            success: true,
            nombre,
            tipoAlimentacion,
            puedeReclamar,
            tipoPermitido,
            imagen: imagenFinal,
            grado: validacionGrado.grado,
            palabraDelDia
        };
    }

    obtenerPalabraDelDia() {
        const foodWords = [
            "apple", "banana", "bread", "butter", "carrot", "cheese", "chicken", "chocolate", "coffee", "cookie",
            "corn", "cream", "cucumber", "egg", "fish", "flour", "garlic", "grape", "honey", "ice cream",
            "juice", "lemon", "lettuce", "meat", "milk", "mushroom", "noodles", "onion", "orange", "pasta",
            "peach", "pear", "pepper", "pizza", "potato", "rice", "salad", "salt", "sandwich", "soup",
            "spinach", "steak", "strawberry", "sugar", "tea", "tomato", "water", "watermelon", "yogurt", "zucchini"
        ];
        const fechaActual = new Date();
        const diaDelAño = Math.floor((fechaActual - new Date(fechaActual.getFullYear(), 0, 0)) / 86400000);
        return foodWords[diaDelAño % foodWords.length];
    }
}

module.exports = ValidadorComida;
