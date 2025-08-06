document.addEventListener('DOMContentLoaded', () => {
    // La conexión 'db' ya está disponible gracias a auth-guard.js
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
            
            // --- CORRECCIÓN CLAVE AQUÍ ---
            // Asegurarse de que la variable 'consulta' está definida en el forEach.
            loadedConsultas.forEach(consulta => {
                const consultaCard = document.createElement('div');
                consultaCard.className = 'consulta-card';
                // Corrección de la fecha para evitar problemas de zona horaria
                const fecha = new Date(consulta.fechaConsulta + 'T00:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
                
                 consultaCard.innerHTML = `
                    <details>
                        <summary>...</summary>
                        <div class="consulta-details" id="detail-${consulta.id}">
                            <div class="details-actions">
                                <button class="print-btn" data-id="${consulta.id}">🖨️ Imprimir</button>
                                <button class="edit-btn" data-id="${consulta.id}">✏️ Editar</button>
                                <button class="delete-btn" data-id="${consulta.id}">🗑️ Eliminar</button>
                            </div>
                            <hr>
                            ... (resto de los detalles)
                        </div>
                    </details>`;
                historialContainer.appendChild(consultaCard);
            });
    }
// --- NUEVA FUNCIÓN PARA IMPRIMIR ---
    function printRecord(id) {
        const detailToPrint = document.getElementById(`detail-${id}`);
        if (!detailToPrint) return;

        // Añadir clase para que solo esta sección sea visible al imprimir
        detailToPrint.classList.add('printable-area');
        window.print();
        // Quitar la clase después de imprimir
        detailToPrint.classList.remove('printable-area');
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
