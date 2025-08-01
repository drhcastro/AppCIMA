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
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Formularios
    const formAmiel = document.getElementById('neuro-form-amiel');
    const formHitos = document.getElementById('neuro-form-hitos');
    const responseMsgAmiel = document.getElementById('response-message-amiel');
    const responseMsgHitos = document.getElementById('response-message-hitos');

    // Amiel-Tyson
    const puntuacionInputs = document.querySelectorAll('.puntuacion-input');
    const puntuacionTotalInput = document.getElementById('puntuacionTotal');

    // Hitos
    const edadHitosSelect = document.getElementById('edadHitosSelect');
    const hitosChecklistContainer = document.getElementById('hitos-checklist-container');

    // --- LÓGICA DE INICIALIZACIÓN ---
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
    
    puntuacionInputs.forEach(input => input.addEventListener('input', updateTotalScore));
    edadHitosSelect.addEventListener('change', renderHitosChecklist);
    formAmiel.addEventListener('submit', handleAmielSubmit);
    formHitos.addEventListener('submit', handleHitosSubmit);
    
    // --- FUNCIONES ---

    function updateTotalScore() {
        let total = 0;
        puntuacionInputs.forEach(input => {
            total += Number(input.value) || 0;
        });
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
            item.innerHTML = `
                <input type="checkbox" id="${hito.id}" name="hitos" value="${hito.label}">
                <label for="${hito.id}">${hito.label}</label>
            `;
            checklist.appendChild(item);
        });
        hitosChecklistContainer.appendChild(checklist);
    }

    async function handleAmielSubmit(e) {
        e.preventDefault();
        const submitBtn = formAmiel.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';
        responseMsgAmiel.style.display = 'none';

        const formData = {
            action: 'guardarAmielTyson',
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
            conclusion: document.getElementById('conclusion').value
        };
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST', body: JSON.stringify(formData), headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.message);

            responseMsgAmiel.textContent = 'Valoración Amiel-Tyson guardada con éxito.';
            responseMsgAmiel.className = 'success';
            formAmiel.reset();
            document.getElementById('fechaValoracionAmiel').valueAsDate = new Date();
            loadNeuroHistory();
        } catch (error) {
            responseMsgAmiel.textContent = `Error: ${error.message}`;
            responseMsgAmiel.className = 'error';
        } finally {
            responseMsgAmiel.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Guardar Valoración Amiel-Tyson';
        }
    }
    
    async function handleHitosSubmit(e) {
        e.preventDefault();
        const submitBtn = formHitos.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';
        responseMsgHitos.style.display = 'none';

        const edadSeleccionada = edadHitosSelect.options[edadHitosSelect.selectedIndex].text;
        const hitosCumplidos = Array.from(document.querySelectorAll('input[name="hitos"]:checked')).map(cb => cb.value);
        
        const formData = {
            action: 'guardarNeuro',
            codigoUnico: activePatient.codigoUnico,
            fechaValoracion: document.getElementById('fechaValoracionHitos').value,
            edadMeses: edadHitosSelect.value,
            tipoValoracion: `Hitos del Desarrollo (${edadSeleccionada})`,
            resultados: hitosCumplidos.length > 0 ? hitosCumplidos.join('\n') : "Ningún hito seleccionado.",
            observaciones: document.getElementById('observacionesHitos').value,
        };
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST', body: JSON.stringify(formData), headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            });
            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.message);

            responseMsgHitos.textContent = 'Hitos guardados con éxito.';
            responseMsgHitos.className = 'success';
            formHitos.reset();
            document.getElementById('fechaValoracionHitos').valueAsDate = new Date();
            hitosChecklistContainer.innerHTML = '';
            loadNeuroHistory();
        } catch (error) {
            responseMsgHitos.textContent = `Error: ${error.message}`;
            responseMsgHitos.className = 'error';
        } finally {
            responseMsgHitos.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Guardar Hitos';
        }
    }

    async function loadNeuroHistory() {
        historialContainer.innerHTML = 'Cargando historial...';
        try {
            const [neuroRes, amielRes] = await Promise.all([
                fetch(`${API_URL}?action=getNeuro&codigo=${activePatient.codigoUnico}`),
                fetch(`${API_URL}?action=getAmielTyson&codigo=${activePatient.codigoUnico}`)
            ]);

            const neuroData = await neuroRes.json();
            const amielData = await amielRes.json();

            if (neuroData.status !== 'success' || amielData.status !== 'success') {
                throw new Error(neuroData.message || amielData.message);
            }
            
            const combinedHistory = [...neuroData.data, ...amielData.data];
            combinedHistory.sort((a, b) => new Date(b.fechaValoracion) - new Date(a.fechaValoracion));

            if (combinedHistory.length === 0) {
                historialContainer.innerHTML = '<p>No hay valoraciones de neurodesarrollo registradas.</p>';
                return;
            }

            historialContainer.innerHTML = '';
            combinedHistory.forEach(valoracion => {
                const card = document.createElement('div');
                card.className = 'consulta-card';
                const fecha = new Date(valoracion.fechaValoracion + 'T00:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
                
                let detailsHtml;
                let valoracionType = valoracion.tipoValoracion;

                if (valoracion.puntuacionTotal !== undefined) { // Es una valoración Amiel-Tyson
                    valoracionType = `Amiel-Tyson (Total: ${valoracion.puntuacionTotal})`;
                    detailsHtml = `
                        <p><strong>Tono Pasivo:</strong> Puntuación ${valoracion.tonoPasivoPuntuacion}. ${valoracion.tonoPasivoObs}</p>
                        <p><strong>Tono Activo:</strong> Puntuación ${valoracion.tonoActivoPuntuacion}. ${valoracion.tonoActivoObs}</p>
                        <p><strong>Reflejos:</strong> Puntuación ${valoracion.reflejosPuntuacion}. ${valoracion.reflejosObs}</p>
                        <hr><p><strong>Puntuación Total: ${valoracion.puntuacionTotal}</strong></p>
                        <p><strong>Conclusión:</strong> ${valoracion.conclusion}</p>
                    `;
                } else { // Es una nota genérica o de Hitos
                    detailsHtml = `
                        <p><strong>Resultados:</strong><br>${(valoracion.resultados || '').replace(/\n/g, '<br>')}</p>
                        <p><strong>Observaciones:</strong><br>${(valoracion.observaciones || '').replace(/\n/g, '<br>')}</p>
                    `;
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
                    </details>
                `;
                historialContainer.appendChild(card);
            });
        } catch (error) {
            historialContainer.innerHTML = `<p class="error-message">Error al cargar el historial: ${error.message}</p>`;
        }
    }
});
