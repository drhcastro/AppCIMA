// crear-planeacion-script.js (Actualizado)
document.addEventListener('DOMContentLoaded', () => {
    // ... (Conexión y permisos sin cambios)

    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const recordId = params.get('id');

    if (mode === 'edit' && recordId) {
        document.querySelector('h1').textContent = '✏️ Editar Planeación';
        const recordToEdit = JSON.parse(sessionStorage.getItem('recordToEdit'));
        if (recordToEdit && recordToEdit.id == recordId) {
            // Rellenar el formulario
            document.getElementById('fechaPlan').value = recordToEdit.fechaPlan;
            document.getElementById('profesional').value = recordToEdit.profesional;
            document.getElementById('diagnosticoRelacionado').value = recordToEdit.diagnosticoRelacionado;
            document.getElementById('indicaciones').value = recordToEdit.indicaciones;
            document.getElementById('proximaCita').value = recordToEdit.proximaCita;
        }
    } else {
        document.getElementById('fechaPlan').valueAsDate = new Date();
    }
    
    planForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // ... (recolectar formData sin cambios)
        
        try {
            if (mode === 'edit') {
                formData.id = recordId;
                await db.collection('planeacionConsultas').doc(recordId).update(formData);
            } else {
                formData.id = new Date().getTime().toString();
                await db.collection('planeacionConsultas').doc(formData.id).set(formData);
            }
            alert(`Planeación ${mode === 'edit' ? 'actualizada' : 'guardada'} con éxito.`);
            window.location.href = 'planeacion.html';
        } catch (error) { /* ... (manejo de error) */ }
    });
});
