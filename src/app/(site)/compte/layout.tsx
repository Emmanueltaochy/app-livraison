import { redirect } from "next/navigation";
import { exigerConnexion } from "@/lib/auth";
import { OngletsCompte } from "./Onglets";

export const dynamic = "force-dynamic";

// Espace client : réservé aux comptes connectés ; un transporteur a son app à lui.
export default async function MiseEnPageCompte({ children }: Readonly<{ children: React.ReactNode }>) {
  const u = await exigerConnexion("/compte");
  if (u.role === "transporteur") redirect("/transporteur");
  return (
    <>
      <section className="bg-noir text-blanc">
        <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
          <p className="text-petit text-gris-300">{u.email}</p>
          <h1 className="titre text-h2 sm:text-h1">Bonjour{u.nom ? ` ${u.nom.split(" ")[0]}` : ""}</h1>
          <div className="mt-6">
            <OngletsCompte />
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">{children}</div>
    </>
  );
}
