"use client";

import { loadConnectAndInitialize } from "@stripe/connect-js";
import { ConnectAccountOnboarding, ConnectComponentsProvider } from "@stripe/react-connect-js";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { sessionInscriptionStripe } from "@/app/actions/transporteur";

// Formulaire d'inscription Stripe (identité, IBAN) affiché dans l'app, aux couleurs de FretPéi.
export function InscriptionStripe({ clePublique }: { clePublique: string }) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string>();
  const [connect] = useState(() =>
    loadConnectAndInitialize({
      publishableKey: clePublique,
      locale: "fr-FR",
      fetchClientSecret: async () => {
        const r = await sessionInscriptionStripe();
        if (!r.secret) {
          setErreur(r.erreur);
          throw new Error(r.erreur);
        }
        return r.secret;
      },
      appearance: {
        variables: {
          colorPrimary: "#121212",
          colorBackground: "#ffffff",
          colorText: "#121212",
          buttonPrimaryColorBackground: "#FFC800",
          buttonPrimaryColorText: "#121212",
          borderRadius: "12px",
          fontFamily: "Archivo, system-ui, sans-serif",
        },
      },
    }),
  );

  if (erreur) return <p className="rounded-carte bg-erreur-clair p-4 font-bold text-erreur" role="alert">Stripe a refusé l&apos;activation : {erreur}</p>;
  return (
    <div className="rounded-carte bg-blanc p-4 text-noir sm:p-6">
      <ConnectComponentsProvider connectInstance={connect}>
        <ConnectAccountOnboarding onExit={() => router.push("/transporteur?virements=1")} />
      </ConnectComponentsProvider>
    </div>
  );
}
