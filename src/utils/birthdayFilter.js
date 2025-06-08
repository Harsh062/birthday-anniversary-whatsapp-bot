function getTodayInIST() {
    const now = new Date();
    return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
}

function formatDate(date) {
    const [day, month] = [
        date.getDate().toString().padStart(2, "0"),
        (date.getMonth() + 1).toString().padStart(2, "0"),
    ];
    return { day, month };
}

function isBirthdayToday(dob) {
    if (!dob) return false;

    const match = dob.match(/^(\d{1,2})-(\w+)-/);
    if (!match) return false;

    const today = getTodayInIST();
    const [_, dobDay, dobMonthName] = match;

    return parseInt(dobDay) === today.getDate() &&
        dobMonthName.toLowerCase().startsWith(today.toLocaleString("en-US", { month: "short" }).toLowerCase());
}

function filterTodayBirthdays(rows) {
    return rows.filter(row => isBirthdayToday(row["Date of Birth"]));
}

module.exports = {
    getTodayInIST,
    formatDate,
    isBirthdayToday,
    filterTodayBirthdays
}; 