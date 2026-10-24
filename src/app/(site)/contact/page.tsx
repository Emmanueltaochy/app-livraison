import type { Metadata } from "next";
import { Contenu, EnTetePage } from "@/components/site/Page";
import { FormulaireContact } from "./FormulaireContact";

export const metadata: Metadata = { title: "Contact — FretPéi" };

export default async function Contact({ searchParams }: { searchParams: Promise<{ sujet?: string }> }) {
  const { sujet } = await searchParams;
  return (
    <>
      <EnTetePage surtitre="Contact" titre="Écrivez-nous" texte="Une question, une commande, un compte professionnel : nous répondons par e-mail, en général dans la journée." />
      <Contenu etroit>
        <FormulaireContact sujet={sujet} />
      </Contenu>
    </>
  );
}
