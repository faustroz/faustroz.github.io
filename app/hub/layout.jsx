export const viewport = {
  themeColor: "#07100d",
  colorScheme: "dark",
};

export const metadata = {
  title: "Personal Hub — Ferdy Diatmika",
  description:
    "Ferdy Diatmika's personal command center for finance, projects, and profile.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FD_OS",
  },
};

export default function HubLayout({ children }) {
  return children;
}
