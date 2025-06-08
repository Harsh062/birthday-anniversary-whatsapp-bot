const fs = require('fs');
const path = require('path');

function ensureLogDirectory() {
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
    }
    return logDir;
}

function getLogFileName() {
    const date = new Date().toISOString().split('T')[0];
    return `whatsapp-messages-${date}.log`;
}

function logToFile(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logDir = ensureLogDirectory();
    const logFile = path.join(logDir, getLogFileName());
    const logMessage = `[${timestamp}] [${type}] ${message}\n`;

    fs.appendFileSync(logFile, logMessage);
    console.log(message); // Keep console logging as well
}

module.exports = { logToFile }; 