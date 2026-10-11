import { createElement, ReactNode } from 'react';

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${keyPrefix}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function splitTableRow(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isBlockStart(lines: string[], index: number): boolean {
  const line = lines[index];
  return /^#{1,6}\s+/.test(line)
    || /^\s*[-*+]\s+/.test(line)
    || /^\s*\d+[.)]\s+/.test(line)
    || (line.includes('|') && lines[index + 1]?.includes('|') === true && isTableSeparator(lines[index + 1]));
}

/** Renders the small Markdown subset used in assistant responses as React nodes.
 * Text is never inserted as HTML, so raw provider HTML and scripts stay inert text.
 */
export function AssistantMarkdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      const tag = `h${heading[1].length}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      blocks.push(createElement(tag, { key: `heading-${index}`, className: 'mb-2 mt-4 font-semibold first:mt-0' }, ...renderInline(heading[2], `heading-${index}`)));
      index += 1;
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const List = ordered ? 'ol' : 'ul';
      const items: ReactNode[] = [];
      while (index < lines.length && (ordered ? /^\s*\d+[.)]\s+/.test(lines[index]) : /^\s*[-*+]\s+/.test(lines[index]))) {
        const item = lines[index].replace(ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*+]\s+/, '');
        items.push(<li key={`item-${index}`}>{renderInline(item, `item-${index}`)}</li>);
        index += 1;
      }
      blocks.push(<List key={`list-${index}`} className={`my-2 space-y-1 pl-6 ${ordered ? 'list-decimal' : 'list-disc'}`}>{items}</List>);
      continue;
    }

    if (line.includes('|') && lines[index + 1]?.includes('|') === true && isTableSeparator(lines[index + 1])) {
      const headers = splitTableRow(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trim() && lines[index].includes('|')) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      blocks.push(
        <div key={`table-${index}`} tabIndex={0} role="region" aria-label="Scroll AI answer table horizontally" className="table-scroll my-3 max-w-full overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead><tr>{headers.map((cell, cellIndex) => <th key={cellIndex} scope="col" className="border border-blue-200 bg-blue-100 px-3 py-2 font-semibold">{renderInline(cell, `th-${index}-${cellIndex}`)}</th>)}</tr></thead>
            <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{headers.map((_, cellIndex) => <td key={cellIndex} className="border border-blue-200 px-3 py-2 align-top">{renderInline(row[cellIndex] ?? '', `td-${index}-${rowIndex}-${cellIndex}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines, index)) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(<p key={`paragraph-${index}`} className="my-2 whitespace-pre-wrap">{renderInline(paragraph.join('\n'), `paragraph-${index}`)}</p>);
  }

  return <div className="break-words">{blocks}</div>;
}
