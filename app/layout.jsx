import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Ferdy Diatmika - Web Developer Portfolio",
  description:
    "Professional web developer specializing in modern web applications, landing pages, company profiles, and custom web solutions.",
  keywords:
    "web developer, frontend developer, React, Next.js, portfolio, landing pages, web design",
  authors: [{ name: "Ferdy Diatmika" }],
  viewport: "width=device-width, initial-scale=1",
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
      <body className={inter.className}>
        {children}
        <footer className="bg-gray-900 text-white py-8 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-gray-400">
              © {new Date().getFullYear()} Ferdy Diatmika. All rights reserved.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
