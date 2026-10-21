export const STATUTS: Record<string, { libelle: string; couleur: string }> = {
  attente_paiement: { libelle: "En attente de paiement", couleur: "bg-slate-100 text-slate-700" },
  payee: { libelle: "Recherche d'un transporteur", couleur: "bg-amber-100 text-amber-800" },
  acceptee: { libelle: "Transporteur en route", couleur: "bg-blue-100 text-blue-800" },
  enlevee: { libelle: "Marchandise chargée", couleur: "bg-indigo-100 text-indigo-800" },
  livree: { libelle: "Livrée", couleur: "bg-green-100 text-green-800" },
  annulee: { libelle: "Annulée", couleur: "bg-red-100 text-red-700" },
};

export const ETAPES = ["payee", "acceptee", "enlevee", "livree"] as const;

export function dateReunion(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    timeZone: "Indian/Reunion",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
