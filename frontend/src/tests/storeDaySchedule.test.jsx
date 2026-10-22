import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import StoreDaySchedule from '../components/schedule/StoreDaySchedule';
import { WEEK_DAYS } from '../data/constants';
const days = cell => Object.fromEntries(WEEK_DAYS.map(d => [d, cell]));
it('shows later shifts before OFF and preserves pending registration status', () => {
  const html = renderToStaticMarkup(<StoreDaySchedule week="2026-10-19" userId="a" groupedEmployees={{ A: [{ id: 'a', name: 'An' }, { id: 'b', name: 'Bình' }, { id: 'c', name: 'Chi' }] }} schedule={{ a: days('off'), b: days('14-22'), c: days({ shift: '22-6', registered: true }) }} />);
  expect(html.indexOf('Bình')).toBeLessThan(html.indexOf('Chi'));
  expect(html.indexOf('Chi')).toBeLessThan(html.indexOf('An (Bạn)'));
  expect(html).toContain('Nghỉ (OFF)');
  expect(html).toContain('Đăng ký · chưa chốt');
});
it('shows support only on the assigned day and labels outbound support', () => {
  const html = renderToStaticMarkup(<StoreDaySchedule week="2026-10-19" groupedEmployees={{ A: [{ id: 'a', name: 'An' }, { id: 'b', name: 'Bình', isBorrowedTo: 'A' }, { id: 'c', name: 'Chi', isBorrowedTo: 'A' }] }} schedule={{ a: days('6-14_B'), b: days('14-22_A'), c: days('6-14') }} />);
  expect(html).toContain('Hỗ trợ B');
  expect(html).toContain('Bình (Hỗ trợ)');
  expect(html).not.toContain('Chi');
});
