"use client";

export function Brand({ tool }: { tool?: string }) {
  return (
    <div className="brand" aria-label="MyWealth Solutions">
      {/* Compact monogram mark in brand navy + blue. */}
      <svg width="34" height="34" viewBox="0 0 34 34" style={{ marginRight: 10 }} aria-hidden>
        <rect width="34" height="34" rx="9" fill="#123a50" />
        <path
          d="M8 24V10l4.6 8 4.4-8v14"
          fill="none"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M22 10v14" stroke="#3B82E6" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="22" cy="10" r="2.1" fill="#CFE87F" />
      </svg>
      <div className="brand-stack">
        <span className="brand-name">MyWealth</span>
        <span className="brand-solutions">Solutions</span>
      </div>
      {tool ? <span className="tool-label">{tool}</span> : null}
    </div>
  );
}
