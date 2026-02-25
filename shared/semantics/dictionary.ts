/**
 * Semantics Dictionary
 *
 * Shared artifact defining per-modifier-table semantic descriptors,
 * coaching cue templates, joint action labels, and ROM descriptors.
 *
 * This is a foundation/stub that should be populated with real
 * biomechanics content over time. It is NOT stored in the database --
 * it lives as importable shared code.
 */

export interface ModifierSemantics {
  tableKey: string;
  label: string;
  description: string;
  jointActions?: string[];
  coachingCueTemplate?: string;
  romDescriptor?: "full" | "partial" | "lockout-bias" | "stretch-biased" | "variable";
}

export const MODIFIER_SEMANTICS: Record<string, ModifierSemantics> = {
  motionPaths: {
    tableKey: "motionPaths",
    label: "Motion Paths",
    description: "Trajectory arc the load follows relative to the body",
    jointActions: ["flexion", "extension", "abduction", "adduction"],
    romDescriptor: "variable",
  },
  torsoAngles: {
    tableKey: "torsoAngles",
    label: "Torso Angles",
    description: "Degree of torso incline/decline relative to gravity",
    jointActions: ["shoulder flexion angle shift"],
    coachingCueTemplate: "Set bench to {value} and maintain full back contact",
    romDescriptor: "full",
  },
  torsoOrientations: {
    tableKey: "torsoOrientations",
    label: "Torso Orientations",
    description: "Facing direction (prone, supine, seated, etc.)",
    romDescriptor: "full",
  },
  resistanceOrigin: {
    tableKey: "resistanceOrigin",
    label: "Resistance Origin",
    description: "Where resistance vector originates (e.g., cable height, band anchor)",
    jointActions: ["line of pull shift"],
    romDescriptor: "variable",
  },
  grips: {
    tableKey: "grips",
    label: "Grips",
    description: "Hand orientation on the implement",
    jointActions: ["forearm supination", "forearm pronation"],
    coachingCueTemplate: "Use a {value} grip throughout the movement",
    romDescriptor: "full",
  },
  gripWidths: {
    tableKey: "gripWidths",
    label: "Grip Widths",
    description: "Spacing between hands on the implement",
    jointActions: ["shoulder horizontal adduction range"],
    romDescriptor: "variable",
  },
  elbowRelationship: {
    tableKey: "elbowRelationship",
    label: "Elbow Relationship",
    description: "Elbow flare, tuck, or position relative to torso",
    jointActions: ["shoulder internal rotation", "shoulder external rotation"],
    romDescriptor: "partial",
  },
  executionStyles: {
    tableKey: "executionStyles",
    label: "Execution Styles",
    description: "Tempo, pause, or special execution variation",
    romDescriptor: "variable",
  },
  footPositions: {
    tableKey: "footPositions",
    label: "Foot Positions",
    description: "Foot placement on platform or floor",
    jointActions: ["hip flexion angle", "knee flexion angle"],
    romDescriptor: "variable",
  },
  stanceWidths: {
    tableKey: "stanceWidths",
    label: "Stance Widths",
    description: "Distance between feet during movement",
    jointActions: ["hip abduction", "hip adduction"],
    romDescriptor: "variable",
  },
  stanceTypes: {
    tableKey: "stanceTypes",
    label: "Stance Types",
    description: "Bilateral, unilateral, staggered, etc.",
    jointActions: ["stabilization demand"],
    romDescriptor: "full",
  },
  loadPlacement: {
    tableKey: "loadPlacement",
    label: "Load Placement",
    description: "Where the external load is positioned on the body",
    jointActions: ["moment arm shift"],
    romDescriptor: "full",
  },
  supportStructures: {
    tableKey: "supportStructures",
    label: "Support Structures",
    description: "External support used (bench, pad, wall, etc.)",
    romDescriptor: "partial",
  },
  loadingAids: {
    tableKey: "loadingAids",
    label: "Loading Aids",
    description: "Chains, bands, or accommodating resistance tools",
    romDescriptor: "variable",
  },
  rangeOfMotion: {
    tableKey: "rangeOfMotion",
    label: "Range of Motion",
    description: "Partial, full, or specific ROM prescription",
    romDescriptor: "variable",
  },
};

/**
 * Coaching cue examples per modifier table.
 * Stub: populate with real cues as biomechanics data is authored.
 */
export const COACHING_CUE_EXAMPLES: Record<string, Record<string, string[]>> = {
  grips: {
    PRONATED: ["Palms face away from you", "Knuckles point up"],
    SUPINATED: ["Palms face toward you", "Curl grip"],
    NEUTRAL: ["Palms face each other", "Hammer grip"],
  },
  torsoAngles: {
    DEG_0: ["Flat bench, back fully supported"],
    DEG_30: ["Low incline, slight press angle"],
    DEG_45: ["Standard incline setting"],
  },
};

/**
 * ROM quality labels
 */
export type RomQuality = "full" | "partial" | "lockout-bias" | "stretch-biased" | "variable";

export const ROM_QUALITY_LABELS: Record<RomQuality, string> = {
  full: "Full ROM",
  partial: "Partial ROM",
  "lockout-bias": "Lockout-Biased",
  "stretch-biased": "Stretch-Biased",
  variable: "Variable ROM",
};
