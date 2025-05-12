// Función para probar la conexión con el servidor
function probarConexion() {
    console.log('Probando conexión con el servidor...');
    fetch('http://localhost:3000/test')
        .then(response => response.json())
        .then(data => {
            console.log('Conexión exitosa:', data);
        })
        .catch(error => {
            console.error('Error de conexión:', error);
        });
}

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function () {
    probarConexion();

    const numeroInput = document.getElementById('numeroInput');
    const studentName = document.getElementById('studentName');
    const studentInfo = document.querySelector('.student-info');

    let hideNameTimeout; // Variable para el temporizador

    // Modificar el evento input para solo limpiar el input
    numeroInput.addEventListener('input', function () {
        this.value = this.value.replace(/[^\d]/g, '').slice(0, 8);
        ocultarNombre(); // Oculta el nombre al escribir otro valor
    });

    // Validar cuando se pega contenido
    numeroInput.addEventListener('paste', function (e) {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const codigo = pastedText.trim();
        if (/^\d*$/.test(codigo)) {
            this.value = codigo.slice(0, 8);
            ocultarNombre();
        }
    });

    // Ajustar el evento keydown para validar solo con Enter
    numeroInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const codigo = this.value.trim();
            if (codigo.length > 0) {
                validarCodigo(codigo); // Validar el código automáticamente
            }
        }
    });

    // Mantener el foco en el input
    function mantenerFoco() {
        numeroInput.focus();
    }

    numeroInput.focus();
    document.addEventListener('click', mantenerFoco);

    // Asegurar que el input esté siempre enfocado para recibir códigos
    document.addEventListener('click', function () {
        numeroInput.focus();
    });

    // Función para ocultar el nombre y restablecer la imagen predeterminada
    function ocultarNombre() {
        clearTimeout(hideNameTimeout);
        studentInfo.classList.remove('visible');
        studentName.textContent = '';
        const imgElement = document.getElementById('defaultImage');
        imgElement.src = 'images/person_13924070.png'; // Restablecer la imagen predeterminada
    }

    // Función para validar el código y traer el nombre del estudiante
    async function validarCodigo(codigo) {
        try {
            const response = await fetch('http://localhost:3000/verificar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codigo })
            });

            const data = await response.json();
            
            if (!data.success) {
                if (data.gradoNoPermitido) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'No Autorizado',
                        text: 'Estudiante no autorizado',
                        timer: 2000,
                        showConfirmButton: false,
                        position: 'top',
                        background: '#f44336',
                        color: '#fff',
                        toast: true
                    });
                } else {
                    Swal.fire({
                        title: 'Código no válido ❌',
                        text: data.message,
                        icon: 'error',
                        timer: 2000,
                        showConfirmButton: false,
                        position: 'top',
                        background: '#f44336',
                        color: '#fff',
                        toast: true
                    });
                }
                return;
            }

            studentName.textContent = data.nombre; // Nombre obtenido de Google Sheets
            studentInfo.classList.add('visible'); // Muestra la sección con el nombre

            const imgElement = document.getElementById('defaultImage');
            if (data.imagen) {
                const fileId = data.imagen.split('id=')[1]; // Extraer el ID del archivo
                imgElement.src = `http://localhost:3000/proxy-image?id=${fileId}`;
            } else {
                imgElement.src = 'images/person_13924070.png';
            }

            // Mostrar mensaje sobre el tipo de alimentación
            if (data.puedeReclamar) {
                Swal.fire({
                    title: `Puede reclamar ${data.tipoPermitido} ✅`,
                    icon: 'success',
                    timer: 3000,
                    showConfirmButton: false,
                    position: 'top',
                    background: '#4CAF50',
                    color: '#fff',
                    toast: true
                });
            } else {
                Swal.fire({
                    title: 'No puede reclamar alimentación ❌',
                    text: `Tipo asignado: ${data.tipoAlimentacion}`,
                    icon: 'warning',
                    timer: 3000,
                    showConfirmButton: false,
                    position: 'top',
                    background: '#FFC107',
                    color: '#000',
                    toast: true
                });
            }

            // Llamar al endpoint /imprimir para generar el ticket
            imprimirTicket(codigo);

            // Ocultar el nombre y restablecer la imagen después de 5 segundos
            hideNameTimeout = setTimeout(ocultarNombre, 3000);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            numeroInput.value = '';
            numeroInput.focus();
        }
    }

    // Función para llamar al endpoint /imprimir
    function imprimirTicket(codigo) {
        fetch('http://localhost:3000/imprimir', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contenido: {
                    codigo: codigo
                }
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al imprimir el ticket');
            }
            return response.json();
        })
        .then(data => {
            console.log('Ticket impreso correctamente:', data);
        })
        .catch(error => {
            console.error('Error al imprimir el ticket:', error);
        });
    }
});