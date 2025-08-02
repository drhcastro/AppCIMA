document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const API_URL = 'https://script.google.com/macros/s/AKfycbw6jZIjBoeSlIRF-lAMPNqmbxRsncqulzZEi8f7q2AyOawxbpSZRIUxsx9UgZwe/exec';

    // --- ELEMENTOS DEL DOM ---
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results-container');
    let searchTimeout;

    // --- MANEJO DE EVENTOS ---
    searchInput.addEventListener('keyup', () => {
        // Espera 300ms después de que el usuario deja de teclear para buscar
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performSearch();
        }, 300);
    });

    // --- FUNCIONES ---
    async function performSearch() {
        const searchTerm = searchInput.value.trim();

        if (searchTerm.length < 3) {
            resultsContainer.innerHTML = '<p class="info-message">Escribe al menos 3 caracteres para buscar.</p>';
            return;
        }

        resultsContainer.innerHTML = '<p class="info-message">Buscando...</p>';

        try {
            const response = await fetch(`${API_URL}?action=buscarPacientes&termino=${encodeURIComponent(searchTerm)}`);
            const data = await response.json();

            if (data.status !== 'success') throw new Error(data.message);

            displayResults(data.data);

        } catch (error) {
            resultsContainer.innerHTML = `<p class="error-message">Error en la búsqueda: ${error.message}</p>`;
        }
    }

    function displayResults(results) {
        resultsContainer.innerHTML = ''; // Limpiar resultados anteriores

        if (results.length === 0) {
            resultsContainer.innerHTML = '<p class="info-message">No se encontraron pacientes con ese criterio.</p>';
            return;
        }

        results.forEach(patient => {
            const resultCard = document.createElement('a');
            resultCard.href = `visor.html?codigo=${patient.codigoUnico}`;
            resultCard.className = 'result-card';
            
            const dob = new Date(patient.fechaNacimiento + 'T00:00:00').toLocaleDateString('es-ES');

            resultCard.innerHTML = `
                <div class="result-info">
                    <strong class="result-name">${patient.nombre}</strong>
                    <span class="result-details">Cód: ${patient.codigoUnico} | Nac: ${dob}</span>
                </div>
                <span class="result-arrow">→</span>
            `;
            resultsContainer.appendChild(resultCard);
        });
    }
});
