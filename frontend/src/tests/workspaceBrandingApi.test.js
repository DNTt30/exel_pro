import { beforeEach, expect, it, vi } from 'vitest';
import { DEFAULT_BRANDING, brandingDraft } from '../utils/workspaceBranding';
import { getWorkspaceBranding, saveWorkspaceBranding } from '../services/api/workspace';
const mocks=vi.hoisted(()=>({ rpc:vi.fn(),single:vi.fn(),from:vi.fn(),select:vi.fn(),eq:vi.fn() }));
vi.mock('../services/api/client',()=>({ db:()=>mocks }));
beforeEach(()=>{vi.resetAllMocks();mocks.from.mockReturnValue(mocks);mocks.select.mockReturnValue(mocks);mocks.eq.mockReturnValue(mocks);});
const row={app_name:'Lịch Ca',organization_name:'',primary_color:'#4338ca',contact_email:'',logo_data_url:'',revision:2};
it('reads only public identity fields', async()=>{
  mocks.single.mockResolvedValue({data:row});expect((await getWorkspaceBranding()).revision).toBe(2);
  expect(mocks.select.mock.calls[0][0]).not.toContain('*');
});
it('sends expected revision and validates before write', async()=>{
  mocks.rpc.mockResolvedValue({data:row});await saveWorkspaceBranding(brandingDraft(DEFAULT_BRANDING),1);
  expect(mocks.rpc.mock.calls[0][1].p_revision).toBe(1);
  await expect(saveWorkspaceBranding({...brandingDraft(DEFAULT_BRANDING),apiKey:'secret'},1)).rejects.toThrow();
  expect(mocks.rpc).toHaveBeenCalledTimes(1);
});
it.each([
  [{code:'40001',message:'BRANDING_CONFLICT'},'Tải lại'],
  [{code:'42501'},'Admin'],
  [{code:'offline'},'Không lưu'],
])('reports server failure %j',async(error,message)=>{
  mocks.rpc.mockResolvedValue({error});await expect(saveWorkspaceBranding(brandingDraft(DEFAULT_BRANDING),1)).rejects.toThrow(message);
});
