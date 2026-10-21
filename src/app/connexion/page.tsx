import { FormulaireConnexion } from "./FormulaireConnexion";

export default async function Connexion({ searchParams }: { searchParams: Promise<{ retour?: string; erreur?: string }> }) {
  const { retour, erreur } = await searchParams;
  return (
    <div className="mx-auto max-w-md carte space-y-4">
      <h1 className="text-2xl font-bold">Connexion</h1>
      <p className="text-slate-600">Recevez un lien de connexion par e-mail, sans mot de passe.</p>
      {erreur && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">Lien expiré ou invalide, recommencez.</p>}
      <FormulaireConnexion retour={retour?.startsWith("/") ? retour : "/transporteur"} />
    </div>
  );
}
