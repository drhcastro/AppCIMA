document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    // ¡IMPORTANTE! Pega aquí la URL de tu API de Google Apps Script.
    const API_URL = 'https://script.google.com/macros/s/AKfycbw6jZIjBoeSlIRF-lAMPNqmbxRsncqulzZEi8f7q2AyOawxbpSZRIUxsx9UgZwe/exec

    // --- ELEMENTOS DEL DOM ---
    const form = document.getElementById('registro-form');
    const submitBtn = document.getElementById('submit-btn');
    const responseMsg = document.getElementById('response-message');

    // --- LÓGICA DEL FORMULARIO ---
    form.addEventListener('submit', function(e) {
        e.preventDefault(); // Evita que la página se recargue

        // Deshabilitar el botón para evitar envíos múltiples
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registrando...';
        responseMsg.style.display = 'none';

        // Crear un objeto con los datos del formulario
        const formData = {
            nombre: document.getElementById('nombre').value,
            apellidoPaterno: document.getElementById('apellidoPaterno').value,
            apellidoMaterno: document.getElementById('apellidoMaterno').value,
            fechaNacimiento: document.getElementById('fechaNacimiento').value,
            sexo: document.getElementById('sexo').value,
            domicilio: document.getElementById('domicilio').value,
            telefono: document.getElementById('telefono').value,
            nombreMama: document.getElementById('nombreMama').value,
            nombrePapa: document.getElementById('nombrePapa').value,
            correo: document.getElementById('correo').value,
            alergias: document.getElementById('alergias').value,
        };

        // Enviar los datos a la API de Google Apps Script
        fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(formData),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', // Apps Script a menudo prefiere text/plain para el cuerpo
            },
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                // Éxito: mostrar mensaje y limpiar el formulario
                responseMsg.textContent = `¡Paciente registrado con éxito! Guardar este código: ${data.codigo}`;
                responseMsg.className = 'success';
                form.reset();
            } else {
                // Error: mostrar el mensaje de error que viene del API
                throw new Error(data.message || 'Ocurrió un error desconocido.');
            }
        })
        .catch(error => {
            // Error de red o del servidor
            responseMsg.textContent = `Error al registrar: ${error.message}`;
            responseMsg.className = 'error';
        })
        .finally(() => {
            // Volver a habilitar el botón
            submitBtn.disabled = false;
            submitBtn.textContent = 'Registrar Paciente';
            responseMsg.style.display = 'block';
        });
    });
});
