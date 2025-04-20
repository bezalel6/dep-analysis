/**
 * UI module for the JavaScript example project
 */

const { formatData } = require('./utils/format');

// Render the UI with data from the API
function renderUI(api) {
    // Simulate UI rendering
    console.log('Rendering UI with configuration:', api.config);

    // Example of using the API
    api.getData()
        .then(data => {
            const formattedData = formatData(data);
            console.log('Displaying data:', formattedData);
        })
        .catch(error => {
            console.error('Failed to render UI:', error);
        });
}

module.exports = {
    renderUI
}; 