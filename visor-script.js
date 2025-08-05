document.addEventListener('DOMContentLoaded', () => {
    // La conexión 'db' ya está disponible gracias a auth-guard.js
    const patientHeaderPlaceholder = document.getElementById('patient-header-placeholder');
    if (!patientHeaderPlaceholder) { return; }

    const activePatient = JSON.parse(localStorage.getItem('activePatient'));
    if (!activePatient) {
        displayError("No se ha cargado un paciente.");
        return;
    }
    const codigo = activePatient.codigoUnico;

    // --- FUNCIONES DE CÁLCULO ---
    function getAge(dateString) {
        if (!dateString) return { text: "N/A", days: 0 };
        const birthDate = new Date(dateString);
        const today = new Date();
        let years = today.getFullYear() - birthDate.getFullYear();
        let months = today.getMonth() - birthDate.getMonth();
        const days = Math.floor((today - birthDate) / (1000 * 60 * 60 * 24));
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
        
        if (totalCorrectedDays > (64 * 7)) return null; // Limitar a 64 semanas

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
            <div class="patient-details">
                <h2>${patient.nombre} ${patient.apellidoPaterno || ''}</h2>
                <div class="patient-meta">
                    <div>Edad: <span>${age.text}</span></div>
                    <div>F. Nac.: <span>${new Date(patient.fechaNacimiento + 'T00:00:00').toLocaleDateString('es-ES')}</span></div>
                    <div>Mamá: <span>${patient.nombreMama || 'N/A'}</span></div>
                    <div>Código: <span>${patient.codigoUnico}</span></div>
                    ${gaHTML}
                </div>
            </div>
            <a href="editar-paciente.html" class="button-primary">✏️ Editar Ficha</a>
        `;
        patientHeaderPlaceholder.innerHTML = headerHTML;
    }

    async function displayAlerts(patient, ageInDays, tamizajes) {
        const alertsContainer = document.getElementById('alerts-container');
        alertsContainer.innerHTML = ''; // Limpiar
        
        // Regla: Evaluación de retina para prematuros
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
            const fecha = new Date(dx.fechaConsulta).toLocaleDateString('es-ES');
            li.innerHTML = `<strong>${dx.tipo} (${fecha}):</strong> ${dx.diagnostico || 'Nota registrada.'}`;
            list.appendChild(li);
        });
        container.style.display = 'block';
    }

    // --- LÓGICA DE CARGA PRINCIPAL ---
    async function loadPage() {
        populateHeader(activePatient);
        
        const ageInDays = getAge(activePatient.fechaNacimiento).days;

        // Cargar todos los historiales necesarios
        const [tamizajesSnap, psicoSnap, nutriSnap, rehabSnap] = await Promise.all([
            db.collection('tamizajes').where('codigoUnico', '==', codigo).get(),
            db.collection('psicologia').where('codigoUnico', '==', codigo).orderBy('fechaConsulta', 'desc').limit(1).get(),
            db.collection('nutricion').where('codigoUnico', '==', codigo).orderBy('fechaConsulta', 'desc').limit(1).get(),
            db.collection('rehabilitacion').where('codigoUnico', '==', codigo).orderBy('fechaConsulta', 'desc').limit(1).get(),
        ]);

        const tamizajes = tamizajesSnap.docs.map(doc => doc.data());
        const psicologia = psicoSnap.docs.map(doc => ({...doc.data(), tipo: 'Psicología', diagnostico: doc.data().planSeguimiento}));
        const nutricion = nutriSnap.docs.map(doc => ({...doc.data(), tipo: 'Nutrición', diagnostico: doc.data().planSeguimiento}));
        const rehabilitacion = rehabSnap.docs.map(doc => ({...doc.data(), tipo: 'Rehabilitación', diagnostico: doc.data().planSeguimiento}));

        const lastDiagnostics = [...psicologia, ...nutricion, ...rehabilitacion];

        await displayAlerts(activePatient, ageInDays, tamizajes);
        await displaySpecialtyDiagnostics(lastDiagnostics);
    }
    
    function displayError(message) { /* ... (sin cambios) ... */ }

    // Iniciar la carga de la página
    loadPage();
});
