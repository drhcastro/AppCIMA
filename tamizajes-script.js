document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbxXXUPOvKK5HRSeFsM3LYVvkweqxKBhxMjxASg_0-7sEyke-LZ2eOPQkaz0quXoN3Mc/exec';
    const TIPOS_DE_TAMIZAJES = [
        "Cardiológico", "Metabólico", "Visual", 
        "Auditivo", "Genético", "Cadera"
    ];

    // --- ELEMENTOS DEL DOM ---
    const patientBanner = document.getElementById('patient-banner');
    const listContainer = document.getElementById('tamizajes-list-container');
    const backToVisorBtn = document.getElementById('back-to-visor');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalTitle = document.getElementById('modal-title');
    const tamizajeForm = document.getElementById('tamizaje-form');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const responseMsg = document.getElementById('response-message');

    // --- LÓGICA DE INICIALIZACIÓN Y PERMISOS ---
    const activePatient = JSON.parse(localStorage.getItem('activePatient'));
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

    // Regla 1: Bloquear acceso total a 'asistente'
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
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeModal();
    });

    // --- FUNCIONES PRINCIPALES ---
    async function loadAndDisplayTamizajes() {
        try {
            const response = await fetch(`${API_URL}?action=getTamizajes&codigo=${activePatient.codigoUnico}`);
            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.message);
            
            const tamizajesGuardados = data.data;
            listContainer.innerHTML = '';

            const userRole = currentUser ? currentUser.profile : null;
            const hasEditPermission = (userRole === 'medico' || userRole === 'superusuario');

            TIPOS_DE_TAMIZAJES.forEach(tipo => {
                const registroExistente = tamizajesGuardados.find(t => t.tipoTamiz === tipo);
                // Pasamos el permiso de edición a la función que crea la tarjeta
                const card = createTamizajeCard(tipo, registroExistente, hasEditPermission);
                listContainer.appendChild(card);
            });
        } catch (error) {
            listContainer.innerHTML = `<p class="error-message">Error al cargar tamizajes: ${error.message}</p>`;
        }
    }

    function createTamizajeCard(tipo, registro, canEdit) {
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

        // Regla 2 y 3: Solo añadir el evento de clic si el usuario tiene permiso
        if (canEdit) {
            card.addEventListener('click', () => openModal(tipo, registro));
        } else {
            card.classList.add('view-only'); // Añadir clase para cambiar el cursor
        }
        return card;
    }

    function openModal(tipo, registro) {
        responseMsg.style.display = 'none';
        modalTitle.textContent = `${registro ? 'Editar' : 'Registrar'} Tamizaje ${tipo}`;
        
        tamizajeForm.reset();
        document.getElementById('tipoTamiz').value = tipo;
        if (registro) {
            document.getElementById('fechaRealizacion').value = registro.fechaRealizacion;
            document.getElementById('numeroFolio').value = registro.numeroFolio || '';
            document.getElementById('resultado').value = registro.resultado || '';
            document.getElementById('observaciones').value = registro.observaciones || '';
            document.getElementById('seguimiento').value = registro.seguimiento || '';
            document.getElementById('notas').value = registro.notas || '';
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

        const formData = {
            action: 'guardarTamizaje',
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
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(formData),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.message);
            
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
});
