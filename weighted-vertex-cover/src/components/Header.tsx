import { motion } from 'framer-motion';

export default function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex items-center justify-between px-7 py-3.5 border-b border-glass-border bg-cosmos/90 backdrop-blur-2xl z-20"
    >
      {/* Subtle top edge glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal/20 to-transparent" />

      <div className="flex items-center gap-4">
        {/* Logo mark - orbital rings */}
        <div className="relative w-10 h-10 flex items-center justify-center">
          <motion.div
            className="absolute inset-0 rounded-full border border-teal/30"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-1 rounded-full border border-star/20"
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          />
          <div className="w-3 h-3 rounded-full bg-teal shadow-[0_0_12px_rgba(45,212,191,0.5)]" />
        </div>

        <div>
          <h1 className="font-display text-[22px] text-white leading-none tracking-tight">
            Weighted Vertex Cover
          </h1>
          <p className="text-[11px] font-mono text-subtle tracking-[0.15em] uppercase mt-1">
            Local Ratio Method &mdash; Interactive Visualizer
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden md:inline-flex px-3 py-1 rounded-full bg-deep/80 border border-glass-border text-[10px] font-mono text-muted tracking-wide">
          2-Approximation &middot; NP-Hard
        </span>
        <a
          href="https://en.wikipedia.org/wiki/Vertex_cover"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-accent italic text-teal/60 hover:text-teal transition-colors duration-300"
        >
          Learn more &rarr;
        </a>
      </div>
    </motion.header>
  );
}
