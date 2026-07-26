/**
 * Bulletproof HTML email renderer for MyWealth Solutions.
 *
 * Email clients are not browsers. Outlook (Word rendering engine) has no
 * support for flexbox/grid, ignores most `<style>` blocks, drops `float`, and
 * frequently strips `class`/`id` attributes. Gmail's web client removes
 * `<style>` entirely for some accounts and rewrites the document head.
 *
 * The only reliably portable layout primitive is a nested `<table>` with
 * attribute-level `cellpadding`/`cellspacing`/`border` plus *inline* styles.
 * So: no CSS classes, no stylesheet, no media queries, no external assets.
 * Everything below is plain string building — zero dependencies.
 */

import type {
  EmailItem,
  EmailPayload,
  EmailSection,
  EmailStat,
  Tone,
} from "./types";

/* -------------------------------------------------------------------------- */
/* Escaping                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Escape every interpolated value. Candidate names, notes and supervisor
 * comments all originate from user input, so nothing reaches the output
 * without passing through here. Quotes are escaped as well because some of
 * these values land inside attributes (e.g. the CTA `href`).
 */
function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* -------------------------------------------------------------------------- */
/* Brand tokens                                                                */
/* -------------------------------------------------------------------------- */

const BRAND = {
  navy: "#0C2E3F",
  accent: "#2B6FD6",
  page: "#eef2f6",
  surface: "#ffffff",
  border: "#d4dde7",
  text: "#16242e",
  muted: "#5c6b78",
  /** On-navy secondary text — used for the wordmark sub-labels. */
  onNavyMuted: "rgba(255,255,255,.55)",
} as const;

/** Georgia is one of the few web-safe serifs available in desktop Outlook. */
const SERIF = "Georgia, 'Times New Roman', serif";
/** Nunito Sans is the app font; the fallbacks carry clients that can't load it. */
const SANS = "'Nunito Sans', Nunito, -apple-system, BlinkMacSystemFont, sans-serif";

const TONES: Record<Tone, { bg: string; fg: string }> = {
  info: { bg: "#e8f1fb", fg: "#2B6FD6" },
  good: { bg: "#e8f5e9", fg: "#2e7d32" },
  warn: { bg: "#fef6e0", fg: "#b8860b" },
  danger: { bg: "#fdeeec", fg: "#F56A5A" },
};

function toneStyle(tone?: Tone): { bg: string; fg: string } {
  return (tone && TONES[tone]) || TONES.info;
}

/* -------------------------------------------------------------------------- */
/* Fragments                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Hidden preview text. Clients show the first visible text next to the
 * subject line; this pins that snippet without it appearing in the body.
 * The colour matches the page background as a belt-and-braces fallback for
 * clients that honour `display:none` inconsistently.
 */
function preheaderBlock(preheader: string): string {
  return `<div style="display:none;font-size:1px;color:${BRAND.page};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${esc(
    preheader,
  )}</div>`;
}

function headerBand(): string {
  // Two cells rather than float/flex: the wordmark on the left, the program
  // label on the right. `valign` attributes are needed for Outlook.
  return `
  <tr>
    <td style="background-color:${BRAND.navy};padding:22px 28px;border-radius:12px 12px 0 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>
          <td valign="middle" align="left" style="font-family:${SERIF};">
            <div style="font-family:${SERIF};font-size:20px;font-weight:bold;color:#ffffff;line-height:22px;">MyWealth</div>
            <div style="font-family:${SANS};font-size:7px;letter-spacing:3.4px;color:${BRAND.onNavyMuted};text-transform:uppercase;line-height:12px;">SOLUTIONS</div>
          </td>
          <td valign="middle" align="right" style="font-family:${SANS};font-size:9px;letter-spacing:1.6px;color:${BRAND.onNavyMuted};text-transform:uppercase;">
            PROFESSIONAL YEAR PROGRAM
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function statsBlock(stats: EmailStat[]): string {
  // Cap at four so the row never wraps awkwardly on narrow mobile clients.
  const shown = stats.slice(0, 4);
  if (shown.length === 0) return "";
  const width = Math.floor(100 / shown.length);

  const cells = shown
    .map(
      (stat) => `
          <td align="center" valign="top" width="${width}%" style="width:${width}%;padding:12px 6px;font-family:${SANS};">
            <div style="font-family:${SANS};font-size:22px;font-weight:bold;color:${BRAND.navy};line-height:26px;">${esc(
              stat.value,
            )}</div>
            <div style="font-family:${SANS};font-size:11px;color:${BRAND.muted};line-height:16px;padding-top:2px;">${esc(
              stat.label,
            )}</div>
          </td>`,
    )
    .join("");

  return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid ${BRAND.border};border-radius:10px;background-color:#f8fafc;margin:18px 0 4px 0;">
        <tr>${cells}
        </tr>
      </table>`;
}

function itemRow(item: EmailItem, isFirst: boolean): string {
  const { bg, fg } = toneStyle(item.tone);
  const topPad = isFirst ? 10 : 8;

  const badgeCell = item.badge
    ? `
          <td valign="top" width="1" style="padding:${topPad}px 10px 8px 0;white-space:nowrap;">
            <span style="display:inline-block;background-color:${bg};color:${fg};font-family:${SANS};font-size:10.5px;font-weight:bold;text-transform:uppercase;letter-spacing:.6px;padding:3px 9px;border-radius:999px;line-height:14px;">${esc(
              item.badge,
            )}</span>
          </td>`
    : "";

  const detail = item.detail
    ? `
            <div style="font-family:${SANS};font-size:12px;color:${BRAND.muted};line-height:17px;padding-top:2px;">${esc(
              item.detail,
            )}</div>`
    : "";

  return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>${badgeCell}
          <td valign="top" style="padding:${topPad}px 0 8px 0;">
            <div style="font-family:${SANS};font-size:13.5px;font-weight:600;color:${BRAND.text};line-height:19px;">${esc(
              item.title,
            )}</div>${detail}
          </td>
        </tr>
      </table>`;
}

function sectionBlock(section: EmailSection, index: number): string {
  // A 1px top border acts as the separator; the first section skips it so it
  // doesn't double up with the intro spacing.
  const separator =
    index === 0
      ? "margin-top:18px;padding-top:0;"
      : `margin-top:6px;padding-top:18px;border-top:1px solid ${BRAND.border};`;

  const heading = `
      <div style="${separator}">
        <div style="font-family:${SERIF};font-size:15px;font-weight:bold;color:${BRAND.navy};line-height:20px;">${esc(
          section.heading,
        )}</div>${
          section.blurb
            ? `
        <div style="font-family:${SANS};font-size:12px;color:${BRAND.muted};line-height:17px;padding-top:3px;">${esc(
          section.blurb,
        )}</div>`
            : ""
        }
      </div>`;

  const body =
    section.items.length > 0
      ? section.items.map((item, i) => itemRow(item, i === 0)).join("")
      : section.emptyText
        ? `
      <div style="font-family:${SANS};font-size:13px;font-style:italic;color:${BRAND.muted};line-height:19px;padding:10px 0 8px 0;">${esc(
        section.emptyText,
      )}</div>`
        : "";

  return heading + body;
}

function ctaBlock(label: string, href: string): string {
  // Table-based button: Outlook ignores padding on inline `<a>` elements, so
  // the padding lives on the `<td>` and the anchor fills it via display:block.
  return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="border-collapse:separate;margin:24px auto 6px auto;">
        <tr>
          <td align="center" bgcolor="${BRAND.accent}" style="background-color:${BRAND.accent};border-radius:10px;">
            <a href="${esc(href)}" target="_blank" style="display:inline-block;padding:12px 22px;font-family:${SANS};font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;line-height:18px;">${esc(
              label,
            )}</a>
          </td>
        </tr>
      </table>`;
}

/* -------------------------------------------------------------------------- */
/* Plain-text mirror                                                           */
/* -------------------------------------------------------------------------- */

function renderText(payload: EmailPayload): string {
  const lines: string[] = [];

  lines.push(payload.greeting, "", payload.intro, "");

  if (payload.stats && payload.stats.length > 0) {
    for (const stat of payload.stats) lines.push(`${stat.label}: ${stat.value}`);
    lines.push("");
  }

  for (const section of payload.sections) {
    lines.push(section.heading.toUpperCase());
    if (section.blurb) lines.push(section.blurb);

    if (section.items.length > 0) {
      for (const item of section.items) {
        const badge = item.badge ? `[${item.badge}] ` : "";
        const detail = item.detail ? ` — ${item.detail}` : "";
        lines.push(`- ${badge}${item.title}${detail}`);
      }
    } else if (section.emptyText) {
      lines.push(section.emptyText);
    }
    lines.push("");
  }

  if (payload.ctaLabel && payload.ctaHref) {
    lines.push(`${payload.ctaLabel}: ${payload.ctaHref}`, "");
  }

  if (payload.footerNote) lines.push(payload.footerNote, "");
  lines.push("MyWealth Solutions · GPS Wealth Ltd (AFSL 254544)");

  // Collapse any run of blank lines the loops may have produced.
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Render a payload into an HTML + plain-text pair ready to hand to a provider.
 * Pure and dependency-free, so it is safe to call from route handlers, cron
 * jobs and tests alike.
 */
export function renderEmail(payload: EmailPayload): { html: string; text: string } {
  const sections = payload.sections.map(sectionBlock).join("");
  const stats =
    payload.stats && payload.stats.length > 0 ? statsBlock(payload.stats) : "";
  const cta =
    payload.ctaLabel && payload.ctaHref
      ? ctaBlock(payload.ctaLabel, payload.ctaHref)
      : "";

  const footerNote = payload.footerNote
    ? `
              <div style="font-family:${SANS};font-size:11px;color:${BRAND.muted};line-height:17px;padding-bottom:6px;">${esc(
                payload.footerNote,
              )}</div>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>${esc(payload.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.page};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
${preheaderBlock(payload.preheader)}
<!-- Outer table paints the page background edge to edge; some clients ignore
     background colours set on <body> alone. -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:${BRAND.page};">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <!-- 600px is the safe maximum width for the Outlook reading pane. -->
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;border-collapse:collapse;">
${headerBand()}
        <tr>
          <td style="background-color:${BRAND.surface};border:1px solid ${BRAND.border};border-top:none;border-radius:0 0 12px 12px;padding:26px 28px 28px 28px;">
            <h1 style="margin:0;font-family:${SERIF};font-size:22px;font-weight:bold;color:${BRAND.navy};line-height:28px;">${esc(
              payload.greeting,
            )}</h1>
            <p style="margin:8px 0 0 0;font-family:${SANS};font-size:13.5px;color:${BRAND.muted};line-height:20px;">${esc(
              payload.intro,
            )}</p>
${stats}${sections}${cta}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:18px 12px 4px 12px;">${footerNote}
            <div style="font-family:${SANS};font-size:11px;color:${BRAND.muted};line-height:17px;">MyWealth Solutions &middot; GPS Wealth Ltd (AFSL 254544)</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  return { html, text: renderText(payload) };
}
