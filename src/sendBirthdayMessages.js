const axios = require("axios");
const loadCsv = require("./utils/loadCsv");
const { filterTodayBirthdays } = require("./utils/birthdayFilter");
const { logToFile } = require("./utils/logger");
const { isValidImageUrl } = require("./utils/common");

function extractFirstName(fullName) {
    return fullName.trim().split(" ")[0];
}

async function sendBirthdayMessages() {
    if (!process.env.RECIPIENT_PHONE_NUMBER) {
        const error = "RECIPIENT_PHONE_NUMBER environment variable is not set";
        logToFile(error, "ERROR");
        throw new Error(error);
    }

    if (!process.env.BIRTHDAY_TEMPLATE_WITH_IMAGE) {
        const error = "BIRTHDAY_TEMPLATE_WITH_IMAGE environment variable is not set";
        logToFile(error, "ERROR");
        throw new Error(error);
    }

    if (!process.env.BIRTHDAY_TEMPLATE_NO_IMAGE) {
        const error = "BIRTHDAY_TEMPLATE_NO_IMAGE environment variable is not set";
        logToFile(error, "ERROR");
        throw new Error(error);
    }

    const rows = await loadCsv('birthday');
    const todayBirthdays = filterTodayBirthdays(rows);
    if (todayBirthdays.length === 0) {
        logToFile("No birthdays found today", "INFO");
        return;
    }

    logToFile(`Found ${todayBirthdays.length} birthdays today`, "INFO");

    for (const row of todayBirthdays) {
        const fullName = row["Full Name"];
        const firstName = extractFirstName(fullName);
        const jiNameWithPhone = `${firstName}ji : ${row["Phone Number"]}`;
        const imageLink = row["Image Link"];

        // Determine template and components based on image availability
        const hasValidImage = isValidImageUrl(imageLink);
        const templateName = hasValidImage
            ? process.env.BIRTHDAY_TEMPLATE_WITH_IMAGE
            : process.env.BIRTHDAY_TEMPLATE_NO_IMAGE;

        const components = [
            {
                type: "body",
                parameters: [
                    { type: "text", text: fullName },
                    { type: "text", text: jiNameWithPhone }
                ],
            },
        ];

        // Add header component with image if valid image URL exists
        if (hasValidImage) {
            components.unshift({
                type: "header",
                parameters: [
                    {
                        type: "image",
                        image: {
                            link: imageLink.trim()
                        }
                    }
                ]
            });
        }

        try {
            const res = await axios.post(
                process.env.WHATSAPP_API_URL,
                {
                    messaging_product: "whatsapp",
                    to: process.env.RECIPIENT_PHONE_NUMBER,
                    type: "template",
                    template: {
                        name: templateName,
                        language: { code: "hi" },
                        components: components,
                    },
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            const templateType = hasValidImage ? "with image" : "without image";
            logToFile(`Message sent for ${fullName} to ${process.env.RECIPIENT_PHONE_NUMBER} using ${templateType} template - Message ID: ${res.data.messages?.[0]?.id}`, "SUCCESS");
        } catch (err) {
            const errorMessage = `Failed to send message for ${fullName}: ${err?.response?.data?.error?.message || err.message}`;
            logToFile(errorMessage, "ERROR");
        }
    }
}

module.exports = sendBirthdayMessages;
