const fs = require('fs');
const path = require('path');

function getLogFileName() {
    const date = new Date().toISOString().split('T')[0];
    return `whatsapp-messages-${date}.log`;
}

function logToFile(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type}] ${message}`;

    // Always log to console
    console.log(logMessage);

    // Only write to file if not running in GitHub Actions
    if (process.env.GITHUB_ACTIONS !== 'true') {
        try {
            const logDir = path.join(process.cwd(), 'logs');
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir);
            }

            const logFile = path.join(logDir, getLogFileName());
            fs.appendFileSync(logFile, logMessage + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    } else {
        // Use GitHub Actions specific logging commands for better visibility
        switch (type) {
            case 'ERROR':
                console.error(`::error::${message}`);
                break;
            case 'WARNING':
                console.warn(`::warning::${message}`);
                break;
            case 'DEBUG':
                console.debug(`::debug::${message}`);
                break;
            case 'SUCCESS':
            case 'INFO':
            default:
                // Normal messages don't need special formatting
                break;
        }
    }
}

module.exports = { logToFile }; 