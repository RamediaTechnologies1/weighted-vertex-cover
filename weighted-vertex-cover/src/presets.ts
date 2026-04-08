import type { PresetGraph } from './types';

export const presetGraphs: PresetGraph[] = [
  {
    name: 'General Graph',
    description: 'Heavy vertices (P,Q,R) stay out of cover — light neighbors cover all edges',
    graph: {
      vertices: [
        { id: 'P', x: 150, y: 120, weight: 10, originalWeight: 10, inCover: false, isZero: false },
        { id: 'Q', x: 400, y: 100, weight: 8, originalWeight: 8, inCover: false, isZero: false },
        { id: 'R', x: 620, y: 120, weight: 9, originalWeight: 9, inCover: false, isZero: false },
        { id: 'A', x: 100, y: 350, weight: 2, originalWeight: 2, inCover: false, isZero: false },
        { id: 'B', x: 280, y: 380, weight: 3, originalWeight: 3, inCover: false, isZero: false },
        { id: 'C', x: 480, y: 380, weight: 1, originalWeight: 1, inCover: false, isZero: false },
        { id: 'D', x: 650, y: 350, weight: 2, originalWeight: 2, inCover: false, isZero: false },
      ],
      edges: [
        { id: 'e1', source: 'P', target: 'A', covered: false, active: false, processed: false },
        { id: 'e2', source: 'P', target: 'B', covered: false, active: false, processed: false },
        { id: 'e3', source: 'Q', target: 'B', covered: false, active: false, processed: false },
        { id: 'e4', source: 'Q', target: 'C', covered: false, active: false, processed: false },
        { id: 'e5', source: 'R', target: 'C', covered: false, active: false, processed: false },
        { id: 'e6', source: 'R', target: 'D', covered: false, active: false, processed: false },
        { id: 'e7', source: 'A', target: 'D', covered: false, active: false, processed: false },
      ],
    },
  },
  {
    name: 'Triangle Path',
    description: 'A triangle connected to a path — shows how Local Ratio handles different densities',
    graph: {
      vertices: [
        { id: 'A', x: 200, y: 140, weight: 3, originalWeight: 3, inCover: false, isZero: false },
        { id: 'B', x: 380, y: 280, weight: 5, originalWeight: 5, inCover: false, isZero: false },
        { id: 'C', x: 80, y: 280, weight: 4, originalWeight: 4, inCover: false, isZero: false },
        { id: 'D', x: 530, y: 280, weight: 2, originalWeight: 2, inCover: false, isZero: false },
        { id: 'E', x: 680, y: 280, weight: 6, originalWeight: 6, inCover: false, isZero: false },
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
        { id: 'H', x: 380, y: 250, weight: 4, originalWeight: 4, inCover: false, isZero: false },
        { id: 'A', x: 180, y: 100, weight: 7, originalWeight: 7, inCover: false, isZero: false },
        { id: 'B', x: 580, y: 100, weight: 5, originalWeight: 5, inCover: false, isZero: false },
        { id: 'C', x: 630, y: 330, weight: 8, originalWeight: 8, inCover: false, isZero: false },
        { id: 'D', x: 380, y: 430, weight: 3, originalWeight: 3, inCover: false, isZero: false },
        { id: 'E', x: 130, y: 330, weight: 6, originalWeight: 6, inCover: false, isZero: false },
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
        { id: 'U1', x: 150, y: 130, weight: 2, originalWeight: 2, inCover: false, isZero: false },
        { id: 'U2', x: 380, y: 130, weight: 3, originalWeight: 3, inCover: false, isZero: false },
        { id: 'U3', x: 610, y: 130, weight: 1, originalWeight: 1, inCover: false, isZero: false },
        { id: 'L1', x: 150, y: 380, weight: 5, originalWeight: 5, inCover: false, isZero: false },
        { id: 'L2', x: 380, y: 380, weight: 4, originalWeight: 4, inCover: false, isZero: false },
        { id: 'L3', x: 610, y: 380, weight: 6, originalWeight: 6, inCover: false, isZero: false },
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
