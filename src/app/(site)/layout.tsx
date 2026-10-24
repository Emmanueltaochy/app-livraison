import Link from "next/link";
import { Logo } from "@/components/Logo";
import { MenuMobile } from "@/components/MenuMobile";
import { utilisateurCourant } from "@/lib/auth";
import { MARQUE } from "@/lib/config";
import { MENU, PIED_DE_PAGE } from "@/lib/navigation";

// Site client : en-tête avec menu, pied de page complet. L'app transporteur a sa propre mise en page.
export default async function MiseEnPageSite({ children }: Readonly<{ children: React.ReactNode }>) {
  const u = await utilisateurCourant().catch(() => null);
  const compte =
    u?.role === "admin"
      ? { href: "/admin", libelle: "Administration" }
      : u?.role === "transporteur"
        ? { href: "/transporteur", libelle: "Espace transporteur" }
        : u
          ? { href: "/compte", libelle: "Mon compte" }
          : { href: "/connexion?retour=/compte", libelle: "Me connecter" };

  return (
    <>
      <header className="sticky top-0 z-30 bg-noir pt-[env(safe-area-inset-top)] text-blanc">
        <nav className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between gap-4 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:px-6">
          <Link href={u?.role === "transporteur" ? "/?client=1" : "/"} aria-label={`${MARQUE}, accueil`}>
            <Logo />
          </Link>
          <ul className="hidden items-center gap-6 text-petit font-bold lg:flex">
            {MENU.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-jaune">{l.libelle}</Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 text-petit font-bold">
            <Link href={compte.href} className={`hidden rounded-bouton px-4 py-2.5 sm:inline-flex ${u ? "hover:text-jaune" : "border border-blanc/70 hover:border-jaune hover:text-jaune"}`}>
              {compte.libelle}
            </Link>
            <Link href="/#reserver" className="hidden rounded-bouton bg-jaune px-4 py-2.5 text-noir hover:bg-jaune-survol sm:inline-flex">
              Réserver
            </Link>
            <Link href={compte.href} className="rounded-bouton border border-blanc/70 px-3 py-2 sm:hidden">
              {u ? "Compte" : "Connexion"}
            </Link>
            <MenuMobile compte={compte} />
          </div>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-16 bg-noir pt-12 pb-32 text-blanc lg:pb-12">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-[1.3fr_repeat(4,1fr)]">
          <div className="space-y-3">
            <Logo />
            <p className="max-w-xs text-petit text-gris-300">Le transport de marchandises à La Réunion, au prix annoncé, par des transporteurs vérifiés.</p>
          </div>
          {PIED_DE_PAGE.map((col) => (
            <div key={col.titre}>
              <p className="text-petit font-extrabold tracking-wider text-jaune uppercase">{col.titre}</p>
              <ul className="mt-3 space-y-2 text-petit text-gris-300">
                {col.liens.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-blanc">{l.libelle}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-6xl border-t border-noir-700 px-4 pt-6 text-[0.75rem] text-gris-500 sm:px-6">
          © {new Date().getFullYear()} {MARQUE} · La Réunion · Transporteurs inscrits au registre des transporteurs
        </p>
      </footer>
    </>
  );
}
