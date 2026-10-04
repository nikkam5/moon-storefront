"use client";

import { useState } from "react";
import BorderGlow from "../motion/border-glow";
import DepthCarousel from "../motion/depth-carousel";
import DecryptedText from "../motion/decrypted-text";
import PixelTransition from "../motion/pixel-transition";
import Particles from "../motion/particles";
import "./team-story.css";

type Member = { name: string; initials: string; role: string; image?: string; message?: string; background: string };

// Add each portrait to public/team/ and set its image URL here when received.
const members: Member[] = [
  { name: "Nik Amir", initials: "NA", role: "Team lead · Management & administration", background: "#1f435c" },
  { name: "Iman Asnawi", initials: "IA", role: "Marketing executive", background: "#29475c" },
  { name: "Luqman", initials: "L", role: "Operations executive", background: "#28465b" },
  { name: "Arish Haikal", initials: "AH", role: "Accounts executive", background: "#234359" },
];
const particleColors = ["#ffffff"];

function Portrait({ member }: { member: Member }) {
  return <div className="team-portrait" style={{ background: member.background }}>
    {member.image ? <img src={member.image} alt={member.name} /> : <span className="team-portrait-initials" aria-hidden="true">{member.initials}</span>}
    <strong>{member.name}</strong>
  </div>;
}

export default function TeamStory() {
  const [current, setCurrent] = useState(0);
  const member = members[current];

  return <section id="about" className="team-story section-wrap" aria-labelledby="about-heading">
    <Particles particleColors={particleColors} particleCount={200} particleSpread={10} speed={0.1} particleBaseSize={100} moveParticlesOnHover={true} alphaParticles={false} disableRotation={false} />
    <div className="team-story-content">
    <div className="team-story-intro"><h2 id="about-heading" aria-label="The people behind Moon Store."><DecryptedText text="The people behind Moon Store." animateOn="view" sequential revealDirection="center" speed={38} characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" encryptedClassName="team-heading-encrypted" /></h2><p>Four people building a more personal local shop in Besut. Meet the team, one person at a time.</p></div>
    <div className="team-story-grid">
      <DepthCarousel items={members} getLabel={(item) => item.name} onChange={setCurrent} renderCard={(person, focused) => focused ? <PixelTransition key={person.name} label={person.name} firstContent={<Portrait member={person} />} secondContent={<div className="team-position"><span>MOON STORE / TEAM</span><strong>{person.name}</strong><p>{person.role}</p></div>} aspectRatio="4 / 3" gridSize={9} pixelColor="#a9d4ff" /> : <Portrait member={person} />} />
      <BorderGlow className="team-words-glow" edgeSensitivity={36} glowColor="210 78 72" backgroundColor="var(--surface)" borderRadius={20} glowRadius={28} glowIntensity={.85} colors={["#6eaaf0", "#b4dbff", "#81b4ec"]}><div className="team-words" aria-live="polite" aria-atomic="true"><span className="team-words-number">{String(current + 1).padStart(2, "0")} / {String(members.length).padStart(2, "0")}</span><div><span className="team-words-kicker">MEET THE TEAM</span><h3>{member.name}</h3><p className="team-words-role">{member.role}</p>{member.message && <div className="team-words-message"><p>{member.message}</p></div>}</div></div></BorderGlow>
    </div>
    <noscript><div className="team-story-noscript">{members.map((person) => <p key={person.name}>{person.name} · {person.role}</p>)}</div></noscript>
    </div>
  </section>;
}
