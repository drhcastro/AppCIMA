document.addEventListener('DOMContentLoaded', () => {
    // La conexión a Firebase ('db') ya está disponible globalmente gracias a auth-guard.js

    // --- CONFIGURACIÓN ---
    const TIPOS_DE_TAMIZAJES = ["Cardiológico", "Metabólico", "Visual", "Auditivo", "Genético", "Cadera"];

    // --- ELEMENTOS DEL DOM ---
    const patientHeaderPlaceholder = document.getElementById('patient-header-placeholder');
    const dashboardContainer = document.querySelector('.dashboard-summary');

    if (!patientHeaderPlaceholder) {
        return; // Si no estamos en la página del visor, no hacer nada.
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
            // Poblar el encabezado inmediatamente con los datos que ya tenemos
            populateHeader(activePatient);

            // Cargar los datos adicionales para el dashboard
            if (dashboardContainer) {
                await loadDashboardData(codigo);
            }
        } catch (error) {
            console.error("Error al cargar la página del visor:", error);
            displayError(`Error al cargar los datos: ${error.message}`);
        }
    }
    
    async function loadDashboardData(patientId) {
        const [consultasSnap, vacunasSnap, planesSnap, tamizajesSnap] = await Promise.all([
            db.collection('consultas').where('codigoUnico', '==', patientId).orderBy('fechaConsulta', 'desc').get(),
            db.collection('vacunas').where('codigoUnico', '==', patientId).orderBy('fechaAplicacion', 'desc').get(),
            db.collection('planesTratamiento').where('codigoUnico', '==', patientId).get(),
            db.collection('tamizajes').where('codigoUnico', '==', patientId).get()
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
    }

    function populateHeader(patient) {
        // FUNCIÓN DE EDAD CORREGIDA
        function getAge(dateString) {
            if (!dateString) return "N/A";
            const birthDate = new Date(dateString); // Variable correcta: birthDate
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
        document.getElementById('summary-ultima-consulta').textContent = resumen.ultimaConsulta === "Ninguna" ? "Ninguna" : new Date(resumen.ultimaConsulta).toLocaleDateString('es-ES');
        const fechaVacuna = resumen.ultimaVacuna.fecha ? new Date(resumen.ultimaVacuna.fecha).toLocaleDateString('es-ES') : '';
        document.getElementById('summary-ultima-vacuna').innerHTML = `${resumen.ultimaVacuna.nombreVacuna} <small style="display:block; color:#6c757d;">${fechaVacuna}</small>`;
        document.getElementById('summary-ultima-consulta-esp').textContent = "N/A"; // Pendiente
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
