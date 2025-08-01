document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbw6jZIjBoeSlIRF-lAMPNqmbxRsncqulzZEi8f7q2AyOawxbpSZRIUxsx9UgZwe/exec';

    // --- ELEMENTOS DEL DOM ---
    const patientBanner = document.getElementById('patient-banner');
    const backToVisorBtn = document.getElementById('back-to-visor');
    const tableBody = document.getElementById('vacunas-table-body');
    const addVaccineBtn = document.getElementById('add-vaccine-btn');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const vacunaForm = document.getElementById('vacuna-form');
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

    patientBanner.innerHTML = `Esquema de: <strong>${activePatient.nombre} ${activePatient.apellidoPaterno}</strong>`;
    backToVisorBtn.href = `visor.html?codigo=${activePatient.codigoUnico}`;
    document.getElementById('fechaAplicacion').valueAsDate = new Date();

    applyPermissions(); // <-- Aplicar permisos para el resto de los roles
    loadVaccineHistory();

    // --- MANEJO DE EVENTOS ---
    addVaccineBtn.addEventListener('click', () => openModal());
    closeModalBtn.addEventListener('click', () => closeModal());
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeModal();
    });
    vacunaForm.addEventListener('submit', handleFormSubmit);

    // --- FUNCIONES ---

    function applyPermissions() {
        if (!currentUser) return;
        const userRole = currentUser.profile;

        // Regla 2 y 3: Solo 'medico' y 'superusuario' pueden registrar vacunas.
        const hasEditPermission = (userRole === 'medico' || userRole === 'superusuario');

        if (!hasEditPermission) {
            // Si no tiene permiso, ocultar el botón de registro.
            addVaccineBtn.style.display = 'none';
        }
    }

    async function loadVaccineHistory() {
        tableBody.innerHTML = '<tr><td colspan="5">Cargando historial...</td></tr>';
        try {
            const response = await fetch(`${API_URL}?action=getVacunas&codigo=${activePatient.codigoUnico}`);
            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.message);
            
            if (data.data.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5">No hay vacunas registradas para este paciente.</td></tr>';
                return;
            }

            tableBody.innerHTML = '';
            data.data.forEach(vacuna => {
                const tr = document.createElement('tr');
                const fecha = new Date(vacuna.fechaAplicacion + 'T00:00:00').toLocaleDateString('es-ES');
                tr.innerHTML = `
                    <td>${vacuna.nombreVacuna}</td>
                    <td>${vacuna.dosis}</td>
                    <td>${fecha}</td>
                    <td>${vacuna.lote}</td>
                    <td>${vacuna.profesional}</td>
                `;
                tableBody.appendChild(tr);
            });
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="5" class="error-message">Error: ${error.message}</td></tr>`;
        }
    }

    function openModal() {
        vacunaForm.reset();
        document.getElementById('fechaAplicacion').valueAsDate = new Date();
        responseMsg.style.display = 'none';
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

        const formData = {
            action: 'guardarVacuna',
            codigoUnico: activePatient.codigoUnico,
            nombreVacuna: document.getElementById('nombreVacuna').value,
            dosis: document.getElementById('dosis').value,
            fechaAplicacion: document.getElementById('fechaAplicacion').value,
            lote: document.getElementById('lote').value,
            profesional: document.getElementById('profesional').value,
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
});
