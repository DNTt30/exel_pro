// @vitest-environment happy-dom
import React from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import MonthConfirmCard from '../components/employee/MonthConfirmCard';
import { useStore } from '../store/useStore';

vi.mock('../services/api', () => ({
  getSchedulesByWeeks: vi.fn().mockResolvedValue({}),
  getAttendanceRange: vi.fn().mockResolvedValue([]),
  getFeedbacks: vi.fn().mockResolvedValue([])
}));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => vi.useRealTimers());

describe('MonthConfirmCard stability test', () => {
  it.each([24, 25])('does not cause React 19 getSnapshot infinite loop on day %i', async day => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, day, 12));
    useStore.setState({
      user: {
        id: '2405001',
        name: 'Duong Ng?c Tú',
        role: 'employee',
        type: 'STFT',
        dept: 'GS01'
      },
      schedule: {},
      attendance: {}
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    let error = null;
    try {
      await act(async () => {
        root.render(<MonthConfirmCard />);
      });
      await new Promise(r => setTimeout(r, 50));
    } catch (e) {
      error = e;
    } finally {
      try {
        await act(async () => {
          root.unmount();
        });
      } catch {}
      container.remove();
    }

    expect(error).toBeNull();
  });
});
