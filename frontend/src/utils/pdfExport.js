import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { DAY_FULL_NAMES, WEEK_DAYS } from '../data/constants';
import { normalizeShift } from './shiftHelper';

function formatPdfShiftCell(emp, rawVal) {
  if (!rawVal) return 'OFF';
  const { shift, covering_store, confirmed } = normalizeShift(rawVal);
  if (!shift || shift === 'off' || confirmed === false) return 'OFF';

  if (emp?.isBorrowedTo) {
    return covering_store === emp.isBorrowedTo ? shift : 'OFF';
  }
  return covering_store ? `${shift} ${covering_store}` : shift;
}

export const exportScheduleToPDF = (currentWeek, employees, scheduleMap, storeId) => {
  const doc = new jsPDF('landscape');
  
  doc.setFontSize(18);
  doc.text(`Lich Lam Viec Tuan: ${currentWeek}`, 14, 22);
  doc.setFontSize(11);
  doc.text(`Cua hang: ${storeId || 'Tat ca'}`, 14, 30);
  
  const headers = [['Mã NV', 'Họ và Tên', ...Object.values(DAY_FULL_NAMES)]];
  
  const body = employees.map(emp => {
    const empSched = scheduleMap[emp.id] || {};
    return [
      emp.id,
      emp.name,
      ...WEEK_DAYS.map(dayKey => formatPdfShiftCell(emp, empSched[dayKey]))
    ];
  });

  doc.autoTable({
    startY: 40,
    head: headers,
    body: body,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [41, 128, 185] }
  });
  
  doc.save(`Lich_Lam_Viec_${currentWeek}.pdf`);
};
