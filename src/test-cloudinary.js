require('dotenv').config();
const { uploadFromGoogleDrive } = require('./utils/cloudinaryUpload');
const { logToFile } = require('./utils/logger');

async function testCloudinaryUpload() {
    console.log('Testing Cloudinary upload functionality...\n');

    // Check if Cloudinary credentials are configured
    if (!process.env.CLOUDINARY_CLOUD_NAME ||
        !process.env.CLOUDINARY_API_KEY ||
        !process.env.CLOUDINARY_API_SECRET) {
        console.error('❌ Cloudinary credentials not configured in .env file');
        console.log('Please add the following to your .env file:');
        console.log('CLOUDINARY_CLOUD_NAME=your_cloud_name');
        console.log('CLOUDINARY_API_KEY=your_api_key');
        console.log('CLOUDINARY_API_SECRET=your_api_secret');
        return;
    }

    console.log('✅ Cloudinary credentials found');

    // Test with a sample Google Drive URL (you can replace this with a real one)
    const testDriveUrl = 'https://drive.google.com/file/d/1ABC123DEF456/view';

    console.log(`\nTesting with Google Drive URL: ${testDriveUrl}`);
    console.log('Note: This will only work if the URL points to a real, publicly accessible image file');

    try {
        const result = await uploadFromGoogleDrive(testDriveUrl, 'test-image');

        if (result) {
            console.log('\n✅ Upload successful!');
            console.log(`Cloudinary URL: ${result}`);
        } else {
            console.log('\n❌ Upload failed - this is expected if the test URL is not a real image');
            console.log('Try with a real Google Drive image URL to test the functionality');
        }
    } catch (error) {
        console.log('\n❌ Error during upload:', error.message);
    }

    console.log('\nTest completed. Check the logs/ directory for detailed information.');
}

// Run the test
testCloudinaryUpload().catch(console.error); 