const { getTodayInIST } = require('./birthdayFilter');

function isAnniversaryToday(date) {
    if (!date) return false;

    const match = date.match(/^(\d{1,2})-(\w+)-/);
    if (!match) return false;

    const today = getTodayInIST();
    const [_, annivDay, annivMonthName] = match;

    return parseInt(annivDay) === today.getDate() &&
        annivMonthName.toLowerCase().startsWith(today.toLocaleString("en-US", { month: "short" }).toLowerCase());
}

function pairCouples(rows) {
    const couples = new Map(); // Using unique couple identifier as key
    const processedIndices = new Set();

    // First pass: collect all valid anniversary entries for today
    const todayEntries = [];
    for (let i = 0; i < rows.length; i++) {
        const currentRow = rows[i];
        const anniversaryDate = currentRow["Anniversary Date"];
        const relationship = currentRow["Relationship with HOF"];

        if (!anniversaryDate || !isAnniversaryToday(anniversaryDate) || !relationship) continue;

        todayEntries.push({ row: currentRow, index: i });
    }

    // Group entries by anniversary date
    const entriesByDate = new Map();
    for (const entry of todayEntries) {
        const anniversaryDate = entry.row["Anniversary Date"];
        if (!entriesByDate.has(anniversaryDate)) {
            entriesByDate.set(anniversaryDate, []);
        }
        entriesByDate.get(anniversaryDate).push(entry);
    }

    // For each anniversary date, pair couples
    for (const [anniversaryDate, entries] of entriesByDate) {
        const husbands = entries.filter(e => e.row["Relationship with HOF"].toLowerCase() === "husband");
        const wives = entries.filter(e => e.row["Relationship with HOF"].toLowerCase() === "wife");

        // Create couples by matching husbands and wives
        for (let i = 0; i < Math.min(husbands.length, wives.length); i++) {
            const husband = husbands[i];
            const wife = wives[i];

            // Create unique couple identifier
            const coupleKey = `${anniversaryDate}-couple-${i}`;

            couples.set(coupleKey, {
                husband: husband.row,
                wife: wife.row
            });

            processedIndices.add(husband.index);
            processedIndices.add(wife.index);
        }
    }

    // Return all complete couples
    return Array.from(couples.values());
}

function filterTodayAnniversaries(rows) {
    return pairCouples(rows);
}

module.exports = {
    filterTodayAnniversaries
}; 