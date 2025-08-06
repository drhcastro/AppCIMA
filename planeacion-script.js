document.addEventListener('DOMContentLoaded', () => {
    let loadedPlans = [];
    const patientBanner = document.getElementById('patient-banner');
    const historialContainer = document.getElementById('planes-historial-container');
    const backToVisorBtn = document.getElementById('back-to-visor');
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

    historialContainer.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const id = target.dataset.id;
        if (target.classList.contains('delete-btn')) {
            if (confirm('¿Estás seguro de que deseas eliminar esta planeación?')) deleteRecord(id);
        }
        if (target.classList.contains('edit-btn')) {
             editRecord(id);
        }
    });

    async function loadHistory() {
        historialContainer.innerHTML = 'Cargando historial...';
        try {
            const querySnapshot = await db.collection('planeacionConsultas').where('codigoUnico', '==', activePatient.codigoUnico).orderBy('fechaPlan', 'desc').get();
            loadedPlans = querySnapshot.docs.map(doc => doc.data());
            if (loadedPlans.length === 0) {
                historialContainer.innerHTML = '<p>No hay planeaciones registradas.</p>';
                return;
            }
            historialContainer.innerHTML = '';
            loadedPlans.forEach(plan => {
                const card = document.createElement('div');
                card.className = 'consulta-card';
                const fecha = new Date(plan.fechaPlan + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                card.innerHTML = `
                    <details>
                        <summary class="consulta-summary">
                            <div class="summary-info"><strong>${fecha}</strong><span class="motivo-preview">${plan.diagnosticoRelacionado || 'Plan General'}</span></div>
                            <span class="medico-preview">${plan.profesional || ''}</span>
                        </summary>
                        <div class="consulta-details">
                            <div class="details-actions">
                                <button class="edit-btn" data-id="${plan.id}">✏️ Editar</button>
                                <button class="delete-btn" data-id="${plan.id}">🗑️ Eliminar</button>
                            </div>
                            <hr>
                            <h4>Indicaciones y Tratamiento</h4>
                            <p>${(plan.indicaciones || '').replace(/\n/g, '<br>')}</p>
                            <hr>
                            <h4>Próxima Cita</h4>
                            <p>${plan.proximaCita || 'No especificada'}</p>
                        </div>
                    </details>`;
                historialContainer.appendChild(card);
            });
        } catch (error) { 
            console.error("Error al cargar historial de planeaciones:", error);
            historialContainer.innerHTML = `<p class="error-message">Error al cargar el historial. Es posible que falte un índice en Firestore.</p>`;
        }
    }
    
    function editRecord(id) {
        const recordToEdit = loadedPlans.find(p => p.id == id);
        if (recordToEdit) {
            sessionStorage.setItem('recordToEdit', JSON.stringify(recordToEdit));
            window.location.href = `crear-planeacion.html?mode=edit&id=${id}`;
        }
    }

    async function deleteRecord(id) {
        try {
            await db.collection('planeacionConsultas').doc(id).delete();
            alert('Planeación eliminada con éxito.');
            loadHistory();
        } catch (error) { alert(`Error al eliminar: ${error.message}`); }
    }
});
