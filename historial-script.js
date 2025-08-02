// historial-script.js (Actualizado)
document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'https://script.google.com/macros/s/AKfycbw6jZIjBoeSlIRF-lAMPNqmbxRsncqulzZEi8f7q2AyOawxbpSZRIUxsx9UgZwe/exec';
    const patientBanner = document.getElementById('patient-banner');
    const historialContainer = document.getElementById('historial-container');
    const backToVisorBtn = document.getElementById('back-to-visor');
    const activePatient = JSON.parse(localStorage.getItem('activePatient'));

    // ... (Código de inicialización sin cambios) ...

    loadHistory();

    // --- NUEVO: Event listener para los botones de eliminar ---
    historialContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('delete-btn')) {
            const recordId = e.target.dataset.id;
            if (confirm('¿Estás seguro de que deseas eliminar este registro de consulta? Esta acción no se puede deshacer.')) {
                deleteRecord(recordId);
            }
        }
    });

    async function loadHistory() {
        // ... (código de loadHistory sin cambios, pero ahora el HTML que genera es diferente)
        // ...
        data.data.forEach(consulta => {
            const consultaCard = document.createElement('div');
            consultaCard.className = 'consulta-card';
            // ...
            // El innerHTML ahora incluye el botón de eliminar
            consultaCard.innerHTML = `
                <details>
                    <summary class="consulta-summary">
                        ...
                    </summary>
                    <div class="consulta-details">
                        <button class="delete-btn" data-id="${consulta.id}">🗑️ Eliminar Consulta</button>
                        <hr>
                        ... (resto de los detalles)
                    </div>
                </details>`;
            historialContainer.appendChild(consultaCard);
        });
    }
    
    // --- NUEVA: Función para llamar al API y eliminar ---
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
    
    /* ... Pega aquí el resto de las funciones de tu historial-script.js ... */
});
