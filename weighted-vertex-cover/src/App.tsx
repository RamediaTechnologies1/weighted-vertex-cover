import { useState, useCallback, useRef } from 'react';
import type { Graph, AlgorithmStep, EditorMode } from './types';
import { runLocalRatio } from './algorithm';
import { presetGraphs } from './presets';
import GraphCanvas from './components/GraphCanvas';
import ControlPanel from './components/ControlPanel';
import StepNarration from './components/StepNarration';
import Header from './components/Header';

function getDefaultGraph(): Graph {
  return JSON.parse(JSON.stringify(presetGraphs[0].graph));
}

function App() {
  const [graph, setGraph] = useState<Graph>(getDefaultGraph);
  const [steps, setSteps] = useState<AlgorithmStep[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('select');
  const [selectedVertex, setSelectedVertex] = useState<string | null>(null);
  const [edgeStart, setEdgeStart] = useState<string | null>(null);
  const nextId = useRef(1);

  const displayGraph = currentStep >= 0 && steps[currentStep] ? steps[currentStep].graph : graph;

  const handleReset = useCallback(() => {
    setSteps([]);
    setCurrentStep(-1);
    setIsRunning(false);
    setSelectedVertex(null);
    setEdgeStart(null);
    setGraph(prev => ({
      vertices: prev.vertices.map(v => ({
        ...v,
        weight: v.originalWeight,
        inCover: false,
        isZero: false,
      })),
      edges: prev.edges.map(e => ({
        ...e,
        covered: false,
        active: false,
        processed: false,
      })),
    }));
  }, []);

  const handleRunAlgorithm = useCallback(() => {
    const freshGraph: Graph = {
      vertices: graph.vertices.map(v => ({
        ...v,
        weight: v.originalWeight,
        inCover: false,
        isZero: false,
      })),
      edges: graph.edges.map(e => ({
        ...e,
        covered: false,
        active: false,
        processed: false,
      })),
    };
    const algorithmSteps = runLocalRatio(freshGraph);
    setSteps(algorithmSteps);
    setCurrentStep(0);
    setIsRunning(true);
  }, [graph]);

  const handleNextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, steps.length]);

  const handlePrevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleLoadPreset = useCallback((index: number) => {
    const preset = presetGraphs[index];
    setGraph(JSON.parse(JSON.stringify(preset.graph)));
    setSteps([]);
    setCurrentStep(-1);
    setIsRunning(false);
    setSelectedVertex(null);
    setEdgeStart(null);
  }, []);

  const handleCanvasClick = useCallback((x: number, y: number) => {
    if (isRunning) return;

    if (editorMode === 'add-vertex') {
      const id = `V${nextId.current++}`;
      setGraph(prev => ({
        ...prev,
        vertices: [...prev.vertices, {
          id, x, y, weight: 5, originalWeight: 5, inCover: false, isZero: false,
        }],
      }));
    }
  }, [editorMode, isRunning]);

  const handleVertexClick = useCallback((vertexId: string) => {
    if (isRunning) return;

    if (editorMode === 'select') {
      setSelectedVertex(prev => prev === vertexId ? null : vertexId);
    } else if (editorMode === 'delete') {
      setGraph(prev => ({
        vertices: prev.vertices.filter(v => v.id !== vertexId),
        edges: prev.edges.filter(e => e.source !== vertexId && e.target !== vertexId),
      }));
      setSelectedVertex(null);
    } else if (editorMode === 'add-edge') {
      if (!edgeStart) {
        setEdgeStart(vertexId);
      } else if (edgeStart !== vertexId) {
        const exists = graph.edges.some(e =>
          (e.source === edgeStart && e.target === vertexId) ||
          (e.source === vertexId && e.target === edgeStart)
        );
        if (!exists) {
          const id = `e${Date.now()}`;
          setGraph(prev => ({
            ...prev,
            edges: [...prev.edges, {
              id, source: edgeStart!, target: vertexId,
              covered: false, active: false, processed: false,
            }],
          }));
        }
        setEdgeStart(null);
      }
    }
  }, [editorMode, edgeStart, graph.edges, isRunning]);

  const handleVertexDrag = useCallback((vertexId: string, x: number, y: number) => {
    if (isRunning) return;
    setGraph(prev => ({
      ...prev,
      vertices: prev.vertices.map(v =>
        v.id === vertexId ? { ...v, x, y } : v
      ),
    }));
  }, [isRunning]);

  const handleWeightChange = useCallback((vertexId: string, weight: number) => {
    setGraph(prev => ({
      ...prev,
      vertices: prev.vertices.map(v =>
        v.id === vertexId ? { ...v, weight, originalWeight: weight } : v
      ),
    }));
  }, []);

  const handleEdgeDelete = useCallback((edgeId: string) => {
    if (isRunning) return;
    setGraph(prev => ({
      ...prev,
      edges: prev.edges.filter(e => e.id !== edgeId),
    }));
  }, [isRunning]);

  const handleClearGraph = useCallback(() => {
    setGraph({ vertices: [], edges: [] });
    setSteps([]);
    setCurrentStep(-1);
    setIsRunning(false);
    setSelectedVertex(null);
    setEdgeStart(null);
  }, []);

  const handleGenerateRandom = useCallback((vertexCount: number) => {
    const padding = 80;
    const canvasW = 700;
    const canvasH = 500;

    // Designate ~30% of vertices as "heavy" (won't be picked by algorithm)
    // and the rest as "light" (will reach zero and join cover)
    const heavyCount = Math.max(1, Math.floor(vertexCount * 0.3));
    const heavyIndices = new Set<number>();
    while (heavyIndices.size < heavyCount) {
      heavyIndices.add(Math.floor(Math.random() * vertexCount));
    }

    // Place vertices in circular layout with jitter
    const vertices: Graph['vertices'] = [];
    const cx = canvasW / 2 + padding / 2;
    const cy = canvasH / 2 + padding / 2;
    const radius = Math.min(canvasW, canvasH) * 0.35;

    for (let i = 0; i < vertexCount; i++) {
      const angle = (2 * Math.PI * i) / vertexCount - Math.PI / 2;
      const jitterX = (Math.random() - 0.5) * 60;
      const jitterY = (Math.random() - 0.5) * 60;
      const x = cx + Math.cos(angle) * radius + jitterX;
      const y = cy + Math.sin(angle) * radius + jitterY;

      // Heavy vertices get weight 8-15, light ones get 1-4
      const weight = heavyIndices.has(i)
        ? Math.round((Math.random() * 7 + 8) * 2) / 2   // 8 to 15
        : Math.round((Math.random() * 3 + 1) * 2) / 2;  // 1 to 4

      vertices.push({
        id: String.fromCharCode(65 + i),
        x, y,
        weight,
        originalWeight: weight,
        inCover: false,
        isZero: false,
      });
    }

    // Generate edges: heavy vertices connect primarily to light ones
    // so the light neighbors reach zero and cover the heavy vertices' edges
    const edges: Graph['edges'] = [];
    let edgeId = 0;
    const edgeSet = new Set<string>();

    const addEdge = (i: number, j: number) => {
      const key = [vertices[i].id, vertices[j].id].sort().join('-');
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({
          id: `e${edgeId++}`,
          source: vertices[i].id,
          target: vertices[j].id,
          covered: false, active: false, processed: false,
        });
      }
    };

    // Step 1: ensure every heavy vertex connects to at least 2 light vertices
    const lightIndices = [...Array(vertexCount).keys()].filter(i => !heavyIndices.has(i));
    for (const hi of heavyIndices) {
      const shuffledLight = [...lightIndices].sort(() => Math.random() - 0.5);
      const connectCount = Math.min(shuffledLight.length, 2 + Math.floor(Math.random() * 2));
      for (let k = 0; k < connectCount; k++) {
        addEdge(hi, shuffledLight[k]);
      }
    }

    // Step 2: spanning path among light vertices for connectivity
    const shuffledLight = [...lightIndices].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffledLight.length - 1; i++) {
      addEdge(shuffledLight[i], shuffledLight[i + 1]);
    }

    // Step 3: connect any isolated heavy vertices to the light spanning path
    for (const hi of heavyIndices) {
      const hasEdge = edges.some(e => e.source === vertices[hi].id || e.target === vertices[hi].id);
      if (!hasEdge && lightIndices.length > 0) {
        addEdge(hi, lightIndices[Math.floor(Math.random() * lightIndices.length)]);
      }
    }

    // Step 4: add a few random light-light edges for variety
    for (let i = 0; i < lightIndices.length; i++) {
      for (let j = i + 1; j < lightIndices.length; j++) {
        if (Math.random() < 0.25) {
          addEdge(lightIndices[i], lightIndices[j]);
        }
      }
    }

    setGraph({ vertices, edges });
    setSteps([]);
    setCurrentStep(-1);
    setIsRunning(false);
    setSelectedVertex(null);
    setEdgeStart(null);
    nextId.current = vertexCount + 1;
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-void overflow-hidden grain">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <ControlPanel
          editorMode={editorMode}
          setEditorMode={setEditorMode}
          isRunning={isRunning}
          onRun={handleRunAlgorithm}
          onReset={handleReset}
          onNextStep={handleNextStep}
          onPrevStep={handlePrevStep}
          onLoadPreset={handleLoadPreset}
          onClearGraph={handleClearGraph}
          onGenerateRandom={handleGenerateRandom}
          currentStep={currentStep}
          totalSteps={steps.length}
          selectedVertex={selectedVertex}
          graph={graph}
          onWeightChange={handleWeightChange}
          edgeStart={edgeStart}
        />

        <div className="flex-1 relative">
          <GraphCanvas
            graph={displayGraph}
            editorMode={editorMode}
            selectedVertex={selectedVertex}
            edgeStart={edgeStart}
            isRunning={isRunning}
            currentStepType={steps[currentStep]?.type}
            onCanvasClick={handleCanvasClick}
            onVertexClick={handleVertexClick}
            onVertexDrag={handleVertexDrag}
            onEdgeDelete={handleEdgeDelete}
          />
        </div>

        {isRunning && (
          <StepNarration
            steps={steps}
            currentStep={currentStep}
            onStepClick={setCurrentStep}
          />
        )}
      </div>
    </div>
  );
}

export default App;
