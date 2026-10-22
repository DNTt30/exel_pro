import { stripVi } from './textSearch';
import { handbookScopeLabel, publishedKnowledge } from './handbookKnowledge';
import { recipeSpecText } from './recipeCatalog';
export const RAG_MAX_CHARS = 6000;
export const RAG_MAX_CHUNKS = 4;
export const HISTORY_MAX_CHARS = 2400;
const normalize = text => String(text || '').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\bsoup\b/g, 'sup');
const stopWords = new Set('toi em anh chi ban minh cho hoi la thi va cua co khong duoc voi nhu the nao bao nhieu may luc khi gi o ve hay can xin chao nhe a oi lam cach huong dan quy trinh buoc chi tiet hon'.split(' '));
const terms = text => normalize(text).match(/[a-z0-9]+/g)?.filter(t => !stopWords.has(t)) || [];
const uiFields = new Set(['badgeColor', 'colorClass', 'dotColor', 'icon', 'highlight', 'originalScans']);
const compact = value => JSON.stringify(value, (key, item) => uiFields.has(key) ? undefined : item);

function indexedChunk(id, title, content, names = []) {
  const text = `[${id}] ${title}\n${compact(content)}`;
  const tokens = terms(`${title} ${text} ${names.join(' ')}`);
  const counts = new Map();
  tokens.forEach(token => counts.set(token, (counts.get(token) || 0) + 1));
  return { id, title, text, counts, length: tokens.length, names: names.map(stripVi) };
}

function isFollowUp(question) {
  const q = stripVi(question);
  return /\b(phan do|loai do|mon do|cai do|no thi|buoc tiep|tiep theo|chi tiet hon|noi ro hon|giai thich them)\b/.test(q)
    || /^(con )?(bao lau|may phut|may gio|bao nhieu(?: ml| gam| gram| g| vien| goi| pump)?|nhiet do|cong suat)( nua)?$/.test(q)
    || /^(con )?size (s|m|l|xl|xxl)( thi sao)?$/.test(q);
}

export function resolveRetrievalQuery(question, history = []) {
  // Follow-ups inherit the latest USER topic; model-generated answers are not sources.
  if (!isFollowUp(question)) return question;
  const previous = history.filter(m => m.sender === 'user' && m.id !== 'welcome' && !m.isError && m.text).slice(-2);
  const topic = [...previous].reverse().find(m => !isFollowUp(m.text));
  return [...(topic ? [topic] : previous).map(m => m.text.slice(0, 500)), question].join('\n');
}

export function retrieveHandbook(question, history = [], { entries = [], storeIds = [] } = {}) {
  const index = publishedKnowledge(entries, storeIds).map(entry => indexedChunk(
    `${entry.category === 'recipe' ? 'recipe.' : ''}knowledge.${entry.id}`,
    `${entry.title} — ${handbookScopeLabel(entry)}`, {
      content: [entry.content,recipeSpecText(entry.recipe_spec)].filter(Boolean).join('\n'), source: entry.source_doc, scope: handbookScopeLabel(entry), revision: entry.revision,
    }, [entry.title, ...(entry.aliases || [])]));
  const averageLength = index.reduce((sum, item) => sum + item.length, 0) / (index.length || 1);
  const documentFrequency = new Map();
  index.forEach(item => item.counts.forEach((_count, token) => documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1)));
  const query = resolveRetrievalQuery(question, history);
  const queryTerms = [...new Set(terms(query))];
  const normalizedQuery = stripVi(query);
  const containsName = name => name && ` ${normalizedQuery} `.includes(` ${name} `);
  const withdrawn = entries.filter(e => e.is_active === false && e.published_at && (!e.store_id || storeIds.includes(e.store_id)))
    .flatMap(e => [e.title, ...(e.aliases || [])].map(stripVi)).filter(name => containsName(name) && !index.some(item => item.names.includes(name)));
  if (withdrawn.length) return { query, chunks: [], text: '(Tài liệu được hỏi đã được Admin gỡ khỏi nguồn đang áp dụng. Cần xác nhận lại với quản lý; không dùng bản cũ.)' };
  const namedRecipes = index.filter(item => item.id.startsWith('recipe.')).map(item => ({
    id: item.id, specificity: Math.max(0, ...item.names.filter(containsName).map(name => name.length)),
  }));
  const specificity = Math.max(0, ...namedRecipes.map(item => item.specificity));
  const namedIds = new Set(namedRecipes.filter(item => specificity > 0 && item.specificity === specificity).map(item => item.id));
  const exactRecipes = index.filter(item => item.id.startsWith('recipe.') && item.names.includes(normalizedQuery));
  const ranked = index.map(item => {
    let score = 0, matched = 0;
    for (const token of queryTerms) {
      const frequency = item.counts.get(token) || 0;
      if (!frequency) continue;
      matched++;
      const df = documentFrequency.get(token);
      const idf = Math.log(1 + (index.length - df + 0.5) / (df + 0.5));
      score += idf * frequency * 2.2 / (frequency + 1.2 * (0.25 + 0.75 * item.length / averageLength));
    }
    // Boost catalog names/aliases, not handwritten per-dish intent rules. Token boundaries
    // prevent "tra coc" matching an unrelated substring; broad questions still use ranking.
    const exactAlias = item.names.includes(normalizedQuery);
    const named = item.names.some(containsName);
    score *= exactAlias ? 2 : named ? 1.2 : 1;
    return { ...item, score, matched };
  }).filter(item => item.matched && item.score >= 1.5
    && (!namedIds.size || !item.id.startsWith('recipe.') || namedIds.has(item.id)))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const selected = [];
  let chars = 0;
  // A bare canonical dish name requests that complete recipe, without unrelated dishes.
  const candidates = exactRecipes.length ? exactRecipes : ranked;
  for (const item of candidates) {
    if (selected.length === RAG_MAX_CHUNKS) break;
    if (!exactRecipes.length && item.score < ranked[0].score * 0.4) continue;
    if (chars + item.text.length + (selected.length ? 2 : 0) > RAG_MAX_CHARS) continue;
    chars += item.text.length + (selected.length ? 2 : 0);
    selected.push({ id: item.id, title: item.title, text: item.text });
  }
  return { query, chunks: selected, text: selected.map(item => item.text).join('\n\n') };
}

export function compactChatHistory(history = []) {
  const messages = history.filter(m => m.id !== 'welcome' && !m.isError && ['user', 'ai'].includes(m.sender) && typeof m.text === 'string' && m.text.trim()).slice(-4);
  let remaining = HISTORY_MAX_CHARS;
  const result = [];
  for (const message of [...messages].reverse()) {
    const limit = Math.min(800, remaining);
    if (limit < 1) break;
    const text = message.text.length > limit ? `${message.text.slice(0, limit - 1)}…` : message.text;
    remaining -= text.length;
    result.unshift({ ...message, text });
  }
  while (result[0]?.sender === 'ai') result.shift();
  return result;
}
