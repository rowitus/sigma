// A tiny Markdown renderer for chat answers: paragraphs, headings, bullet and numbered lists,
// **bold**, *italic* and [links](https://...). Built from React elements (never innerHTML), so
// nothing in an answer can run as code. Only http(s) links become links.

// Citations look like [[1]](url); ordinary links like [text](url).
const INLINE = /(\*\*[^*]+\*\*|\[\[\d+\]\]\([^)\s]+\)|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*)/g;

function inline(text, keyBase) {
  return text.split(INLINE).filter(Boolean).map((part, i) => {
    const key = `${keyBase}-${i}`;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={key}>{part.slice(2, -2)}</strong>;
    const link = part.match(/^\[(\[\d+\]|[^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const [, label, href] = link;
      if (!/^https?:\/\//i.test(href)) return label;
      const cite = /^\[\d+\]$/.test(label);
      return (
        <a key={key} className={cite ? "chat-cite" : undefined} href={href} target="_blank" rel="noopener noreferrer"
          aria-label={cite ? `Source ${label.slice(1, -1)} (opens in a new tab)` : undefined}>
          {cite ? label.slice(1, -1) : label}
        </a>
      );
    }
    if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) return <em key={key}>{part.slice(1, -1)}</em>;
    return part;
  });
}

export default function Markdown({ text }) {
  const blocks = [];
  let list = null;
  const lines = String(text || "").split("\n");
  const flush = () => {
    if (list) blocks.push(list);
    list = null;
  };
  lines.forEach((raw, n) => {
    const line = raw.trim();
    if (!line) return flush();
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const type = bullet ? "ul" : "ol";
      if (!list || list.type !== type) {
        flush();
        list = { type, items: [] };
      }
      list.items.push((bullet || numbered)[1]);
      return undefined;
    }
    flush();
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) blocks.push({ type: "h", text: heading[1] });
    else if (/^(-{3,}|\*{3,})$/.test(line)) return undefined;
    else blocks.push({ type: "p", text: line, n });
    return undefined;
  });
  flush();

  return blocks.map((b, i) => {
    if (b.type === "h") return <p key={i} className="chat-heading">{inline(b.text, i)}</p>;
    if (b.type === "p") return <p key={i}>{inline(b.text, i)}</p>;
    const Tag = b.type;
    return <Tag key={i}>{b.items.map((t, j) => <li key={j}>{inline(t, `${i}-${j}`)}</li>)}</Tag>;
  });
}
