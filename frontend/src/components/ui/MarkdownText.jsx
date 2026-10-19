export function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Bullet list line
    if (/^[-*•]\s/.test(trimmed)) {
      elements.push(
        <div key={key++} className="flex gap-1.5 items-start">
          <span className="text-indigo-400 mt-0.5 flex-shrink-0">•</span>
          <span>{inlineMarkdown(trimmed.replace(/^[-*•]\s/, ''))}</span>
        </div>
      );
    }
    // Numbered list
    else if (/^\d+\.\s/.test(trimmed)) {
      const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
      elements.push(
        <div key={key++} className="flex gap-1.5 items-start">
          <span className="text-indigo-400 font-bold mt-0.5 flex-shrink-0 min-w-[14px]">{numMatch[1]}.</span>
          <span>{inlineMarkdown(numMatch[2])}</span>
        </div>
      );
    }
    // Empty line → spacer
    else if (trimmed === '') {
      if (elements.length > 0) elements.push(<div key={key++} className="h-1" />);
    }
    // Normal line
    else {
      elements.push(<div key={key++}>{inlineMarkdown(line)}</div>);
    }
  }
  return elements;
}

function inlineMarkdown(text) {
  // Parse **bold**, *italic*, `code` với React elements
  const parts = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let match;
  let k = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[2] !== undefined) {
      parts.push(<strong key={k++} className="font-bold">{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      parts.push(<em key={k++} className="italic">{match[3]}</em>);
    } else if (match[4] !== undefined) {
      parts.push(<code key={k++} className="bg-slate-100 text-indigo-700 px-1 py-0.5 rounded text-[11px] font-mono">{match[4]}</code>);
    }
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 0 ? text : parts;
}
