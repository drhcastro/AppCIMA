document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbw6jZIjBoeSlIRF-lAMPNqmbxRsncqulzZEi8f7q2AyOawxbpSZRIUxsx9UgZwe/exec';

    // --- ELEMENTOS DEL DOM ---
    const responseMsg = document.getElementById('response-message');
    const patientDataForm = document.getElementById('patient-data-form');
    const patientCodeDisplay = document.getElementById('patient-code-display');

    // --- LÓGICA DE PESTAÑAS (CORREGIDA) ---
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === button.dataset.tab) {
                    content.classList.add('active');
                }
            });
        });
    });

    // --- LÓGICA PRINCIPAL ---
    const params = new URLSearchParams(window.location.search);
    const codigo = params.get('codigo');

    if (!codigo) {
        displayError("No se ha especificado un código de paciente.");
        return;
    }
    
    patientCodeDisplay.textContent = `Código: ${codigo}`;
    patientDataForm.style.display = 'none';

    // Cargar los datos del paciente
    fetch(`${API_URL}?action=getPaciente&codigo=${codigo}`)
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success' && data.data) {
                populatePatientData(data.data);
                localStorage.setItem('activePatient', JSON.stringify(data.data));
                patientDataForm.style.display = 'block';
            } else {
                throw new Error(data.message || 'Error al cargar los datos del paciente.');
            }
        })
        .catch(error => {
            displayError(error.message);
            localStorage.removeItem('activePatient');
        });

    // Evento para guardar los cambios
    patientDataForm.addEventListener('submit', handleSaveChanges);

    // --- FUNCIONES ---
    function populatePatientData(patient) {
        // Rellena los campos del formulario con los datos del paciente
        for (const key in patient) {
            const element = document.getElementById(key);
            if (element) {
                // Formatear la fecha para el input tipo 'date'
                if (key === 'fechaNacimiento' && patient[key]) {
                    element.value = patient[key].substring(0, 10);
                } else {
                    element.value = patient[key];
                }
            }
        }
    }

    async function handleSaveChanges(e) {
        e.preventDefault();
        const submitBtn = document.getElementById('save-changes-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';

        // Recolectar todos los datos del formulario
        const formData = {
            action: 'actualizarPaciente', // <-- NUEVA ACCIÓN
            codigoUnico: codigo, // El código del paciente que estamos editando
            nombre: document.getElementById('nombre').value,
            apellidoPaterno: document.getElementById('apellidoPaterno').value,
            apellidoMaterno: document.getElementById('apellidoMaterno').value,
            fechaNacimiento: document.getElementById('fechaNacimiento').value,
            sexo: document.getElementById('sexo').value,
            domicilio: document.getElementById('domicilio').value,
            telefono: document.getElementById('telefono').value,
            nombreMama: document.getElementById('nombreMama').value,
            nombrePapa: document.getElementById('nombrePapa').value,
            correoElectrónico: document.getElementById('correoElectrónico').value,
            alergias: document.getElementById('alergias').value,
            antecedentesHeredofamiliares: document.getElementById('antecedentesHeredofamiliares').value,
            antecedentesPerinatales: document.getElementById('antecedentesPerinatales').value,
            antecedentesPatologicos: document.getElementById('antecedentesPatologicos').value,
            antecedentesNoPatologicos: document.getElementById('antecedentesNoPatologicos').value
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(formData),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.message);
            
            // Actualizar los datos en la memoria del navegador
            localStorage.setItem('activePatient', JSON.stringify(formData));
            
            displayMessage('success', '¡Expediente actualizado con éxito!');
        } catch (error) {
            displayMessage('error', `Error al guardar: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '💾 Guardar Cambios en el Expediente';
        }
    }

    function displayError(message) {
        patientDataForm.style.display = 'none';
        displayMessage('error', message);
    }

    function displayMessage(type, message) {
        responseMsg.className = type;
        responseMsg.textContent = message;
        responseMsg.style.display = 'block';
    }
});
