export type Trade =
  | "plumbing"
  | "electrical"
  | "hvac"
  | "structural"
  | "custodial"
  | "landscaping"
  | "safety_hazard";

export type Priority = "critical" | "high" | "medium" | "low";

export type ReportStatus =
  | "submitted"
  | "analyzing"
  | "dispatched"
  | "in_progress"
  | "resolved";

export type SafetyRisk =
  | "slip_fall"
  | "fire_hazard"
  | "electrical_shock"
  | "structural_failure"
  | "water_damage"
  | "air_quality"
  | "security_vulnerability"
  | "chemical_exposure"
  | "none";

export interface AIAnalysis {
  trade: Trade;
  priority: Priority;
  description: string;
  suggested_action: string;
  safety_concern: boolean;
  estimated_cost: string;
  estimated_time: string;
  confidence_score: number;
  // Safety intelligence fields
  safety_risks?: SafetyRisk[];
  safety_score?: number; // 0-10
  affected_population?: "high_traffic" | "residential" | "laboratory" | "office" | "common_area";
  risk_escalation?: string; // what happens if not fixed
}

export interface Report {
  id: string;
  created_at: string;
  updated_at: string;

  // Location
  building: string;
  room: string;
  floor: string;
  latitude: number | null;
  longitude: number | null;

  // Issue details
  description: string;
  photo_url: string | null;
  photo_base64: string | null;

  // AI analysis
  trade: Trade;
  priority: Priority;
  ai_description: string;
  suggested_action: string;
  safety_concern: boolean;
  estimated_cost: string;
  estimated_time: string;
  confidence_score: number;

  // Status
  status: ReportStatus;
  urgency_score: number;
  upvote_count: number;
  duplicate_of: string | null;

  // Dispatch
  dispatched_to: string | null;
  dispatched_at: string | null;
  email_sent: boolean;

  // Reporter
  reporter_email: string | null;
  reporter_name: string | null;
}

export interface SubmitReportPayload {
  building: string;
  room: string;
  floor: string;
  latitude?: number;
  longitude?: number;
  description: string;
  photo_base64: string;
  reporter_email?: string;
  reporter_name?: string;
  ai_analysis: AIAnalysis;
  anonymous?: boolean;
}

// Auth
export type UserRole = "manager" | "technician" | "user";

export interface AuthPin {
  id: string;
  email: string;
  role: UserRole;
  pin_hash: string;
  created_at: string;
  expires_at: string;
}

export interface Session {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  expires_at: string;
}

// Technicians
export interface Technician {
  id: string;
  created_at: string;
  name: string;
  email: string;
  trade: Trade;
  assigned_buildings: string[];
  is_available: boolean;
  current_location: string | null;
  phone: string | null;
}

// Assignments
export type AssignmentStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface Assignment {
  id: string;
  created_at: string;
  updated_at: string;
  report_id: string;
  technician_id: string;
  assigned_by: string;
  status: AssignmentStatus;
  notes: string | null;
  completion_notes: string | null;
  completion_photo_base64: string | null;
  started_at: string | null;
  completed_at: string | null;
  estimated_arrival: string | null;
  // Joined data
  report?: Report;
  technician?: Technician;
}

// AI Activity Feed
export interface AIActivity {
  id: string;
  timestamp: string;
  type: "assign" | "analyze" | "escalate" | "pattern" | "error";
  message: string;
  details?: string;
  reportId?: string;
  technicianName?: string;
}

// Floor Plans
export interface RoomEquipment {
  hvac_units?: number;
  plumbing_fixtures?: number;
  electrical_panels?: number;
  fire_extinguishers?: number;
  projectors?: number;
  computers?: number;
  description?: string;
}

export interface FloorPlanRoom {
  id: string;
  label: string;
  type:
    | "classroom"
    | "seminar"
    | "lecture-hall"
    | "office"
    | "restroom"
    | "utility"
    | "common"
    | "hallway"
    | "stairwell"
    | "lab"
    | "cafe";
  x: number;
  y: number;
  width: number;
  height: number;
  floor: string;
  capacity?: number;
  equipment?: RoomEquipment;
  description?: string;
  commonIssues?: string[];
}

export interface FloorPlanHallway {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BuildingFloorPlan {
  building: string;
  floors: string[];
  svgViewBox: string;
  rooms: FloorPlanRoom[];
  hallways: FloorPlanHallway[];
  groundElevation?: number;
  floorHeight?: number;
}
