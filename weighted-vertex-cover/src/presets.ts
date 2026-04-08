import { PresetGraph } from './types';

export const presetGraphs: PresetGraph[] = [
  {
    name: 'Triangle Path',
    description: 'A triangle connected to a path — shows how Local Ratio handles different densities',
    graph: {
      vertices: [
        { id: 'A', x: 200, y: 120, weight: 3, originalWeight: 3, inCover: false, isZero: false },
        { id: 'B', x: 350, y: 250, weight: 5, originalWeight: 5, inCover: false, isZero: false },
        { id: 'C', x: 50, y: 250, weight: 4, originalWeight: 4, inCover: false, isZero: false },
        { id: 'D', x: 500, y: 250, weight: 2, originalWeight: 2, inCover: false, isZero: false },
        { id: 'E', x: 650, y: 250, weight: 6, originalWeight: 6, inCover: false, isZero: false },
      ],
      edges: [
        { id: 'e1', source: 'A', target: 'B', covered: false, active: false, processed: false },
        { id: 'e2', source: 'A', target: 'C', covered: false, active: false, processed: false },
        { id: 'e3', source: 'B', target: 'C', covered: false, active: false, processed: false },
        { id: 'e4', source: 'B', target: 'D', covered: false, active: false, processed: false },
        { id: 'e5', source: 'D', target: 'E', covered: false, active: false, processed: false },
      ],
    },
  },
  {
    name: 'Star Graph',
    description: 'A central hub with spokes — optimal cover is just the center vertex',
    graph: {
      vertices: [
        { id: 'H', x: 350, y: 220, weight: 4, originalWeight: 4, inCover: false, isZero: false },
        { id: 'A', x: 150, y: 80, weight: 7, originalWeight: 7, inCover: false, isZero: false },
        { id: 'B', x: 550, y: 80, weight: 5, originalWeight: 5, inCover: false, isZero: false },
        { id: 'C', x: 600, y: 300, weight: 8, originalWeight: 8, inCover: false, isZero: false },
        { id: 'D', x: 350, y: 400, weight: 3, originalWeight: 3, inCover: false, isZero: false },
        { id: 'E', x: 100, y: 300, weight: 6, originalWeight: 6, inCover: false, isZero: false },
      ],
      edges: [
        { id: 'e1', source: 'H', target: 'A', covered: false, active: false, processed: false },
        { id: 'e2', source: 'H', target: 'B', covered: false, active: false, processed: false },
        { id: 'e3', source: 'H', target: 'C', covered: false, active: false, processed: false },
        { id: 'e4', source: 'H', target: 'D', covered: false, active: false, processed: false },
        { id: 'e5', source: 'H', target: 'E', covered: false, active: false, processed: false },
      ],
    },
  },
  {
    name: 'Bipartite Chain',
    description: 'A bipartite graph showing how weight asymmetry affects vertex selection',
    graph: {
      vertices: [
        { id: 'U1', x: 130, y: 100, weight: 2, originalWeight: 2, inCover: false, isZero: false },
        { id: 'U2', x: 350, y: 100, weight: 3, originalWeight: 3, inCover: false, isZero: false },
        { id: 'U3', x: 570, y: 100, weight: 1, originalWeight: 1, inCover: false, isZero: false },
        { id: 'L1', x: 130, y: 350, weight: 5, originalWeight: 5, inCover: false, isZero: false },
        { id: 'L2', x: 350, y: 350, weight: 4, originalWeight: 4, inCover: false, isZero: false },
        { id: 'L3', x: 570, y: 350, weight: 6, originalWeight: 6, inCover: false, isZero: false },
      ],
      edges: [
        { id: 'e1', source: 'U1', target: 'L1', covered: false, active: false, processed: false },
        { id: 'e2', source: 'U1', target: 'L2', covered: false, active: false, processed: false },
        { id: 'e3', source: 'U2', target: 'L2', covered: false, active: false, processed: false },
        { id: 'e4', source: 'U2', target: 'L3', covered: false, active: false, processed: false },
        { id: 'e5', source: 'U3', target: 'L3', covered: false, active: false, processed: false },
        { id: 'e6', source: 'U3', target: 'L1', covered: false, active: false, processed: false },
      ],
    },
  },
];
