import RotatingEarth from "@/components/ui/wireframe-dotted-globe"

interface GooeyDemoProps {
  onStart?: () => void
}

function GooeyDemo({ onStart }: GooeyDemoProps) {
  return (
    <div className="relative w-full h-full min-h-screen flex items-center justify-center bg-black text-pretty overflow-hidden py-12 px-6 md:px-12 select-none">
      {/* Abstract ambient grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35 pointer-events-none z-0" />
      
      {/* Background color glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none z-0 animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none z-0 animate-pulse" />

      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center z-10 relative">
        {/* Left column: Text */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-6 max-w-2xl mx-auto lg:mx-0">
          <h1 className="text-white text-5xl md:text-7xl font-calendas font-bold tracking-tight leading-tight">
            Speaking science <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-indigo-500">
              into existence
            </span>
          </h1>

          <p className="text-gray-400 text-sm md:text-base max-w-xl font-light leading-relaxed">
            An advanced multi-agent scientific pipeline that parses research inquiries, synthesizes literature, constructs falsifiable hypotheses, designs rigorous experiments, and peer-critiques the proposals.
          </p>

          <button
            onClick={onStart}
            className="mt-4 px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-purple-100 hover:scale-105 transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.25)] hover:shadow-[0_0_40px_rgba(168,85,247,0.5)] cursor-pointer"
          >
            Initialize Orchestrator
          </button>
        </div>

        {/* Right column: Interactive Dotted Globe */}
        <div className="flex items-center justify-center w-full max-w-[600px] mx-auto lg:max-w-none">
          <RotatingEarth width={550} height={550} className="w-full h-auto" />
        </div>
      </div>
    </div>
  )
}

export { GooeyDemo }
