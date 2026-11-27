export const PROJECTS = Object.freeze([
  {
    name: "Clipra",
    tag: "AI Video Clipper",
    description:
      "YouTube-to-short-form workflow: paste a video URL, choose timestamps, transcribe with Whisper, burn captions, and export vertical clips.",
    href: "https://clipra.app/",
    image: "/portfolio/clipra.png",
    imageClass: "object-cover",
  },
  {
    name: "Confluo",
    tag: "AI Trading Co-Pilot",
    description:
      "Discord bot that scans crypto, stocks, and forex for technical setups confirmed by sentiment, then posts structured alerts and recaps.",
    href: "",
    image: "/portfolio/confluo.png",
    imageClass: "object-cover",
  },
  {
    name: "Invopajak",
    tag: "Invoice & Tax SaaS",
    description:
      "Full-stack invoice system for Indonesian freelancers and small businesses with clients, PPN/PPh tax math, PDF export, and email sending.",
    href: "https://invopajak.vercel.app/",
    image: "/portfolio/invopajak.png",
    imageClass: "object-cover",
  },
  {
    name: "Portlio",
    tag: "Finance Dashboard",
    description:
      "Public demo portfolio tracker for crypto, US stocks, and Indonesian reksadana with allocation charts, movers, and session-only holdings.",
    href: "http://portlio-orpin.vercel.app/",
    image: "/portfolio/portlio.png",
    imageClass: "object-cover",
  },
  {
    name: "Yomu",
    tag: "Comic Reader",
    description:
      "Modern manga and comic reader with search, latest/popular collections, reading history, chapter pages, and a dark reading-first interface.",
    href: "https://yomu-coral.vercel.app/",
    image: "/portfolio/yomu.png",
    imageClass: "object-cover object-top",
  },
  {
    name: "Last Known Owner",
    tag: "Roblox Mystery Horror",
    description:
      "Investigation horror game where every object remembers who left it behind. Trace the owner through the abandoned hotel.",
    href: "",
    image: "/portfolio/lko-lobby.jpg",
    imageClass: "object-cover",
  },
]);

export const MAPS_SHOWCASE = Object.freeze([
  {
    name: "City Roleplay Map",
    tag: "LAST KNOWN OWNER -- Roblox Map",
    description:
      "Placeholder for a city roleplay map showcase. Add final screenshots, scope, and production notes here.",
    href: "",
    image: "/portfolio/maps-city-roleplay.jpg",
    imageClass: "object-cover",
  },
  {
    name: "Island Survival Map",
    tag: "Roblox Map",
    description:
      "Placeholder for an island survival map showcase. Add final screenshots, scope, and production notes here.",
    href: "",
    image: "/portfolio/maps-island-survival.jpg",
    imageClass: "object-cover",
  },
  {
    name: "Interior Showcase",
    tag: "Interior",
    description:
      "Placeholder for an interior showcase. Add final screenshots, scope, and production notes here.",
    href: "",
    image: "/portfolio/lko-corridor.jpg",
    imageClass: "object-cover",
  },
  {
    name: "Racing Circuit",
    tag: "Roblox Map",
    description:
      "Placeholder for a racing circuit showcase. Add final screenshots, scope, and production notes here.",
    href: "",
    image: "/portfolio/maps-racing-circuit.jpg",
    imageClass: "object-cover",
  },
]);

export const ASSETS_3D = Object.freeze([
  {
    name: "Vehicle Asset Pack",
    tag: "3D Models",
    description:
      "Placeholder for a vehicle asset pack. Add final renders, polygon counts, and usage notes here.",
    href: "",
    image: "/portfolio/assets-vehicle.jpg",
    imageClass: "object-cover",
  },
  {
    name: "Modular Building Kit",
    tag: "3D Models",
    description:
      "Placeholder for a modular building kit. Add final renders, polygon counts, and usage notes here.",
    href: "",
    image: "/portfolio/assets-modular-building.jpg",
    imageClass: "object-cover",
  },
  {
    name: "Prop Collection",
    tag: "3D Models",
    description:
      "Placeholder for a prop collection. Add final renders, polygon counts, and usage notes here.",
    href: "",
    image: "/portfolio/assets-prop.jpg",
    imageClass: "object-cover",
  },
  {
    name: "Character Asset Pack",
    tag: "3D Models",
    description:
      "Placeholder for a character asset pack. Add final renders, polygon counts, and usage notes here.",
    href: "",
    image: "/portfolio/assets-character.jpg",
    imageClass: "object-cover",
  },
]);

export const PROJECT_CATEGORIES = Object.freeze([
  {
    id: "projects",
    index: "01",
    title: "Projects",
    description:
      "Games and applications built end to end, from the first prototype to the shipped product.",
    items: PROJECTS,
  },
  {
    id: "maps",
    index: "02",
    title: "Maps Showcase",
    description:
      "Worlds and environments built for roleplay, survival, and racing experiences.",
    items: MAPS_SHOWCASE,
  },
  {
    id: "assets",
    index: "03",
    title: "3D Assets",
    description:
      "Reusable models, kits, and props made for game and environment production.",
    items: ASSETS_3D,
  },
]);

export const SKILLS = Object.freeze([
  {
    id: "medicine",
    title: "Medical Science",
    description:
      "Medical student exploring the intersection of healthcare and digital technology.",
  },
  {
    id: "games",
    title: "Game Development",
    description:
      "Experienced FiveM server developer and Roblox scripter specializing in Lua/Luau.",
  },
  {
    id: "web",
    title: "Web Development",
    description:
      "Building modern, responsive web applications using React, Next.js, and Tailwind CSS.",
  },
  {
    id: "design",
    title: "UI/UX & Design",
    description: "Creating clean, aesthetic, and user-centered digital interfaces.",
  },
]);

export const HUB_PROFILE = Object.freeze({
  name: "Ferdy Diatmika",
  role: "Medical student / developer / systems builder",
  currentFocus: "Build useful systems across medicine, software, finance, and creative work.",
  shortBio:
    "I move between clinical learning and software building—turning repetitive work, scattered information, and curious ideas into focused digital tools.",
  longBio:
    "I am a medical student with a deep passion for technology and software development. Alongside medicine, I build web products, FiveM systems, Roblox experiences, and practical automation. The common thread is simple: understand the real problem, then make the interface and system feel inevitable.",
});

export const CONTACTS = Object.freeze({
  github: "https://github.com/faustroz",
  instagram: "https://instagram.com/ferdydiatmikaa",
  email: "mailto:ferdydiatmika171@gmail.com",
});
