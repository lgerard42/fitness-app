import { COLORS } from './colors';
import { StyleSheet } from 'react-native';

export const defaultSupersetColorScheme = COLORS.indigo;

export const defaultHiitColorScheme = COLORS.burgundy;

export const defaultPopupStyles = {
    // Container
    container: {
        position: 'absolute',
        backgroundColor: COLORS.slate[700],
        borderRadius: 8,
        minWidth: 220,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 999,
        borderWidth: 1,
        borderColor: COLORS.slate[200],
    },
    containerLight: {
        position: 'absolute',
        backgroundColor: COLORS.white,
        borderRadius: 8,
        minWidth: 220,
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
        flex: 1,
        paddingBottom: 12,
        paddingTop: 16,
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
    },
    optionFlex: {
        flex: 1,
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
        flex: 1,
    },
    optionTextLight: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.slate[900],
        flex: 1,
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
