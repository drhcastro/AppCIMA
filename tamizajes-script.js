document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbxXXUPOvKK5HRSeFsM3LYVvkweqxKBhxMjxASg_0-7sEyke-LZ2eOPQkaz0quXoN3Mc/exec';
    const TIPOS_DE_TAMIZAJES = ["Cardiológico", "Metabólico", "Visual", "Auditivo", "Genético", "Cadera"];
    let loadedTamizajes = [];

    // --- ELEMENTOS DEL DOM ---
    const patientBanner = document.getElementById('patient-banner');
    const listContainer = document.getElementById('tamizajes-list-container');
    const backToVisorBtn = document.getElementById('back-to-visor');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalTitle = document.getElementById('modal-title');
    const tamizajeForm = document.getElementById('tamizaje-form');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const responseMsg = document.getElementById('response-message');
    const hiddenIdInput = document.createElement('input');
    hiddenIdInput.type = 'hidden';
    hiddenIdInput.id = 'tamizajeId';
    tamizajeForm.prepend(hiddenIdInput);


    // --- INICIALIZACIÓN Y PERMISOS ---
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
    patientBanner.innerHTML = `Mostrando tamizajes para: <strong>${activePatient.nombre} ${activePatient.apellidoPaterno}</strong>`;
    backToVisorBtn.href = `visor.html?codigo=${activePatient.codigoUnico}`;
    loadAndDisplayTamizajes();

    // --- MANEJO DE EVENTOS ---
    tamizajeForm.addEventListener('submit', handleFormSubmit);
    closeModalBtn.addEventListener('click', closeModal);
    listContainer.addEventListener('click', (e) => {
        const target = e.target.closest('.tamizaje-card');
        if (target) {
            const tipo = target.dataset.tipo;
            const registro = loadedTamizajes.find(t => t.tipoTamiz === tipo);
            openModal(tipo, registro);
        }
    });

    function createTamizajeCard(tipo, registro, canEdit) {
        // Esta función ahora solo muestra. El clic se maneja arriba.
        const card = document.createElement('div');
        card.className = 'tamizaje-card';
        card.dataset.tipo = tipo;

        const statusText = registro ? `Realizado: ${new Date(registro.fechaRealizacion).toLocaleDateString('es-ES')}` : 'Pendiente';
        const statusClass = registro ? 'status-completado' : 'status-pendiente';
        const resultadoText = registro ? `Resultado: ${registro.resultado}` : '';

        card.innerHTML = `
            <div class="tamizaje-info">
                <h3>${tipo}</h3>
                <p>${resultadoText}</p>
            </div>
            <div class="tamizaje-status">
                <span class="${statusClass}">${statusText}</span>
            </div>
        `;

        if (!canEdit) card.classList.add('view-only');
        return card;
    }

    async function loadAndDisplayTamizajes() {
        // ... (lógica de carga igual, pero sin el listener de clic dentro del bucle)
        const userRole = currentUser ? currentUser.profile : null;
        const hasEditPermission = (userRole === 'medico' || userRole === 'superusuario');
        if(!hasEditPermission){
            listContainer.addEventListener('click', e => e.preventDefault());
        }
    }

    // ... (El resto de las funciones como openModal, closeModal, handleFormSubmit sin cambios)
});
