import type { MetadataRoute } from "next";
import { MARQUE, SLOGAN } from "@/lib/config";

// Permet d'installer le site comme une app (« Ajouter à l'écran d'accueil »).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: MARQUE,
    short_name: MARQUE,
    description: SLOGAN,
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#121212",
    lang: "fr",
    icons: [{ src: "/icone.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
