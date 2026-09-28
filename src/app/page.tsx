import { ArrowUpRight, Clock3, Heart, Mail, MapPin, MessageCircle, Phone, Plus, Sparkles } from "lucide-react";
import Hero from "@/components/hero";
import GlowPanel from "@/components/glow-panel";
import ShopCatalog from "@/components/shop-catalog";
import { business } from "@/lib/business";

const questions = [
  { title: "What can I find at Moon Store?", answer: "Our multi-category collection brings together lifestyle tech essentials, motor care and performance engine oils, and homemade signature snacks. Explore the catalog to find your next everyday essential." },
  { title: "How do I ask about a product?", answer: "Send us a WhatsApp message with the product you have in mind. We can discuss the details and confirm availability before you decide." },
  { title: "How does local fulfillment work?", answer: "We fulfill locally from Kampong Raja, Besut. Message us with your location to confirm delivery options, any charges, and timing. WhatsApp inquiries are always open; replies and fulfillment are subject to availability." },
];

export default function Home() {
  return (
    <>
      <div className="curtain-stage">
      <Hero />

      <section id="shop" className="catalog-section section-wrap" aria-labelledby="catalog-heading">
        <div className="section-heading" data-reveal>
          <div><span className="eyebrow">THE EVERYDAY COLLECTION</span><h2 id="catalog-heading">Good finds.<br /><span className="text-accent">Your kind of things.</span></h2></div>
          <div className="section-intro"><p>A useful upgrade, a little motor care, or something sweet. There’s a different kind of essential for every part of your day.</p><span className="catalog-note"><MessageCircle size={17} aria-hidden="true" /> Questions? Let’s talk on WhatsApp.</span></div>
        </div>
        <ShopCatalog simple />
      </section>
      </div>

      <section id="about" className="about-section section-wrap" aria-labelledby="about-heading" data-reveal>
        <div className="story-screen"><GlowPanel>
          <span className="eyebrow">ROOTED IN BESUT</span>
          <Sparkles className="about-sparkle" size={56} strokeWidth={1.4} aria-hidden="true" />
          <p className="about-art-title">Different finds.<br />Same little<br /><span>Moon.</span></p>
          <div className="about-art-caption"><Heart size={20} aria-hidden="true" /><span>Tech, motor care &amp; homemade joy.</span></div>
        </GlowPanel></div>
        <div className="about-copy">
          <span className="eyebrow">A LOCAL STORE. A PERSONAL TOUCH.</span>
          <h2 id="about-heading">Hello from<br />Kampong Raja.</h2>
          <p>We’re Moon Store, a multi-category lifestyle store bringing tech essentials, motor care, and homemade snacks together in one friendly place.</p>
          <p>Based in Kampong Raja, Besut, Terengganu, we fulfill locally and keep the conversation personal. Whether you’re choosing something practical or treating yourself, we’re here to help you explore.</p>
          <div className="team-block">
            <h3>The people behind Moon Store</h3>
            <ul className="team-list">
              {[
                ["Nik Amir", "Manager and Administrative Executives"],
                ["Iman Asnawi", "Marketing Executives"],
                ["Luqman", "Operation Executives"],
                ["Arish Haikal", "Account Executives"],
              ].map(([name, role]) => (
                <li className="team-member" key={name}><span className="team-avatar" aria-hidden="true">{name.split(" ").map((part) => part[0]).join("")}</span><span>{name}<small>{role}</small></span></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="contact" className="contact-section section-wrap" aria-labelledby="contact-heading" data-reveal>
        <div className="section-heading">
          <div><span className="eyebrow">JUST A MESSAGE AWAY</span><h2 id="contact-heading">Let’s talk<br /><span className="text-accent">everyday essentials.</span></h2></div>
          <div className="section-intro"><p>Need a closer look or have a delivery question? Say hello. We’ll help you work out the details.</p></div>
        </div>
        <div className="contact-grid">
          <article className="contact-card contact-location">
            <span className="contact-icon"><MapPin size={26} aria-hidden="true" /></span>
            <h3>Find us in Besut</h3>
            <address>{business.address}</address>
            <a href={business.maps} target="_blank" rel="noopener noreferrer" className="underlined-link">Open Google Maps <ArrowUpRight size={17} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>
          </article>
          <article className="contact-card contact-hours">
            <span className="contact-icon"><Clock3 size={26} aria-hidden="true" /></span>
            <h3>Our opening hours</h3>
            <p className="contact-hours-value">{business.hours}</p>
            <p>WhatsApp inquiries are always open. Product availability and delivery arrangements are confirmed via chat.</p>
            <p className="contact-small-print">Replies may not be immediate.</p>
          </article>
          <article className="contact-card contact-chat">
            <span className="contact-icon"><MessageCircle size={26} aria-hidden="true" /></span>
            <h3>A friendly hello starts here</h3>
            <a href={business.whatsapp} target="_blank" rel="noopener noreferrer" className="button button-dark">Chat on WhatsApp <ArrowUpRight size={18} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>
            <div className="contact-direct-links">
              <a href="tel:+601161647061"><Phone size={17} aria-hidden="true" />{business.phone}</a>
              <a href={`mailto:${business.email}`}><Mail size={17} aria-hidden="true" />{business.email}</a>
            </div>
          </article>
        </div>
      </section>

      <section id="questions" className="faq-section section-wrap" aria-labelledby="faq-heading" data-reveal>
        <div><span className="eyebrow">GOOD TO KNOW</span><h2 id="faq-heading">A little clarity.<br />Before you choose.</h2><p>Simple answers for your next good find.</p></div>
        <div className="faq-list">
          {questions.map((question) => (
            <details key={question.title}><summary>{question.title}<Plus size={19} aria-hidden="true" /></summary><p>{question.answer}</p></details>
          ))}
        </div>
      </section>
    </>
  );
}
