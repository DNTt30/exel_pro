import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { DAY_FULL_NAMES } from '../data/constants';

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
      empSched['T2'] || 'OFF',
      empSched['T3'] || 'OFF',
      empSched['T4'] || 'OFF',
      empSched['T5'] || 'OFF',
      empSched['T6'] || 'OFF',
      empSched['T7'] || 'OFF',
      empSched['CN'] || 'OFF'
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
