const { getTodayInIST } = require('./birthdayFilter');

function isAnniversaryToday(date) {
    if (!date) return false;

    const match = date.match(/^(\d{1,2})-(\w+)-/);
    console.log(date, match);
    if (!match) return false;

    const today = getTodayInIST();
    const [_, annivDay, annivMonthName] = match;

    return parseInt(annivDay) === today.getDate() &&
        annivMonthName.toLowerCase().startsWith(today.toLocaleString("en-US", { month: "short" }).toLowerCase());
}

function pairCouples(rows) {
    console.log("pairing couples");
    const couples = new Map(); // Using anniversaryDate as key to group couples
    const processedIndices = new Set();

    for (let i = 0; i < rows.length; i++) {
        if (processedIndices.has(i)) continue;

        const currentRow = rows[i];
        const anniversaryDate = currentRow["Anniversary Date"];
        const relationship = currentRow["Relationship with HOF"];

        if (!anniversaryDate || !isAnniversaryToday(anniversaryDate) || !relationship) continue;

        if (!couples.has(anniversaryDate)) {
            couples.set(anniversaryDate, {});
        }

        const couple = couples.get(anniversaryDate);

        if (relationship.toLowerCase() === "husband") {
            couple.husband = currentRow;
        } else if (relationship.toLowerCase() === "wife") {
            couple.wife = currentRow;
        }

        processedIndices.add(i);
    }

    // Filter only complete couples (both husband and wife found)
    return Array.from(couples.values())
        .filter(couple => couple.husband && couple.wife);
}

function filterTodayAnniversaries(rows) {
    return pairCouples(rows);
}

module.exports = {
    filterTodayAnniversaries
}; 