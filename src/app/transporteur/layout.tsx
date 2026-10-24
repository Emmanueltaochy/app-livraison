import { LogOut } from "lucide-react";
import { deconnexion } from "@/app/actions/connexion";
import { Symbole } from "@/components/Logo";
import { BarreOnglets } from "./BarreOnglets";
import { chargerTransporteur, coursesEnCours } from "./donnees";
import { InterrupteurEnLigne } from "./InterrupteurEnLigne";
import { SuiviTransporteur } from "./SuiviTransporteur";

export const dynamic = "force-dynamic";

// App chauffeur : sa propre mise en page, sans l'en-tête ni le pied de page du site client.
export default async function MiseEnPageTransporteur({ children }: Readonly<{ children: React.ReactNode }>) {
  const { t } = await chargerTransporteur();
  const valide = t?.statut === "valide";
  const enCours = valide ? (await coursesEnCours(t.id)).length : 0;

  return (
    <div className="flex min-h-dvh flex-col bg-noir text-blanc">
      <header className="sticky top-0 z-20 border-b border-noir-700 bg-noir pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:px-6">
          <span className="flex items-center gap-2.5">
            <Symbole className="size-8" />
            <span className="leading-tight">
              <span className="block font-extrabold">FretPéi</span>
              <span className="block text-[0.7rem] font-bold tracking-wider text-jaune">CHAUFFEUR</span>
            </span>
          </span>
          {valide ? (
            <InterrupteurEnLigne enLigne={t.en_ligne} />
          ) : (
            <form action={deconnexion}>
              <button className="flex items-center gap-2 text-petit text-gris-300 hover:text-jaune">
                <LogOut className="size-4" /> Se déconnecter
              </button>
            </form>
          )}
        </div>
      </header>
      <main className={`mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 pt-6 sm:px-6 ${valide ? "pb-[calc(6rem+env(safe-area-inset-bottom))]" : "pb-14"}`}>
        {valide && <SuiviTransporteur enLigne={t.en_ligne} enCourse={enCours > 0} />}
        {children}
      </main>
      {valide && <BarreOnglets enCours={enCours} />}
    </div>
  );
}
