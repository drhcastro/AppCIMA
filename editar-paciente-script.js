document.addEventListener('DOMContentLoaded', () => {
    // La conexión 'db' ya está disponible gracias a auth-guard.js

    // --- ELEMENTOS DEL DOM ---
    const patientBanner = document.getElementById('patient-banner');
    const form = document.getElementById('edit-patient-form');
    const submitBtn = document.getElementById('submit-btn');
    const responseMsg = document.getElementById('response-message');
    const backToVisorBtn = document.getElementById('back-to-visor');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    // --- INICIALIZACIÓN Y PERMISOS ---
    const activePatient = JSON.parse(localStorage.getItem('activePatient'));
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

    if (!activePatient) {
        document.body.innerHTML = '<h1>Error: No hay paciente activo. Regresa y carga un expediente.</h1>';
        return;
    }

    // Poblar la información y aplicar permisos
    patientBanner.innerHTML = `Editando a: <strong>${activePatient.nombre} ${activePatient.apellidoPaterno}</strong>`;
    backToVisorBtn.href = `visor.html?codigo=${activePatient.codigoUnico}`;
    populateForm(activePatient);
    applyPermissions();

    // --- LÓGICA DE PESTAÑAS ---
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
        });
    });

    // --- MANEJO DEL FORMULARIO ---
    form.addEventListener('submit', handleSaveChanges);

    // --- FUNCIONES ---
    function applyPermissions() {
        if (!currentUser) return;
        const userRole = currentUser.profile;

        if (userRole === 'asistente') {
            form.querySelectorAll('input, select, textarea, button').forEach(el => el.disabled = true);
            submitBtn.textContent = 'Guardado no permitido';
        }
    }

    function populateForm(patient) {
        for (const key in patient) {
            const element = document.getElementById(key);
            if (element) {
                element.value = patient[key] || '';
            }
        }
        // Asegurar que el correo se llene en el campo correcto
         const emailElement = document.getElementById('correo');
         if(emailElement && patient.correo) emailElement.value = patient.correo;
    }

    async function handleSaveChanges(e) {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';
        responseMsg.style.display = 'none';

        const formData = {
            codigoUnico: activePatient.codigoUnico, // Es crucial mantener el código
            nombre: document.getElementById('nombre').value,
            apellidoPaterno: document.getElementById('apellidoPaterno').value,
            apellidoMaterno: document.getElementById('apellidoMaterno').value,
            fechaNacimiento: document.getElementById('fechaNacimiento').value,
            sexo: document.getElementById('sexo').value,
            domicilio: document.getElementById('domicilio').value,
            telefono: document.getElementById('telefono').value,
            nombreMama: document.getElementById('nombreMama').value,
            nombrePapa: document.getElementById('nombrePapa').value,
            correo: document.getElementById('correo').value,
            alergias: document.getElementById('alergias').value,
            antecedentesHeredofamiliares: document.getElementById('antecedentesHeredofamiliares').value,
            antecedentesPerinatales: document.getElementById('antecedentesPerinatales').value,
            antecedentesPatologicos: document.getElementById('antecedentesPatologicos').value,
            antecedentesNoPatologicos: document.getElementById('antecedentesNoPatologicos').value
        };

        try {
            // Actualizar el documento en Firestore
            await db.collection('pacientes').doc(activePatient.codigoUnico).set(formData, { merge: true });

            // Actualizar la memoria del navegador con los nuevos datos
            localStorage.setItem('activePatient', JSON.stringify(formData));
            
            alert('Expediente actualizado con éxito.');
            // Redirigir de vuelta al expediente para ver los cambios
            window.location.href = `visor.html?codigo=${activePatient.codigoUnico}`;

        } catch (error) {
            responseMsg.textContent = `Error al guardar: ${error.message}`;
            responseMsg.className = 'error';
            responseMsg.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Guardar Cambios';
        }
    }
});
