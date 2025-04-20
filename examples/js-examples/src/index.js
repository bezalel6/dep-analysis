/**
 * Main entry point for the JavaScript example project
 */

const { initializeApp } = require('./api');
const { renderUI } = require('./ui');
const config = require('./config');

// Initialize the application
export function main() {
    try {
        // Initialize API
        const api = initializeApp(config);

        // Render UI
        renderUI(api);

        console.log('Application started successfully!');
    } catch (error) {
        console.error('Failed to start application:', error);
    }
}

// Start the application
main(); 