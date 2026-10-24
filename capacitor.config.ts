import type { CapacitorConfig } from "@capacitor/cli";

// App mobile (iOS / Android) : une coque native qui charge la plateforme en ligne.
// Toute mise à jour du site est donc visible dans l'app sans republier sur les stores ;
// seules les fonctions natives (GPS en arrière-plan, notifications) passent par les plugins.
const config: CapacitorConfig = {
  // ⚠️ Identifiant définitif sur les stores : à valider avant la première publication.
  appId: "re.fretpei.app",
  appName: "FretPéi",
  webDir: "mobile/www", // page « pas de connexion » embarquée
  server: {
    url: process.env.CAPACITOR_SERVER_URL ?? "https://livraison.taochyconsulting.fr",
    cleartext: false,
    errorPath: "index.html",
  },
  android: {
    // Évite l'arrêt du suivi GPS après 5 min en arrière-plan (plugin background-geolocation).
    useLegacyBridge: true,
  },
  plugins: {
    CapacitorCookies: { enabled: true }, // la session du site est partagée avec les requêtes natives
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
  },
};

export default config;
