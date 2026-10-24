// Information juridique à renseigner avant le lancement (surlignée pour ne pas l'oublier).
export function AComplet({ children }: { children: React.ReactNode }) {
  return <mark className="rounded bg-jaune-clair px-1 font-bold">[{children} — à compléter]</mark>;
}
