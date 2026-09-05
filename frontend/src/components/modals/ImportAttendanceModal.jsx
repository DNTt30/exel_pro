import React, { useState, useRef, useMemo } from 'react';
import Modal from './Modal';
import { FileSpreadsheet, Download, CheckCircle2, AlertTriangle, Clock, Users, RefreshCw, X, AlertCircle } from 'lucide-react';
import { toast } from '../ui/toastStore';
import { parseEzHRAttendance } from '../../utils/ezhrAttendanceParser';
import { useStore } from '../../store/useStore';

export default function ImportAttendanceModal({
  isOpen,
  onClose,
  payrollCycle,
  cycleDates = [],
  employees = [],
  schedule = {}
}) {
  const user = useStore(st => st.user);
  const applyBulkAttendance = useStore(st => st.applyBulkAttendance);

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [parsedResult, setParsedResult] = useState(null);
  const [filterType, setFilterType] = useState('ALL'); // ALL, DIFF, OT, UNDER, ABSENT
  const fileInputRef = useRef(null);

  const resetState = () => {
    setFile(null);
    setLoading(false);
    setApplying(false);
    setErrorMsg('');
    setParsedResult(null);
    setFilterType('ALL');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Tải file mẫu Excel ezHR9
  const handleDownloadSample = async () => {
    try {
      const XLSX = await import('xlsx');
      const headerRow = ['STT', 'Mã NV', 'Họ và tên', 'Cửa hàng'];
      cycleDates.forEach(cd => {
        headerRow.push(cd.shortDisplay || cd.display);
      });

      const sampleRows = [
        ['BẢNG TỔNG HỢP CÔNG THÁNG (MẪU EZHR9)'],
        [`Chu kỳ lương: Tháng ${payrollCycle?.month}/${payrollCycle?.year}`],
        headerRow
      ];

      // Dữ liệu mẫu 2-3 nhân viên
      (employees.slice(0, 3)).forEach((emp, idx) => {
        const row = [idx + 1, emp.id, emp.name, emp.dept || 'VN0485'];
        cycleDates.forEach((_, dIdx) => {
          if (dIdx % 7 === 6) row.push('OFF'); // Chủ nhật
          else if (dIdx === 1) row.push('7,84'); // Giờ lẻ ezHR9
          else if (dIdx === 3) row.push('AL');   // Phép
          else row.push(8);                      // 8h
        });
        sampleRows.push(row);
      });

      const ws = XLSX.utils.aoa_to_sheet(sampleRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Mau_ezHR9');
      XLSX.writeFile(wb, `Mau_Cham_Cong_ezHR9_T${payrollCycle?.month || '09'}.xlsx`);
      toast.success('Đã tải file Excel mẫu ezHR9!');
    } catch (e) {
      toast.error('Lỗi tạo file mẫu: ' + e.message);
    }
  };

  // Đọc và phân tích file Excel
  const processFile = (fileObj) => {
    setErrorMsg('');
    setParsedResult(null);
    if (!fileObj) return;

    setFile(fileObj);
    setLoading(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const XLSX = await import('xlsx');
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        const result = parseEzHRAttendance({
          rows,
          cycleDates,
          employees,
          schedule
        });

        if (!result.success) {
          setErrorMsg(result.error || 'Không tìm thấy dữ liệu chấm công hợp lệ trong file!');
          setParsedResult(null);
        } else {
          setParsedResult(result);
          toast.success(`Đã nhận diện ${result.totalRecords} ô công của ${result.matchedEmployeesCount} nhân viên!`);
        }
      } catch (err) {
        console.error(err);
        setErrorMsg('Lỗi khi đọc file Excel: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setErrorMsg('Không thể đọc file từ thiết bị của bạn!');
      setLoading(false);
    };

    reader.readAsArrayBuffer(fileObj);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Danh sách hiển thị sau khi lọc
  const filteredRecords = useMemo(() => {
    if (!parsedResult?.records) return [];
    if (filterType === 'ALL') return parsedResult.records;
    if (filterType === 'DIFF') return parsedResult.records.filter(r => r.status !== 'MATCH' && r.status !== 'OFF_MATCH');
    if (filterType === 'OT') return parsedResult.records.filter(r => r.status === 'OVER' || r.status === 'OFF_WORK');
    if (filterType === 'UNDER') return parsedResult.records.filter(r => r.status === 'UNDER');
    if (filterType === 'ABSENT') return parsedResult.records.filter(r => r.status === 'ABSENT');
    if (filterType === 'LEAVE') return parsedResult.records.filter(r => r.status === 'LEAVE');
    return parsedResult.records;
  }, [parsedResult, filterType]);

  // Áp dụng lưu công thực tế hàng loạt
  const handleApply = async () => {
    if (!parsedResult || !parsedResult.records.length) return;
    try {
      setApplying(true);
      const count = await applyBulkAttendance(parsedResult.records, user?.id);
      toast.success(`✅ Đã nạp thành công ${count} ô công thực tế từ ezHR9!`);
      handleClose();
    } catch (e) {
      toast.error('Lỗi khi lưu dữ liệu chấm công: ' + e.message);
    } finally {
      setApplying(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="📥 Nhập Công Thực Tế từ File Excel ezHR9"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4 max-h-[82vh] flex flex-col text-slate-800">
        
        {/* Bước 1: Kéo thả file nếu chưa có dữ liệu */}
        {!parsedResult && (
          <div className="space-y-3">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                loading
                  ? 'bg-slate-50 border-slate-300'
                  : 'bg-indigo-50/50 border-indigo-300 hover:bg-indigo-50 hover:border-indigo-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    processFile(e.target.files[0]);
                  }
                }}
              />

              {loading ? (
                <>
                  <RefreshCw className="animate-spin text-indigo-600" size={40} />
                  <p className="text-sm font-bold text-slate-700">Đang quét và phân tích file Excel ezHR9...</p>
                </>
              ) : (
                <>
                  <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl shadow-xs">
                    <FileSpreadsheet size={36} />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-slate-800">
                      Kéo thả file Excel ezHR9 vào đây, hoặc <span className="text-indigo-600 underline">bấm để chọn file</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Hỗ trợ định dạng .xlsx, .xls, .csv xuất từ máy chấm công vân tay / app ezHR9
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-white/80 px-3 py-1 rounded-full border border-slate-200">
                    <span>✓ Tự động nhận diện số lẻ <strong>7,84</strong></span>
                    <span>•</span>
                    <span>✓ Nhận cả bảng ma trận & danh sách dọc</span>
                    <span>•</span>
                    <span>✓ Nhận diện <strong>0</strong>, <strong>OFF</strong>, <strong>AL</strong></span>
                  </div>
                </>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Hàng nút phụ: Mẫu tải về */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Chưa có file mẫu? Tải file mẫu ezHR9 chuẩn chu kỳ Tháng {payrollCycle?.month}/{payrollCycle?.year}:
              </span>
              <button
                type="button"
                onClick={handleDownloadSample}
                className="btn btn-outline text-xs py-1 px-2.5 rounded-xl flex items-center gap-1.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
              >
                <Download size={13} /> Tải file mẫu ezHR9
              </button>
            </div>
          </div>
        )}

        {/* Bước 2: Bảng Preview đối soát khi đã phân tích thành công */}
        {parsedResult && (
          <div className="flex-1 flex flex-col space-y-3 min-h-0">
            
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-indigo-50 border border-indigo-200 p-2.5 rounded-xl">
                <div className="text-[10px] text-indigo-700 font-bold uppercase flex items-center gap-1">
                  <Users size={12} /> Khớp nhân sự
                </div>
                <div className="text-lg font-black text-indigo-950 mt-0.5">
                  {parsedResult.matchedEmployeesCount} <span className="text-xs font-normal text-indigo-700">nhân viên</span>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                <div className="text-[10px] text-emerald-700 font-bold uppercase flex items-center gap-1">
                  <Clock size={12} /> Tổng giờ ezHR9
                </div>
                <div className="text-lg font-black text-emerald-950 mt-0.5">
                  {parsedResult.stats.totalHours.toLocaleString('vi-VN')} <span className="text-xs font-normal text-emerald-700">giờ</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                <div className="text-[10px] text-amber-800 font-bold uppercase flex items-center gap-1">
                  <AlertTriangle size={12} /> Ô lệch giờ lịch
                </div>
                <div className="text-lg font-black text-amber-950 mt-0.5">
                  {parsedResult.stats.diffCount} <span className="text-xs font-normal text-amber-800">ngày lệch</span>
                </div>
              </div>

              <div className="bg-slate-100 border border-slate-200 p-2.5 rounded-xl">
                <div className="text-[10px] text-slate-600 font-bold uppercase flex items-center gap-1">
                  <CheckCircle2 size={12} /> Tổng ô nạp
                </div>
                <div className="text-lg font-black text-slate-800 mt-0.5">
                  {parsedResult.totalRecords} <span className="text-xs font-normal text-slate-600">ô công</span>
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs pt-1">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFilterType('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    filterType === 'ALL' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả ({parsedResult.records.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('DIFF')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    filterType === 'DIFF' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  Có lệch giờ ({parsedResult.stats.diffCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('OT')}
                  className={`px-2 py-1 rounded-lg font-bold transition-all ${
                    filterType === 'OT' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-700 hover:bg-purple-50'
                  }`}
                >
                  Tăng ca ({parsedResult.stats.otCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('UNDER')}
                  className={`px-2 py-1 rounded-lg font-bold transition-all ${
                    filterType === 'UNDER' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  Thiếu giờ ({parsedResult.stats.underCount})
                </button>
              </div>

              <button
                type="button"
                onClick={resetState}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 underline"
              >
                <X size={13} /> Chọn file khác
              </button>
            </div>

            {/* Bảng chi tiết Preview */}
            <div className="flex-1 overflow-auto border border-slate-200 rounded-xl max-h-[40vh] bg-white shadow-2xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="p-2 w-10 text-center">STT</th>
                    <th className="p-2">Nhân viên</th>
                    <th className="p-2 text-center w-20">Ngày</th>
                    <th className="p-2 text-center w-28">Lịch xếp</th>
                    <th className="p-2 text-center w-28">Thực tế ezHR9</th>
                    <th className="p-2 text-center w-28">Chênh lệch</th>
                    <th className="p-2 text-center w-24">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredRecords.slice(0, 150).map((r, idx) => {
                    const isDiff = r.diff !== 0 && r.status !== 'OFF_MATCH';
                    return (
                      <tr key={r.empId + '_' + r.workDate} className="hover:bg-slate-50">
                        <td className="p-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-2">
                          <div className="font-bold text-slate-800">{r.empName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{r.empId} • {r.empDept}</div>
                        </td>
                        <td className="p-2 text-center font-mono font-bold text-slate-700">
                          {r.dayKey} {r.shortDisplay}
                        </td>
                        <td className="p-2 text-center text-slate-600">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[11px] font-semibold">
                            {r.plannedShift} ({r.plannedHours}h)
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          {r.actualHours !== null ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-black bg-amber-100 text-amber-950 border border-amber-300">
                              {r.actualHours}h
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-sky-100 text-sky-800">
                              {r.note}
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-center font-bold">
                          {r.status === 'OFF_WORK' ? (
                            <span className="text-purple-700 font-black">+{r.actualHours}h (Đi làm OFF)</span>
                          ) : r.status === 'OVER' ? (
                            <span className="text-emerald-700 font-black">+{r.diff}h (Tăng ca)</span>
                          ) : r.status === 'UNDER' ? (
                            <span className="text-rose-700 font-black">{r.diff}h (Về sớm/Trễ)</span>
                          ) : r.status === 'ABSENT' ? (
                            <span className="text-red-700 font-black">Vắng ca ({r.diff}h)</span>
                          ) : r.status === 'LEAVE' ? (
                            <span className="text-sky-700">Nghỉ phép ({r.note})</span>
                          ) : (
                            <span className="text-emerald-600">✓ Khớp chuẩn</span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isDiff ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredRecords.length > 150 && (
                <div className="p-2 text-center text-xs text-slate-500 bg-slate-50 border-t">
                  Đang hiển thị 150 / {filteredRecords.length} dòng bản ghi.
                </div>
              )}
            </div>

            {/* Unmatched warning */}
            {parsedResult.unmatchedEmployees.length > 0 && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} className="text-amber-700 shrink-0" />
                  <span>
                    Có <strong>{parsedResult.unmatchedEmployees.length}</strong> dòng không tìm thấy mã nhân viên trong hệ thống (sẽ được bỏ qua).
                  </span>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="text-xs text-slate-600">
                File: <strong>{file?.name}</strong> • Định dạng: <strong>{parsedResult.format === 'MATRIX' ? 'Ma trận bảng ngày' : 'Danh sách dòng'}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn btn-outline text-xs py-1.5 px-3 rounded-xl"
                  disabled={applying}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={applying}
                  className="btn btn-primary text-xs py-1.5 px-4 rounded-xl flex items-center gap-1.5 shadow-md font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {applying ? (
                    <>
                      <RefreshCw className="animate-spin" size={14} /> Đang lưu {parsedResult.totalRecords} ô công...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} /> Xác Nhận Áp Dụng ({parsedResult.totalRecords} ô)
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </Modal>
  );
}
