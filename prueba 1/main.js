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

    // Validar automáticamente cuando se ingresan 5 números
    numeroInput.addEventListener('input', function () {
        this.value = this.value.replace(/[^\d]/g, '').slice(0, 5);
        ocultarNombre(); // Oculta el nombre al escribir otro valor
        if (this.value.length === 5) {
            validarCodigo(this.value);
        }
    });

    // Validar cuando se pega contenido
    numeroInput.addEventListener('paste', function (e) {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const codigo = pastedText.trim();
        if (/^\d*$/.test(codigo)) {
            this.value = codigo.slice(0, 5);
            ocultarNombre();
            if (this.value.length === 5) {
                validarCodigo(this.value);
            }
        }
    });

    // Mantener el foco en el input
    function mantenerFoco() {
        numeroInput.focus();
    }

    numeroInput.focus();
    document.addEventListener('click', mantenerFoco);

    // Función para ocultar el nombre del estudiante
    function ocultarNombre() {
        clearTimeout(hideNameTimeout);
        studentInfo.classList.remove('visible');
        studentName.textContent = '';
    }

    // Función para validar el código y traer el nombre del estudiante
    function validarCodigo(codigo) {
        fetch('http://localhost:3000/verificar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ codigo })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                studentName.textContent = data.nombre; // Nombre obtenido de Google Sheets
                studentInfo.classList.add('visible'); // Muestra la sección con el nombre

                Swal.fire({
                    title: `Código válido ✅`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    position: 'top',
                    background: '#4CAF50',
                    color: '#fff',
                    toast: true
                });

                // Llamar al endpoint /imprimir para generar el ticket
                imprimirTicket(codigo);

                // Ocultar el nombre después de 5 segundos
                hideNameTimeout = setTimeout(ocultarNombre, 2000);
            } else {
                throw new Error(data.message);
            }
        })
        .catch(error => {
            Swal.fire({
                title: 'Código no válido ❌',
                text: error.message,
                icon: 'error',
                timer: 2000,
                showConfirmButton: false,
                position: 'top',
                background: '#f44336',
                color: '#fff',
                toast: true
            });
        })
        .finally(() => {
            numeroInput.value = '';
            numeroInput.focus();
        });
    }

    // Función para llamar al endpoint /imprimir
    function imprimirTicket(codigo) {
        fetch('http://localhost:3000/imprimir', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ codigo })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Swal.fire({
                //     title: 'Ticket generado e impreso ✅',
                //     icon: 'success',
                //     timer: 2000,
                //     showConfirmButton: false,
                //     position: 'top',
                //     background: '#4CAF50',
                //     color: '#fff',
                //     toast: true
                // });
            } else {
                throw new Error(data.message || 'Error al generar el ticket');
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
        });
    }
});