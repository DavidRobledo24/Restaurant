// Configuración de estudiantes y sus códigos
const estudiantesConfig = {
    '12345': {
        nombre: 'María Fernández',
        imagen: 'images/student_1.png'
    },
    '98765': {
        nombre: 'Carlos Mendoza',
        imagen: 'images/student_2.png'
    },
    '11111': {
        nombre: 'Ana García',
        imagen: 'images/student_3.png'
    },
    '22222': {
        nombre: 'Luis Rodríguez',
        imagen: 'images/student_1.png'
    },
    '55555': {
        nombre: 'Patricia Torres',
        imagen: 'images/student_2.png'
    }
};

// Array de códigos válidos para pruebas
const codigosValidos = Object.keys(estudiantesConfig);

// Configuración de imágenes
const imageConfig = {
    defaultImage: 'images/person_13924070.png'
};

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
document.addEventListener('DOMContentLoaded', function() {
    // Probar conexión al cargar la página
    probarConexion();

    // Obtener el input numérico y elementos de la UI
    const numeroInput = document.getElementById('numeroInput');
    const userImage = document.getElementById('userImage');
    const studentInfo = document.querySelector('.student-info');
    const defaultImage = document.querySelector('.default-image-container');
    const studentName = document.getElementById('studentName');

    // Manejar el evento keydown para el lector de códigos de barras
    numeroInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const codigo = this.value.trim();
            if (codigo.length > 0) {
                validarCodigo(codigo);
            }
        }
    });

    // Limpiar caracteres no numéricos y limitar longitud
    numeroInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^\d]/g, '').slice(0, 5);
        
        if (this.value.length === 5) {
            validarCodigo(this.value);
        } else {
            // Mostrar imagen por defecto si se borra el código
            defaultImage.style.display = 'flex';
            studentInfo.classList.remove('visible');
            studentName.textContent = '';
        }
    });

    // Validar cuando se pega contenido
    numeroInput.addEventListener('paste', function(e) {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const codigo = pastedText.trim();
        if (/^\d*$/.test(codigo)) {
            this.value = codigo.slice(0, 5);
            if (this.value.length === 5) {
                validarCodigo(this.value);
            }
        }
    });

    // Asegurar que el input tenga el foco al cargar la página
    numeroInput.focus();

    // Mantener el foco en el input
    document.addEventListener('click', function() {
        numeroInput.focus();
    });
});

// Función para validar el código ingresado
function validarCodigo(codigo) {
    const studentInfo = document.querySelector('.student-info');
    const defaultImage = document.querySelector('.default-image-container');
    const studentName = document.getElementById('studentName');
    const userImage = document.getElementById('userImage');

    if (codigosValidos.includes(codigo)) {
        // Obtener la información del estudiante
        const estudiante = estudiantesConfig[codigo];
        
        // Ocultar imagen por defecto y mostrar información del estudiante
        defaultImage.style.display = 'none';
        studentName.textContent = estudiante.nombre;
        userImage.src = estudiante.imagen;
        studentInfo.classList.add('visible');

        // Imprimir el ticket
        fetch('http://localhost:3000/imprimir', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                contenido: { 
                    codigo,
                    nombre: estudiante.nombre,
                    imagen: estudiante.imagen
                }
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                Swal.fire({
                    title: '¡Ticket impreso! ✅',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    position: 'top',
                    background: '#4CAF50',
                    color: '#fff',
                    toast: true
                });
                // Limpiar el input después de una impresión exitosa
                const input = document.getElementById('numeroInput');
                input.value = '';
                input.focus();
                // Mostrar imagen por defecto después de imprimir
                setTimeout(() => {
                    studentInfo.classList.remove('visible');
                    defaultImage.style.display = 'flex';
                }, 3000);
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
            // Mostrar imagen por defecto en caso de error
            defaultImage.style.display = 'flex';
            studentInfo.classList.remove('visible');
            // Limpiar el input en caso de error
            const input = document.getElementById('numeroInput');
            input.value = '';
            input.focus();
        });
    } else {
        // Código no válido
        defaultImage.style.display = 'flex';
        studentInfo.classList.remove('visible');
        studentName.textContent = '';

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