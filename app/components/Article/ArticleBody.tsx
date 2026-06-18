import ReadMoreCard from "@/components/ui/ReadMoreCard";
import RelatedArticleCard from "@/components/ui/RelatedArticleCard";

interface RelatedArticle {
  id: string;
  strapline?: string;
  title: string;
  href: string;
  image?: string;
  isPremium?: boolean;
}

interface ArticleBodyProps {
  relatedArticles: RelatedArticle[];
}

const TAGS = [
  { label: "Football", href: "/sujet/football" },
  { label: "Coupe du monde 2026", href: "/sujet/coupe-du-monde-2026" },
  { label: "États-Unis", href: "/fiche-pays/etats-unis" },
  { label: "Sport", href: "/sport" },
  { label: "Mexique", href: "/fiche-pays/mexique" },
  { label: "Amériques", href: "/ameriques" },
];

export default function ArticleBody({ relatedArticles }: ArticleBodyProps) {
  return (
    <div>
      <div className="article-text">
        <p>
          La compétition phare de la Fifa prend cette année une allure
          démesurée. La Fédération internationale de football a convoqué seize
          équipes supplémentaires par rapport à l&apos;édition qatarie de 2022.
          Résultat&nbsp;: la Coupe du monde se voit enrichie d&apos;un tour (les
          seizièmes de finale) et sera la plus longue de l&apos;histoire puisqu&apos;elle
          se clôturera le 19&nbsp;juillet après 39&nbsp;jours et 104&nbsp;matchs
          disputés.
        </p>

        <ReadMoreCard
          strapline="Une du jour."
          title='Les 48 pays qualifiés pour la Coupe du monde 2026, en 48 unes de "Sports Illustrated"'
          href="/une/une-du-jour-les-48-pays-qualifies"
        />

        <p>
          Après s&apos;être essayée à la double organisation en 2002 avec la
          Corée du Sud et le Japon, la Fifa a choisi pour 2026 trois pays
          hôtes&nbsp;: les États-Unis, le Canada et le Mexique… entre lesquels
          les tensions sont quasi permanentes depuis la réélection de Donald
          Trump en novembre&nbsp;2024.
        </p>

        <ReadMoreCard
          strapline="Football."
          title="Coupe du monde 2026&nbsp;: quelles sont les nouveautés de cette édition&nbsp;?"
          href="/article/football-coupe-du-monde-2026-quelles-sont-les-nouveautes"
        />

        <p>
          Les tensions géopolitiques ne seront pas absentes de la compétition.
          L&apos;équipe d&apos;Iran, pays avec lequel les États-Unis sont en
          guerre depuis plus de cent jours, sera contrainte de faire des
          allers-retours entre les États-Unis et le Mexique lors de ses jours de
          matchs. C&apos;est une conséquence de la politique stricte de visas
          qui a été maintenue par les autorités états-uniennes. Quatre
          participants sont touchés&nbsp;: l&apos;Iran et Haïti restent soumis à
          une interdiction totale,{" "}
          <a
            href="https://www.npr.org/2026/05/16/nx-s1-5770562/iran-and-haiti-qualified-for-the-world-cup"
            target="_blank"
            rel="noopener noreferrer"
          >
            rapporte le réseau public <strong>NPR</strong>
          </a>
          , la Côte d&apos;Ivoire et le Sénégal à une interdiction partielle.
        </p>

        <ReadMoreCard
          strapline="Une du jour."
          title='"Ici, ils sont les bienvenus"&nbsp;: après le refus américain, l&apos;équipe d&apos;Iran est au Mexique'
          href="/une/une-du-jour-ici-ils-sont-les-bienvenus"
        />

        <p>
          Parmi les premières victimes de ces mesures, Omar Abdulkadir Artan,
          de nationalité somalienne,{" "}
          <em>
            &laquo;&nbsp;considéré comme le meilleur arbitre du continent
            africain&nbsp;&raquo;
          </em>
          ,{" "}
          <a
            href="https://en.as.com/soccer/world-cup/fifa-world-cup-referee-denied-entry"
            target="_blank"
            rel="noopener noreferrer"
          >
            note <strong>As</strong>
          </a>
          , s&apos;est vu refouler dès son arrivée sur le territoire américain.
        </p>

        <h2>Des retombées économiques inédites</h2>

        <p>
          Ce n&apos;est pas là la seule polémique à enfler. Les supporteurs du
          monde entier se plaignent des prix des billets, soumis à la
          tarification dynamique, qui atteignent des sommets (mais ont soudainement
          baissé ces derniers jours) comme le coût des transports permettant de
          se rendre dans les différents stades.{" "}
          <em>
            &laquo;&nbsp;Quels raffinements à bord peuvent justifier un tel
            tarif&nbsp;? ironise un journaliste du{" "}
            <a
              href="https://www.theguardian.com/football/2026/apr/16/ticket-to-ride-america-2026-world-cup"
              target="_blank"
              rel="noopener noreferrer"
            >
              <strong>Guardian</strong>
            </a>
            . Un massage shiatsu personnalisé&nbsp;? Un espace piscine&nbsp;? Un
            menu gastronomique&nbsp;?&nbsp;&raquo;
          </em>
        </p>

        <ReadMoreCard
          strapline="Football."
          title="Ces supporteurs argentins iront assister à la Coupe du monde 2026, quoi qu'il en coûte"
          href="/long-format/football-ces-supporteurs-argentins"
        />

        <p>
          Et que dire sur le versant climatique&nbsp;? Cette Coupe du monde
          2026{" "}
          <a href="/article/football-la-coupe-du-monde-2026-sera-probablement-la-plus-polluante">
            sera probablement la plus polluante de l&apos;histoire
          </a>{" "}
          et{" "}
          <em>
            &laquo;&nbsp;devrait produire environ 9&nbsp;millions de tonnes
            d&apos;émissions de gaz à effet de serre&nbsp;&raquo;
          </em>
          ,{" "}
          <a
            href="https://yaleclimateconnections.org/2026/04/the-2026-mens-world-cup-could-be-the-dirtiest-ever/"
            target="_blank"
            rel="noopener noreferrer"
          >
            rapporte <strong>Yale Climate Connections</strong>
          </a>
          . Les fortes températures attendues, alliées à un fort taux
          d&apos;humidité, annoncent des confrontations très éprouvantes pour
          les joueurs. La Fifa a donc décidé de deux pauses fraîcheur dans
          chaque match — l&apos;occasion de diffuser des spots publicitaires.
          Car cette Coupe du monde de tous les excès s&apos;annonce aussi comme
          la plus profitable pour la Fédération internationale, qui devrait,
          selon{" "}
          <a
            href="https://www.ft.com/content/5b79e86d-1df2-4bfa-9bde-f43eb692f11c"
            target="_blank"
            rel="noopener noreferrer"
          >
            les chiffres diffusés par le <strong>Financial Times</strong>
          </a>
          , lui rapporter 13&nbsp;milliards de dollars, soit
          11,2&nbsp;milliards d&apos;euros.
        </p>
      </div>

      {/* Tags */}
      <div className="article-tags" aria-label="Mots-clés">
        {TAGS.map((tag) => (
          <a key={tag.href} href={tag.href} className="tag">
            {tag.label}
          </a>
        ))}
      </div>

      {/* Related articles */}
      <section aria-labelledby="related-title">
        <div className="related-grid">
          <div className="section-title" id="related-title" style={{ gridColumn: "1 / -1" }}>
            Sur le même sujet
          </div>
          {relatedArticles.map((article) => (
            <RelatedArticleCard key={article.id} {...article} />
          ))}
        </div>
      </section>
    </div>
  );
}
