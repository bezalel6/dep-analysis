/**
 * API module for the JavaScript example project
 */

const { fetchData, processData } = require('./utils/data');

// Initialize the application with configuration
function initializeApp(config) {
    return {
        // Public API methods
        async getData() {
            try {
                const rawData = await fetchData(config.apiUrl);
                return processData(rawData);
            } catch (error) {
                console.error('Failed to get data:', error);
                throw error;
            }
        },

        // Configuration
        config
    };
}

module.exports = {
    initializeApp
}; 