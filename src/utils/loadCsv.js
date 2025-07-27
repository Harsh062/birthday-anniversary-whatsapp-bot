const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { logToFile } = require('./logger');
const { Readable } = require('stream');

async function readLocalCSV(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(path.resolve(process.cwd(), filePath))
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
    });
}

async function readRemoteCSV(url) {
    try {
        const response = await axios.get(url);
        const results = [];

        // Create a readable stream from the response data
        const readableStream = Readable.from(response.data);

        return new Promise((resolve, reject) => {
            readableStream
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', () => resolve(results))
                .on('error', (error) => reject(error));
        });
    } catch (error) {
        throw new Error(`Failed to fetch remote CSV: ${error.message}`);
    }
}

async function loadCsv() {
    const isDev = process.env.NODE_ENV === 'development';
    const config = {
        localPath: process.env.BIRTHDAY_ANNIVERSARY_LOCAL_CSV_PATH,
        remoteLink: process.env.BIRTHDAY_ANNIVERSARY_CSV_REMOTE_LINK,
        name: 'birthday_anniversary'
    };

    try {
        if (isDev) {
            if (!config.localPath) {
                throw new Error('BIRTHDAY_ANNIVERSARY_LOCAL_CSV_PATH not set in development environment');
            }
            logToFile(`Reading local ${config.name} CSV from: ${config.localPath}`, 'INFO');
            return await readLocalCSV(config.localPath);
        } else {
            if (!config.remoteLink) {
                throw new Error('BIRTHDAY_ANNIVERSARY_CSV_REMOTE_LINK not set in production environment');
            }
            logToFile(`Fetching remote ${config.name} CSV data`, 'INFO');
            return await readRemoteCSV(config.remoteLink);
        }
    } catch (error) {
        logToFile(`Failed to load ${config.name} CSV: ${error.message}`, 'ERROR');
        throw error;
    }
}

module.exports = loadCsv;
