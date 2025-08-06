document.addEventListener('DOMContentLoaded', () => {
    // La conexión 'db' ya está disponible gracias a auth-guard.js

    // --- FUNCIONES DE AYUDA ---
    function formatDate(dateString) { /* ... (función completa aquí) ... */ }
    function getAge(dateString) { /* ... (función completa aquí) ... */ }
    function calculateCorrectedGA(gaAtBirth, ageInDays) { /* ... (función completa aquí) ... */ }

    // --- CONFIGURACIÓN ---
    const TIPOS_DE_TAMIZAJES = ["Cardiológico", "Metabólico", "Visual", "Auditivo", "Genético", "Cadera"];
    
    // --- ELEMENTOS DEL DOM ---
    const patientHeaderPlaceholder = document.getElementById('patient-header-placeholder');
    const alertsContainer = document.getElementById('alerts-container');
    const specialtyDiagnosticsContainer = document.getElementById('specialty-diagnostics-container');
    const diagnosticsList = document.getElementById('diagnostics-list');
    
    if (!patientHeaderPlaceholder) { return; }

    // --- LÓGICA PRINCIPAL ---
    const activePatient = JSON.parse(localStorage.getItem('activePatient'));
    if (!activePatient) { displayError("No se ha cargado un paciente."); return; }
    const codigo = activePatient.codigoUnico;

    // --- LÓGICA DE CARGA ---
    async function loadPageData() {
        try {
            populateHeader(activePatient);
            await loadDashboardAndSubsections(codigo);
        } catch (error) {
            console.error("Error al cargar la página del visor:", error);
            displayError(`Error al cargar los datos: ${error.message}`);
        }
    }
    
    async function loadDashboardAndSubsections(patientId) {
        try {
            const [
                consultasSnap, vacunasSnap, planesSnap, tamizajesSnap, 
                psicoSnap, nutriSnap, rehabSnap, medicionesSnap
            ] = await Promise.all([
                db.collection('consultas').where('codigoUnico', '==', patientId).orderBy('fechaConsulta', 'desc').get(),
                db.collection('vacunas').where('codigoUnico', '==', patientId).orderBy('fechaAplicacion', 'desc').get(),
                db.collection('planeacionConsultas').where('codigoUnico', '==', patientId).get(),
                db.collection('tamizajes').where('codigoUnico', '==', patientId).get(),
                db.collection('psicologia').where('codigoUnico', '==', patientId).orderBy('fechaConsulta', 'desc').get(),
                db.collection('nutricion').where('codigoUnico', '==', patientId).orderBy('fechaConsulta', 'desc').get(),
                db.collection('rehabilitacion').where('codigoUnico', '==', patientId).orderBy('fechaConsulta', 'desc').get(),
                db.collection('medicionesCrecimiento').where('codigoUnico', '==', patientId).orderBy('fechaMedicion', 'desc').limit(1).get()
            ]);

            const tamizajes = tamizajesSnap.docs.map(doc => doc.data());
            const ageInDays = getAge(activePatient.fechaNacimiento).days;
            const consultas = consultasSnap.docs.map(doc => doc.data());
            const vacunas = vacunasSnap.docs.map(doc => doc.data());
            const planes = planesSnap.docs.map(doc => doc.data());
            const psicologia = psicoSnap.docs.map(doc => ({...doc.data(), tipo: 'Psicología', diagnostico: doc.data().planSeguimiento}));
            const nutricion = nutriSnap.docs.map(doc => ({...doc.data(), tipo: 'Nutrición', diagnostico: doc.data().planSeguimiento}));
            const rehabilitacion = rehabSnap.docs.map(doc => ({...doc.data(), tipo: 'Rehabilitación', diagnostico: doc.data().planSeguimiento}));
            const consultasEspecialidad = [...psicologia, ...nutricion, ...rehabilitacion];
            consultasEspecialidad.sort((a,b) => new Date(b.fechaConsulta) - new Date(a.fechaConsulta));
            
            const resumen = {
                ultimaConsulta: consultas.length > 0 ? consultas[0].fechaConsulta : "Ninguna",
                tamizajesRealizados: tamizajes.map(t => t.tipoTamiz),
                planesActivos: planes.length,
                ultimaVacuna: vacunas.length > 0 ? { nombreVacuna: vacunas[0].nombreVacuna, fecha: vacunas[0].fechaAplicacion } : { nombreVacuna: "Ninguna", fecha: "" },
                ultimaConsultaEsp: consultasEspecialidad.length > 0 ? { tipo: consultasEspecialidad[0].tipo, fecha: consultasEspecialidad[0].fechaConsulta } : { tipo: "Ninguna", fecha: "" }
            };
            
            populateDashboard(resumen);

            await displayAlerts(activePatient, ageInDays, tamizajes);
            await displaySpecialtyDiagnostics(consultasEspecialidad);
            if (!medicionesSnap.empty) {
                populateLastMeasurement(medicionesSnap.docs[0].data());
            }

        } catch (error) {
            console.error("Error cargando datos:", error);
            document.querySelector('.dashboard-summary').innerHTML = `<p class="error-message">No se pudo cargar el resumen. Es posible que falten índices en Firestore.</p>`;
        }
    }

    // --- FUNCIONES DE VISUALIZACIÓN ---
    function populateHeader(patient) { /* ... (código sin cambios) ... */ }
    function populateDashboard(resumen) { /* ... (código sin cambios) ... */ }

    function populateLastMeasurement(medicion) {
        const container = document.getElementById('last-measurement-card');
        const details = document.getElementById('last-measurement-details');
        if (!container || !details) return; // Verificación de seguridad
        
        let contentHTML = `<div>Fecha: <span>${formatDate(medicion.fechaMedicion)}</span></div>`;
        if(medicion.peso) contentHTML += `<div>Peso: <span>${medicion.peso} kg (Z: ${medicion.pesoZScore ?? 'N/A'})</span></div>`;
        if(medicion.talla) contentHTML += `<div>Talla: <span>${medicion.talla} cm (Z: ${medicion.tallaZScore ?? 'N/A'})</span></div>`;
        if(medicion.pc) contentHTML += `<div>PC: <span>${medicion.pc} cm (Z: ${medicion.pcZScore ?? 'N/A'})</span></div>`;
        if(medicion.imc) contentHTML += `<div>IMC: <span>${medicion.imc} (Z: ${medicion.imcZScore ?? 'N/A'})</span></div>`;
        
        details.innerHTML = contentHTML;
        container.style.display = 'block';
    }

    async function displayAlerts(patient, ageInDays, tamizajes) { /* ... (código sin cambios) ... */ }
    async function displaySpecialtyDiagnostics(diagnostics) { /* ... (código sin cambios) ... */ }
    function displayError(message) { /* ... (código sin cambios) ... */ }

    // Iniciar la carga de la página
    loadPageData();
});
