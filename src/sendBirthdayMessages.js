const axios = require("axios");
const loadCsv = require("./utils/loadCsv");
const { filterTodayBirthdays } = require("./utils/birthdayFilter");
const { logToFile } = require("./utils/logger");

function extractFirstName(fullName) {
    return fullName.trim().split(" ")[0];
}

async function sendBirthdayMessages() {
    if (!process.env.RECIPIENT_PHONE_NUMBER) {
        const error = "RECIPIENT_PHONE_NUMBER environment variable is not set";
        logToFile(error, "ERROR");
        throw new Error(error);
    }

    const rows = await loadCsv();
    const todayBirthdays = filterTodayBirthdays(rows);

    logToFile(`Found ${todayBirthdays.length} birthdays today`, "INFO");

    for (const row of todayBirthdays) {
        const fullName = row["Full Name"];
        const firstName = extractFirstName(fullName);
        const jiName = `${firstName}ji`;
        const imageUrl = row["Image Link"] || row["Photo Link"];

        try {
            const res = await axios.post(
                process.env.WHATSAPP_API_URL,
                {
                    messaging_product: "whatsapp",
                    to: process.env.RECIPIENT_PHONE_NUMBER,
                    type: "template",
                    template: {
                        name: "mpf_birthday_wish",
                        language: { code: "hi" },
                        components: [
                            {
                                type: "header",
                                parameters: [
                                    {
                                        type: "image",
                                        image: { link: imageUrl },
                                    },
                                ],
                            },
                            {
                                type: "body",
                                parameters: [
                                    { type: "text", text: fullName },
                                    { type: "text", text: jiName },
                                    { type: "text", text: row["Phone Number"] },
                                ],
                            },
                        ],
                    },
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            logToFile(`Message sent for ${fullName} to ${process.env.RECIPIENT_PHONE_NUMBER} - Message ID: ${res.data.messages?.[0]?.id}`, "SUCCESS");
        } catch (err) {
            const errorMessage = `Failed to send message for ${fullName}: ${err?.response?.data?.error?.message || err.message}`;
            logToFile(errorMessage, "ERROR");
        }
    }
}

module.exports = sendBirthdayMessages;
