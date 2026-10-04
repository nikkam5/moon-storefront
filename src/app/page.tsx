import Hero from "@/components/home/hero";
import TeamStory from "@/components/home/team-story";
import ShopCatalog from "@/components/catalog/shop-catalog";
import CustomerFeedback from "@/components/home/customer-feedback";

export default function Home() {
  return (
    <div className="home-motion">
      <div className="curtain-stage">
        <Hero />

        <section id="shop" className="catalog-section ticket-catalog-section section-wrap" aria-labelledby="catalog-heading">
          <div className="section-heading" data-reveal>
            <div><h2 id="catalog-heading">Shop the collection.</h2><p className="section-intro">Four local picks. Click a photo or tear a ticket to explore.</p></div>
          </div>
          <ShopCatalog simple />
        </section>
      </div>

      <TeamStory />

      <CustomerFeedback />
    </div>
  );
}
