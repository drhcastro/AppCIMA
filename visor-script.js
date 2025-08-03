document.addEventListener('DOMContentLoaded', () => {
    // La conexión a Firebase ('db') ya está disponible globalmente gracias a auth-guard.js

    // --- CONFIGURACIÓN ---
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


    // --- NUEVA LÓGICA DE CARGA DIRECTA DESDE FIRESTORE ---
    async function loadAllPatientData() {
        try {
            // 1. Obtener los datos principales del paciente
            const patientDoc = await db.collection('pacientes').doc(codigo).get();
            if (!patientDoc.exists) {
                throw new Error("Documento no encontrado en la base de datos de pacientes con el ID " + codigo);
            }
            const patient = patientDoc.data();
            
            // 2. Obtener los historiales de las otras colecciones
            const consultasSnap = await db.collection('consultas').where('codigoUnico', '==', codigo).get();
            const vacunasSnap = await db.collection('vacunas').where('codigoUnico', '==', codigo).get();
            const planesSnap = await db.collection('planesTratamiento').where('codigoUnico', '==', codigo).get();
            const tamizajesSnap = await db.collection('tamizajes').where('codigoUnico', '==', codigo).get();

            const consultas = consultasSnap.docs.map(doc => doc.data());
            const vacunas = vacunasSnap.docs.map(doc => doc.data());
            const planes = planesSnap.docs.map(doc => doc.data());
            const tamizajes = tamizajesSnap.docs.map(doc => doc.data());
            
            consultas.sort((a,b) => new Date(b.fechaConsulta) - new Date(a.fechaConsulta));
            vacunas.sort((a,b) => new Date(b.fechaAplicacion) - new Date(a.fechaAplicacion));

            // 3. Crear objeto de resumen para el dashboard
            const resumen = {
                ultimaConsulta: consultas.length > 0 ? consultas[0].fechaConsulta : "Ninguna",
                tamizajesRealizados: tamizajes.map(t => t.tipoTamiz),
                planesActivos: planes.length,
                ultimaVacuna: vacunas.length > 0 ? { nombreVacuna: vacunas[0].nombreVacuna, fecha: vacunas[0].fechaAplicacion } : { nombreVacuna: "Ninguna", fecha: "" }
                // (Se puede añadir la consulta de especialidad más adelante)
            };

            // 4. Poblar la página con los datos
            patientBanner.innerHTML = `<strong>${patient.nombre} ${patient.apellidoPaterno || ''}</strong> | Código: ${patient.codigoUnico}`;
            populatePatientData(patient);
            populateDashboard(resumen);

            // 5. Guardar en memoria y aplicar permisos
            localStorage.setItem('activePatient', JSON.stringify(patient));
            patientDataForm.style.display = 'block';
            if (dashboardContainer) dashboardContainer.style.display = 'grid';
            applyPermissions();

        } catch (error) {
            displayError(error.message);
            localStorage.removeItem('activePatient');
        }
    }

    loadAllPatientData();

    patientDataForm.addEventListener('submit', handleSaveChanges);

    // --- FUNCIONES ---
    function populateDashboard(resumen) {
        const fechaConsulta = resumen.ultimaConsulta === "Ninguna" ? "Ninguna" : new Date(resumen.ultimaConsulta).toLocaleDateString('es-ES');
        document.getElementById('summary-ultima-consulta').textContent = fechaConsulta;
        
        const fechaVacuna = resumen.ultimaVacuna.fecha ? new Date(resumen.ultimaVacuna.fecha).toLocaleDateString('es-ES') : '';
        document.getElementById('summary-ultima-vacuna').innerHTML = `${resumen.ultimaVacuna.nombreVacuna} <small style="display:block; color:#6c757d;">${fechaVacuna}</small>`;
        
        // Dejamos la consulta de especialidad pendiente por ahora
        document.getElementById('summary-ultima-consulta-esp').textContent = "N/A";

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
                element.value = patient[key] || '';
            }
        }
    }

    async function handleSaveChanges(e) {
        e.preventDefault();
        const submitBtn = document.getElementById('save-changes-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';

        const formData = {
            // Recolectar datos del formulario
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
            antecedentesNoPatologicos: document.getElementById('antecedentesNoPatologicos').value,
            codigoUnico: codigo // Asegurarnos de incluir el código
        };
        
        try {
            // Guardar directamente en Firestore
            await db.collection('pacientes').doc(codigo).set(formData, { merge: true });

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
        const responseMsg = document.getElementById('response-message');
        responseMsg.className = type;
        responseMsg.textContent = message;
        responseMsg.style.display = 'block';
    }
});
