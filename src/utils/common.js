/**
 * Common utility functions shared across modules
 */

/**
 * Validates if a given string is a valid image URL
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if valid image URL, false otherwise
 */
function isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const trimmedUrl = url.trim();
    if (trimmedUrl === '') return false;

    try {
        const urlObj = new URL(trimmedUrl);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Checks if a URL is a valid Google Drive share URL
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if valid Google Drive URL, false otherwise
 */
function isValidGoogleDriveUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const trimmedUrl = url.trim();
    if (trimmedUrl === '') return false;

    try {
        const urlObj = new URL(trimmedUrl);
        if (urlObj.hostname !== 'drive.google.com') return false;

        // Check for common Google Drive URL patterns
        return trimmedUrl.includes('/file/d/') ||
            trimmedUrl.includes('?id=') ||
            trimmedUrl.includes('&id=');
    } catch {
        return false;
    }
}

module.exports = {
    isValidImageUrl,
    isValidGoogleDriveUrl
}; 