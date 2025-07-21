const axios = require("axios");
const loadCsv = require("./utils/loadCsv");
const { filterTodayAnniversaries } = require("./utils/anniversaryFilter");
const { logToFile } = require("./utils/logger");
const { isValidImageUrl, isValidGoogleDriveUrl } = require("./utils/common");
const { uploadFromGoogleDrive } = require("./utils/cloudinaryUpload");

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
        const husbandPhotoLink = couple.husband["Photo Link"];
        const wifePhotoLink = couple.wife["Photo Link"];
        const husbandImageLink = couple.husband["Image Link"];
        const wifeImageLink = couple.wife["Image Link"];

        let finalImageUrl = null;

        // Check for Google Drive URLs in Photo Link columns and upload to Cloudinary if needed
        const husbandPhotoUrl = isValidGoogleDriveUrl(husbandPhotoLink) && (!husbandImageLink || !isValidImageUrl(husbandImageLink))
            ? await processGoogleDriveUpload(husbandPhotoLink, husbandName, couple.husband, "husband")
            : husbandImageLink;

        const wifePhotoUrl = isValidGoogleDriveUrl(wifePhotoLink) && (!wifeImageLink || !isValidImageUrl(wifeImageLink))
            ? await processGoogleDriveUpload(wifePhotoLink, wifeName, couple.wife, "wife")
            : wifeImageLink;

        // Determine which image link to use (prefer husband's if both exist)
        finalImageUrl = isValidImageUrl(husbandPhotoUrl) ? husbandPhotoUrl :
            isValidImageUrl(wifePhotoUrl) ? wifePhotoUrl : null;

        // Determine template and components based on image availability
        const hasValidImage = isValidImageUrl(finalImageUrl);
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
                            link: finalImageUrl.trim()
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
            const imageSource = finalImageUrl === husbandImageLink || finalImageUrl === wifeImageLink ? "existing" : "Cloudinary";
            logToFile(`Anniversary message sent for ${husbandName} & ${wifeName} to ${process.env.RECIPIENT_PHONE_NUMBER} using ${templateType} template - Message ID: ${res.data.messages?.[0]?.id}`, "SUCCESS");
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

/**
 * Helper function to process Google Drive upload for anniversary messages
 * @param {string} photoLink - Google Drive URL
 * @param {string} fullName - Person's full name
 * @param {object} row - CSV row object to update
 * @param {string} role - "husband" or "wife"
 * @returns {Promise<string|null>} - Cloudinary URL or null
 */
async function processGoogleDriveUpload(photoLink, fullName, row, role) {
    logToFile(`Processing Google Drive URL for ${role} ${fullName}: ${photoLink}`, "INFO");

    try {
        const cloudinaryUrl = await uploadFromGoogleDrive(photoLink, `anniversary-${role}-${fullName.replace(/\s+/g, '-')}`);

        if (cloudinaryUrl) {
            // Update the row in memory with the new Cloudinary URL
            row["Image Link"] = cloudinaryUrl;
            logToFile(`Updated Image Link for ${role} ${fullName} with Cloudinary URL`, "SUCCESS");
            return cloudinaryUrl;
        } else {
            logToFile(`Failed to upload Google Drive image to Cloudinary for ${role} ${fullName}`, "ERROR");
            return null;
        }
    } catch (error) {
        logToFile(`Error processing Google Drive upload for ${role} ${fullName}: ${error.message}`, "ERROR");
        return null;
    }
}

module.exports = sendAnniversaryMessages; 