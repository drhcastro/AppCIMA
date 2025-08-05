document.addEventListener('DOMContentLoaded', () => {
    // La conexión 'db' ya está disponible gracias a auth-guard.js

    // --- FUNCIONES DE AYUDA ---
    function formatDate(dateString) {
        if (!dateString || !dateString.includes('-')) return "N/A";
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function getAge(dateString) {
        if (!dateString) return { text: "N/A", days: 0 };
        const birthDate = new Date(dateString + 'T00:00:00');
        const today = new Date();
        const days = Math.floor((today - birthDate) / (1000 * 60 * 60 * 24));
        let years = today.getFullYear() - birthDate.getFullYear();
        let months = today.getMonth() - birthDate.getMonth();
        if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
            years--;
            months = 12 + months;
        }
        return { text: `${years}a, ${months}m`, days: days };
    }

    function calculateCorrectedGA(gaAtBirth, ageInDays) {
        if (!gaAtBirth) return null;
        const ga = parseFloat(gaAtBirth);
        if (isNaN(ga) || ga < 20) return null;
        const weeksAtBirth = Math.floor(ga);
        const daysAtBirth = Math.round((ga - weeksAtBirth) * 10);
        const totalDaysAtBirth = (weeksAtBirth * 7) + daysAtBirth;
        const totalCorrectedDays = totalDaysAtBirth + ageInDays;
        if (totalCorrectedDays > (64 * 7)) return null;
        const correctedWeeks = Math.floor(totalCorrectedDays / 7);
        const correctedDays = totalCorrectedDays % 7;
        return `${correctedWeeks}.${correctedDays} sem`;
    }

    // --- CONFIGURACIÓN ---
    const TIPOS_DE_TAMIZAJES = ["Cardiológico", "Metabólico", "Visual", "Auditivo", "Genético", "Cadera"];
    
    // --- ELEMENTOS DEL DOM ---
    const patientHeaderPlaceholder = document.getElementById('patient-header-placeholder');
    if (!patientHeaderPlaceholder) { return; }

    // --- LÓGICA PRINCIPAL ---
    const activePatient = JSON.parse(localStorage.getItem('activePatient'));
    if (!activePatient) {
        displayError("No se ha cargado un paciente. Por favor, regrese y busque uno.");
        return;
    }
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
            
            // Lógica del Dashboard
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
                planesActivos: planes.length, // Se usa el nombre "planesActivos" internamente
                ultimaVacuna: vacunas.length > 0 ? { nombreVacuna: vacunas[0].nombreVacuna, fecha: vacunas[0].fechaAplicacion } : { nombreVacuna: "Ninguna", fecha: "" },
                ultimaConsultaEsp: consultasEspecialidad.length > 0 ? { tipo: consultasEspecialidad[0].tipo, fecha: consultasEspecialidad[0].fechaConsulta } : { tipo: "Ninguna", fecha: "" }
            };
            
            populateDashboard(resumen);

            // Lógica para subsecciones
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
    function populateHeader(patient) {
        const age = getAge(patient.fechaNacimiento);
        const correctedGA = calculateCorrectedGA(patient.edadGestacionalNacimiento, age.days);
        let gaHTML = '';
        if (correctedGA) {
            gaHTML = `
                <div>EG al nacer: <span>${patient.edadGestacionalNacimiento} sem</span></div>
                <div>EG Corregida: <span>${correctedGA}</span></div>`;
        }
        const headerHTML = `
            <div class="patient-details">
                <h2>${patient.nombre} ${patient.apellidoPaterno || ''}</h2>
                <div class="patient-meta">
                    <div>Edad: <span>${age.text}</span></div>
                    <div>F. Nac.: <span>${formatDate(patient.fechaNacimiento)}</span></div>
                    <div>Mamá: <span>${patient.nombreMama || 'N/A'}</span></div>
                    <div>Código: <span>${patient.codigoUnico}</span></div>
                    ${gaHTML}
                </div>
            </div>
            <a href="editar-paciente.html" class="button-primary">✏️ Editar Ficha</a>
        `;
        patientHeaderPlaceholder.innerHTML = headerHTML;
    }
    
    function populateDashboard(resumen) {
        document.getElementById('summary-ultima-consulta').textContent = formatDate(resumen.ultimaConsulta);
        const fechaVacuna = formatDate(resumen.ultimaVacuna.fecha);
        document.getElementById('summary-ultima-vacuna').innerHTML = `${resumen.ultimaVacuna.nombreVacuna} <small style="display:block; color:#6c757d;">${fechaVacuna}</small>`;
        const fechaConsultaEsp = formatDate(resumen.ultimaConsultaEsp.fecha);
        document.getElementById('summary-ultima-consulta-esp').innerHTML = `${resumen.ultimaConsultaEsp.tipo} <small style="display:block; color:#6c757d;">${fechaConsultaEsp}</small>`;
        document.getElementById('summary-pendientes').textContent = resumen.planesActivos;
        const tamizajesPendientes = TIPOS_DE_TAMIZAJES.filter(t => !resumen.tamizajesRealizados.includes(t));
        const pendientesText = tamizajesPendientes.length > 0 ? tamizajesPendientes.length.toString() : "Ninguno";
        document.getElementById('summary-tamizajes-pendientes').textContent = pendientesText;
        document.getElementById('summary-tamizajes-pendientes').title = tamizajesPendientes.length > 0 ? tamizajesPendientes.join(', ') : "Todos registrados";
    }
    
    function populateLastMeasurement(medicion) {
        const container = document.getElementById('last-measurement-card');
        const details = document.getElementById('last-measurement-details');
        let contentHTML = `<div>Fecha: <span>${formatDate(medicion.fechaMedicion)}</span></div>`;
        if(medicion.peso) contentHTML += `<div>Peso: <span>${medicion.peso} kg (Z: ${medicion.pesoZScore || 'N/A'})</span></div>`;
        if(medicion.talla) contentHTML += `<div>Talla: <span>${medicion.talla} cm (Z: ${medicion.tallaZScore || 'N/A'})</span></div>`;
        if(medicion.pc) contentHTML += `<div>PC: <span>${medicion.pc} cm (Z: ${medicion.pcZScore || 'N/A'})</span></div>`;
        if(medicion.imc) contentHTML += `<div>IMC: <span>${medicion.imc} (Z: ${medicion.imcZScore || 'N/A'})</span></div>`;
        details.innerHTML = contentHTML;
        container.style.display = 'block';
    }

    async function displayAlerts(patient, ageInDays, tamizajes) { /* ... (código sin cambios) ... */ }
    async function displaySpecialtyDiagnostics(diagnostics) { /* ... (código sin cambios) ... */ }
    function displayError(message) { /* ... (código sin cambios) ... */ }

    // Iniciar la carga de la página
    loadPageData();
});
