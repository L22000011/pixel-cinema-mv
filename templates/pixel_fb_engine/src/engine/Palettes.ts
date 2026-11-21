export interface Palette {
  name: string;
  ink: string;
  paper: string;
  sky: string[];
  cloud: string[];
  far: string[];
  mid: string[];
  grass: string[];
  earth: string[];
  stone: string[];
  wood: string[];
  light: string[];
  sun: string[];
  accent: string[];
  cool: string[];
  rim: string;
  charTint: [string, number] | null;
}

export const PALETTES: Record<string, Palette> = {
  midnight: {
    name: "midnight",
    ink: "#090c1a",
    paper: "#f5efe6",
    sky: ["#080b18", "#0e152c", "#162142", "#20305a", "#2c4174"],
    cloud: ["#162040", "#22325c", "#32497a"],
    far: ["#111933", "#192447"],
    mid: ["#0d152b", "#14203d", "#1c2c50"],
    grass: ["#0c1624", "#132436", "#1d3548", "#2b4b5c", "#3f6978"],
    earth: ["#0d101c", "#171c2e", "#222940"],
    stone: ["#161c32", "#252e4d", "#39456b"],
    wood: ["#1b121b", "#2d1d24", "#452d31"],
    light: ["#e69b45", "#ffd278", "#fff4cb"],
    sun: ["#b8c8e8", "#dde7f8", "#f7faff"],
    accent: ["#8e253e", "#c94152", "#f2747d"],
    cool: ["#4c749e", "#8eb8e0"],
    rim: "#7da2d4",
    charTint: ["#1e2b5c", 0.16],
  },
  dusk: {
    name: "dusk",
    ink: "#1a1124",
    paper: "#fff1de",
    sky: ["#382046", "#6b345c", "#b85866", "#eba06a", "#ffd791"],
    cloud: ["#6e3962", "#b5616d", "#f0a782"],
    far: ["#4d2e5c", "#6c3f6f"],
    mid: ["#362247", "#4b2e59", "#653d6c"],
    grass: ["#241b33", "#3a2742", "#59384e", "#875356", "#b87860"],
    earth: ["#231626", "#392233", "#523240"],
    stone: ["#322544", "#4d3a61", "#6c527d"],
    wood: ["#331d28", "#512d34", "#754342"],
    light: ["#ff964f", "#ffd072", "#fff3bd"],
    sun: ["#ffb45e", "#ffe08c", "#fff6d4"],
    accent: ["#992b48", "#d95064", "#ff968f"],
    cool: ["#564d8c", "#8880bd"],
    rim: "#ffb87d",
    charTint: ["#ff8a5c", 0.10],
  },
  cafe: {
    name: "cafe",
    ink: "#090d1a",
    paper: "#f3ebe2",
    sky: ["#080e1c", "#0f1b32", "#182b4a", "#243e66", "#355888"],
    cloud: ["#172542", "#243a61", "#355382"],
    far: ["#101c33", "#192a4a"],
    mid: ["#0e172a", "#17253d", "#223454"],
    grass: ["#0f1b2b", "#182b40", "#244059", "#345975", "#4c749e"],
    earth: ["#10121e", "#1a1e2e", "#262c40"],
    stone: ["#171e30", "#242e47", "#344263"],
    wood: ["#21141a", "#362024", "#523131"],
    light: ["#e09446", "#ffcf76", "#fff2c6"],
    sun: ["#94b2d9", "#c2d7f0", "#ebf4ff"],
    accent: ["#8a2a42", "#c7485d", "#f0848a"],
    cool: ["#4c749e", "#8cb8e0"],
    rim: "#749ac9",
    charTint: ["#21325e", 0.14],
  },
  storm: {
    name: "storm",
    ink: "#060812",
    paper: "#eef4ff",
    sky: ["#060814", "#0c1124", "#121b38", "#1a284f", "#243769"],
    cloud: ["#111830", "#1a2547", "#253563"],
    far: ["#0c1226", "#131c38"],
    mid: ["#090e1f", "#111933", "#19254a"],
    grass: ["#08101c", "#101e30", "#192f47", "#254463", "#366085"],
    earth: ["#080b14", "#101524", "#192036"],
    stone: ["#111729", "#1d2742", "#2c3a61"],
    wood: ["#140f1a", "#221826", "#332536"],
    light: ["#e08844", "#ffca6e", "#fff0be"],
    sun: ["#9fc4eb", "#cfe5fc", "#f0f7ff"],
    accent: ["#9c2248", "#d9467a", "#ff84a8"],
    cool: ["#56b8e8", "#b3e0ff"],
    rim: "#80b4eb",
    charTint: ["#182552", 0.24],
  },
  dawn: {
    name: "dawn",
    ink: "#131224",
    paper: "#fff7ed",
    sky: ["#1a2146", "#384276", "#735c8a", "#c97882", "#f3b07a", "#ffe6b3"],
    cloud: ["#4f4a7a", "#9e6f86", "#f2b895"],
    far: ["#292c54", "#3d3f6e"],
    mid: ["#1f2242", "#2f3259", "#464773"],
    grass: ["#182038", "#263152", "#3a486e", "#57688c", "#7c8ea8"],
    earth: ["#1a182e", "#292642", "#3d395c"],
    stone: ["#232645", "#353961", "#4e5282"],
    wood: ["#261c2e", "#3d2c42", "#594159"],
    light: ["#f0a25e", "#ffd480", "#fff5c8"],
    sun: ["#ffc073", "#ffe199", "#fff9de"],
    accent: ["#a8405a", "#de6677", "#ffa3a3"],
    cool: ["#7a8ec9", "#b8c8f0"],
    rim: "#ffd09e",
    charTint: ["#ffb888", 0.08],
  },
};

export function mixHex(a: string, b: string, k: number): string {
  const t = Math.max(0, Math.min(1, k));
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * t);
  const g = Math.round(((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t);
  const bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
}
