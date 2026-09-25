// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AICopilotDrawer from '../components/ai/AICopilotDrawer';
import { useStore } from '../store/useStore';
import { requiredDecisionWeeks } from '../utils/aiDecisionEngine';

vi.mock('../services/api', async importOriginal => ({ ...await importOriginal(), decideAssistantAgent: vi.fn().mockResolvedValue(null) }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const initial = useStore.getState();
afterEach(() => { useStore.setState(initial, true); localStorage.clear(); });

describe('Copilot integration with assistant workers', () => {
  it.each(['ALL', 'A,B'])('preserves %s for multi-store managers and loads adjacent/monthly schedules before review', async storeId => {
    const week = '2026-09-21';
    const schedule = Object.fromEntries(requiredDecisionWeeks(week).map(w => [w, {
      e1: { T2: '6-14', T3: '6-14', T4: '6-14' },
      e2: { T2: '6-14' }, private: { T2: '22-6' },
    }]));
    schedule['2026-09-14'].e1.CN = '22-6';
    const ensureWeeksLoaded = vi.fn(async () => useStore.setState({ schedule }));
    const logAiTurn = vi.fn();
    localStorage.clear();
    useStore.setState({
      user: { id: 'manager', name: 'Manager', role: 'SM', dept: 'A,B' },
      employees: [{ id: 'e1', name: 'Allowed A', dept: 'A', type: 'STPT' }, { id: 'e2', name: 'Allowed B', dept: 'B', type: 'STFT' }, { id: 'private', name: 'Private C', dept: 'C', type: 'STFT' }],
      stores: ['A', 'B', 'C'].map(id => ({ id, name: id })),
      schedule: { [week]: schedule[week] }, currentWeek: week, feedbacks: [], shiftSwaps: [],
      shelves: ['A', 'B', 'C'].map(id => ({ id, storeId: id, assigneeId: 'manager' })),
      shelfItems: ['A', 'B', 'C'].map(id => ({ id, shelfId: id, productName: `Product ${id}`, qty: 1, expiryDate: '2099-01-01' })),
      ensureWeeksLoaded, logAiTurn,
    });
    const container = document.createElement('div'); document.body.appendChild(container);
    const root = createRoot(container);
    try {
      await act(async () => root.render(<AICopilotDrawer isOpen onClose={() => {}} currentWeek={week} storeId={storeId} />));
      const button = [...container.querySelectorAll('button')].find(b => b.textContent.includes('Kiểm tra lịch và hạn sử dụng'));
      expect(button).toBeDefined();
      await act(async () => button.click());
      expect(ensureWeeksLoaded).toHaveBeenCalledWith(requiredDecisionWeeks(week));
      expect(logAiTurn).toHaveBeenCalledOnce();
      const reply = logAiTurn.mock.calls[0][0];
      expect(reply.model).toBe('rule-agent-orchestrator');
      expect(reply.assistantResponse).toContain('Product A');
      expect(reply.assistantResponse).toContain('Product B');
      expect(reply.assistantResponse).not.toMatch(/Product C|Private C/);
      expect(reply.assistantResponse).toContain('Nghỉ 0h');
      expect(reply.assistantResponse).toContain('Tháng 2026-09 vượt 91h');
      expect(reply.assistantResponse).not.toContain('Điểm tạm tính');
    } finally { await act(async () => root.unmount()); container.remove(); }
  });
});
