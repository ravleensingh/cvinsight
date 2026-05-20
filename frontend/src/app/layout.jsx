import "./globals.css";

export const metadata = {
  title: "CVInsight",
  description: "Resume screening and shortlist management system.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
