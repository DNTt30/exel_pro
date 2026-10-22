import { describe,it,expect } from 'vitest';
import { recipeCatalog,recipeFromEntry,recipeSpecSchema,withoutLegacyMixingLine } from '../utils/recipeCatalog';
import { calculateRecipe } from '../utils/recipeCalculator';
import { sampleRecipeEntries } from '../sandbox/recipeFixture';
import { retrieveHandbook } from '../utils/copilotRetrieval';

describe('approved recipe catalog',()=>{
  it.each([
    ['sample-coffee',80,[80,180],260],
    ['sample-milo',1200,[1600,2000],3600],
    ['sample-nestea',800,[2000,4000],6000],
  ])('%s has independently known quantities',(id,target,amounts,total)=>{
    const r=recipeFromEntry(sampleRecipeEntries.find(e=>e.id===id));
    const calculated=calculateRecipe(r,target);
    expect(calculated.scaledComponents.map(c=>c.scaledAmount)).toEqual(amounts);
    expect(calculated.totalLiquid).toBe(total);
  });
  it('does not mix servings/hot variants into batch amounts or use removed/unapproved sources',()=>{
    const milo=sampleRecipeEntries[1];
    expect(recipeFromEntry(milo).components).toHaveLength(2);
    expect(recipeCatalog([{...milo,is_active:false},{...milo,published_at:null}])).toEqual([]);
    expect(recipeFromEntry({...milo,recipe_spec:{baseAmount:0}})).toBeNull();
    expect(recipeFromEntry({...milo,content:milo.content.replace('800ml','800–900ml')})).toBeNull();
    expect(withoutLegacyMixingLine(milo.content)).not.toContain('800ml');
    expect(withoutLegacyMixingLine(milo.content)).toContain('160ml');
  });
  it('uses the reviewed structured record after editing, not an old text extraction',()=>{
    const milo=sampleRecipeEntries[1], spec=recipeFromEntry(milo);
    const updated=recipeFromEntry({...milo,revision:3,recipe_spec:{...spec,components:[{name:'Water',amount:950,unit:'ml'}]}});
    expect(calculateRecipe(updated,1200).totalLiquid).toBe(1900);
    expect(updated.revision).toBe(3);
    expect(recipeSpecSchema.safeParse({...spec,components:[{name:'',amount:-1,unit:''}]}).success).toBe(false);
  });
  it('puts the same reviewed structured quantities into Copilot retrieval',()=>{
    const entry=sampleRecipeEntries[0];
    const result=retrieveHandbook('Cà phê (mẫu thử)',[],{entries:[entry],storeIds:[]});
    expect(result.text).toContain('20 g cà phê');
    expect(result.text).toContain('Nước lượt 2: 45 ml');
  });
});
