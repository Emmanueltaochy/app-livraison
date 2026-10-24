import Link from "next/link";
import { Logo } from "@/components/Logo";
import { utilisateurCourant } from "@/lib/auth";
import { MARQUE } from "@/lib/config";

// Site client : en-tête noir, pied de page. L'app transporteur a sa propre mise en page.
export default async function MiseEnPageSite({ children }: Readonly<{ children: React.ReactNode }>) {
  const u = await utilisateurCourant().catch(() => null);
  const espace =
    u?.role === "admin" ? { href: "/admin", libelle: "Administration" } : u?.role === "transporteur" ? { href: "/transporteur", libelle: "Espace transporteur" } : null;

  return (
    <>
      <header className="bg-noir pt-[env(safe-area-inset-top)] text-blanc">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 py-4 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:px-6">
          <Link href={u?.role === "transporteur" ? "/?client=1" : "/"} aria-label={`${MARQUE}, accueil`}>
            <Logo />
          </Link>
          <div className="flex items-center gap-6 text-petit font-bold">
            <Link href="/#pro" className="hidden hover:text-jaune md:inline">
              Magasins et entreprises
            </Link>
            {!espace && (
              <Link href="/transporteur" className="hidden hover:text-jaune md:inline">
                Devenir transporteur
              </Link>
            )}
            <Link
              href={espace?.href ?? "/connexion?retour=/transporteur"}
              className={`rounded-bouton px-4 py-2.5 ${espace ? "bg-jaune text-noir hover:bg-jaune-survol" : "border border-blanc/70 hover:border-jaune hover:text-jaune"}`}
            >
              {espace?.libelle ?? "Me connecter"}
            </Link>
          </div>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mx-auto w-full max-w-6xl px-4 pt-4 pb-28 text-[0.75rem] text-gris-500 sm:px-6 lg:pb-6">
        <div className="flex flex-col gap-1 border-t border-gris-100 pt-4 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {MARQUE} · La Réunion · Transporteurs inscrits au registre des transporteurs</p>
          <p className="flex gap-4">
            <span>CGV</span>
            <span>Mentions légales</span>
          </p>
        </div>
      </footer>
    </>
  );
}
