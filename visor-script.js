document.addEventListener('DOMContentLoaded', () => {
    // La conexión a Firebase ('db') ya está disponible globalmente gracias a auth-guard.js

    const patientHeaderPlaceholder = document.getElementById('patient-header-placeholder');
    const dashboardContainer = document.querySelector('.dashboard-summary');

    if (!patientHeaderPlaceholder) {
        return; 
    }

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
            if (dashboardContainer) {
                await loadDashboardData(codigo);
            }
        } catch (error) {
            console.error("Error al cargar la página del visor:", error);
            displayError(`Error al cargar los datos: ${error.message}`);
        }
    }
    
    async function loadDashboardData(patientId) {
        try {
            const [consultasSnap, vacunasSnap, planesSnap, tamizajesSnap, psicoSnap, nutriSnap, rehabSnap] = await Promise.all([
                db.collection('consultas').where('codigoUnico', '==', patientId).orderBy('fechaConsulta', 'desc').get(),
                db.collection('vacunas').where('codigoUnico', '==', patientId).orderBy('fechaAplicacion', 'desc').get(),
                db.collection('planesTratamiento').where('codigoUnico', '==', patientId).get(),
                db.collection('tamizajes').where('codigoUnico', '==', patientId).get(),
                db.collection('psicologia').where('codigoUnico', '==', patientId).orderBy('fechaConsulta', 'desc').get(),
                db.collection('nutricion').where('codigoUnico', '==', patientId).orderBy('fechaConsulta', 'desc').get(),
                db.collection('rehabilitacion').where('codigoUnico', '==', patientId).orderBy('fechaConsulta', 'desc').get()
            ]);

            const consultas = consultasSnap.docs.map(doc => doc.data());
            const vacunas = vacunasSnap.docs.map(doc => doc.data());
            const planes = planesSnap.docs.map(doc => doc.data());
            const tamizajes = tamizajesSnap.docs.map(doc => doc.data());
            const psicologia = psicoSnap.docs.map(doc => ({...doc.data(), tipo: 'Psicología'}));
            const nutricion = nutriSnap.docs.map(doc => ({...doc.data(), tipo: 'Nutrición'}));
            const rehabilitacion = rehabSnap.docs.map(doc => ({...doc.data(), tipo: 'Rehabilitación'}));

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
        } catch (error) {
            console.error("Error cargando datos del dashboard:", error);
            if(dashboardContainer) dashboardContainer.innerHTML = `<p class="error-message">No se pudo cargar el resumen del paciente.</p>`;
        }
    }

    function populateHeader(patient) {
        function getAge(dateString) {
            if (!dateString) return "N/A";
            const birthDate = new Date(dateString);
            const today = new Date();
            let years = today.getFullYear() - birthDate.getFullYear();
            let months = today.getMonth() - birthDate.getMonth();
            if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
                years--;
                months = 12 + months;
            }
            return `${years} años, ${months} meses`;
        }

        const headerHTML = `
            <div class="card patient-header-card">
                <div class="patient-details">
                    <h2>${patient.nombre} ${patient.apellidoPaterno || ''}</h2>
                    <div class="patient-meta">
                        <div>Edad: <span>${getAge(patient.fechaNacimiento)}</span></div>
                        <div>F. Nacimiento: <span>${new Date(patient.fechaNacimiento + 'T00:00:00').toLocaleDateString('es-ES')}</span></div>
                        <div>Mamá: <span>${patient.nombreMama || 'N/A'}</span></div>
                        <div>Código: <span>${patient.codigoUnico}</span></div>
                    </div>
                </div>
                <a href="editar-paciente.html" class="button-primary">✏️ Editar Ficha</a>
            </div>
        `;
        patientHeaderPlaceholder.innerHTML = headerHTML;
    }
    
    function populateDashboard(resumen) {
        const TIPOS_DE_TAMIZAJES = ["Cardiológico", "Metabólico", "Visual", "Auditivo", "Genético", "Cadera"];
        document.getElementById('summary-ultima-consulta').textContent = resumen.ultimaConsulta === "Ninguna" ? "Ninguna" : new Date(resumen.ultimaConsulta).toLocaleDateString('es-ES');
        const fechaVacuna = resumen.ultimaVacuna.fecha ? new Date(resumen.ultimaVacuna.fecha).toLocaleDateString('es-ES') : '';
        document.getElementById('summary-ultima-vacuna').innerHTML = `${resumen.ultimaVacuna.nombreVacuna} <small style="display:block; color:#6c757d;">${fechaVacuna}</small>`;
        
        const fechaConsultaEsp = resumen.ultimaConsultaEsp.fecha ? new Date(resumen.ultimaConsultaEsp.fecha).toLocaleDateString('es-ES') : '';
        document.getElementById('summary-ultima-consulta-esp').innerHTML = `${resumen.ultimaConsultaEsp.tipo} <small style="display:block; color:#6c757d;">${fechaConsultaEsp}</small>`;

        document.getElementById('summary-planes-activos').textContent = resumen.planesActivos;
        const tamizajesPendientes = TIPOS_DE_TAMIZAJES.filter(t => !resumen.tamizajesRealizados.includes(t));
        const pendientesText = tamizajesPendientes.length > 0 ? tamizajesPendientes.length.toString() : "Ninguno";
        const pendientesTitle = tamizajesPendientes.length > 0 ? tamizajesPendientes.join(', ') : "Todos los tamizajes registrados";
        document.getElementById('summary-tamizajes-pendientes').textContent = pendientesText;
        document.getElementById('summary-tamizajes-pendientes').title = pendientesTitle;
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
