document.addEventListener('DOMContentLoaded', () => {
    // La conexión 'db' ya está disponible gracias a auth-guard.js
    let activeChart = null;
    let loadedMeasurements = [];

    // --- ELEMENTOS DEL DOM ---
    const dobInput = document.getElementById('dob');
    const sexInput = document.getElementById('sex');
    const measureDateInput = document.getElementById('measure-date');
    const chartTypeSelect = document.getElementById('chartType');
    const measurementInput = document.getElementById('measurement');
    const addPointBtn = document.getElementById('add-point-btn');
    const historyCard = document.getElementById('history-card');
    const historyTableBody = document.getElementById('history-table-body');
    const resultsCard = document.getElementById('results-card');
    const resultsText = document.getElementById('results-text');
    const patientBanner = document.getElementById('active-patient-banner');

    // --- INICIALIZACIÓN ---
    const activePatient = JSON.parse(localStorage.getItem('activePatient'));
    measureDateInput.valueAsDate = new Date();
    initializeChart(); // Inicializa la gráfica vacía

    if (activePatient) {
        // MODO PACIENTE REGISTRADO
        patientBanner.innerHTML = `<p>Mostrando historial para: <strong>${activePatient.nombre} ${activePatient.apellidoPaterno}</strong></p>`;
        dobInput.value = activePatient.fechaNacimiento;
        sexInput.value = activePatient.sexo.toLowerCase() === 'niño' ? 'boys' : 'girls';
        dobInput.disabled = true;
        sexInput.disabled = true;
        historyCard.style.display = 'block';
        loadPatientHistory();
    } else {
        // MODO SIN REGISTRO
        dobInput.disabled = false;
        sexInput.disabled = false;
    }

    // --- MANEJO DE EVENTOS ---
    addPointBtn.addEventListener('click', handleAddMeasurement);
    historyTableBody.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (row && row.dataset.measurement) {
            // Quitar la clase 'selected' de otras filas
            historyTableBody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
            // Añadir clase a la fila seleccionada
            row.classList.add('selected');
            
            const measurement = JSON.parse(row.dataset.measurement);
            plotDistribution(measurement.zScore);
            displayResults(measurement);
        }
    });

    // --- FUNCIONES ---
    async function loadPatientHistory() {
        historyTableBody.innerHTML = '<tr><td colspan="4">Cargando historial...</td></tr>';
        try {
            const querySnapshot = await db.collection('medicionesCrecimiento')
                .where('codigoUnico', '==', activePatient.codigoUnico)
                .orderBy('fechaMedicion', 'desc')
                .get();
            
            loadedMeasurements = querySnapshot.docs.map(doc => doc.data());
            displayHistoryTable(loadedMeasurements);
        } catch (error) {
            console.error("Error cargando historial de mediciones:", error);
            historyTableBody.innerHTML = '<tr><td colspan="4">Error al cargar historial. Es posible que falte un índice en Firestore.</td></tr>';
        }
    }

    function displayHistoryTable(measurements) {
        historyTableBody.innerHTML = '';
        if (measurements.length === 0) {
            historyTableBody.innerHTML = '<tr><td colspan="4">No hay mediciones registradas.</td></tr>';
            return;
        }
        measurements.forEach(m => {
            const row = document.createElement('tr');
            const relevantData = {
                fecha: m.fechaMedicion,
                tipo: getMetricLabel(m),
                valor: getMetricValue(m),
                unidad: getMetricUnit(m),
                zScore: getMetricZScore(m)
            };
            row.dataset.measurement = JSON.stringify(relevantData);

            row.innerHTML = `
                <td>${new Date(m.fechaMedicion + 'T00:00:00').toLocaleDateString('es-ES')}</td>
                <td>${relevantData.tipo}</td>
                <td>${relevantData.valor} ${relevantData.unidad}</td>
                <td>${relevantData.zScore}</td>
            `;
            historyTableBody.appendChild(row);
        });
    }

    async function handleAddMeasurement() {
        const dob = dobInput.value;
        const sex = sexInput.value;
        const measureDate = measureDateInput.value;
        const measurementValue = parseFloat(measurementInput.value);
        if (!dob || !sex || !measureDate || isNaN(measurementValue)) {
            alert("Por favor, complete todos los campos.");
            return;
        }

        const ageInDays = Math.floor((new Date(measureDate) - new Date(dob)) / (1000 * 60 * 60 * 24));
        const chartType = chartTypeSelect.value;
        const lmsData = whoData[chartType];
        
        const lms = getLMS(ageInDays, sex, lmsData);
        const zScore = calculateZScore(measurementValue, lms);

        const resultData = {
            fecha: measureDate,
            tipo: chartTypeSelect.options[chartTypeSelect.selectedIndex].text,
            valor: measurementValue,
            unidad: chartConfig[chartType].measurementLabel.match(/\((.*)\)/)[1], // Extrae unidad
            zScore: zScore
        };

        plotDistribution(zScore);
        displayResults(resultData);

        if (activePatient) {
            const newMeasurement = {
                id: new Date().getTime().toString(),
                codigoUnico: activePatient.codigoUnico,
                fechaMedicion: measureDate,
                idConsulta: null,
            };
            
            // Llenar el campo correcto según el tipo de medición
            const metricKey = chartConfig[chartType].dataKey;
            newMeasurement[metricKey] = measurementValue;
            newMeasurement[`${metricKey}ZScore`] = zScore;
            
            // Recalcular IMC si es necesario
            if (metricKey === 'weightForAge' || metricKey === 'lengthForAge') {
                 const peso = newMeasurement.weightForAge || loadedMeasurements.find(m => m.weightForAge)?.weightForAge;
                 const talla = newMeasurement.lengthForAge || loadedMeasurements.find(m => m.lengthForAge)?.lengthForAge;
                 if(peso && talla) {
                    const imc = peso / Math.pow(talla/100, 2);
                    newMeasurement.bmiForAge = parseFloat(imc.toFixed(2));
                    const imcLMS = getLMS(ageInDays, sex, whoData.bmiForAge);
                    newMeasurement.bmiForAgeZScore = calculateZScore(imc, imcLMS);
                 }
            }

            try {
                await db.collection('medicionesCrecimiento').doc(newMeasurement.id).set(newMeasurement);
                loadPatientHistory();
            } catch (error) {
                console.error("Error guardando la medición:", error);
                alert("Error al guardar la medición en la base de datos.");
            }
        }
    }

    function displayResults(data) {
        resultsCard.style.display = 'block';
        resultsText.innerHTML = `
            <strong>Fecha:</strong> ${new Date(data.fecha + 'T00:00:00').toLocaleDateString('es-ES')}<br>
            <strong>Medición:</strong> ${data.tipo}<br>
            <strong>Valor:</strong> ${data.valor} ${data.unidad}<br>
            <strong>Puntuación Z:</strong> <span style="font-weight: bold; color: var(--primary-color);">${data.zScore ? data.zScore.toFixed(2) : 'N/A'}</span>
        `;
    }

    function getLMS(ageInDays, sex, table) {
        if (typeof whoData === 'undefined' || !table || !table[sex]) {
            console.error("Datos de referencia (whoData) no disponibles.");
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
        return parseFloat(z);
    }

    function initializeChart() {
        const ctx = document.getElementById('growthChart').getContext('2d');
         const pdf = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
        const range = (start, stop, step) => Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step);
        const curveData = range(-4, 4, 0.1).map(x => ({ x: x, y: pdf(x) }));

        activeChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [
                    { data: range(-1, 1, 0.1).map(x => ({ x, y: pdf(x) })), backgroundColor: 'rgba(92, 184, 92, 0.5)', pointRadius: 0, fill: 'origin', order: 2 },
                    { data: [...range(-2, -1, 0.1), NaN, ...range(1, 2, 0.1)].map(x => ({ x, y: pdf(x) })), backgroundColor: 'rgba(240, 173, 78, 0.5)', pointRadius: 0, fill: 'origin', order: 1 },
                    { data: [...range(-3, -2, 0.1), NaN, ...range(2, 3, 0.1)].map(x => ({ x, y: pdf(x) })), backgroundColor: 'rgba(217, 83, 79, 0.5)', pointRadius: 0, fill: 'origin', order: 0 },
                    { label: 'Distribución Normal', data: curveData, borderColor: 'rgba(0, 0, 0, 0.8)', borderWidth: 2, pointRadius: 0, fill: false, tension: 0.4, order: 3 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: 'Distribución de Puntuación Z', font: { size: 18 } }, legend: { display: false }, tooltip: { enabled: false } },
                scales: {
                    x: { type: 'linear', title: { display: true, text: 'Puntuación Z (Desviaciones Estándar)' }, min: -4, max: 4, ticks: { stepSize: 1 } },
                    y: { display: false, max: 0.45 } // FIJA LA ALTURA PARA EVITAR APLANAMIENTO
                }
            }
        });
    }

    function plotDistribution(patientZScore) {
        if (!activeChart) { initializeChart(); }
        
        const pdf = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
        const patientPoint = [{ x: patientZScore, y: pdf(patientZScore) }];

        // Eliminar el punto anterior si existe (siempre es el último dataset)
        if (activeChart.data.datasets.length > 4) {
            activeChart.data.datasets.pop();
        }

        // Añadir el nuevo punto
        activeChart.data.datasets.push({
            label: 'Paciente',
            data: patientPoint,
            type: 'scatter',
            pointRadius: 8,
            pointHoverRadius: 10,
            backgroundColor: 'blue',
            borderColor: 'white',
            borderWidth: 2,
            order: 5
        });
        
        activeChart.update('none'); // Actualizar sin animación
    }

    // --- Funciones de ayuda para el historial ---
    function getMetricLabel(m) {
        if (m.peso) return "Peso"; if (m.talla) return "Talla"; if (m.pc) return "PC"; if (m.imc) return "IMC"; return "Desconocido";
    }
    function getMetricValue(m) {
        return m.peso || m.talla || m.pc || m.imc;
    }
    function getMetricUnit(m) {
        if (m.peso || m.imc) return "kg"; if (m.talla || m.pc) return "cm"; return "";
    }
    function getMetricZScore(m) {
        const score = m.pesoZScore ?? m.tallaZScore ?? m.pcZScore ?? m.imcZScore;
        return score ? score.toFixed(2) : "N/A";
    }
});
