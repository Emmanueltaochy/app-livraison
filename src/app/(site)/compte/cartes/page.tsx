import { CreditCard, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { supprimerCarte } from "@/app/actions/compte";
import { exigerConnexion } from "@/lib/auth";
import { une } from "@/lib/db";
import { stripe, stripeConfigure } from "@/lib/stripe";

const MARQUES: Record<string, string> = { visa: "Visa", mastercard: "Mastercard", amex: "American Express", cartes_bancaires: "CB" };

// Mes cartes : enregistrées chez Stripe (nous ne voyons que la marque et les 4 derniers chiffres).
export default async function Cartes({ searchParams }: { searchParams: Promise<{ ajoutee?: string }> }) {
  const { ajoutee } = await searchParams;
  const u = await exigerConnexion("/compte/cartes");
  const ligne = await une<{ stripe_customer_id: string | null }>("select stripe_customer_id from utilisateurs where id = $1", [u.id]);
  const cartes =
    stripeConfigure() && ligne?.stripe_customer_id
      ? (await stripe().customers.listPaymentMethods(ligne.stripe_customer_id, { type: "card", limit: 20 }).catch(() => ({ data: [] }))).data
      : [];

  return (
    <>
      {ajoutee && <p className="rounded-bouton bg-succes-clair p-4 font-bold text-succes">Carte enregistrée : elle vous sera proposée au prochain paiement.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="titre text-h3">Mes cartes</h2>
        {stripeConfigure() && (
          <Link href="/compte/cartes/ajouter" className="bouton h-11"><Plus className="size-4" /> Ajouter une carte</Link>
        )}
      </div>
      <ul className="space-y-3">
        {cartes.map((pm) => (
          <li key={pm.id} className="carte flex items-center gap-4">
            <span className="flex h-11 w-16 shrink-0 items-center justify-center rounded-champ bg-noir text-jaune"><CreditCard className="size-6" /></span>
            <span className="flex-1">
              <span className="block font-extrabold">{MARQUES[pm.card?.display_brand ?? pm.card?.brand ?? ""] ?? pm.card?.brand} •••• {pm.card?.last4}</span>
              <span className="chiffres block text-petit text-gris-500">Expire fin {String(pm.card?.exp_month).padStart(2, "0")}/{pm.card?.exp_year}</span>
            </span>
            <form action={supprimerCarte}>
              <input type="hidden" name="id" value={pm.id} />
              <button className="flex size-11 items-center justify-center rounded-bouton text-gris-500 hover:bg-erreur-clair hover:text-erreur" aria-label={`Supprimer la carte se terminant par ${pm.card?.last4}`}>
                <Trash2 className="size-5" />
              </button>
            </form>
          </li>
        ))}
        {cartes.length === 0 && (
          <li className="carte text-gris-500">
            Aucune carte enregistrée. Cochez « Enregistrer mes informations » lors d&apos;un paiement, ou ajoutez une carte ici.
          </li>
        )}
      </ul>
      <p className="text-petit text-gris-500">Les cartes sont conservées de façon sécurisée par Stripe (certifié PCI-DSS). {`FretPéi`} ne stocke aucun numéro de carte.</p>
    </>
  );
}
