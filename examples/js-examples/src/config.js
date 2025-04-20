/**
 * Configuration module for the JavaScript example project
 */

module.exports = {
    apiUrl: 'https://api.example.com/data',
    timeout: 5000,
    retryAttempts: 3,
    debug: process.env.NODE_ENV === 'development'
}; 