import { useRef, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Graph, EditorMode } from '../types';

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
      fill: '#34d399', stroke: '#34d399',
      glowColor: 'rgba(52,211,153,0.6)', filterId: 'glow-emerald',
      ringColor: 'rgba(52,211,153,0.15)',
    };
    if (v.isZero) return {
      fill: '#f5c842', stroke: '#f5c842',
      glowColor: 'rgba(245,200,66,0.5)', filterId: 'glow-star',
      ringColor: 'rgba(245,200,66,0.1)',
    };
    return {
      fill: '#2dd4bf', stroke: '#2dd4bf',
      glowColor: 'rgba(45,212,191,0.4)', filterId: 'glow-teal',
      ringColor: 'rgba(45,212,191,0.06)',
    };
  };

  const getEdgeStyle = (e: typeof graph.edges[0]) => {
    if (e.active) return { stroke: '#f43f5e', opacity: 1, width: 3, dash: '' };
    if (e.covered) return { stroke: '#3d5280', opacity: 0.15, width: 1, dash: '4 6' };
    if (e.processed) return { stroke: '#6880aa', opacity: 0.35, width: 1.5, dash: '' };
    return { stroke: '#3d5280', opacity: 0.55, width: 1.5, dash: '' };
  };

  const cursorClass =
    editorMode === 'add-vertex' ? 'cursor-crosshair' :
    editorMode === 'delete' ? 'cursor-pointer' :
    editorMode === 'add-edge' ? 'cursor-pointer' :
    dragging ? 'cursor-grabbing' : 'cursor-default';

  return (
    <div className="w-full h-full relative overflow-hidden constellation-bg">
      {/* Atmospheric orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[15%] left-[20%] w-[500px] h-[500px] bg-teal/[0.015] rounded-full blur-[120px] animate-drift" />
        <div className="absolute bottom-[20%] right-[15%] w-[400px] h-[400px] bg-star/[0.01] rounded-full blur-[100px] animate-drift" style={{ animationDelay: '-3s' }} />
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet/[0.008] rounded-full blur-[140px]" />
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
          {/* Glow filters */}
          <filter id="glow-teal" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix in="blur" values="0 0 0 0 0.18  0 0 0 0 0.83  0 0 0 0 0.75  0 0 0 0.5 0" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-emerald" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix in="blur" values="0 0 0 0 0.2  0 0 0 0 0.83  0 0 0 0 0.6  0 0 0 0.6 0" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-star" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix in="blur" values="0 0 0 0 0.96  0 0 0 0 0.78  0 0 0 0 0.26  0 0 0 0.55 0" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-rose" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix in="blur" values="0 0 0 0 0.96  0 0 0 0 0.25  0 0 0 0 0.37  0 0 0 0.55 0" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Soft drop shadow for vertex bodies */}
          <filter id="vertex-shadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="2" stdDeviation="6" floodColor="#000" floodOpacity="0.4" />
          </filter>
          {/* Edge gradient for depth */}
          <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3d5280" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#3d5280" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#3d5280" stopOpacity="0.2" />
          </linearGradient>
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
              stroke="#2dd4bf"
              strokeWidth={1.5}
              strokeDasharray="6 6"
              opacity={0.4}
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

                {/* Active edge aura */}
                {edge.active && (
                  <>
                    <motion.line
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.1, 0.4, 0.1] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                      stroke="#f43f5e" strokeWidth={12} strokeLinecap="round"
                      filter="url(#glow-rose)" opacity={0.2}
                    />
                    <motion.line
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.2, 0.6, 0.2] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                      stroke="#f43f5e" strokeWidth={5} strokeLinecap="round"
                      opacity={0.4}
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
                  filter={edge.active ? 'url(#glow-rose)' : undefined}
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
                {/* Outer orbital ring for cover vertices */}
                {vertex.inCover && (
                  <>
                    <motion.circle
                      cx={vertex.x} cy={vertex.y} r={r + 14}
                      fill="none" stroke={vs.stroke} strokeWidth={0.5}
                      strokeDasharray="3 8"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.4, rotate: 360 }}
                      transition={{ opacity: { duration: 0.5 }, rotate: { duration: 30, repeat: Infinity, ease: 'linear' } }}
                      style={{ transformOrigin: `${vertex.x}px ${vertex.y}px` }}
                    />
                    <motion.circle
                      cx={vertex.x} cy={vertex.y} r={r + 8}
                      fill="none" stroke={vs.stroke} strokeWidth={0.8}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: [0.15, 0.35, 0.15] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                    />
                  </>
                )}

                {/* Selection ring */}
                {(isSelected || isEdgeEndpoint) && (
                  <motion.circle
                    cx={vertex.x} cy={vertex.y} r={r + 8}
                    fill="none" stroke="#6880aa" strokeWidth={1}
                    strokeDasharray="4 4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                  />
                )}

                {/* Weight depletion ring (shows remaining weight visually) */}
                {vertex.weight !== vertex.originalWeight && !vertex.inCover && (
                  <circle
                    cx={vertex.x} cy={vertex.y} r={r + 4}
                    fill="none"
                    stroke={vs.stroke}
                    strokeWidth={2}
                    strokeDasharray={`${weightRatio * 2 * Math.PI * (r + 4)} ${2 * Math.PI * (r + 4)}`}
                    strokeDashoffset={2 * Math.PI * (r + 4) * 0.25}
                    opacity={0.3}
                    strokeLinecap="round"
                  />
                )}

                {/* Main vertex body */}
                <circle
                  cx={vertex.x} cy={vertex.y} r={r}
                  fill="#0c1225"
                  stroke={vs.stroke}
                  strokeWidth={vertex.inCover ? 2 : 1.2}
                  filter={`url(#${vs.filterId})`}
                />

                {/* Inner radial fill */}
                <circle
                  cx={vertex.x} cy={vertex.y} r={r - 1.5}
                  fill={`${vs.fill}08`}
                />

                {/* Core glow dot */}
                <circle
                  cx={vertex.x} cy={vertex.y} r={3}
                  fill={vs.fill}
                  opacity={vertex.inCover ? 0.8 : 0.2}
                />

                {/* Vertex label */}
                <text
                  x={vertex.x} y={vertex.y - 5}
                  textAnchor="middle" dominantBaseline="middle"
                  fontFamily="'Instrument Serif', serif"
                  fontStyle="italic"
                  fill={vs.fill}
                  fontSize={15}
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
                  fill={vertex.isZero ? '#f5c842' : vertex.inCover ? '#34d399' : '#b8c8e8'}
                  fontSize={10}
                  fontWeight={500}
                  className="select-none pointer-events-none"
                >
                  {vertex.weight.toFixed(1)}
                </text>

                {/* Original weight badge when reduced */}
                {vertex.weight !== vertex.originalWeight && !vertex.inCover && (
                  <g>
                    <rect
                      x={vertex.x + r + 2} y={vertex.y - r - 2}
                      width={32} height={16} rx={8}
                      fill="#0c1225" stroke="#3d5280" strokeWidth={0.5}
                    />
                    <text
                      x={vertex.x + r + 18} y={vertex.y - r + 7}
                      textAnchor="middle" dominantBaseline="middle"
                      fontFamily="'Fira Code', monospace"
                      fill="#6880aa" fontSize={8}
                      className="select-none pointer-events-none"
                    >
                      was {vertex.originalWeight}
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
                      cx={vertex.x + r - 2} cy={vertex.y - r + 2}
                      r={9} fill="#34d399"
                    />
                    <text
                      x={vertex.x + r - 2} y={vertex.y - r + 3}
                      textAnchor="middle" dominantBaseline="middle"
                      fill="#06080f" fontSize={10} fontWeight={800}
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
            className="absolute bottom-5 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full glass-panel text-teal text-xs font-mono tracking-wide"
          >
            Click anywhere to place a vertex
          </motion.div>
        )}
        {editorMode === 'add-edge' && edgeStart && !isRunning && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-5 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full glass-panel text-teal text-xs font-mono tracking-wide"
          >
            Click another vertex to complete the edge
          </motion.div>
        )}
        {editorMode === 'delete' && !isRunning && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-5 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full glass-panel text-rose text-xs font-mono tracking-wide"
          >
            Click a vertex or edge to remove it
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
