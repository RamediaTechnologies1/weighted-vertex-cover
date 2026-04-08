import { useState, useCallback, useRef } from 'react';
import { Graph, AlgorithmStep, EditorMode } from './types';
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

        <StepNarration
          steps={steps}
          currentStep={currentStep}
          onStepClick={setCurrentStep}
        />
      </div>
    </div>
  );
}

export default App;
