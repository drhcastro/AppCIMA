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

// Event listener para cambiar la UI
chartTypeSelect.addEventListener('change', (e) => {
    updateUI(e.target.value);
});

// Función para actualizar la interfaz
function updateUI(chartKey) {
    const config = chartConfig[chartKey];
    ageInputs.classList.toggle('active', config.requires === 'age');
    lhInputs.classList.toggle('active', config.requires === 'length' || config.requires === 'height');
    measurementLabel.textContent = config.measurementLabel;
    if (config.lhLabel) {
        lhLabel.textContent = config.lhLabel;
    }
}

// Función principal para calcular y graficar
function calculateAndPlot() {
    const chartKey = chartTypeSelect.value;
    const config = chartConfig[chartKey];
    const sex = document.getElementById('sex').value;
    const measurement = parseFloat(document.getElementById('measurement').value);

    let xValue, patientData, table;
    
    // 1. Obtener datos de entrada
    if (config.requires === 'age') {
        const dob = document.getElementById('dob').value;
        if (!dob || isNaN(measurement)) {
            alert('Por favor, complete todos los campos.');
            return;
        }
        const ageInDays = Math.floor((new Date() - new Date(dob)) / (1000 * 60 * 60 * 24));
        xValue = ageInDays;
        patientData = `Paciente de ${Math.floor(xValue / 30.4375)} meses (${xValue} días)`;
    } else { // 'length' or 'height'
        const lhValue = parseFloat(document.getElementById('lhValue').value);
        if (!lhValue || isNaN(measurement)) {
            alert('Por favor, complete todos los campos.');
            return;
        }
        xValue = lhValue;
        patientData = `Paciente con ${config.lhLabel.toLowerCase()} de ${xValue} cm`;
    }

    // 2. Obtener la tabla de datos y los parámetros LMS
    table = whoData[config.dataKey][sex];
    const params = getLMS(xValue, table);

    if (!params) {
        alert(`El valor de entrada (${xValue}) está fuera del rango de datos para esta tabla.`);
        return;
    }

    // 3. Calcular Z-Score
    const [_, L, M, S] = params;
    const zScore = (((measurement / M) ** L) - 1) / (L * S);

    // 4. Mostrar resultados
    document.getElementById('resultsCard').style.display = 'block';
    document.getElementById('results').style.display = 'block';
    document.getElementById('resultText').innerHTML = `${patientData}<br>${config.measurementLabel}: <strong>${measurement.toFixed(1)}</strong><br>Puntuación Z (DE): <span>${zScore.toFixed(2)}</span>`;
    
    // 5. Dibujar la NUEVA gráfica de distribución
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
 * NUEVA FUNCIÓN PARA GRAFICAR LA CAMPANA DE GAUSS
 * @param {number} patientZScore - La puntuación Z calculada del paciente.
 */
function plotDistribution(patientZScore) {
    const ctx = document.getElementById('growthChart').getContext('2d');

    // Función de densidad de probabilidad para una distribución normal estándar
    const pdf = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

    // Generar datos para la curva de campana
    const labels = [];
    const curveData = [];
    for (let i = -4; i <= 4; i += 0.1) {
        const x = parseFloat(i.toFixed(2));
        labels.push(x);
        curveData.push({ x: x, y: pdf(x) });
    }
    const maxY = pdf(0); // El pico de la curva

    // Crear una línea vertical para la puntuación Z del paciente
    const patientLine = [
        { x: patientZScore, y: 0 },
        { x: patientZScore, y: maxY }
    ];

    if (distributionChart) {
        distributionChart.destroy();
    }

    distributionChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Distribución Normal Estándar',
                data: curveData,
                borderColor: 'rgba(0, 123, 255, 0.8)',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                fill: true,
                tension: 0.1
            }, {
                label: 'Puntuación Z del Paciente',
                data: patientLine,
                borderColor: 'rgba(217, 83, 79, 1)',
                borderWidth: 3,
                pointRadius: 0,
                fill: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Distribución de Puntuación Z (Campana de Gauss)',
                    font: { size: 18 }
                },
                tooltip: {
                    enabled: false // Deshabilitar tooltip para esta gráfica
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Puntuación Z (Desviaciones Estándar)'
                    },
                    min: -4,
                    max: 4,
                    ticks: {
                        stepSize: 1
                    }
                },
                y: {
                    display: false, // Ocultamos el eje Y ya que no es relevante para la interpretación
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
