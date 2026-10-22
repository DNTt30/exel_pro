import { expect, it, vi } from 'vitest';
vi.mock('../services/geminiService',()=>({streamGeminiMultiTurn:vi.fn(),generateGeminiMultiTurn:vi.fn()}));
vi.mock('../services/api/handbook',()=>({handbookApi:{getKnowledge:vi.fn()}}));
import { askGeminiCopilot } from '../utils/aiSchedulerEngine';
import { handbookApi } from '../services/api/handbook';
import { generateGeminiMultiTurn } from '../services/geminiService';
it('answers the user ratio locally, without a model or handbook mutation',async()=>{
  const chunk=vi.fn();
  const answer=await askGeminiCopilot('Pha cốt cà phê 20g->20ml lượt đầu +45ml lượt sau. 80g->??',{},[],'',chunk);
  expect(answer).toContain('80 ml'); expect(answer).toContain('180 ml'); expect(answer).toContain('260 ml');
  expect(chunk).toHaveBeenCalledWith(answer);
  expect(handbookApi.getKnowledge).not.toHaveBeenCalled(); expect(generateGeminiMultiTurn).not.toHaveBeenCalled();
});
