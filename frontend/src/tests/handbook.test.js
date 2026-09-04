import { describe, it, expect } from 'vitest';
import { GS25_HANDBOOK_DATA } from '../data/gs25HandbookData';
import { answerHandbookQuestions } from '../utils/copilotIntents';
import { stripVi } from '../data/ffOnsiteRecipes';

describe('GS25 Handbook Data Structure', () => {
  it('contains all 8 store operational scan documents', () => {
    expect(GS25_HANDBOOK_DATA.originalScans).toHaveLength(8);
    const filenames = GS25_HANDBOOK_DATA.originalScans.map(s => s.filename);
    expect(filenames).toContain('chat_luong_gio_huy.jpg');
    expect(filenames).toContain('hoa_chat_saraya.jpg');
    expect(filenames).toContain('hoa_chat_ecolab.jpg');
    expect(filenames).toContain('lich_ve_sinh_ca.jpg');
    expect(filenames).toContain('sop_che_bien_lau.jpg');
    expect(filenames).toContain('sop_ban_hang_lau.jpg');
    expect(filenames).toContain('ve_sinh_counter.jpg');
    expect(filenames).toContain('ve_sinh_tay.jpg');
  });

  it('has 3 shift cleaning definitions covering all days T2-CN', () => {
    const shifts = GS25_HANDBOOK_DATA.cleaningRoster.shifts;
    expect(shifts.ca1).toBeDefined();
    expect(shifts.ca2).toBeDefined();
    expect(shifts.ca3).toBeDefined();

    ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].forEach(d => {
      expect(shifts.ca1.days[d].length).toBeGreaterThan(0);
      expect(shifts.ca2.days[d].length).toBeGreaterThan(0);
      expect(shifts.ca3.days[d].length).toBeGreaterThan(0);
    });
  });

  it('includes 6 color codes for Saraya chemical system', () => {
    const saraya = GS25_HANDBOOK_DATA.chemicals.systems[0];
    expect(saraya.provider).toContain('SARAYA');
    expect(saraya.items).toHaveLength(6);
  });

  it('contains hotpot SOP recipes and microwave buttons 3 and 5', () => {
    const sops = GS25_HANDBOOK_DATA.hotpotSOP.servingSOP;
    expect(sops).toHaveLength(2);
    expect(sops[0].microwave.commercial).toContain('SỐ 3');
    expect(sops[1].microwave.commercial).toContain('SỐ 5');
  });
});

describe('AI Copilot Handbook Intent Q&A', () => {
  it('answers discard hours questions', () => {
    const q1 = stripVi('khi nao huy hang');
    const ans1 = answerHandbookQuestions(q1);
    expect(ans1).toContain('11:00 & 22:00');
    expect(ans1).toContain('19:00');

    const q2 = stripVi('gio huy sandwich');
    const ans2 = answerHandbookQuestions(q2);
    expect(ans2).toContain('11:00 & 22:00');
  });

  it('answers microwave numbers questions', () => {
    const q = stripVi('lo vi song bam so may');
    const ans = answerHandbookQuestions(q);
    expect(ans).toContain('SỐ 3');
    expect(ans).toContain('SỐ 5');
  });

  it('answers hotpot soup recipes questions', () => {
    const q = stripVi('cong thuc nau sup cha ca');
    const ans = answerHandbookQuestions(q);
    expect(ans).toContain('2000ml');
    expect(ans).toContain('2000W');
    expect(ans).toContain('15 phút');
  });

  it('answers Saraya chemical questions', () => {
    const q = stripVi('hoa chat saraya');
    const ans = answerHandbookQuestions(q);
    expect(ans).toContain('H-1 Smart San');
    expect(ans).toContain('S-4 Sanitizer');
    expect(ans).toContain('N-12 Sara Wash');
    expect(ans).toContain('G-2 Smart San Degreaser');
  });

  it('answers shift cleaning and fryer oil change questions', () => {
    const q = stripVi('ve sinh ca 3 va thay dau');
    const ans = answerHandbookQuestions(q);
    expect(ans).toContain('Ca 3');
    expect(ans).toContain('THAY DẦU BẾP CHIÊN');
  });
});
