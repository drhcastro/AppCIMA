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
let growthChart = null;

// --- LÓGICA DE LA APLICACIÓN ---

// Event listener para cambiar la UI cuando se selecciona una nueva gráfica
chartTypeSelect.addEventListener('change', (e) => {
    updateUI(e.target.value);
});

// Función para actualizar la interfaz de usuario
function updateUI(chartKey) {
    const config = chartConfig[chartKey];
    
    // Muestra/oculta los grupos de inputs
    ageInputs.classList.toggle('active', config.requires === 'age');
    lhInputs.classList.toggle('active', config.requires === 'length' || config.requires === 'height');

    // Actualiza las etiquetas
    measurementLabel.textContent = config.measurementLabel;
    if (config.lhLabel) {
        lhLabel.textContent = config.lhLabel;
    }
}

// Función principal para calcular y dibujar la gráfica
function calculateAndPlot() {
    const chartKey = chartTypeSelect.value;
    const config = chartConfig[chartKey];
    const sex = document.getElementById('sex').value;
    const measurement = parseFloat(document.getElementById('measurement').value);

    let xValue, patientData, table;
    
    // 1. Obtener datos de entrada según el tipo de gráfica
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

    // 2. Obtener la tabla de datos correcta
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
    const resultText = document.getElementById('resultText');
    resultText.innerHTML = `${patientData}<br>${config.measurementLabel}: <strong>${measurement.toFixed(1)}</strong><br>Z-Score (DE): <span>${zScore.toFixed(2)}</span>`;
    
    // 5. Dibujar la gráfica
    plotChart(xValue, measurement, table, config);
}


function getLMS(xValue, table) {
    // Para datos basados en talla, se busca el más cercano ya que pueden ser decimales.
    // Para edad, se busca el día exacto.
    let record = table.find(row => row[0] === xValue);
    if (!record) {
         record = table.reduce((prev, curr) => 
            (Math.abs(curr[0] - xValue) < Math.abs(prev[0] - xValue) ? curr : prev)
        );
    }
    return record;
}

function calculateYFromZ(Z, L, M, S) {
    if (Math.abs(L) < 1e-5) return M * Math.exp(S * Z);
    return M * (1 + L * S * Z) ** (1/L);
}

function plotChart(patientX, patientY, table, config) {
    const ctx = document.getElementById('growthChart').getContext('2d');
    
    const datasets = [
        { label: '+3 SD', data: [], borderColor: '#d9534f', borderWidth: 2, pointRadius: 0 },
        { label: '+2 SD', data: [], borderColor: '#f0ad4e', borderWidth: 2, pointRadius: 0 },
        { label: 'Median (0 SD)', data: [], borderColor: '#5cb85c', borderWidth: 3, pointRadius: 0 },
        { label: '-2 SD', data: [], borderColor: '#f0ad4e', borderWidth: 2, pointRadius: 0 },
        { label: '-3 SD', data: [], borderColor: '#d9534f', borderWidth: 2, pointRadius: 0 }
    ];

    table.forEach(point => {
        const [x, L, M, S] = point;
        datasets[0].data.push({ x, y: calculateYFromZ(3, L, M, S) });
        datasets[1].data.push({ x, y: calculateYFromZ(2, L, M, S) });
        datasets[2].data.push({ x, y: calculateYFromZ(0, L, M, S) });
        datasets[3].data.push({ x, y: calculateYFromZ(-2, L, M, S) });
        datasets[4].data.push({ x, y: calculateYFromZ(-3, L, M, S) });
    });

    const patientData = {
        label: 'Paciente',
        data: [{ x: patientX, y: patientY }],
        backgroundColor: 'blue',
        borderColor: 'white',
        pointRadius: 8,
        pointHoverRadius: 10,
        type: 'scatter'
    };

    if (growthChart) {
        growthChart.destroy();
    }

    growthChart = new Chart(ctx, {
        type: 'line',
        data: { datasets: [...datasets, patientData] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: chartTypeSelect.options[chartTypeSelect.selectedIndex].text, font: { size: 18 } },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: { display: true, text: config.xAxisLabel }
                },
                y: {
                    title: { display: true, text: config.yAxisLabel },
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
