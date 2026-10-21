// Coque mobile (iOS / Android) : l'app charge la plateforme web en ligne,
// donc toute mise à jour du site est visible dans l'app sans republier sur les stores.
// Les modules natifs (GPS, notifications, appareil photo) s'ajoutent via les plugins Capacitor.
// Mise en route : voir README, section « Application mobile ».
const config = {
  appId: "re.fretpei.app",
  appName: "FretPéi",
  webDir: "public",
  server: {
    url: process.env.CAPACITOR_SERVER_URL ?? "https://fretpei.re",
    cleartext: false,
  },
};

export default config;
