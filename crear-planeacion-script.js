document.addEventListener('DOMContentLoaded', () => {
    const planForm = document.getElementById('plan-form');
    const submitBtn = document.getElementById('submit-btn');
    const responseMsg = document.getElementById('response-message');
    const patientBanner = document.getElementById('patient-banner');
    
    const activePatient = JSON.parse(localStorage.getItem('activePatient'));
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

    if (!activePatient) {
        patientBanner.textContent = "ERROR: No hay un paciente activo.";
        if(planForm) planForm.style.display = 'none';
        return;
    }

    patientBanner.innerHTML = `Creando plan para: <strong>${activePatient.nombre} ${activePatient.apellidoPaterno}</strong>`;
    
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const recordId = params.get('id');

    if (mode === 'edit' && recordId) {
        document.querySelector('h1').textContent = '✏️ Editar Planeación';
        const recordToEdit = JSON.parse(sessionStorage.getItem('recordToEdit'));
        if (recordToEdit && recordToEdit.id == recordId) {
            document.getElementById('fechaPlan').value = recordToEdit.fechaPlan;
            document.getElementById('profesional').value = recordToEdit.profesional;
            document.getElementById('diagnosticoRelacionado').value = recordToEdit.diagnosticoRelacionado;
            document.getElementById('indicaciones').value = recordToEdit.indicaciones;
            document.getElementById('proximaCita').value = recordToEdit.proximaCita;
        }
    } else {
        document.getElementById('fechaPlan').valueAsDate = new Date();
    }

    if (currentUser && currentUser.profile === 'asistente') {
        if(planForm) {
            planForm.querySelectorAll('input, textarea, button').forEach(el => el.disabled = true);
            submitBtn.textContent = 'Creación no permitida';
            submitBtn.style.backgroundColor = '#6c757d';
        }
    }

    if(planForm) {
        planForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            submitBtn.disabled = true;
            submitBtn.textContent = 'Guardando...';
            responseMsg.style.display = 'none';

            const formData = {
                codigoUnico: activePatient.codigoUnico,
                fechaPlan: document.getElementById('fechaPlan').value,
                profesional: document.getElementById('profesional').value,
                diagnosticoRelacionado: document.getElementById('diagnosticoRelacionado').value,
                indicaciones: document.getElementById('indicaciones').value,
                proximaCita: document.getElementById('proximaCita').value,
            };

            try {
                if (mode === 'edit') {
                    formData.id = recordId;
                    await db.collection('planeacionConsultas').doc(recordId).update(formData);
                } else {
                    formData.id = new Date().getTime().toString();
                    await db.collection('planeacionConsultas').doc(formData.id).set(formData);
                }
                alert(`Planeación ${mode === 'edit' ? 'actualizada' : 'guardada'} con éxito.`);
                sessionStorage.removeItem('recordToEdit');
                window.location.href = 'planeacion.html';
            } catch (error) {
                responseMsg.textContent = `Error al guardar: ${error.message}`;
                responseMsg.className = 'error';
                responseMsg.style.display = 'block';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Guardar Planeación';
            }
        });
    }
});
