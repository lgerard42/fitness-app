import { COLORS, type ColorShade } from './colors';
import { StyleSheet, type ViewStyle, type TextStyle } from 'react-native';

export const defaultSupersetColorScheme: ColorShade = COLORS.indigo;

export const defaultHiitColorScheme: ColorShade = COLORS.burgundy;

export const defaultPopupStyles = {
    container: {
        position: 'absolute' as const,
        backgroundColor: COLORS.slate[700],
        borderRadius: 8,
        minWidth: 200,
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
        position: 'absolute' as const,
        backgroundColor: COLORS.white,
        borderRadius: 8,
        minWidth: 200,
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

    toggleRow: {
        flexDirection: 'row' as const,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.slate[500],
        position: 'relative' as const,
        flexShrink: 0,
        flexWrap: 'nowrap' as const,
    },
    optionToggleRow: {
        flexDirection: 'row' as const,
        padding: 4,
        margin: 0,
        borderRadius: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.slate[550],
        flexShrink: 0,
        flexWrap: 'nowrap' as const,
        opacity: 1,
    },
    optionToggleButtonsWrapper: {
        flexDirection: 'row' as const,
        backgroundColor: COLORS.slate[600],
        padding: 4,
        margin: 0,
        flex: 1,
        width: '100%' as const,
        borderRadius: 8,
        opacity: 1,
    },
    optionToggleButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
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
        fontWeight: 'bold' as const,
        flexShrink: 0,
    },
    optionToggleTextSelected: {
        color: COLORS.white,
    },
    optionToggleTextUnselected: {
        color: COLORS.slate[300],
    },
    optionToggleButtonSelectedWarmup: {
        backgroundColor: COLORS.orange[500],
    },
    optionToggleButtonSelectedFailure: {
        backgroundColor: COLORS.red[500],
    },
    toggleLabelWrapper: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        zIndex: 1,
        pointerEvents: 'box-none' as const,
        backgroundColor: 'transparent',
    },
    toggleLabelContainer: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
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
        fontWeight: 'normal' as const,
        color: COLORS.slate[300],
        paddingTop: 0,
    },
    toggleOption: {
        flexGrow: 1,
        flexShrink: 0,
        paddingBottom: 12,
        paddingTop: 16,
        paddingHorizontal: 16,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
    toggleOptionBorder: {
        borderRightWidth: 1,
        borderRightColor: COLORS.slate[550],
    },

    optionRow: {
        flexDirection: 'row' as const,
        alignItems: 'stretch' as const,
        padding: 0,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.slate[550],
        flexShrink: 0,
        flexWrap: 'nowrap' as const,
    },
    optionRowWithBorder: {
        borderRightWidth: 1,
        borderRightColor: COLORS.slate[600],
    },

    option: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.slate[550],
        flexShrink: 0,
    },
    optionInRow: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 0,
        flexShrink: 0,
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
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 8,
        flexShrink: 0,
        flexWrap: 'nowrap' as const,
    },
    optionFlex: {
        flexGrow: 1,
        flexShrink: 1,
        minWidth: 0,
    },

    iconOnlyOption: {
        backgroundColor: COLORS.red[600],
        width: 50,
    },
    iconOnlyOptionDisabled: {
        backgroundColor: COLORS.slate[600],
        opacity: 0.6,
    },

    optionDelete: {
        backgroundColor: COLORS.red[600],
    },
    optionDeleteDisabled: {
        backgroundColor: COLORS.slate[600],
        opacity: 0.6,
    },

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

    optionText: {
        fontSize: 14,
        fontWeight: '600' as const,
        color: COLORS.white,
        flexShrink: 0,
    },
    optionTextLight: {
        fontSize: 14,
        fontWeight: '600' as const,
        color: COLORS.slate[900],
        flexShrink: 0,
    },
    optionTextActive: {
        color: COLORS.white,
        fontWeight: '600' as const,
    },
    optionTextInactive: {
        color: COLORS.slate[300],
    },
    toggleOptionText: {
        fontSize: 14,
        fontWeight: '600' as const,
        color: COLORS.white,
        flexShrink: 0,
    },
    toggleOptionTextInactive: {
        color: COLORS.slate[300],
    },
    toggleOptionTextActive: {
        color: COLORS.white,
        fontWeight: '600' as const,
    },
    optionTextDisabled: {
        opacity: 0.6,
    },

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
} as const;
