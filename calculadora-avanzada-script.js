document.addEventListener('DOMContentLoaded', () => {
    // La conexión 'db' ya está disponible gracias a auth-guard.js

    // --- ELEMENTOS DEL DOM ---
    const patientBanner = document.getElementById('patient-banner');
    const backToVisorBtn = document.getElementById('back-to-visor');
    const calculateBtn = document.getElementById('calculate-btn');
    const resultsContainer = document.getElementById('results-container');
    
    // Inputs
    const pesoInput = document.getElementById('calc-peso');
    const tallaInput = document.getElementById('calc-talla');
    const pcInput = document.getElementById('calc-pc');
    const tricipitalInput = document.getElementById('calc-tricipital');
    const subescapularInput = document.getElementById('calc-subescapular');
    const bicipitalInput = document.getElementById('calc-bicipital'); // Nuevo
    const suprailiacoInput = document.getElementById('calc-suprailiaco'); // Nuevo
    const perBraquialInput = document.getElementById('calc-per-braquial');
    const sexoInput = document.getElementById('calc-sexo');
    const edadInput = document.getElementById('calc-edad');
    const palInput = document.getElementById('calc-pal');

    // --- INICIALIZACIÓN ---
    const activePatient = JSON.parse(localStorage.getItem('activePatient'));

    if (activePatient) {
        patientBanner.innerHTML = `Calculando para: <strong>${activePatient.nombre} ${activePatient.apellidoPaterno}</strong>`;
        backToVisorBtn.href = `visor.html?codigo=${activePatient.codigoUnico}`;
        
        // Autorellenar campos si hay un paciente activo
        if (activePatient.sexo) sexoInput.value = activePatient.sexo.toLowerCase() === 'niño' ? 'masculino' : 'femenino';
        if (activePatient.fechaNacimiento) {
            const ageInYears = (new Date() - new Date(activePatient.fechaNacimiento)) / (31557600000);
            edadInput.value = ageInYears.toFixed(1);
        }
    } else {
        patientBanner.textContent = "Modo de cálculo rápido (sin paciente activo)";
        backToVisorBtn.href = 'index.html';
    }
    // --- MANEJO DE EVENTOS ---
    calculateBtn.addEventListener('click', displayAllCalculations);

    // --- FUNCIONES DE CÁLCULO DE Z-SCORE ---
    function getLMS(ageInDays, sex, table) {
        if (typeof whoData === 'undefined' || !table || !table[sex]) {
            console.error("whoData no está definido o la tabla es incorrecta. Asegúrate de que data.js se carga antes que este script.");
            return null;
        }
        const data = table[sex];
        let closest = data.reduce((prev, curr) => (Math.abs(curr[0] - ageInDays) < Math.abs(prev[0] - ageInDays) ? curr : prev));
        return { L: closest[1], M: closest[2], S: closest[3] };
    }

    function calculateZScore(value, lms) {
        if (!lms || value == null || value <= 0) return null;
        const { L, M, S } = lms;
        const z = (Math.pow(value / M, L) - 1) / (L * S);
        return z.toFixed(2);
    }
    
    // --- FUNCIÓN PRINCIPAL DE CÁLCULO Y VISUALIZACIÓN ---
    function displayAllCalculations() {
        // 1. Leer todos los valores de entrada
        const peso = parseFloat(pesoInput.value) || null;
        const talla = parseFloat(tallaInput.value) || null;
        const edad = parseFloat(edadInput.value) || null;
        const sexo = sexoInput.value;
        const pal = parseFloat(palInput.value) || 1.0;
        const plTricipital = parseFloat(tricipitalInput.value) || null;
        const plSubescapular = parseFloat(subescapularInput.value) || null;
        const plBicipital = parseFloat(bicipitalInput.value) || null;
        const plSuprailiaco = parseFloat(suprailiacoInput.value) || null;
        const perBraquial = parseFloat(perBraquialInput.value) || null;

        let results = {};
        
        // Indices básicos
       if (peso && talla) {
            results.imc = (peso / Math.pow(talla / 100, 2)).toFixed(2);
            results.sc = (Math.sqrt((talla * peso) / 3600)).toFixed(2); // Superficie Corporal (Mosteller)
        }


        // Z-Scores (solo si hay un paciente activo con fecha de nacimiento)
        if (activePatient && activePatient.fechaNacimiento) {
            const ageInDays = Math.floor((new Date() - new Date(activePatient.fechaNacimiento)) / (1000 * 60 * 60 * 24));
            const sex = activePatient.sexo.toLowerCase() === 'niño' ? 'boys' : 'girls';

            results.pesoZScore = calculateZScore(peso, getLMS(ageInDays, sex, whoData.weightForAge));
            results.tallaZScore = calculateZScore(talla, getLMS(ageInDays, sex, whoData.lengthForAge));
            results.pcZScore = calculateZScore(pc, getLMS(ageInDays, sex, whoData.headCircumferenceForAge));
            if (results.imc) {
                results.imcZScore = calculateZScore(results.imc, getLMS(ageInDays, sex, whoData.bmiForAge));
            }
        }
        
        // % Grasa Corporal (Slaughter)
        if (plTricipital && plSubescapular) {
            const sumPliegues = plTricipital + plSubescapular;
            results.grasaCorporal = (1.33 * sumPliegues - 0.013 * Math.pow(sumPliegues, 2) - 2.5).toFixed(2);
        }
        
// Composición Corporal (con 4 pliegues)
        if (plTricipital && plBicipital && plSubescapular && plSuprailiaco && edad) {
            const sumPliegues = plTricipital + plBicipital + plSubescapular + plSuprailiaco;
            let c, m;
            // Constantes de Durnin & Womersley por edad y sexo
            if (sexo === 'masculino') {
                if (edad < 17) { c=1.1533; m=0.0643; }
                else if (edad <= 19) { c=1.1620; m=0.0630; }
                else if (edad <= 29) { c=1.1631; m=0.0632; }
                else if (edad <= 39) { c=1.1422; m=0.0544; }
                else if (edad <= 49) { c=1.1620; m=0.0700; }
                else { c=1.1715; m=0.0779; }
            } else { // Femenino
                if (edad < 17) { c=1.1369; m=0.0598; }
                else if (edad <= 19) { c=1.1549; m=0.0678; }
                else if (edad <= 29) { c=1.1599; m=0.0717; }
                else if (edad <= 39) { c=1.1423; m=0.0632; }
                else if (edad <= 49) { c=1.1333; m=0.0612; }
                else { c=1.1339; m=0.0645; }
            }
            const densidad = c - (m * Math.log10(sumPliegues));
            results.densidadCorporal = densidad.toFixed(4);
            results.grasaCorporalSiri = ((495 / densidad) - 450).toFixed(2); // Fórmula de Siri
            if(peso) {
                results.masaGrasa = (peso * (results.grasaCorporalSiri / 100)).toFixed(2);
                results.masaLibreGrasa = (peso - results.masaGrasa).toFixed(2);
            }
        }

        // Áreas Braquiales
        if (perBraquial && plTricipital) {
            const plTricipitalCm = plTricipital / 10; // Convertir a cm
            results.areaGrasaBraquial = ((perBraquial * plTricipitalCm) / 2 - (Math.PI * Math.pow(plTricipitalCm, 2)) / 4).toFixed(2);
            results.areaMuscularBraquial = (Math.pow(perBraquial - (Math.PI * plTricipitalCm), 2) / (4 * Math.PI)).toFixed(2);
        }

         // --- NUEVO: CÁLCULO DE GASTO ENERGÉTICO (Harris-Benedict) ---
        if (peso && talla && edad && sexo) {
            let geb; // Gasto Energético Basal
            if (sexo === 'masculino') {
                geb = 66.5 + (13.75 * peso) + (5.003 * talla) - (6.755 * edad);
            } else { // Femenino
                geb = 655.1 + (9.563 * peso) + (1.850 * talla) - (4.676 * edad);
            }
            results.gebHarrisBenedict = geb.toFixed(2);
            results.getHarrisBenedict = (geb * pal).toFixed(2); // Gasto Energético Total
        }
        
        // 3. Mostrar resultados
        renderResults(results);
    }

    function renderResults(results) {
        resultsContainer.innerHTML = `
            <h4>Índices Generales</h4>
            <div class="result-grid">
                ${createResultItem('IMC', results.imc, 'kg/m²')}
                ${createResultItem('Superficie Corporal (SC)', results.sc, 'm²')}
            </div>
            <h4>Z-Scores (requiere paciente activo)</h4>
            <div class="result-grid">
                 ${createResultItem('Z-Score Peso/Edad', results.pesoZScore, 'DE')}
                 ${createResultItem('Z-Score Talla/Edad', results.tallaZScore, 'DE')}
            </div>
            <h4>Composición Corporal</h4>
            <div class="result-grid">
                ${createResultItem('Densidad Corporal (D&W)', results.densidadCorporal, 'g/cm³')}
                ${createResultItem('% Grasa Corporal (Siri)', results.grasaCorporalSiri, '%')}
                ${createResultItem('Masa Grasa', results.masaGrasa, 'kg')}
                ${createResultItem('Masa Libre de Grasa', results.masaLibreGrasa, 'kg')}
            </div>
            <h4>Gasto Energético (Harris-Benedict)</h4>
             <div class="result-grid">
                ${createResultItem('Gasto Energético Basal (GEB)', results.gebHarrisBenedict, 'kcal/día')}
                ${createResultItem('Gasto Energético Total (GET)', results.getHarrisBenedict, 'kcal/día')}
            </div>
        `;
    }


    function createResultItem(label, value, unit) {
        if (value === undefined || value === null) {
            return ''; // No mostrar el campo si no hay resultado
        }
        return `
            <div class="result-item">
                <span class="result-label">${label}:</span>
                <span class="result-value">${value} ${unit}</span>
            </div>
        `;
    }

    // Añadir estilos necesarios para los resultados
    const style = document.createElement('style');
    style.innerHTML = `
        .result-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
        .result-item { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #f0f0f0; }
        .result-item:last-child { border-bottom: none; }
        .result-label { font-weight: 600; color: var(--primary-color); }
        .result-value { font-weight: bold; font-size: 1.1rem; }
    `;
    document.head.appendChild(style);
});
