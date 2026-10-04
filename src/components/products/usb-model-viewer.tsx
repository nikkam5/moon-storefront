"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, Rotate3D, Usb } from "lucide-react";
import type { Product } from "@/lib/product";
import type { UsbSceneController } from "./usb-model-scene";

export default function UsbModelViewer({ product, visible, reduced }: { product: Product; visible: boolean; reduced: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const controller = useRef<UsbSceneController | null>(null);
  const settings = useRef({ visible, reduced });
  const [nearby, setNearby] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const [capOpen, setCapOpen] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    settings.current = { visible, reduced };
    controller.current?.configure(visible, reduced);
  }, [visible, reduced]);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setNearby(true); observer.disconnect(); }
    }, { rootMargin: "160px" });
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!nearby || !canvas.current) return;
    let cancelled = false;
    void import("./usb-model-scene").then(({ createUsbScene }) => {
      if (cancelled || !canvas.current) return;
      controller.current = createUsbScene(canvas.current, () => { if (!cancelled) setStatus("ready"); }, () => { if (!cancelled) setStatus("fallback"); });
      controller.current.configure(settings.current.visible, settings.current.reduced);
    }).catch(() => { if (!cancelled) setStatus("fallback"); });
    return () => { cancelled = true; controller.current?.dispose(); controller.current = null; };
  }, [nearby]);

  return <div ref={host} className="usb-model-viewer" data-status={status}>
    <div className="usb-product-orbit">
      <div className="usb-product-studio" aria-hidden={status === "ready"}>
        {product.image && !photoFailed ? <img className="usb-product-photo" src={product.image} width={product.imageWidth} height={product.imageHeight} alt={product.name + ", blue 128GB model shown"} loading="eager" fetchPriority="high" decoding="async" draggable={false} onError={() => setPhotoFailed(true)} /> : <div className="usb-photo-fallback"><Usb size={72} aria-hidden="true" /><span>Product photo unavailable</span></div>}
      </div>
      <canvas ref={canvas} className="usb-model-canvas" role="img" aria-label={"3D Kingston Exodia G2, blue 128GB, cap " + (capOpen ? "open" : "closed") + ". Drag horizontally to rotate or use the buttons below."} aria-hidden={status !== "ready"} />
      <span className="usb-model-shadow" aria-hidden="true" />
    </div>
    <div className="usb-model-toolbar">
      <span className="usb-model-hint" role="status">{status === "ready" ? "Drag to inspect" : status === "loading" ? "Loading 3D view…" : "Product photo"}</span>
      <div className="usb-model-controls" role="group" aria-label="3D product controls" hidden={status !== "ready"}>
        <button type="button" aria-label={capOpen ? "Close USB cap" : "Open USB cap"} aria-pressed={capOpen} onClick={() => { controller.current?.openCap(!capOpen); setCapOpen(!capOpen); }}>{capOpen ? "Close cap" : "Open cap"}</button>
        <button type="button" aria-label="Rotate USB view" onClick={() => controller.current?.turn()}><Rotate3D size={16} aria-hidden="true" /><span>Rotate</span></button>
        <button type="button" aria-label="Reset USB view" onClick={() => { controller.current?.reset(); setCapOpen(false); }}><RotateCcw size={15} aria-hidden="true" /></button>
      </div>
    </div>
    <div className="usb-scene-bottom"><span>{status === "ready" ? "3D model" : "Photo"}: 128GB · Sky Blue</span><span>Kingston DataTraveler</span></div>
  </div>;
}
