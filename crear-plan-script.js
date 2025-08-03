document.addEventListener('DOMContentLoaded', () => {
    // La conexión 'db' ya está disponible gracias a auth-guard.js

    // --- ELEMENTOS DEL DOM ---
    const patientBanner = document.getElementById('patient-banner');
    const planForm = document.getElementById('plan-form');
    const submitBtn = document.getElementById('submit-btn');
    const responseMsg = document.getElementById('response-message');
    
    // --- LÓGICA DE INICIALIZACIÓN Y PERMISOS ---
    const activePatient = JSON.parse(localStorage.getItem('activePatient'));
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

    if (!activePatient) {
        patientBanner.textContent = "ERROR: No hay un paciente activo.";
        planForm.style.display = 'none';
        return;
    }

    patientBanner.innerHTML = `Creando plan para: <strong>${activePatient.nombre} ${activePatient.apellidoPaterno}</strong>`;
    document.getElementById('fechaPlan').valueAsDate = new Date();

    // Aplicar permisos
    if (currentUser && currentUser.profile === 'asistente') {
        planForm.querySelectorAll('input, textarea, button').forEach(el => el.disabled = true);
        submitBtn.textContent = 'Creación no permitida';
        submitBtn.style.backgroundColor = '#6c757d';
    }

    // --- MANEJO DEL FORMULARIO ---
    planForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';
        responseMsg.style.display = 'none';

        const newId = new Date().getTime().toString();
        const formData = {
            id: newId,
            codigoUnico: activePatient.codigoUnico,
            fechaPlan: document.getElementById('fechaPlan').value,
            profesional: document.getElementById('profesional').value,
            diagnosticoRelacionado: document.getElementById('diagnosticoRelacionado').value,
            indicaciones: document.getElementById('indicaciones').value,
            proximaCita: document.getElementById('proximaCita').value,
        };

        try {
            await db.collection('planesTratamiento').doc(newId).set(formData);
            
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
});
