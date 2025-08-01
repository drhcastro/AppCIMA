document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbw6jZIjBoeSlIRF-lAMPNqmbxRsncqulzZEi8f7q2AyOawxbpSZRIUxsx9UgZwe/exec';

    // Configuración para cada tipo de especialidad
    const specialtyConfig = {
        psicologia: {
            title: "Psicología",
            getAction: "getPsicologia",
            saveAction: "guardarPsicologia"
        },
        nutricion: {
            title: "Nutrición",
            getAction: "getNutricion",
            saveAction: "guardarNutricion"
        },
        rehabilitacion: {
            title: "Rehabilitación",
            getAction: "getRehabilitacion",
            saveAction: "guardarRehabilitacion"
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
    const tipo = params.get('tipo'); // Obtiene 'psicologia', 'nutricion', etc.
    const config = specialtyConfig[tipo];

    const activePatient = JSON.parse(localStorage.getItem('activePatient'));

    if (!activePatient || !config) {
        document.body.innerHTML = "<h1>Error: Paciente o tipo de consulta no especificado.</h1>";
        return;
    }

    // Personalizar la página según la especialidad
    document.getElementById('page-title').textContent = `Consulta de ${config.title}`;
    document.getElementById('main-title').textContent = `Consulta de ${config.title}`;
    document.getElementById('form-title').textContent = `Registrar Nueva Nota de ${config.title}`;
    patientBanner.innerHTML = `Expediente de: <strong>${activePatient.nombre} ${activePatient.apellidoPaterno}</strong>`;
    backToVisorBtn.href = `visor.html?codigo=${activePatient.codigoUnico}`;
    document.getElementById('fechaConsulta').valueAsDate = new Date();

    loadHistory();

    // --- MANEJO DE EVENTOS ---
    notaForm.addEventListener('submit', async (e) => {
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
            loadHistory(); // Recargar el historial para ver la nueva nota
        } catch (error) {
            responseMsg.textContent = `Error: ${error.message}`;
            responseMsg.className = 'error';
            responseMsg.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Guardar Nota';
        }
    });

    // --- FUNCIÓN PARA CARGAR EL HISTORIAL ---
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
                card.className = 'consulta-card'; // Reutilizamos el estilo
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
