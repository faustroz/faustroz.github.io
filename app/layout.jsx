import localFont from "next/font/local";
import "./globals.css";
import "./hub.css";
import HubShell from "@/components/hub/HubShell";
import PwaBootstrap from "@/components/hub/PwaBootstrap";

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
  viewportFit: "cover",
  themeColor: "#07100d",
  colorScheme: "dark",
};

export const metadata = {
  title: "Ferdy Diatmika - Web Developer Portfolio",
  description:
    "Professional web developer specializing in modern web applications, landing pages, company profiles, and custom web solutions.",
  keywords:
    "web developer, frontend developer, React, Next.js, portfolio, landing pages, web design",
  authors: [{ name: "Ferdy Diatmika" }],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ferdy Diatmika",
  },
  icons: {
    icon: "/icons/fd-os-icon.svg",
    apple: "/icons/fd-os-icon.svg",
  },
  robots: "index, follow",
  openGraph: {
    title: "Ferdy Diatmika - Web Developer Portfolio",
    description:
      "Professional web developer specializing in modern web applications, landing pages, company profiles, and custom web solutions.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ferdy Diatmika - Web Developer Portfolio",
    description:
      "Professional web developer specializing in modern web applications, landing pages, company profiles, and custom web solutions.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <PwaBootstrap />
        <HubShell>{children}</HubShell>
      </body>
    </html>
  );
}
