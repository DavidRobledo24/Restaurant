document.addEventListener('DOMContentLoaded', function () {
    const numeroInput = document.getElementById('numeroInput');
    const studentName = document.getElementById('studentName');
    const studentInfo = document.querySelector('.student-info');

    let hideNameTimeout;

    numeroInput.addEventListener('input', function () {
        this.value = this.value.replace(/[^\d]/g, '').slice(0, 8);
        ocultarNombre();
    });

    numeroInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const codigo = this.value.trim();
            if (codigo.length > 0) validarCodigo(codigo);
        }
    });

    function ocultarNombre() {
        clearTimeout(hideNameTimeout);
        studentInfo.classList.remove('visible');
        studentName.textContent = '';
        const imgElement = document.getElementById('defaultImage');
        imgElement.src = 'images/person_13924070.png';
    }

    async function validarCodigo(codigo) {
        // 🚫 Bloquear input mientras valida
        numeroInput.disabled = true;
        numeroInput.classList.add('deshabilitado');

        try {
            const response = await fetch('http://localhost:3000/procesar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codigo })
            });

            const data = await response.json();

            if (!data.success) {
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
                return;
            }

            // ✅ Mostrar nombre y foto
            studentName.textContent = data.nombre;
            const imgElement = document.getElementById('defaultImage');
            imgElement.src = data.imagen;
            studentInfo.classList.add('visible');

            // ✅ Éxito visual
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

            hideNameTimeout = setTimeout(ocultarNombre, 3000);
        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                title: 'Error de conexión',
                text: 'No se pudo contactar con el servidor',
                icon: 'error',
                timer: 3000,
                showConfirmButton: false,
                position: 'top',
                background: '#f44336',
                color: '#fff',
                toast: true
            });
        } finally {
            numeroInput.value = '';
            numeroInput.disabled = false;
            numeroInput.classList.remove('deshabilitado');
            numeroInput.focus();
        }
    }
});
