import { FormulaireReservation } from "@/components/FormulaireReservation";
import { MARQUE, SLOGAN } from "@/lib/config";

export default async function Accueil({ searchParams }: { searchParams: Promise<{ annule?: string }> }) {
  const { annule } = await searchParams;
  return (
    <div className="space-y-10">
      <section className="rounded-3xl bg-gradient-to-br from-marque to-marque-fonce px-6 py-10 text-white sm:px-10">
        <h1 className="max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">{SLOGAN}</h1>
        <p className="mt-3 max-w-xl text-teal-50">
          Un achat sur Leboncoin, une livraison de magasin, un petit déménagement : choisissez votre trajet, obtenez
          un prix fixe immédiatement, un transporteur vérifié s&apos;occupe du reste.
        </p>
        <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
          <li className="rounded-xl bg-white/10 p-3">✅ Prix fixe, sans négociation</li>
          <li className="rounded-xl bg-white/10 p-3">🚚 Transporteurs pros inscrits et assurés</li>
          <li className="rounded-xl bg-white/10 p-3">🔒 Code de livraison : vous payez, il livre</li>
        </ul>
      </section>

      {annule && (
        <p className="rounded-lg bg-amber-50 p-3 text-amber-800">Paiement annulé : votre commande n&apos;a pas été validée.</p>
      )}

      <section id="reserver" className="scroll-mt-20">
        <h2 className="mb-4 text-2xl font-bold">Réserver un transport</h2>
        <FormulaireReservation />
      </section>

      <section className="carte grid gap-4 sm:grid-cols-2">
        <div>
          <h2 className="text-xl font-bold">Vous êtes un magasin ou une entreprise ?</h2>
          <p className="mt-1 text-slate-600">
            Réservez vos livraisons clients depuis votre ordinateur. Volume régulier ? Contactez-nous pour un tarif pro.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-bold">Vous avez un utilitaire ?</h2>
          <p className="mt-1 text-slate-600">
            Rejoignez {MARQUE} et recevez des courses près de chez vous. Paiement garanti après chaque livraison.
          </p>
          <a href="/transporteur" className="bouton mt-3">Devenir transporteur</a>
        </div>
      </section>
    </div>
  );
}
