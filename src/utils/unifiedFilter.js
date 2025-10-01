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

function isDateToday(dateString) {
    if (!dateString) return false;

    const match = dateString.match(/^(\d{1,2})-(\w+)-/);
    if (!match) return false;

    const today = getTodayInIST();
    const [_, dobDay, dobMonthName] = match;

    return parseInt(dobDay) === today.getDate() &&
        dobMonthName.toLowerCase().startsWith(today.toLocaleString("en-US", { month: "short" }).toLowerCase());
}

function filterTodayBirthdays(rows) {
    const todayBirthdays = [];

    for (const row of rows) {
        // Check husband's birthday
        if (isDateToday(row["Husband DOB"])) {
            todayBirthdays.push({
                name: row["Husband"],
                phone: row["Husband Phone"],
                photoLink: row["Canva HOF Birthday Link"],
                type: "husband_birthday"
            });
        }

        // Check wife's birthday
        if (isDateToday(row["Wife DOB"])) {
            todayBirthdays.push({
                name: row["Wife"],
                phone: row["Wife Phone"],
                photoLink: row["Canva Wife Birthday Link"],
                type: "wife_birthday"
            });
        }
    }

    return todayBirthdays;
}

function filterTodayAnniversaries(rows) {
    const todayAnniversaries = [];

    for (const row of rows) {
        // Check if anniversary is today and marital status is "Married"
        if (isDateToday(row["Anniversary"]) && row["Marital Status"] === "Married") {
            todayAnniversaries.push({
                husbandName: row["Husband"],
                wifeName: row["Wife"],
                husbandPhone: row["Husband Phone"],
                wifePhone: row["Wife Phone"],
                anniversaryPhoto: row["Anniversary Photo"]
            });
        }
    }

    return todayAnniversaries;
}

module.exports = {
    getTodayInIST,
    formatDate,
    isDateToday,
    filterTodayBirthdays,
    filterTodayAnniversaries
}; 