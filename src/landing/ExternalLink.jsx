/** A static link to another site. Opens in a new tab, says so in words, and loads no script. */
export default function ExternalLink({ href, children }) {
  return (
    <a className="ext-link" href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="ext-note">(opens in a new tab)</span>
    </a>
  );
}
