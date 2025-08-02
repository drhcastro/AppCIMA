document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbxXXUPOvKK5HRSeFsM3LYVvkweqxKBhxMjxASg_0-7sEyke-LZ2eOPQkaz0quXoN3Mc/exec';

    // --- ELEMENTOS DEL DOM ---
    const patientBanner = document.getElementById('patient-banner');
    const planForm = document.getElementById('plan-form');
    const submitBtn = document.getElementById('submit-btn');
    const responseMsg = document.getElementById('response-message');
    
    // --- LÓGICA DE INICIALIZACIÓN ---
    const activePatient = JSON.parse(localStorage.getItem('activePatient'));
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser')); // <-- Obtener usuario actual

    if (!activePatient) {
        patientBanner.textContent = "ERROR: No hay un paciente activo.";
        planForm.style.display = 'none';
        return;
    }

    patientBanner.innerHTML = `Creando plan для: <strong>${activePatient.nombre} ${activePatient.apellidoPaterno}</strong>`;
    document.getElementById('fechaPlan').valueAsDate = new Date();

    applyPermissions(); // <-- Aplicar permisos al cargar la página

    // --- MANEJO DEL FORMULARIO ---
    planForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';
        responseMsg.style.display = 'none';

        const formData = {
            action: 'guardarPlan',
            codigoUnico: activePatient.codigoUnico,
            fechaPlan: document.getElementById('fechaPlan').value,
            profesional: document.getElementById('profesional').value,
            diagnosticoRelacionado: document.getElementById('diagnosticoRelacionado').value,
            indicaciones: document.getElementById('indicaciones').value,
            proximaCita: document.getElementById('proximaCita').value,
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(formData),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.message);
            
            alert('Plan de tratamiento guardado con éxito.');
            window.location.href = 'planes.html';

        } catch (error) {
            responseMsg.textContent = `Error al guardar: ${error.message}`;
            responseMsg.className = 'error';
            responseMsg.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Guardar Plan de Tratamiento';
        }
    });
    
    // --- FUNCIÓN DE PERMISOS ---
    function applyPermissions() {
        if (!currentUser) return;
        const userRole = currentUser.profile;

        // Regla: El perfil 'asistente' no puede crear planes.
        if (userRole === 'asistente') {
            // Deshabilitar todos los campos y el botón del formulario
            planForm.querySelectorAll('input, textarea, button').forEach(el => {
                el.disabled = true;
            });
            submitBtn.textContent = 'Creación no permitida para este perfil';
            submitBtn.style.backgroundColor = '#6c757d'; // Color gris
        }
    }
});
