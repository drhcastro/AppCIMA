// script.js

// --- CONFIGURACIÓN DE GRÁFICAS ---
const chartConfig = {
    weightForAge: {
        dataKey: 'weightForAge',
        requires: 'age',
        yAxisLabel: 'Peso (kg)',
        xAxisLabel: 'Edad (días)',
        measurementLabel: 'Peso (kg)'
    },
    lengthForAge: {
        dataKey: 'lengthForAge',
        requires: 'age',
        yAxisLabel: 'Talla (cm)',
        xAxisLabel: 'Edad (días)',
        measurementLabel: 'Talla (cm)'
    },
    headCircumferenceForAge: {
        dataKey: 'headCircumferenceForAge',
        requires: 'age',
        yAxisLabel: 'Perímetro Cefálico (cm)',
        xAxisLabel: 'Edad (días)',
        measurementLabel: 'Perímetro Cefálico (cm)'
    },
    bmiForAge: {
        dataKey: 'bmiForAge',
        requires: 'age',
        yAxisLabel: 'IMC (kg/m²)',
        xAxisLabel: 'Edad (días)',
        measurementLabel: 'IMC'
    },
    weightForLength: {
        dataKey: 'weightForLength',
        requires: 'length',
        yAxisLabel: 'Peso (kg)',
        xAxisLabel: 'Longitud (cm)',
        measurementLabel: 'Peso (kg)',
        lhLabel: 'Longitud (cm)'
    },
    weightForHeight: {
        dataKey: 'weightForHeight',
        requires: 'height',
        yAxisLabel: 'Peso (kg)',
        xAxisLabel: 'Talla (cm)',
        measurementLabel: 'Peso (kg)',
        lhLabel: 'Talla (cm)'
    },
    armCircumferenceForAge: {
        dataKey: 'armCircumferenceForAge',
        requires: 'age',
        yAxisLabel: 'Perímetro Braquial (cm)',
        xAxisLabel: 'Edad (días)',
        measurementLabel: 'Perímetro (cm)'
    },
    tricepsSkinfoldForAge: {
        dataKey: 'tricepsSkinfoldForAge',
        requires: 'age',
        yAxisLabel: 'Pliegue Tricipital (mm)',
        xAxisLabel: 'Edad (días)',
        measurementLabel: 'Pliegue (mm)'
    },
    subscapularSkinfoldForAge: {
        dataKey: 'subscapularSkinfoldForAge',
        requires: 'age',
        yAxisLabel: 'Pliegue Subescapular (mm)',
        xAxisLabel: 'Edad (días)',
        measurementLabel: 'Pliegue (mm)'
    }
};

// --- ELEMENTOS DEL DOM ---
const chartTypeSelect = document.getElementById('chartType');
const ageInputs = document.getElementById('age-inputs');
const lhInputs = document.getElementById('length-height-inputs');
const measurementLabel = document.getElementById('measurement-label');
const lhLabel = document.getElementById('lh-label');
let distributionChart = null;

// --- LÓGICA DE LA APLICACIÓN ---
chartTypeSelect.addEventListener('change', (e) => {
    updateUI(e.target.value);
});

function updateUI(chartKey) {
    const config = chartConfig[chartKey];
    ageInputs.classList.toggle('active', config.requires === 'age');
    lhInputs.classList.toggle('active', config.requires === 'length' || config.requires === 'height');
    measurementLabel.textContent = config.measurementLabel;
    if (config.lhLabel) {
        lhLabel.textContent = config.lhLabel;
    }
}

function calculateAndPlot() {
    const chartKey = chartTypeSelect.value;
    const config = chartConfig[chartKey];
    const sex = document.getElementById('sex').value;
    const measurement = parseFloat(document.getElementById('measurement').value);

    let xValue, patientData, table;
    
    if (config.requires === 'age') {
        const dob = document.getElementById('dob').value;
        if (!dob || isNaN(measurement)) {
            alert('Por favor, complete todos los campos.');
            return;
        }
        const ageInDays = Math.floor((new Date() - new Date()) / (1000 * 60 * 60 * 24));
        xValue = ageInDays;
        patientData = `Paciente de ${Math.floor(xValue / 30.4375)} meses (${xValue} días)`;
    } else {
        const lhValue = parseFloat(document.getElementById('lhValue').value);
        if (!lhValue || isNaN(measurement)) {
            alert('Por favor, complete todos los campos.');
            return;
        }
        xValue = lhValue;
        patientData = `Paciente con ${config.lhLabel.toLowerCase()} de ${xValue} cm`;
    }

    table = whoData[config.dataKey][sex];
    const params = getLMS(xValue, table);

    if (!params) {
        alert(`El valor de entrada (${xValue}) está fuera del rango de datos para esta tabla.`);
        return;
    }

    const [_, L, M, S] = params;
    const zScore = (((measurement / M) ** L) - 1) / (L * S);

    document.getElementById('resultsCard').style.display = 'block';
    document.getElementById('results').style.display = 'block';
    document.getElementById('resultText').innerHTML = `${patientData}<br>${config.measurementLabel}: <strong>${measurement.toFixed(1)}</strong><br>Puntuación Z (DE): <span>${zScore.toFixed(2)}</span>`;
    
    plotDistribution(zScore);
}

function getLMS(xValue, table) {
    let record = table.find(row => row[0] === xValue);
    if (!record) {
        record = table.reduce((prev, curr) => (Math.abs(curr[0] - xValue) < Math.abs(prev[0] - xValue) ? curr : prev));
    }
    return record;
}

/**
 * FUNCIÓN REESCRITA PARA GRAFICAR LA CAMPANA DE GAUSS CON ÁREAS SOMBREADAS
 * @param {number} patientZScore - La puntuación Z calculada del paciente.
 */
function plotDistribution(patientZScore) {
    const ctx = document.getElementById('growthChart').getContext('2d');

    const pdf = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    const range = (start, stop, step) => Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step);

    const xValues = range(-3.5, 3.5, 0.1);
    const maxY = pdf(0);

    const datasets = [
        // Dataset para sombrear el área de -1 a +1 DE (Verde)
        {
            data: range(-1, 1, 0.1).map(x => ({ x, y: pdf(x) })),
            backgroundColor: 'rgba(92, 184, 92, 0.5)',
            borderColor: 'transparent',
            pointRadius: 0,
            fill: 'origin',
            order: 2, // Se dibuja primero
        },
        // Dataset para sombrear el área de -2 a -1 y 1 a 2 DE (Amarillo)
        {
            data: [...range(-2, -1, 0.1), NaN, ...range(1, 2, 0.1)].map(x => ({ x, y: pdf(x) })),
            backgroundColor: 'rgba(240, 173, 78, 0.5)',
            borderColor: 'transparent',
            pointRadius: 0,
            fill: 'origin',
            order: 1, 
        },
        // Dataset para sombrear el área de -3 a -2 y 2 a 3 DE (Rojo)
        {
            data: [...range(-3, -2, 0.1), NaN, ...range(2, 3, 0.1)].map(x => ({ x, y: pdf(x) })),
            backgroundColor: 'rgba(217, 83, 79, 0.5)',
            borderColor: 'transparent',
            pointRadius: 0,
            fill: 'origin',
            order: 0,
        },
        // Dataset para la línea principal de la curva
        {
            label: 'Distribución Normal',
            data: xValues.map(x => ({ x, y: pdf(x) })),
            borderColor: 'rgba(0, 0, 0, 0.8)',
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            tension: 0.4,
            order: 3,
        },
        // Dataset para la línea vertical del paciente
        {
            label: 'Puntuación Z del Paciente',
            data: [{ x: patientZScore, y: 0 }, { x: patientZScore, y: pdf(patientZScore) }],
            borderColor: 'rgba(0, 0, 255, 1)',
            borderWidth: 4,
            pointRadius: 0,
            fill: false,
            order: 4,
        }
    ];

    if (distributionChart) {
        distributionChart.destroy();
    }

    distributionChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Distribución de Puntuación Z',
                    font: { size: 18 }
                },
                legend: {
                    display: false // Ocultamos la leyenda para una gráfica más limpia
                },
                tooltip: {
                    enabled: false
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Puntuación Z (Desviaciones Estándar)'
                    },
                    min: -3.5,
                    max: 3.5,
                    ticks: {
                        stepSize: 1,
                        font: {
                            weight: 'bold'
                        }
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    display: false,
                    beginAtZero: true
                }
            }
        }
    });
}

// Inicializa la UI al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    updateUI(chartTypeSelect.value);
});
