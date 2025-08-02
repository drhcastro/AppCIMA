document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbxXXUPOvKK5HRSeFsM3LYVvkweqxKBhxMjxASg_0-7sEyke-LZ2eOPQkaz0quXoN3Mc/exec';
    let loadedVaccines = [];

    // --- ELEMENTOS DEL DOM ---
    const patientBanner = document.getElementById('patient-banner');
    const backToVisorBtn = document.getElementById('back-to-visor');
    const tableBody = document.getElementById('vacunas-table-body');
    const addVaccineBtn = document.getElementById('add-vaccine-btn');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const vacunaForm = document.getElementById('vacuna-form');
    const responseMsg = document.getElementById('response-message');
    const modalTitle = document.getElementById('vacuna-modal').querySelector('h2');
    
    // Añadir un input oculto para el ID en el formulario
    const hiddenIdInput = document.createElement('input');
    hiddenIdInput.type = 'hidden';
    hiddenIdInput.id = 'vacunaId';
    vacunaForm.prepend(hiddenIdInput);

    // --- LÓGICA DE INICIALIZACIÓN Y PERMISOS ---
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

    patientBanner.innerHTML = `Esquema de: <strong>${activePatient.nombre} ${activePatient.apellidoPaterno}</strong>`;
    backToVisorBtn.href = `visor.html?codigo=${activePatient.codigoUnico}`;

    applyPermissions();
    loadVaccineHistory();

    // --- MANEJO DE EVENTOS ---
    addVaccineBtn.addEventListener('click', () => openModal()); // Abrir modal para crear
    closeModalBtn.addEventListener('click', () => closeModal());
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeModal();
    });
    vacunaForm.addEventListener('submit', handleFormSubmit);

    // Eventos para Editar y Eliminar
    tableBody.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const recordId = target.dataset.id;
        if (target.classList.contains('delete-btn')) {
            if (confirm('¿Estás seguro de que deseas eliminar este registro de vacuna?')) {
                deleteRecord(recordId);
            }
        }
        if (target.classList.contains('edit-btn')) {
            editRecord(recordId);
        }
    });

    // --- FUNCIONES ---
    function applyPermissions() {
        if (!currentUser) return;
        const userRole = currentUser.profile;
        const hasEditPermission = (userRole === 'medico' || userRole === 'superusuario');

        if (!hasEditPermission) {
            addVaccineBtn.style.display = 'none';
        }
    }

    async function loadVaccineHistory() {
        tableBody.innerHTML = '<tr><td colspan="6">Cargando historial...</td></tr>';
        try {
            const response = await fetch(`${API_URL}?action=getVacunas&codigo=${activePatient.codigoUnico}`);
            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.message);

            loadedVaccines = data.data; // Guardar datos cargados

            if (loadedVaccines.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6">No hay vacunas registradas para este paciente.</td></tr>';
                return;
            }

            tableBody.innerHTML = '';
            const userRole = currentUser ? currentUser.profile : null;
            const canEditOrDelete = (userRole === 'medico' || userRole === 'superusuario');

            loadedVaccines.forEach(vacuna => {
                const tr = document.createElement('tr');
                const fecha = new Date(vacuna.fechaAplicacion).toLocaleDateString('es-ES');
                tr.innerHTML = `
                    <td>${vacuna.nombreVacuna}</td>
                    <td>${vacuna.dosis}</td>
                    <td>${fecha}</td>
                    <td>${vacuna.lote}</td>
                    <td>${vacuna.profesional}</td>
                    <td class="actions-cell">
                        ${canEditOrDelete ? `
                        <button class="edit-btn small-btn" data-id="${vacuna.id}">✏️</button>
                        <button class="delete-btn small-btn" data-id="${vacuna.id}">🗑️</button>
                        ` : ''}
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="6" class="error-message">Error: ${error.message}</td></tr>`;
        }
    }

    function openModal(recordToEdit = null) {
        vacunaForm.reset();
        responseMsg.style.display = 'none';
        
        if (recordToEdit) {
            // Modo Edición
            modalTitle.textContent = "Editar Dosis de Vacuna";
            hiddenIdInput.value = recordToEdit.id;
            document.getElementById('nombreVacuna').value = recordToEdit.nombreVacuna;
            document.getElementById('dosis').value = recordToEdit.dosis;
            document.getElementById('fechaAplicacion').value = recordToEdit.fechaAplicacion;
            document.getElementById('lote').value = recordToEdit.lote;
            document.getElementById('profesional').value = recordToEdit.profesional;
        } else {
            // Modo Creación
            modalTitle.textContent = "Registrar Nueva Dosis";
            hiddenIdInput.value = '';
            document.getElementById('fechaAplicacion').valueAsDate = new Date();
        }
        
        modalBackdrop.classList.remove('hidden');
    }

    function closeModal() {
        modalBackdrop.classList.add('hidden');
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const submitBtn = vacunaForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';

        const recordId = hiddenIdInput.value;
        const isEditing = !!recordId;

        const formData = {
            codigoUnico: activePatient.codigoUnico,
            nombreVacuna: document.getElementById('nombreVacuna').value,
            dosis: document.getElementById('dosis').value,
            fechaAplicacion: document.getElementById('fechaAplicacion').value,
            lote: document.getElementById('lote').value,
            profesional: document.getElementById('profesional').value,
        };
        
        if (isEditing) {
            formData.action = 'actualizarVacuna';
            formData.id = recordId;
        } else {
            formData.action = 'guardarVacuna';
        }

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(formData),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.message);
            
            closeModal();
            loadVaccineHistory();
        } catch (error) {
            responseMsg.textContent = `Error: ${error.message}`;
            responseMsg.className = 'error';
            responseMsg.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Guardar Dosis';
        }
    }

    function editRecord(id) {
        const recordToEdit = loadedVaccines.find(v => v.id == id);
        if (recordToEdit) {
            openModal(recordToEdit);
        }
    }

    async function deleteRecord(id) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'eliminarVacuna', id: id }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.message);
            
            alert('Registro de vacuna eliminado.');
            loadVaccineHistory();
        } catch (error) {
            alert(`Error al eliminar: ${error.message}`);
        }
    }
});
