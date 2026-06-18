import Header from "@/app/components/Header/Header";
import Breadcrumb from "@/app/components/UI/Breadcrumb";
import ArticleHeader from "@/app/components/Article/ArticleHeader";
import ArticleBody from "@/app/components/Article/ArticleBody";
import ArticleAside from "@/app/components/Article/ArticleAside";
import SiteFooter from "@/app/components/SiteFooter/SiteFooter";


export const metadata = {
  title: "La Coupe du monde 2026 en chiffres — Courrier international",
  description:
    "Durée, nombre d'équipes qualifiées, nombre de matchs, prix des billets… La compétition qui se jouera du 11 juin au 19 juillet aux États-Unis, au Canada et au Mexique.",
};

const breadcrumbs = [
  { label: "Société", href: "/societe" },
  { label: "Canada", href: "/fiche-pays/canada" },
  { label: "FIFA", href: "/sujet/fifa" },
];

const relatedArticles = [
  {
    id: "1",
    strapline: "Vu du Mexique.",
    title:
      "Entre les pays hôtes de la Coupe du monde 2026, plus qu'un simple conflit de voisinage",
    href: "/article/vu-du-mexique-entre-les-pays-hotes",
    isPremium: true,
    image:
      "https://focus.courrierinternational.com/2026/04/01/0/0/2400/1600/640/0/60/0/2e05fcd_upload-1-xmdamerk1tem-kountouris.jpg",
  },
  {
    id: "2",
    strapline: "Portrait.",
    title: "Qui est Gianni Infantino, tout-puissant patron de la Fifa\u00a0?",
    href: "/article/portrait-qui-est-gianni-infantino",
    isPremium: false,
    image:
      "https://focus.courrierinternational.com/2026/04/30/0/116/2403/1602/640/0/60/0/d857dee_ftp-1-nbufiueywpor-2026-04-30t175600z.JPG",
  },
  {
    id: "3",
    strapline: "Football.",
    title:
      "Messi, Ronaldo, Neuer\u00a0: le triomphe des quadras ou la Coupe du monde de trop\u00a0?",
    href: "/article/football-messi-ronaldo-neuer",
    isPremium: true,
    image:
      "https://focus.courrierinternational.com/2026/06/05/56/0/2400/1600/640/0/60/0/d1b2e24_upload-1-lf8ha2ggums1-medicolor-w.jpg",
  },
];

const mostRead = [
  {
    index: 1,
    strapline: "Billet.",
    title: "Canicule\u00a0: en Espagne, on laisse les enfants cuire en classe\u00a0!",
    href: "/article/billet-canicule-en-espagne",
    isPremium: true,
  },
  {
    index: 2,
    strapline: "Décryptage.",
    title:
      "Guerre contre l'Iran\u00a0: l'accord est \"général et vague\" et loin d'avoir la portée de celui de 2015",
    href: "/article/conflit-entre-en-guerre-contre-l-iran",
    isPremium: false,
  },
  {
    index: 3,
    strapline: "Horoscope.",
    title: "Semaine du 18 au 25 juin 2026",
    href: "/horoscope/semaine-du-18-au-25-juin-2026",
    isPremium: false,
  },
  {
    index: 4,
    strapline: "Inauguration.",
    title:
      "Avec son centre présidentiel, Barack Obama défend sa vision optimiste des États-Unis",
    href: "/article/inauguration-avec-son-centre-presidentiel-barack-obama",
    isPremium: true,
  },
];

export default function ArticlePage() {
  return (
    <>
      <Header />
      <main className="site-main" id="site-main">
        <div className="article-layout">
          <div className="article-primary">
            <Breadcrumb items={breadcrumbs} />
            <ArticleHeader
              strapline="Infographie."
              title="La Coupe du monde&nbsp;2026 en chiffres"
              lede="Durée, nombre d'équipes qualifiées, nombre de matchs, prix des billets… La compétition, qui se jouera du 11&nbsp;juin au 19&nbsp;juillet aux États-Unis, au Canada et au Mexique, est celle de tous les superlatifs."
              source="Courrier international"
              readTime="2 min."
              publishedAt="Publié le 11 juin 2026 à 12h58"
              imageUrl="https://focus.courrierinternational.com/2026/06/09/0/0/2003/2200/1280/0/60/0/7286806_upload-1-tw7y3ihkrtka-infog-cdm.jpg"
              imageCaption="La Coupe du monde 2026 en chiffres."
              imageCredit="COURRIER INTERNATIONAL"
            />
            <ArticleBody relatedArticles={relatedArticles} />
          </div>
          <ArticleAside mostRead={mostRead} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
