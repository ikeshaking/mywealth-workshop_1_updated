import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyWealth Solutions — Professional Year Program",
  description:
    "The MyWealth Solutions Professional Year Program — candidates, supervisors and the PY manager, each with their own secure view of progress.",
  applicationName: "MyWealth PY Program",
};

export const viewport: Viewport = {
  themeColor: "#0C2E3F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <head>
        {/* Same typefaces as the standalone PY tracker. ABC Arizona is loaded via
            @import in globals.css; Nunito Sans / Playfair via Google below. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Nunito+Sans:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Nunito:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* Apply the saved theme before paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('mywealth-py:theme')||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
