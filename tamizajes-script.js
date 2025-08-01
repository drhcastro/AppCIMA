document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbw6jZIjBoeSlIRF-lAMPNqmbxRsncqulzZEi8f7q2AyOawxbpSZRIUxsx9UgZwe/exec';
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

    // --- LÓGICA DE INICIALIZACIÓN ---
    const activePatient = JSON.parse(localStorage.getItem('activePatient'));

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
            listContainer.innerHTML = ''; // Limpiar lista

            TIPOS_DE_TAMIZAJES.forEach(tipo => {
                const registroExistente = tamizajesGuardados.find(t => t.tipoTamiz === tipo);
                const card = createTamizajeCard(tipo, registroExistente);
                listContainer.appendChild(card);
            });
        } catch (error) {
            listContainer.innerHTML = `<p class="error-message">Error al cargar tamizajes: ${error.message}</p>`;
        }
    }

    function createTamizajeCard(tipo, registro) {
        const card = document.createElement('div');
        card.className = 'tamizaje-card';
        card.dataset.tipo = tipo;

        // --- CORRECCIÓN AQUÍ ---
        // Se crea la fecha directamente del valor del API, sin añadirle nada.
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

        card.addEventListener('click', () => openModal(tipo, registro));
        return card;
    }

    function openModal(tipo, registro) {
        responseMsg.style.display = 'none';
        modalTitle.textContent = `${registro ? 'Editar' : 'Registrar'} Tamizaje ${tipo}`;
        
        tamizajeForm.reset();
        document.getElementById('tipoTamiz').value = tipo;
        if (registro) {
            document.getElementById('fechaRealizacion').value = registro.fechaRealizacion.substring(0, 10);
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
            loadAndDisplayTamizajes(); // Recargar la lista
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
