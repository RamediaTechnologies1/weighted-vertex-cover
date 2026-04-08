import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Circle, ArrowRight, Minus, CheckCircle2, EyeOff, Trophy,
  Sparkles
} from 'lucide-react';
import { AlgorithmStep } from '../types';

interface Props {
  steps: AlgorithmStep[];
  currentStep: number;
  onStepClick: (index: number) => void;
}

const stepConfig: Record<AlgorithmStep['type'], {
  icon: typeof Circle; color: string; bg: string; border: string;
  label: string;
}> = {
  'init': { icon: Sparkles, color: 'text-teal', bg: 'bg-teal/[0.06]', border: 'border-teal/15', label: 'Initialize' },
  'select-edge': { icon: ArrowRight, color: 'text-rose', bg: 'bg-rose/[0.06]', border: 'border-rose/15', label: 'Select' },
  'reduce': { icon: Minus, color: 'text-star', bg: 'bg-star/[0.06]', border: 'border-star/15', label: 'Reduce' },
  'vertex-zero': { icon: CheckCircle2, color: 'text-emerald', bg: 'bg-emerald/[0.06]', border: 'border-emerald/15', label: 'Cover' },
  'remove-edges': { icon: EyeOff, color: 'text-violet', bg: 'bg-violet/[0.06]', border: 'border-violet/15', label: 'Sweep' },
  'done': { icon: Trophy, color: 'text-emerald', bg: 'bg-emerald/[0.06]', border: 'border-emerald/15', label: 'Done' },
};

export default function StepNarration({ steps, currentStep, onStepClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentStep]);

  // Empty state
  if (steps.length === 0) {
    return (
      <motion.aside
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        className="w-[300px] min-w-[300px] border-l border-glass-border bg-cosmos/80 backdrop-blur-2xl flex flex-col"
      >
        <div className="p-4 border-b border-glass-border">
          <span className="text-[10px] font-mono font-medium text-teal tracking-[0.2em] uppercase">
            Algorithm Trace
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-[220px]">
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-deep/60 border border-glass-border flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-muted" strokeWidth={1.5} />
            </div>
            <p className="text-[13px] font-display italic text-subtle leading-relaxed mb-5">
              Build a graph, then run the<br />Local Ratio algorithm
            </p>
            <div className="space-y-3 text-left">
              {[
                { n: '1', text: 'Pick an uncovered edge', color: 'text-rose' },
                { n: '2', text: 'Subtract ε = min weight from both endpoints', color: 'text-star' },
                { n: '3', text: 'Zero-weight vertices join the cover', color: 'text-emerald' },
                { n: '4', text: 'Covered edges are removed', color: 'text-violet' },
              ].map(item => (
                <div key={item.n} className="flex gap-3 items-start">
                  <span className={`text-[11px] font-display italic ${item.color} mt-px`}>{item.n}.</span>
                  <span className="text-[11px] font-body text-muted leading-relaxed">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.aside>
    );
  }

  return (
    <motion.aside
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      className="w-[300px] min-w-[300px] border-l border-glass-border bg-cosmos/80 backdrop-blur-2xl flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-glass-border flex items-center justify-between">
        <span className="text-[10px] font-mono font-medium text-teal tracking-[0.2em] uppercase">
          Algorithm Trace
        </span>
        <span className="text-[10px] font-mono text-muted">
          {currentStep + 1} / {steps.length}
        </span>
      </div>

      {/* Active step detail */}
      <AnimatePresence mode="wait">
        {steps[currentStep] && (
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="p-4 border-b border-glass-border"
          >
            {(() => {
              const step = steps[currentStep];
              const config = stepConfig[step.type];
              const Icon = config.icon;
              return (
                <div className={`rounded-2xl p-4 ${config.bg} border ${config.border}`}>
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className={`w-6 h-6 rounded-lg ${config.bg} border ${config.border} flex items-center justify-center`}>
                      <Icon className={`w-3.5 h-3.5 ${config.color}`} strokeWidth={2} />
                    </div>
                    <span className={`text-[12px] font-body font-semibold ${config.color}`}>
                      {step.description}
                    </span>
                  </div>
                  <p className="text-[11.5px] font-body text-text/80 leading-[1.7] pl-[34px]">
                    {step.detail}
                  </p>
                  {step.epsilon !== undefined && (
                    <div className="mt-3 ml-[34px] inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-void/40 border border-star/10">
                      <span className="text-[9px] font-mono text-muted uppercase tracking-wider">ε</span>
                      <span className="text-star font-mono text-xs font-semibold">
                        {step.epsilon.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step timeline */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {steps.map((step, i) => {
          const config = stepConfig[step.type];
          const Icon = config.icon;
          const isCurrent = i === currentStep;
          const isPast = i < currentStep;

          return (
            <button
              key={i}
              ref={isCurrent ? activeRef : null}
              onClick={() => onStepClick(i)}
              className={`w-full text-left flex items-start gap-2.5 px-3 py-2 rounded-xl transition-all duration-300 group
                ${isCurrent
                  ? `${config.bg} border ${config.border}`
                  : isPast
                    ? 'bg-transparent border border-transparent opacity-50 hover:opacity-70'
                    : 'bg-transparent border border-transparent opacity-30 hover:opacity-50'
                }`}
            >
              {/* Timeline connector */}
              <div className="flex flex-col items-center mt-0.5 flex-shrink-0">
                <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all duration-300
                  ${isCurrent
                    ? `${config.bg} border ${config.border}`
                    : 'bg-nebula/30 border border-glass-border'
                  }`}
                >
                  <Icon className={`w-2.5 h-2.5 ${isCurrent ? config.color : 'text-muted'}`} strokeWidth={2} />
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-px h-3 mt-0.5 transition-colors duration-300 ${isPast ? 'bg-glass-border-hover' : 'bg-glass-border'}`} />
                )}
              </div>

              <div className="flex-1 min-w-0 pt-px">
                <div className={`text-[11px] font-body font-medium truncate transition-colors duration-300
                  ${isCurrent ? config.color : 'text-text'}`}>
                  {step.description}
                </div>
                {isCurrent && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[10px] font-accent italic text-muted mt-0.5 line-clamp-2 leading-relaxed"
                  >
                    {step.detail.slice(0, 90)}{step.detail.length > 90 ? '…' : ''}
                  </motion.div>
                )}
              </div>

              <span className={`text-[8px] font-mono mt-1 flex-shrink-0 ${isCurrent ? config.color : 'text-muted'}`}>
                {i + 1}
              </span>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="p-3.5 border-t border-glass-border">
        <div className="text-[8px] font-mono text-muted uppercase tracking-[0.2em] mb-2.5">Legend</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {[
            { color: 'bg-teal', label: 'Normal vertex' },
            { color: 'bg-rose', label: 'Active edge' },
            { color: 'bg-star', label: 'Zero weight' },
            { color: 'bg-emerald', label: 'In cover' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${item.color}`} />
              <span className="text-[9px] font-mono text-subtle">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.aside>
  );
}
