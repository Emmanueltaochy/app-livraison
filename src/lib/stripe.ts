import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

export function stripeConfigure(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY manquante (voir README)");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

// Paiement simulé pour tester en local sans compte Stripe. Jamais en production.
export function paiementDemo(): boolean {
  return process.env.PAIEMENT_DEMO === "1" && process.env.NODE_ENV !== "production";
}

export function urlSite(): string {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

// Un transporteur ne fait que recevoir des virements : il est prêt quand les transferts
// sont actifs et que les versements vers son IBAN sont autorisés (pas besoin d'encaisser).
export function comptePret(compte: Stripe.Account | null | undefined): boolean {
  return Boolean(compte?.capabilities?.transfers === "active" && compte.payouts_enabled);
}

// Clé publique (pk_…) lue à l'exécution : le paiement s'affiche dans la page (Stripe intégré).
// Sans elle, on retombe sur la page de paiement hébergée par Stripe.
export const clePublique = () => process.env.STRIPE_PUBLISHABLE_KEY ?? null;
