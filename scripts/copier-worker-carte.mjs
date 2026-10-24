// Copie le « worker » de MapLibre dans public/ : la carte le charge séparément du bundle.
// Lancé automatiquement avant `npm run dev` et `npm run build` (version toujours synchronisée).
import { copyFileSync } from "node:fs";

copyFileSync("node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", "public/maplibre-gl-worker.mjs");
