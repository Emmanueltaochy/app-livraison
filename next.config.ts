import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produit un serveur Node autonome, léger, pour l'image Docker du VPS.
  output: "standalone",
};

export default nextConfig;
