// buscar-script.js (Versión de Diagnóstico)
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results-container');
    let searchTimeout;
    let lastResults = [];

    searchInput.addEventListener('keyup', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(performSearch, 300);
    });
    
    resultsContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.result-card');
        if (card) {
            e.preventDefault();
            const codigo = card.dataset.codigo;
            const patientData = lastResults.find(p => p.codigoUnico === codigo);
            
            if (patientData) {
                // --- PUNTO DE DIAGNÓSTICO CLAVE ---
                // Mostraremos una alerta con los datos que estamos a punto de guardar.
                alert("DATOS A GUARDAR EN MEMORIA:\n\n" + JSON.stringify(patientData, null, 2));
                
                // Revisa en la alerta si el campo "fechaNacimiento" existe y tiene un valor.
                
                localStorage.setItem('activePatient', JSON.stringify(patientData));
                window.location.href = `visor.html?codigo=${codigo}`;
            } else {
                alert('Error crítico: No se encontraron los datos completos del paciente en los resultados de búsqueda.');
            }
        }
    });

    async function performSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        if (searchTerm.length < 3) {
            resultsContainer.innerHTML = '';
            return;
        }
        resultsContainer.innerHTML = '<p class="info-message">Buscando...</p>';
        try {
            const querySnapshot = await db.collection('pacientes').get();
            const allPatients = querySnapshot.docs.map(doc => doc.data());

            const results = allPatients.filter(paciente => {
                if (!paciente || !paciente.nombre) return false;
                const nombreCompleto = `${paciente.nombre} ${paciente.apellidoPaterno || ''} ${paciente.apellidoMaterno || ''}`.toLowerCase();
                return nombreCompleto.includes(searchTerm) || (paciente.codigoUnico && paciente.codigoUnico.toLowerCase().includes(searchTerm));
            });
            
            lastResults = results;
            displayResults(results);

        } catch (error) {
            resultsContainer.innerHTML = `<p class="error-message">Error en la búsqueda: ${error.message}</p>`;
        }
    }

    function displayResults(results) {
        resultsContainer.innerHTML = '';
        if (results.length === 0) {
            resultsContainer.innerHTML = '<p class="info-message">No se encontraron pacientes.</p>';
            return;
        }
        results.forEach(patient => {
            const resultCard = document.createElement('a');
            resultCard.href = `visor.html?codigo=${patient.codigoUnico}`;
            resultCard.className = 'result-card';
            resultCard.dataset.codigo = patient.codigoUnico;
            
            // Usamos nuestra propia función de formateo para ser seguros
            const dob = patient.fechaNacimiento ? new Date(patient.fechaNacimiento + 'T00:00:00').toLocaleDateString('es-ES') : 'Sin fecha';

            resultCard.innerHTML = `
                <div class="result-info">
                    <strong class="result-name">${patient.nombre} ${patient.apellidoPaterno || ''}</strong>
                    <span class="result-details">Cód: ${patient.codigoUnico} | Nac: ${dob}</span>
                </div>
                <span class="result-arrow">→</span>
            `;
            resultsContainer.appendChild(resultCard);
        });
    }
});
