document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbxXXUPOvKK5HRSeFsM3LYVvkweqxKBhxMjxASg_0-7sEyke-LZ2eOPQkaz0quXoN3Mc/exec';

    // --- CORRECCIÓN CLAVE ---
    // Al entrar a la página de registro, siempre limpiamos al paciente activo anterior.
    localStorage.removeItem('activePatient');

    // --- ELEMENTOS DEL DOM ---
    const form = document.getElementById('registro-form');
    const submitBtn = document.getElementById('submit-btn');
    const responseMsg = document.getElementById('response-message');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // --- LÓGICA DE PESTAÑAS ---
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

    // --- LÓGICA DEL FORMULARIO ---
    form.addEventListener('submit', function(e) {
        e.preventDefault(); 
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registrando...';
        responseMsg.style.display = 'none';

        const formData = {
            action: 'registrarPaciente',
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

        fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(formData),
            headers: {'Content-Type': 'text/plain;charset=utf-8'},
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                responseMsg.innerHTML = `¡Paciente registrado con éxito!<br><strong>Código Único: ${data.codigo}</strong><br>(Guarda este código para futuras consultas)`;
                responseMsg.className = 'success';
                form.reset();
                tabButtons.forEach(btn => btn.classList.remove('active'));
                document.querySelector('.tab-button[data-tab="identidad"]').classList.add('active');
                tabContents.forEach(content => content.classList.remove('active'));
                document.getElementById('identidad').classList.add('active');
            } else {
                throw new Error(data.message || 'Ocurrió un error desconocido.');
            }
        })
        .catch(error => {
            responseMsg.textContent = `Error al registrar: ${error.message}`;
            responseMsg.className = 'error';
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Registrar Paciente';
            responseMsg.style.display = 'block';
        });
    });
});
