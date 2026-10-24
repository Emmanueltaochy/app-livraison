"use client";

import { MailCheck } from "lucide-react";
import { useActionState } from "react";
import { envoyerLien, validerCode } from "./actions";

// Étape 1 : e-mail. Étape 2 : code à 6 chiffres reçu par e-mail (indispensable dans l'app,
// où le lien de l'e-mail s'ouvrirait dans Safari et non dans l'app).
export function FormulaireConnexion({ retour }: { retour: string }) {
  const [envoi, demander, envoiEnCours] = useActionState(envoyerLien, {});
  const [verif, verifier, verifEnCours] = useActionState(validerCode, {});

  if (envoi.ok && envoi.email)
    return (
      <form action={verifier} className="space-y-4">
        <div className="flex gap-3 rounded-bouton bg-succes-clair p-4 text-succes">
          <MailCheck className="size-6 shrink-0" />
          <p className="font-bold">{envoi.ok} Saisissez le code reçu par e-mail.</p>
        </div>
        <input type="hidden" name="email" value={envoi.email} />
        <input type="hidden" name="retour" value={retour} />
        <div>
          <label className="etiquette" htmlFor="code">Code à 6 chiffres</label>
          <input
            id="code"
            name="code"
            className="champ chiffres h-16 text-center text-h2 font-extrabold tracking-[0.4em]"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
          />
        </div>
        {verif.erreur && <p className="text-petit font-bold text-erreur">{verif.erreur}</p>}
        <button className="bouton w-full" disabled={verifEnCours}>{verifEnCours ? "Vérification…" : "Me connecter"}</button>
        <p className="text-center text-petit text-gris-500">Vous pouvez aussi cliquer sur le lien de l&apos;e-mail depuis ce même appareil.</p>
      </form>
    );

  return (
    <form action={demander} className="space-y-4">
      <input type="hidden" name="retour" value={retour} />
      <div>
        <label className="etiquette" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" required className="champ" autoComplete="email" />
      </div>
      {envoi.erreur && <p className="text-petit font-bold text-erreur">{envoi.erreur}</p>}
      <button className="bouton w-full" disabled={envoiEnCours}>{envoiEnCours ? "Envoi…" : "Recevoir mon code"}</button>
    </form>
  );
}
