document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbxXXUPOvKK5HRSeFsM3LYVvkweqxKBhxMjxASg_0-7sEyke-LZ2eOPQkaz0quXoN3Mc/exec';

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
        form.style.display = 'none';
        backToVisorBtn.href = 'index.html';
        return;
    }

    patientBanner.textContent = `Registrando consulta para: ${activePatient.nombre} ${activePatient.apellidoPaterno} (Cód: ${activePatient.codigoUnico})`;
    backToVisorBtn.href = `visor.html?codigo=${activePatient.codigoUnico}`;

    // --- VERIFICAR MODO (CREAR O EDITAR) ---
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const recordId = params.get('id');

    if (mode === 'edit' && recordId) {
        document.querySelector('h1').textContent = '✏️ Editar Consulta Médica';
        const recordToEdit = JSON.parse(sessionStorage.getItem('recordToEdit'));

        if (recordToEdit && recordToEdit.id == recordId) {
            // Rellenar el formulario con los datos guardados
            for (const key in recordToEdit) {
                const element = document.getElementById(key);
                if (element) {
                    element.value = recordToEdit[key];
                }
            }
        } else {
            alert("Error: No se encontraron los datos para editar.");
        }
    } else {
        // Modo creación: valores por defecto
        document.getElementById('fechaConsulta').valueAsDate = new Date();
        document.getElementById('alergiasConsulta').value = activePatient.alergias || 'Ninguna conocida';
    }
    
    applyPermissions(); // Aplicar permisos al final

    // --- MANEJO DEL FORMULARIO ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';

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
        
        // Decidir si es una acción de guardar o actualizar
        if (mode === 'edit') {
            formData.action = 'actualizarConsulta';
            formData.id = recordId; // Añadir el ID del registro a actualizar
        } else {
            formData.action = 'guardarConsulta';
        }

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(formData),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.message);
            
            alert(`Consulta ${mode === 'edit' ? 'actualizada' : 'guardada'} con éxito.`);
            sessionStorage.removeItem('recordToEdit'); // Limpiar la memoria
            window.location.href = `historial.html`;
        } catch (error) {
            responseMsg.textContent = `Error al guardar: ${error.message}`;
            responseMsg.className = 'error';
            responseMsg.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Guardar Consulta';
        }
    });

    // --- FUNCIÓN DE PERMISOS ---
    function applyPermissions() {
        if (!currentUser) return;
        const userRole = currentUser.profile;

        // Regla: Solo 'medico' o 'superusuario' pueden registrar o editar.
        if (userRole === 'medico' || userRole === 'superusuario') {
            // Tiene permiso, no hacer nada.
        } else {
            // No tiene permiso, deshabilitar todo el formulario.
            form.querySelectorAll('input, select, textarea, button').forEach(el => {
                el.disabled = true;
            });
            submitBtn.textContent = 'Acción no permitida para este perfil';
            submitBtn.style.backgroundColor = '#6c757d'; // Color gris
        }
    }
});
