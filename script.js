// script.js

// --- CONFIGURACIÓN DE GRÁFICAS Y COLORES ---
const chartConfig = {
    weightForAge: { dataKey: 'weightForAge', label: 'Peso p/ Edad', requires: 'age', yAxisLabel: 'Peso (kg)', xAxisLabel: 'Edad (días)', measurementLabel: 'Peso (kg)', color: 'rgba(238, 155, 0, 1)' }, // Naranja
    lengthForAge: { dataKey: 'lengthForAge', label: 'Talla p/ Edad', requires: 'age', yAxisLabel: 'Talla (cm)', xAxisLabel: 'Edad (días)', measurementLabel: 'Talla (cm)', color: 'rgba(0, 95, 115, 1)' }, // Azul Oscuro
    headCircumferenceForAge: { dataKey: 'headCircumferenceForAge', label: 'PC p/ Edad', requires: 'age', yAxisLabel: 'PC (cm)', xAxisLabel: 'Edad (días)', measurementLabel: 'PC (cm)', color: 'rgba(202, 106, 134, 1)' }, // Rosa
    bmiForAge: { dataKey: 'bmiForAge', label: 'IMC p/ Edad', requires: 'age', yAxisLabel: 'IMC (kg/m²)', xAxisLabel: 'Edad (días)', measurementLabel: 'IMC', color: 'rgba(0, 187, 204, 1)' }, // Cyan
    weightForLength: { dataKey: 'weightForLength', label: 'Peso p/ Longitud', requires: 'length', yAxisLabel: 'Peso (kg)', xAxisLabel: 'Longitud (cm)', measurementLabel: 'Peso (kg)', lhLabel: 'Longitud (cm)', color: 'rgba(174, 32, 18, 1)' }, // Rojo
    weightForHeight: { dataKey: 'weightForHeight', label: 'Peso p/ Talla', requires: 'height', yAxisLabel: 'Peso (kg)', xAxisLabel: 'Talla (cm)', measurementLabel: 'Peso (kg)', lhLabel: 'Talla (cm)', color: 'rgba(10, 147, 150, 1)' }, // Teal
    armCircumferenceForAge: { dataKey: 'armCircumferenceForAge', label: 'PB p/ Edad', requires: 'age', yAxisLabel: 'PB (cm)', xAxisLabel: 'Edad (días)', measurementLabel: 'PB (cm)', color: 'rgba(75, 192, 192, 1)' },
    tricepsSkinfoldForAge: { dataKey: 'tricepsSkinfoldForAge', label: 'Pl. Tricipital p/ Edad', requires: 'age', yAxisLabel: 'Pl. Tricipital (mm)', xAxisLabel: 'Edad (días)', measurementLabel: 'Pliegue (mm)', color: 'rgba(153, 102, 255, 1)' },
    subscapularSkinfoldForAge: { dataKey: 'subscapularSkinfoldForAge', label: 'Pl. Subescapular p/ Edad', requires: 'age', yAxisLabel: 'Pl. Subescapular (mm)', xAxisLabel: 'Edad (días)', measurementLabel: 'Pliegue (mm)', color: 'rgba(255, 159, 64, 1)' }
};

// --- ESTADO DE LA APLICACIÓN ---
let patientHistory = [];
let distributionChart = null;
let baseDatasets = []; // Almacenará la campana de gauss base

// --- ELEMENTOS DEL DOM ---
const chartTypeSelect = document.getElementById('chartType');
const sexSelect = document.getElementById('sex');
const addPointBtn = document.getElementById('add-point-btn');
const printBtn = document.getElementById('print-btn');
const saveImgBtn = document.getElementById('save-img-btn');
const clearBtn = document.getElementById('clear-btn');
const measureDateInput = document.getElementById('measure-date');

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    measureDateInput.valueAsDate = new Date();
    initializeChart();
    
    chartTypeSelect.addEventListener('change', () => updateUI(chartTypeSelect.value));
    addPointBtn.addEventListener('click', addMeasurement);
    clearBtn.addEventListener('click', clearAll);
    printBtn.addEventListener('click', () => window.print());
    saveImgBtn.addEventListener('click', saveChartAsImage);
});

// --- FUNCIONES PRINCIPALES ---
function updateUI(chartKey) {
    const config = chartConfig[chartKey];
    document.getElementById('age-inputs').classList.toggle('active', config.requires === 'age');
    document.getElementById('length-height-inputs').classList.toggle('active', config.requires === 'length' || config.requires === 'height');
    document.getElementById('measurement-label').textContent = config.measurementLabel;
    if (config.lhLabel) {
        document.getElementById('lh-label').textContent = config.lhLabel;
    }
}

function addMeasurement() {
    const chartKey = chartTypeSelect.value;
    const config = chartConfig[chartKey];
    const sex = sexSelect.value;
    const measurement = parseFloat(document.getElementById('measurement').value);
    const measureDate = measureDateInput.value;

    if (!measureDate || isNaN(measurement)) {
        alert('Por favor, complete la medición y la fecha.');
        return;
    }

    let xValue, ageInDays = null;
    if (config.requires === 'age') {
        const dob = document.getElementById('dob').value;
        if (!dob) { alert('Por favor, ingrese la fecha de nacimiento.'); return; }
        ageInDays = Math.floor((new Date(measureDate) - new Date(dob)) / (1000 * 60 * 60 * 24));
        xValue = ageInDays;
    } else {
        const lhValue = parseFloat(document.getElementById('lhValue').value);
        if (!lhValue) { alert(`Por favor, ingrese la ${config.lhLabel.toLowerCase()}.`); return; }
        xValue = lhValue;
    }

    const table = whoData[config.dataKey][sex];
    const params = getLMS(xValue, table);
    if (!params) { alert(`El valor de entrada (${xValue}) está fuera del rango para esta tabla.`); return; }

    const [_, L, M, S] = params;
    const zScore = (((measurement / M) ** L) - 1) / (L * S);

    patientHistory.push({
        chartKey: chartKey,
        zScore: zScore,
        date: measureDate,
        ageInDays: ageInDays,
        measurement: measurement,
        measurementUnit: config.yAxisLabel.match(/\((.*)\)/)[1] // Extrae la unidad de la etiqueta
    });

    updateChart();
    updateSummaryBox(L, M, S);
}

function clearAll() {
    patientHistory = [];
    updateChart();
    document.getElementById('summary-card').style.display = 'none';
}

function updateSummaryBox(L, M, S) {
    document.getElementById('z-neg-2').textContent = calculateValueFromZ(-2, L, M, S).toFixed(2);
    document.getElementById('z-0').textContent = M.toFixed(2);
    document.getElementById('z-pos-2').textContent = calculateValueFromZ(2, L, M, S).toFixed(2);
    document.getElementById('summary-card').style.display = 'block';
}

function saveChartAsImage() {
    // Implementación similar a la anterior
}

// --- FUNCIONES DE GRÁFICA ---

function initializeChart() {
    const pdf = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    const range = (start, stop, step) => Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step);

    baseDatasets = [
        { data: range(-1, 1, 0.1).map(x => ({ x, y: pdf(x) })), backgroundColor: 'rgba(92, 184, 92, 0.5)', borderColor: 'transparent', pointRadius: 0, fill: 'origin', order: 2 },
        { data: [...range(-2, -1, 0.1), NaN, ...range(1, 2, 0.1)].map(x => ({ x, y: pdf(x) })), backgroundColor: 'rgba(240, 173, 78, 0.5)', borderColor: 'transparent', pointRadius: 0, fill: 'origin', order: 1 },
        { data: [...range(-3, -2, 0.1), NaN, ...range(2, 3, 0.1)].map(x => ({ x, y: pdf(x) })), backgroundColor: 'rgba(217, 83, 79, 0.5)', borderColor: 'transparent', pointRadius: 0, fill: 'origin', order: 0 },
        { label: 'Distribución Normal', data: range(-3.5, 3.5, 0.1).map(x => ({ x, y: pdf(x) })), borderColor: 'rgba(0, 0, 0, 0.8)', borderWidth: 2, pointRadius: 0, fill: false, tension: 0.4, order: 3 },
    ];

    const ctx = document.getElementById('growthChart').getContext('2d');
    distributionChart = new Chart(ctx, {
        type: 'line',
        data: { datasets: baseDatasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Distribución de Puntuación Z', font: { size: 18, family: 'Poppins' } },
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    mode: 'point',
                    intersect: true,
                    callbacks: {
                        title: () => '', // Sin título
                        label: (context) => {
                            const details = context.raw.details;
                            if (!details) return '';
                            const config = chartConfig[details.chartKey];
                            let ageString = details.ageInDays !== null ? `Edad: ${Math.floor(details.ageInDays / 30.4375)}m (${details.ageInDays}d)` : '';
                            
                            return [
                                `${config.label}`,
                                `Fecha: ${details.date}`,
                                ageString,
                                `Valor: ${details.measurement} ${details.measurementUnit}`,
                                `Puntuación Z: ${details.zScore.toFixed(2)}`
                            ].filter(Boolean); // Filtra líneas vacías
                        }
                    }
                }
            },
            scales: {
                x: { type: 'linear', title: { display: true, text: 'Puntuación Z (Desviaciones Estándar)' }, min: -3.5, max: 3.5, ticks: { stepSize: 1, font: { weight: 'bold' } }, grid: { display: false } },
                y: { display: false, beginAtZero: true }
            },
            afterDraw: chart => {
                const ctx = chart.ctx;
                ctx.save();
                ctx.font = '12px Poppins';
                ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.textAlign = 'right';
                ctx.fillText('CIMA Nahui de Occidente', chart.chartArea.right - 10, chart.chartArea.bottom - 5);
                ctx.restore();
            }
        }
    });
}

function updateChart() {
    if (!distributionChart) return;

    // Agrupar el historial por tipo de métrica
    const groupedHistory = patientHistory.reduce((acc, p) => {
        if (!acc[p.chartKey]) {
            acc[p.chartKey] = [];
        }
        acc[p.chartKey].push(p);
        return acc;
    }, {});

    const patientDatasets = Object.keys(groupedHistory).map(key => {
        const config = chartConfig[key];
        const points = groupedHistory[key];
        return {
            label: config.label,
            data: points.map(p => ({ x: p.zScore, y: 0.01, details: p })), // 'details' contiene toda la info para el tooltip
            backgroundColor: config.color,
            borderColor: '#FFFFFF',
            borderWidth: 2,
            pointRadius: 8,
            pointHoverRadius: 11,
            type: 'scatter',
            order: 4
        };
    });

    // Reemplazar todos los datasets (base + paciente)
    distributionChart.data.datasets = [...baseDatasets, ...patientDatasets];
    distributionChart.update();
}

// --- FUNCIONES AUXILIARES ---
function getLMS(xValue, table) {
    let record = table.find(row => row[0] === xValue);
    if (!record) {
        record = table.reduce((prev, curr) => (Math.abs(curr[0] - xValue) < Math.abs(prev[0] - xValue) ? curr : prev));
    }
    return record;
}

function calculateValueFromZ(Z, L, M, S) {
    if (Math.abs(L) < 1e-5) return M * Math.exp(S * Z);
    return M * (1 + L * S * Z) ** (1/L);
}

