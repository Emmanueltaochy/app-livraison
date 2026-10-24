import { Banknote, Bell, FileCheck, LogOut, Package } from "lucide-react";
import Link from "next/link";
import { deconnexion } from "@/app/actions/connexion";
import { connecterStripe } from "@/app/actions/transporteur";
import { une } from "@/lib/db";
import { stripeConfigure } from "@/lib/stripe";
import { exigerTransporteurValide } from "../donnees";
import { Titre } from "../Pastille";
import { FormulaireCompte } from "./FormulaireCompte";

function Bloc({ titre, icone: Icone, children }: { titre: string; icone: typeof Bell; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-carte bg-noir-800 p-5">
      <h2 className="flex items-center gap-2 text-h4 font-extrabold">
        <Icone className="size-5 text-jaune" /> {titre}
      </h2>
      {children}
    </section>
  );
}

// Onglet « Compte » : profil, véhicule, documents, virements, notifications.
export default async function Compte() {
  const { u, t } = await exigerTransporteurValide();
  const appareils = await une<{ nombre: string }>("select count(*) as nombre from appareils where utilisateur_id = $1", [u.id]);
  const notifications = Number(appareils?.nombre ?? 0) > 0;

  return (
    <>
      <Titre sousTitre={u.email}>Mon compte</Titre>

      <div className="rounded-carte bg-blanc p-5 text-noir sm:p-6">
        <h2 className="mb-4 text-h4 font-extrabold">Profil et véhicule</h2>
        <FormulaireCompte valeurs={{ nom: u.nom ?? "", telephone: u.telephone ?? "", vehicule: t.vehicule, immatriculation: t.immatriculation }} />
      </div>

      <Bloc titre="Documents" icone={FileCheck}>
        <dl className="grid gap-3 text-petit sm:grid-cols-2">
          {[
            ["Entreprise", t.raison_sociale],
            ["SIRET", t.siret],
            ["Registre des transporteurs", t.numero_registre_transport],
            ["Assurance marchandises", t.assurance_marchandises],
          ].map(([libelle, valeur]) => (
            <div key={libelle}>
              <dt className="text-gris-300">{libelle}</dt>
              <dd className="font-bold">{valeur}</dd>
            </div>
          ))}
        </dl>
        <p className="text-petit text-gris-300">Vérifiés à l&apos;inscription. Pour les modifier, contactez-nous : nous revérifions le dossier.</p>
      </Bloc>

      <Bloc titre="Virements" icone={Banknote}>
        {t.stripe_pret ? (
          <p className="text-gris-300">Virements actifs : vous êtes payé après chaque livraison confirmée.</p>
        ) : stripeConfigure() ? (
          <form action={connecterStripe}>
            <p className="mb-3 text-gris-300">Renseignez votre IBAN pour être payé après chaque livraison.</p>
            <button className="bouton w-full bg-jaune text-noir hover:bg-jaune-survol">Activer avec Stripe</button>
          </form>
        ) : (
          <p className="text-gris-300">Les virements seront activés au lancement des paiements.</p>
        )}
      </Bloc>

      <Bloc titre="Notifications" icone={Bell}>
        <p className="text-gris-300">
          {notifications
            ? "Ce téléphone reçoit les nouvelles courses en notification."
            : "Installez l'app FretPéi et autorisez les notifications pour être prévenu des nouvelles courses."}
        </p>
      </Bloc>

      <Link href="/?client=1" className="flex h-14 items-center justify-center gap-2 rounded-carte border-2 border-noir-700 font-extrabold hover:border-jaune">
        <Package className="size-5" /> Commander un transport (côté client)
      </Link>
      <form action={deconnexion}>
        <button className="flex h-14 w-full items-center justify-center gap-2 rounded-carte font-extrabold text-gris-300 hover:text-erreur">
          <LogOut className="size-5" /> Se déconnecter
        </button>
      </form>
    </>
  );
}
