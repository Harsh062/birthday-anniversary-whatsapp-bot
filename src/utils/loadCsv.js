const fs = require("fs");
const axios = require("axios");
const csv = require("csv-parser");

function loadCsv() {
    return new Promise((resolve, reject) => {
        const results = [];
        const env = process.env.NODE_ENV;
        const csvPath =
            env === "production"
                ? process.env.CSV_REMOTE_LINK
                : process.env.LOCAL_CSV_PATH;

        if (env === "production") {
            axios
                .get(csvPath)
                .then((res) => {
                    const stream = require("stream");
                    const readable = new stream.Readable();
                    readable._read = () => { };
                    readable.push(res.data);
                    readable.push(null);
                    readable.pipe(csv())
                        .on("data", (data) => results.push(data))
                        .on("end", () => resolve(results));
                })
                .catch(reject);
        } else {
            fs.createReadStream(csvPath)
                .pipe(csv())
                .on("data", (data) => results.push(data))
                .on("end", () => resolve(results))
                .on("error", reject);
        }
    });
}

module.exports = loadCsv;
