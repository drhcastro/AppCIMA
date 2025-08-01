document.addEventListener('DOMContentLoaded', () => {
    const activePatient = JSON.parse(localStorage.getItem('activePatient'));
    const allPlans = JSON.parse(sessionStorage.getItem('patientPlans'));

    const params = new URLSearchParams(window.location.search);
    const planIndex = params.get('index');

    if (!activePatient || !allPlans || planIndex === null) {
        document.body.innerHTML = '<h1>Error: No se encontraron datos del paciente o del plan.</h1>';
        return;
    }

    const plan = allPlans[planIndex];

    if (!plan) {
        document.body.innerHTML = '<h1>Error: Plan de tratamiento no encontrado.</h1>';
        return;
    }

    // Rellenar la información del paciente
    document.getElementById('nombre-paciente').textContent = `${activePatient.nombre} ${activePatient.apellidoPaterno}`;
    document.getElementById('fecha-nacimiento').textContent = new Date(activePatient.fechaNacimiento + 'T00:00:00').toLocaleDateString('es-ES');
    
    // Rellenar la información del plan
    document.getElementById('fecha-plan').textContent = new Date(plan.fechaPlan + 'T00:00:00').toLocaleDateString('es-ES');
    document.getElementById('diagnostico').textContent = plan.diagnosticoRelacionado;
    document.getElementById('indicaciones').textContent = plan.indicaciones;
    document.getElementById('proxima-cita').textContent = plan.proximaCita;
    document.getElementById('profesional').textContent = plan.profesional;

    // Lógica del botón de imprimir
    document.getElementById('print-btn').addEventListener('click', () => {
        window.print();
    });
});
