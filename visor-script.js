document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbxXXUPOvKK5HRSeFsM3LYVvkweqxKBhxMjxASg_0-7sEyke-LZ2eOPQkaz0quXoN3Mc/exec';
    const TIPOS_DE_TAMIZAJES = ["Cardiológico", "Metabólico", "Visual", "Auditivo", "Genético", "Cadera"];

    // --- ELEMENTOS DEL DOM ---
    const responseMsg = document.getElementById('response-message');
    const patientDataForm = document.getElementById('patient-data-form');
    const patientBanner = document.getElementById('patient-banner');
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
    
    patientBanner.textContent = `Cargando datos para el código: ${codigo}...`;
    patientDataForm.style.display = 'none';
    if (dashboardContainer) dashboardContainer.style.display = 'none';

    // --- LLAMADA AL API PARA OBTENER DATOS DEL DASHBOARD ---
    fetch(`${API_URL}?action=getDashboardData&codigo=${codigo}`)
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success' && data.data) {
                const dashboardData = data.data;
                const patient = dashboardData.paciente;

                // 1. Poblar el encabezado
                patientBanner.innerHTML = `<strong>${patient.nombre} ${patient.apellidoPaterno || ''}</strong> | Código: ${patient.codigoUnico}`;
                
                // 2. Poblar el formulario del expediente
                populatePatientData(patient);
                
                // 3. Poblar el nuevo panel de control
                populateDashboard(dashboardData.resumen);

                // 4. Guardar en memoria y aplicar permisos
                localStorage.setItem('activePatient', JSON.stringify(patient));
                patientDataForm.style.display = 'block';
                if (dashboardContainer) dashboardContainer.style.display = 'grid';
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
        const fechaConsulta = resumen.ultimaConsulta === "Ninguna" 
            ? "Ninguna"
            : new Date(resumen.ultimaConsulta).toLocaleDateString('es-ES');
        document.getElementById('summary-ultima-consulta').textContent = fechaConsulta;
        
        const fechaVacuna = resumen.ultimaVacuna.fecha 
            ? new Date(resumen.ultimaVacuna.fecha).toLocaleDateString('es-ES') 
            : '';
        document.getElementById('summary-ultima-vacuna').innerHTML = `${resumen.ultimaVacuna.nombre} <small style="display:block; color:#6c757d;">${fechaVacuna}</small>`;

        const fechaConsultaEsp = resumen.ultimaConsultaEsp.fecha 
            ? new Date(resumen.ultimaConsultaEsp.fecha).toLocaleDateString('es-ES') 
            : '';
        let tipoEsp = resumen.ultimaConsultaEsp.tipo || "Ninguna";
        if (tipoEsp === "Psicologia") tipoEsp = "Psicología";
        if (tipoEsp === "Nutricion") tipoEsp = "Nutrición";
        if (tipoEsp === "Rehabilitacion") tipoEsp = "Rehabilitación";
        document.getElementById('summary-ultima-consulta-esp').innerHTML = `${tipoEsp} <small style="display:block; color:#6c757d;">${fechaConsultaEsp}</small>`;

        document.getElementById('summary-planes-activos').textContent = resumen.planesActivos;

        const tamizajesPendientes = TIPOS_DE_TAMIZAJES.filter(t => !resumen.tamizajesRealizados.includes(t));
        const pendientesText = tamizajesPendientes.length > 0 ? tamizajesPendientes.length.toString() : "Ninguno";
        const pendientesTitle = tamizajesPendientes.length > 0 ? tamizajesPendientes.join(', ') : "Todos los tamizajes registrados";
        document.getElementById('summary-tamizajes-pendientes').textContent = pendientesText;
        document.getElementById('summary-tamizajes-pendientes').title = pendientesTitle;
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
                    element.value = patient[key];
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
