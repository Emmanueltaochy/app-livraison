import { validerConnexion } from "../actions";

// Un clic est demandé (POST) : les antivirus des messageries ouvrent les liens
// automatiquement, ce qui consommerait le jeton avant l'utilisateur.
export default async function Verifier({ searchParams }: { searchParams: Promise<{ jeton?: string; retour?: string }> }) {
  const { jeton, retour } = await searchParams;
  return (
    <form action={validerConnexion} className="mx-auto max-w-md carte space-y-4 text-center">
      <h1 className="text-2xl font-bold">Connexion</h1>
      <input type="hidden" name="jeton" value={jeton ?? ""} />
      <input type="hidden" name="retour" value={retour ?? "/"} />
      <button className="bouton w-full">Me connecter</button>
    </form>
  );
}
