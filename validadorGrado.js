class ValidadorGrado {
    constructor(sheets, spreadsheetId) {
        this.sheets = sheets;
        this.spreadsheetId = spreadsheetId;
        this.gradosNoPermitidos = ['K2', 'K3', 'K4', 'K5', '1', '2'];
    }

    async validarGradoEstudiante(codigo) {
        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'A:E'
            });

            const filas = response.data.values || [];
            const estudiante = filas.find(fila => fila[0] === codigo);

            if (!estudiante) {
                await Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Estudiante no encontrado en la base de datos',
                    timer: 2000,
                    showConfirmButton: false,
                    position: 'top',
                    background: '#f44336',
                    color: '#fff',
                    toast: true
                });
                return {
                    success: false,
                    message: 'Estudiante no encontrado'
                };
            }

            const grado = estudiante[4];

            if (this.gradosNoPermitidos.includes(grado)) {
                // Alerta corregida para grado no permitido
                await Swal.fire({
                    icon: 'warning',
                    title: 'Grado No Autorizado',
                    html: `<div style="color: #856404; background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 10px 0;">
                            <strong>Atención</strong><br>
                            Los estudiantes de grado ${grado} no están autorizados para reclamar alimentación.
                          </div>`,
                    timer: 3000,
                    showConfirmButton: false,
                    position: 'top',
                    background: '#fff',
                    toast: true
                });
                return {
                    success: false,
                    message: 'Grado no autorizado',
                    gradoNoPermitido: true
                };
            }

            return {
                success: true,
                grado: grado
            };
        } catch (error) {
            console.error('Error al validar grado:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al validar el grado del estudiante',
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

module.exports = ValidadorGrado;