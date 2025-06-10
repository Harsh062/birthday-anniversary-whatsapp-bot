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

async function loadCsv(type = 'birthday') {
    const isDev = process.env.NODE_ENV === 'development';
    const config = {
        birthday: {
            localPath: process.env.BIRTHDAY_LOCAL_CSV_PATH,
            remoteLink: process.env.BIRTHDAY_CSV_REMOTE_LINK,
            name: 'birthday'
        },
        anniversary: {
            localPath: process.env.ANNIVERSARY_LOCAL_CSV_PATH,
            remoteLink: process.env.ANNIVERSARY_CSV_REMOTE_LINK,
            name: 'anniversary'
        }
    };

    const fileConfig = config[type];
    if (!fileConfig) {
        throw new Error(`Invalid CSV type: ${type}`);
    }

    try {
        if (isDev) {
            if (!fileConfig.localPath) {
                throw new Error(`${fileConfig.name.toUpperCase()}_LOCAL_CSV_PATH not set in development environment`);
            }
            logToFile(`Reading local ${fileConfig.name} CSV from: ${fileConfig.localPath}`, 'INFO');
            return await readLocalCSV(fileConfig.localPath);
        } else {
            if (!fileConfig.remoteLink) {
                throw new Error(`${fileConfig.name.toUpperCase()}_CSV_REMOTE_LINK not set in production environment`);
            }
            logToFile(`Fetching remote ${fileConfig.name} CSV data`, 'INFO');
            return await readRemoteCSV(fileConfig.remoteLink);
        }
    } catch (error) {
        logToFile(`Failed to load ${fileConfig.name} CSV: ${error.message}`, 'ERROR');
        throw error;
    }
}

module.exports = loadCsv;
