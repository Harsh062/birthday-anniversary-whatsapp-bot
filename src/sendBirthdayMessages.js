const axios = require("axios");
const loadCsv = require("./utils/loadCsv");
const { filterTodayBirthdays } = require("./utils/unifiedFilter");
const { logToFile } = require("./utils/logger");
const { isValidImageUrl, isValidGoogleDriveUrl } = require("./utils/common");
const { uploadFromGoogleDrive } = require("./utils/cloudinaryUpload");

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

    const rows = await loadCsv();
    const todayBirthdays = filterTodayBirthdays(rows);
    if (todayBirthdays.length === 0) {
        logToFile("No birthdays found today", "INFO");
        return;
    }

    logToFile(`Found ${todayBirthdays.length} birthdays today`, "INFO");
    console.log("process.env:: ", process.env);
    for (const birthday of todayBirthdays) {
        const fullName = birthday.name;
        const firstName = extractFirstName(fullName);
        const jiNameWithPhone = `${firstName}ji : ${birthday.phone}`;
        const photoLink = birthday.photoLink;

        let finalImageUrl = null;

        // Check if Photo Link contains a Google Drive URL and needs to be uploaded to Cloudinary
        if (isValidGoogleDriveUrl(photoLink)) {
            logToFile(`Processing Google Drive URL for ${fullName}: ${photoLink}`, "INFO");

            try {
                const cloudinaryUrl = await uploadFromGoogleDrive(photoLink, `birthday-${fullName.replace(/\s+/g, '-')}`);

                if (cloudinaryUrl) {
                    finalImageUrl = cloudinaryUrl;
                    logToFile(`Uploaded Google Drive image to Cloudinary for ${fullName}`, "SUCCESS");
                } else {
                    logToFile(`Failed to upload Google Drive image to Cloudinary for ${fullName}`, "ERROR");
                }
            } catch (error) {
                logToFile(`Error processing Google Drive upload for ${fullName}: ${error.message}`, "ERROR");
            }
        } else if (isValidImageUrl(photoLink)) {
            finalImageUrl = photoLink;
        }

        // Determine template and components based on image availability
        const hasValidImage = isValidImageUrl(finalImageUrl);
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
            logToFile(`Message sent for ${fullName} to ${process.env.RECIPIENT_PHONE_NUMBER} using ${templateType} template - Message ID: ${res.data.messages?.[0]?.id}`, "SUCCESS");
        } catch (err) {
            const errorMessage = `Failed to send message for ${fullName}: ${err?.response?.data?.error?.message || err.message}`;
            logToFile(errorMessage, "ERROR");
        }
    }
}

module.exports = sendBirthdayMessages;
