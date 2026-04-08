export interface Vertex {
  id: string;
  x: number;
  y: number;
  weight: number;
  originalWeight: number;
  inCover: boolean;
  isZero: boolean;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  covered: boolean;
  active: boolean;       // currently selected for reduction
  processed: boolean;    // already processed
}

export interface Graph {
  vertices: Vertex[];
  edges: Edge[];
}

export interface AlgorithmStep {
  type: 'init' | 'select-edge' | 'reduce' | 'vertex-zero' | 'remove-edges' | 'done';
  description: string;
  detail: string;
  edgeId?: string;
  epsilon?: number;
  vertexId?: string;
  affectedVertices?: string[];
  coveredEdges?: string[];
  graph: Graph;
}

export type EditorMode = 'select' | 'add-vertex' | 'add-edge' | 'delete';

export interface PresetGraph {
  name: string;
  description: string;
  graph: Graph;
}
