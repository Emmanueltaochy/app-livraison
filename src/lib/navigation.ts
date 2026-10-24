// Menu principal et pied de page du site client.
export const MENU = [
  { href: "/comment-ca-marche", libelle: "Comment ça marche" },
  { href: "/tarifs", libelle: "Tarifs" },
  { href: "/entreprises", libelle: "Entreprises" },
  { href: "/devenir-transporteur", libelle: "Devenir transporteur" },
  { href: "/aide", libelle: "Aide" },
];

export const PIED_DE_PAGE = [
  {
    titre: "Plateforme",
    liens: [
      { href: "/#reserver", libelle: "Réserver un transport" },
      { href: "/comment-ca-marche", libelle: "Comment ça marche" },
      { href: "/tarifs", libelle: "Tarifs" },
      { href: "/entreprises", libelle: "Magasins et entreprises" },
    ],
  },
  {
    titre: "Transporteurs",
    liens: [
      { href: "/devenir-transporteur", libelle: "Devenir transporteur" },
      { href: "/transporteur", libelle: "Espace transporteur" },
    ],
  },
  {
    titre: "Aide",
    liens: [
      { href: "/aide", libelle: "Questions fréquentes" },
      { href: "/contact", libelle: "Nous contacter" },
      { href: "/compte", libelle: "Mon compte" },
    ],
  },
  {
    titre: "Légal",
    liens: [
      { href: "/cgv", libelle: "Conditions générales" },
      { href: "/mentions-legales", libelle: "Mentions légales" },
      { href: "/confidentialite", libelle: "Confidentialité" },
    ],
  },
];
