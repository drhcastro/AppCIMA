document.addEventListener('DOMContentLoaded', () => {
    // La conexión 'db' ya está disponible gracias a auth-guard.js

    // --- FUNCIÓN DE AYUDA PARA FECHAS (soluciona zona horaria y formato) ---
    function formatDate(dateString) {
        if (!dateString || !dateString.includes('-')) return "N/A";
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    // --- FUNCIÓN DE CÁLCULO DE EDAD (ACTUALIZADA) ---
    function getAge(dateString) {
        if (!dateString) return { text: "N/A", days: null };
        try {
            const birthDate = new Date(dateString + 'T00:00:00');
            if (isNaN(birthDate.getTime())) return { text: "Fecha inválida", days: null };
            
            const today = new Date();
            const totalDays = Math.floor((today - birthDate) / (1000 * 60 * 60 * 24));

            if (totalDays < 0) return { text: "Fecha futura", days: totalDays };

            // Lógica para mostrar la edad de forma pediátrica
            if (totalDays < 31) {
                return { text: `${totalDays} días`, days: totalDays };
            }
            
            let years = today.getFullYear() - birthDate.getFullYear();
            let months = today.getMonth() - birthDate.getMonth();
            
            if (today.getDate() < birthDate.getDate()) {
                months--;
            }
            if (months < 0) {
                years--;
                months += 12;
            }

            const totalMonths = years * 12 + months;

            if (totalMonths < 24) {
                return { text: `${totalMonths} meses`, days: totalDays };
            } else {
                return { text: `${years}a, ${months}m`, days: totalDays };
            }
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
                db.collection('psicologia').where('codigoUnico', '==', patientId).orderBy('fechaConsulta', 'desc').limit(1).get(),
                db.collection('nutricion').where('codigoUnico', '==', patientId).orderBy('fechaConsulta', 'desc').limit(1).get(),
                db.collection('rehabilitacion').where('codigoUnico', '==', patientId).orderBy('fechaConsulta', 'desc').limit(1).get(),
                db.collection('medicionesCrecimiento').where('codigoUnico', '==', patientId).orderBy('fechaMedicion', 'desc').limit(1).get()
            ]);

            const tamizajes = tamizajesSnap.docs.map(doc => doc.data());
            
            // --- CORRECCIÓN CLAVE ---
            // Obtenemos la información de la edad de forma segura
            const ageInfo = getAge(activePatient.fechaNacimiento);
            const ageInDays = ageInfo.days;

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

            if (ageInDays !== null) {
                await displayAlerts(activePatient, ageInDays, tamizajes);
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
        document.getElementById('summary-pendientes').textContent = resumen.planesActivos;
        const tamizajesPendientes = TIPOS_DE_TAMIZAJES.filter(t => !resumen.tamizajesRealizados.includes(t));
        const pendientesText = tamizajesPendientes.length > 0 ? tamizajesPendientes.length.toString() : "Ninguno";
        const pendientesTitle = tamizajesPendientes.length > 0 ? tamizajesPendientes.join(', ') : "Todos los tamizajes registrados";
        document.getElementById('summary-tamizajes-pendientes').textContent = pendientesText;
        document.getElementById('summary-tamizajes-pendientes').title = pendientesTitle;
    }

    function populateLastMeasurement(medicion) {
        const container = document.getElementById('last-measurement-card');
        const details = document.getElementById('last-measurement-details');
        if (!container || !details) return;
        
        let contentHTML = `<div>Fecha: <span>${formatDate(medicion.fechaMedicion)}</span></div>`;
        if(medicion.peso) contentHTML += `<div>Peso: <span>${medicion.peso} kg (Z: ${medicion.pesoZScore ?? 'N/A'})</span></div>`;
        if(medicion.talla) contentHTML += `<div>Talla: <span>${medicion.talla} cm (Z: ${medicion.tallaZScore ?? 'N/A'})</span></div>`;
        if(medicion.pc) contentHTML += `<div>PC: <span>${medicion.pc} cm (Z: ${medicion.pcZScore ?? 'N/A'})</span></div>`;
        if(medicion.imc) contentHTML += `<div>IMC: <span>${medicion.imc} (Z: ${medicion.imcZScore ?? 'N/A'})</span></div>`;
        
        details.innerHTML = contentHTML;
        container.style.display = 'block';
    }

    async function displayAlerts(patient, ageInDays, tamizajes) {
        const alertsContainer = document.getElementById('alerts-container');
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
        const container = document.getElementById('specialty-diagnostics-container');
        const list = document.getElementById('diagnostics-list');
        if (diagnostics.length === 0) {
            container.style.display = 'none';
            return;
        }
        list.innerHTML = '';
        diagnostics.forEach(dx => {
            const li = document.createElement('li');
            const fecha = formatDate(dx.fechaConsulta);
            li.innerHTML = `<strong>${dx.tipo} (${fecha}):</strong> ${dx.diagnostico || 'Nota registrada.'}`;
            list.appendChild(li);
        });
        container.style.display = 'block';
    }

    function displayError(message) {
        const container = document.querySelector('.page-container');
        if (container) {
            container.innerHTML = `<div class="card" style="text-align:center;"><p class="error-message">${message}</p><a href="index.html" class="button-secondary">Regresar al Inicio</a></div>`;
        }
    }

    // Iniciar la carga de la página
    loadPageData();
});
