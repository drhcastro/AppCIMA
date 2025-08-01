document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbw6jZIjBoeSlIRF-lAMPNqmbxRsncqulzZEi8f7q2AyOawxbpSZRIUxsx9UgZwe/exec';

    // Base de datos de Hitos del Desarrollo
    const hitosPorEdad = {
        rn: [
            { id: 'reflejo_succion', label: 'Reflejo de succión presente y fuerte' },
            { id: 'reflejo_moro', label: 'Reflejo de Moro simétrico' },
            { id: 'postura_flexion', label: 'Postura en flexión predominante' },
            { id: 'fija_mirada', label: 'Fija la mirada brevemente' }
        ],
        '2m': [
            { id: 'levanta_cabeza', label: 'En prono, levanta la cabeza 45°' },
            { id: 'sonrisa_social', label: 'Sonrisa social en respuesta' },
            { id: 'sigue_objetos', label: 'Sigue objetos más allá de la línea media' },
            { id: 'vocaliza', label: 'Vocaliza sonidos (gorjeos)' }
        ],
        '4m': [
            { id: 'sosten_cefalico', label: 'Sostén cefálico completo' },
            { id: 'rueda_prono_supino', label: 'Rueda de prono a supino' },
            { id: 'rie_carcajadas', label: 'Ríe a carcajadas' },
            { id: 'alcanza_objetos', label: 'Alcanza objetos con ambas manos' }
        ],
        '6m': [
            { id: 'sedestacion_apoyo', label: 'Sedestación con apoyo' },
            { id: 'transfiere_objetos', label: 'Transfiere objetos de una mano a otra' },
            { id: 'balbuceo', label: 'Balbuceo monosilábico (ma, pa, da)' },
            { id: 'reconoce_rostros', label: 'Reconoce rostros familiares' }
        ],
        '9m': [
            { id: 'sedestacion_sin_apoyo', label: 'Sedestación sin apoyo, estable' },
            { id: 'gateo', label: 'Gatea o se arrastra' },
            { id: 'pinza_inmadura', label: 'Pinza inferior (rastrillo) o inmadura' },
            { id: 'angustia_separacion', label: 'Angustia de separación' }
        ],
        '12m': [
            { id: 'bipedestacion_apoyo', label: 'Se para con apoyo y da pasos laterales' },
            { id: 'pinza_fina', label: 'Pinza fina madura (pulgar-índice)' },
            { id: 'primeras_palabras', label: 'Dice 1-2 palabras con significado (mamá, papá)' },
            { id: 'entiende_ordenes', label: 'Entiende órdenes simples ("dame", "ven")' }
        ]
    };

    // --- ELEMENTOS DEL DOM ---
    const patientBanner = document.getElementById('patient-banner');
    const backToVisorBtn = document.getElementById('back-to-visor');
    const historialContainer = document.getElementById('neuro-historial-container');
    // Formularios
    const formAmiel = document.getElementById('neuro-form-amiel');
    const formHitos = document.getElementById('neuro-form-hitos');
    // Hitos
    const edadHitosSelect = document.getElementById('edadHitosSelect');
    const hitosChecklistContainer = document.getElementById('hitos-checklist-container');

    // --- LÓGICA DE PESTAÑAS ---
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === button.dataset.tab) content.classList.add('active');
            });
        });
    });

    // --- INICIALIZACIÓN ---
    const activePatient = JSON.parse(localStorage.getItem('activePatient'));
    if (!activePatient) {
        patientBanner.textContent = "ERROR: No hay un paciente activo.";
        backToVisorBtn.href = 'index.html';
        return;
    }

    patientBanner.innerHTML = `Valoraciones para: <strong>${activePatient.nombre} ${activePatient.apellidoPaterno}</strong>`;
    backToVisorBtn.href = `visor.html?codigo=${activePatient.codigoUnico}`;
    document.getElementById('fechaValoracionAmiel').valueAsDate = new Date();
    document.getElementById('fechaValoracionHitos').valueAsDate = new Date();

    loadNeuroHistory();

    // --- MANEJO DE EVENTOS ---
    edadHitosSelect.addEventListener('change', renderHitosChecklist);
    formAmiel.addEventListener('submit', (e) => handleFormSubmit(e, 'amiel'));
    formHitos.addEventListener('submit', (e) => handleFormSubmit(e, 'hitos'));
    
    // --- FUNCIONES ---
    function renderHitosChecklist() {
        const selectedAge = edadHitosSelect.value;
        hitosChecklistContainer.innerHTML = '';
        if (!selectedAge) return;

        const hitos = hitosPorEdad[selectedAge];
        const checklist = document.createElement('div');
        checklist.className = 'checklist';
        hitos.forEach(hito => {
            const item = document.createElement('div');
            item.className = 'check-item';
            item.innerHTML = `
                <input type="checkbox" id="${hito.id}" name="hitos" value="${hito.label}">
                <label for="${hito.id}">${hito.label}</label>
            `;
            checklist.appendChild(item);
        });
        hitosChecklistContainer.appendChild(checklist);
    }
    
    async function handleFormSubmit(e, formType) {
        e.preventDefault();
        
        let formData;
        let submitBtn;
        let responseMsg;

        if (formType === 'amiel') {
            submitBtn = formAmiel.querySelector('button[type="submit"]');
            responseMsg = document.getElementById('response-message-amiel');
            formData = {
                action: 'guardarNeuro',
                codigoUnico: activePatient.codigoUnico,
                fechaValoracion: document.getElementById('fechaValoracionAmiel').value,
                edadMeses: document.getElementById('edadMesesAmiel').value,
                tipoValoracion: document.getElementById('tipoValoracionAmiel').value,
                resultados: document.getElementById('resultadosAmiel').value,
                observaciones: document.getElementById('observacionesAmiel').value,
            };
        } else { // 'hitos'
            submitBtn = formHitos.querySelector('button[type="submit"]');
            responseMsg = document.getElementById('response-message-hitos');
            const edadSeleccionada = edadHitosSelect.options[edadHitosSelect.selectedIndex].text;
            const hitosCumplidos = Array.from(document.querySelectorAll('input[name="hitos"]:checked')).map(cb => cb.value);
            
            formData = {
                action: 'guardarNeuro',
                codigoUnico: activePatient.codigoUnico,
                fechaValoracion: document.getElementById('fechaValoracionHitos').value,
                edadMeses: edadHitosSelect.value, // guardamos la clave ej: '2m'
                tipoValoracion: `Hitos del Desarrollo (${edadSeleccionada})`,
                resultados: hitosCumplidos.join('\n'), // Guardamos los hitos cumplidos
                observaciones: document.getElementById('observacionesHitos').value,
            };
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(formData),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.message);

            responseMsg.textContent = 'Valoración guardada con éxito.';
            responseMsg.className = 'success';
            responseMsg.style.display = 'block';
            e.target.reset(); // Resetea el formulario que se envió
            
            // Restablecer valores por defecto
            document.getElementById('fechaValoracionAmiel').valueAsDate = new Date();
            document.getElementById('fechaValoracionHitos').valueAsDate = new Date();
            hitosChecklistContainer.innerHTML = '';
            
            loadNeuroHistory();
        } catch (error) {
            responseMsg.textContent = `Error: ${error.message}`;
            responseMsg.className = 'error';
            responseMsg.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = formType === 'amiel' ? 'Guardar Valoración Amiel-Tyson' : 'Guardar Hitos';
        }
    }

    async function loadNeuroHistory() {
        historialContainer.innerHTML = 'Cargando historial...';
        try {
            const response = await fetch(`${API_URL}?action=getNeuro&codigo=${activePatient.codigoUnico}`);
            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.message);
            
            if (data.data.length === 0) {
                historialContainer.innerHTML = '<p>No hay valoraciones de neurodesarrollo registradas.</p>';
                return;
            }
            
            historialContainer.innerHTML = '';
            data.data.forEach(valoracion => {
                const card = document.createElement('div');
                card.className = 'consulta-card';
                const fecha = new Date(valoracion.fechaValoracion + 'T00:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
                card.innerHTML = `
                    <details>
                        <summary class="consulta-summary">
                            <div class="summary-info">
                                <strong>${fecha}</strong>
                                <span class="motivo-preview">${valoracion.tipoValoracion}</span>
                            </div>
                        </summary>
                        <div class="consulta-details">
                            <p><strong>Resultados:</strong><br>${valoracion.resultados.replace(/\n/g, '<br>')}</p>
                            <p><strong>Observaciones:</strong><br>${valoracion.observaciones.replace(/\n/g, '<br>')}</p>
                        </div>
                    </details>
                `;
                historialContainer.appendChild(card);
            });
        } catch (error) {
            historialContainer.innerHTML = `<p class="error-message">Error al cargar el historial: ${error.message}</p>`;
        }
    }
});
