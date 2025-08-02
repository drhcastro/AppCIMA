// historial-script.js
document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'https://script.google.com/macros/s/AKfycbxXXUPOvKK5HRSeFsM3LYVvkweqxKBhxMjxASg_0-7sEyke-LZ2eOPQkaz0quXoN3Mc/exec';
    const patientBanner = document.getElementById('patient-banner');
    const historialContainer = document.getElementById('historial-container');
    const backToVisorBtn = document.getElementById('back-to-visor');
    const activePatient = JSON.parse(localStorage.getItem('activePatient'));

    if (!activePatient) { /* ...código de error... */ return; }

    patientBanner.innerHTML = `Mostrando historial para: <strong>${activePatient.nombre} ${activePatient.apellidoPaterno}</strong>`;
    backToVisorBtn.href = `visor.html?codigo=${activePatient.codigoUnico}`;

    loadHistory();

    historialContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('delete-btn')) {
            const recordId = e.target.dataset.id;
            if (confirm('¿Estás seguro de que deseas eliminar este registro de consulta? Esta acción no se puede deshacer.')) {
                deleteRecord(recordId);
            }
        }
    });

    async function loadHistory() {
        historialContainer.innerHTML = 'Cargando...';
        try {
            const response = await fetch(`${API_URL}?action=getConsultas&codigo=${activePatient.codigoUnico}`);
            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.message);
            
            historialContainer.innerHTML = '';
            if (data.data.length === 0) {
                historialContainer.innerHTML = '<p>No hay consultas registradas para este paciente.</p>';
                return;
            }
            
            data.data.forEach(consulta => {
                const consultaCard = document.createElement('div');
                consultaCard.className = 'consulta-card';
                const fecha = new Date(consulta.fechaConsulta).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
                
                // El innerHTML ahora incluye el botón de eliminar con el ID
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
                            <button class="delete-btn" data-id="${consulta.id}">🗑️ Eliminar Consulta</button>
                            <hr>
                            <h4>Interrogatorio (SAMPLE)</h4>
                            <p><strong>Síntomas/Motivo:</strong> ${consulta.sintomasSignosMotivo}</p>
                            </div>
                    </details>`;
                historialContainer.appendChild(consultaCard);
            });
        } catch (error) {
            historialContainer.innerHTML = `<p class="error-message">Error al cargar historial: ${error.message}</p>`;
        }
    }
    
    async function deleteRecord(id) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'eliminarConsulta', id: id }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.message);
            
            alert('Registro eliminado con éxito.');
            loadHistory(); // Recargar la lista
        } catch (error) {
            alert(`Error al eliminar: ${error.message}`);
        }
    }
});
