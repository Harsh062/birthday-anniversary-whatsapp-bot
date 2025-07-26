const cloudinary = require('cloudinary').v2;
const axios = require('axios');
const { logToFile } = require('./logger');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Extracts file ID from Google Drive URL
 * @param {string} driveUrl - Google Drive share URL
 * @returns {string|null} - File ID or null if invalid
 */
function extractGoogleDriveFileId(driveUrl) {
    if (!driveUrl || typeof driveUrl !== 'string') return null;

    const trimmedUrl = driveUrl.trim();
    if (trimmedUrl === '') return null;

    try {
        const url = new URL(trimmedUrl);

        // Handle different Google Drive URL formats
        if (url.hostname === 'drive.google.com') {
            // Format: https://drive.google.com/file/d/FILE_ID/view
            const fileIdMatch = trimmedUrl.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
            if (fileIdMatch) return fileIdMatch[1];

            // Format: https://drive.google.com/open?id=FILE_ID
            const openIdMatch = trimmedUrl.match(/[?&]id=([a-zA-Z0-9-_]+)/);
            if (openIdMatch) return openIdMatch[1];

            // Format: https://drive.google.com/uc?id=FILE_ID
            const ucIdMatch = trimmedUrl.match(/[?&]id=([a-zA-Z0-9-_]+)/);
            if (ucIdMatch) return ucIdMatch[1];
        }

        return null;
    } catch (error) {
        logToFile(`Invalid Google Drive URL format: ${driveUrl}`, 'ERROR');
        return null;
    }
}

/**
 * Downloads image from Google Drive
 * @param {string} fileId - Google Drive file ID
 * @returns {Promise<Buffer|null>} - Image buffer or null if failed
 */
async function downloadFromGoogleDrive(fileId) {
    try {
        const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        logToFile(`Downloading image from Google Drive: ${fileId}`, 'INFO');

        const response = await axios.get(downloadUrl, {
            responseType: 'arraybuffer',
            timeout: 30000, // 30 second timeout
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (response.status === 200 && response.data) {
            logToFile(`Successfully downloaded image from Google Drive: ${fileId}`, 'SUCCESS');
            return Buffer.from(response.data);
        }

        logToFile(`Failed to download image from Google Drive: ${fileId} - Status: ${response.status}`, 'ERROR');
        return null;
    } catch (error) {
        logToFile(`Error downloading from Google Drive: ${fileId} - ${error.message}`, 'ERROR');
        return null;
    }
}

/**
 * Uploads image buffer to Cloudinary
 * @param {Buffer} imageBuffer - Image buffer to upload
 * @param {string} fileName - Name for the uploaded file
 * @returns {Promise<string|null>} - Cloudinary secure URL or null if failed
 */
function uploadToCloudinary(imageBuffer, fileName) {
    return new Promise((resolve) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'birthday-images',
                public_id: fileName,
                resource_type: 'image',
                transformation: [
                    { width: 800, height: 800, crop: 'limit' },
                    { quality: 'auto' }
                ]
            },
            (error, result) => {
                if (error) {
                    logToFile(`Cloudinary upload failed for ${fileName}: ${error.message}`, 'ERROR');
                    resolve(null);
                } else {
                    logToFile(`Successfully uploaded to Cloudinary: ${fileName} - URL: ${result.secure_url}`, 'SUCCESS');
                    resolve(result.secure_url);
                }
            }
        );

        uploadStream.end(imageBuffer);
    });
}

/**
 * Main function to handle Google Drive to Cloudinary upload
 * @param {string} driveUrl - Google Drive share URL
 * @param {string} fileName - Name for the uploaded file (optional)
 * @returns {Promise<string|null>} - Cloudinary secure URL or null if failed
 */
async function uploadFromGoogleDrive(driveUrl, fileName = null) {
    try {
        // Validate Cloudinary configuration
        if (!process.env.CLOUDINARY_CLOUD_NAME ||
            !process.env.CLOUDINARY_API_KEY ||
            !process.env.CLOUDINARY_API_SECRET) {
            logToFile('Cloudinary credentials not configured', 'ERROR');
            return null;
        }

        // Extract file ID from Google Drive URL
        const fileId = extractGoogleDriveFileId(driveUrl);
        if (!fileId) {
            logToFile(`Invalid Google Drive URL: ${driveUrl}`, 'ERROR');
            return null;
        }

        // Download image from Google Drive
        const imageBuffer = await downloadFromGoogleDrive(fileId);
        if (!imageBuffer) {
            return null;
        }

        // Generate filename if not provided
        const uploadFileName = fileName || `birthday-image-${fileId}-${Date.now()}`;

        // Upload to Cloudinary
        const cloudinaryUrl = await uploadToCloudinary(imageBuffer, uploadFileName);
        return cloudinaryUrl;

    } catch (error) {
        logToFile(`Error in uploadFromGoogleDrive: ${error.message}`, 'ERROR');
        return null;
    }
}

module.exports = {
    uploadFromGoogleDrive,
    extractGoogleDriveFileId,
    downloadFromGoogleDrive,
    uploadToCloudinary
}; 