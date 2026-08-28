export const viewport = {
  viewportFit: "cover",
  themeColor: "#07100d",
  colorScheme: "dark",
};

export const metadata = {
  title: "Personal Hub — Ferdy Diatmika",
  description:
    "Ferdy Diatmika's personal command center for finance, projects, and profile.",
  manifest: "/hub-manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "4allx",
  },
  icons: {
    icon: "/icons/fd-os-icon.svg",
    apple: "/icons/fd-os-icon.svg",
  },
};

export default function HubLayout({ children }) {
  return children;
}
