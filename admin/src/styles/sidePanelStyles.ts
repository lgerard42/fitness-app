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
  /** Changed "after" score — bold, computed style. */
  changed: 'text-xs font-mono px-1 py-0.5 rounded bg-gray-100 text-gray-500 italic font-bold',
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
  bordered: 'px-0 py-0 border-b bg-red-50',
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
  primary: 'text-xs font-medium text-blue-600 hover:underline',
  /** Small link. */
  small: 'text-xs text-blue-600 hover:underline text-left',
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

/* ── Delta rules configurator components ────────────────────── */
export const deltaRules = {
  /** Outer container that holds all delta_rules cards and add-motion section. */
  container: 'delta-rules-container',
  /** Empty state when no motion rules are configured. */
  emptyState: 'delta-rules-empty-state',
  /** Empty state when a motion has no muscle modifications (inside expanded card). */
  emptyStateInline: 'delta-rules-empty-state-inline',
  /** Motion card container - base styles. */
  card: 'delta-rules-card',
  /** Motion card header - base styles. */
  header: 'delta-rules-header',
  /** Motion card header — expanded state (shows border-b). */
  headerExpanded: 'delta-rules-header-expanded',
  /** Motion card container — normal state colors. */
  cardNormal: 'delta-rules-card-normal',
  /** Motion card container — alert state (no deltas). */
  cardAlert: 'delta-rules-card-alert',
  /** Motion card header — normal state colors. */
  headerNormal: 'delta-rules-header-normal',
  /** Motion card header — alert state colors. */
  headerAlert: 'delta-rules-header-alert',
  /** Motion card label text. */
  label: 'delta-rules-label',
  /** Motion card label — normal state color. */
  labelNormal: 'delta-rules-label-normal',
  /** Motion card label — alert state color. */
  labelAlert: 'delta-rules-label-alert',
  /** Toggle button for expand/collapse. */
  toggle: 'delta-rules-toggle',
  /** Motion ID metadata text. */
  motionId: 'delta-rules-motion-id',
  /** DeltaBadge outer wrapper. */
  deltaBadge: 'delta-rules-delta-badge',
  /** DeltaBadge — alert colors (no deltas). */
  deltaBadgeAlert: 'delta-rules-delta-badge-alert',
  /** DeltaBadge — normal colors. */
  deltaBadgeNormal: 'delta-rules-delta-badge-normal',
  /** DeltaBadge label text. */
  deltaBadgeLabel: 'delta-rules-delta-badge-label',
  /** DeltaBadge arrow indicator. */
  deltaBadgeArrow: 'delta-rules-delta-badge-arrow',
  /** Remove motion button (×). */
  removeBtn: 'delta-rules-remove-btn',
  /** Expanded content area (muscle modifiers). */
  expandedContent: 'delta-rules-expanded-content',
  /** Wrapper for the list of muscle modifier rows. */
  muscleList: 'delta-rules-muscle-list',
  /** Muscle modifier row. */
  muscleRow: 'delta-rules-muscle-row',
  /** Muscle label text. */
  muscleLabel: 'delta-rules-muscle-label',
  /** Remove (×) button on a muscle row. */
  muscleRemoveBtn: 'delta-rules-muscle-remove-btn',
  /** Add muscle dropdown. */
  addMuscleDropdown: 'delta-rules-add-muscle-dropdown',
  /** Add motion section container. */
  addMotionSection: 'delta-rules-add-motion-section',
  /** Add motion dropdown. */
  addMotionDropdown: 'delta-rules-add-motion-dropdown',
  /** Add motion optgroup (section header). */
  addMotionOptgroup: 'delta-rules-add-motion-optgroup',
  /** Add motion option (individual motion). */
  addMotionOption: 'delta-rules-add-motion-option',
  /** Loading state text. */
  loading: 'delta-rules-loading',
  /** Empty state for ReadOnlyMuscleTree (no muscle targets). */
  emptyStateTree: 'delta-rules-empty-state-tree',
  /** Container for muscle tree (space-y-1). */
  treeContainer: 'delta-rules-tree-container',
  /** "Add" badge for new muscles. */
  addBadge: 'delta-rules-add-badge',
  /** Arrow separator (→). */
  arrowSeparator: 'delta-rules-arrow-separator',
  /** Header flex container (flex items-center gap-2 flex-1 min-w-0). */
  headerFlex: 'delta-rules-header-flex',
  /** Side-by-side flex container (flex gap-3). */
  scoresRow: 'delta-rules-scores-row',
  /** Side-by-side column (flex-1 min-w-0) - base/default style. */
  scoresColumn: 'delta-rules-scores-column',
  /** Side-by-side column (flex-1 min-w-0) - editable/delta modifiers. */
  scoresColumnEditable: 'delta-rules-scores-column-editable',
  /** Side-by-side column (flex-1 min-w-0) - read-only/base scores. */
  scoresColumnReadOnly: 'delta-rules-scores-column-read-only',
  /** Section label (e.g. "Delta Modifiers", "Base Muscle Scores"). */
  sectionLabel: 'delta-rules-section-label',
  /** Tooltip empty state text. */
  tooltipEmpty: 'delta-rules-tooltip-empty',
  /** Tooltip entries container. */
  tooltipEntries: 'delta-rules-tooltip-entries',
  /** Tooltip entry row. */
  tooltipEntryRow: 'delta-rules-tooltip-entry-row',
  /** Tooltip score (font-mono). */
  tooltipScore: 'delta-rules-tooltip-score',
};

/* ── Muscle hierarchy configurator components ───────────────── */
export const muscleHierarchy = {
  /** Outer container that holds all hierarchy cards. */
  container: 'muscle-hierarchy-container',
  /** Loading state text. */
  loading: 'muscle-hierarchy-loading',
  /** Hierarchy relationship card. */
  card: 'muscle-hierarchy-card',
  /** Card header. */
  header: 'muscle-hierarchy-header',
  /** Card header — expanded state (shows border-b). */
  headerExpanded: 'muscle-hierarchy-header-expanded',
  /** Current muscle label (bold). */
  label: 'muscle-hierarchy-label',
  /** Current muscle label when it's the current record. */
  currentLabel: 'muscle-hierarchy-current-label',
  /** Toggle button for expand/collapse. */
  toggle: 'muscle-hierarchy-toggle',
  /** Link to open another muscle. */
  link: 'muscle-hierarchy-link',
  /** Muscle ID metadata text. */
  muscleId: 'muscle-hierarchy-muscle-id',
  /** Arrow separator. */
  arrow: 'muscle-hierarchy-arrow',
  /** Count badge (e.g. "(3 tertiary)"). */
  count: 'muscle-hierarchy-count',
  /** Remove relationship button. */
  removeBtn: 'muscle-hierarchy-remove-btn',
  /** Expanded content area (shows nested tertiaries). */
  expandedContent: 'muscle-hierarchy-expanded-content',
  /** Tertiary muscle item row. */
  tertiaryItem: 'muscle-hierarchy-tertiary-item',
  /** Bullet icon for tertiary items. */
  tertiaryBullet: 'muscle-hierarchy-tertiary-bullet',
  /** Add relationship dropdown. */
  addDropdown: 'muscle-hierarchy-add-dropdown',
  /** Empty state text. */
  emptyState: 'muscle-hierarchy-empty-state',
  /** Child muscle adder container. */
  childAdder: 'muscle-hierarchy-child-adder',
  /** Child muscle adder dropdown. */
  childAdderDropdown: 'muscle-hierarchy-child-adder-dropdown',
  /** Child muscle adder button. */
  childAdderButton: 'muscle-hierarchy-child-adder-button',
  /** Child muscle adder create button. */
  childAdderCreateButton: 'muscle-hierarchy-child-adder-create-button',
  /** Child muscle adder form container. */
  childAdderForm: 'muscle-hierarchy-child-adder-form',
  /** Child muscle adder input field. */
  childAdderInput: 'muscle-hierarchy-child-adder-input',
  /** Child muscle adder cancel button. */
  childAdderCancel: 'muscle-hierarchy-child-adder-cancel',
};

/* ── Motion & muscle config configurator components ──────────── */
export const motionConfig = {
  /** Outer container that holds all motion cards. */
  container: 'motion-config-container',
  /** Loading state text. */
  loading: 'motion-config-loading',
  /** Primary motion card container. */
  primaryCard: 'motion-config-primary-card',
  /** Primary motion header. */
  primaryHeader: 'motion-config-primary-header',
  /** Primary motion header — current record state. */
  primaryHeaderCurrent: 'motion-config-primary-header-current',
  /** Variation card container. */
  variationCard: 'motion-config-variation-card',
  /** Variation card — current record state (ring). */
  variationCardCurrent: 'motion-config-variation-card-current',
  /** Variation header. */
  variationHeader: 'motion-config-variation-header',
  /** Variation header — current record state. */
  variationHeaderCurrent: 'motion-config-variation-header-current',
  /** Variation label (link or bold). */
  variationLabel: 'motion-config-variation-label',
  /** Variation label — current record (bold). */
  variationLabelCurrent: 'motion-config-variation-label-current',
  /** Orphan variation card container. */
  orphanCard: 'motion-config-orphan-card',
  /** Orphan variation header. */
  orphanHeader: 'motion-config-orphan-header',
  /** Orphan label text. */
  orphanLabel: 'motion-config-orphan-label',
  /** Muscle targets toggle badge. */
  muscleToggleBadge: 'motion-config-muscle-toggle-badge',
  /** Muscle targets toggle label. */
  muscleToggleLabel: 'motion-config-muscle-toggle-label',
  /** Muscle targets toggle arrow. */
  muscleToggleArrow: 'motion-config-muscle-toggle-arrow',
  /** Remove variation button. */
  removeVariationBtn: 'motion-config-remove-variation-btn',
  /** Variations nest container. */
  variationsNest: 'motion-config-variations-nest',
  /** Add variation dropdown. */
  addVariationDropdown: 'motion-config-add-variation-dropdown',
  /** Add variation section (with dropdown and create button). */
  addVariationSection: 'motion-config-add-variation-section',
  /** Inline variation creator button. */
  inlineCreatorButton: 'motion-config-inline-creator-button',
  /** Inline variation creator form container. */
  inlineCreatorForm: 'motion-config-inline-creator-form',
  /** Inline variation creator input. */
  inlineCreatorInput: 'motion-config-inline-creator-input',
  /** Inline variation creator create button. */
  inlineCreatorCreateBtn: 'motion-config-inline-creator-create-btn',
  /** Inline variation creator cancel button. */
  inlineCreatorCancelBtn: 'motion-config-inline-creator-cancel-btn',
  /** Set parent motion dropdown. */
  setParentDropdown: 'motion-config-set-parent-dropdown',
  /** Empty state text. */
  emptyState: 'motion-config-empty-state',
  /** Primary motion label (when current record). */
  primaryLabelCurrent: 'motion-config-primary-label-current',
  /** Primary motion label container (flex). */
  primaryLabelContainer: 'motion-config-primary-label-container',
  /** Side-by-side flex container for muscle scores. */
  scoresRow: 'motion-config-scores-row',
  /** Side-by-side column (flex-1) - base/default style. */
  scoresColumn: 'motion-config-scores-column',
  /** Side-by-side column (flex-1) - editable/variation scores. */
  scoresColumnEditable: 'motion-config-scores-column-editable',
  /** Side-by-side column (flex-1) - read-only/parent scores. */
  scoresColumnReadOnly: 'motion-config-scores-column-read-only',
  /** Section label (e.g. "Variation Scores", "Parent Scores"). */
  sectionLabel: 'motion-config-section-label',
  /** Variation header label container (flex). */
  variationLabelContainer: 'motion-config-variation-label-container',
  /** Orphan variation label (when current). */
  orphanLabelCurrent: 'motion-config-orphan-label-current',
  /** Orphan header label container (flex). */
  orphanLabelContainer: 'motion-config-orphan-label-container',
  /** Parent → variation inline container (flex). */
  parentVariationRow: 'motion-config-parent-variation-row',
  /** Inline creator form row (flex gap). */
  inlineCreatorRow: 'motion-config-inline-creator-row',
  /** Inline creator button wrapper. */
  inlineCreatorButtonWrapper: 'motion-config-inline-creator-button-wrapper',
  /** Tooltip text content. */
  tooltipText: 'motion-config-tooltip-text',
  /** Tooltip container with pre-line whitespace. */
  tooltipContainerPreLine: 'motion-config-tooltip-container-pre-line',
  /** Tooltip header with red text. */
  tooltipHeaderRed: 'motion-config-tooltip-header-red',
  /** Inline creator input with flex-1. */
  inlineCreatorInputFlex1: 'motion-config-inline-creator-input-flex-1',
  /** Inline creator input with full width. */
  inlineCreatorInputFull: 'motion-config-inline-creator-input-full',
  /** Muscle targets subtree container. */
  muscleTreeContainer: 'motion-config-muscle-tree-container',
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
  deltaRules,
  muscleHierarchy,
  motionConfig,
};

// Runtime check: ensure sp is defined
if (typeof window !== 'undefined') {
  (window as any).__sp_debug = sp;
}

export default sp;
