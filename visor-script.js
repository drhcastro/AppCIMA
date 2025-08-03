document.addEventListener('DOMContentLoaded', () => {
    const activePatient = JSON.parse(localStorage.getItem('activePatient'));
    const headerPlaceholder = document.getElementById('patient-header-placeholder');

    if (!activePatient) {
        headerPlaceholder.innerHTML = '<h1>Error: No se ha cargado un paciente.</h1>';
        return;
    }
    
    // Función para calcular la edad
    function getAge(dateString) {
        const birthDate = new Date(dateString);
        const today = new Date();
        let years = today.getFullYear() - birthDate.getFullYear();
        let months = today.getMonth() - birthDate.getMonth();
        if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
            years--;
            months += 12;
        }
        return `${years} años, ${months} meses`;
    }
    
    // Crear y mostrar el encabezado
    const headerHTML = `
        <div class="card patient-header-card">
            <div class="patient-details">
                <h2>${activePatient.nombre} ${activePatient.apellidoPaterno || ''}</h2>
                <div class="patient-meta">
                    <div>Edad: <span>${getAge(activePatient.fechaNacimiento)}</span></div>
                    <div>F. Nacimiento: <span>${new Date(activePatient.fechaNacimiento + 'T00:00:00').toLocaleDateString('es-ES')}</span></div>
                    <div>Mamá: <span>${activePatient.nombreMama || 'N/A'}</span></div>
                    <div>Código: <span>${activePatient.codigoUnico}</span></div>
                </div>
            </div>
            <a href="editar-paciente.html" class="button-primary">✏️ Editar Ficha</a>
        </div>
    `;
    headerPlaceholder.innerHTML = headerHTML;
});
