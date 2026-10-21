"use client";

import { useActionState } from "react";
import { confirmerLivraison } from "@/app/actions/transporteur";

export function FormulaireLivraison({ id }: { id: string }) {
  const [etat, action, enCours] = useActionState(confirmerLivraison, {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-2 border-t border-slate-200 pt-3">
      <input type="hidden" name="id" value={id} />
      <div className="flex-1">
        <label className="etiquette" htmlFor={`code-${id}`}>Code donné par le client</label>
        <input id={`code-${id}`} name="code" inputMode="numeric" pattern="\d{4}" maxLength={4} required className="champ tracking-widest" />
      </div>
      <button className="bouton" disabled={enCours}>Confirmer la livraison</button>
      {etat.erreur && <p className="w-full text-sm text-red-700">{etat.erreur}</p>}
    </form>
  );
}
