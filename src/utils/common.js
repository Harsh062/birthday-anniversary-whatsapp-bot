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

module.exports = {
    isValidImageUrl
}; 