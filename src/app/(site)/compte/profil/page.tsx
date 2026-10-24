import { LogOut } from "lucide-react";
import { deconnexion } from "@/app/actions/connexion";
import { exigerConnexion } from "@/lib/auth";
import { FormulaireProfil } from "./FormulaireProfil";

export default async function Profil() {
  const u = await exigerConnexion("/compte/profil");
  return (
    <>
      <div className="carte space-y-4">
        <h2 className="text-h4 font-extrabold">Mes coordonnées</h2>
        <p className="text-petit text-gris-500">Préremplies à chaque réservation. Votre numéro n&apos;est transmis qu&apos;au transporteur qui accepte la course.</p>
        <FormulaireProfil nom={u.nom ?? ""} telephone={u.telephone ?? ""} />
      </div>
      <div className="carte space-y-2">
        <h2 className="text-h4 font-extrabold">Connexion</h2>
        <p className="text-petit text-gris-500">Sans mot de passe : un code vous est envoyé à {u.email} à chaque connexion.</p>
        <form action={deconnexion}>
          <button className="bouton-secondaire mt-2"><LogOut className="size-4" /> Se déconnecter</button>
        </form>
      </div>
    </>
  );
}
