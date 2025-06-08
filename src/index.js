require('dotenv').config();

const sendBirthdayMessages = require("./sendBirthdayMessages");
const sendAnniversaryMessages = require("./sendAnniversaryMessages");
const { logToFile } = require("./utils/logger");

async function main() {
    try {
        logToFile("Starting to send birthday messages...", "INFO");
        await sendBirthdayMessages();

        logToFile("Starting to send anniversary messages...", "INFO");
        await sendAnniversaryMessages();

        logToFile("All messages sent successfully!", "SUCCESS");
    } catch (error) {
        logToFile(`Failed to send messages: ${error.message}`, "ERROR");
        process.exit(1);
    }
}

main();