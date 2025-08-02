document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbxXXUPOvKK5HRSeFsM3LYVvkweqxKBhxMjxASg_0-7sEyke-LZ2eOPQkaz0quXoN3Mc/exec';
    const TIPOS_DE_TAMIZAJES = ["Cardiológico", "Metabólico", "Visual", "Auditivo", "Genético", "Cadera"];

    // --- ELEMENTOS DEL DOM ---
    const responseMsg = document.getElementById('response-message');
    const patientDataForm = document.getElementById('patient-data-form');
    const patientCodeDisplay = document.getElementById('patient-code-display');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const dashboardContainer = document.querySelector('.dashboard-summary');

    // --- VERIFICACIÓN DE PÁGINA ---
    if (!patientDataForm) {
        return; // Si no estamos en visor.html, no hacer nada más.
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
    if(dashboardContainer) dashboardContainer.style.display = 'none';

    // --- LLAMADA AL API PARA OBTENER DATOS DEL DASHBOARD ---
    fetch(`${API_URL}?action=getDashboardData&codigo=${codigo}`)
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success' && data.data) {
                const dashboardData = data.data;
                
                // 1. Poblar el formulario del expediente
                populatePatientData(dashboardData.paciente);
                
                // 2. Poblar el nuevo panel de control
                populateDashboard(dashboardData.resumen);

                // 3. Guardar en memoria y aplicar permisos
                localStorage.setItem('activePatient', JSON.stringify(dashboardData.paciente));
                patientDataForm.style.display = 'block';
                if(dashboardContainer) dashboardContainer.style.display = 'grid';
                applyPermissions();
            } else {
                throw new Error(data.message || 'Error al cargar los datos del paciente.');
            }
        })
        .catch(error => {
            displayError(error.message);
            localStorage.removeItem('activePatient');
        });

    patientDataForm.addEventListener('submit', handleSaveChanges);

    // --- FUNCIONES ---

    function populateDashboard(resumen) {
        const fechaConsulta = resumen.ultimaConsulta === "Ninguna registrada" 
            ? "Ninguna registrada"
            : new Date(resumen.ultimaConsulta).toLocaleDateString('es-ES');
        document.getElementById('summary-ultima-consulta').textContent = fechaConsulta;
        
        document.getElementById('summary-planes-activos').textContent = resumen.planesActivos;

        const tamizajesPendientes = TIPOS_DE_TAMIZAJES.filter(t => !resumen.tamizajesRealizados.includes(t));
        const pendientesText = tamizajesPendientes.length > 0 ? tamizajesPendientes.join(', ') : "Ninguno";
        document.getElementById('summary-tamizajes-pendientes').textContent = pendientesText;
    }

    function applyPermissions() {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        if (!currentUser) return;
        const userRole = currentUser.profile;
        const saveChangesBtn = document.getElementById('save-changes-btn');

        if (userRole === 'asistente') {
            saveChangesBtn.disabled = true;
            saveChangesBtn.textContent = 'Guardado no permitido para este perfil';
            patientDataForm.querySelectorAll('input, select, textarea').forEach(el => el.disabled = true);
        }
    }

    function populatePatientData(patient) {
        for (const key in patient) {
            const element = document.getElementById(key);
            if (element) {
                if (key === 'fechaNacimiento' && patient[key]) {
                    element.value = patient[key]; // El API ya lo formatea a AAAA-MM-DD
                } else {
                    element.value = patient[key];
                }
            }
        }
    }

    async function handleSaveChanges(e) {
        e.preventDefault();
        const submitBtn = document.getElementById('save-changes-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';

        const formData = {
            action: 'actualizarPaciente',
            codigoUnico: codigo,
            nombre: document.getElementById('nombre').value,
            apellidoPaterno: document.getElementById('apellidoPaterno').value,
            apellidoMaterno: document.getElementById('apellidoMaterno').value,
            fechaNacimiento: document.getElementById('fechaNacimiento').value,
            sexo: document.getElementById('sexo').value,
            domicilio: document.getElementById('domicilio').value,
            telefono: document.getElementById('telefono').value,
            nombreMama: document.getElementById('nombreMama').value,
            nombrePapa: document.getElementById('nombrePapa').value,
            correoElectrónico: document.getElementById('correoElectrónico').value,
            alergias: document.getElementById('alergias').value,
            antecedentesHeredofamiliares: document.getElementById('antecedentesHeredofamiliares').value,
            antecedentesPerinatales: document.getElementById('antecedentesPerinatales').value,
            antecedentesPatologicos: document.getElementById('antecedentesPatologicos').value,
            antecedentesNoPatologicos: document.getElementById('antecedentesNoPatologicos').value
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(formData),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.message);
            // Actualizar los datos locales después de guardar
            localStorage.setItem('activePatient', JSON.stringify(formData));
            displayMessage('success', '¡Expediente actualizado con éxito!');
        } catch (error) {
            displayMessage('error', `Error al guardar: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '💾 Guardar Cambios en el Expediente';
        }
    }

    function displayError(message) {
        if(patientDataForm) patientDataForm.style.display = 'none';
        if(dashboardContainer) dashboardContainer.style.display = 'none';
        displayMessage('error', message);
    }

    function displayMessage(type, message) {
        responseMsg.className = type;
        responseMsg.textContent = message;
        responseMsg.style.display = 'block';
    }
});
