// visor-script.js (Versión Final para el Panel de Control)
document.addEventListener('DOMContentLoaded', () => {
    // La conexión a Firebase ('db') ya está disponible gracias a auth-guard.js

    const patientHeaderPlaceholder = document.getElementById('patient-header-placeholder');

    // Si no estamos en la página del visor, no hacer nada.
    if (!patientHeaderPlaceholder) {
        return; 
    }

    const activePatient = JSON.parse(localStorage.getItem('activePatient'));

    if (!activePatient) {
        displayError("No se ha cargado un paciente. Por favor, regrese al menú y busque uno.");
        return;
    }

    // --- FUNCIONES ---
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

    function displayError(message) {
        const container = document.querySelector('.page-container');
        if (container) {
            container.innerHTML = `<div class="card"><p class="error-message">${message}</p><a href="index.html" class="button-secondary">Regresar al Inicio</a></div>`;
        }
    }

    // Iniciar la carga de la página
    populateHeader(activePatient);
});
