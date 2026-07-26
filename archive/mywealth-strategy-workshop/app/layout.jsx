
export const metadata = {
  title: "MyWealth Workshop",
  description: "Interactive retirement strategy workshop"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
