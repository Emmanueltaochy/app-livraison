import { Mail } from "lucide-react";
import { FormulaireConnexion } from "./FormulaireConnexion";

export default async function Connexion({ searchParams }: { searchParams: Promise<{ retour?: string; erreur?: string }> }) {
  const { retour, erreur } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="carte space-y-5">
        <span className="flex size-12 items-center justify-center rounded-bouton bg-jaune">
          <Mail className="size-6" />
        </span>
        <div>
          <h1 className="titre text-h2">Connexion</h1>
          <p className="mt-1 text-gris-500">Recevez un lien de connexion par e-mail, sans mot de passe.</p>
        </div>
        {erreur && <p className="rounded-bouton bg-erreur-clair p-3 text-petit font-bold text-erreur">Lien expiré ou déjà utilisé, demandez-en un nouveau.</p>}
        <FormulaireConnexion retour={retour?.startsWith("/") ? retour : "/transporteur"} />
      </div>
    </div>
  );
}
