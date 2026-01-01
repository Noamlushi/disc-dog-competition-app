const Competition = require('../models/Competition');
const Team = require('../models/Team');

// Get all competitions
exports.getAll = async (req, res) => {
    try {
        const competitions = await Competition.find().sort({ date: -1 });
        res.json(competitions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get single competition
exports.getOne = async (req, res) => {
    try {
        const competition = await Competition.findById(req.params.id);
        if (!competition) return res.status(404).json({ error: 'Not found' });
        res.json(competition);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Create competition
exports.create = async (req, res) => {
    try {
        const newItem = new Competition(req.body);
        const saved = await newItem.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Update competition
exports.update = async (req, res) => {
    try {
        const updated = await Competition.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Delete competition
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedComp = await Competition.findByIdAndDelete(id);

        if (!deletedComp) {
            return res.status(404).json({ error: 'Competition not found' });
        }

        // Delete all teams associated with this competition
        await Team.deleteMany({ competitionId: id });

        res.json({ message: 'Competition deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Bulk update order for a specific run type in a competition
exports.updateOrder = async (req, res) => {
    const { runType, teamOrders } = req.body; // teamOrders: [{ teamId, newOrder }]

    if (!runType || !teamOrders) {
        return res.status(400).json({ error: 'Missing runType or teamOrders' });
    }

    try {
        const operations = teamOrders.map(({ teamId, newOrder }) => ({
            updateOne: {
                filter: { _id: teamId, "registrations.runType": runType },
                update: { $set: { "registrations.$.order": newOrder } }
            }
        }));

        if (operations.length > 0) {
            await Team.bulkWrite(operations);
        }

        res.json({ message: 'Order updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * מנוע שיבוץ חכם וגמיש
 * @param {Array} participants - רשימת משתתפים
 * @param {Object} categorySettings - הגדרות זמנים
 * @param {Number} fieldsCount - מספר מגרשים
 * @param {Object} options - אובייקט הגדרות מורחב
 */
function generateFlexibleSchedule(participants, categorySettings, fieldsCount, options = {}) {

    // 1. הגדרות וערכי ברירת מחדל
    const config = {
        startTime: "09:00",
        targetEndTime: "14:00",    // היעד שלנו
        minRestTime: 20,           // האידיאל
        minRestTimeFlexible: 15,   // ה"שפיל": המינימום האבסולוטי שנסכים לרדת אליו במקרה חירום
        setupTime: 2,
        ...options
    };

    // המרות זמנים
    const timeToMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const minToTime = (m) => {
        const h = Math.floor(m / 60);
        const mn = Math.floor(m % 60);
        return `${h.toString().padStart(2, '0')}:${mn.toString().padStart(2, '0')}`;
    };

    let currentTime = timeToMin(config.startTime);
    let targetEndMin = timeToMin(config.targetEndTime);

    // יצירת משימות (Tasks)
    let taskPool = [];
    participants.forEach(p => {
        p.categories.forEach(cat => {
            taskPool.push({
                pId: p.id,
                pName: p.name,
                cat: cat,
                dur: categorySettings[cat].duration
            });
        });
    });

    // ניהול מצב (State)
    let fields = Array.from({ length: fieldsCount }, (_, i) => ({
        id: i + 1,
        freeAt: currentTime,
        lastCat: null
    }));

    let pNextFree = {}; // מתי המתחרה פנוי
    participants.forEach(p => pNextFree[p.id] = currentTime);

    let schedule = [];
    let compromiseLog = []; // יומן פשרות (איפה קיצרנו מנוחה)

    let categoryFieldMap = {}; // Maps 'Category' -> fieldId

    // --- הלב של האלגוריתם ---
    while (taskPool.length > 0) {

        // מיינו את המגרשים - תמיד נמלא את זה שמתפנה הכי מוקדם
        fields.sort((a, b) => a.freeAt - b.freeAt);
        let field = fields[0]; // המגרש הפנוי ביותר

        // אם המגרש הזה "שרוף" (אינסוף), וזה הראשון, סימן שכל המגרשים שרופים או סיימנו
        if (field.freeAt === Infinity) break;

        let slotTime = field.freeAt;
        let bestTaskIndex = -1;
        let isCompromise = false;

        // בדיקה: האם אנחנו ב"מוד חוסם" (Blocking Mode)?
        // מקצים שחייבים לרוץ ברצף: כל מה שהוא לא Distance או Freestyle
        const isInterleavable = (c) => c.includes('Distance') || c.includes('Freestyle');
        const isBlockingCat = (c) => !isInterleavable(c);

        let strictCategory = null;
        if (field.lastCat && isBlockingCat(field.lastCat)) {
            // אם המגרש הזה סיים הרגע מקצה "חוסם", והוא עדיין קיים בפול - חייבים להמשיך איתו
            const hasMoreOfLast = taskPool.some(t => t.cat === field.lastCat);
            if (hasMoreOfLast) {
                strictCategory = field.lastCat;
            }
        }

        // סינון מועמדים לפי חוקים
        const compatibleTasks = taskPool.filter(t => {
            // 1. חוק המגרש הקבוע (Consistency)
            if (categoryFieldMap[t.cat] && categoryFieldMap[t.cat] !== field.id) return false;

            // 2. חוק הרצף (Blocking/Batching)
            if (strictCategory && t.cat !== strictCategory) return false;

            return true;
        });

        if (compatibleTasks.length === 0) {
            // אם אנחנו במוד נוקשה ואין מועמדים - המגרש הזה חייב לחכות (לקפוץ בזמן) עד שהמתחרה הבא בקטגוריה יתפנה
            // אלא אם כן הסיבה שאין משימות היא שכלן שויכו למגרשים אחרים (לא אמור לקרות ב-strict המקומי, אבל ליתר בטחון)

            // אם אין משימות בכלל שמתאימות למגרש (בגלל שיוך למגרש אחר), ננטרל אותו
            // אבל צריך להיזהר: אם strictCategory מוגדר, זה אומר שיש משימות כאלה ב-POOL, פשוט אולי הן לא compatible למגרש הזה?
            // לא, כי strictCategory נגזר מ-lastCat של המגרש *הזה*, אז הן בטוח מתאימות למגרש הזה מבחינת שיוך.
            // הדבר היחיד שימנע compatibleTasks ב-strict mode זה אם קרה איזה באג לוגי, אבל נניח שהן קיימות.

            // המקרה הנפוץ פה: compatibleTasks ריק כי הגענו למצב שכל המשימות שנותרו משויכות למגרש אחר.
            // נבדוק האם יש בכלל משימות שיכולות טכנית להיכנס לפה (בלי קשר לזמן)
            const theoreticallyCompatible = taskPool.some(t =>
                (!categoryFieldMap[t.cat] || categoryFieldMap[t.cat] === field.id) &&
                (!strictCategory || t.cat === strictCategory)
            );

            if (!theoreticallyCompatible) {
                field.freeAt = Infinity;
            } else {
                // יש משימות, אבל אולי הן לא מוכנות עדיין? 
                // למעשה הלוגיקה למעלה (compatibleTasks) לא בדקה זמן (readyAt), רק סוגים.
                // אז אם הרשימה ריקה, זה אומר שבאמת אין משימות מתאימות. 
                // אז ננטרל.
                field.freeAt = Infinity;
            }
            continue;
        }

        // מכאן ממשיכים רגיל, אבל מחפשים רק בתוך compatibleTasks
        // כדי למצוא את האינדקס ב-taskPool המקורי, נעשה חיפוש חכם

        // סבב 1: חיפוש "טהור" (מוכן בזמן)
        bestTaskIndex = taskPool.findIndex(task => {
            // ולידציה כפולה (לוודא שהוא ברשימת התואמים)
            const isSelectable = compatibleTasks.includes(task);
            if (!isSelectable) return false;

            let readyAt = pNextFree[task.pId];
            return readyAt <= slotTime;
        });

        // סבב 2: ה"שפיל"
        if (bestTaskIndex === -1) {
            bestTaskIndex = taskPool.findIndex(task => {
                const isSelectable = compatibleTasks.includes(task);
                if (!isSelectable) return false;

                let readyAt = pNextFree[task.pId];
                const timeWaitNeeded = readyAt - slotTime;
                const allowedFlex = config.minRestTime - config.minRestTimeFlexible;

                return timeWaitNeeded <= allowedFlex;
            });

            if (bestTaskIndex !== -1) isCompromise = true;
        }

        if (bestTaskIndex !== -1) {
            // -- שיבוץ --
            const task = taskPool[bestTaskIndex];

            // נעילת הקטגוריה למגרש זה
            if (!categoryFieldMap[task.cat]) {
                categoryFieldMap[task.cat] = field.id;
            }

            let actualStart = Math.max(slotTime, pNextFree[task.pId]);

            if (isCompromise) {
                actualStart = slotTime;
                compromiseLog.push({
                    participant: task.pName,
                    time: minToTime(actualStart),
                    savedTime: pNextFree[task.pId] - actualStart
                });
            }

            let end = actualStart + task.dur;

            schedule.push({
                fieldId: field.id,
                startTime: minToTime(actualStart),
                endTime: minToTime(end),
                category: task.cat,
                participantId: task.pId,
                participantName: task.pName,
                note: isCompromise ? "Short Rest" : ""
            });

            field.freeAt = end + config.setupTime;
            field.lastCat = task.cat; // עדכון קטגוריה אחרונה
            pNextFree[task.pId] = end + config.minRestTime;

            taskPool.splice(bestTaskIndex, 1);

        } else {
            // -- אין ברירה, חייבים לחכות --
            // מקפיצים את המגרש לזמן שבו המועמד *התואם* הכי קרוב מתפנה
            let nextAvailableTime = Math.min(...compatibleTasks.map(t => pNextFree[t.pId]));

            if (nextAvailableTime <= field.freeAt) nextAvailableTime = field.freeAt + 1;

            field.freeAt = nextAvailableTime;
        }
    }

    // --- שלב הסיכום וההמלצות (Advisor) ---

    // סינון מגרשים לא פעילים (Infinity)
    const activeFields = fields.filter(f => f.freeAt !== Infinity);
    const actualEndMin = activeFields.length > 0
        ? Math.max(...activeFields.map(f => f.freeAt - config.setupTime))
        : currentTime; // fallback

    const overtime = actualEndMin - targetEndMin;

    // בניית אובייקט תשובה חכם
    let advisor = {
        isOptimal: true,
        messages: [],
        metrics: {
            plannedEnd: config.targetEndTime,
            actualEnd: minToTime(actualEndMin),
            totalDelayMinutes: Math.max(0, overtime),
            compromisesMade: compromiseLog.length
        }
    };

    if (overtime > 0) {
        advisor.isOptimal = false;
        advisor.messages.push({
            type: "OVERTIME",
            severity: overtime <= 15 ? "LOW" : "HIGH", // אם זה רבע שעה זה סביר
            text: `התחרות תסתיים בשעה ${advisor.metrics.actualEnd} (חריגה של ${overtime} דקות).`
        });
    }

    if (compromiseLog.length > 0) {
        advisor.messages.push({
            type: "SHORT_REST",
            severity: "MEDIUM",
            text: `בוצעו ${compromiseLog.length} קיצורי מנוחה כדי למנוע עיכובים גדולים יותר.`,
            details: compromiseLog
        });
    }

    // מיון הלו"ז
    schedule.sort((a, b) => {
        if (a.startTime === b.startTime) return a.fieldId - b.fieldId;
        return timeToMin(a.startTime) - timeToMin(b.startTime);
    });

    return {
        schedule,
        advisor
    };
}

// Generate Schedule Endpoint
exports.generateSchedule = async (req, res) => {
    try {
        const { participants, categorySettings, fieldsCount, options } = req.body;

        if (!participants || !categorySettings || !fieldsCount) {
            return res.status(400).json({ error: 'Missing required parameters: participants, categorySettings, fieldsCount' });
        }

        const result = generateFlexibleSchedule(participants, categorySettings, fieldsCount, options);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
