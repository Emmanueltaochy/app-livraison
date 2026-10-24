// Couleurs des statuts selon la charte : Recherche = alerte · En route = info ·
// Chargée = jaune-clair/noir · Livrée = succès · Annulée = erreur.
export const STATUTS: Record<string, { libelle: string; court: string; couleur: string }> = {
  attente_paiement: { libelle: "En attente de paiement", court: "Paiement", couleur: "bg-gris-100 text-gris-700" },
  payee: { libelle: "Recherche d'un transporteur", court: "Recherche", couleur: "bg-alerte-clair text-alerte" },
  acceptee: { libelle: "Transporteur en route", court: "En route", couleur: "bg-info-clair text-info" },
  enlevee: { libelle: "Marchandise chargée", court: "Chargée", couleur: "bg-jaune-clair text-noir" },
  livree: { libelle: "Livrée", court: "Livrée", couleur: "bg-succes-clair text-succes" },
  annulee: { libelle: "Annulée", court: "Annulée", couleur: "bg-erreur-clair text-erreur" },
};

export const ETAPES = ["payee", "acceptee", "enlevee", "livree"] as const;

export function dateReunion(iso: string | Date): string {
  return new Date(iso).toLocaleString("fr-FR", {
    timeZone: "Indian/Reunion",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function heureReunion(iso: string | Date): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { timeZone: "Indian/Reunion", hour: "2-digit", minute: "2-digit" });
}
