"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import "./TiltedCard.css";

const springValues = { damping: 30, stiffness: 100, mass: 2 };
type Props = {
  imageSrc: string;
  altText?: string;
  captionText?: string;
  containerHeight?: string;
  containerWidth?: string;
  imageHeight?: string;
  imageWidth?: string;
  scaleOnHover?: number;
  rotateAmplitude?: number;
  showMobileWarning?: boolean;
  showTooltip?: boolean;
  overlayContent?: ReactNode;
  displayOverlayContent?: boolean;
  onImageError?: () => void;
};

// React Bits TiltedCard with ref-based pointer tracking and reduced motion.
export default function TiltedCard({ imageSrc, altText = "Tilted card image", captionText = "", containerHeight = "300px", containerWidth = "100%", imageHeight = "300px", imageWidth = "300px", scaleOnHover = 1.1, rotateAmplitude = 14, showMobileWarning = true, showTooltip = true, overlayContent = null, displayOverlayContent = false, onImageError }: Props) {
  const ref = useRef<HTMLElement>(null);
  const lastY = useRef(0);
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useMotionValue(0), springValues);
  const rotateY = useSpring(useMotionValue(0), springValues);
  const scale = useSpring(1, springValues);
  const opacity = useSpring(0);
  const rotateFigcaption = useSpring(0, { stiffness: 350, damping: 30, mass: 1 });

  function interactive(event: PointerEvent<HTMLElement>) {
    return event.pointerType === "mouse" && !reduce && !window.matchMedia("(prefers-reduced-motion: reduce)").matches && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }

  function handlePointer(event: PointerEvent<HTMLElement>) {
    if (!ref.current || !interactive(event)) return;
    const rect = ref.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const offsetX = event.clientX - rect.left - rect.width / 2;
    const offsetY = event.clientY - rect.top - rect.height / 2;
    rotateX.set(offsetY / (rect.height / 2) * -rotateAmplitude);
    rotateY.set(offsetX / (rect.width / 2) * rotateAmplitude);
    x.set(event.clientX - rect.left);
    y.set(event.clientY - rect.top);
    rotateFigcaption.set(-(offsetY - lastY.current) * .6);
    lastY.current = offsetY;
  }

  function reset() {
    opacity.set(0);
    scale.set(1);
    rotateX.set(0);
    rotateY.set(0);
    rotateFigcaption.set(0);
    lastY.current = 0;
  }

  return <figure ref={ref} className="tilted-card-figure" style={{ height: containerHeight, width: containerWidth }} onPointerMove={handlePointer} onPointerEnter={(event) => { if (interactive(event)) { scale.set(scaleOnHover); opacity.set(1); } }} onPointerLeave={reset} onPointerCancel={reset}>
    {showMobileWarning && <div className="tilted-card-mobile-alert">This effect is not optimized for mobile. Check on desktop.</div>}
    <motion.div className="tilted-card-inner" style={{ width: imageWidth, height: imageHeight, rotateX: reduce ? 0 : rotateX, rotateY: reduce ? 0 : rotateY, scale: reduce ? 1 : scale }}>
      <motion.img src={imageSrc} alt={altText} className="tilted-card-img" style={{ width: imageWidth, height: imageHeight }} loading="lazy" decoding="async" draggable={false} onError={onImageError} />
      {displayOverlayContent && overlayContent && <motion.div className="tilted-card-overlay">{overlayContent}</motion.div>}
    </motion.div>
    {showTooltip && <motion.figcaption className="tilted-card-caption" style={{ x, y, opacity: reduce ? 0 : opacity, rotate: reduce ? 0 : rotateFigcaption }}>{captionText}</motion.figcaption>}
  </figure>;
}
