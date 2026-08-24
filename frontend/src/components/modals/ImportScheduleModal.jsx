import React, { useState, useRef } from 'react';
import Modal from './Modal';
import { useStore } from '../../store/useStore';
import * as api from '../../services/api';
import { Upload, FileSpreadsheet, Download, AlertTriangle, X, FileDown } from 'lucide-react';
import { WEEK_DAYS } from '../../data/constants';
import { normalizeShiftCell } from '../../utils/scheduleTextNormalize';
import { provisionAuthUser } from '../../lib/authSession';
import { getShiftCode, getCoveringStore } from '../../utils/shiftHelper';


import { useShallow } from 'zustand/react/shallow';
import { toast } from '../../components/ui/toastStore';

export default function ImportScheduleModal({ isOpen, onClose, currentWeek }) {
  const { employees, stores, schedule } = useStore(useShallow((s) => ({ employees: s.employees, stores: s.stores, schedule: s.schedule })));
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoCreateEmps, setAutoCreateEmps] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Tải file mẫu Excel (xlsx nạp động để không nhét vào bundle chính)
  const handleDownloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const header = ['Mã NV', 'Họ và Tên', 'Cửa hàng', 'Vị trí', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const sampleRows = [
      ['260716009', 'DƯƠNG NGỌC TÚ', 'VN0485', 'STFT', '6-14', '6-14', '6-14', '6-14', '6-14', '6-14', 'off'],
      ['260512008', 'NGUYỄN NGÔ VIỆT HƯNG', 'VN0485', 'STPT', '22-6', 'off', '22-6', '22-6', 'off', 'off', 'off'],
      ['260618015', 'NGUYỄN MINH TÂM', 'VN0485', 'STFT', '14-22', '22-6', '22-6 VN0500', 'off', '22-6 VN0500', '22-6', 'off'],
      ['260806018', 'PHAN CAO TÙNG', 'VN0485', 'CSR_NEW', '6-14', '6-14', 'off', '6-14', '6-14', '6-14', '6-14']
    ];

    const ws = XLSX.utils.aoa_to_sheet([header, ...sampleRows]);
    // Định dạng độ rộng cột
    ws['!cols'] = [
      { wch: 14 }, { wch: 25 }, { wch: 12 }, { wch: 12 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_Phan_Ca');
    XLSX.writeFile(wb, `Mau_Phan_Ca_OFC_${currentWeek}.xlsx`);
  };

  // Xuất lịch tuần hiện tại ra đúng bố cục mẫu ezHR (nhiều khối cửa hàng)
  const handleExportWeekLayout = async () => {
    const XLSX = await import('xlsx');
    const wk = schedule[currentWeek] || {};
    const parts = currentWeek.split('-').map(Number);
    const monday = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
    const dateLabels = [];
    const dayNames = ['THỨ HAI', 'THỨ BA', 'THỨ TƯ', 'THỨ NĂM', 'THỨ SÁU', 'THỨ BẢY', 'CHỦ NHẬT'];
    WEEK_DAYS.forEach((_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      dateLabels.push(String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'));
    });
    const rowsOut = [];
    (stores.length ? stores : [{ id: '' }]).forEach(st => {
      const emps = employees.filter(e => e.dept === st.id);
      if (!emps.length) return;
      rowsOut.push(['Mã nhân viên', 'Họ và Tên', 'Phòng ban', 'Loại NV', ...dateLabels, '']);
      rowsOut.push(['', '', '', '', ...dayNames, '']);
      emps.forEach(e => {
        const days = wk[e.id] || {};
        const cells = WEEK_DAYS.map(dk => {
          const raw = days[dk];
          if (raw === undefined || raw === null || raw === '') return '';
          const code = getShiftCode(raw);
          if (code === 'off') return 'off';
          if (!code) return '';
          const cs = getCoveringStore(raw);
          return cs ? code + ' ' + cs : code;
        });
        rowsOut.push([e.id, e.name, e.dept, e.type, ...cells, '']);
      });
      rowsOut.push([]);
      rowsOut.push([]);
    });
    const ws = XLSX.utils.aoa_to_sheet(rowsOut);
    ws['!cols'] = [{ wch: 12 }, { wch: 26 }, { wch: 10 }, { wch: 8 }, ...WEEK_DAYS.map(() => ({ wch: 13 })), { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'LichTuan');
    XLSX.writeFile(wb, 'Lich_Tuan_' + currentWeek + '.xlsx');
  };

  // Đọc và phân tích file Excel/CSV
  const processFile = (fileObj) => {
    setErrorMsg('');
    setParsedData([]);
    if (!fileObj) return;

    setFile(fileObj);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const XLSX = await import('xlsx');
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Chuyển sang mảng 2 chiều
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        if (!rows || rows.length < 2) {
          setErrorMsg('File Excel không có dữ liệu hoặc không đủ số dòng!');
          return;
        }

        // 1. Tìm dòng tiêu đề (Header Row)
        let headerRowIdx = -1;
        let idCol = -1;
        let nameCol = -1;
        let deptCol = -1;
        let roleCol = -1;
        const dayCols = { T2: -1, T3: -1, T4: -1, T5: -1, T6: -1, T7: -1, CN: -1 };
        let dateColCount = 0;

        for (let r = 0; r < Math.min(rows.length, 10); r++) {
          const row = rows[r].map(c => String(c).trim().toLowerCase());
          
          row.forEach((cell, cIdx) => {
            if (cell.includes('mã nv') || cell.includes('mã nhân viên') || cell === 'mã' || cell === 'id' || cell.includes('manv')) idCol = cIdx;
            if (cell.includes('họ và tên') || cell.includes('họ tên') || cell === 'tên' || cell === 'name') nameCol = cIdx;
            if (cell.includes('cửa hàng') || cell.includes('phòng ban') || cell === 'dept' || cell === 'store') deptCol = cIdx;
            if (cell.includes('vị trí') || cell.includes('chức vụ') || cell === 'role' || cell.includes('loại nv')) roleCol = cIdx;

            // Cột ngày dạng dd/mm hoặc dd/mm/yyyy (mẫu ezHR): map tuần tự theo vị trí
            if (/^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(cell) && dateColCount < 7 && idCol !== -1) {
              const seq = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
              dayCols[seq[dateColCount]] = cIdx;
              dateColCount += 1;
            }

            // Thứ trong tuần
            if (cell === 't2' || cell.includes('thứ hai') || cell.includes('thứ 2') || cell === 'mon') dayCols.T2 = cIdx;
            if (cell === 't3' || cell.includes('thứ ba') || cell.includes('thứ 3') || cell === 'tue') dayCols.T3 = cIdx;
            if (cell === 't4' || cell.includes('thứ tư') || cell.includes('thứ 4') || cell === 'wed') dayCols.T4 = cIdx;
            if (cell === 't5' || cell.includes('thứ năm') || cell.includes('thứ 5') || cell === 'thu') dayCols.T5 = cIdx;
            if (cell === 't6' || cell.includes('thứ sáu') || cell.includes('thứ 6') || cell === 'fri') dayCols.T6 = cIdx;
            if (cell === 't7' || cell.includes('thứ bảy') || cell.includes('thứ 7') || cell === 'sat') dayCols.T7 = cIdx;
            if (cell === 'cn' || cell.includes('chủ nhật') || cell === 'sun') dayCols.CN = cIdx;
          });

          if (idCol !== -1 && (dayCols.T2 !== -1 || dayCols.T3 !== -1)) {
            headerRowIdx = r;
            break;
          }
        }

        if (headerRowIdx === -1 || idCol === -1) {
          // Fallback: nếu không tìm thấy header rõ ràng, thử tự nhận diện theo thứ tự cột mặc định
          headerRowIdx = 0;
          idCol = 0;
          nameCol = 1;
          deptCol = 2;
          roleCol = 3;
          dayCols.T2 = 4;
          dayCols.T3 = 5;
          dayCols.T4 = 6;
          dayCols.T5 = 7;
          dayCols.T6 = 8;
          dayCols.T7 = 9;
          dayCols.CN = 10;
        }

        // 2. Phân tích các dòng dữ liệu
        const parsedList = [];
        const existingEmpMap = new Map(employees.map(e => [e.id, e]));

        for (let r = headerRowIdx + 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length === 0) continue;

          let rawId = String(row[idCol] || '').trim();
          const rawIdLow = rawId.toLowerCase();
          if (!rawId || rawIdLow.includes('cửa hàng:') || rawIdLow.includes('tổng cộng')) continue;
          // Bỏ qua dòng header lặp (file mẫu ezHR lặp header theo từng khối CH)
          if (rawIdLow.includes('mã nhân') || rawIdLow.includes('mã nv')) continue;
          const rawNameLow = String(row[nameCol] || '').trim().toLowerCase();
          if (rawNameLow.includes('họ và tên') || rawNameLow.includes('họ tên')) continue;

          // Làm sạch mã NV
          const empId = rawId.replace(/\D/g, '') || rawId;
          const empName = String(row[nameCol] || '').trim() || `Nhân viên ${empId}`;
          const empDept = String(row[deptCol] || '').trim() || stores[0]?.id || '';
          const empRole = String(row[roleCol] || '').trim() || 'STPT';

          const shifts = {};
          WEEK_DAYS.forEach(dayKey => {
            const colIdx = dayCols[dayKey];
            if (colIdx !== -1 && row[colIdx] !== undefined) {
              const normalized = normalizeShiftCell(row[colIdx]);
              if (normalized) {
                shifts[dayKey] = normalized;
              }
            }
          });

          const isExisting = existingEmpMap.has(empId);

          parsedList.push({
            id: empId,
            name: empName,
            dept: empDept,
            role: empRole,
            type: empRole.includes('FT') ? 'STFT' : (empRole.includes('CSR') ? 'CSR_NEW' : 'STPT'),
            isExisting,
            shifts
          });
        }

        if (parsedList.length === 0) {
          setErrorMsg('Không tìm thấy bản ghi nhân viên hợp lệ nào trong file!');
        } else {
          setParsedData(parsedList);
        }
      } catch (err) {
        console.error('Lỗi phân tích file Excel:', err);
        setErrorMsg('Không thể đọc file: ' + (err.message || 'File không đúng định dạng'));
      }
    };

    reader.readAsArrayBuffer(fileObj);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleApply = async () => {
    if (parsedData.length === 0) return;

    setLoading(true);
    try {
      const destSched = { ...(schedule[currentWeek] || {}) };
      const currentEmps = [...employees];
      const existingEmpIds = new Set(currentEmps.map(e => e.id));
      const bulkUpdates = {};

      let addedEmpCount = 0;
      let updatedShiftCount = 0;

      for (const item of parsedData) {
        // 1. Nếu nhân viên chưa có trong hệ thống và bật autoCreate
        if (!existingEmpIds.has(item.id) && autoCreateEmps) {
          try {
            const newEmp = {
              id: item.id,
              name: item.name,
              dept: item.dept,
              role: item.role,
              type: item.type,
              maxH: item.type === 'STPT' ? 23 : 48
            };
            await api.addEmployee(newEmp);
            const provisioned = await provisionAuthUser(newEmp);
            if (!provisioned.ok) {
              console.warn(`NV ${item.id} đã lưu nhưng chưa tạo user Auth:`, provisioned.reason);
            }
            currentEmps.push(newEmp);
            existingEmpIds.add(item.id);
            addedEmpCount++;
          } catch (e) {
            console.warn(`Không thể thêm nhân viên ${item.id}:`, e);
          }
        }

        // 2. Gán ca làm việc
        const currentShifts = destSched[item.id] || {};
        const newShifts = { ...currentShifts };

        WEEK_DAYS.forEach(day => {
          if (item.shifts[day] !== undefined) {
            const rawVal = item.shifts[day];
            // Normalize nếu có chi viện
            if (rawVal.includes('_') || rawVal.includes(' VN')) {
              const parts = rawVal.replace(' VN', '_VN').split('_');
              newShifts[day] = {
                shift: parts[0].trim(),
                covering_store: parts[1] ? parts[1].trim() : ''
              };
            } else {
              newShifts[day] = rawVal.toLowerCase() === 'off' ? 'off' : rawVal;
            }
          }
        });

        destSched[item.id] = newShifts;
        bulkUpdates[item.id] = newShifts;
        updatedShiftCount++;
      }

      if (Object.keys(bulkUpdates).length > 0) {
        await api.saveBulkEmployeeSchedules(currentWeek, bulkUpdates);
        useStore.getState().appendAdminLog('IMPORT_SHIFT_EXCEL', currentWeek, `${updatedShiftCount} NV, thêm mới ${addedEmpCount}`, {
          resourceType: 'shift',
          resourceId: currentWeek,
          description: `Nhập Excel tuần ${currentWeek}: cập nhật ${updatedShiftCount} NV, thêm ${addedEmpCount}`
        });
      }

      // 3. Cập nhật Store
      useStore.setState({
        employees: currentEmps,
        schedule: {
          ...useStore.getState().schedule,
          [currentWeek]: destSched
        }
      });

      toast.success(`✅ Nhập lịch thành công!\n- Đã cập nhật lịch cho ${updatedShiftCount} nhân sự vào Tuần ${currentWeek}.\n${addedEmpCount > 0 ? `- Tự động thêm ${addedEmpCount} nhân sự mới vào danh sách.` : ''}`);
      onClose();
    } catch (err) {
      console.error('Lỗi khi áp dụng lịch:', err);
      toast.error('Đã xảy ra lỗi khi lưu lịch: ' + (err.message || 'Lỗi kết nối'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Nhập Lịch Làm Việc từ Excel / CSV" isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4 max-h-[80vh] flex flex-col">
        {/* Top Actions: Template Download */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="text-xs text-slate-600">
            Nhận cả mẫu ezHR (header lặp theo cửa hàng, cột ngày 24/8, ca kiểu <code>6h-18h</code>, <code>22-6 VN0497</code>).
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportWeekLayout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Xuất lịch tuần hiện tại ra đúng bố cục mẫu ezHR (nhiều khối cửa hàng)"
            >
              <FileDown size={13} />
              <span>Xuất lịch tuần (mẫu ezHR)</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Download size={13} />
              <span>Tải file Excel mẫu (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Drag & Drop Zone */}
        {!file && (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
              isDragging ? 'border-blue-500 bg-blue-50/80 scale-[0.99]' : 'border-slate-300 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-400'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
              <Upload size={22} />
            </div>
            <div className="font-bold text-sm text-slate-800">
              Kéo thả file Excel / CSV vào đây hoặc <span className="text-blue-600 underline">chọn từ máy tính</span>
            </div>
            <p className="text-xs text-slate-400">Dung lượng tối đa 10MB (.xlsx, .xls, .csv)</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => e.target.files && processFile(e.target.files[0])}
            />
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* File Loaded & Preview */}
        {file && parsedData.length > 0 && (
          <div className="space-y-3 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 px-3.5 py-2.5 rounded-xl text-xs text-blue-900">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="text-blue-600" size={16} />
                <span className="font-bold">{file.name}</span>
                <span className="text-slate-500 font-normal">({parsedData.length} nhân sự tìm thấy)</span>
              </div>
              <button
                type="button"
                onClick={() => { setFile(null); setParsedData([]); }}
                className="text-slate-500 hover:text-red-600 p-1 rounded-md hover:bg-white transition-colors cursor-pointer"
                title="Chọn file khác"
              >
                <X size={14} />
              </button>
            </div>

            {/* Option Checkbox */}
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoCreateEmps}
                onChange={e => setAutoCreateEmps(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <span>Tự động thêm nhân viên mới vào hệ thống nếu Mã NV chưa tồn tại</span>
            </label>

            {/* Preview Table */}
            <div className="flex-1 overflow-auto border border-slate-200 rounded-xl max-h-[300px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 sticky top-0 font-bold text-slate-700">
                    <th className="p-2">Mã NV</th>
                    <th className="p-2">Họ và Tên</th>
                    <th className="p-2">Cửa hàng</th>
                    <th className="p-2 text-center">Vị trí</th>
                    {WEEK_DAYS.map(d => (
                      <th key={d} className="p-2 text-center w-12">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {parsedData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 font-bold text-slate-800">
                        {row.id}
                        {!row.isExisting && (
                          <span className="ml-1 text-[9px] font-sans font-extrabold px-1 rounded bg-amber-100 text-amber-800 border border-amber-200">
                            Mới
                          </span>
                        )}
                      </td>
                      <td className="p-2 font-sans font-semibold text-slate-800 truncate max-w-[140px]">{row.name}</td>
                      <td className="p-2 text-blue-700 font-bold">{row.dept}</td>
                      <td className="p-2 text-center font-sans text-slate-600">{row.role}</td>
                      {WEEK_DAYS.map(d => {
                        const shiftVal = row.shifts[d];
                        const isOff = !shiftVal || shiftVal.toLowerCase() === 'off';
                        return (
                          <td key={d} className="p-1 text-center font-bold">
                            {isOff ? (
                              <span className="text-slate-300">-</span>
                            ) : (
                              <span className="px-1 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px]">
                                {shiftVal}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Tuần đích: <strong className="text-blue-700">{currentWeek}</strong>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn btn-outline text-xs px-4 py-2 cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={loading || parsedData.length === 0}
              className="btn btn-primary text-xs px-4 py-2 flex items-center gap-1.5 font-bold shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload size={14} />
              <span>{loading ? 'Đang lưu lịch...' : `Áp dụng ${parsedData.length} nhân sự`}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
