const axios = require("axios");
const loadCsv = require("./utils/loadCsv");
const { filterTodayAnniversaries } = require("./utils/anniversaryFilter");
const { logToFile } = require("./utils/logger");
const { isValidImageUrl } = require("./utils/common");

function extractFirstName(fullName) {
    return fullName.trim().split(" ")[0];
}

async function sendAnniversaryMessages() {
    if (!process.env.RECIPIENT_PHONE_NUMBER) {
        const error = "RECIPIENT_PHONE_NUMBER environment variable is not set";
        logToFile(error, "ERROR");
        throw new Error(error);
    }

    if (!process.env.ANNIVERSARY_TEMPLATE_WITH_IMAGE) {
        const error = "ANNIVERSARY_TEMPLATE_WITH_IMAGE environment variable is not set";
        logToFile(error, "ERROR");
        throw new Error(error);
    }

    if (!process.env.ANNIVERSARY_TEMPLATE_NO_IMAGE) {
        const error = "ANNIVERSARY_TEMPLATE_NO_IMAGE environment variable is not set";
        logToFile(error, "ERROR");
        throw new Error(error);
    }

    const rows = await loadCsv('anniversary');
    const todayAnniversaries = filterTodayAnniversaries(rows);
    if (todayAnniversaries.length === 0) {
        logToFile("No anniversaries found today", "INFO");
        return;
    }
    logToFile(`Found ${todayAnniversaries.length} anniversaries today`, "INFO");

    for (const couple of todayAnniversaries) {
        const husbandName = couple.husband["Full Name"];
        const wifeName = couple.wife["Full Name"];
        const husbandFirstName = extractFirstName(husbandName);
        const wifeFirstName = extractFirstName(wifeName);
        const husbandPhone = couple.husband["Phone Number"];
        const wifePhone = couple.wife["Phone Number"];
        const husbandImageLink = couple.husband["Image Link"];
        const wifeImageLink = couple.wife["Image Link"];

        // Determine which image link to use (prefer husband's if both exist)
        const imageLink = isValidImageUrl(husbandImageLink) ? husbandImageLink :
            isValidImageUrl(wifeImageLink) ? wifeImageLink : null;

        // Determine template and components based on image availability
        const hasValidImage = isValidImageUrl(imageLink);
        const templateName = hasValidImage
            ? process.env.ANNIVERSARY_TEMPLATE_WITH_IMAGE
            : process.env.ANNIVERSARY_TEMPLATE_NO_IMAGE;

        const components = [
            {
                type: "body",
                parameters: [
                    { type: "text", text: `${husbandFirstName}ji` },
                    { type: "text", text: `${wifeFirstName}ji` },
                    { type: "text", text: `${husbandName} & ${wifeName} ${husbandPhone} ${wifePhone}` },
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
            logToFile(`Anniversary message sent for ${husbandName} & ${wifeName} using ${templateType} template (Message ID: ${res.data.messages?.[0]?.id})`, "SUCCESS");
        } catch (err) {
            const errorMessage = `Failed to send anniversary message for ${husbandName} & ${wifeName}`;
            // Sanitize error message to remove any sensitive data
            const sanitizedError = err?.response?.data?.error?.message || err.message;
            if (sanitizedError) {
                logToFile(`${errorMessage}: ${sanitizedError.replace(/Bearer \w+/g, 'Bearer [REDACTED]')}`, "ERROR");
            } else {
                logToFile(errorMessage, "ERROR");
            }
        }
    }
}

module.exports = sendAnniversaryMessages; 