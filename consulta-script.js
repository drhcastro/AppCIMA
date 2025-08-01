document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbw6jZIjBoeSlIRF-lAMPNqmbxRsncqulzZEi8f7q2AyOawxbpSZRIUxsx9UgZwe/exec';

    // --- ELEMENTOS DEL DOM ---
    const form = document.getElementById('consulta-form');
    const submitBtn = document.getElementById('submit-btn');
    const responseMsg = document.getElementById('response-message');
    const patientBanner = document.getElementById('patient-banner');
    const backToVisorBtn = document.getElementById('back-to-visor');

    // --- LÓGICA DE INICIALIZACIÓN ---
    const activePatient = JSON.parse(localStorage.getItem('activePatient'));
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

    if (!activePatient) {
        // Si no hay paciente, bloquear la página
        patientBanner.textContent = "ERROR: No hay un paciente activo.";
        form.style.display = 'none';
        backToVisorBtn.href = 'index.html'; // Enviar al inicio
        return;
    }

    // Poblar la información del paciente
    patientBanner.textContent = `Registrando consulta para: ${activePatient.nombre} ${activePatient.apellidoPaterno} (Cód: ${activePatient.codigoUnico})`;
    document.getElementById('fechaConsulta').valueAsDate = new Date();
    document.getElementById('alergiasConsulta').value = activePatient.alergias || 'Ninguna conocida';
    backToVisorBtn.href = `visor.html?codigo=${activePatient.codigoUnico}`;

    applyPermissions(); // <-- Aplicar permisos

    // --- MANEJO DEL FORMULARIO ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';

        const formData = {
            action: 'guardarConsulta', // Acción para el API
            codigoUnico: activePatient.codigoUnico,
            fechaConsulta: document.getElementById('fechaConsulta').value,
            medicoTratante: document.getElementById('medicoTratante').value,
            sintomasSignosMotivo: document.getElementById('sintomasSignosMotivo').value,
            alergiasConsulta: document.getElementById('alergiasConsulta').value,
            medicamentosPrevios: document.getElementById('medicamentosPrevios').value,
            historialClinicoPrevio: document.getElementById('historialClinicoPrevio').value,
            liquidosAlimentos: document.getElementById('liquidosAlimentos').value,
            eventosRelacionados: document.getElementById('eventosRelacionados').value,
            analisis: document.getElementById('analisis').value,
            plan: document.getElementById('plan').value,
            diagnosticoSindromatico: document.getElementById('diagnosticoSindromatico').value,
            diagnosticoEtiologico: document.getElementById('diagnosticoEtiologico').value,
            diagnosticoNutricional: document.getElementById('diagnosticoNutricional').value,
            diagnosticoRadiologico: document.getElementById('diagnosticoRadiologico').value,
            diagnosticoPresuntivo: document.getElementById('diagnosticoPresuntivo').value,
            diagnosticoNosologico: document.getElementById('diagnosticoNosologico').value
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(formData),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.message);
            
            alert('Consulta guardada con éxito.');
            // Redirigir de vuelta al historial médico
            window.location.href = `historial.html`;
        } catch (error) {
            responseMsg.textContent = `Error al guardar: ${error.message}`;
            responseMsg.className = 'error';
            responseMsg.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Guardar Consulta';
        }
    });

    // --- FUNCIÓN DE PERMISOS ---
    function applyPermissions() {
        if (!currentUser) return;
        const userRole = currentUser.profile;

        // Regla: Solo 'medico' o 'superusuario' pueden registrar consultas médicas.
        if (userRole === 'medico' || userRole === 'superusuario') {
            // El usuario tiene permiso, no hacer nada.
        } else {
            // Si no tiene permiso, deshabilitar todo el formulario.
            form.querySelectorAll('input, select, textarea, button').forEach(el => {
                el.disabled = true;
            });
            submitBtn.textContent = 'Registro no permitido para este perfil';
            submitBtn.style.backgroundColor = '#6c757d'; // Color gris
        }
    }
});
