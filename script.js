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
    const backBtn = document.getElementById('back-btn');

    // --- INICIALIZACIÓN ---
    const activePatient = JSON.parse(localStorage.getItem('activePatient'));
    measureDateInput.valueAsDate = new Date();
    initializeChart();

    if (activePatient) {
        // MODO PACIENTE REGISTRADO
        patientBanner.innerHTML = `<p>Mostrando historial para: <strong>${activePatient.nombre} ${activePatient.apellidoPaterno}</strong></p>`;
        dobInput.value = activePatient.fechaNacimiento;
        sexInput.value = activePatient.sexo.toLowerCase() === 'niño' ? 'boys' : 'girls';
        dobInput.disabled = true;
        sexInput.disabled = true;
        historyCard.style.display = 'block';
        backBtn.href = `visor.html?codigo=${activePatient.codigoUnico}`; // Botón de regreso dinámico
        backBtn.textContent = '⬅️ Regresar al Expediente';
        loadPatientHistory();
    } else {
        // MODO SIN REGISTRO
        dobInput.disabled = false;
        sexInput.disabled = false;
        backBtn.textContent = '⬅️ Regresar al Menú Principal';
    }

    // --- MANEJO DE EVENTOS ---
    addPointBtn.addEventListener('click', handleAddMeasurement);
    historyTableBody.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (row && row.dataset.measurement) {
            historyTableBody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
            row.classList.add('selected');
            const measurement = JSON.parse(row.dataset.measurement);
            plotDistribution(measurement.zScore);
            displayResults(measurement);
        }
    });
    chartTypeSelect.addEventListener('change', (e) => {
        const unit = getUnitFromChartType(e.target.value);
        document.getElementById('measurement-label').textContent = `Valor de la Medición (${unit})`;
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

        const flatHistory = [];
        measurements.forEach(m => {
            if (m.peso) flatHistory.push({ fecha: m.fechaMedicion, tipo: 'Peso', valor: m.peso, unidad: 'kg', zScore: m.pesoZScore });
            if (m.talla) flatHistory.push({ fecha: m.fechaMedicion, tipo: 'Talla', valor: m.talla, unidad: 'cm', zScore: m.tallaZScore });
            if (m.pc) flatHistory.push({ fecha: m.fechaMedicion, tipo: 'PC', valor: m.pc, unidad: 'cm', zScore: m.pcZScore });
            if (m.imc) flatHistory.push({ fecha: m.fechaMedicion, tipo: 'IMC', valor: m.imc, unidad: 'kg/m²', zScore: m.imcZScore });
        });
        
        flatHistory.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));

        flatHistory.forEach(item => {
            const row = document.createElement('tr');
            row.dataset.measurement = JSON.stringify(item);
            row.innerHTML = `
                <td>${new Date(item.fecha + 'T00:00:00').toLocaleDateString('es-ES')}</td>
                <td>${item.tipo}</td>
                <td>${item.valor} ${item.unidad}</td>
                <td>${item.zScore ? item.zScore.toFixed(2) : 'N/A'}</td>
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
            alert("Por favor, complete todos los campos."); return;
        }

        const ageInDays = Math.floor((new Date(measureDate) - new Date(dob)) / (1000 * 60 * 60 * 24));
        const chartTypeKey = chartTypeSelect.value;
        
        const lms = getLMS(ageInDays, sex, whoData[chartTypeKey]);
        const zScore = calculateZScore(measurementValue, lms);

        const resultData = {
            fecha: measureDate,
            tipo: chartTypeSelect.options[chartTypeSelect.selectedIndex].text,
            valor: measurementValue,
            unidad: getUnitFromChartType(chartTypeKey),
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
            
            const metricKey = chartConfig[chartTypeKey].dataKey;
            const zScoreKey = `${metricKey}ZScore`;
            newMeasurement[metricKey] = measurementValue;
            newMeasurement[zScoreKey] = zScore;
            
            try {
                await db.collection('medicionesCrecimiento').doc(newMeasurement.id).set(newMeasurement);
                loadPatientHistory();
            } catch (error) {
                console.error("Error guardando medición:", error);
                alert("Error al guardar la medición.");
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
        return z;
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
                    { data: range(-1, 1, 0.1).map(x => ({ x: y, y: pdf(x) })), backgroundColor: 'rgba(92, 184, 92, 0.5)', pointRadius: 0, fill: 'origin', order: 2, label: '' },
                    { data: [...range(-2, -1, 0.1), NaN, ...range(1, 2, 0.1)].map(x => ({ x: x, y: pdf(x) })), backgroundColor: 'rgba(240, 173, 78, 0.5)', pointRadius: 0, fill: 'origin', order: 1, label: '' },
                    { data: [...range(-3, -2, 0.1), NaN, ...range(2, 3, 0.1)].map(x => ({ x: x, y: pdf(x) })), backgroundColor: 'rgba(217, 83, 79, 0.5)', pointRadius: 0, fill: 'origin', order: 0, label: '' },
                    { label: 'Distribución Normal', data: curveData, borderColor: 'rgba(0, 0, 0, 0.8)', borderWidth: 2, pointRadius: 0, fill: false, tension: 0.4, order: 3 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { title: { display: true, text: 'Distribución de Puntuación Z', font: { size: 18 } }, legend: { display: false }, tooltip: { enabled: false } },
                scales: {
                    x: { type: 'linear', title: { display: true, text: 'Puntuación Z (DE)' }, min: -4, max: 4, ticks: { stepSize: 1 } },
                    y: { display: false, beginAtZero: true, max: 0.45 }
                }
            }
        });
    }

    function plotDistribution(patientZScore) {
        if (!activeChart || isNaN(patientZScore)) { return; }
        const pdf = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
        const patientPoint = [{ x: patientZScore, y: pdf(patientZScore) }];

        if (activeChart.data.datasets.length > 4) {
            activeChart.data.datasets.pop();
        }

        activeChart.data.datasets.push({
            label: 'Paciente', data: patientPoint, type: 'scatter',
            pointRadius: 10, pointHoverRadius: 12,
            backgroundColor: '#005f73', borderColor: 'white',
            borderWidth: 2, order: 5
        });
        activeChart.update('none');
    }

    function getUnitFromChartType(type) {
        if (type.includes('weight') || type.includes('bmi')) return 'kg';
        if (type.includes('length') || type.includes('head')) return 'cm';
        return '';
    }

    const chartConfig = {
        weightForAge: { dataKey: 'peso' },
        lengthForAge: { dataKey: 'talla' },
        headCircumferenceForAge: { dataKey: 'pc' },
        bmiForAge: { dataKey: 'imc' }
    };
});
