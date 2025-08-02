document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbxXXUPOvKK5HRSeFsM3LYVvkweqxKBhxMjxASg_0-7sEyke-LZ2eOPQkaz0quXoN3Mc/exec';

    // --- ELEMENTOS DEL DOM ---
    const responseMsg = document.getElementById('response-message');
    const patientDataForm = document.getElementById('patient-data-form');
    const patientCodeDisplay = document.getElementById('patient-code-display');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const saveChangesBtn = document.getElementById('save-changes-btn');

    // --- LÓGICA DE PERMISOS ---
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    // Función que se llamará después de cargar los datos del paciente
    function applyPermissions() {
        if (!currentUser) return; // Si no hay usuario, el guardián ya se encargó de redirigir

        const userRole = currentUser.profile;

        // Regla: El asistente no puede guardar cambios en el expediente principal.
        if (userRole === 'asistente') {
            saveChangesBtn.disabled = true;
            saveChangesBtn.textContent = 'Guardado no permitido para este perfil';
            
            // Opcional: Deshabilitar todos los campos del formulario
            patientDataForm.querySelectorAll('input, select, textarea').forEach(el => el.disabled = true);
        }
    }

    // --- LÓGICA DE PESTAÑAS ---
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === button.dataset.tab) {
                    content.classList.add('active');
                }
            });
        });
    });

    // --- LÓGICA PRINCIPAL ---
    const params = new URLSearchParams(window.location.search);
    const codigo = params.get('codigo');

    if (!codigo) {
        displayError("No se ha especificado un código de paciente.");
        return;
    }
    
    patientCodeDisplay.textContent = `Código: ${codigo}`;
    patientDataForm.style.display = 'none';

    fetch(`${API_URL}?action=getPaciente&codigo=${codigo}`)
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success' && data.data) {
                populatePatientData(data.data);
                localStorage.setItem('activePatient', JSON.stringify(data.data));
                patientDataForm.style.display = 'block';
                applyPermissions(); // <-- Aplicar permisos una vez que la página cargó
            } else {
                throw new Error(data.message || 'Error al cargar los datos del paciente.');
            }
        })
        .catch(error => {
            displayError(error.message);
            localStorage.removeItem('activePatient');
        });

    patientDataForm.addEventListener('submit', handleSaveChanges);

    // --- FUNCIONES (sin cambios) ---
    function populatePatientData(patient) { /* ...código sin cambios... */ }
    async function handleSaveChanges(e) { /* ...código sin cambios... */ }
    function displayError(message) { /* ...código sin cambios... */ }
    function displayMessage(type, message) { /* ...código sin cambios... */ }

    /* --- PEGA AQUÍ LAS FUNCIONES SIN CAMBIOS DE TU VISOR-SCRIPT.JS --- */
    function populatePatientData(patient) {
        for (const key in patient) {
            const element = document.getElementById(key);
            if (element) {
                if (key === 'fechaNacimiento' && patient[key]) {
                    element.value = patient[key].substring(0, 10);
                } else {
                    element.value = patient[key];
                }
            }
        }
    }
    async function handleSaveChanges(e) {
        e.preventDefault();
        saveChangesBtn.disabled = true;
        saveChangesBtn.textContent = 'Guardando...';
        const formData = {
            action: 'actualizarPaciente', codigoUnico: codigo, nombre: document.getElementById('nombre').value,
            apellidoPaterno: document.getElementById('apellidoPaterno').value, apellidoMaterno: document.getElementById('apellidoMaterno').value,
            fechaNacimiento: document.getElementById('fechaNacimiento').value, sexo: document.getElementById('sexo').value,
            domicilio: document.getElementById('domicilio').value, telefono: document.getElementById('telefono').value,
            nombreMama: document.getElementById('nombreMama').value, nombrePapa: document.getElementById('nombrePapa').value,
            correoElectrónico: document.getElementById('correoElectrónico').value, alergias: document.getElementById('alergias').value,
            antecedentesHeredofamiliares: document.getElementById('antecedentesHeredofamiliares').value,
            antecedentesPerinatales: document.getElementById('antecedentesPerinatales').value,
            antecedentesPatologicos: document.getElementById('antecedentesPatologicos').value,
            antecedentesNoPatologicos: document.getElementById('antecedentesNoPatologicos').value
        };
        try {
            const response = await fetch(API_URL, {
                method: 'POST', body: JSON.stringify(formData), headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.message);
            localStorage.setItem('activePatient', JSON.stringify(formData));
            displayMessage('success', '¡Expediente actualizado con éxito!');
        } catch (error) {
            displayMessage('error', `Error al guardar: ${error.message}`);
        } finally {
            saveChangesBtn.disabled = false;
            saveChangesBtn.textContent = '💾 Guardar Cambios en el Expediente';
        }
    }
    function displayError(message) {
        patientDataForm.style.display = 'none';
        displayMessage('error', message);
    }
    function displayMessage(type, message) {
        responseMsg.className = type;
        responseMsg.textContent = message;
        responseMsg.style.display = 'block';
    }
});
