const fs = require('fs');
const path = require('path');

const files = [
  'src/pages/Login.jsx',
  'src/components/layout/AppLayout.jsx',
  'src/pages/admin/Schedule.jsx',
  'src/pages/admin/Timesheet.jsx',
  'src/pages/admin/FeedbackCB.jsx',
  'src/pages/employee/EmployeeSchedule.jsx',
  'src/pages/employee/EmployeeTimesheet.jsx',
  'src/pages/employee/EmployeeFeedback.jsx'
];

files.forEach(f => {
  const fp = path.join('D:/schedule-app/frontend', f);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  const compName = path.basename(f, '.jsx');
  fs.writeFileSync(fp, `export default function ${compName}() { return <div className="p-4">${compName} Component</div>; }`);
});
console.log('Scaffolded dummy pages');
