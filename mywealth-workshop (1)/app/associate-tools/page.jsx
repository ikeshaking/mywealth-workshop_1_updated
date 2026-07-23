export const metadata = {
  title: "Associate Tools — MyWealth Workshop",
  description: "Standalone associate tools (ROA Generator, calculators, etc.)"
};

// Each tool is a self-contained HTML file living in /public/tools.
// IMPORTANT: these files must be linked as plain URLs (served statically by
// Next.js) and must NOT be imported into a React component or embedded via
// dangerouslySetInnerHTML. Files in /public are served byte-for-byte and are
// never bundled or minified, so they behave identically in dev and after you
// publish. Importing/embedding them puts their JavaScript through the Next.js
// build, which renames the global functions the tools' inline onclick handlers
// depend on — that is what breaks the buttons on the published site.
const TOOLS = [
  {
    name: "ROA Generator",
    description: "Record of Advice document generator.",
    href: "/tools/roa-generator.html"
  }
];

export default function AssociateToolsPage() {
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: 40, fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ marginBottom: 8 }}>Associate Tools</h1>
      <p style={{ color: "#5c6b78", marginTop: 0 }}>
        Standalone tools used by associates. Each opens as its own page.
      </p>

      <ul style={{ listStyle: "none", padding: 0, marginTop: 24 }}>
        {TOOLS.map((tool) => (
          <li
            key={tool.href}
            style={{
              border: "1px solid #d4dde7",
              borderRadius: 12,
              padding: "16px 20px",
              marginBottom: 12
            }}
          >
            {/* Plain anchor to the static file. Not a Next <Link>, not an
                import — this loads /public/tools/*.html raw so its inline
                scripts and onclick handlers run exactly as in dev. */}
            <a
              href={tool.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 18, fontWeight: 700, color: "#2B6FD6", textDecoration: "none" }}
            >
              {tool.name}
            </a>
            <p style={{ margin: "6px 0 0", color: "#5c6b78" }}>{tool.description}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
