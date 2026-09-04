// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import MonthConfirmCard from '../components/employee/MonthConfirmCard';
import { useStore } from '../store/useStore';

describe('MonthConfirmCard stability test', () => {
  it('does not cause React 19 getSnapshot infinite loop (Error #185)', async () => {
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
      await new Promise(r => setTimeout(r, 100));
    } catch (e) {
      error = e;
    }

    expect(error).toBeNull();
  });
});
