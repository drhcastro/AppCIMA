document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbw6jZIjBoeSlIRF-lAMPNqmbxRsncqulzZEi8f7q2AyOawxbpSZRIUxsx9UgZwe/exec';

    // (Base de datos de Hitos del Desarrollo - sin cambios)
    const hitosPorEdad = {
        rn: [ { id: 'reflejo_succion', label: 'Reflejo de succión presente y fuerte' }, /* ... */ ],
        '2m': [ { id: 'levanta_cabeza', label: 'En prono, levanta la cabeza 45°' }, /* ... */ ],
        // ... (resto de los hitos)
    };

    // --- ELEMENTOS DEL DOM ---
    const patientBanner = document.getElementById('patient-banner');
    const backToVisorBtn = document.getElementById('back-to-visor');
    const historialContainer = document.getElementById('neuro-historial-container');
    // Formularios
    const formAmiel = document.getElementById('neuro-form-amiel');
    const formHitos = document.getElementById('neuro-form-hitos');
    // Amiel-Tyson
    const puntuacionInputs = document.querySelectorAll('.puntuacion-input');
    const puntuacionTotalInput = document.getElementById('puntuacionTotal');

    // --- LÓGICA DE PESTAÑAS (sin cambios) ---

    // --- INICIALIZACIÓN ---
    const activePatient = JSON.parse(localStorage.getItem('activePatient'));
    // (Código de inicialización sin cambios)

    loadNeuroHistory(); // Cargar todo el historial al iniciar

    // --- MANEJO DE EVENTOS ---
    puntuacionInputs.forEach(input => input.addEventListener('input', updateTotalScore));
    formAmiel.addEventListener('submit', handleAmielSubmit);
    // (Resto de los event listeners sin cambios)

    // --- FUNCIONES ---
    function updateTotalScore() {
        let total = 0;
        puntuacionInputs.forEach(input => {
            total += Number(input.value) || 0;
        });
        puntuacionTotalInput.value = total;
    }

    async function handleAmielSubmit(e) {
        e.preventDefault();
        const submitBtn = formAmiel.querySelector('button[type="submit"]');
        const responseMsg = document.getElementById('response-message-amiel');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';

        const formData = {
            action: 'guardarAmielTyson', // Acción específica
            codigoUnico: activePatient.codigoUnico,
            fechaValoracion: document.getElementById('fechaValoracionAmiel').value,
            edadMeses: document.getElementById('edadMesesAmiel').value,
            // Campos detallados
            tonoPasivoPuntuacion: document.getElementById('tonoPasivoPuntuacion').value,
            tonoPasivoObs: document.getElementById('tonoPasivoObs').value,
            tonoActivoPuntuacion: document.getElementById('tonoActivoPuntuacion').value,
            tonoActivoObs: document.getElementById('tonoActivoObs').value,
            reflejosPuntuacion: document.getElementById('reflejosPuntuacion').value,
            reflejosObs: document.getElementById('reflejosObs').value,
            puntuacionTotal: document.getElementById('puntuacionTotal').value,
            conclusion: document.getElementById('conclusion').value
        };
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST', body: JSON.stringify(formData), headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.message);

            responseMsg.textContent = 'Valoración guardada con éxito.';
            responseMsg.className = 'success';
            formAmiel.reset();
            loadNeuroHistory(); // Recargar el historial
        } catch (error) {
            responseMsg.textContent = `Error: ${error.message}`;
            responseMsg.className = 'error';
        } finally {
            responseMsg.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Guardar Valoración Amiel-Tyson';
        }
    }

    async function loadNeuroHistory() {
        historialContainer.innerHTML = 'Cargando historial...';
        try {
            // Cargar ambos tipos de historiales
            const [neuroRes, amielRes] = await Promise.all([
                fetch(`${API_URL}?action=getNeuro&codigo=${activePatient.codigoUnico}`),
                fetch(`${API_URL}?action=getAmielTyson&codigo=${activePatient.codigoUnico}`)
            ]);

            const neuroData = await neuroRes.json();
            const amielData = await amielRes.json();

            if (neuroData.status !== 'success' || amielData.status !== 'success') {
                throw new Error(neuroData.message || amielData.message);
            }
            
            const combinedHistory = [...neuroData.data, ...amielData.data];
            // Ordenar todo el historial combinado por fecha
            combinedHistory.sort((a, b) => new Date(b.fechaValoracion) - new Date(a.fechaValoracion));

            if (combinedHistory.length === 0) {
                historialContainer.innerHTML = '<p>No hay valoraciones de neurodesarrollo registradas.</p>';
                return;
            }

            historialContainer.innerHTML = '';
            combinedHistory.forEach(valoracion => {
                const card = document.createElement('div');
                card.className = 'consulta-card';
                const fecha = new Date(valoracion.fechaValoracion + 'T00:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
                
                let detailsHtml;
                // Formatear la vista del historial dependiendo del tipo de valoración
                if (valoracion.puntuacionTotal !== undefined) { // Es una valoración Amiel-Tyson
                    detailsHtml = `
                        <p><strong>Tono Pasivo:</strong> Puntuación ${valoracion.tonoPasivoPuntuacion}. ${valoracion.tonoPasivoObs}</p>
                        <p><strong>Tono Activo:</strong> Puntuación ${valoracion.tonoActivoPuntuacion}. ${valoracion.tonoActivoObs}</p>
                        <p><strong>Reflejos:</strong> Puntuación ${valoracion.reflejosPuntuacion}. ${valoracion.reflejosObs}</p>
                        <hr><p><strong>Puntuación Total: ${valoracion.puntuacionTotal}</strong></p>
                        <p><strong>Conclusión:</strong> ${valoracion.conclusion}</p>
                    `;
                } else { // Es una nota genérica o de Hitos
                    detailsHtml = `
                        <p><strong>Resultados:</strong><br>${valoracion.resultados.replace(/\n/g, '<br>')}</p>
                        <p><strong>Observaciones:</strong><br>${valoracion.observaciones.replace(/\n/g, '<br>')}</p>
                    `;
                }

                card.innerHTML = `
                    <details>
                        <summary class="consulta-summary">
                            <div class="summary-info">
                                <strong>${fecha}</strong>
                                <span class="motivo-preview">${valoracion.tipoValoracion || `Amiel-Tyson (Total: ${valoracion.puntuacionTotal})`}</span>
                            </div>
                        </summary>
                        <div class="consulta-details">${detailsHtml}</div>
                    </details>
                `;
                historialContainer.appendChild(card);
            });
        } catch (error) {
            historialContainer.innerHTML = `<p class="error-message">Error al cargar el historial: ${error.message}</p>`;
        }
    }

    // --- PEGA AQUÍ LAS OTRAS FUNCIONES Y EVENT LISTENERS DEL ARCHIVO neuro-script.js anterior ---
    // (Lógica de pestañas, Hitos, etc.)
});
