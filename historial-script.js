document.addEventListener('DOMContentLoaded', () => {
    // --- LÍNEA DE DIAGNÓSTICO ---
    // Si ves este mensaje en la consola (F12), estás ejecutando la versión correcta de este archivo.
    console.log("Cargando historial-script.js vFinal...");

    // La conexión a Firebase ('db') ya está disponible gracias a auth-guard.js
    let loadedConsultas = [];

    // --- ELEMENTOS DEL DOM ---
    const patientBanner = document.getElementById('patient-banner');
    const historialContainer = document.getElementById('historial-container');
    const backToVisorBtn = document.getElementById('back-to-visor');

    // --- INICIALIZACIÓN ---
    const activePatient = JSON.parse(localStorage.getItem('activePatient'));
    if (!activePatient) {
        patientBanner.textContent = "ERROR: No hay un paciente activo.";
        backToVisorBtn.href = 'index.html';
        return;
    }

    patientBanner.innerHTML = `Mostrando historial para: <strong>${activePatient.nombre} ${activePatient.apellidoPaterno}</strong>`;
    backToVisorBtn.href = `visor.html?codigo=${activePatient.codigoUnico}`;
    loadHistory();

    // --- MANEJO DE EVENTOS ---
    historialContainer.addEventListener('click', function(e) {
        const target = e.target.closest('button');
        if (!target) return;
        const recordId = target.dataset.id;
        if (target.classList.contains('delete-btn')) {
            if (confirm('¿Estás seguro de que deseas eliminar este registro?')) {
                deleteRecord(recordId);
            }
        }
        if (target.classList.contains('edit-btn')) {
            editRecord(recordId);
        }
    });

    // --- FUNCIONES ---
    async function loadHistory() {
        historialContainer.innerHTML = 'Cargando...';
        try {
            // --- ESTA ES LA SINTAXIS CORRECTA PARA FIREBASE WEB ---
            const querySnapshot = await db.collection('consultas')
                .where('codigoUnico', '==', activePatient.codigoUnico)
                .orderBy('fechaConsulta', 'desc')
                .get();

            loadedConsultas = querySnapshot.docs.map(doc => doc.data());
            
            historialContainer.innerHTML = '';
            if (loadedConsultas.length === 0) {
                historialContainer.innerHTML = '<p>No hay consultas registradas para este paciente.</p>';
                return;
            }
            
            loadedConsultas.forEach(consulta => {
                const consultaCard = document.createElement('div');
                consultaCard.className = 'consulta-card';
                const fecha = new Date(consulta.fechaConsulta).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
                
                consultaCard.innerHTML = `
                    <details>
                        <summary class="consulta-summary">
                            <div class="summary-info">
                                <strong>${fecha}</strong>
                                <span class="motivo-preview">${(consulta.sintomasSignosMotivo || '').substring(0, 50)}...</span>
                            </div>
                            <span class="medico-preview">${consulta.medicoTratante || ''}</span>
                        </summary>
                        <div class="consulta-details">
                            <div class="details-actions">
                                <button class="edit-btn" data-id="${consulta.id}">✏️ Editar</button>
                                <button class="delete-btn" data-id="${consulta.id}">🗑️ Eliminar</button>
                            </div>
                            <hr>
                            <h4>Interrogatorio (SAMPLE)</h4>
                            <p><strong>Síntomas/Motivo:</strong> ${consulta.sintomasSignosMotivo || ''}</p>
                            <p><strong>Alergias:</strong> ${consulta.alergiasConsulta || ''}</p>
                            <p><strong>Medicamentos:</strong> ${consulta.medicamentosPrevios || ''}</p>
                            <p><strong>Historial Previo:</strong> ${consulta.historialClinicoPrevio || ''}</p>
                            <p><strong>Líquidos/Alimentos:</strong> ${consulta.liquidosAlimentos || ''}</p>
                            <p><strong>Eventos Relacionados:</strong> ${consulta.eventosRelacionados || ''}</p>
                            <hr>
                            <h4>Análisis y Diagnóstico</h4>
                            <p><strong>Análisis/Exploración:</strong> ${consulta.analisis || ''}</p>
                            <p><strong>Dx. Sindromático:</strong> ${consulta.diagnosticoSindromatico || ''}</p>
                            <p><strong>Dx. Etiológico:</strong> ${consulta.diagnosticoEtiologico || ''}</p>
                            <p><strong>Dx. Nutricional:</strong> ${consulta.diagnosticoNutricional || ''}</p>
                            <p><strong>Dx. Radiológico:</strong> ${consulta.diagnosticoRadiologico || ''}</p>
                            <p><strong>Dx. Presuntivo:</strong> ${consulta.diagnosticoPresuntivo || ''}</p>
                            <p><strong>Dx. Nosológico (Final):</strong> ${consulta.diagnosticoNosologico || ''}</p>
                        </div>
                    </details>`;
                historialContainer.appendChild(consultaCard);
            });
        } catch (error) {
            historialContainer.innerHTML = `<p class="error-message">Error al cargar historial: ${error.message}</p>`;
        }
    }
    
    function editRecord(id) {
        const recordToEdit = loadedConsultas.find(c => c.id == id);
        if (recordToEdit) {
            sessionStorage.setItem('recordToEdit', JSON.stringify(recordToEdit));
            window.location.href = `consulta.html?mode=edit&id=${id}`;
        }
    }

    async function deleteRecord(id) {
        try {
            await db.collection('consultas').doc(id).delete();
            alert('Registro eliminado con éxito.');
            loadHistory();
        } catch (error) {
            alert(`Error al eliminar: ${error.message}`);
        }
    }
});
