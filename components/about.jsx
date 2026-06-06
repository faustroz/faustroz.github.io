import { Code, Palette, Gamepad2, Stethoscope } from "lucide-react";

export default function About() {
  const skills = [
    {
      icon: <Stethoscope className="w-8 h-8" />,
      title: "Medical Science",
      description: "Medical student exploring the intersection of healthcare and digital technology.",
    },
    {
      icon: <Gamepad2 className="w-8 h-8" />,
      title: "Game Development",
      description: "Experienced FiveM server developer and Roblox scripter specializing in Lua/Luau.",
    },
    {
      icon: <Code className="w-8 h-8" />,
      title: "Web Development",
      description: "Building modern, responsive web applications using React, Next.js, and Tailwind CSS.",
    },
    {
      icon: <Palette className="w-8 h-8" />,
      title: "UI/UX & Design",
      description: "Creating clean, aesthetic, and user-centered digital interfaces.",
    },
  ];

  return (
    <section id="about" className="py-16 md:py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            About Me
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            I am a medical student with a deep passion for technology and software development. 
            Alongside my academic journey in medicine, I work as a developer specializing in 
            web technologies and game development (FiveM server creation & Roblox scripting). 
            I love bridging the gap between medicine and tech to create impactful digital solutions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-16">
          {skills.map((skill, index) => (
            <div
              key={index}
              className="text-center p-6 rounded-2xl bg-gray-50 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-gray-700 mb-4 flex justify-center">
                {skill.icon}
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                {skill.title}
              </h3>
              <p className="text-gray-600 text-sm">{skill.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
