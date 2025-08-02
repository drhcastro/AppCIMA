document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbxXXUPOvKK5HRSeFsM3LYVvkweqxKBhxMjxASg_0-7sEyke-LZ2eOPQkaz0quXoN3Mc/exec';

    const specialtyConfig = {
        psicologia: {
            title: "Psicología",
            getAction: "getPsicologia",
            saveAction: "guardarPsicologia",
            allowedProfile: "psicologo" // Perfil permitido para editar
        },
        nutricion: {
            title: "Nutrición",
            getAction: "getNutricion",
            saveAction: "guardarNutricion",
            allowedProfile: "nutricionista"
        },
        rehabilitacion: {
            title: "Rehabilitación",
            getAction: "getRehabilitacion",
            saveAction: "guardarRehabilitacion",
            allowedProfile: "rehabilitador"
        }
    };

    // --- ELEMENTOS DEL DOM ---
    const patientBanner = document.getElementById('patient-banner');
    const backToVisorBtn = document.getElementById('back-to-visor');
    const notaForm = document.getElementById('nota-form');
    const responseMsg = document.getElementById('response-message');
    const historialContainer = document.getElementById('historial-container');

    // --- LÓGICA DE INICIALIZACIÓN ---
    const params = new URLSearchParams(window.location.search);
    const tipo = params.get('tipo');
    const config = specialtyConfig[tipo];

    const activePatient = JSON.parse(localStorage.getItem('activePatient'));
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

    if (!activePatient || !config) {
        document.body.innerHTML = "<h1>Error: Paciente o tipo de consulta no especificado.</h1>";
        return;
    }

    // Personalizar la página
    document.getElementById('page-title').textContent = `Consulta de ${config.title}`;
    document.getElementById('main-title').textContent = `Consulta de ${config.title}`;
    document.getElementById('form-title').textContent = `Registrar Nueva Nota de ${config.title}`;
    patientBanner.innerHTML = `Expediente de: <strong>${activePatient.nombre} ${activePatient.apellidoPaterno}</strong>`;
    backToVisorBtn.href = `visor.html?codigo=${activePatient.codigoUnico}`;
    document.getElementById('fechaConsulta').valueAsDate = new Date();

    applyPermissions(); // <-- Aplicar permisos
    loadHistory();

    // --- MANEJO DE EVENTOS ---
    notaForm.addEventListener('submit', handleFormSubmit);

    // --- FUNCIONES ---

    function applyPermissions() {
        if (!currentUser) return;
        const userRole = currentUser.profile;
        const submitBtn = notaForm.querySelector('button[type="submit"]');

        // Regla: El usuario debe ser el especialista correspondiente o un superusuario/médico para guardar.
        if (userRole === config.allowedProfile || userRole === 'medico' || userRole === 'superusuario') {
            // El usuario tiene permiso
        } else {
            // Si no tiene permiso, deshabilitar todo el formulario.
            notaForm.querySelectorAll('input, select, textarea, button').forEach(el => {
                el.disabled = true;
            });
            submitBtn.textContent = 'Permiso denegado';
            submitBtn.style.backgroundColor = '#6c757d'; // Color gris
        }
    }
    
    async function handleFormSubmit(e) {
        e.preventDefault();
        const submitBtn = notaForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';

        const formData = {
            action: config.saveAction,
            codigoUnico: activePatient.codigoUnico,
            fechaConsulta: document.getElementById('fechaConsulta').value,
            profesional: document.getElementById('profesional').value,
            notaClinica: document.getElementById('notaClinica').value,
            planSeguimiento: document.getElementById('planSeguimiento').value,
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(formData),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.message);
            
            notaForm.reset();
            document.getElementById('fechaConsulta').valueAsDate = new Date();
            loadHistory();
        } catch (error) {
            responseMsg.textContent = `Error: ${error.message}`;
            responseMsg.className = 'error';
            responseMsg.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Guardar Nota';
        }
    }

    async function loadHistory() {
        historialContainer.innerHTML = 'Cargando historial...';
        try {
            const response = await fetch(`${API_URL}?action=${config.getAction}&codigo=${activePatient.codigoUnico}`);
            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.message);

            if (data.data.length === 0) {
                historialContainer.innerHTML = `<p>No hay notas de ${config.title} registradas.</p>`;
                return;
            }

            historialContainer.innerHTML = '';
            data.data.forEach(nota => {
                const card = document.createElement('div');
                card.className = 'consulta-card';
                const fecha = new Date(nota.fechaConsulta + 'T00:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
                card.innerHTML = `
                    <details>
                        <summary class="consulta-summary">
                            <div class="summary-info">
                                <strong>${fecha}</strong>
                            </div>
                            <span class="medico-preview">${nota.profesional || ''}</span>
                        </summary>
                        <div class="consulta-details">
                            <h4>Nota Clínica</h4>
                            <p>${nota.notaClinica.replace(/\n/g, '<br>')}</p>
                            <hr>
                            <h4>Plan y Seguimiento</h4>
                            <p>${nota.planSeguimiento.replace(/\n/g, '<br>')}</p>
                        </div>
                    </details>
                `;
                historialContainer.appendChild(card);
            });
        } catch (error) {
            historialContainer.innerHTML = `<p class="error-message">Error al cargar el historial: ${error.message}</p>`;
        }
    }
});
