document.addEventListener('DOMContentLoaded', () => {
    // La conexión a Firebase ('db') ya está disponible globalmente gracias a auth-guard.js

    // --- CONFIGURACIÓN ---
    const TIPOS_DE_TAMIZAJES = ["Cardiológico", "Metabólico", "Visual", "Auditivo", "Genético", "Cadera"];

    // --- ELEMENTOS DEL DOM ---
    const patientHeaderPlaceholder = document.getElementById('patient-header-placeholder');
    const actionsGrid = document.querySelector('.actions-grid');

    // --- VERIFICACIÓN DE PÁGINA ---
    // Si no estamos en la página del visor (que tiene el placeholder del encabezado), no hacer nada.
    if (!patientHeaderPlaceholder) {
        return; 
    }

    // --- LÓGICA PRINCIPAL ---
    const activePatientFromStorage = JSON.parse(localStorage.getItem('activePatient'));

    if (!activePatientFromStorage) {
        displayError("No se ha cargado un paciente. Por favor, regrese al menú y busque uno.");
        return;
    }

    const codigo = activePatientFromStorage.codigoUnico;
    
    // --- LÓGICA DE CARGA DIRECTA DESDE FIRESTORE ---
    async function loadDashboard() {
        try {
            // Cargar todos los datos necesarios para el dashboard
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
            
            // Crear objeto de resumen
            const resumen = {
                ultimaConsulta: consultas.length > 0 ? consultas[0].fechaConsulta : "Ninguna",
                tamizajesRealizados: tamizajes.map(t => t.tipoTamiz),
                planesActivos: planes.length,
                ultimaVacuna: vacunas.length > 0 ? { nombreVacuna: vacunas[0].nombreVacuna, fecha: vacunas[0].fechaAplicacion } : { nombreVacuna: "Ninguna", fecha: "" }
            };

            populateHeader(activePatientFromStorage);
            // La función para poblar el dashboard ahora la llamaremos aquí, pero aún no está creada. La crearemos en el siguiente paso.

        } catch (error) {
            console.error("Error cargando datos del dashboard:", error);
            displayError(`Error al cargar los datos del resumen: ${error.message}`);
        }
    }

    function populateHeader(patient) {
        // --- FUNCIÓN CORREGIDA ---
        function getAge(dateString) {
            const birthDate = new Date(dateString); // Usar la variable correcta: birthDate
            const today = new Date();
            let years = today.getFullYear() - birthDate.getFullYear();
            let months = today.getMonth() - birthDate.getMonth();
            if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
                years--;
                months += 12;
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

    function displayError(message) {
        const container = document.querySelector('.page-container');
        if (container) {
            container.innerHTML = `<div class="card"><p class="error-message">${message}</p><a href="index.html" class="button-secondary">Regresar al Inicio</a></div>`;
        }
    }

    // Iniciar la carga de la página
    loadDashboard();
});
