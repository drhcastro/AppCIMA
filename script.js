// script.js
// --- CONFIGURACIÓN DE GRÁFICAS (sin cambios) ---
const chartConfig = {
    weightForAge: { dataKey: 'weightForAge', requires: 'age', yAxisLabel: 'Peso (kg)', xAxisLabel: 'Edad (días)', measurementLabel: 'Peso (kg)' },
    lengthForAge: { dataKey: 'lengthForAge', requires: 'age', yAxisLabel: 'Talla (cm)', xAxisLabel: 'Edad (días)', measurementLabel: 'Talla (cm)' },
    headCircumferenceForAge: { dataKey: 'headCircumferenceForAge', requires: 'age', yAxisLabel: 'Perímetro Cefálico (cm)', xAxisLabel: 'Edad (días)', measurementLabel: 'Perímetro Cefálico (cm)' },
    bmiForAge: { dataKey: 'bmiForAge', requires: 'age', yAxisLabel: 'IMC (kg/m²)', xAxisLabel: 'Edad (días)', measurementLabel: 'IMC' },
    weightForLength: { dataKey: 'weightForLength', requires: 'length', yAxisLabel: 'Peso (kg)', xAxisLabel: 'Longitud (cm)', measurementLabel: 'Peso (kg)', lhLabel: 'Longitud (cm)' },
    weightForHeight: { dataKey: 'weightForHeight', requires: 'height', yAxisLabel: 'Peso (kg)', xAxisLabel: 'Talla (cm)', measurementLabel: 'Peso (kg)', lhLabel: 'Talla (cm)' },
    armCircumferenceForAge: { dataKey: 'armCircumferenceForAge', requires: 'age', yAxisLabel: 'Perímetro Braquial (cm)', xAxisLabel: 'Edad (días)', measurementLabel: 'Perímetro (cm)' },
    tricepsSkinfoldForAge: { dataKey: 'tricepsSkinfoldForAge', requires: 'age', yAxisLabel: 'Pliegue Tricipital (mm)', xAxisLabel: 'Edad (días)', measurementLabel: 'Pliegue (mm)' },
    subscapularSkinfoldForAge: { dataKey: 'subscapularSkinfoldForAge', requires: 'age', yAxisLabel: 'Pliegue Subescapular (mm)', xAxisLabel: 'Edad (días)', measurementLabel: 'Pliegue (mm)' }
};

// --- ESTADO DE LA APLICACIÓN ---
let patientHistory = [];
let distributionChart = null;

// --- ELEMENTOS DEL DOM ---
const chartTypeSelect = document.getElementById('chartType');
const sexSelect = document.getElementById('sex');
const ageInputs = document.getElementById('age-inputs');
const lhInputs = document.getElementById('length-height-inputs');
const measurementLabel = document.getElementById('measurement-label');
const lhLabel = document.getElementById('lh-label');
const addPointBtn = document.getElementById('add-point-btn');
const printBtn = document.getElementById('print-btn');
const saveImgBtn = document.getElementById('save-img-btn');
const measureDateInput = document.getElementById('measure-date');

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    measureDateInput.valueAsDate = new Date(); // Poner fecha actual por defecto
    updateUI(chartTypeSelect.value);
    initializeChart();

    chartTypeSelect.addEventListener('change', (e) => {
        updateUI(e.target.value);
        clearChart();
    });
    sexSelect.addEventListener('change', clearChart);
    addPointBtn.addEventListener('click', addMeasurement);
    printBtn.addEventListener('click', () => window.print());
    saveImgBtn.addEventListener('click', saveChartAsImage);
});

// --- FUNCIONES PRINCIPALES ---

function updateUI(chartKey) {
    const config = chartConfig[chartKey];
    ageInputs.classList.toggle('active', config.requires === 'age');
    lhInputs.classList.toggle('active', config.requires === 'length' || config.requires === 'height');
    measurementLabel.textContent = config.measurementLabel;
    if (config.lhLabel) {
        lhLabel.textContent = config.lhLabel;
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

    let xValue;
    if (config.requires === 'age') {
        const dob = document.getElementById('dob').value;
        if (!dob) {
            alert('Por favor, ingrese la fecha de nacimiento.');
            return;
        }
        xValue = Math.floor((new Date(measureDate) - new Date(dob)) / (1000 * 60 * 60 * 24));
    } else {
        const lhValue = parseFloat(document.getElementById('lhValue').value);
        if (!lhValue) {
            alert(`Por favor, ingrese la ${config.lhLabel.toLowerCase()}.`);
            return;
        }
        xValue = lhValue;
    }

    const table = whoData[config.dataKey][sex];
    const params = getLMS(xValue, table);

    if (!params) {
        alert(`El valor de entrada (${xValue}) está fuera del rango de datos para esta tabla.`);
        return;
    }

    const [_, L, M, S] = params;
    const zScore = (((measurement / M) ** L) - 1) / (L * S);

    patientHistory.push({ zScore, date: measureDate });
    patientHistory.sort((a, b) => new Date(a.date) - new Date(b.date)); // Ordenar por fecha

    updateChart();
    updateSummaryBox(L, M, S);
}

function clearChart() {
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
    // Crea un canvas temporal más grande para combinar todo
    const chartCanvas = document.getElementById('growthChart');
    const summaryCard = document.getElementById('summary-card');
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    const canvasWidth = chartCanvas.width;
    const canvasHeight = chartCanvas.height + (summaryCard.style.display === 'none' ? 0 : summaryCard.offsetHeight) + 20; // Espacio extra
    
    tempCanvas.width = canvasWidth;
    tempCanvas.height = canvasHeight;

    // Dibuja un fondo blanco
    tempCtx.fillStyle = '#FFFFFF';
    tempCtx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Dibuja la gráfica en el canvas temporal
    tempCtx.drawImage(chartCanvas, 0, 0);

    // Dibuja el recuadro de resumen si está visible
    if(summaryCard.style.display !== 'none') {
        const zNeg2 = document.getElementById('z-neg-2').textContent;
        const z0 = document.getElementById('z-0').textContent;
        const zPos2 = document.getElementById('z-pos-2').textContent;
        
        tempCtx.fillStyle = '#333';
        tempCtx.font = 'bold 16px Poppins';
        tempCtx.textAlign = 'center';
        
        const summaryY = chartCanvas.height + 40;
        const colWidth = canvasWidth / 3;

        tempCtx.fillText('-2 DE', colWidth / 2, summaryY);
        tempCtx.fillText('Ideal (0 DE)', colWidth * 1.5, summaryY);
        tempCtx.fillText('+2 DE', colWidth * 2.5, summaryY);
        
        tempCtx.font = 'bold 24px Poppins';
        tempCtx.fillText(zNeg2, colWidth / 2, summaryY + 30);
        tempCtx.fillText(z0, colWidth * 1.5, summaryY + 30);
        tempCtx.fillText(zPos2, colWidth * 2.5, summaryY + 30);
    }
    
    // Descarga la imagen
    const link = document.createElement('a');
    link.download = 'grafica_crecimiento_CIMA_Nahui.png';
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
}

// --- FUNCIONES DE GRÁFICA ---

function initializeChart() {
    const ctx = document.getElementById('growthChart').getContext('2d');
    const pdf = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    const range = (start, stop, step) => Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step);

    const datasets = [
        { data: range(-1, 1, 0.1).map(x => ({ x, y: pdf(x) })), backgroundColor: 'rgba(92, 184, 92, 0.5)', borderColor: 'transparent', pointRadius: 0, fill: 'origin', order: 2 },
        { data: [...range(-2, -1, 0.1), NaN, ...range(1, 2, 0.1)].map(x => ({ x, y: pdf(x) })), backgroundColor: 'rgba(240, 173, 78, 0.5)', borderColor: 'transparent', pointRadius: 0, fill: 'origin', order: 1 },
        { data: [...range(-3, -2, 0.1), NaN, ...range(2, 3, 0.1)].map(x => ({ x, y: pdf(x) })), backgroundColor: 'rgba(217, 83, 79, 0.5)', borderColor: 'transparent', pointRadius: 0, fill: 'origin', order: 0 },
        { label: 'Distribución Normal', data: range(-3.5, 3.5, 0.1).map(x => ({ x, y: pdf(x) })), borderColor: 'rgba(0, 0, 0, 0.8)', borderWidth: 2, pointRadius: 0, fill: false, tension: 0.4, order: 3 },
        // Dataset para los puntos del paciente (inicialmente vacío)
        {
            label: 'Mediciones del Paciente',
            data: [],
            backgroundColor: '#005f73',
            borderColor: '#FFFFFF',
            borderWidth: 2,
            pointRadius: 8,
            pointHoverRadius: 10,
            type: 'scatter',
            order: 4
        }
    ];

    distributionChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Distribución de Puntuación Z', font: { size: 18, family: 'Poppins' } },
                legend: { display: false },
                tooltip: {
                     callbacks: {
                        label: function(context) {
                            const point = patientHistory[context.dataIndex];
                            if (point) {
                                return `Fecha: ${point.date} - Z: ${point.zScore.toFixed(2)}`;
                            }
                            return '';
                        }
                    }
                }
            },
            scales: {
                x: { type: 'linear', title: { display: true, text: 'Puntuación Z (Desviaciones Estándar)' }, min: -3.5, max: 3.5, ticks: { stepSize: 1, font: { weight: 'bold' } }, grid: { display: false } },
                y: { display: false, beginAtZero: true }
            },
            // Plugin para el Copyright
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
    // El dataset en la posición 4 es el de los puntos del paciente
    distributionChart.data.datasets[4].data = patientHistory.map(p => ({ x: p.zScore, y: 0.01 })); // Pequeño offset en Y para que no quede en el borde
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
