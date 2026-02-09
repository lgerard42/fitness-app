import { COLORS } from './colors';
import { StyleSheet } from 'react-native';

export const defaultSupersetColorScheme = COLORS.indigo;

export const defaultHiitColorScheme = COLORS.burgundy;

export const defaultPopupStyles = {
    // Container
    // Container sizes to content - absolutely positioned elements size to content by default
    // Option rows use flexShrink: 0 and flexWrap: 'nowrap' to ensure content fits perfectly
    container: {
        position: 'absolute',
        backgroundColor: COLORS.slate[700],
        borderRadius: 8,
        minWidth: 200, // Minimum width to prevent collapse, container can grow to fit content
        shadowColor: COLORS.slate[700],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 2,
        elevation: 8,
        zIndex: 999,
        borderWidth: 0,
        borderColor: COLORS.red[500],
    },
    containerLight: {
        position: 'absolute',
        backgroundColor: COLORS.white,
        borderRadius: 8,
        minWidth: 200, // Minimum width to prevent collapse, container can grow to fit content
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        zIndex: 999,
        borderWidth: 1,
        borderColor: COLORS.slate[100],
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 100,
        elevation: 10,
    },

    // Toggle rows (2+ options side by side)
    toggleRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.slate[500],
        position: 'relative',
        flexShrink: 0, // Prevent row from shrinking
        flexWrap: 'nowrap', // Prevent toggle options from wrapping to next line
    },
    // Option toggle row (dark toggle style for popup options)
    optionToggleRow: {
        flexDirection: 'row',
        padding: 4,
        margin: 0,
        borderRadius: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.slate[550],
        flexShrink: 0, // Prevent row from shrinking
        flexWrap: 'nowrap', // Prevent toggle options from wrapping to next line
        opacity: 1,
    },
    optionToggleButtonsWrapper: {
        flexDirection: 'row',
        backgroundColor: COLORS.slate[600],
        padding: 4,
        margin: 0,
        flex: 1,
        width: '100%',
        borderRadius: 8,
        opacity: 1,
    },
    optionToggleButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        minHeight: 36,
    },
    optionToggleButtonSelected: {
        backgroundColor: COLORS.blue[550],
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    optionToggleButtonUnselected: {
        backgroundColor: 'transparent',
    },
    optionToggleText: {
        fontSize: 12,
        fontWeight: 'bold',
        flexShrink: 0, // Prevent text from shrinking
    },
    optionToggleTextSelected: {
        color: COLORS.white,
    },
    optionToggleTextUnselected: {
        color: COLORS.slate[300],
    },
    // Warmup/Failure toggle specific colors
    optionToggleButtonSelectedWarmup: {
        backgroundColor: COLORS.orange[500],
    },
    optionToggleButtonSelectedFailure: {
        backgroundColor: COLORS.red[500],
    },
    toggleLabelWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
        pointerEvents: 'box-none',
        backgroundColor: 'transparent',
    },
    toggleLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.slate[700],
        padding: 2,
        paddingHorizontal: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: COLORS.slate[500],
        marginTop: -8,
    },
    toggleLabelText: {
        fontSize: 10,
        fontWeight: 'normal',
        color: COLORS.slate[300],
        paddingTop: 0,
    },
    toggleOption: {
        flexGrow: 1, // Allow to grow to fill space
        flexShrink: 0, // Prevent toggle option from shrinking below content size
        paddingBottom: 12,
        paddingTop: 16,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toggleOptionBorder: {
        borderRightWidth: 1,
        borderRightColor: COLORS.slate[550],
    },

    // Regular option rows
    optionRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
        padding: 0,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.slate[550],
        flexShrink: 0, // Prevent row from shrinking
        flexWrap: 'nowrap', // Prevent options from wrapping to next line
    },
    optionRowWithBorder: {
        borderRightWidth: 1,
        borderRightColor: COLORS.slate[600],
    },

    // Individual options
    option: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.slate[550],
        flexShrink: 0, // Prevent option from shrinking
    },
    // Option inside a row container (no bottom border - row container handles it)
    optionInRow: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 0, // No bottom border - row container handles it
        flexShrink: 0, // Prevent option from shrinking
    },
    optionWithIcon: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.slate[550],
    },
    optionWithoutIcon: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.slate[550],
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0, // Prevent content from shrinking
        flexWrap: 'nowrap', // Prevent wrapping
    },
    optionFlex: {
        flexGrow: 1, // Allow to grow to fill space
        flexShrink: 1, // Allow to shrink, but text inside (flexShrink: 0) will prevent it from going too small
        minWidth: 0, // Allow flex to work properly with text
    },

    // Icon-only options
    iconOnlyOption: {
        backgroundColor: COLORS.red[600],
        width: 50,
    },
    iconOnlyOptionDisabled: {
        backgroundColor: COLORS.slate[600],
        opacity: 0.6,
    },

    // Delete option (full option with text)
    optionDelete: {
        backgroundColor: COLORS.red[600],
    },
    optionDeleteDisabled: {
        backgroundColor: COLORS.slate[600],
        opacity: 0.6,
    },

    // Background colors
    optionBackground: {
        backgroundColor: COLORS.slate[700],
    },
    optionBackgroundActive: {
        backgroundColor: COLORS.blue[500],
    },
    toggleOptionBackgroundInactive: {
        backgroundColor: COLORS.slate[650],
    },
    toggleOptionBackgroundActive: {
        backgroundColor: COLORS.blue[500],
    },
    optionBackgroundDisabled: {
        backgroundColor: COLORS.slate[600],
        opacity: 0.6,
    },

    // Text styles
    optionText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.white,
        flexShrink: 0, // Prevent text from shrinking
    },
    optionTextLight: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.slate[900],
        flexShrink: 0, // Prevent text from shrinking
    },
    optionTextActive: {
        color: COLORS.white,
        fontWeight: '600',
    },
    optionTextInactive: {
        color: COLORS.slate[300],
    },
    toggleOptionText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.white,
        flexShrink: 0, // Prevent toggle option text from shrinking
    },
    toggleOptionTextInactive: {
        color: COLORS.slate[300],
    },
    toggleOptionTextActive: {
        color: COLORS.white,
        fontWeight: '600',
    },
    optionTextDisabled: {
        opacity: 0.6,
    },

    // Borders
    borderBottom: {
        borderBottomWidth: 1,
        borderBottomColor: COLORS.slate[550],
    },
    borderBottomLast: {
        borderBottomWidth: 0,
    },
    borderRight: {
        borderRightWidth: 1,
        borderRightColor: COLORS.slate[600],
    },

    // Border radius
    borderRadius: 8,
    borderRadiusFirst: {
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
    },
    borderRadiusLast: {
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
    },
    borderRadiusFirstLeft: {
        borderTopLeftRadius: 8,
    },
    borderRadiusFirstRight: {
        borderTopRightRadius: 8,
    },
    borderRadiusLastLeft: {
        borderBottomLeftRadius: 8,
    },
    borderRadiusLastRight: {
        borderBottomRightRadius: 8,
    },
};
