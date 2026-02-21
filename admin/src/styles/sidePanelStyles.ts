/**
 * Shared Tailwind class constants for side-panel field renderers.
 *
 * Usage:
 *   import { sp } from '../styles/sidePanelStyles';
 *   <div className={sp.card.container}> ... </div>
 *
 * All values are plain strings – no runtime cost, just consistency.
 *
 * Tailwind: This file must be in tailwind.config.js "content" (e.g. ./src/styles/ folder)
 * so these class names are scanned and included in the built CSS. Restart dev server after config changes.
 */

/* ── Collapsible card containers ─────────────────────────── */
export const card = {
  /** Outer wrapper for a collapsible card with clipping. */
  container: 'border rounded-lg overflow-hidden',
  /** Standard list-style card (no overflow-hidden). */
  list: 'bg-white border rounded-lg',
  /** Normal (non-alert) container colors. */
  normal: 'bg-white border-gray-200',
  /** Alert / "missing data" container colors. */
  alert: 'bg-red-50 border-red-300',
  /** Tree sub-item card (inside muscle/delta trees). */
  treeItem: 'rounded border bg-white',
  /** Tree sub-item card without bg (secondary level). */
  treeItemFlat: 'rounded border',
  /** Wrapper for an outlined section (e.g. "Add motion" dropdown area). */
  section: 'border rounded-lg bg-gray-50 p-3',
  /** Info/warning section (e.g. family plane assignments). */
  info: 'border rounded-lg bg-amber-50/50 overflow-hidden',
};

/* ── Card headers ────────────────────────────────────────── */
export const header = {
  /** Standard list-card header. */
  base: 'px-3 py-2 bg-gray-50 border-b flex items-center justify-between',
  /** Flexible header (allows wrapping children). */
  flex: 'px-3 py-2 border-b flex items-center gap-2 flex-wrap',
  /** When the card is expanded — add bottom border to headers that don't always have one. */
  expanded: 'border-b',
  /** Normal header background + border color. */
  normal: 'bg-gray-50 border-gray-200',
  /** Alert header background + border color. */
  alert: 'bg-red-50 border-red-300',
  /** Indigo-tinted header (e.g. primary motion root). */
  primary: 'bg-indigo-50',
  primaryCurrent: 'bg-indigo-100',
  /** Blue-tinted header (e.g. variation with focus). */
  variation: 'bg-gray-50',
  variationCurrent: 'bg-blue-100',
  /** Amber header (e.g. orphan / warning). */
  amber: 'bg-amber-50',
};

/* ── Expand / collapse toggle buttons ────────────────────── */
export const toggle = {
  /** Standard toggle — text-xs, 4-wide. */
  base: 'text-xs text-gray-500 w-4 flex-shrink-0 hover:text-gray-700',
  /** Small toggle — text-[10px], 3-wide (used inside tree rows). */
  small: 'text-[10px] text-gray-500 w-3',
};

/* ── Score / number inputs ───────────────────────────────── */
export const scoreInput = {
  /** Editable score field. */
  editable: [
    'w-14 px-1 py-0.5 border rounded text-xs text-center',
    'focus:outline-none focus:ring-1 focus:ring-blue-500',
    '[appearance:textfield]',
    '[&::-webkit-outer-spin-button]:appearance-none',
    '[&::-webkit-inner-spin-button]:appearance-none',
  ].join(' '),
  /** Computed (auto-summed) score — read-only, italic. */
  computed: 'text-xs font-mono px-1 py-0.5 rounded bg-gray-100 text-gray-500 italic',
  /** Read-only score — no background. */
  readOnly: 'text-xs font-mono px-1 py-0.5 rounded text-gray-500',
};

/* ── Remove (×) buttons ──────────────────────────────────── */
export const removeBtn = {
  /** Small × inside tree rows. */
  small: 'ml-auto text-[10px] text-red-400 hover:text-red-600',
  /** × on a card header (with left margin + flex-shrink). */
  card: 'ml-2 text-[10px] text-red-400 hover:text-red-600 flex-shrink-0',
  /** Larger remove/delete button with text (e.g. "Remove Motion"). */
  text: 'text-xs text-red-600 hover:text-red-800 px-2 py-1 hover:bg-red-50 rounded',
  /** Text remove button with left margin. */
  textMl: 'text-xs text-red-600 hover:text-red-800 px-2 py-1 hover:bg-red-50 rounded ml-2',
};

/* ── Add-item dropdowns (+ secondary..., + muscle...) ────── */
export const addDropdown = {
  /** Small inline dropdown inside a tree (red-themed). */
  tree: [
    'text-[10px] px-1 py-0.5 border border-red-300 rounded text-red-500',
    'focus:outline-none focus:ring-1 focus:ring-red-500',
  ].join(' '),
  /** Small inline dropdown (blue-themed, e.g. "Add Variation"). */
  treeBlue: [
    'px-1 py-0.5 border border-blue-300 rounded text-[10px] text-blue-500',
    'focus:ring-1 focus:ring-blue-500 focus:outline-none',
  ].join(' '),
  /** Full-width block dropdown (blue-themed, e.g. "Add Motion Plane"). */
  block: [
    'w-full px-2 py-1.5 border border-blue-300 rounded-lg text-xs text-blue-600',
    'bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer',
  ].join(' '),
  /** Full-width block dropdown (neutral, e.g. "Add Motion"). */
  blockNeutral: [
    'w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-700 bg-white',
    'focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500',
  ].join(' '),
  /** Full-width block dropdown (standard form-style). */
  blockForm: 'w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none',
};

/* ── Badges ──────────────────────────────────────────────── */
export const badge = {
  /** Small informational badge (e.g. "Default"). */
  info: 'text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium flex-shrink-0',
  /** Set-default button styled as a badge outline. */
  outline: [
    'text-[10px] px-1.5 py-0.5 border border-gray-300 text-gray-500 rounded',
    'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 flex-shrink-0',
  ].join(' '),
  /** Muscle-targets / delta toggle badge (normal state). */
  toggle: 'flex items-center gap-1 cursor-pointer bg-red-50/60 hover:bg-red-100/80 rounded px-1.5 py-0.5 flex-shrink-0',
  /** Toggle badge text. */
  toggleLabel: 'text-[10px] font-bold text-red-800 flex-shrink-0',
  /** Toggle badge arrow/indicator. */
  toggleArrow: 'text-[10px] text-red-600/70 w-3 flex-shrink-0',
};

/* ── Tooltip portals ─────────────────────────────────────── */
export const tooltip = {
  /** Dark tooltip container (used with createPortal + fixed positioning). */
  container: 'fixed z-[100] bg-gray-900 text-white text-xs rounded px-3 py-2 shadow-xl border border-gray-700 pointer-events-none',
  /** Tooltip section header. */
  header: 'font-semibold mb-1',
};

/* ── Tree rows (muscle hierarchy / delta tree) ───────────── */
export const treeRow = {
  /** Primary-level row background. */
  primary: 'flex items-center gap-1.5 px-2 py-1 bg-red-50/60',
  /** Secondary-level row background. */
  secondary: 'flex items-center gap-1.5 px-2 py-0.5 bg-red-50/60',
  /** Tertiary-level row background. */
  tertiary: 'flex items-center gap-1.5 px-2 py-0.5 bg-red-50/60 rounded',
  /** Bullet icon for leaf nodes without children. */
  leafBullet: 'text-[8px] text-gray-400 w-3 flex items-center justify-center',
  /** Primary label styling. */
  primaryLabel: 'text-xs font-medium text-red-800',
  /** Secondary label styling. */
  secondaryLabel: 'text-xs text-red-800',
  /** Tertiary label styling. */
  tertiaryLabel: 'text-[11px] text-red-800',
};

/* ── Nested containers inside expanded tree cards ────────── */
export const treeNest = {
  /** Container for secondaries under a primary. */
  secondaries: 'pl-4 pr-2 py-1 space-y-1',
  /** Container for tertiaries under a secondary. */
  tertiaries: 'pl-4 pr-2 py-0.5 space-y-0.5',
  /** Container for variation cards under a primary motion. */
  variations: 'pl-4 pr-2 py-2 space-y-2',
};

/* ── Expanded muscle tree content areas ──────────────────── */
export const muscleTreeBg = {
  /** Background for expanded muscle targets (with border-b). */
  bordered: 'px-3 py-1 border-b bg-red-50',
  /** Background for expanded delta/muscle content (no border-b). */
  flat: 'px-3 py-2 bg-red-50',
};

/* ── ID / metadata labels ────────────────────────────────── */
export const meta = {
  /** Small gray ID label. */
  id: 'text-xs text-gray-400',
  /** Small gray arrow separator. */
  arrow: 'text-xs text-gray-400',
  /** Item count (e.g. "(3 tertiary)"). */
  count: 'text-xs text-gray-400 ml-auto',
};

/* ── Empty state / placeholder messages ──────────────────── */
export const emptyState = {
  /** Full empty-state box (border + background). */
  box: 'px-3 py-4 text-xs text-gray-400 italic text-center border rounded-lg bg-gray-50',
  /** Inline empty-state text (no border). */
  inline: 'px-2 py-2 text-xs text-gray-400 italic text-center',
  /** Minimal empty state. */
  text: 'text-xs text-gray-400 py-2 italic',
};

/* ── Loading indicator ───────────────────────────────────── */
export const loading = 'text-xs text-gray-400 py-2';

/* ── Link styles ─────────────────────────────────────────── */
export const link = {
  /** Standard blue link. */
  primary: 'text-sm font-medium text-blue-600 hover:underline',
  /** Small link. */
  small: 'text-sm text-blue-600 hover:underline text-left',
};

/* ── Motion plane card components ─────────────────────────── */
export const motionPlane = {
  /** Plane card container - base styles. */
  card: 'motion-plane-card',
  /** Plane card — normal state colors. */
  cardNormal: 'motion-plane-card-normal',
  /** Plane card — alert state (no deltas). */
  cardAlert: 'motion-plane-card-alert',

  /** Plane card header - base styles. */
  header: 'motion-plane-header',
  /** Plane card header — expanded state (shows border-b). */
  headerExpanded: 'motion-plane-header-expanded',
  /** Plane card header — normal state colors. */
  headerNormal: 'motion-plane-header-normal',
  /** Plane card header — alert state colors. */
  headerAlert: 'motion-plane-header-alert',

  /** Plane card label text. */
  label: 'motion-plane-label',
  /** Plane card label — normal state color. */
  labelNormal: 'motion-plane-label-normal',
  /** Plane card label — alert state color. */
  labelAlert: 'motion-plane-label-alert',

  /** Toggle button for expand/collapse. */
  toggle: 'motion-plane-toggle',

  /** DeltaBadge outer wrapper. */
  deltaBadge: 'motion-plane-delta-badge',
  /** DeltaBadge — alert colors (no deltas). */
  deltaBadgeAlert: 'motion-plane-delta-badge-alert',
  /** DeltaBadge — normal colors. */
  deltaBadgeNormal: 'motion-plane-delta-badge-normal',
  /** DeltaBadge label text. */
  deltaBadgeLabel: 'motion-plane-delta-badge-label',
  /** DeltaBadge arrow indicator. */
  deltaBadgeArrow: 'motion-plane-delta-badge-arrow',

  /** Remove button (×) on card header. */
  removeBtn: 'motion-plane-remove-btn',

  /** Expanded content area (delta tree). */
  expandedContent: 'motion-plane-expanded-content',

  /** Family info container. */
  familyContainer: 'motion-plane-family-container',
  /** Family info header. */
  familyHeader: 'motion-plane-family-header',
  /** Family info toggle arrow. */
  familyToggle: 'motion-plane-family-toggle',
  /** Family info section title. */
  familyTitle: 'motion-plane-family-title',
  /** Family info count badge. */
  familyCount: 'motion-plane-family-count',
  /** Family info expanded body. */
  familyBody: 'motion-plane-family-body',
  /** Family info row (one plane entry). */
  familyRow: 'motion-plane-family-row',
  /** Family info — assigned plane label. */
  familyPlaneLabel: 'motion-plane-family-plane-label',
  /** Family info — unassigned / disabled plane label. */
  familyPlaneDisabled: 'motion-plane-family-plane-disabled',
  /** Family info — clickable motion link. */
  familyLink: 'motion-plane-family-link',
  /** Family info — reassign/assign dropdown. */
  familyReassign: 'motion-plane-family-reassign',
};

/** Convenience re-export for shorter imports: `import { sp } from '...'` */
export const sp = {
  card,
  header,
  toggle,
  scoreInput,
  removeBtn,
  addDropdown,
  badge,
  tooltip,
  treeRow,
  treeNest,
  muscleTreeBg,
  meta,
  emptyState,
  loading,
  link,
  motionPlane,
};

// Runtime check: ensure sp is defined
if (typeof window !== 'undefined') {
  (window as any).__sp_debug = sp;
}

export default sp;
