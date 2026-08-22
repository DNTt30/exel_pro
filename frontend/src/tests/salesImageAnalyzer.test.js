import { describe, it, expect } from 'vitest';
import { parseDemandFromText, parseMoneyToken, mergeDemand } from '../utils/salesImageAnalyzer';

describe('salesImageAnalyzer', () => {
  it('parses VND tokens', () => {
    expect(parseMoneyToken('12.500.000')).toBe(12500000);
    expect(parseMoneyToken('12,5 triệu')).toBe(12500000);
    expect(parseMoneyToken('15tr')).toBe(15000000);
  });

  it('reads Direct-style weekday sales and customers', () => {
    const { demand, found } = parseDemandFromText(
      'Báo cáo T2-T6 GS25 Direct: Lượt khách 310 — Doanh số 12.400.000đ. Cuối tuần T7 CN lượt khách 420 doanh số 18.200.000'
    );
    expect(found).toBe(true);
    expect(demand.weekday.customers).toBe(310);
    expect(demand.weekday.sales).toBe(12400000);
    expect(demand.weekend.customers).toBe(420);
    expect(demand.weekend.sales).toBe(18200000);
  });

  it('fills weekend from weekday when only one bucket exists', () => {
    const { demand } = parseDemandFromText('Ngày thường doanh số 10.000.000 lượt khách 200');
    expect(demand.weekday.sales).toBe(10000000);
    expect(demand.weekend.sales).toBe(12500000);
  });

  it('merges two image results', () => {
    const a = parseDemandFromText('T2 T6 doanh số 8.000.000').demand;
    const b = parseDemandFromText('T7 CN doanh số 12.000.000').demand;
    const m = mergeDemand(a, b);
    expect(m.weekday.sales).toBe(8000000);
    expect(m.weekend.sales).toBe(12000000);
  });

  it('reads JSON from a vision model', () => {
    const { demand } = parseDemandFromText('```json\n{"weekday":{"customers":250,"sales":9000000},"weekend":{"customers":400,"sales":15000000},"notes":"ok"}\n```');
    expect(demand.weekday.customers).toBe(250);
    expect(demand.weekend.sales).toBe(15000000);
  });
});
