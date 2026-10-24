import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Contenu, EnTetePage } from "@/components/site/Page";
import { TARIFS } from "@/lib/pricing";

export const metadata: Metadata = { title: "Aide — FretPéi" };

const QUESTIONS: { theme: string; q: { question: string; reponse: React.ReactNode }[] }[] = [
  {
    theme: "Réserver",
    q: [
      { question: "Comment est calculé le prix ?", reponse: <>À partir de la distance par la route, du véhicule, du temps de manutention (objets, étages, ascenseur, portage) et du nombre de personnes. Détail sur la page <Link href="/tarifs">Tarifs</Link>.</> },
      { question: "Le prix peut-il changer après la réservation ?", reponse: "Non : vous payez le prix affiché. Si la marchandise ne correspond pas du tout à la description (objets en plus, étage non signalé), le transporteur peut refuser la prise en charge." },
      { question: "Combien de temps à l'avance faut-il réserver ?", reponse: "« Maintenant » : prise en charge dans l'heure, selon les transporteurs disponibles. Vous pouvez aussi programmer jusqu'à plusieurs semaines à l'avance, de 6 h à 20 h." },
      { question: "Et si mon chargement dépasse 20 m³ ?", reponse: <>Il faut plusieurs voyages ou un devis sur mesure : <Link href="/contact">contactez-nous</Link>.</> },
    ],
  },
  {
    theme: "Paiement",
    q: [
      { question: "Quand suis-je débité ?", reponse: "À la réservation, par carte bancaire, via Stripe (paiement sécurisé 3-D Secure). Le transporteur n'est payé qu'après la livraison confirmée par votre code." },
      { question: "Puis-je annuler ?", reponse: "Gratuitement tant qu'aucun transporteur n'a accepté la course : vous êtes remboursé en totalité. Après acceptation, contactez-nous." },
      { question: "Je suis une entreprise, ai-je une facture ?", reponse: "Oui : le reçu de paiement est disponible dans votre espace. Pour un volume régulier, demandez un compte professionnel." },
    ],
  },
  {
    theme: "Le jour J",
    q: [
      { question: "À quoi sert le code de livraison ?", reponse: "C'est votre signature : donnez-le au transporteur seulement après avoir vérifié la marchandise. Il confirme la livraison et déclenche son paiement." },
      { question: "Puis-je suivre le transporteur ?", reponse: "Oui : depuis votre lien de suivi ou votre espace, vous voyez le camion en direct sur la carte et l'heure d'arrivée estimée." },
      { question: "Que se passe-t-il si un objet est abîmé ?", reponse: `Signalez-le avant de donner votre code et contactez-nous. Les transporteurs sont assurés pour les marchandises transportées ; l'assurance renforcée (${(TARIFS.assuranceRenforceeCts / 100).toFixed(0)} €) est conseillée pour les biens de valeur.` },
    ],
  },
  {
    theme: "Transporteurs",
    q: [
      { question: "Quelles conditions pour devenir transporteur ?", reponse: <>SIRET, inscription au registre des transporteurs (DEAL Réunion), assurance marchandises et un utilitaire. Voir <Link href="/devenir-transporteur">Devenir transporteur</Link>.</> },
      { question: "Quand suis-je payé ?", reponse: `Dès la livraison confirmée par le code du client, ${100 - TARIFS.commissionTaux * 100} % du prix du transport sont virés sur votre compte.` },
    ],
  },
];

export default function Aide() {
  return (
    <>
      <EnTetePage surtitre="Aide" titre="Questions fréquentes" texte="Vous ne trouvez pas la réponse ? Écrivez-nous, nous répondons rapidement." />
      <Contenu etroit>
        {QUESTIONS.map((t) => (
          <section key={t.theme} className="space-y-3">
            <h2 className="titre text-h3">{t.theme}</h2>
            <div className="divide-y divide-gris-100 rounded-carte bg-blanc shadow-carte">
              {t.q.map((q) => (
                <details key={q.question} className="group p-5 [&_a]:font-bold [&_a]:underline">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-extrabold">
                    {q.question}
                    <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-gris-700">{q.reponse}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
        <p className="text-center">
          <Link href="/contact" className="bouton-noir h-14 px-8">Nous contacter</Link>
        </p>
      </Contenu>
    </>
  );
}
