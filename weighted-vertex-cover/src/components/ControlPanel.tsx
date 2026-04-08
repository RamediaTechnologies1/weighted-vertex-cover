import { motion } from 'framer-motion';
import {
  Play, RotateCcw, ChevronRight, ChevronLeft, MousePointer2,
  Plus, Link, Trash2, Layers, Hexagon
} from 'lucide-react';
import type { EditorMode, Graph } from '../types';
import { presetGraphs } from '../presets';

interface Props {
  editorMode: EditorMode;
  setEditorMode: (mode: EditorMode) => void;
  isRunning: boolean;
  onRun: () => void;
  onReset: () => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onLoadPreset: (index: number) => void;
  onClearGraph: () => void;
  currentStep: number;
  totalSteps: number;
  selectedVertex: string | null;
  graph: Graph;
  onWeightChange: (vertexId: string, weight: number) => void;
  edgeStart: string | null;
}

const editorModes: { mode: EditorMode; icon: typeof MousePointer2; label: string }[] = [
  { mode: 'select', icon: MousePointer2, label: 'Select' },
  { mode: 'add-vertex', icon: Plus, label: 'Vertex' },
  { mode: 'add-edge', icon: Link, label: 'Edge' },
  { mode: 'delete', icon: Trash2, label: 'Delete' },
];

export default function ControlPanel({
  editorMode,
  setEditorMode,
  isRunning,
  onRun,
  onReset,
  onNextStep,
  onPrevStep,
  onLoadPreset,
  onClearGraph,
  currentStep,
  totalSteps,
  selectedVertex,
  graph,
  onWeightChange,
}: Props) {
  const selectedV = graph.vertices.find(v => v.id === selectedVertex);

  return (
    <motion.aside
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      className="w-[280px] min-w-[280px] border-r border-glass-border bg-cosmos/80 backdrop-blur-2xl flex flex-col overflow-y-auto"
    >
      {/* Presets */}
      <div className="p-4 pb-3 border-b border-glass-border">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-3.5 h-3.5 text-teal" />
          <span className="text-[10px] font-mono font-medium text-teal tracking-[0.2em] uppercase">
            Presets
          </span>
        </div>
        <div className="space-y-1.5">
          {presetGraphs.map((preset, i) => (
            <button
              key={i}
              onClick={() => onLoadPreset(i)}
              disabled={isRunning}
              className="w-full text-left px-3.5 py-2.5 rounded-xl bg-nebula/60 hover:bg-deep/80 border border-glass-border hover:border-teal/15 transition-all duration-300 group disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <div className="text-[12px] font-body font-semibold text-bright group-hover:text-teal transition-colors duration-300">
                {preset.name}
              </div>
              <div className="text-[10px] font-accent italic text-muted mt-0.5 leading-relaxed">
                {preset.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Editor tools */}
      <div className="p-4 pb-3 border-b border-glass-border">
        <div className="flex items-center gap-2 mb-3">
          <Hexagon className="w-3.5 h-3.5 text-violet" strokeWidth={1.5} />
          <span className="text-[10px] font-mono font-medium text-violet tracking-[0.2em] uppercase">
            Editor
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {editorModes.map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setEditorMode(mode)}
              disabled={isRunning}
              title={label}
              className={`flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl text-[9px] font-mono tracking-wide transition-all duration-300 disabled:opacity-20
                ${editorMode === mode
                  ? 'bg-teal/8 border border-teal/20 text-teal shadow-[inset_0_1px_0_rgba(45,212,191,0.1)]'
                  : 'bg-nebula/40 border border-glass-border text-muted hover:text-text hover:bg-deep/60'
                }`}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={onClearGraph}
          disabled={isRunning}
          className="w-full mt-2.5 px-3 py-1.5 rounded-lg bg-rose/[0.04] border border-rose/[0.08] text-rose/50 hover:text-rose hover:bg-rose/[0.08] text-[10px] font-mono tracking-wide transition-all duration-300 disabled:opacity-20"
        >
          Clear All
        </button>
      </div>

      {/* Vertex weight editor */}
      {selectedV && !isRunning && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="p-4 pb-3 border-b border-glass-border"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3.5 h-3.5 rounded-full bg-star/20 border border-star/30 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-star" />
            </div>
            <span className="text-[10px] font-mono font-medium text-star tracking-[0.2em] uppercase">
              Vertex {selectedV.id}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-[11px] font-accent italic text-muted">Weight</label>
            <input
              type="number"
              min={0.1}
              step={0.5}
              value={selectedV.originalWeight}
              onChange={e => {
                const w = parseFloat(e.target.value);
                if (w > 0) onWeightChange(selectedV.id, w);
              }}
              className="flex-1 px-3 py-1.5 rounded-lg bg-deep border border-glass-border text-bright text-sm font-mono focus:outline-none focus:border-star/30 focus:ring-1 focus:ring-star/10 transition-all duration-300"
            />
          </div>
          <input
            type="range"
            min={0.5}
            max={20}
            step={0.5}
            value={selectedV.originalWeight}
            onChange={e => onWeightChange(selectedV.id, parseFloat(e.target.value))}
            className="w-full mt-3"
          />
        </motion.div>
      )}

      {/* Algorithm controls */}
      <div className="p-4 pb-3 border-b border-glass-border">
        <div className="flex items-center gap-2 mb-3">
          <Play className="w-3.5 h-3.5 text-emerald" strokeWidth={2} />
          <span className="text-[10px] font-mono font-medium text-emerald tracking-[0.2em] uppercase">
            Algorithm
          </span>
        </div>

        {!isRunning ? (
          <button
            onClick={onRun}
            disabled={graph.edges.length === 0}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl bg-gradient-to-b from-emerald/[0.12] to-emerald/[0.04] border border-emerald/20 text-emerald font-body font-semibold text-[13px] tracking-wide hover:from-emerald/[0.18] hover:to-emerald/[0.08] hover:shadow-[0_0_24px_rgba(52,211,153,0.1)] transition-all duration-500 disabled:opacity-20 disabled:cursor-not-allowed group"
          >
            <Play className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" strokeWidth={2.5} />
            Run Local Ratio
          </button>
        ) : (
          <div className="space-y-3">
            {/* Progress */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted">
                Step {currentStep + 1} of {totalSteps}
              </span>
            </div>
            <div className="h-1 bg-deep rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-teal to-emerald"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-2">
              <button
                onClick={onPrevStep}
                disabled={currentStep <= 0}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl bg-deep/60 border border-glass-border text-text hover:text-bright hover:border-glass-border-hover transition-all duration-300 text-xs font-mono disabled:opacity-20"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button
                onClick={onNextStep}
                disabled={currentStep >= totalSteps - 1}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl bg-teal/[0.08] border border-teal/15 text-teal hover:bg-teal/[0.14] transition-all duration-300 text-xs font-mono disabled:opacity-20"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={onReset}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-deep/30 border border-glass-border text-muted hover:text-rose hover:border-rose/15 transition-all duration-300 text-[10px] font-mono"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
        )}
      </div>

      {/* Graph stats */}
      <div className="p-4 mt-auto">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Vertices', value: graph.vertices.length, color: 'text-teal' },
            { label: 'Edges', value: graph.edges.length, color: 'text-violet' },
            { label: 'Weight', value: graph.vertices.reduce((s, v) => s + v.originalWeight, 0).toFixed(1), color: 'text-star' },
          ].map(stat => (
            <div key={stat.label} className="px-2.5 py-2 rounded-xl bg-nebula/40 border border-glass-border text-center">
              <div className="text-[8px] font-mono text-muted uppercase tracking-widest">{stat.label}</div>
              <div className={`text-base font-display ${stat.color} mt-0.5`}>{stat.value}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.aside>
  );
}
