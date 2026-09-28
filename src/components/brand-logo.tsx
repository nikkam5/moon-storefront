import Link from "next/link";

export default function BrandLogo({ className = "" }: { className?: string }) {
  return <Link href="/" className={`brand-logo ${className}`} aria-label="MOON STORE home">
    <svg className="brand-mark" viewBox="0 0 116 76" aria-hidden="true" focusable="false">
      <path fill="currentColor" fillRule="evenodd" d="M2 2h62v72H2z M11 61V15h9l13 20 13-20h9v46h-10V34L33 52 21 34v27z" />
      <path d="M103 15H79c-11 0-16 5-16 13s6 12 17 12h8c11 0 17 5 17 13s-6 13-17 13H62" fill="none" stroke="currentColor" strokeWidth="13" strokeLinejoin="round" strokeLinecap="square" />
    </svg>
    <span>MOON STORE</span>
  </Link>;
}
