// script.js

// --- CONFIGURACIÓN DE GRÁFICAS Y COLORES ---
const chartConfig = {
    weightForAge: { dataKey: 'weightForAge', label: 'Peso p/ Edad', requires: 'age', yAxisLabel: 'Peso (kg)', measurementLabel: 'Valor (kg)', color: 'rgba(238, 155, 0, 1)' }, // Naranja
    lengthForAge: { dataKey: 'lengthForAge', label: 'Talla p/ Edad', requires: 'age', yAxisLabel: 'Talla (cm)', measurementLabel: 'Valor (cm)', color: 'rgba(0, 95, 115, 1)' }, // Azul Oscuro
    headCircumferenceForAge: { dataKey: 'headCircumferenceForAge', label: 'PC p/ Edad', requires: 'age', yAxisLabel: 'PC (cm)', measurementLabel: 'Valor (cm)', color: 'rgba(202, 106, 134, 1)' }, // Rosa
    bmiForAge: { dataKey: 'bmiForAge', label: 'IMC p/ Edad', requires: 'age', yAxisLabel: 'IMC (kg/m²)', measurementLabel: 'Valor IMC', color: 'rgba(0, 187, 204, 1)' }, // Cyan
    weightForLength: { dataKey: 'weightForLength', label: 'Peso p/ Longitud', requires: 'length', yAxisLabel: 'Peso (kg)', measurementLabel: 'Valor (kg)', lhLabel: 'Longitud (cm)', color: 'rgba(174, 32, 18, 1)' }, // Rojo
    weightForHeight: { dataKey: 'weightForHeight', label: 'Peso p/ Talla', requires: 'height', yAxisLabel: 'Peso (kg)', measurementLabel: 'Valor (kg)', lhLabel: 'Talla (cm)', color: 'rgba(10, 147, 150, 1)' }, // Teal
    armCircumferenceForAge: { dataKey: 'armCircumferenceForAge', label: 'PB p/ Edad', requires: 'age', yAxisLabel: 'PB (cm)', measurementLabel: 'Valor (cm)', color: 'rgba(75, 192, 192, 1)' },
    tricepsSkinfoldForAge: { dataKey: 'tricepsSkinfoldForAge', label: 'Pl. Tricipital p/ Edad', requires: 'age', yAxisLabel: 'Pl. Tricipital (mm)', measurementLabel: 'Valor (mm)', color: 'rgba(153, 102, 255, 1)' },
    subscapularSkinfoldForAge: { dataKey: 'subscapularSkinfoldForAge', label: 'Pl. Subescapular p/ Edad', requires: 'age', yAxisLabel: 'Pl. Subescapular (mm)', measurementLabel: 'Valor (mm)', color: 'rgba(255, 159, 64, 1)' }
};

// --- ESTADO DE LA APLICACIÓN ---
let patientHistory = [];
let distributionChart = null;
let baseDatasets = [];

// --- ELEMENTOS DEL DOM ---
const chartTypeSelect = document.getElementById('chartType');
const sexSelect = document.getElementById('sex');
const addPointBtn = document.getElementById('add-point-btn');
const printBtn = document.getElementById('print-btn');
const saveImgBtn = document.getElementById('save-img-btn');
const clearBtn = document.getElementById('clear-btn');
const measureDateInput = document.getElementById('measure-date');
const summaryContainer = document.getElementById('history-summary-container');
const summaryCard = document.getElementById('summary-card');
const dobInput = document.getElementById('dob');

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    measureDateInput.valueAsDate = new Date();
    
    const activePatientString = localStorage.getItem('activePatient');
    
    if (activePatientString) {
        const activePatient = JSON.parse(activePatientString);
        
        // --- CORRECCIÓN AQUÍ ---
        // Si existe la fecha de nacimiento, corta la cadena para obtener solo AAAA-MM-DD
        if (activePatient.fechaNacimiento) {
            dobInput.value = activePatient.fechaNacimiento.substring(0, 10);
        }
        
        if (activePatient.sexo) {
            const genderValue = activePatient.sexo.toLowerCase() === 'niño' ? 'boys' : 'girls';
            sexSelect.value = genderValue;
        }
        
        dobInput.disabled = true;
        sexSelect.disabled = true;
        
        const banner = document.getElementById('active-patient-banner');
        banner.innerHTML = `<p>Paciente Activo: <span class="patient-name">${activePatient.nombre} ${activePatient.apellidoPaterno}</span> | Código: ${activePatient.codigoUnico}</p>`;
    } else {
        dobInput.value = '';
        sexSelect.value = 'boys';
        dobInput.disabled = false;
        sexSelect.disabled = false;
    }

    initializeChart();
    updateUI(chartTypeSelect.value);

    chartTypeSelect.addEventListener('change', () => updateUI(chartTypeSelect.value));
    addPointBtn.addEventListener('click', addMeasurement);
    clearBtn.addEventListener('click', clearAll);
    printBtn.addEventListener('click', () => window.print());
    saveImgBtn.addEventListener('click', saveChartAsImage);
});


// --- FUNCIONES PRINCIPALES ---

function updateUI(chartKey) {
    const config = chartConfig[chartKey];
    const isAgeBased = config.requires === 'age';
    document.getElementById('length-height-inputs').style.display = isAgeBased ? 'none' : 'block';
    document.getElementById('measurement-label').textContent = config.measurementLabel;
}

function addMeasurement() {
    const chartKey = chartTypeSelect.value;
    const config = chartConfig[chartKey];
    const sex = sexSelect.value;
    const measurement = parseFloat(document.getElementById('measurement').value);
    const measureDate = measureDateInput.value;

    if (!measureDate || isNaN(measurement)) {
        alert('Por favor, complete el valor y la fecha de la medición.');
        return;
    }

    let xValue, ageInDays = null;
    if (config.requires === 'age') {
        const dob = dobInput.value;
        if (!dob) { alert('Por favor, ingrese la fecha de nacimiento.'); return; }
        ageInDays = Math.floor((new Date(measureDate) - new Date(dob)) / (1000 * 60 * 60 * 24));
        if (ageInDays < 0) { alert('La fecha de medición no puede ser anterior a la de nacimiento.'); return; }
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
        measurementUnit: config.yAxisLabel.match(/\((.*)\)/)[1]
    });

    updateChart();
    updateHistorySummary();
}

function clearAll() {
    patientHistory = [];
    updateChart();
    summaryContainer.innerHTML = '';
    summaryCard.style.display = 'none';

    dobInput.value = '';
    sexSelect.value = 'boys';
    dobInput.disabled = false;
    sexSelect.disabled = false;
    document.getElementById('active-patient-banner').innerHTML = '<p>Modo: Usar Sin Registro</p>';
    localStorage.removeItem('activePatient');
}

function updateHistorySummary() {
    if (patientHistory.length === 0) {
        summaryCard.style.display = 'none';
        return;
    }

    summaryContainer.innerHTML = '';

    const groupedByDate = patientHistory.reduce((acc, p) => {
        if (!acc[p.date]) acc[p.date] = [];
        acc[p.date].push(p);
        return acc;
    }, {});
    
    const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));

    for (const date of sortedDates) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'summary-group';
        
        const dateHeader = document.createElement('h4');
        dateHeader.className = 'summary-group-header';
        dateHeader.textContent = new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
        groupDiv.appendChild(dateHeader);

        for (const item of groupedByDate[date]) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'summary-item';
            const config = chartConfig[item.chartKey];
            const ageString = item.ageInDays !== null ? `Edad: ${Math.floor(item.ageInDays / 30.4375)}m (${item.ageInDays}d)` : '';

            itemDiv.innerHTML = `
                <span class="summary-color-tag" style="background-color: ${config.color};"></span>
                <div class="summary-details">
                    <div class="item-label">${config.label}: ${item.measurement} ${item.measurementUnit}</div>
                    <div class="item-age">${ageString}</div>
                </div>
                <div class="summary-zscore">Z: ${item.zScore.toFixed(2)}</div>
            `;
            groupDiv.appendChild(itemDiv);
        }
        summaryContainer.appendChild(groupDiv);
    }
    summaryCard.style.display = 'block';
}

function saveChartAsImage() {
    const chartColumn = document.querySelector('.chart-column');
    if (!chartColumn) return;
    
    const options = { scale: 2, useCORS: true, logging: false };

    html2canvas(chartColumn, options).then(canvas => {
        const link = document.createElement('a');
        link.download = 'grafica-crecimiento-cima-nahui.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
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
        data: { datasets: [...baseDatasets] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                title: { display: true, text: 'Distribución de Puntuación Z', font: { size: 18, family: 'Poppins' } },
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    mode: 'point',
                    intersect: true,
                    callbacks: {
                        title: () => '',
                        label: (context) => {
                            const details = context.raw.details;
                            if (!details) return '';
                            const config = chartConfig[details.chartKey];
                            let ageString = details.ageInDays !== null ? `Edad: ${Math.floor(details.ageInDays / 30.4375)}m (${details.ageInDays}d)` : '';
                            
                            return [`${config.label}`, `Fecha: ${details.date}`, ageString, `Valor: ${details.measurement} ${details.measurementUnit}`, `Puntuación Z: ${details.zScore.toFixed(2)}`].filter(Boolean);
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
    const groupedHistory = patientHistory.reduce((acc, p) => {
        if (!acc[p.chartKey]) acc[p.chartKey] = [];
        acc[p.chartKey].push(p);
        return acc;
    }, {});
    const patientDatasets = Object.keys(groupedHistory).map(key => {
        const config = chartConfig[key];
        const points = groupedHistory[key];
        return {
            label: config.label,
            data: points.map(p => ({ x: p.zScore, y: 0.01, details: p })),
            backgroundColor: config.color,
            borderColor: '#FFFFFF',
            borderWidth: 2,
            pointRadius: 8,
            pointHoverRadius: 11,
            type: 'scatter',
            order: 4
        };
    });
    distributionChart.data.datasets = [...baseDatasets, ...patientDatasets];
    distributionChart.update('none');
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
