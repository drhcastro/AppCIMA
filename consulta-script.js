document.addEventListener('DOMContentLoaded', () => {
    // La conexión a Firebase ('db') ya está disponible gracias a auth-guard.js

    // --- ELEMENTOS DEL DOM ---
    const form = document.getElementById('consulta-form');
    const submitBtn = document.getElementById('submit-btn');
    const responseMsg = document.getElementById('response-message');
    const patientBanner = document.getElementById('patient-banner');
    const backToVisorBtn = document.getElementById('back-to-visor');
    // --- FUNCIÓN DE CÁLCULO DE Z-SCORE (Portado desde gráficas.html) ---
    function getLMS(ageInDays, sex, table) {
        const data = table[sex];
        if (!data) return null;
        let closest = data.reduce((prev, curr) => (Math.abs(curr[0] - ageInDays) < Math.abs(prev[0] - ageInDays) ? curr : prev));
        return closest;
    }
    function calculateZScore(value, L, M, S) {
        if (!L || !M || !S) return null;
        return (((value / M) ** L) - 1) / (L * S);
    }
    // --- LÓGICA DE INICIALIZACIÓN ---
    const activePatient = JSON.parse(localStorage.getItem('activePatient'));
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

    if (!activePatient) {
        patientBanner.textContent = "ERROR: No hay un paciente activo.";
        if(form) form.style.display = 'none';
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

    // --- MANEJO DEL FORMULARIO ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';
        const newConsultId = mode === 'edit' ? recordId : new Date().getTime().toString();
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
        // 2. Recolectar datos de antropometría
        const peso = parseFloat(document.getElementById('consulta-peso').value);
        const talla = parseFloat(document.getElementById('consulta-talla').value);
        const pc = parseFloat(document.getElementById('consulta-pc').value);
        const ageInDays = Math.floor((new Date(formData.fechaConsulta) - new Date(activePatient.fechaNacimiento)) / (1000 * 60 * 60 * 24));
        const sex = activePatient.sexo.toLowerCase() === 'niño' ? 'boys' : 'girls';

        const measurementData = {
            id: new Date().getTime().toString(),
            codigoUnico: activePatient.codigoUnico,
            fechaMedicion: formData.fechaConsulta,
            idConsulta: newConsultId
        };

        // 3. Calcular Z-Scores si hay datos
        if (peso) {
            measurementData.peso = peso;
            const lms = getLMS(ageInDays, sex, whoData.weightForAge);
            if (lms) measurementData.pesoZScore = calculateZScore(peso, lms[1], lms[2], lms[3]);
        }
        if (talla) {
            measurementData.talla = talla;
            // ... (lógica similar para talla, pc, imc)
        }

        try {
            // 4. Guardar ambos registros
            const consultPromise = mode === 'edit' 
                ? db.collection('consultas').doc(recordId).update(formData)
                : db.collection('consultas').doc(newConsultId).set({ ...formData, id: newConsultId });

            const measurementPromise = db.collection('medicionesCrecimiento').doc(measurementData.id).set(measurementData);

            await Promise.all([consultPromise, measurementPromise]);
            
            alert(`Consulta ${mode === 'edit' ? 'actualizada' : 'guardada'} con éxito.`);
            // ... (resto de la lógica de éxito)

        } catch (error) { /* ... (manejo de error) */ }
    });
});
        try {
            if (mode === 'edit') {
                // Actualizar un documento existente en Firestore
                await db.collection('consultas').doc(recordId).update(formData);
            } else {
                // Crear un nuevo documento en Firestore
                formData.id = new Date().getTime().toString(); // Generar el ID
                await db.collection('consultas').doc(formData.id).set(formData);
            }
            
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
