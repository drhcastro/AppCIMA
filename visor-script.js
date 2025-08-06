document.addEventListener('DOMContentLoaded', () => {
    // La conexión 'db' ya está disponible gracias a auth-guard.js

    // --- FUNCIÓN DE AYUDA PARA FECHAS ---
    function formatDate(dateString) {
        if (!dateString || !dateString.includes('-')) return "N/A";
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    // --- FUNCIÓN DE CÁLCULO DE EDAD (MÁS ROBUSTA) ---
    function getAge(dateString) {
        // Si no hay fecha de nacimiento, devuelve un objeto seguro.
        if (!dateString) {
            return { text: "N/A", days: null };
        }
        try {
            const birthDate = new Date(dateString + 'T00:00:00');
            const today = new Date();
            // Verificar que la fecha sea válida
            if (isNaN(birthDate.getTime())) {
                return { text: "Fecha inválida", days: null };
            }
            const days = Math.floor((today - birthDate) / (1000 * 60 * 60 * 24));
            let years = today.getFullYear() - birthDate.getFullYear();
            let months = today.getMonth() - birthDate.getMonth();
            if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
                years--;
                months = 12 + months;
            }
            return { text: `${years}a, ${months}m`, days: days };
        } catch (e) {
            return { text: "Error", days: null };
        }
    }
    
    // --- FUNCIÓN DE EDAD GESTACIONAL ---
    function calculateCorrectedGA(gaAtBirth, ageInDays) {
        if (!gaAtBirth || ageInDays === null) return null;
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

    // --- CONFIGURACIÓN Y DOM ---
    const TIPOS_DE_TAMIZAJES = ["Cardiológico", "Metabólico", "Visual", "Auditivo", "Genético", "Cadera"];
    const patientHeaderPlaceholder = document.getElementById('patient-header-placeholder');
    if (!patientHeaderPlaceholder) return;

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
            const [consultasSnap, vacunasSnap, planesSnap, tamizajesSnap, psicoSnap, nutriSnap, rehabSnap, medicionesSnap] = await Promise.all([
                db.collection('consultas').where('codigoUnico', '==', patientId).orderBy('fechaConsulta', 'desc').get(),
                db.collection('vacunas').where('codigoUnico', '==', patientId).orderBy('fechaAplicacion', 'desc').get(),
                db.collection('planeacionConsultas').where('codigoUnico', '==', patientId).get(),
                db.collection('tamizajes').where('codigoUnico', '==', patientId).get(),
                db.collection('psicologia').where('codigoUnico', '==', patientId).orderBy('fechaConsulta', 'desc').limit(1).get(),
                db.collection('nutricion').where('codigoUnico', '==', patientId).orderBy('fechaConsulta', 'desc').limit(1).get(),
                db.collection('rehabilitacion').where('codigoUnico', '==', patientId).orderBy('fechaConsulta', 'desc').limit(1).get(),
                db.collection('medicionesCrecimiento').where('codigoUnico', '==', patientId).orderBy('fechaMedicion', 'desc').limit(1).get()
            ]);

            const tamizajes = tamizajesSnap.docs.map(doc => doc.data());
            const ageInfo = getAge(activePatient.fechaNacimiento);
            
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

            // Solo ejecutar alertas si tenemos una edad en días válida
            if (ageInfo.days !== null) {
                await displayAlerts(activePatient, ageInfo.days, tamizajes);
            }
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
            <div class="card patient-header-card">
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
            </div>
        `;
        patientHeaderPlaceholder.innerHTML = headerHTML;
    }
    
    function populateDashboard(resumen) { /* ... (Sin cambios) ... */ }
    function populateLastMeasurement(medicion) { /* ... (Sin cambios) ... */ }
    async function displayAlerts(patient, ageInDays, tamizajes) { /* ... (Sin cambios) ... */ }
    async function displaySpecialtyDiagnostics(diagnostics) { /* ... (Sin cambios) ... */ }
    function displayError(message) { /* ... (Sin cambios) ... */ }

    // Iniciar la carga de la página
    loadPageData();
});
