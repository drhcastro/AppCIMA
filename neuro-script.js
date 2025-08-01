document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbw6jZIjBoeSlIRF-lAMPNqmbxRsncqulzZEi8f7q2AyOawxbpSZRIUxsx9UgZwe/exec';

    // --- ELEMENTOS DEL DOM ---
    const patientBanner = document.getElementById('patient-banner');
    const backToVisorBtn = document.getElementById('back-to-visor');
    const neuroForm = document.getElementById('neuro-form');
    const responseMsg = document.getElementById('response-message');
    const historialContainer = document.getElementById('neuro-historial-container');

    // --- LÓGICA DE PESTAÑAS ---
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === button.dataset.tab) {
                    content.classList.add('active');
                }
            });
        });
    });

    // --- LÓGICA DE INICIALIZACIÓN ---
    const activePatient = JSON.parse(localStorage.getItem('activePatient'));

    if (!activePatient) {
        patientBanner.textContent = "ERROR: No hay un paciente activo.";
        backToVisorBtn.href = 'index.html';
        return;
    }

    patientBanner.innerHTML = `Valoraciones para: <strong>${activePatient.nombre} ${activePatient.apellidoPaterno}</strong>`;
    backToVisorBtn.href = `visor.html?codigo=${activePatient.codigoUnico}`;
    document.getElementById('fechaValoracion').valueAsDate = new Date();

    loadNeuroHistory();

    // --- MANEJO DE EVENTOS DEL FORMULARIO ---
    neuroForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = neuroForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';

        const formData = {
            action: 'guardarNeuro',
            codigoUnico: activePatient.codigoUnico,
            fechaValoracion: document.getElementById('fechaValoracion').value,
            edadMeses: document.getElementById('edadMeses').value,
            tipoValoracion: document.getElementById('tipoValoracion').value,
            resultados: document.getElementById('resultados').value,
            observaciones: document.getElementById('observaciones').value,
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(formData),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.message);

            responseMsg.textContent = 'Valoración guardada con éxito.';
            responseMsg.className = 'success';
            responseMsg.style.display = 'block';
            neuroForm.reset();
            document.getElementById('fechaValoracion').valueAsDate = new Date();
            loadNeuroHistory(); // Recargar el historial
        } catch (error) {
            responseMsg.textContent = `Error: ${error.message}`;
            responseMsg.className = 'error';
            responseMsg.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Guardar Valoración';
        }
    });

    // --- FUNCIÓN PARA CARGAR EL HISTORIAL ---
    async function loadNeuroHistory() {
        try {
            const response = await fetch(`${API_URL}?action=getNeuro&codigo=${activePatient.codigoUnico}`);
            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.message);
            
            historialContainer.innerHTML = ''; // Limpiar
            if (data.data.length === 0) {
                historialContainer.innerHTML = '<p>No hay valoraciones de neurodesarrollo registradas.</p>';
                return;
            }
            
            data.data.forEach(valoracion => {
                const card = document.createElement('div');
                card.className = 'consulta-card'; // Reutilizamos el estilo
                const fecha = new Date(valoracion.fechaValoracion + 'T00:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
                card.innerHTML = `
                    <details>
                        <summary class="consulta-summary">
                            <div class="summary-info">
                                <strong>${fecha}</strong> (Edad: ${valoracion.edadMeses} meses)
                                <span class="motivo-preview">${valoracion.tipoValoracion}</span>
                            </div>
                        </summary>
                        <div class="consulta-details">
                            <p><strong>Resultados:</strong> ${valoracion.resultados}</p>
                            <p><strong>Observaciones:</strong> ${valoracion.observaciones}</p>
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
