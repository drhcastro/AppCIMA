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
    const perBraquialInput = document.getElementById('calc-per-braquial');

    // --- INICIALIZACIÓN ---
    const activePatient = JSON.parse(localStorage.getItem('activePatient'));

    if (activePatient) {
        patientBanner.innerHTML = `Calculando para: <strong>${activePatient.nombre} ${activePatient.apellidoPaterno}</strong>`;
        backToVisorBtn.href = `visor.html?codigo=${activePatient.codigoUnico}`;
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
        const pc = parseFloat(pcInput.value) || null;
        const plTricipital = parseFloat(tricipitalInput.value) || null;
        const plSubescapular = parseFloat(subescapularInput.value) || null;
        const perBraquial = parseFloat(perBraquialInput.value) || null;

        // 2. Realizar los cálculos
        let results = {};

        // IMC
        if (peso && talla) {
            results.imc = (peso / Math.pow(talla / 100, 2)).toFixed(2);
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

        // Áreas Braquiales
        if (perBraquial && plTricipital) {
            const plTricipitalCm = plTricipital / 10; // Convertir a cm
            results.areaGrasaBraquial = ((perBraquial * plTricipitalCm) / 2 - (Math.PI * Math.pow(plTricipitalCm, 2)) / 4).toFixed(2);
            results.areaMuscularBraquial = (Math.pow(perBraquial - (Math.PI * plTricipitalCm), 2) / (4 * Math.PI)).toFixed(2);
        }
        
        // 3. Generar el HTML para mostrar los resultados
        renderResults(results);
    }

    function renderResults(results) {
        resultsContainer.innerHTML = `
            <div class="result-grid">
                ${createResultItem('IMC', results.imc, 'kg/m²')}
                ${createResultItem('Z-Score Peso/Edad', results.pesoZScore, 'DE')}
                ${createResultItem('Z-Score Talla/Edad', results.tallaZScore, 'DE')}
                ${createResultItem('Z-Score PC/Edad', results.pcZScore, 'DE')}
                ${createResultItem('Z-Score IMC/Edad', results.imcZScore, 'DE')}
                ${createResultItem('% Grasa Corporal (Slaughter)', results.grasaCorporal, '%')}
                ${createResultItem('Área Grasa Braquial', results.areaGrasaBraquial, 'cm²')}
                ${createResultItem('Área Muscular Braquial', results.areaMuscularBraquial, 'cm²')}
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
