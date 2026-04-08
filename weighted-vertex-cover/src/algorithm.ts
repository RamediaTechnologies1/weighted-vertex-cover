import type { Graph, AlgorithmStep, Edge } from './types';

function cloneGraph(graph: Graph): Graph {
  return {
    vertices: graph.vertices.map(v => ({ ...v })),
    edges: graph.edges.map(e => ({ ...e })),
  };
}

export function runLocalRatio(initialGraph: Graph): AlgorithmStep[] {
  const steps: AlgorithmStep[] = [];
  let graph = cloneGraph(initialGraph);

  // Reset state
  graph.vertices.forEach(v => {
    v.weight = v.originalWeight;
    v.inCover = false;
    v.isZero = false;
  });
  graph.edges.forEach(e => {
    e.covered = false;
    e.active = false;
    e.processed = false;
  });

  // Step 0: Initial state
  steps.push({
    type: 'init',
    description: 'Initial Graph',
    detail: `We start with a weighted graph. Each vertex has a weight shown inside it. The Local Ratio method will iteratively select uncovered edges, subtract the minimum endpoint weight (ε) from both endpoints, and add zero-weight vertices to the cover.`,
    graph: cloneGraph(graph),
  });

  // Find uncovered edges (edges where neither endpoint is in cover)
  const getUncoveredEdges = (g: Graph): Edge[] => {
    return g.edges.filter(e => {
      if (e.covered) return false;
      const src = g.vertices.find(v => v.id === e.source)!;
      const tgt = g.vertices.find(v => v.id === e.target)!;
      return !src.inCover && !tgt.inCover;
    });
  };

  let iteration = 0;
  const maxIterations = 100; // safety

  while (iteration < maxIterations) {
    const uncoveredEdges = getUncoveredEdges(graph);
    if (uncoveredEdges.length === 0) break;

    // Pick the first uncovered edge
    const edge = uncoveredEdges[0];
    const srcVertex = graph.vertices.find(v => v.id === edge.source)!;
    const tgtVertex = graph.vertices.find(v => v.id === edge.target)!;

    // Mark edge as active
    edge.active = true;
    steps.push({
      type: 'select-edge',
      description: `Select Edge (${srcVertex.id}, ${tgtVertex.id})`,
      detail: `Pick uncovered edge (${srcVertex.id}, ${tgtVertex.id}). The endpoints have weights ${srcVertex.weight.toFixed(1)} and ${tgtVertex.weight.toFixed(1)}. We'll subtract ε = min(${srcVertex.weight.toFixed(1)}, ${tgtVertex.weight.toFixed(1)}) = ${Math.min(srcVertex.weight, tgtVertex.weight).toFixed(1)} from both.`,
      edgeId: edge.id,
      affectedVertices: [srcVertex.id, tgtVertex.id],
      graph: cloneGraph(graph),
    });

    // Compute epsilon
    const epsilon = Math.min(srcVertex.weight, tgtVertex.weight);

    // Subtract epsilon from both endpoints
    srcVertex.weight = Math.max(0, srcVertex.weight - epsilon);
    tgtVertex.weight = Math.max(0, tgtVertex.weight - epsilon);

    // Check for zero
    srcVertex.isZero = srcVertex.weight < 0.001;
    tgtVertex.isZero = tgtVertex.weight < 0.001;

    edge.active = false;
    edge.processed = true;

    steps.push({
      type: 'reduce',
      description: `Reduce by ε = ${epsilon.toFixed(1)}`,
      detail: `Subtract ${epsilon.toFixed(1)} from both endpoints. ${srcVertex.id} → ${srcVertex.weight.toFixed(1)}, ${tgtVertex.id} → ${tgtVertex.weight.toFixed(1)}.${srcVertex.isZero ? ` Vertex ${srcVertex.id} reached zero!` : ''}${tgtVertex.isZero ? ` Vertex ${tgtVertex.id} reached zero!` : ''}`,
      edgeId: edge.id,
      epsilon,
      affectedVertices: [srcVertex.id, tgtVertex.id],
      graph: cloneGraph(graph),
    });

    // Add zero-weight vertices to cover
    const newCoverVertices: string[] = [];
    if (srcVertex.isZero && !srcVertex.inCover) {
      srcVertex.inCover = true;
      newCoverVertices.push(srcVertex.id);
    }
    if (tgtVertex.isZero && !tgtVertex.inCover) {
      tgtVertex.inCover = true;
      newCoverVertices.push(tgtVertex.id);
    }

    if (newCoverVertices.length > 0) {
      steps.push({
        type: 'vertex-zero',
        description: `Add ${newCoverVertices.join(', ')} to Cover`,
        detail: `Vertex ${newCoverVertices.join(' and ')} reached weight 0 and ${newCoverVertices.length > 1 ? 'are' : 'is'} added to the vertex cover. All edges incident to ${newCoverVertices.length > 1 ? 'these vertices' : 'this vertex'} are now covered.`,
        affectedVertices: newCoverVertices,
        graph: cloneGraph(graph),
      });

      // Mark covered edges
      const coveredEdgeIds: string[] = [];
      graph.edges.forEach(e => {
        if (!e.covered) {
          const srcInCover = graph.vertices.find(v => v.id === e.source)!.inCover;
          const tgtInCover = graph.vertices.find(v => v.id === e.target)!.inCover;
          if (srcInCover || tgtInCover) {
            e.covered = true;
            coveredEdgeIds.push(e.id);
          }
        }
      });

      if (coveredEdgeIds.length > 0) {
        steps.push({
          type: 'remove-edges',
          description: `Cover ${coveredEdgeIds.length} Edge${coveredEdgeIds.length > 1 ? 's' : ''}`,
          detail: `${coveredEdgeIds.length} edge${coveredEdgeIds.length > 1 ? 's are' : ' is'} now covered by the selected vertices. These edges fade out to show they're satisfied.`,
          coveredEdges: coveredEdgeIds,
          graph: cloneGraph(graph),
        });
      }
    }

    iteration++;
  }

  // Final step
  const coverVertices = graph.vertices.filter(v => v.inCover).map(v => v.id);
  const totalWeight = graph.vertices
    .filter(v => v.inCover)
    .reduce((sum, v) => sum + v.originalWeight, 0);

  steps.push({
    type: 'done',
    description: 'Algorithm Complete!',
    detail: `The Local Ratio method found a vertex cover: {${coverVertices.join(', ')}} with total weight ${totalWeight.toFixed(1)}. This is a 2-approximation — the cover's weight is at most twice the optimal.`,
    graph: cloneGraph(graph),
  });

  return steps;
}
