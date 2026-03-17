import type { BuildingFloorPlan, FloorPlanRoom, FloorPlanHallway } from "./types";

// ============================================================
// GORE HALL — 65,000 sq ft, 3 floors, central octagonal atrium
// 25 classrooms (17 general, 4 seminar, 3 tiered case-study, 1 PBL)
// Center for Teaching & Assessment (CTA) offices
// Classical revival architecture, Doric columns, mahogany interior
// ============================================================

const GORE_HALL_ROOMS: FloorPlanRoom[] = [
  // ─── Floor 1 ───
  { id: "GOR-101", label: "101", type: "classroom", x: 20, y: 20, width: 160, height: 100, floor: "1",
    capacity: 40, description: "General classroom, north wing", equipment: { hvac_units: 2, electrical_panels: 1, projectors: 1, description: "2 ceiling HVAC vents, 1 projector, whiteboard" }, commonIssues: ["hvac", "electrical"] },
  { id: "GOR-102", label: "102", type: "classroom", x: 190, y: 20, width: 160, height: 100, floor: "1",
    capacity: 40, description: "General classroom, north wing", equipment: { hvac_units: 2, electrical_panels: 1, projectors: 1 }, commonIssues: ["hvac"] },
  { id: "GOR-103", label: "103", type: "classroom", x: 20, y: 130, width: 160, height: 90, floor: "1",
    capacity: 45, description: "Large classroom, north wing", equipment: { hvac_units: 3, electrical_panels: 1, projectors: 1, description: "3 HVAC vents, ceiling projector, 2 whiteboards" }, commonIssues: ["hvac", "electrical"] },
  { id: "GOR-104", label: "104", type: "classroom", x: 190, y: 130, width: 160, height: 90, floor: "1",
    capacity: 35, description: "General classroom, north wing", equipment: { hvac_units: 2, electrical_panels: 1, projectors: 1 }, commonIssues: ["hvac"] },
  { id: "GOR-105", label: "105", type: "classroom", x: 580, y: 20, width: 160, height: 100, floor: "1",
    capacity: 40, description: "General classroom, south wing", equipment: { hvac_units: 2, electrical_panels: 1, projectors: 1 }, commonIssues: ["hvac"] },
  { id: "GOR-106", label: "106", type: "classroom", x: 750, y: 20, width: 130, height: 100, floor: "1",
    capacity: 35, description: "General classroom, south wing", equipment: { hvac_units: 2, electrical_panels: 1, projectors: 1 }, commonIssues: ["hvac", "electrical"] },
  { id: "GOR-107", label: "107", type: "seminar", x: 580, y: 130, width: 145, height: 90, floor: "1",
    capacity: 20, description: "Seminar room with conference table", equipment: { hvac_units: 1, electrical_panels: 1, projectors: 1, description: "Conference table, wall-mounted display" }, commonIssues: ["hvac"] },
  { id: "GOR-108", label: "108", type: "seminar", x: 735, y: 130, width: 145, height: 90, floor: "1",
    capacity: 20, description: "Seminar room with conference table", equipment: { hvac_units: 1, electrical_panels: 1, projectors: 1 }, commonIssues: ["hvac"] },
  { id: "GOR-109", label: "109", type: "classroom", x: 580, y: 400, width: 160, height: 100, floor: "1",
    capacity: 35, description: "General classroom, south wing", equipment: { hvac_units: 2, electrical_panels: 1, projectors: 1 }, commonIssues: ["hvac"] },
  { id: "GOR-110", label: "110", type: "classroom", x: 750, y: 400, width: 130, height: 100, floor: "1",
    capacity: 35, description: "General classroom, south wing", equipment: { hvac_units: 2, electrical_panels: 1 }, commonIssues: ["hvac"] },
  { id: "GOR-111", label: "111", type: "office", x: 20, y: 400, width: 120, height: 100, floor: "1",
    capacity: 4, description: "CTA reception & info desk", equipment: { hvac_units: 1, electrical_panels: 1 }, commonIssues: ["hvac"] },
  { id: "GOR-112", label: "112", type: "office", x: 150, y: 400, width: 100, height: 100, floor: "1",
    capacity: 2, description: "CTA staff office", equipment: { hvac_units: 1 }, commonIssues: ["hvac"] },
  { id: "GOR-113", label: "113", type: "utility", x: 260, y: 400, width: 90, height: 100, floor: "1",
    description: "Mechanical / electrical room", equipment: { hvac_units: 0, electrical_panels: 4, description: "Main electrical panel, HVAC controls" }, commonIssues: ["electrical", "hvac"] },
  { id: "GOR-114", label: "114", type: "classroom", x: 20, y: 230, width: 160, height: 110, floor: "1",
    capacity: 60, description: "Tiered case-study classroom with full A/V", equipment: { hvac_units: 4, electrical_panels: 2, projectors: 1, description: "4 ceiling HVAC vents, tiered seating, ceiling projector, surround audio" }, commonIssues: ["hvac", "electrical"] },
  { id: "GOR-1WC", label: "WC", type: "restroom", x: 190, y: 230, width: 80, height: 60, floor: "1",
    description: "First floor restrooms", equipment: { plumbing_fixtures: 6, description: "3 sinks, 3 toilets" }, commonIssues: ["plumbing"] },
  { id: "GOR-1ST", label: "Stairs", type: "stairwell", x: 190, y: 300, width: 80, height: 60, floor: "1" },

  // ─── Floor 2 ───
  { id: "GOR-201", label: "201", type: "classroom", x: 20, y: 20, width: 160, height: 100, floor: "2",
    capacity: 40, description: "General classroom, north wing", equipment: { hvac_units: 2, electrical_panels: 1, projectors: 1 }, commonIssues: ["hvac"] },
  { id: "GOR-202", label: "202", type: "classroom", x: 190, y: 20, width: 160, height: 100, floor: "2",
    capacity: 40, description: "General classroom, north wing", equipment: { hvac_units: 2, electrical_panels: 1, projectors: 1 }, commonIssues: ["hvac"] },
  { id: "GOR-203", label: "203", type: "classroom", x: 20, y: 130, width: 160, height: 90, floor: "2",
    capacity: 35, description: "General classroom, north wing", equipment: { hvac_units: 2, electrical_panels: 1, projectors: 1 }, commonIssues: ["hvac"] },
  { id: "GOR-204", label: "204", type: "seminar", x: 190, y: 130, width: 160, height: 90, floor: "2",
    capacity: 20, description: "Seminar room, north wing", equipment: { hvac_units: 1, electrical_panels: 1, projectors: 1 }, commonIssues: ["hvac"] },
  { id: "GOR-205", label: "205", type: "classroom", x: 580, y: 20, width: 160, height: 100, floor: "2",
    capacity: 40, description: "General classroom, south wing", equipment: { hvac_units: 2, electrical_panels: 1, projectors: 1 }, commonIssues: ["hvac"] },
  { id: "GOR-206", label: "206", type: "classroom", x: 750, y: 20, width: 130, height: 100, floor: "2",
    capacity: 35, description: "General classroom, south wing", equipment: { hvac_units: 2, electrical_panels: 1, projectors: 1 }, commonIssues: ["hvac", "electrical"] },
  { id: "GOR-207", label: "207", type: "classroom", x: 580, y: 130, width: 145, height: 90, floor: "2",
    capacity: 55, description: "Tiered case-study room", equipment: { hvac_units: 3, electrical_panels: 2, projectors: 1, description: "Tiered seating, A/V system, 3 HVAC vents" }, commonIssues: ["hvac", "electrical"] },
  { id: "GOR-208", label: "208", type: "office", x: 735, y: 130, width: 145, height: 90, floor: "2",
    capacity: 6, description: "Faculty office suite", equipment: { hvac_units: 1, electrical_panels: 1 }, commonIssues: ["hvac"] },
  { id: "GOR-209", label: "209", type: "classroom", x: 580, y: 400, width: 160, height: 100, floor: "2",
    capacity: 35, description: "General classroom, south wing", equipment: { hvac_units: 2, electrical_panels: 1, projectors: 1 }, commonIssues: ["hvac"] },
  { id: "GOR-210", label: "210", type: "office", x: 750, y: 400, width: 130, height: 100, floor: "2",
    capacity: 2, description: "Faculty office", equipment: { hvac_units: 1 }, commonIssues: ["hvac"] },
  { id: "GOR-211", label: "211", type: "office", x: 20, y: 400, width: 120, height: 100, floor: "2",
    capacity: 2, description: "Faculty office", equipment: { hvac_units: 1 }, commonIssues: ["hvac"] },
  { id: "GOR-217", label: "217", type: "classroom", x: 150, y: 400, width: 200, height: 100, floor: "2",
    capacity: 30, description: "Problem-based learning classroom", equipment: { hvac_units: 2, electrical_panels: 1, projectors: 1, description: "Modular furniture, group displays, PBL-optimized" }, commonIssues: ["hvac", "electrical"] },
  { id: "GOR-2WC", label: "WC", type: "restroom", x: 190, y: 230, width: 80, height: 60, floor: "2",
    equipment: { plumbing_fixtures: 6 }, commonIssues: ["plumbing"] },
  { id: "GOR-2ST", label: "Stairs", type: "stairwell", x: 190, y: 300, width: 80, height: 60, floor: "2" },

  // ─── Floor 3 ───
  { id: "GOR-301", label: "301", type: "classroom", x: 20, y: 20, width: 160, height: 100, floor: "3",
    capacity: 40, description: "General classroom, north wing", equipment: { hvac_units: 2, electrical_panels: 1, projectors: 1 }, commonIssues: ["hvac"] },
  { id: "GOR-302", label: "302", type: "classroom", x: 190, y: 20, width: 160, height: 100, floor: "3",
    capacity: 35, description: "General classroom, north wing", equipment: { hvac_units: 2, electrical_panels: 1, projectors: 1 }, commonIssues: ["hvac"] },
  { id: "GOR-303", label: "303", type: "seminar", x: 20, y: 130, width: 160, height: 90, floor: "3",
    capacity: 20, description: "Seminar room, north wing", equipment: { hvac_units: 1, electrical_panels: 1, projectors: 1 }, commonIssues: ["hvac"] },
  { id: "GOR-304", label: "304", type: "seminar", x: 190, y: 130, width: 160, height: 90, floor: "3",
    capacity: 18, description: "Seminar room, north wing", equipment: { hvac_units: 1, electrical_panels: 1, projectors: 1 }, commonIssues: ["hvac"] },
  { id: "GOR-305", label: "305", type: "classroom", x: 580, y: 20, width: 160, height: 100, floor: "3",
    capacity: 40, description: "General classroom, south wing", equipment: { hvac_units: 2, electrical_panels: 1, projectors: 1 }, commonIssues: ["hvac"] },
  { id: "GOR-306", label: "306", type: "office", x: 750, y: 20, width: 130, height: 100, floor: "3",
    capacity: 3, description: "CTA Director office", equipment: { hvac_units: 1, electrical_panels: 1 }, commonIssues: ["hvac"] },
  { id: "GOR-307", label: "307", type: "office", x: 580, y: 130, width: 145, height: 90, floor: "3",
    capacity: 8, description: "CTA office suite", equipment: { hvac_units: 2, electrical_panels: 1 }, commonIssues: ["hvac"] },
  { id: "GOR-318", label: "318", type: "classroom", x: 735, y: 130, width: 145, height: 90, floor: "3",
    capacity: 50, description: "Tiered case-study classroom", equipment: { hvac_units: 3, electrical_panels: 2, projectors: 1, description: "Tiered seating, ceiling projector, audio system" }, commonIssues: ["hvac", "electrical"] },
  { id: "GOR-309", label: "309", type: "utility", x: 580, y: 400, width: 130, height: 100, floor: "3",
    description: "HVAC mechanical room", equipment: { hvac_units: 0, electrical_panels: 3, description: "Rooftop HVAC controls, exhaust fans" }, commonIssues: ["hvac", "electrical"] },
  { id: "GOR-310", label: "310", type: "office", x: 720, y: 400, width: 160, height: 100, floor: "3",
    capacity: 2, description: "Faculty office", equipment: { hvac_units: 1 }, commonIssues: ["hvac"] },
  { id: "GOR-311", label: "311", type: "utility", x: 20, y: 400, width: 100, height: 100, floor: "3",
    description: "Server / network closet", equipment: { electrical_panels: 2, hvac_units: 1, description: "Network switches, UPS, dedicated cooling" }, commonIssues: ["electrical", "hvac"] },
  { id: "GOR-312", label: "312", type: "office", x: 130, y: 400, width: 120, height: 100, floor: "3",
    capacity: 2, description: "Faculty office", equipment: { hvac_units: 1 }, commonIssues: ["hvac"] },
  { id: "GOR-3WC", label: "WC", type: "restroom", x: 190, y: 230, width: 80, height: 60, floor: "3",
    equipment: { plumbing_fixtures: 6 }, commonIssues: ["plumbing"] },
  { id: "GOR-3ST", label: "Stairs", type: "stairwell", x: 190, y: 300, width: 80, height: 60, floor: "3" },
];

const GORE_HALL_HALLWAYS: FloorPlanHallway[] = [
  // North-south corridor (left side)
  { id: "GOR-H1", x: 360, y: 20, width: 30, height: 480 },
  // East-west corridors
  { id: "GOR-H2", x: 20, y: 230, width: 170, height: 25 },
  { id: "GOR-H3", x: 580, y: 230, width: 300, height: 25 },
  // Cross corridors
  { id: "GOR-H4", x: 270, y: 230, width: 90, height: 25 },
  { id: "GOR-H5", x: 390, y: 230, width: 190, height: 25 },
];

// ============================================================
// SMITH HALL — 1970s brutalist, "maze-like" layout
// 4 large lecture halls (largest on campus), Starbucks
// Lower level: computing labs, IT support
// Bridge to Gore Hall, complex hallway system
// ============================================================

const SMITH_HALL_ROOMS: FloorPlanRoom[] = [
  // ─── Lower Level (LL) ───
  { id: "SMI-002", label: "002", type: "lab", x: 20, y: 20, width: 200, height: 130, floor: "LL",
    capacity: 30, description: "Computing lab — 30 Dell workstations", equipment: { hvac_units: 2, electrical_panels: 3, computers: 30, description: "30 workstations, 2 ceiling HVAC vents, 3 electrical panels" }, commonIssues: ["electrical", "hvac"] },
  { id: "SMI-004", label: "004", type: "lab", x: 230, y: 20, width: 200, height: 130, floor: "LL",
    capacity: 30, description: "Computing lab — 30 workstations", equipment: { hvac_units: 2, electrical_panels: 2, computers: 30 }, commonIssues: ["electrical", "hvac"] },
  { id: "SMI-006", label: "006", type: "lab", x: 20, y: 170, width: 200, height: 120, floor: "LL",
    capacity: 25, description: "Computing lab — 25 workstations", equipment: { hvac_units: 2, electrical_panels: 2, computers: 25 }, commonIssues: ["electrical", "hvac"] },
  { id: "SMI-040", label: "040", type: "lab", x: 230, y: 170, width: 280, height: 120, floor: "LL",
    capacity: 50, description: "Large computing lab — 50 workstations", equipment: { hvac_units: 4, electrical_panels: 4, computers: 50, description: "50 workstations, server rack, dedicated cooling" }, commonIssues: ["electrical", "hvac"] },
  { id: "SMI-010", label: "010", type: "utility", x: 520, y: 20, width: 120, height: 100, floor: "LL",
    description: "Server room — campus IT infrastructure", equipment: { hvac_units: 2, electrical_panels: 6, description: "Server racks, UPS, dedicated HVAC" }, commonIssues: ["electrical", "hvac"] },
  { id: "SMI-002A", label: "002A", type: "office", x: 520, y: 130, width: 120, height: 80, floor: "LL",
    capacity: 4, description: "IT help desk & demo area", equipment: { hvac_units: 1 }, commonIssues: ["electrical"] },
  { id: "SMI-LLWC", label: "WC", type: "restroom", x: 650, y: 20, width: 100, height: 70, floor: "LL",
    equipment: { plumbing_fixtures: 4 }, commonIssues: ["plumbing"] },
  { id: "SMI-LLST", label: "Stairs", type: "stairwell", x: 650, y: 220, width: 100, height: 70, floor: "LL" },

  // ─── Floor 1 ───
  { id: "SMI-120", label: "120", type: "lecture-hall", x: 20, y: 20, width: 340, height: 160, floor: "1",
    capacity: 250, description: "Large lecture hall — largest at UDel", equipment: { hvac_units: 8, electrical_panels: 3, projectors: 1, description: "8 HVAC vents, tiered 250-seat, dual projection, surround audio" }, commonIssues: ["hvac", "electrical"] },
  { id: "SMI-130", label: "130", type: "lecture-hall", x: 20, y: 200, width: 340, height: 150, floor: "1",
    capacity: 200, description: "Large lecture hall", equipment: { hvac_units: 6, electrical_panels: 2, projectors: 1, description: "6 HVAC vents, tiered 200-seat, projection system" }, commonIssues: ["hvac", "electrical"] },
  { id: "SMI-140", label: "140", type: "lecture-hall", x: 420, y: 20, width: 220, height: 130, floor: "1",
    capacity: 150, description: "Lecture hall, east wing", equipment: { hvac_units: 4, electrical_panels: 2, projectors: 1 }, commonIssues: ["hvac"] },
  { id: "SMI-150", label: "150", type: "lecture-hall", x: 420, y: 170, width: 220, height: 110, floor: "1",
    capacity: 120, description: "Lecture hall, east wing", equipment: { hvac_units: 4, electrical_panels: 2, projectors: 1 }, commonIssues: ["hvac"] },
  { id: "SMI-SBX", label: "Starbucks", type: "cafe", x: 420, y: 300, width: 220, height: 100, floor: "1",
    capacity: 30, description: "Starbucks — student cafe", equipment: { hvac_units: 2, plumbing_fixtures: 4, electrical_panels: 2, description: "Espresso machines, sinks, refrigeration, HVAC" }, commonIssues: ["plumbing", "electrical"] },
  { id: "SMI-BRG", label: "Bridge", type: "hallway", x: 650, y: 80, width: 130, height: 40, floor: "1",
    description: "Enclosed bridge connecting to Gore Hall" },
  { id: "SMI-1WC", label: "WC", type: "restroom", x: 650, y: 200, width: 120, height: 70, floor: "1",
    equipment: { plumbing_fixtures: 8, description: "4 sinks, 4 toilets/urinals" }, commonIssues: ["plumbing"] },
  { id: "SMI-1ST", label: "Stairs", type: "stairwell", x: 650, y: 300, width: 120, height: 80, floor: "1" },

  // ─── Floor 2 ───
  { id: "SMI-220", label: "220", type: "classroom", x: 20, y: 20, width: 170, height: 130, floor: "2",
    capacity: 40, description: "Classroom, west wing", equipment: { hvac_units: 2, electrical_panels: 1, projectors: 1 }, commonIssues: ["hvac"] },
  { id: "SMI-221", label: "221", type: "classroom", x: 200, y: 20, width: 160, height: 130, floor: "2",
    capacity: 35, description: "Classroom, west wing", equipment: { hvac_units: 2, electrical_panels: 1, projectors: 1 }, commonIssues: ["hvac"] },
  { id: "SMI-222", label: "222", type: "classroom", x: 20, y: 170, width: 130, height: 110, floor: "2",
    capacity: 30, description: "Classroom, west wing", equipment: { hvac_units: 2, electrical_panels: 1, projectors: 1 }, commonIssues: ["hvac"] },
  { id: "SMI-230", label: "230", type: "classroom", x: 160, y: 170, width: 200, height: 110, floor: "2",
    capacity: 40, description: "Classroom, central", equipment: { hvac_units: 2, electrical_panels: 1, projectors: 1 }, commonIssues: ["hvac"] },
  { id: "SMI-231", label: "231", type: "seminar", x: 20, y: 300, width: 170, height: 100, floor: "2",
    capacity: 20, description: "Seminar room", equipment: { hvac_units: 1, electrical_panels: 1, projectors: 1 }, commonIssues: ["hvac"] },
  { id: "SMI-240", label: "240", type: "classroom", x: 420, y: 20, width: 190, height: 120, floor: "2",
    capacity: 35, description: "Classroom, east wing", equipment: { hvac_units: 2, electrical_panels: 1, projectors: 1 }, commonIssues: ["hvac"] },
  { id: "SMI-241", label: "241", type: "office", x: 420, y: 160, width: 190, height: 100, floor: "2",
    capacity: 4, description: "Department office", equipment: { hvac_units: 1, electrical_panels: 1 }, commonIssues: ["hvac"] },
  { id: "SMI-242", label: "242", type: "office", x: 420, y: 280, width: 100, height: 90, floor: "2",
    capacity: 2, description: "Faculty office", equipment: { hvac_units: 1 }, commonIssues: ["hvac"] },
  { id: "SMI-243", label: "243", type: "office", x: 530, y: 280, width: 80, height: 90, floor: "2",
    capacity: 2, description: "Faculty office", equipment: { hvac_units: 1 }, commonIssues: ["hvac"] },
  { id: "SMI-2WC", label: "WC", type: "restroom", x: 650, y: 200, width: 120, height: 60, floor: "2",
    equipment: { plumbing_fixtures: 6 }, commonIssues: ["plumbing"] },
  { id: "SMI-2ST", label: "Stairs", type: "stairwell", x: 650, y: 300, width: 120, height: 80, floor: "2" },

  // ─── Floor 3 ───
  { id: "SMI-320", label: "320", type: "office", x: 20, y: 20, width: 170, height: 130, floor: "3",
    capacity: 4, description: "Department office suite", equipment: { hvac_units: 1, electrical_panels: 1 }, commonIssues: ["hvac"] },
  { id: "SMI-321", label: "321", type: "office", x: 200, y: 20, width: 160, height: 130, floor: "3",
    capacity: 3, description: "Faculty office", equipment: { hvac_units: 1 }, commonIssues: ["hvac"] },
  { id: "SMI-330", label: "330", type: "office", x: 20, y: 170, width: 170, height: 110, floor: "3",
    capacity: 2, description: "Faculty office", equipment: { hvac_units: 1 }, commonIssues: ["hvac"] },
  { id: "SMI-331", label: "331", type: "utility", x: 200, y: 170, width: 160, height: 110, floor: "3",
    description: "HVAC mechanical room", equipment: { hvac_units: 0, electrical_panels: 4, description: "Central HVAC control, air handling units" }, commonIssues: ["hvac", "electrical"] },
  { id: "SMI-340", label: "340", type: "office", x: 420, y: 20, width: 190, height: 120, floor: "3",
    capacity: 4, description: "Department office", equipment: { hvac_units: 1, electrical_panels: 1 }, commonIssues: ["hvac"] },
  { id: "SMI-341", label: "341", type: "utility", x: 420, y: 160, width: 190, height: 100, floor: "3",
    description: "Electrical distribution room", equipment: { electrical_panels: 6, description: "Main floor distribution panels, breaker boxes" }, commonIssues: ["electrical"] },
  { id: "SMI-342", label: "342", type: "office", x: 420, y: 280, width: 190, height: 90, floor: "3",
    capacity: 3, description: "Faculty office", equipment: { hvac_units: 1 }, commonIssues: ["hvac"] },
  { id: "SMI-3WC", label: "WC", type: "restroom", x: 650, y: 200, width: 120, height: 60, floor: "3",
    equipment: { plumbing_fixtures: 6 }, commonIssues: ["plumbing"] },
  { id: "SMI-3ST", label: "Stairs", type: "stairwell", x: 650, y: 300, width: 120, height: 80, floor: "3" },
];

const SMITH_HALL_HALLWAYS: FloorPlanHallway[] = [
  // Main vertical corridor
  { id: "SMI-H1", x: 370, y: 20, width: 40, height: 380 },
  // East corridor
  { id: "SMI-H2", x: 620, y: 20, width: 22, height: 380 },
  // Cross corridors (maze-like)
  { id: "SMI-H3", x: 200, y: 300, width: 170, height: 20 },
  { id: "SMI-H4", x: 420, y: 140, width: 200, height: 18 },
  { id: "SMI-H5", x: 160, y: 155, width: 210, height: 15 },
];

export const GORE_HALL: BuildingFloorPlan = {
  building: "Gore Hall",
  floors: ["1", "2", "3"],
  svgViewBox: "0 0 900 520",
  rooms: GORE_HALL_ROOMS,
  hallways: GORE_HALL_HALLWAYS,
  groundElevation: 25,
  floorHeight: 4.2,
};

export const SMITH_HALL: BuildingFloorPlan = {
  building: "Smith Hall",
  floors: ["LL", "1", "2", "3"],
  svgViewBox: "0 0 790 420",
  rooms: SMITH_HALL_ROOMS,
  hallways: SMITH_HALL_HALLWAYS,
  groundElevation: 24,
  floorHeight: 4.2,
};

export const FLOOR_PLANS: Record<string, BuildingFloorPlan> = {
  "Gore Hall": GORE_HALL,
  "Smith Hall": SMITH_HALL,
};

export function hasFloorPlan(building: string): boolean {
  return building in FLOOR_PLANS;
}

export function getFloorPlan(building: string): BuildingFloorPlan | null {
  return FLOOR_PLANS[building] || null;
}

export const ROOM_TYPE_COLORS: Record<string, string> = {
  classroom: "rgba(255,255,255,0.15)",
  seminar: "rgba(255,255,255,0.12)",
  "lecture-hall": "rgba(255,255,255,0.10)",
  office: "rgba(255,255,255,0.08)",
  restroom: "rgba(255,255,255,0.06)",
  utility: "rgba(255,255,255,0.05)",
  common: "rgba(255,255,255,0.07)",
  hallway: "rgba(255,255,255,0.03)",
  stairwell: "rgba(255,255,255,0.05)",
  lab: "rgba(147,197,253,0.15)",
  cafe: "rgba(139,92,55,0.12)",
};
