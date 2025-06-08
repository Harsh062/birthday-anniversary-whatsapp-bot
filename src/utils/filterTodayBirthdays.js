// src/utils/filterTodayBirthdays.js
const { parse } = require('date-fns');

function filterTodayBirthdays(rows) {
    const today = new Date();
    const todayDay = today.getDate();
    const todayMonth = today.getMonth(); // zero-based

    return rows.filter((row) => {
        const dobString = row['Date of Birth'].trim();
        try {
            const parsedDate = parse(dobString, 'd-MMM-yyyy', new Date());
            return (
                parsedDate.getDate() === todayDay &&
                parsedDate.getMonth() === todayMonth
            );
        } catch (err) {
            console.warn(`Could not parse date: ${dobString}`);
            return false;
        }
    });
}

module.exports = filterTodayBirthdays;
