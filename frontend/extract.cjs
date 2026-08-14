const fs = require('fs');
const html = fs.readFileSync('D:/schedule-app/index.html', 'utf8');

const sMatch = html.match(/const SHIFTS\s*=\s*(\{[\s\S]*?\});\nconst /);
const eMatch = html.match(/const DEFAULT_EMP\s*=\s*(\[[\s\S]*?\]);\n\nconst INITIAL_SCHEDULE/);
const mMatch = html.match(/const INITIAL_SCHEDULE_2026_8_10\s*=\s*(\{[\s\S]*?\});\n\nconst DEFAULT_TRANSFERS/);
const tMatch = html.match(/const DEFAULT_TRANSFERS\s*=\s*(\[[\s\S]*?\]);\n\n\/\//);
const fbMatch = html.match(/const DEFAULT_FEEDBACK_CB\s*=\s*(\[[\s\S]*?\]);\nconst DEFAULT_PT_OVERTIME/);
const ptMatch = html.match(/const DEFAULT_PT_OVERTIME\s*=\s*(\[[\s\S]*?\]);\nconst ADMIN_TABS/);

const SHIFTS = sMatch ? sMatch[1] : '{}';
const DEFAULT_EMP = eMatch ? eMatch[1] : '[]';
const INITIAL_SCHEDULE_2026_8_10 = mMatch ? mMatch[1] : '{}';
const DEFAULT_TRANSFERS = tMatch ? tMatch[1] : '[]';
const DEFAULT_FEEDBACK_CB = fbMatch ? fbMatch[1] : '[]';
const DEFAULT_PT_OVERTIME = ptMatch ? ptMatch[1] : '[]';

const out = `
export const SHIFTS = ${SHIFTS};
export const DEFAULT_EMP = ${DEFAULT_EMP};
export const INITIAL_SCHEDULE_2026_8_10 = ${INITIAL_SCHEDULE_2026_8_10};
export const DEFAULT_TRANSFERS = ${DEFAULT_TRANSFERS};
export const DEFAULT_FEEDBACK_CB = ${DEFAULT_FEEDBACK_CB};
export const DEFAULT_PT_OVERTIME = ${DEFAULT_PT_OVERTIME};
`;

fs.mkdirSync('D:/schedule-app/frontend/src/data', { recursive: true });
fs.writeFileSync('D:/schedule-app/frontend/src/data/initialData.js', out);
console.log('Data extracted successfully!');
