export const navItems = [
  { label: "Servers", href: "/#servers" },
  { label: "Scoreboard", href: "/scoreboard" },
  { label: "Weapons", href: "/weapons" },
  { label: "Run a server", href: "/guide" },
] as const;

export const featureItems = [
  {
    label: "Play on your phone",
    href: "/play-quake-3-on-your-phone",
    description: "Run Quake III Arena in your mobile browser with touch controls.",
  },
  {
    label: "Voice chat",
    href: "/quake-3-voice-chat",
    description: "Use opt-in server voice with microphone selection and push to talk.",
  },
  {
    label: "Player stats",
    href: "/quake-3-player-stats",
    description: "Explore rankings, profiles, weapons, maps, rivals, and frag activity.",
  },
  {
    label: "WebAssembly engine",
    href: "/quake-3-webassembly",
    description: "See how ioquake3, browser storage, and WebSockets power Q3JS.",
  },
  {
    label: "Browser mods",
    href: "/quake-3-browser-mods",
    description: "Load compatible PK3 mods automatically with persistent asset caching.",
  },
  {
    label: "Custom servers",
    href: "/custom-quake-3-servers",
    description: "Run a community arena with custom maps, modes, limits, and mods.",
  },
] as const;
