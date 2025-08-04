document.addEventListener('DOMContentLoaded', () => {
    // La conexión a Firebase ('db') ya está disponible globalmente gracias a auth-guard.js

    // --- CONFIGURACIÓN ---
    const TIPOS_DE_TAMIZAJES = ["Cardiológico", "Metabólico", "Visual", "Auditivo", "Genético", "Cadera"];

    // --- ELEMENTOS DEL DOM ---
    const responseMsg = document.getElementById('response-message');
    const patientDataForm = document.getElementById('edit-patient-form'); // Corregido al ID del formulario de edición
    const patientBanner = document.getElementById('patient-banner');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const dashboardContainer = document.querySelector('.dashboard-summary');

    // --- VERIFICACIÓN DE PÁGINA ---
    // Si no estamos en una página que tenga el banner del paciente, no hacer nada.
    if (!patientBanner) {
        return; 
    }

    // --- INICIALIZACIÓN Y PERMISOS ---
    const activePatient = JSON.parse(localStorage.getItem('activePatient'));
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

    if (!activePatient) {
        patientBanner.textContent = "ERROR: No hay un paciente activo. Por favor, cargue uno desde el menú de búsqueda.";
        if(document.querySelector('.actions-grid')) document.querySelector('.actions-grid').style.display = 'none';
        return;
    }

    // --- LÓGICA DE PESTAÑAS (Solo para la página de edición) ---
    if (patientDataForm) {
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                button.classList.add('active');
                document.getElementById(button.dataset.tab).classList.add('active');
            });
        });
    }

    // --- LÓGICA PRINCIPAL ---
    
    // Si estamos en la página del visor (dashboard), cargamos todos los datos.
    if (dashboardContainer) {
        patientBanner.textContent = `Cargando datos para: ${activePatient.nombre} ${activePatient.apellidoPaterno || ''}...`;
        loadDashboardData(activePatient.codigoUnico);
    }
    
    // Si estamos en la página de edición, solo poblamos el formulario.
    if (patientDataForm) {
        patientBanner.textContent = `Editando a: ${activePatient.nombre} ${activePatient.apellidoPaterno || ''}`;
        populateEditForm(activePatient);
        applyEditPermissions();
        patientDataForm.addEventListener('submit', handleSaveChanges);
    }
    
    // --- FUNCIONES ---

    async function loadDashboardData(codigo) {
        try {
            // Cargar todos los datos para el dashboard directamente desde Firestore
            const [
                consultasSnap,
                vacunasSnap,
                planesSnap,
                tamizajesSnap
            ] = await Promise.all([
                db.collection('consultas').where('codigoUnico', '==', codigo).orderBy('fechaConsulta', 'desc').get(),
                db.collection('vacunas').where('codigoUnico', '==', codigo).orderBy('fechaAplicacion', 'desc').get(),
                db.collection('planesTratamiento').where('codigoUnico', '==', codigo).get(),
                db.collection('tamizajes').where('codigoUnico', '==', codigo).get()
            ]);

            const consultas = consultasSnap.docs.map(doc => doc.data());
            const vacunas = vacunasSnap.docs.map(doc => doc.data());
            const planes = planesSnap.docs.map(doc => doc.data());
            const tamizajes = tamizajesSnap.docs.map(doc => doc.data());

            const resumen = {
                ultimaConsulta: consultas.length > 0 ? consultas[0].fechaConsulta : "Ninguna",
                tamizajesRealizados: tamizajes.map(t => t.tipoTamiz),
                planesActivos: planes.length,
                ultimaVacuna: vacunas.length > 0 ? { nombreVacuna: vacunas[0].nombreVacuna, fecha: vacunas[0].fechaAplicacion } : { nombreVacuna: "Ninguna", fecha: "" }
            };

            populateDashboard(resumen);

        } catch (error) {
            console.error("Error cargando datos del dashboard:", error);
            document.querySelector('.dashboard-summary').innerHTML = `<p class="error-message">No se pudo cargar el resumen del paciente.</p>`;
        }
    }

    function populateDashboard(resumen) {
        // ... (Pega aquí la función populateDashboard de la respuesta anterior, no ha cambiado)
    }

    function applyEditPermissions() {
        if (!currentUser) return;
        const userRole = currentUser.profile;
        const saveChangesBtn = document.getElementById('submit-btn');

        if (userRole === 'asistente') {
            saveChangesBtn.disabled = true;
            saveChangesBtn.textContent = 'Guardado no permitido';
            patientDataForm.querySelectorAll('input, select, textarea').forEach(el => el.disabled = true);
        }
    }

    function populateEditForm(patient) {
        for (const key in patient) {
            const element = document.getElementById(key);
            if (element) {
                element.value = patient[key] || '';
            }
        }
    }

    async function handleSaveChanges(e) {
        e.preventDefault();
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';

        const formData = {
            codigoUnico: activePatient.codigoUnico,
            nombre: document.getElementById('nombre').value,
            // ... (resto de los campos del formulario)
        };
        
        try {
            await db.collection('pacientes').doc(activePatient.codigoUnico).set(formData, { merge: true });
            localStorage.setItem('activePatient', JSON.stringify(formData));
            alert('Expediente actualizado con éxito.');
            window.location.href = `visor.html?codigo=${activePatient.codigoUnico}`;
        } catch (error) {
            // ... (manejo de error)
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Guardar Cambios';
        }
    }
});
