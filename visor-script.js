document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbw6jZIjBoeSlIRF-lAMPNqmbxRsncqulzZEi8f7q2AyOawxbpSZRIUxsx9UgZwe/exec';

    // --- ELEMENTOS DEL DOM ---
    const responseMsg = document.getElementById('response-message');
    const patientDataView = document.getElementById('patient-data-view');
    const patientCodeDisplay = document.getElementById('patient-code-display');

    // --- LÓGICA PRINCIPAL ---
    const params = new URLSearchParams(window.location.search);
    const codigo = params.get('codigo');

    if (!codigo) {
        displayError("No se ha especificado un código de paciente.");
        return;
    }
    
    patientCodeDisplay.textContent = `Código: ${codigo}`;
    patientDataView.style.display = 'none'; 

    // --- CORRECCIÓN AQUÍ ---
    // Añadir el parámetro 'action' a la URL de la solicitud
    fetch(`${API_URL}?action=getPaciente&codigo=${codigo}`, {
        method: 'GET',
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success' && data.data) {
            populatePatientData(data.data);
            localStorage.setItem('activePatient', JSON.stringify(data.data));
            patientDataView.style.display = 'block';
        } else {
            throw new Error(data.message || 'Error al cargar los datos del paciente.');
        }
    })
    .catch(error => {
        displayError(error.message);
        localStorage.removeItem('activePatient');
    });

    // --- FUNCIONES AUXILIARES ---
    function populatePatientData(patient) {
        document.getElementById('nombre-completo').textContent = `${patient.nombre} ${patient.apellidoPaterno} ${patient.apellidoMaterno}`;
        document.getElementById('fechaNacimiento').textContent = patient.fechaNacimiento.substring(0, 10); // Formatear fecha por si acaso
        document.getElementById('domicilio').textContent = patient.domicilio || 'No registrado';
        document.getElementById('telefono').textContent = patient.telefono || 'No registrado';
        document.getElementById('correo').textContent = patient.correoElectrónico || 'No registrado';
        document.getElementById('nombreMama').textContent = patient.nombreMama || 'No registrado';
        document.getElementById('nombrePapa').textContent = patient.nombrePapa || 'No registrado';
        document.getElementById('alergias').textContent = patient.alergias || 'Ninguna conocida';
    }

    function displayError(message) {
        patientDataView.style.display = 'none';
        responseMsg.textContent = message;
        responseMsg.className = 'error';
        responseMsg.style.display = 'block';
    }
});
