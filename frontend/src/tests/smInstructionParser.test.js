import { describe, it, expect } from 'vitest';
import { parseSmInstructions, buildDateToDayKeyMap } from '../utils/smInstructionParser';
import { generateAISchedule } from '../utils/aiSchedulerEngine';

describe('smInstructionParser', () => {
  const currentWeek = '2026-09-14'; // Monday is 14/09 -> 15 is T3, 18 is T6, 19 is T7

  it('buildDateToDayKeyMap tinh dung ngay trong tuan', () => {
    const map = buildDateToDayKeyMap(currentWeek);
    expect(map[14]).toBe('T2');
    expect(map[15]).toBe('T3');
    expect(map[16]).toBe('T4');
    expect(map[17]).toBe('T5');
    expect(map[18]).toBe('T6');
    expect(map[19]).toBe('T7');
    expect(map[20]).toBe('CN');
  });

  it('phan tich dung lenh: ca dem ngay 15 18 19 xep 2 nguoi vi hang ve nhieu', () => {
    const text = 'ca dem co the xep 2 nguoi vao nhung hom 15 18 19 vi hang ve nhieu';
    const result = parseSmInstructions(text, currentWeek);

    expect(result.dayOverrides['T3']?.['22-6']?.min).toBe(2);
    expect(result.dayOverrides['T6']?.['22-6']?.min).toBe(2);
    expect(result.dayOverrides['T7']?.['22-6']?.min).toBe(2);
    expect(result.appliedRules.length).toBeGreaterThanOrEqual(1);
    expect(result.appliedRules[0]).toContain('22-6');
  });

  it('phan tich dung nhu cau thoi tiet: mua -> giam nhan su', () => {
    const text = 'tuan sau co mua nen khach giam -> giam nhan su';
    const result = parseSmInstructions(text, currentWeek);

    expect(result.demandFactor).toBeLessThan(1.0);
    expect(result.appliedRules.some(r => r.includes('Nhân sự toàn tuần'))).toBe(true);
  });

  it('phan tich lenh ket hop ca override lan demand modifier', () => {
    const text = 'co mua nen khach giam -> giam nhan su. ca dem xep 2 nguoi vao ngay 15 18 19 vi hang ve';
    const result = parseSmInstructions(text, currentWeek);

    expect(result.demandFactor).toBeLessThan(1.0);
    expect(result.dayOverrides['T3']?.['22-6']?.min).toBe(2);
    expect(result.appliedRules.length).toBeGreaterThanOrEqual(2);
  });

  it('ho tro ten thu truc tiep: thu 3 ca sang xep 3 nguoi', () => {
    const text = 'thu 3 ca sang xep 3 nguoi';
    const result = parseSmInstructions(text, currentWeek);

    expect(result.dayOverrides['T3']?.['6-14']?.min).toBe(3);
  });

  it('xu ly an toan khi chuoi rong hoac khong hop le', () => {
    expect(parseSmInstructions('', currentWeek)).toEqual({
      dayOverrides: {},
      employeeOverrides: {},
      nightVolunteers: [],
      demandFactor: 1.0,
      globalReason: '',
      appliedRules: []
    });
    expect(parseSmInstructions(null, currentWeek)).toEqual({
      dayOverrides: {},
      employeeOverrides: {},
      nightVolunteers: [],
      demandFactor: 1.0,
      globalReason: '',
      appliedRules: []
    });
  });

  it('phan tich dung lenh chi dao dich danh nhan vien (nghi & ca cu the)', () => {
    const mockEmps = [
      { id: 'ft1', name: 'Nguyễn Văn A', dept: 'VN0485' },
      { id: 'pt1', name: 'Phạm Thị D', dept: 'VN0485' }
    ];
    const text = 'cho Nguyen Van A nghi thu 6. Pham Thi D lam ca chieu thu 2 va uu tien D lam ca dem';
    const result = parseSmInstructions(text, currentWeek, mockEmps);

    expect(result.employeeOverrides['ft1']?.['T6']).toBe('off');
    expect(result.employeeOverrides['pt1']?.['T2']).toBe('14-22');
    expect(result.nightVolunteers).toContain('pt1');
    expect(result.appliedRules.some(r => r.includes('Nguyễn Văn A') && r.includes('NGHỈ'))).toBe(true);
    expect(result.appliedRules.some(r => r.includes('Phạm Thị D') && r.includes('14-22'))).toBe(true);
  });
});

describe('generateAISchedule voi SM Overrides', () => {
  const currentWeek = '2026-09-14';
  const emps = [
    { id: 'ft1', name: 'Nguyễn Văn A', dept: 'VN0485', type: 'STFT' },
    { id: 'ft2', name: 'Trần Văn B', dept: 'VN0485', type: 'STFT' },
    { id: 'ft3', name: 'Lê Văn C', dept: 'VN0485', type: 'STFT' },
    { id: 'pt1', name: 'Phạm Thị D', dept: 'VN0485', type: 'STPT' },
    { id: 'pt2', name: 'Hoàng Văn E', dept: 'VN0485', type: 'STPT' }
  ];

  it('ap dung smOverrides vao lich ket qua: ngay T3 ca 22-6 co 2 nguoi', () => {
    const text = 'ca dem ngay 15 xep 2 nguoi vi hang ve nhieu';
    const parsed = parseSmInstructions(text, currentWeek);

    const res = generateAISchedule(emps, 'VN0485', {
      smOverrides: parsed.dayOverrides,
      demandFactor: parsed.demandFactor,
      smNotes: text
    });

    const nightStaffT3 = emps.filter(e => res.schedule[e.id]?.T3 === '22-6');
    expect(nightStaffT3.length).toBeGreaterThanOrEqual(2);
    expect(res.insights.some(i => i.includes('Lệnh SM'))).toBe(true);
    expect(res.insights.some(i => i.includes('Override theo lệnh SM'))).toBe(true);
  });

  it('ap dung employeeOverrides tu SM cho nhan vien cu the nghi hoac lam ca', () => {
    const text = 'cho Tran Van B nghi thu 4. Hoang Van E lam ca 14-22 thu 2';
    const parsed = parseSmInstructions(text, currentWeek, emps);

    const res = generateAISchedule(emps, 'VN0485', {
      employeeOverrides: parsed.employeeOverrides,
      smNotes: text
    });

    expect(res.schedule['ft2']?.T4).toBe('off');
    expect(res.schedule['pt2']?.T2).toBe('14-22');
  });
});