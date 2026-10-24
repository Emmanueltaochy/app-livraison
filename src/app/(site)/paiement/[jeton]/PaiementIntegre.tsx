"use client";

import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { useMemo } from "react";

// Formulaire de paiement Stripe affiché dans notre page (carte, Apple Pay, Google Pay, cartes enregistrées).
export function PaiementIntegre({ clePublique, clientSecret }: { clePublique: string; clientSecret: string }) {
  const stripe = useMemo<Promise<Stripe | null>>(() => loadStripe(clePublique, { locale: "fr" }), [clePublique]);
  return (
    <div className="overflow-hidden rounded-carte bg-blanc shadow-carte" id="paiement">
      <EmbeddedCheckoutProvider stripe={stripe} options={{ clientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
