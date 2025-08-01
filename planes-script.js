document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbw6jZIjBoeSlIRF-lAMPNqmbxRsncqulzZEi8f7q2AyOawxbpSZRIUxsx9UgZwe/exec';

    // --- ELEMENTOS DEL DOM ---
    const patientBanner = document.getElementById('patient-banner');
    const historialContainer = document.getElementById('planes-historial-container');
    const backToVisorBtn = document.getElementById('back-to-visor');

    // --- LÓGICA DE INICIALIZACIÓN ---
    const activePatient = JSON.parse(localStorage.getItem('activePatient'));

    if (!activePatient) {
        patientBanner.textContent = "ERROR: No hay un paciente activo.";
        backToVisorBtn.href = 'index.html';
        return;
    }

    patientBanner.innerHTML = `Planes para: <strong>${activePatient.nombre} ${activePatient.apellidoPaterno}</strong>`;
    backToVisorBtn.href = `visor.html?codigo=${activePatient.codigoUnico}`;

    loadHistory();

    // --- FUNCIÓN PARA CARGAR EL HISTORIAL ---
    async function loadHistory() {
        historialContainer.innerHTML = 'Cargando historial...';
        try {
            const response = await fetch(`${API_URL}?action=getPlanes&codigo=${activePatient.codigoUnico}`);
            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.message);

            if (data.data.length === 0) {
                historialContainer.innerHTML = '<p>No hay planes de tratamiento registrados para este paciente.</p>';
                return;
            }

            // Guardamos los planes en la memoria de la sesión para que la página de impresión pueda acceder a ellos
            sessionStorage.setItem('patientPlans', JSON.stringify(data.data));

            historialContainer.innerHTML = '';
            data.data.forEach((plan, index) => {
                const card = document.createElement('div');
                card.className = 'consulta-card'; // Reutilizamos estilo
                const fecha = new Date(plan.fechaPlan + 'T00:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
                
                card.innerHTML = `
                    <div class="plan-summary">
                        <div class="summary-info">
                            <strong>${fecha}</strong>
                            <span class="motivo-preview">${plan.diagnosticoRelacionado || 'Plan General'}</span>
                        </div>
                        <div class="plan-actions">
                            <a href="imprimir-plan.html?index=${index}" class="button-secondary small-btn">Ver / Imprimir</a>
                        </div>
                    </div>
                `;
                historialContainer.appendChild(card);
            });
        } catch (error) {
            historialContainer.innerHTML = `<p class="error-message">Error al cargar el historial: ${error.message}</p>`;
        }
    }
});
