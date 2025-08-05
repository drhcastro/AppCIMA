document.addEventListener('DOMContentLoaded', () => {
    // La conexión 'db' ya está disponible gracias a auth-guard.js

    // --- ELEMENTOS DEL DOM ---
    const form = document.getElementById('consulta-form');
    const submitBtn = document.getElementById('submit-btn');
    const responseMsg = document.getElementById('response-message');
    const patientBanner = document.getElementById('patient-banner');
    const backToVisorBtn = document.getElementById('back-to-visor');

    // --- LÓGICA DE INICIALIZACIÓN ---
    const activePatient = JSON.parse(localStorage.getItem('activePatient'));
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

    if (!activePatient) {
        patientBanner.textContent = "ERROR: No hay un paciente activo.";
        if (form) form.style.display = 'none';
        backToVisorBtn.href = 'index.html';
        return;
    }

    patientBanner.textContent = `Registrando consulta para: ${activePatient.nombre} ${activePatient.apellidoPaterno} (Cód: ${activePatient.codigoUnico})`;
    backToVisorBtn.href = `visor.html?codigo=${activePatient.codigoUnico}`;

    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const recordId = params.get('id');

    if (mode === 'edit' && recordId) {
        document.querySelector('h1').textContent = '✏️ Editar Consulta Médica';
        const recordToEdit = JSON.parse(sessionStorage.getItem('recordToEdit'));
        if (recordToEdit && recordToEdit.id == recordId) {
            for (const key in recordToEdit) {
                const element = document.getElementById(key);
                if (element) element.value = recordToEdit[key];
            }
        } else {
            alert("Error: No se encontraron los datos para editar.");
        }
    } else {
        document.getElementById('fechaConsulta').valueAsDate = new Date();
        document.getElementById('alergiasConsulta').value = activePatient.alergias || 'Ninguna conocida';
    }

    applyPermissions();

    // --- FUNCIONES DE CÁLCULO DE Z-SCORE ---
    // Estas funciones leen la variable 'whoData' que debe estar disponible globalmente (cargada desde data.js)
    function getLMS(ageInDays, sex, table) {
        if (typeof whoData === 'undefined' || !table || !table[sex]) {
            console.error("whoData no está definido o la tabla es incorrecta. Asegúrate de que data.js se carga antes que este script.");
            return null;
        }
        const data = table[sex];
        // Encontrar el registro más cercano a la edad en días
        let closest = data.reduce((prev, curr) => (Math.abs(curr[0] - ageInDays) < Math.abs(prev[0] - ageInDays) ? curr : prev));
        // Devolver un objeto con las propiedades L, M, S
        return { L: closest[1], M: closest[2], S: closest[3] };
    }

    function calculateZScore(value, lms) {
        if (!lms || value == null || value <= 0) return null;
        const { L, M, S } = lms;
        // La fórmula LMS para calcular el Z-Score
        const z = (Math.pow(value / M, L) - 1) / (L * S);
        return parseFloat(z.toFixed(2)); // Redondear a 2 decimales
    }

    // --- MANEJO DEL FORMULARIO ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';

        const newConsultId = mode === 'edit' ? recordId : new Date().getTime().toString();

        // 1. Recolectar datos de la nota de consulta
        const formData = {
            codigoUnico: activePatient.codigoUnico,
            fechaConsulta: document.getElementById('fechaConsulta').value,
            medicoTratante: document.getElementById('medicoTratante').value,
            sintomasSignosMotivo: document.getElementById('sintomasSignosMotivo').value,
            alergiasConsulta: document.getElementById('alergiasConsulta').value,
            medicamentosPrevios: document.getElementById('medicamentosPrevios').value,
            historialClinicoPrevio: document.getElementById('historialClinicoPrevio').value,
            liquidosAlimentos: document.getElementById('liquidosAlimentos').value,
            eventosRelacionados: document.getElementById('eventosRelacionados').value,
            analisis: document.getElementById('analisis').value,
            plan: document.getElementById('plan').value,
            diagnosticoSindromatico: document.getElementById('diagnosticoSindromatico').value,
            diagnosticoEtiologico: document.getElementById('diagnosticoEtiologico').value,
            diagnosticoNutricional: document.getElementById('diagnosticoNutricional').value,
            diagnosticoRadiologico: document.getElementById('diagnosticoRadiologico').value,
            diagnosticoPresuntivo: document.getElementById('diagnosticoPresuntivo').value,
            diagnosticoNosologico: document.getElementById('diagnosticoNosologico').value
        };

        // 2. Recolectar y procesar datos de antropometría
        const peso = parseFloat(document.getElementById('consulta-peso').value) || null;
        const talla = parseFloat(document.getElementById('consulta-talla').value) || null;
        const pc = parseFloat(document.getElementById('consulta-pc').value) || null;
        
        let measurementData = null;

        if (peso && talla) { // Guardar solo si hay al menos peso y talla
            const ageInDays = Math.floor((new Date(formData.fechaConsulta) - new Date(activePatient.fechaNacimiento)) / (1000 * 60 * 60 * 24));
            const sex = activePatient.sexo.toLowerCase() === 'niño' ? 'boys' : 'girls';
            const imc = peso / Math.pow(talla / 100, 2);

            measurementData = {
                id: new Date().getTime().toString(),
                codigoUnico: activePatient.codigoUnico,
                fechaMedicion: formData.fechaConsulta,
                idConsulta: newConsultId,
                peso: peso,
                talla: talla,
                pc: pc,
                imc: parseFloat(imc.toFixed(2)),
                pesoZScore: calculateZScore(peso, getLMS(ageInDays, sex, whoData.weightForAge)),
                tallaZScore: calculateZScore(talla, getLMS(ageInDays, sex, whoData.lengthForAge)),
                pcZScore: calculateZScore(pc, getLMS(ageInDays, sex, whoData.headCircumferenceForAge)),
                imcZScore: calculateZScore(imc, getLMS(ageInDays, sex, whoData.bmiForAge)),
            };
        }

        try {
            const promises = [];

            // Promesa para la nota de consulta
            if (mode === 'edit') {
                promises.push(db.collection('consultas').doc(recordId).update(formData));
            } else {
                formData.id = newConsultId;
                promises.push(db.collection('consultas').doc(newConsultId).set(formData));
            }
            
            // Si hay mediciones, añadir la promesa de guardado
            if (measurementData) {
                promises.push(db.collection('medicionesCrecimiento').doc(measurementData.id).set(measurementData));
            }
            
            await Promise.all(promises);
            
            alert(`Consulta ${mode === 'edit' ? 'actualizada' : 'guardada'} con éxito.`);
            sessionStorage.removeItem('recordToEdit');
            window.location.href = `historial.html`;
        } catch (error) {
            responseMsg.textContent = `Error al guardar: ${error.message}`;
            responseMsg.className = 'error';
            responseMsg.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Guardar Consulta';
        }
    });

    function applyPermissions() {
        if (!currentUser) return;
        const userRole = currentUser.profile;
        if (userRole !== 'medico' && userRole !== 'superusuario') {
            form.querySelectorAll('input, select, textarea, button').forEach(el => {
                el.disabled = true;
            });
            submitBtn.textContent = 'Acción no permitida para este perfil';
            submitBtn.style.backgroundColor = '#6c757d';
        }
    }
});
