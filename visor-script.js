document.addEventListener('DOMContentLoaded', () => {
    // La conexión a Firebase ('db') ya está disponible globalmente gracias a auth-guard.js

    // --- CONFIGURACIÓN ---
    const TIPOS_DE_TAMIZAJES = ["Cardiológico", "Metabólico", "Visual", "Auditivo", "Genético", "Cadera"];

    // --- ELEMENTOS DEL DOM ---
    const responseMsg = document.getElementById('response-message');
    const patientDataForm = document.getElementById('edit-patient-form'); // ID del formulario en editar-paciente.html
    const patientBanner = document.getElementById('patient-banner');
    const backToVisorBtn = document.getElementById('back-to-visor');

    // --- INICIALIZACIÓN Y LÓGICA PRINCIPAL ---
    const activePatient = JSON.parse(localStorage.getItem('activePatient'));
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

    if (!activePatient) {
        document.body.innerHTML = '<h1>Error: No hay paciente activo. Regresa y carga un expediente.</h1>';
        return;
    }

    // Llenar el banner superior y el botón de regreso
    if (patientBanner) {
        patientBanner.innerHTML = `Editando a: <strong>${activePatient.nombre} ${activePatient.apellidoPaterno}</strong>`;
    }
    if (backToVisorBtn) {
        backToVisorBtn.href = `visor.html?codigo=${activePatient.codigoUnico}`;
    }

    // Si estamos en la página de edición, ejecutar la lógica del formulario
    if (patientDataForm) {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');
        const submitBtn = document.getElementById('submit-btn');

        // Lógica de pestañas
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
        
        populateForm(activePatient);
        applyPermissions();
        patientDataForm.addEventListener('submit', handleSaveChanges);

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
             const emailElement = document.getElementById('correo');
             if(emailElement && patient.correo) emailElement.value = patient.correo;
        }

        async function handleSaveChanges(e) {
            e.preventDefault();
            submitBtn.disabled = true;
            submitBtn.textContent = 'Guardando...';

            const formData = {
                codigoUnico: activePatient.codigoUnico,
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
                await db.collection('pacientes').doc(activePatient.codigoUnico).set(formData, { merge: true });
                localStorage.setItem('activePatient', JSON.stringify(formData));
                alert('Expediente actualizado con éxito.');
                window.location.href = `visor.html?codigo=${activePatient.codigoUnico}`;
            } catch (error) {
                responseMsg.textContent = `Error al guardar: ${error.message}`;
                responseMsg.className = 'error';
                responseMsg.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Guardar Cambios';
            }
        }
    }
});
