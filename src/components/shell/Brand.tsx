"use client";

/**
 * The MyWealth wordmark, exactly as it appears in the original PY tracker:
 * "MyWealth" in the brand serif over a letter-spaced "SOLUTIONS".
 *
 * No logo mark is drawn here on purpose — the real MyWealth logo is a brand
 * asset, so we don't approximate it. To add it, drop the file in `public/` and
 * render it in place of the comment below.
 */
export function Brand({ tool }: { tool?: string }) {
  return (
    <div className="brand" aria-label="MyWealth Solutions">
      {/* Brand logo goes here when the official asset is available. */}
      <div className="brand-stack">
        <span className="brand-name">MyWealth</span>
        <span className="brand-solutions">Solutions</span>
      </div>
      {tool ? <span className="tool-label">{tool}</span> : null}
    </div>
  );
}
