document.addEventListener('DOMContentLoaded', () => {
    // La conexión 'db' ya está disponible gracias a auth-guard.js

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
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    const formAmiel = document.getElementById('neuro-form-amiel-tison');
    const formHitos = document.getElementById('neuro-form-hitos');
    const responseMsgAmiel = document.getElementById('response-message-amiel');
    const responseMsgHitos = document.getElementById('response-message-hitos');

    const puntuacionInputs = document.querySelectorAll('.puntuacion-input');
    const puntuacionTotalInput = document.getElementById('puntuacionTotal');
    const edadHitosSelect = document.getElementById('edadHitosSelect');
    const hitosChecklistContainer = document.getElementById('hitos-checklist-container');

    // --- LÓGICA DE PESTAÑAS ---
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
        });
    });

    // --- INICIALIZACIÓN ---
    const activePatient = JSON.parse(localStorage.getItem('activePatient'));
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

    if (!activePatient) {
        patientBanner.textContent = "ERROR: No hay un paciente activo.";
        backToVisorBtn.href = 'index.html';
        document.querySelector('.tabs-container').style.display = 'none';
        return;
    }

    patientBanner.innerHTML = `Valoraciones para: <strong>${activePatient.nombre} ${activePatient.apellidoPaterno}</strong>`;
    backToVisorBtn.href = `visor.html?codigo=${activePatient.codigoUnico}`;
    document.getElementById('fechaValoracionAmiel').valueAsDate = new Date();
    document.getElementById('fechaValoracionHitos').valueAsDate = new Date();

    applyPermissions();
    loadNeuroHistory();

    // --- MANEJO DE EVENTOS ---
    puntuacionInputs.forEach(input => input.addEventListener('input', updateTotalScore));
    edadHitosSelect.addEventListener('change', renderHitosChecklist);
    formAmiel.addEventListener('submit', (e) => handleFormSubmit(e, 'amielTison'));
    formHitos.addEventListener('submit', (e) => handleFormSubmit(e, 'hitos'));
    
    // --- FUNCIONES ---
    function applyPermissions() {
        if (!currentUser) return;
        const userRole = currentUser.profile;
        const hasPermission = ['medico', 'superusuario', 'rehabilitador'].includes(userRole);

        if (!hasPermission) {
            const amielTabButton = document.querySelector('button[data-tab="amiel-tison"]');
            const hitosTabButton = document.querySelector('button[data-tab="hitos"]');
            if (amielTabButton) amielTabButton.style.display = 'none';
            if (hitosTabButton) hitosTabButton.style.display = 'none';
        }
    }

    function updateTotalScore() {
        let total = 0;
        puntuacionInputs.forEach(input => { total += Number(input.value) || 0; });
        puntuacionTotalInput.value = total;
    }
    
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
            item.innerHTML = `<input type="checkbox" id="${hito.id}" name="hitos" value="${hito.label}"><label for="${hito.id}">${hito.label}</label>`;
            checklist.appendChild(item);
        });
        hitosChecklistContainer.appendChild(checklist);
    }

    async function handleFormSubmit(e, formType) {
        e.preventDefault();
        
        let formData;
        let submitBtn;
        let responseMsg;
        let formElement;
        let collectionName;

        if (formType === 'amielTison') {
            formElement = formAmiel;
            submitBtn = formAmiel.querySelector('button[type="submit"]');
            responseMsg = responseMsgAmiel;
            collectionName = 'amielTison';
            formData = {
                codigoUnico: activePatient.codigoUnico,
                fechaValoracion: document.getElementById('fechaValoracionAmiel').value,
                edadMeses: document.getElementById('edadMesesAmiel').value,
                tonoPasivoPuntuacion: document.getElementById('tonoPasivoPuntuacion').value,
                tonoPasivoObs: document.getElementById('tonoPasivoObs').value,
                tonoActivoPuntuacion: document.getElementById('tonoActivoPuntuacion').value,
                tonoActivoObs: document.getElementById('tonoActivoObs').value,
                reflejosPuntuacion: document.getElementById('reflejosPuntuacion').value,
                reflejosObs: document.getElementById('reflejosObs').value,
                puntuacionTotal: document.getElementById('puntuacionTotal').value,
                conclusion: document.getElementById('conclusion').value,
                tipoValoracion: 'Amiel-Tison'
            };
        } else { // 'hitos'
            formElement = formHitos;
            submitBtn = formHitos.querySelector('button[type="submit"]');
            responseMsg = responseMsgHitos;
            collectionName = 'neurodesarrollo';
            const edadSeleccionada = edadHitosSelect.options[edadHitosSelect.selectedIndex].text;
            const hitosCumplidos = Array.from(document.querySelectorAll('input[name="hitos"]:checked')).map(cb => cb.value);
            
            formData = {
                codigoUnico: activePatient.codigoUnico,
                fechaValoracion: document.getElementById('fechaValoracionHitos').value,
                edadMeses: edadHitosSelect.value,
                tipoValoracion: `Hitos del Desarrollo (${edadSeleccionada})`,
                resultados: hitosCumplidos.length > 0 ? hitosCumplidos.join('\n') : "Ningún hito seleccionado.",
                observaciones: document.getElementById('observacionesHitos').value,
            };
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';
        responseMsg.style.display = 'none';

        try {
            formData.id = new Date().getTime().toString();
            await db.collection(collectionName).doc(formData.id).set(formData);

            responseMsg.textContent = 'Valoración guardada con éxito.';
            responseMsg.className = 'success';
            formElement.reset();
            
            document.getElementById('fechaValoracionAmiel').valueAsDate = new Date();
            document.getElementById('fechaValoracionHitos').valueAsDate = new Date();
            if (formElement === formHitos) hitosChecklistContainer.innerHTML = '';
            
            loadNeuroHistory();
        } catch (error) {
            responseMsg.textContent = `Error: ${error.message}`;
            responseMsg.className = 'error';
        } finally {
            responseMsg.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = formType === 'amielTison' ? 'Guardar Valoración Amiel-Tison' : 'Guardar Hitos';
        }
    }

    async function loadNeuroHistory() {
        historialContainer.innerHTML = 'Cargando historial...';
        try {
            const neuroQuery = db.collection('neurodesarrollo').where('codigoUnico', '==', activePatient.codigoUnico);
            const amielQuery = db.collection('amielTison').where('codigoUnico', '==', activePatient.codigoUnico);
            
            const [neuroSnap, amielSnap] = await Promise.all([neuroQuery.get(), amielQuery.get()]);

            const neuroData = neuroSnap.docs.map(doc => doc.data());
            const amielData = amielSnap.docs.map(doc => doc.data());

            const combinedHistory = [...neuroData, ...amielData];
            combinedHistory.sort((a, b) => new Date(b.fechaValoracion) - new Date(a.fechaValoracion));

            if (combinedHistory.length === 0) {
                historialContainer.innerHTML = '<p>No hay valoraciones de neurodesarrollo registradas.</p>';
                return;
            }

            historialContainer.innerHTML = '';
            combinedHistory.forEach(valoracion => {
                const card = document.createElement('div');
                card.className = 'consulta-card';
                const fecha = new Date(valoracion.fechaValoracion).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
                let detailsHtml;
                let valoracionType = valoracion.tipoValoracion;

                if (valoracion.tipoValoracion === 'Amiel-Tison') {
                    valoracionType = `Amiel-Tison (Total: ${valoracion.puntuacionTotal})`;
                    detailsHtml = `
                        <p><strong>Tono Pasivo:</strong> Puntuación ${valoracion.tonoPasivoPuntuacion || 'N/A'}. ${valoracion.tonoPasivoObs || ''}</p>
                        <p><strong>Tono Activo:</strong> Puntuación ${valoracion.tonoActivoPuntuacion || 'N/A'}. ${valoracion.tonoActivoObs || ''}</p>
                        <p><strong>Reflejos:</strong> Puntuación ${valoracion.reflejosPuntuacion || 'N/A'}. ${valoracion.reflejosObs || ''}</p>
                        <hr><p><strong>Puntuación Total: ${valoracion.puntuacionTotal}</strong></p>
                        <p><strong>Conclusión:</strong> ${valoracion.conclusion || ''}</p>`;
                } else {
                    detailsHtml = `
                        <p><strong>Resultados:</strong><br>${(valoracion.resultados || '').replace(/\n/g, '<br>')}</p>
                        <p><strong>Observaciones:</strong><br>${(valoracion.observaciones || '').replace(/\n/g, '<br>')}</p>`;
                }
                card.innerHTML = `
                    <details>
                        <summary class="consulta-summary">
                            <div class="summary-info">
                                <strong>${fecha}</strong>
                                <span class="motivo-preview">${valoracionType}</span>
                            </div>
                        </summary>
                        <div class="consulta-details">${detailsHtml}</div>
                    </details>`;
                historialContainer.appendChild(card);
            });
        } catch (error) {
            historialContainer.innerHTML = `<p class="error-message">Error al cargar el historial: ${error.message}</p>`;
        }
    }
});
