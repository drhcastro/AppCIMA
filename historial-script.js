document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbw6jZIjBoeSlIRF-lAMPNqmbxRsncqulzZEi8f7q2AyOawxbpSZRIUxsx9UgZwe/exec';

    // --- ELEMENTOS DEL DOM ---
    const patientBanner = document.getElementById('patient-banner');
    const historialContainer = document.getElementById('historial-container');
    const backToVisorBtn = document.getElementById('back-to-visor');

    // --- LÓGICA DE INICIALIZACIÓN ---
    const activePatient = JSON.parse(localStorage.getItem('activePatient'));

    if (!activePatient) {
        patientBanner.textContent = "ERROR: No hay un paciente activo.";
        backToVisorBtn.href = 'index.html';
        return;
    }

    patientBanner.innerHTML = `Mostrando historial para: <strong>${activePatient.nombre} ${activePatient.apellidoPaterno}</strong>`;
    backToVisorBtn.href = `visor.html?codigo=${activePatient.codigoUnico}`;

    // Llamar al API para obtener el historial de consultas
    fetch(`${API_URL}?action=getConsultas&codigo=${activePatient.codigoUnico}`)
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success' && data.data) {
                displayHistorial(data.data);
            } else {
                throw new Error(data.message);
            }
        })
        .catch(error => {
            historialContainer.innerHTML = `<p class="error-message">Error al cargar el historial: ${error.message}</p>`;
        });

    // --- FUNCIÓN PARA MOSTRAR LOS DATOS ---
    function displayHistorial(consultas) {
        if (consultas.length === 0) {
            historialContainer.innerHTML = '<p>No hay consultas registradas para este paciente.</p>';
            return;
        }

        // El API ya devuelve las consultas ordenadas por fecha (la más reciente primero)
        consultas.forEach(consulta => {
            const consultaCard = document.createElement('div');
            consultaCard.className = 'consulta-card';

            const fecha = new Date(consulta.fechaConsulta + 'T00:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

            // Usamos <details> y <summary> para crear un acordeón simple y nativo
            consultaCard.innerHTML = `
                <details>
                    <summary class="consulta-summary">
                        <div class="summary-info">
                            <strong>${fecha}</strong>
                            <span class="motivo-preview">${consulta.sintomasSignosMotivo.substring(0, 50)}...</span>
                        </div>
                        <span class="medico-preview">${consulta.medicoTratante || ''}</span>
                    </summary>
                    <div class="consulta-details">
                        <h4>Interrogatorio (SAMPLE)</h4>
                        <p><strong>Síntomas/Motivo:</strong> ${consulta.sintomasSignosMotivo}</p>
                        <p><strong>Alergias:</strong> ${consulta.alergiasConsulta}</p>
                        <p><strong>Medicamentos:</strong> ${consulta.medicamentosPrevios}</p>
                        <p><strong>Historial Previo:</strong> ${consulta.historialClinicoPrevio}</p>
                        <p><strong>Líquidos/Alimentos:</strong> ${consulta.liquidosAlimentos}</p>
                        <p><strong>Eventos Relacionados:</strong> ${consulta.eventosRelacionados}</p>
                        <hr>
                        <h4>Análisis y Diagnóstico</h4>
                        <p><strong>Análisis/Exploración:</strong> ${consulta.analisis}</p>
                        <p><strong>Dx. Sindromático:</strong> ${consulta.diagnosticoSindromatico}</p>
                        <p><strong>Dx. Etiológico:</strong> ${consulta.diagnosticoEtiologico}</p>
                        <p><strong>Dx. Nutricional:</strong> ${consulta.diagnosticoNutricional}</p>
                        <p><strong>Dx. Radiológico:</strong> ${consulta.diagnosticoRadiologico}</p>
                        <p><strong>Dx. Presuntivo:</strong> ${consulta.diagnosticoPresuntivo}</p>
                        <p><strong>Dx. Nosológico (Final):</strong> ${consulta.diagnosticoNosologico}</p>
                    </div>
                </details>
            `;
            historialContainer.appendChild(consultaCard);
        });
    }
});
