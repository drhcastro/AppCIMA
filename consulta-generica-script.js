document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbxXXUPOvKK5HRSeFsM3LYVvkweqxKBhxMjxASg_0-7sEyke-LZ2eOPQkaz0quXoN3Mc/exec';
    let loadedHistory = []; // Variable para guardar el historial cargado

    // Configuración para cada tipo de especialidad
    const specialtyConfig = {
        psicologia: {
            title: "Psicología",
            getAction: "getPsicologia",
            saveAction: "guardarPsicologia",
            updateAction: "actualizarPsicologia",
            deleteAction: "eliminarPsicologia",
            allowedProfile: "psicologo"
        },
        nutricion: {
            title: "Nutrición",
            getAction: "getNutricion",
            saveAction: "guardarNutricion",
            updateAction: "actualizarNutricion",
            deleteAction: "eliminarNutricion",
            allowedProfile: "nutricionista"
        },
        rehabilitacion: {
            title: "Rehabilitación",
            getAction: "getRehabilitacion",
            saveAction: "guardarRehabilitacion",
            updateAction: "actualizarRehabilitacion",
            deleteAction: "eliminarRehabilitacion",
            allowedProfile: "rehabilitador"
        }
    };

    // --- ELEMENTOS DEL DOM ---
    const patientBanner = document.getElementById('patient-banner');
    const backToVisorBtn = document.getElementById('back-to-visor');
    const notaForm = document.getElementById('nota-form');
    const responseMsg = document.getElementById('response-message');
    const historialContainer = document.getElementById('historial-container');
    const submitBtn = notaForm.querySelector('button[type="submit"]');

    // --- LÓGICA DE INICIALIZACIÓN ---
    const params = new URLSearchParams(window.location.search);
    const tipo = params.get('tipo');
    const mode = params.get('mode');
    const recordId = params.get('id');
    const config = specialtyConfig[tipo];

    const activePatient = JSON.parse(localStorage.getItem('activePatient'));
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

    if (!activePatient || !config) {
        document.body.innerHTML = "<h1>Error: Paciente o tipo de consulta no especificado.</h1>";
        return;
    }

    // Personalizar la página
    document.getElementById('page-title').textContent = `Consulta de ${config.title}`;
    document.getElementById('main-title').textContent = `Consulta de ${config.title}`;
    document.getElementById('form-title').textContent = `Registrar Nueva Nota de ${config.title}`;
    patientBanner.innerHTML = `Expediente de: <strong>${activePatient.nombre} ${activePatient.apellidoPaterno}</strong>`;
    backToVisorBtn.href = `visor.html?codigo=${activePatient.codigoUnico}`;

    if (mode === 'edit' && recordId) {
        document.querySelector('h3#form-title').textContent = `Editar Nota de ${config.title}`;
        const recordToEdit = JSON.parse(sessionStorage.getItem('recordToEdit'));
        if (recordToEdit && recordToEdit.id == recordId) {
            document.getElementById('fechaConsulta').value = recordToEdit.fechaConsulta;
            document.getElementById('profesional').value = recordToEdit.profesional;
            document.getElementById('notaClinica').value = recordToEdit.notaClinica;
            document.getElementById('planSeguimiento').value = recordToEdit.planSeguimiento;
        }
    } else {
        document.getElementById('fechaConsulta').valueAsDate = new Date();
    }

    applyPermissions();
    loadHistory();

    // --- MANEJO DE EVENTOS ---
    notaForm.addEventListener('submit', handleFormSubmit);
    historialContainer.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const id = target.dataset.id;
        if (target.classList.contains('delete-btn')) {
            if (confirm('¿Estás seguro de que deseas eliminar esta nota?')) {
                deleteRecord(id);
            }
        }
        if (target.classList.contains('edit-btn')) {
             editRecord(id);
        }
    });

    // --- FUNCIONES ---
    function applyPermissions() {
        if (!currentUser) return;
        const userRole = currentUser.profile;
        const hasPermission = [config.allowedProfile, 'medico', 'superusuario'].includes(userRole);

        if (!hasPermission) {
            notaForm.querySelectorAll('input, textarea, button').forEach(el => {
                el.disabled = true;
            });
            submitBtn.textContent = 'Permiso denegado';
            submitBtn.style.backgroundColor = '#6c757d';
        }
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';

        const formData = {
            codigoUnico: activePatient.codigoUnico,
            fechaConsulta: document.getElementById('fechaConsulta').value,
            profesional: document.getElementById('profesional').value,
            notaClinica: document.getElementById('notaClinica').value,
            planSeguimiento: document.getElementById('planSeguimiento').value,
        };

        if (mode === 'edit') {
            formData.action = config.updateAction;
            formData.id = recordId;
        } else {
            formData.action = config.saveAction;
        }

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(formData),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.message);
            
            alert(`Nota ${mode === 'edit' ? 'actualizada' : 'guardada'} con éxito.`);
            sessionStorage.removeItem('recordToEdit');
            window.location.href = `consulta-generica.html?tipo=${tipo}`;
        } catch (error) {
            responseMsg.textContent = `Error: ${error.message}`;
            responseMsg.className = 'error';
            responseMsg.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Guardar Nota';
        }
    }

    async function loadHistory() {
        historialContainer.innerHTML = 'Cargando historial...';
        try {
            const response = await fetch(`${API_URL}?action=${config.getAction}&codigo=${activePatient.codigoUnico}`);
            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.message);
            
            loadedHistory = data.data; // Guardar historial en la variable global

            if (loadedHistory.length === 0) {
                historialContainer.innerHTML = `<p>No hay notas de ${config.title} registradas.</p>`;
                return;
            }

            historialContainer.innerHTML = '';
            loadedHistory.forEach(nota => {
                const card = document.createElement('div');
                card.className = 'consulta-card';
                const fecha = new Date(nota.fechaConsulta).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
                card.innerHTML = `
                    <details>
                        <summary class="consulta-summary">
                            <div class="summary-info">
                                <strong>${fecha}</strong>
                            </div>
                            <span class="medico-preview">${nota.profesional || ''}</span>
                        </summary>
                        <div class="consulta-details">
                            <div class="details-actions">
                                <button class="edit-btn" data-id="${nota.id}">✏️ Editar</button>
                                <button class="delete-btn" data-id="${nota.id}">🗑️ Eliminar</button>
                            </div>
                            <hr>
                            <h4>Nota Clínica</h4>
                            <p>${(nota.notaClinica || '').replace(/\n/g, '<br>')}</p>
                            <hr>
                            <h4>Plan y Seguimiento</h4>
                            <p>${(nota.planSeguimiento || '').replace(/\n/g, '<br>')}</p>
                        </div>
                    </details>
                `;
                historialContainer.appendChild(card);
            });
        } catch (error) {
            historialContainer.innerHTML = `<p class="error-message">Error al cargar el historial: ${error.message}</p>`;
        }
    }
    
    function editRecord(id) {
        const recordToEdit = loadedHistory.find(n => n.id == id);
        if (recordToEdit) {
            sessionStorage.setItem('recordToEdit', JSON.stringify(recordToEdit));
            window.location.href = `consulta-generica.html?tipo=${tipo}&mode=edit&id=${id}`;
        }
    }

    async function deleteRecord(id) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: config.deleteAction, id: id }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.message);
            alert('Nota eliminada con éxito.');
            loadHistory();
        } catch (error) {
            alert(`Error al eliminar: ${error.message}`);
        }
    }
});
