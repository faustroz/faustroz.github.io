import localFont from "next/font/local";
import "./globals.css";
import "./hub.css";
import HubShell from "@/components/hub/HubShell";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata = {
  title: "Ferdy Diatmika — Personal Hub",
  description:
    "Personal command center for Ferdy Diatmika's finance, creator work, projects, and profile.",
  keywords:
    "web developer, frontend developer, React, Next.js, portfolio, landing pages, web design",
  authors: [{ name: "Ferdy Diatmika" }],
  robots: "index, follow",
  openGraph: {
    title: "Ferdy Diatmika — Personal Hub",
    description:
      "Personal command center for finance, creator work, projects, and profile.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ferdy Diatmika — Personal Hub",
    description:
      "Personal command center for finance, creator work, projects, and profile.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <HubShell>{children}</HubShell>
      </body>
    </html>
  );
}
