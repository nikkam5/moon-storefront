"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { getProduct, money } from "@/lib/product";
import GalaxyBackdrop from "../motion/galaxy-backdrop";
import ShinyText from "../motion/shiny-text";
import TechText from "../motion/tech-text";
import BloodFall from "../motion/blood-fall";
import Stack, { type StackHandle } from "../motion/stack";
import EmberEnvironment from "../layout/ember-environment";

const featured = [getProduct("popia-nestum"), getProduct("kingston-dtxg2"), getProduct("honey-cornflakes"), getProduct("motul-5100")];
const featuredCards = featured.map((product, index) => <div key={product.id} className={`hero-stack-photo hero-stack-${product.category}`}>
  <img src={product.image} srcSet={product.imageSrcSet} width={product.imageWidth} height={product.imageHeight} sizes={product.imageSrcSet ? "(max-width: 700px) 80vw, 36vw" : undefined} alt={product.id === "motul-5100" ? `${product.name}, 4L bottle shown` : product.name} loading="eager" fetchPriority={index === 0 ? "high" : "auto"} draggable={false} />
</div>);

export default function Hero() {
  const [current, setCurrent] = useState(0);
  const [colors, setColors] = useState({ ink: "#f2f0e9", accent: "#c2b4eb", ember: false, display: "" });
  const stackRef = useRef<StackHandle>(null);
  const heroRef = useRef<HTMLElement>(null);
  const product = featured[current];
  useEffect(() => {
    const sync = () => {
      const style = getComputedStyle(document.documentElement);
      setColors({ ink: style.getPropertyValue("--ink").trim(), accent: style.getPropertyValue("--accent").trim(), ember: document.documentElement.dataset.ember === "true", display: style.getPropertyValue("--font-display").trim() });
    };
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-ember"] });
    sync();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const fit = () => {
      const headerHeight = (document.querySelector<HTMLElement>(".site-header")?.offsetHeight || 72) + (document.querySelector<HTMLElement>(".announcement")?.offsetHeight || 0);
      hero.classList.toggle("hero-natural-scroll", hero.offsetHeight + headerHeight > innerHeight + 1);
    };
    const resize = new ResizeObserver(fit);
    resize.observe(hero);
    window.addEventListener("resize", fit);
    fit();
    return () => { resize.disconnect(); window.removeEventListener("resize", fit); };
  }, []);
  return (
    <section ref={heroRef} id="home" className="hero-section hero-galaxy section-wrap ember-section" aria-labelledby="hero-heading">
      <EmberEnvironment scene="threshold" look="lava" />
      {colors.ember && <BloodFall />}
      {/* Light corruption: three small obsidian sigils that glitch now and then (ember only). */}
      {[1, 2, 3].map((n) => <svg key={n} className={`ember-sigil ember-sigil-${n}`} viewBox="-110 -110 220 220" aria-hidden="true">
        <circle r="50" /><circle r="11" /><path d="M63.19 34.52A72 72 0 1 1 22.25 -68.48" />
      </svg>)}
      <GalaxyBackdrop />
      <div className="hero-copy" data-reveal>
        <div className="moonstore-word">
          <TechText
            text="MOONSTORE"
            fractured={colors.ember}
            dragGlitch={colors.ember}
            bleed={colors.ember}
            fontFamily={colors.ember ? colors.display : ""}
            fontWeight={colors.ember ? 900 : 800}
            fontSize={90}
            letterSpacing={colors.ember ? 0.06 : 0.02}
            color={colors.ink}
            accentColor={colors.accent}
            reveal="area"
            reach={220}
            softness={0.5}
            lineStyle="solid"
            strokeWidth={1}
            dashLength={4}
            dashGap={2}
            specks={20}
            selection
            labels
            draggable
            sweep
            speed={0.9}
            className="moonstore-tech"
          />
          <span className="moonstore-static" aria-hidden="true">MOONSTORE</span>
          <noscript><style>{`.moonstore-word .moonstore-tech{display:none}.moonstore-word .moonstore-static{display:block}`}</style></noscript>
        </div>
        <h1 id="hero-heading"><ShinyText text="Good finds, close to home." color="var(--ink)" shineColor="var(--accent)" speed={3.4} spread={120} direction="left" /></h1>
        <p className="hero-subtitle">Tech storage, motor care and homemade treats. Explore the collection and order with our team in Besut on WhatsApp.</p>
        <div className="hero-actions">
          <Link href="#shop" className="button button-dark hero-button">Explore Catalog <span className="button-icon"><ArrowUpRight size={16} aria-hidden="true" /></span></Link>
          <Link href="#feedback" className="underlined-link">Share feedback <ArrowUpRight size={17} aria-hidden="true" /></Link>
        </div>
      </div>

      <div className="hero-product-stack" data-reveal>
        <div className="hero-stack-stage">
          <Stack ref={stackRef} randomRotation sensitivity={180} sendToBackOnClick cards={featuredCards} mobileClickOnly onChange={setCurrent} />
        </div>
        <div className="hero-stack-details">
          <div aria-live="polite" aria-atomic="true"><span className="hero-stack-category">{product.categoryLabel} · {product.variants.length > 1 ? "From " : ""}{money(product.variants[0].price)}</span><Link href={`/product/${product.id}`} className="hero-stack-product-link">{product.name}<ArrowUpRight size={18} aria-hidden="true" /></Link>{product.id === "motul-5100" && <span className="hero-stack-size-note">Price for 1 Litre · 4L bottle shown</span>}</div>
          <button type="button" className="hero-stack-next" aria-label="Next featured product" onClick={() => stackRef.current?.next()}><ArrowRight size={20} aria-hidden="true" /></button>
        </div>
        <div className="hero-stack-help"><span><span className="hero-stack-desktop-hint">Click or drag the photo to explore</span><span className="hero-stack-mobile-hint">Tap the photo to explore</span></span><span>{String(current + 1).padStart(2, "0")} / 04</span></div>
      </div>
    </section>
  );
}
