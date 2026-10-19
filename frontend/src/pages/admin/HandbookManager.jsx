import KnowledgeLibrary from '../../components/handbook/KnowledgeLibrary';
import { HANDBOOK_CATEGORIES } from '../../utils/handbookKnowledge';

export const CATEGORY_OPTIONS = HANDBOOK_CATEGORIES;
export const CATEGORY_MAP = Object.fromEntries(CATEGORY_OPTIONS.map(category => [category.value, category]));

export default function HandbookManager() {
  return <div className="w-full min-w-0 p-3 sm:p-5"><KnowledgeLibrary manage /></div>;
}
