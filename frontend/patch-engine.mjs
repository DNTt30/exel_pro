
import fs from 'fs';
const p = 'D:/schedule-app/frontend/src/utils/aiSchedulerEngine.js';
let t = fs.readFileSync(p, 'utf8');
const nl = '\r\n';

const oldB = [
  '      } else {',
  '        const currentAssigned = storeEmployees.filter(e => resultSchedule[e.id][dayKey] === shiftCode);',
  '        const hasSenior = currentAssigned.some(isSeniorStaff);',
  '',
  '        if (!hasSenior) {'
].join(nl);
const newB = [
  '      } else {',
  '        const codeHours = getShiftHours(shiftCode);',
  '        const isShortPeak = codeHours > 0 && codeHours < 8; // ca ngan gio vang -> danh cho PT',
  '        const currentAssigned = storeEmployees.filter(e => resultSchedule[e.id][dayKey] === shiftCode);',
  '        const hasSenior = currentAssigned.some(isSeniorStaff);',
  '',
  '        if (!hasSenior && !isShortPeak) {'
].join(nl);
if (!t.includes(oldB)) throw new Error('B anchor missing');
t = t.split(oldB).join(newB);

const oldC = [
  '        if (assignedCount < neededCount) {',
  '          const sortedPT = [...ptEmployees].sort((a, b) => employeeHours[a.id] - employeeHours[b.id]);',
  '          for (const emp of sortedPT) {'
].join(nl);
const newC = [
  '        if (assignedCount < neededCount) {',
  '          const shortPeak = getShiftHours(shiftCode) > 0 && getShiftHours(shiftCode) < 8;',
  '          const sortedPT = shortPeak',
  '            ? [...ptEmployees].sort((a, b) => employeeHours[a.id] - employeeHours[b.id])',
  '            : [',
  '                ...newEmployees.sort((a, b) => employeeHours[a.id] - employeeHours[b.id]),',
  '                ...ptEmployees.filter(e => !newEmployees.some(n => n.id === e.id)).sort((a, b) => employeeHours[a.id] - employeeHours[b.id])',
  '              ];',
  '          for (const emp of sortedPT) {'
].join(nl);
if (!t.includes(oldC)) throw new Error('C anchor missing');
t = t.split(oldC).join(newC);
fs.writeFileSync(p, t, 'utf8');
console.log('B+C patched, lines=', t.split('\n').length);
