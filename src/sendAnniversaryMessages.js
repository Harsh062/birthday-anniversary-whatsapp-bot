const axios = require("axios");
const loadCsv = require("./utils/loadCsv");
const { filterTodayAnniversaries } = require("./utils/unifiedFilter");
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

    const rows = await loadCsv();
    const todayAnniversaries = filterTodayAnniversaries(rows);
    if (todayAnniversaries.length === 0) {
        logToFile("No anniversaries found today", "INFO");
        return;
    }
    logToFile(`Found ${todayAnniversaries.length} anniversaries today`, "INFO");

    for (const couple of todayAnniversaries) {
        const husbandName = couple.husbandName;
        const wifeName = couple.wifeName;
        const husbandFirstName = extractFirstName(husbandName);
        const wifeFirstName = extractFirstName(wifeName);
        const husbandPhone = couple.husbandPhone;
        const wifePhone = couple.wifePhone;
        const anniversaryPhoto = couple.anniversaryPhoto;

        let finalImageUrl = null;

        // Check if Anniversary Photo contains a Google Drive URL and needs to be uploaded to Cloudinary
        if (isValidGoogleDriveUrl(anniversaryPhoto)) {
            logToFile(`Processing Google Drive URL for anniversary ${husbandName} & ${wifeName}: ${anniversaryPhoto}`, "INFO");

            try {
                const cloudinaryUrl = await uploadFromGoogleDrive(anniversaryPhoto, `anniversary-${husbandName.replace(/\s+/g, '-')}-${wifeName.replace(/\s+/g, '-')}`);

                if (cloudinaryUrl) {
                    finalImageUrl = cloudinaryUrl;
                    logToFile(`Uploaded Google Drive image to Cloudinary for anniversary ${husbandName} & ${wifeName}`, "SUCCESS");
                } else {
                    logToFile(`Failed to upload Google Drive image to Cloudinary for anniversary ${husbandName} & ${wifeName}`, "ERROR");
                }
            } catch (error) {
                logToFile(`Error processing Google Drive upload for anniversary ${husbandName} & ${wifeName}: ${error.message}`, "ERROR");
            }
        } else if (isValidImageUrl(anniversaryPhoto)) {
            finalImageUrl = anniversaryPhoto;
        }

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

module.exports = sendAnniversaryMessages; 