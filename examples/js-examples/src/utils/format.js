/**
 * Format utility functions for the JavaScript example project
 */

// Format data for display
function formatData(data) {
    return {
        ...data,
        items: data.items.map(item => ({
            ...item,
            formattedName: `Item #${item.id}: ${item.name}`
        })),
        displayDate: new Date(data.processedAt).toLocaleString()
    };
}

module.exports = {
    formatData
}; 