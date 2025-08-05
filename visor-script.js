document.addEventListener('DOMContentLoaded', () => {
    // La conexión 'db' ya está disponible gracias a auth-guard.js

    // --- FUNCIÓN DE AYUDA PARA FECHAS (soluciona zona horaria y formato) ---
    function formatDate(dateString) {
        if (!dateString || !dateString.includes('-')) return "N/A";
        // Añadir 'T00:00:00' fuerza al navegador a interpretar la fecha en la zona horaria local
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    // --- CONFIGURACIÓN ---
    const TIPOS_DE_TAMIZAJES = ["Cardiológico", "Metabólico", "Visual", "Auditivo", "Genético", "Cadera"];

    // --- ELEMENTOS DEL DOM ---
    const patientHeaderPlaceholder = document.getElementById('patient-header-placeholder');
    const alertsContainer = document.getElementById('alerts-container');
    const specialtyDiagnosticsContainer = document.getElementById('specialty-diagnostics-container');
    const diagnosticsList = document.getElementById('diagnostics-list');

    // Si no estamos en la página del visor, no hacer nada.
    if (!patientHeaderPlaceholder) {
        return; 
    }

    // --- LÓGICA PRINCIPAL ---
    const activePatient = JSON.parse(localStorage.getItem('activePatient'));

    if (!activePatient) {
        displayError("No se ha cargado un paciente. Por favor, regrese al menú y busque uno.");
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
                psicoSnap, nutriSnap, rehabSnap
            ] = await Promise.all([
                db.collection('consultas').where('codigoUnico', '==', patientId).orderBy('fechaConsulta', 'desc').get(),
                db.collection('vacunas').where('codigoUnico', '==', patientId).orderBy('fechaAplicacion', 'desc').get(),
                db.collection('planesTratamiento').where('codigoUnico', '==', patientId).get(),
                db.collection('tamizajes').where('codigoUnico', '==', patientId).get(),
                db.collection('psicologia').where('codigoUnico', '==', patientId).orderBy('fechaConsulta', 'desc').limit(1).get(),
                db.collection('nutricion').where('codigoUnico', '==', patientId).orderBy('fechaConsulta', 'desc').limit(1).get(),
                db.collection('rehabilitacion').where('codigoUnico', '==', patientId).orderBy('fechaConsulta', 'desc').limit(1).get()
            ]);

            const tamizajes = tamizajesSnap.docs.map(doc => doc.data());
            const ageInDays = getAge(activePatient.fechaNacimiento).days;

            // Lógica para el Dashboard
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

            // Lógica para las otras secciones
            await displayAlerts(activePatient, ageInDays, tamizajes);
            await displaySpecialtyDiagnostics(consultasEspecialidad);

        } catch (error) {
            console.error("Error cargando datos del dashboard y subsecciones:", error);
            displayError("No se pudo cargar el resumen del paciente.");
        }
    }

    // --- FUNCIONES DE CÁLCULO ---
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
        return `${correctedWeeks}.${correctedDays} semanas`;
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
    
    function populateDashboard(resumen) {
        document.getElementById('summary-ultima-consulta').textContent = formatDate(resumen.ultimaConsulta);
        const fechaVacuna = formatDate(resumen.ultimaVacuna.fecha);
        document.getElementById('summary-ultima-vacuna').innerHTML = `${resumen.ultimaVacuna.nombreVacuna} <small style="display:block; color:#6c757d;">${fechaVacuna}</small>`;
        const fechaConsultaEsp = formatDate(resumen.ultimaConsultaEsp.fecha);
        document.getElementById('summary-ultima-consulta-esp').innerHTML = `${resumen.ultimaConsultaEsp.tipo} <small style="display:block; color:#6c757d;">${fechaConsultaEsp}</small>`;
        document.getElementById('summary-planes-activos').textContent = resumen.planesActivos;
        const tamizajesPendientes = TIPOS_DE_TAMIZAJES.filter(t => !resumen.tamizajesRealizados.includes(t));
        const pendientesText = tamizajesPendientes.length > 0 ? tamizajesPendientes.length.toString() : "Ninguno";
        const pendientesTitle = tamizajesPendientes.length > 0 ? tamizajesPendientes.join(', ') : "Todos los tamizajes registrados";
        document.getElementById('summary-tamizajes-pendientes').textContent = pendientesText;
        document.getElementById('summary-tamizajes-pendientes').title = pendientesTitle;
    }

    async function displayAlerts(patient, ageInDays, tamizajes) {
        alertsContainer.innerHTML = '';
        const ga = parseFloat(patient.edadGestacionalNacimiento);
        if (ga <= 36.0 && ageInDays >= 30) {
            const tamizajeVisualRealizado = tamizajes.some(t => t.tipoTamiz === 'Visual');
            if (!tamizajeVisualRealizado) {
                const alertDiv = document.createElement('div');
                alertDiv.className = 'alert alert-warning';
                alertDiv.textContent = '¡AVISO IMPORTANTE! Se recomienda evaluación de retina para retinopatía del prematuro.';
                alertsContainer.appendChild(alertDiv);
            }
        }
    }

    async function displaySpecialtyDiagnostics(diagnostics) {
        if (diagnostics.length === 0) {
            specialtyDiagnosticsContainer.style.display = 'none';
            return;
        }
        diagnosticsList.innerHTML = '';
        diagnostics.forEach(dx => {
            const li = document.createElement('li');
            const fecha = formatDate(dx.fechaConsulta);
            li.innerHTML = `<strong>${dx.tipo} (${fecha}):</strong> ${dx.diagnostico || 'Nota registrada.'}`;
            diagnosticsList.appendChild(li);
        });
        specialtyDiagnosticsContainer.style.display = 'block';
    }

    function displayError(message) {
        const container = document.querySelector('.page-container');
        if (container) {
            container.innerHTML = `<div class="card"><p class="error-message">${message}</p><a href="index.html" class="button-secondary">Regresar al Inicio</a></div>`;
        }
    }

    // Iniciar la carga de la página
    loadPageData();
});
