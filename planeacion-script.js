document.addEventListener('DOMContentLoaded', () => {
    // La conexión 'db' ya está disponible gracias a auth-guard.js

    // --- FUNCIÓN DE AYUDA PARA FECHAS ---
    function formatDate(dateString) {
        if (!dateString || !dateString.includes('-')) return "N/A";
        // Añadir 'T00:00:00' para que se interprete como la medianoche en la zona horaria local
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    // --- ELEMENTOS DEL DOM ---
    const patientBanner = document.getElementById('patient-banner');
    const historialContainer = document.getElementById('planes-historial-container');
    const backToVisorBtn = document.getElementById('back-to-visor');

    // --- LÓGICA DE PERMISOS E INICIALIZACIÓN ---
    const activePatient = JSON.parse(localStorage.getItem('activePatient'));
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

    if (currentUser && currentUser.profile === 'asistente') {
        document.body.innerHTML = '<div style="text-align: center; padding: 40px; font-family: Poppins, sans-serif;"><h1>Acceso Denegado</h1><p>Tu perfil no tiene permiso para ver esta sección.</p><a href="javascript:history.back()" style="color: #005f73;">Regresar</a></div>';
        return;
    }

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
            const querySnapshot = await db.collection('planeacionConsultas')
                .where('codigoUnico', '==', activePatient.codigoUnico)
                .orderBy('fechaPlan', 'desc')
                .get();
            
            const plans = querySnapshot.docs.map(doc => doc.data());

            if (plans.length === 0) {
                historialContainer.innerHTML = '<p>No hay planes de tratamiento registrados para este paciente.</p>';
                return;
            }

            // Guardamos los planes en la memoria de la sesión para que la página de impresión pueda acceder a ellos
            sessionStorage.setItem('patientPlans', JSON.stringify(plans));

            historialContainer.innerHTML = '';
            plans.forEach((plan, index) => {
                const card = document.createElement('div');
                card.className = 'consulta-card';
                const fecha = formatDate(plan.fechaPlan); // Usar la función de formateo
                
                card.innerHTML = `
                    <div class="plan-summary">
                        <div class="summary-info">
                            <strong>${fecha}</strong>
                            <span class="motivo-preview">${plan.diagnosticoRelacionado || 'Plan General'}</span>
                        </div>
                        <div class="plan-actions">
                            <a href="imprimir-planeacion.html?index=${index}" class="button-secondary small-btn">Ver / Imprimir</a>
                        </div>
                    </div>
                `;
                historialContainer.appendChild(card);
            });
        } catch (error) {
            console.error("Error al cargar historial de planeaciones:", error);
            historialContainer.innerHTML = `<p class="error-message">Error al cargar el historial. Es posible que falte un índice en Firestore.</p>`;
        }
    }
});
