import { LogIn } from "lucide-react";
import { validerConnexion } from "@/app/actions/connexion";

// Un clic est demandé (POST) : les antivirus des messageries ouvrent les liens
// automatiquement, ce qui consommerait le jeton avant l'utilisateur.
export default async function Verifier({ searchParams }: { searchParams: Promise<{ jeton?: string; retour?: string }> }) {
  const { jeton, retour } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <form action={validerConnexion} className="carte space-y-5 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-bouton bg-jaune">
          <LogIn className="size-6" />
        </span>
        <h1 className="titre text-h2">Connexion</h1>
        <input type="hidden" name="jeton" value={jeton ?? ""} />
        <input type="hidden" name="retour" value={retour ?? "/"} />
        <button className="bouton w-full">Confirmer la connexion</button>
      </form>
    </div>
  );
}
