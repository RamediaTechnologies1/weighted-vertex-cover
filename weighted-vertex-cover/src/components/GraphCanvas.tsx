import { useRef, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Graph, EditorMode } from '../types';

interface Props {
  graph: Graph;
  editorMode: EditorMode;
  selectedVertex: string | null;
  edgeStart: string | null;
  isRunning: boolean;
  currentStepType?: string;
  onCanvasClick: (x: number, y: number) => void;
  onVertexClick: (id: string) => void;
  onVertexDrag: (id: string, x: number, y: number) => void;
  onEdgeDelete: (id: string) => void;
}

export default function GraphCanvas({
  graph,
  editorMode,
  selectedVertex,
  edgeStart,
  isRunning,
  onCanvasClick,
  onVertexClick,
  onVertexDrag,
  onEdgeDelete,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateSize = () => {
      if (svgRef.current?.parentElement) {
        const rect = svgRef.current.parentElement.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const getSVGCoords = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, vertexId: string) => {
    e.stopPropagation();
    if (isRunning) return;
    if (editorMode === 'select') {
      setDragging(vertexId);
    }
    onVertexClick(vertexId);
  }, [editorMode, isRunning, onVertexClick]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const coords = getSVGCoords(e);
    setMousePos(coords);
    if (dragging && !isRunning) {
      onVertexDrag(dragging, coords.x, coords.y);
    }
  }, [dragging, getSVGCoords, isRunning, onVertexDrag]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as SVGElement).tagName === 'rect') {
      const coords = getSVGCoords(e);
      onCanvasClick(coords.x, coords.y);
    }
  }, [getSVGCoords, onCanvasClick]);

  const getVertexStyle = (v: typeof graph.vertices[0]) => {
    if (v.inCover) return {
      bodyFill: '#059669',
      stroke: '#047857',
      textColor: '#ffffff',
      weightColor: '#d1fae5',
      badgeFill: '#10b981',
      shadow: 'url(#shadow-emerald)',
    };
    if (v.isZero) return {
      bodyFill: '#d97706',
      stroke: '#b45309',
      textColor: '#ffffff',
      weightColor: '#fef3c7',
      badgeFill: '#f59e0b',
      shadow: 'url(#shadow-amber)',
    };
    return {
      bodyFill: '#1e293b',
      stroke: '#334155',
      textColor: '#f8fafc',
      weightColor: '#94a3b8',
      badgeFill: '#475569',
      shadow: 'url(#shadow-default)',
    };
  };

  const getEdgeStyle = (e: typeof graph.edges[0]) => {
    if (e.active) return { stroke: '#e11d48', opacity: 1, width: 3.5, dash: '' };
    if (e.covered) return { stroke: '#cbd5e1', opacity: 0.3, width: 1, dash: '4 6' };
    if (e.processed) return { stroke: '#94a3b8', opacity: 0.5, width: 1.5, dash: '' };
    return { stroke: '#475569', opacity: 0.7, width: 2, dash: '' };
  };

  const cursorClass =
    editorMode === 'add-vertex' ? 'cursor-crosshair' :
    editorMode === 'delete' ? 'cursor-pointer' :
    editorMode === 'add-edge' ? 'cursor-pointer' :
    dragging ? 'cursor-grabbing' : 'cursor-default';

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* White canvas background with subtle grid */}
      <div className="absolute inset-3 rounded-2xl bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_4px_24px_rgba(0,0,0,0.08)] overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle, #e2e8f0 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      <svg
        ref={svgRef}
        className={`w-full h-full relative z-10 ${cursorClass}`}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
      >
        <defs>
          {/* Drop shadows for light background */}
          <filter id="shadow-default" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#1e293b" floodOpacity="0.25" />
          </filter>
          <filter id="shadow-emerald" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="6" floodColor="#059669" floodOpacity="0.35" />
          </filter>
          <filter id="shadow-amber" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="6" floodColor="#d97706" floodOpacity="0.35" />
          </filter>
          <filter id="shadow-rose" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="6" floodColor="#e11d48" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Background hit area */}
        <rect width={dimensions.width} height={dimensions.height} fill="transparent" />

        {/* Edge being drawn preview */}
        {edgeStart && editorMode === 'add-edge' && (() => {
          const startV = graph.vertices.find(v => v.id === edgeStart);
          if (!startV) return null;
          return (
            <line
              x1={startV.x} y1={startV.y}
              x2={mousePos.x} y2={mousePos.y}
              stroke="#64748b"
              strokeWidth={2}
              strokeDasharray="6 6"
              opacity={0.5}
            />
          );
        })()}

        {/* Edges */}
        <AnimatePresence>
          {graph.edges.map(edge => {
            const src = graph.vertices.find(v => v.id === edge.source);
            const tgt = graph.vertices.find(v => v.id === edge.target);
            if (!src || !tgt) return null;
            const style = getEdgeStyle(edge);

            return (
              <motion.g key={edge.id}>
                {/* Delete hitbox */}
                {editorMode === 'delete' && !isRunning && (
                  <line
                    x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                    stroke="transparent" strokeWidth={18}
                    className="cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); onEdgeDelete(edge.id); }}
                  />
                )}

                {/* Active edge glow */}
                {edge.active && (
                  <>
                    <motion.line
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.1, 0.3, 0.1] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                      stroke="#e11d48" strokeWidth={10} strokeLinecap="round"
                      filter="url(#shadow-rose)" opacity={0.15}
                    />
                  </>
                )}

                {/* Main edge line */}
                <motion.line
                  x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                  stroke={style.stroke}
                  strokeWidth={style.width}
                  strokeLinecap="round"
                  strokeDasharray={style.dash || undefined}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: style.opacity }}
                  transition={{ duration: 0.5 }}
                  filter={edge.active ? 'url(#shadow-rose)' : undefined}
                />
              </motion.g>
            );
          })}
        </AnimatePresence>

        {/* Vertices */}
        <AnimatePresence>
          {graph.vertices.map(vertex => {
            const vs = getVertexStyle(vertex);
            const isSelected = selectedVertex === vertex.id;
            const isEdgeEndpoint = edgeStart === vertex.id;
            const r = vertex.inCover ? 30 : 26;
            const weightRatio = vertex.originalWeight > 0
              ? vertex.weight / vertex.originalWeight
              : 0;

            return (
              <motion.g
                key={vertex.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                style={{ cursor: isRunning ? 'default' : editorMode === 'select' ? 'grab' : 'pointer' }}
                onMouseDown={(e) => handleMouseDown(e, vertex.id)}
              >
                {/* Cover vertex outer ring */}
                {vertex.inCover && (
                  <motion.circle
                    cx={vertex.x} cy={vertex.y} r={r + 8}
                    fill="none" stroke="#10b981" strokeWidth={2}
                    strokeDasharray="4 4"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}

                {/* Selection ring */}
                {(isSelected || isEdgeEndpoint) && (
                  <motion.circle
                    cx={vertex.x} cy={vertex.y} r={r + 6}
                    fill="none" stroke="#3b82f6" strokeWidth={2}
                    strokeDasharray="4 4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.7 }}
                  />
                )}

                {/* Weight depletion ring */}
                {vertex.weight !== vertex.originalWeight && !vertex.inCover && (
                  <circle
                    cx={vertex.x} cy={vertex.y} r={r + 4}
                    fill="none"
                    stroke="#d97706"
                    strokeWidth={2.5}
                    strokeDasharray={`${weightRatio * 2 * Math.PI * (r + 4)} ${2 * Math.PI * (r + 4)}`}
                    strokeDashoffset={2 * Math.PI * (r + 4) * 0.25}
                    opacity={0.5}
                    strokeLinecap="round"
                  />
                )}

                {/* Main vertex body */}
                <circle
                  cx={vertex.x} cy={vertex.y} r={r}
                  fill={vs.bodyFill}
                  stroke={vs.stroke}
                  strokeWidth={2}
                  filter={vs.shadow}
                />

                {/* Vertex label */}
                <text
                  x={vertex.x} y={vertex.y - 5}
                  textAnchor="middle" dominantBaseline="middle"
                  fontFamily="'Instrument Serif', serif"
                  fontStyle="italic"
                  fill={vs.textColor}
                  fontSize={16}
                  fontWeight={400}
                  className="select-none pointer-events-none"
                >
                  {vertex.id}
                </text>

                {/* Weight value */}
                <text
                  x={vertex.x} y={vertex.y + 11}
                  textAnchor="middle" dominantBaseline="middle"
                  fontFamily="'Fira Code', monospace"
                  fill={vs.weightColor}
                  fontSize={10}
                  fontWeight={600}
                  className="select-none pointer-events-none"
                >
                  {vertex.weight.toFixed(1)}
                </text>

                {/* Original weight badge when reduced */}
                {vertex.weight !== vertex.originalWeight && !vertex.inCover && (
                  <g>
                    <rect
                      x={vertex.x + r + 3} y={vertex.y - r - 3}
                      width={34} height={18} rx={9}
                      fill="#fef3c7" stroke="#f59e0b" strokeWidth={1}
                    />
                    <text
                      x={vertex.x + r + 20} y={vertex.y - r + 7}
                      textAnchor="middle" dominantBaseline="middle"
                      fontFamily="'Fira Code', monospace"
                      fill="#92400e" fontSize={8} fontWeight={600}
                      className="select-none pointer-events-none"
                    >
                      w₀={vertex.originalWeight}
                    </text>
                  </g>
                )}

                {/* Cover badge */}
                {vertex.inCover && (
                  <motion.g
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.1 }}
                  >
                    <circle
                      cx={vertex.x + r - 4} cy={vertex.y - r + 4}
                      r={10} fill="#10b981" stroke="#ffffff" strokeWidth={2}
                    />
                    <text
                      x={vertex.x + r - 4} y={vertex.y - r + 5}
                      textAnchor="middle" dominantBaseline="middle"
                      fill="#ffffff" fontSize={11} fontWeight={800}
                      className="select-none pointer-events-none"
                    >
                      ✓
                    </text>
                  </motion.g>
                )}
              </motion.g>
            );
          })}
        </AnimatePresence>
      </svg>

      {/* Mode indicator toasts */}
      <AnimatePresence>
        {editorMode === 'add-vertex' && !isRunning && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full bg-slate-800 text-white text-xs font-mono tracking-wide shadow-lg"
          >
            Click anywhere to place a vertex
          </motion.div>
        )}
        {editorMode === 'add-edge' && edgeStart && !isRunning && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full bg-slate-800 text-white text-xs font-mono tracking-wide shadow-lg"
          >
            Click another vertex to complete the edge
          </motion.div>
        )}
        {editorMode === 'delete' && !isRunning && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full bg-rose-700 text-white text-xs font-mono tracking-wide shadow-lg"
          >
            Click a vertex or edge to remove it
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
