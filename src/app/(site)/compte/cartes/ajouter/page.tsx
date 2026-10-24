import { redirect } from "next/navigation";
import { PaiementIntegre } from "@/app/(site)/paiement/[jeton]/PaiementIntegre";
import { exigerConnexion } from "@/lib/auth";
import { clientStripe } from "@/lib/paiement";
import { clePublique, stripe, stripeConfigure, urlSite } from "@/lib/stripe";

export const dynamic = "force-dynamic";

// Ajout d'une carte sans payer (Stripe en mode « setup », affiché dans la page).
export default async function AjouterCarte() {
  const u = await exigerConnexion("/compte/cartes/ajouter");
  const cle = clePublique();
  if (!cle || !stripeConfigure()) redirect("/compte/cartes");
  const session = await stripe().checkout.sessions.create({
    mode: "setup",
    ui_mode: "embedded_page",
    currency: "eur",
    customer: await clientStripe(u),
    locale: "fr",
    return_url: `${urlSite()}/compte/cartes?ajoutee=1`,
  });
  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="titre text-h3">Ajouter une carte</h2>
      <PaiementIntegre clePublique={cle} clientSecret={session.client_secret!} />
    </div>
  );
}
