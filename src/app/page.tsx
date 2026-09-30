import Hero from "@/components/hero";
import TeamStory from "@/components/team-story";
import ShopCatalog from "@/components/shop-catalog";
import CustomerFeedback from "@/components/customer-feedback";

export default function Home() {
  return (
    <div className="home-motion">
      <div className="curtain-stage">
        <Hero />

        <section id="shop" className="catalog-section section-wrap" aria-labelledby="catalog-heading">
          <div className="section-heading" data-reveal>
            <div><h2 id="catalog-heading">Shop the collection.</h2><p className="section-intro">Four local picks across tech, motor care and homemade treats. Select a product for details and options.</p></div>
          </div>
          <ShopCatalog simple />
        </section>
      </div>

      <TeamStory />

      <CustomerFeedback />
    </div>
  );
}
