import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function NotFound() { return <div className="section-wrap empty-cart"><div className="eyebrow">404 / PAGE NOT FOUND</div><h1>Let’s find your way back.</h1><p>That page isn’t here. The shop is just a click away.</p><Link href="/" className="button button-dark">Back to MOON STORE <ArrowUpRight size={18} /></Link></div>; }
