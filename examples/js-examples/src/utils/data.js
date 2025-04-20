/**
 * Data utility functions for the JavaScript example project
 */

// Fetch data from an API
async function fetchData(url) {
    // Simulate API call
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                items: [
                    { id: 1, name: 'Item 1' },
                    { id: 2, name: 'Item 2' }
                ]
            });
        }, 1000);
    });
}

// Process raw data
function processData(rawData) {
    return {
        ...rawData,
        processedAt: new Date().toISOString(),
        totalItems: rawData.items.length
    };
}

module.exports = {
    fetchData,
    processData
}; 