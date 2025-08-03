document.addEventListener('DOMContentLoaded', () => {
    // --- LÍNEA DE DIAGNÓSTICO #1 ---
    // Si ves este mensaje en la consola (F12), estás ejecutando la versión correcta de este archivo.
    console.log("Cargando tamizajes-script.js vDiagnostico...");

    // La conexión 'db' ya está disponible gracias a auth-guard.js
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
    
    // Añadir un input oculto para el ID en el formulario
    const hiddenIdInput = document.createElement('input');
    hiddenIdInput.type = 'hidden';
    hiddenIdInput.id = 'tamizajeId';
    if(tamizajeForm) tamizajeForm.prepend(hiddenIdInput);

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
    if(tamizajeForm) tamizajeForm.addEventListener('submit', handleFormSubmit);
    if(closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if(modalBackdrop) modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeModal();
    });
    if(listContainer) {
        listContainer.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;

            const tipoTamiz = target.dataset.tipo;
            const recordId = target.dataset.id;
            
            if (target.classList.contains('register-btn')) {
                openModal(tipoTamiz);
            }
            if (target.classList.contains('edit-btn')) {
                const registro = loadedTamizajes.find(t => t.id == recordId);
                openModal(tipoTamiz, registro);
            }
            if (target.classList.contains('delete-btn')) {
                if (confirm('¿Estás seguro de que deseas eliminar este registro?')) {
                    deleteRecord(recordId);
                }
            }
        });
    }

    // --- FUNCIONES ---
    async function loadAndDisplayTamizajes() {
        listContainer.innerHTML = 'Cargando...';
        try {
            const querySnapshot = await db.collection('tamizajes').where('codigoUnico', '==', activePatient.codigoUnico).get();
            loadedTamizajes = querySnapshot.docs.map(doc => doc.data());
            listContainer.innerHTML = '';
            const hasEditPermission = (currentUser && (currentUser.profile === 'medico' || currentUser.profile === 'superusuario'));

            TIPOS_DE_TAMIZAJES.forEach(tipo => {
                const registroExistente = loadedTamizajes.find(t => t.tipoTamiz === tipo);
                const card = createTamizajeCard(tipo, registroExistente, hasEditPermission);
                listContainer.appendChild(card);
            });
        } catch (error) {
            listContainer.innerHTML = `<p class="error-message">Error al cargar tamizajes: ${error.message}</p>`;
        }
    }

    function createTamizajeCard(tipo, registro, canEdit) {
        const card = document.createElement('div');
        card.className = 'consulta-card';
        let statusHtml;
        if (registro) {
            const fecha = new Date(registro.fechaRealizacion).toLocaleDateString('es-ES');
            statusHtml = `<div class="summary-info"><strong>Realizado: ${fecha}</strong><span class="motivo-preview">Resultado: ${registro.resultado}</span></div><div class="plan-actions">${canEdit ? `<button class="edit-btn small-btn" data-id="${registro.id}" data-tipo="${tipo}">✏️ Editar</button><button class="delete-btn small-btn" data-id="${registro.id}">🗑️ Eliminar</button>` : ''}</div>`;
        } else {
            statusHtml = `<div class="summary-info"><strong>Pendiente</strong></div><div class="plan-actions">${canEdit ? `<button class="register-btn button-primary small-btn" data-tipo="${tipo}">➕ Registrar</button>` : ''}</div>`;
        }
        card.innerHTML = `<div class="plan-summary"><h3>${tipo}</h3>${statusHtml}</div>`;
        return card;
    }

    function openModal(tipo, registro = null) {
        // --- LÍNEA DE DIAGNÓSTICO #2 ---
        console.log("Intentando abrir modal. ¿Existe el campo #tipoTamiz?", document.getElementById('tipoTamiz'));
        
        responseMsg.style.display = 'none';
        modalTitle.textContent = `${registro ? 'Editar' : 'Registrar'} Tamizaje ${tipo}`;
        
        // El script se detiene aquí si el elemento es nulo
        document.getElementById('tipoTamiz').value = tipo; 
        
        tamizajeForm.reset();
        
        if (registro) {
            hiddenIdInput.value = registro.id;
            document.getElementById('fechaRealizacion').value = registro.fechaRealizacion;
            document.getElementById('numeroFolio').value = registro.numeroFolio || '';
            document.getElementById('resultado').value = registro.resultado || '';
            document.getElementById('observaciones').value = registro.observaciones || '';
            document.getElementById('seguimiento').value = registro.seguimiento || '';
            document.getElementById('notas').value = registro.notas || '';
        } else {
            hiddenIdInput.value = '';
            document.getElementById('fechaRealizacion').valueAsDate = new Date();
        }
        
        modalBackdrop.classList.remove('hidden');
    }

    function closeModal() {
        modalBackdrop.classList.add('hidden');
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const submitBtn = tamizajeForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';
        const recordId = hiddenIdInput.value;
        const isEditing = !!recordId;

        const formData = {
            codigoUnico: activePatient.codigoUnico,
            tipoTamiz: document.getElementById('tipoTamiz').value,
            fechaRealizacion: document.getElementById('fechaRealizacion').value,
            numeroFolio: document.getElementById('numeroFolio').value,
            resultado: document.getElementById('resultado').value,
            observaciones: document.getElementById('observaciones').value,
            seguimiento: document.getElementById('seguimiento').value,
            notas: document.getElementById('notas').value
        };
        
        try {
            if (isEditing) {
                await db.collection('tamizajes').doc(recordId).update(formData);
            } else {
                formData.id = new Date().getTime().toString();
                await db.collection('tamizajes').doc(formData.id).set(formData);
            }
            closeModal();
            loadAndDisplayTamizajes();
        } catch (error) {
            responseMsg.textContent = `Error: ${error.message}`;
            responseMsg.className = 'error';
            responseMsg.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Guardar Cambios';
        }
    }

    async function deleteRecord(id) {
        try {
            await db.collection('tamizajes').doc(id).delete();
            alert('Registro eliminado.');
            loadAndDisplayTamizajes();
        } catch (error) {
            alert(`Error al eliminar: ${error.message}`);
        }
    }
});
