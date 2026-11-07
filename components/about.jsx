import { Code, Palette, Gamepad2, Stethoscope } from "lucide-react";

const SKILLS = [
  {
    Icon: Stethoscope,
    title: "Medical Science",
    description:
      "Medical student exploring the intersection of healthcare and digital technology.",
  },
  {
    Icon: Gamepad2,
    title: "Game Development",
    description:
      "Experienced FiveM server developer and Roblox scripter specializing in Lua/Luau.",
  },
  {
    Icon: Code,
    title: "Web Development",
    description:
      "Building modern, responsive web applications using React, Next.js, and Tailwind CSS.",
  },
  {
    Icon: Palette,
    title: "UI/UX & Design",
    description: "Creating clean, aesthetic, and user-centered digital interfaces.",
  },
];

export default function About() {
  return (
    <section id="about" className="lp-section">
      <div className="lp-shell lp-about__grid">
        <div className="lp-about__aside">
          <p className="lp-eyebrow">About</p>
          <h2 className="lp-h2">About Me</h2>
        </div>

        <div>
          <p className="lp-about__bio">
            I am a medical student with a deep passion for technology and
            software development. Alongside my academic journey in medicine, I
            work as a developer specializing in web technologies and game
            development (FiveM server creation &amp; Roblox scripting). I love
            bridging the gap between medicine and tech to create impactful
            digital solutions.
          </p>

          <div className="lp-skills">
            {SKILLS.map(({ Icon, title, description }) => (
              <article key={title} className="lp-skill">
                <span className="lp-skill__icon" aria-hidden="true">
                  <Icon />
                </span>
                <div>
                  <h3 className="lp-skill__title">{title}</h3>
                  <p className="lp-skill__desc">{description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
