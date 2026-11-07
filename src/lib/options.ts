export const EQ_CATEGORIES = ["Pumps", "Electric motors", "Compressors", "Hydraulic systems", "CNC machines", "Conveyors", "Industrial robots", "Production equipment"];
export const EQ_STATUS = ["operational", "under_maintenance", "failure"];
export const LEVELS = ["low", "medium", "high", "critical"];
export const BD_STATUS = ["reported", "under_diagnosis", "in_progress", "waiting_for_parts", "resolved", "closed"];
export const BD_CATEGORIES = ["Mechanical", "Electrical", "Hydraulic", "Pneumatic", "Electronic", "Software", "Operator error"];
export const WO_STATUS = ["draft", "pending_approval", "scheduled", "in_progress", "waiting_parts", "awaiting_validation", "completed", "validated", "cancelled"];
export const WO_TYPES = ["corrective", "preventive", "improvement", "inspection"];
export const FREQ = [["daily", 1], ["weekly", 7], ["monthly", 30], ["quarterly", 90], ["annual", 365]] as const;
