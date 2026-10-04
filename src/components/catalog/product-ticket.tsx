"use client";

import { useRef, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Scissors } from "lucide-react";
import { money, type Product } from "@/lib/product";
import TearTicket from "../motion/tear-ticket";
import "./product-ticket.css";

export default function ProductTicket({ product, hidden, onOpen }: { product: Product; hidden: boolean; onOpen: () => void }) {
  const router = useRouter();
  const navigating = useRef(false);
  const price = money(product.variants[0].price);
  const from = product.variants.length > 1;
  const detail = product.id === "kingston-dtxg2" ? "4 capacities · USB 3.2" : product.id === "motul-5100" ? "1 Litre · 4L photo shown" : product.variants[0].detail;

  function openProduct() {
    if (navigating.current) return;
    navigating.current = true;
    onOpen();
    router.push(`/product/${product.id}`);
  }

  function onPictureClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openProduct();
  }

  return <article className={`catalog-card catalog-ticket category-${product.category}`} hidden={hidden} aria-labelledby={`${product.id}-name`}>
    <TearTicket
      image={product.image}
      imageAlt={product.id === "motul-5100" ? `${product.name}, 4L bottle shown` : product.name}
      imageHref={`/product/${product.id}`}
      imageLinkLabel={`View ${product.name}`}
      onImageClick={onPictureClick}
      width={380}
      height={240}
      stubSize={104}
      radius={16}
      imageRadius={8}
      holes={10}
      holeSize={4}
      notch={3}
      roughness={0}
      tearAngle={28}
      stretch={24}
      resistance={.35}
      rotate={0}
      tiltMax={5}
      tiltReach={100}
      parallax={3}
      background="var(--surface)"
      stubBackground="var(--surface-raised)"
      color="var(--ink)"
      borderColor="var(--ticket-edge)"
      recenter={false}
      onTear={openProduct}
      ariaLabel={`${from ? "From " : ""}${price} Tear to view ${product.name}`}
      usedLabel={`Opening ${product.name}`}
      stub={<div className="product-ticket-stub">
        <div className="ticket-stub-price"><small>{from ? "From RM" : "RM"}</small>{" "}<strong>{price.replace(/^RM /, "")}</strong></div>{" "}
        <div className="ticket-tear-label"><Scissors size={20} strokeWidth={1.7} aria-hidden="true" /><span>Tear <br />to view</span></div>
      </div>}
    >
      <div className="product-ticket-copy"><h3 id={`${product.id}-name`}>{product.name}</h3><span>{detail}</span></div>
    </TearTicket>
  </article>;
}
