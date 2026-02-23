/**
 * Shared Tailwind class constants for side-panel field renderers.
 *
 * Every value is a plain Tailwind utility string applied directly via className.
 * No @apply / no custom CSS classes — just strings the JIT scanner picks up.
 *
 * Usage:
 *   import { sp } from '../styles/sidePanelStyles';
 *   <div className={sp.card.container}> ... </div>
 */

/* ── Collapsible card containers ─────────────────────────── */
export const card = {
  container: 'border rounded-lg overflow-hidden',
  list: 'bg-white border rounded-lg',
  normal: 'bg-white border-gray-200',
  alert: 'bg-red-50 border-red-300',
  treeItem: 'rounded border bg-white',
  treeItemFlat: 'rounded border',
  section: 'border rounded-lg bg-gray-50 p-3',
  info: 'border rounded-lg bg-amber-50/50 overflow-hidden',
};

/* ── Card headers ────────────────────────────────────────── */
export const header = {
  base: 'px-3 py-2 bg-gray-50 border-b flex items-center justify-between',
  flex: 'px-3 py-2 border-b flex items-center gap-2 flex-wrap',
  expanded: 'border-b',
  normal: 'bg-gray-50 border-gray-200',
  alert: 'bg-red-50 border-red-300',
  primary: 'bg-indigo-50',
  primaryCurrent: 'bg-indigo-100',
  variation: 'bg-gray-50',
  variationCurrent: 'bg-blue-100',
  amber: 'bg-amber-50',
};

/* ── Expand / collapse toggle buttons ────────────────────── */
export const toggle = {
  base: 'text-xs text-gray-500 w-4 flex-shrink-0 hover:text-gray-700',
  small: 'text-[10px] text-gray-500 w-3',
};

/* ── Score / number inputs ───────────────────────────────── */
export const scoreInput = {
  editable: [
    'w-14 px-1 py-0.5 border rounded text-xs text-center',
    'focus:outline-none focus:ring-1 focus:ring-blue-500',
    '[appearance:textfield]',
    '[&::-webkit-outer-spin-button]:appearance-none',
    '[&::-webkit-inner-spin-button]:appearance-none',
  ].join(' '),
  computed: 'text-xs font-mono px-1 py-0.5 rounded bg-gray-100 text-gray-500 italic',
  readOnly: 'text-xs font-mono px-1 py-0.5 rounded text-gray-500',
  changed: 'text-xs font-mono px-1 py-0.5 rounded bg-gray-100 text-gray-500 italic font-bold',
};

/* ── Remove (×) buttons ──────────────────────────────────── */
export const removeBtn = {
  small: 'ml-auto text-[10px] text-red-400 hover:text-red-600',
  card: 'ml-2 text-[10px] text-red-400 hover:text-red-600 flex-shrink-0',
  text: 'text-xs text-red-600 hover:text-red-800 px-2 py-1 hover:bg-red-50 rounded',
  textMl: 'text-xs text-red-600 hover:text-red-800 px-2 py-1 hover:bg-red-50 rounded ml-2',
};

/* ── Add-item dropdowns ──────────────────────────────────── */
export const addDropdown = {
  tree: [
    'text-[10px] px-1 py-0.5 border border-red-300 rounded text-red-500',
    'focus:outline-none focus:ring-1 focus:ring-red-500',
  ].join(' '),
  treeBlue: [
    'px-1 py-0.5 border border-blue-300 rounded text-[10px] text-blue-500',
    'focus:ring-1 focus:ring-blue-500 focus:outline-none',
  ].join(' '),
  block: [
    'w-full px-2 py-1.5 border border-blue-300 rounded-lg text-xs text-blue-600',
    'bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer',
  ].join(' '),
  blockNeutral: [
    'w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-700 bg-white',
    'focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500',
  ].join(' '),
  blockForm: 'w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none',
};

/* ── Badges ──────────────────────────────────────────────── */
export const badge = {
  info: 'text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium flex-shrink-0',
  outline: [
    'text-[10px] px-1.5 py-0.5 border border-gray-300 text-gray-500 rounded',
    'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 flex-shrink-0',
  ].join(' '),
  toggle: 'flex items-center gap-1 cursor-pointer bg-red-50/60 hover:bg-red-100/80 rounded px-1.5 py-0.5 flex-shrink-0',
  toggleLabel: 'text-[10px] font-bold text-red-800 flex-shrink-0',
  toggleArrow: 'text-[10px] text-red-600/70 w-3 flex-shrink-0',
};

/* ── Tooltip portals ─────────────────────────────────────── */
export const tooltip = {
  container: 'fixed z-[100] bg-gray-900 text-white text-xs rounded px-3 py-2 shadow-xl border border-gray-700 pointer-events-none',
  header: 'font-semibold mb-1',
};

/* ── Tree rows (muscle hierarchy / delta tree) ───────────── */
export const treeRow = {
  primary: 'flex items-center gap-1.5 px-2 py-1 bg-red-50/60',
  secondary: 'flex items-center gap-1.5 px-2 py-0.5 bg-red-50/60',
  tertiary: 'flex items-center gap-1.5 px-2 py-0.5 bg-red-50/60 rounded',
  leafBullet: 'text-[8px] text-gray-400 w-3 flex items-center justify-center',
  primaryLabel: 'text-xs font-medium text-red-800',
  secondaryLabel: 'text-xs text-red-800',
  tertiaryLabel: 'text-[11px] text-red-800',
};

/* ── Nested containers inside expanded tree cards ────────── */
export const treeNest = {
  secondaries: 'pl-4 pr-2 py-1 space-y-1',
  tertiaries: 'pl-4 pr-2 py-0.5 space-y-0.5',
  variations: 'pl-4 pr-2 py-2 space-y-2',
};

/* ── Expanded muscle tree content areas ──────────────────── */
export const muscleTreeBg = {
  bordered: 'px-0 py-0 border-b bg-red-50',
  flat: 'px-3 py-2 bg-red-50',
};

/* ── ID / metadata labels ────────────────────────────────── */
export const meta = {
  id: 'text-xs text-gray-400',
  arrow: 'text-xs text-gray-400',
  count: 'text-xs text-gray-400 ml-auto',
};

/* ── Empty state / placeholder messages ──────────────────── */
export const emptyState = {
  box: 'px-3 py-4 text-xs text-gray-400 italic text-center border rounded-lg bg-gray-50',
  inline: 'px-2 py-2 text-xs text-gray-400 italic text-center',
  text: 'text-xs text-gray-400 py-2 italic',
};

/* ── Loading indicator ───────────────────────────────────── */
export const loading = 'text-xs text-gray-400 py-2';

/* ── Link styles ─────────────────────────────────────────── */
export const link = {
  primary: 'text-xs font-medium text-blue-600 hover:underline',
  small: 'text-xs text-blue-600 hover:underline text-left',
};

/* ── Motion path card components ─────────────────────────── */
export const motionPath = {
  card: 'border rounded-lg overflow-hidden',
  cardNormal: 'bg-white border-gray-200',
  cardAlert: 'bg-red-50 border-red-300',

  header: 'px-3 py-1 flex items-center justify-between',
  headerExpanded: 'border-b',
  headerNormal: 'bg-gray-50 border-gray-200',
  headerAlert: 'bg-red-50 border-red-300',

  label: 'text-xs font-medium truncate',
  labelNormal: 'text-gray-700',
  labelAlert: 'text-red-800',

  toggle: 'text-xs text-gray-500 w-4 flex-shrink-0 hover:text-gray-700',

  deltaBadge: 'ml-auto flex items-center gap-1 cursor-default rounded px-1.5 py-0.5 flex-shrink-0',
  deltaBadgeAlert: 'bg-red-100 text-red-700',
  deltaBadgeNormal: 'bg-red-50/60 text-red-800 hover:bg-red-100/80',
  deltaBadgeLabel: 'text-[10px] font-bold',
  deltaBadgeArrow: 'text-[10px]',

  removeBtn: 'ml-2 text-[10px] text-red-400 hover:text-red-600 flex-shrink-0',

  expandedContent: 'px-0 py-0 bg-red-50',

  familyContainer: 'border rounded-lg bg-amber-50/50 overflow-hidden',
  familyHeader: 'px-3 py-2 flex items-center gap-2 cursor-pointer select-none',
  familyToggle: 'text-[10px] text-amber-600 w-3',
  familyTitle: 'text-[10px] font-medium text-amber-700',
  familyCount: 'text-[10px] text-amber-500 ml-auto',
  familyBody: 'px-3 py-1.5 space-y-1',
  familyRow: 'flex items-center gap-1.5 text-[11px]',
  familyPlaneLabel: 'text-amber-600 font-medium',
  familyPlaneDisabled: 'text-gray-400',
  familyLink: 'text-blue-600 cursor-pointer hover:underline',
  familyReassign: [
    'ml-auto text-[10px] px-1.5 py-0.5 border border-gray-300 rounded text-gray-500 cursor-pointer',
    'hover:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500',
  ].join(' '),

  expandedContentRow: 'flex gap-3',
  expandedContentColumn: 'flex-1 min-w-0',
  expandedContentSectionLabel: 'text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1',

  treeItem: 'rounded border border-gray-200 bg-white',
  treeItemFlat: 'rounded border border-gray-200',
  treeRowPrimary: 'flex items-center gap-1.5 px-2 py-1 bg-red-50/60',
  treeRowSecondary: 'flex items-center gap-1.5 px-2 py-0.5 bg-red-50/60',
  treeRowTertiary: 'flex items-center gap-1.5 px-2 py-0.5 bg-red-50/60 rounded',
  treeNestSecondaries: 'pl-4 pr-2 py-1 space-y-1',
  treeNestTertiaries: 'pl-4 pr-2 py-0.5 space-y-0.5',
  treeAddDropdown: [
    'text-[10px] px-1 py-0.5 border border-red-300 rounded text-red-500',
    'focus:outline-none focus:ring-1 focus:ring-red-500',
  ].join(' '),
};

/* ── Delta rules configurator components ────────────────────── */
export const deltaRules = {
  container: 'space-y-1',
  emptyState: 'px-3 py-4 text-xs text-gray-400 italic text-center border rounded-lg bg-gray-50',
  emptyStateInline: 'px-2 py-2 text-xs text-red-300 italic text-center',

  card: 'border rounded-lg overflow-hidden',
  cardNormal: 'bg-white border-gray-200 rounded-lg',
  cardAlert: 'bg-red-50 border-red-300 rounded-lg',

  header: 'px-3 py-1 flex items-center justify-between rounded-lg',
  headerExpanded: 'border-b rounded-b-none',
  headerNormal: 'bg-gray-50 border-gray-200',
  headerAlert: 'bg-red-50 border-red-300',

  label: 'text-xs font-medium truncate',
  labelNormal: 'text-gray-700',
  labelAlert: 'text-red-800',

  toggle: 'text-xs text-gray-500 w-4 flex-shrink-0 hover:text-gray-700',
  motionId: 'text-xs text-gray-400 flex-shrink-0',

  deltaBadge: 'ml-auto flex items-center gap-1 cursor-default rounded px-1.5 py-0.5 flex-shrink-0',
  deltaBadgeAlert: 'bg-red-100 text-red-700',
  deltaBadgeNormal: 'bg-red-50 text-red-800 hover:bg-red-100/80',
  deltaBadgeLabel: 'text-[10px] font-bold',
  deltaBadgeArrow: 'text-[10px]',

  removeBtn: 'ml-2 text-[10px] text-red-400 hover:text-red-600 flex-shrink-0',

  expandedContent: 'px-0 py-0 bg-red-50',

  muscleList: 'py-2 space-y-0.5',
  muscleRow: 'flex items-center gap-1.5 px-2 py-0.5 bg-red-50/60 rounded',
  muscleLabel: 'text-xs text-red-800 flex-1',
  muscleRemoveBtn: 'ml-auto text-[10px] text-red-400 hover:text-red-600',

  addMuscleDropdown: [
    'text-[10px] px-1 py-0.5 border border-red-300 rounded text-red-500 mt-1 w-full',
    'focus:outline-none focus:ring-1 focus:ring-red-500',
  ].join(' '),

  addMotionSection: 'border rounded-lg bg-gray-50 p-3',
  addMotionDropdown: [
    'w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-700 bg-white',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
  ].join(' '),
  addMotionOptgroup: 'font-semibold text-gray-900 bg-gray-100',
  addMotionOption: 'font-normal text-gray-700 pl-4',
  addMotionOptionIndented: 'font-normal text-gray-700 pl-8',

  loading: 'text-xs text-gray-400 py-2',
  emptyStateTree: 'text-xs text-gray-400 italic py-2',
  treeContainer: 'space-y-0.5 bg-white py-2 px-2 rounded',

  addBadge: 'text-[10px] ml-2 px-1.5 py-0 bg-blue-100 text-blue-700 rounded font-medium',
  arrowSeparator: 'text-[10px] text-gray-400',
  headerFlex: 'flex items-center gap-2 flex-1 min-w-0',

  scoresRow: 'flex gap-3',
  scoresColumn: 'flex-1 min-w-0',
  scoresColumnEditable: 'flex-1 min-w-0 py-2 px-3',
  scoresColumnReadOnly: 'flex-1 min-w-0 py-2 px-3 bg-gray-200',
  sectionLabel: 'text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1',

  tooltipEmpty: 'text-red-300 italic',
  tooltipEntries: 'space-y-0.5',
  tooltipEntryRow: 'flex justify-between gap-4',
  tooltipScore: 'font-mono',

  treeItem: 'rounded border border-gray-200 bg-white py-0',
  treeItemFlat: 'rounded border-b border-gray-200',
  treeRowPrimary: 'flex items-center gap-1.5 px-2 py-0.5 bg-red-50/90',
  treeRowSecondary: 'flex items-center gap-1.5 px-2 py-0.5 bg-red-50/80',
  treeRowTertiary: 'flex items-center gap-1 px-2 py-0.5 bg-red-50/70 rounded',
  treeNestSecondaries: 'pl-4 pr-2 py-0.5 space-y-1',
  treeNestTertiaries: 'pl-4 pr-2 py-0.5 space-y-0.5',
  treeAddDropdown: [
    'text-[10px] px-1 py-0.5 border border-red-300 rounded text-red-500',
    'focus:outline-none focus:ring-1 focus:ring-red-500',
  ].join(' '),

  treeItemReadOnly: 'rounded bg-white',
  treeItemFlatReadOnly: 'rounded',
  treeRowPrimaryReadOnly: 'flex items-center gap-0 px-2 py-0',
  treeRowSecondaryReadOnly: 'flex items-center gap-0 px-2 py-0',
  treeRowTertiaryReadOnly: 'flex items-center gap-0 px-2 py-0 rounded',
  treeNestSecondariesReadOnly: 'pl-4 pr-2 py-0 space-y-0',
  treeNestTertiariesReadOnly: 'pl-4 pr-2 py-0 space-y-0',
};

/* ── Muscle hierarchy configurator components ───────────────── */
export const muscleHierarchy = {
  container: 'space-y-1',
  loading: 'text-xs text-gray-400 py-2',
  card: 'bg-white border rounded-lg',
  header: 'px-3 py-2 bg-gray-50 border-b flex items-center justify-between',
  headerExpanded: 'border-b',
  label: 'text-sm font-medium text-gray-700',
  currentLabel: 'text-sm font-medium text-gray-700',
  toggle: 'text-xs text-gray-500 w-4 flex-shrink-0 hover:text-gray-700',
  link: 'text-sm text-blue-600 text-left hover:underline',
  muscleId: 'text-xs text-gray-400',
  arrow: 'text-xs text-gray-400',
  count: 'text-xs text-gray-400 ml-auto',
  removeBtn: 'text-xs text-red-600 px-2 py-1 rounded ml-2 hover:text-red-800 hover:bg-red-50',
  expandedContent: 'border-t bg-gray-50',
  tertiaryItem: 'px-3 py-1.5 pl-8',
  tertiaryBullet: 'text-xs text-gray-500',
  addDropdown: 'w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none',
  emptyState: 'text-xs text-gray-400 py-2 italic',
  childAdder: 'px-3 py-2 pl-8 border-t bg-white',
  childAdderDropdown: 'flex-1 px-2 py-1 border rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100',
  childAdderButton: 'px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed',
  childAdderCreateButton: 'px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700',
  childAdderForm: 'space-y-2',
  childAdderInput: 'flex-1 px-2 py-1 border rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none',
  childAdderCancel: 'px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300',
};

/* ── Motion & muscle config configurator components ──────────── */
export const motionConfig = {
  container: 'space-y-1',
  loading: 'text-xs text-gray-400 py-2',
  primaryCard: 'border rounded-lg overflow-hidden bg-gray-50',
  primaryHeader: 'px-3 py-1 border-b flex items-center gap-2 flex-wrap bg-gray-50',
  primaryHeaderCurrent: 'bg-indigo-100',
  variationCard: 'rounded border overflow-hidden bg-white',
  variationCardCurrent: 'ring-2 ring-blue-400',
  variationHeader: 'px-2 py-1.5 border-b flex items-center gap-2 flex-wrap bg-gray-50',
  variationHeaderCurrent: 'bg-blue-100',
  variationLabel: 'text-xs font-medium text-blue-600 hover:underline',
  variationLabelCurrent: 'text-xs font-bold text-gray-900',
  orphanCard: 'border rounded-lg overflow-hidden bg-gray-50',
  orphanHeader: 'px-3 py-2 border-b flex items-center gap-2 flex-wrap bg-amber-50',
  orphanLabel: 'text-xs text-amber-600 italic',
  muscleToggleBadge: 'flex items-center gap-1 cursor-pointer bg-red-50/60 rounded px-1.5 py-0.5 flex-shrink-0 hover:bg-red-100/80',
  muscleToggleLabel: 'text-[10px] font-bold text-red-800 flex-shrink-0',
  muscleToggleArrow: 'text-[10px] text-red-600/70 w-3 flex-shrink-0',
  removeVariationBtn: 'ml-auto text-[10px] text-red-500 px-1 flex-shrink-0 hover:text-red-700',
  variationsNest: 'pl-4 pr-2 py-2 space-y-2',
  addVariationDropdown: [
    'px-1 py-0.5 border border-blue-300 rounded text-[10px] text-blue-500',
    'focus:ring-1 focus:ring-blue-500 focus:outline-none',
  ].join(' '),
  addVariationSection: 'flex flex-row gap-2 items-stretch',
  inlineCreatorButton: [
    'whitespace-nowrap h-full px-3 py-1.5 text-[10px] bg-blue-50 text-blue-700 rounded border border-blue-200',
    'hover:bg-blue-100',
  ].join(' '),
  inlineCreatorForm: 'border rounded p-2 space-y-1.5 bg-blue-50',
  inlineCreatorInput: 'px-1.5 py-0.5 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500',
  inlineCreatorCreateBtn: 'px-2 py-0.5 text-xs bg-blue-600 text-white rounded disabled:opacity-50',
  inlineCreatorCancelBtn: 'px-2 py-0.5 text-xs bg-gray-200 rounded',
  setParentDropdown: [
    'px-1 py-0.5 border border-blue-300 rounded text-[10px] text-blue-500',
    'focus:ring-1 focus:ring-blue-500 focus:outline-none',
  ].join(' '),
  emptyState: 'text-xs text-gray-400 py-2 italic',
  primaryLabelCurrent: 'text-xs font-bold text-gray-900',
  primaryLabelContainer: 'flex items-center gap-2 flex-shrink-0',
  scoresRow: 'flex gap-3',
  scoresColumn: 'flex-1 min-w-0',
  scoresColumnEditable: 'flex-1 min-w-0 py-2 px-3',
  scoresColumnReadOnly: 'flex-1 min-w-0 py-2 px-3 bg-gray-200',
  sectionLabel: 'text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1',
  variationLabelContainer: 'flex items-center gap-2 flex-shrink-0',
  orphanLabelCurrent: 'text-sm font-bold text-gray-900',
  orphanLabelContainer: 'flex items-center gap-2 flex-shrink-0',
  parentVariationRow: 'flex items-center gap-2 flex-1',
  inlineCreatorRow: 'flex gap-1.5',
  inlineCreatorButtonWrapper: 'flex-shrink-0 min-w-fit',
  tooltipText: 'font-mono text-[11px]',
  tooltipContainerPreLine: 'whitespace-pre-line',
  tooltipHeaderRed: 'text-red-300',
  inlineCreatorInputFlex1: 'flex-1',
  inlineCreatorInputFull: 'w-full',
  muscleTreeContainer: 'space-y-0.5 bg-white py-2 px-2 rounded',
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
  motionPath,
  deltaRules,
  muscleHierarchy,
  motionConfig,
};

export default sp;
