import { StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';

/**
 * EditExercise styles.
 * - Input/field styles (label, input, textArea, etc.) are defined once here so all categories share them.
 * - Section/wrapper styles (section, fieldGroup, collapsibleLabelToggleRow) control layout per category.
 */
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    dragHandleContainer: {
        alignItems: 'center',
        paddingTop: 20,
        marginBottom: 0,
    },
    dragHandle: {
        width: 40,
        height: 4,
        backgroundColor: COLORS.slate[300],
        borderRadius: 2,
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.slate[100],
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.slate[900],
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    // ----- Wrapper / section styles (use for Cardio/Lifts/Training containers) -----
    section: {
        marginTop: 8,
    },
    fieldGroup: {
        marginBottom: 24,
    },
    additionalSettings: {
        marginBottom: 6,
        marginTop: 10,
    },
    collapsibleLabelToggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        minHeight: 26,
    },
    labelToggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    // ----- Single place for input/field styling -----
    label: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.slate[500],
        marginBottom: 8,
        marginLeft: 4,
    },
    required: {
        color: COLORS.red[500],
    },
    input: {
        backgroundColor: COLORS.slate[50],
        borderWidth: 1,
        borderColor: COLORS.slate[200],
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: COLORS.slate[900],
    },
    textArea: {
        backgroundColor: COLORS.slate[50],
        borderWidth: 1,
        borderColor: COLORS.slate[200],
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        color: COLORS.slate[900],
        textAlignVertical: 'top',
        height: 100,
    },
    categoryContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.slate[100],
        padding: 4,
        borderRadius: 12,
    },
    categoryButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
    },
    categoryButtonSelected: {
        backgroundColor: COLORS.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    categoryButtonUnselected: {
        backgroundColor: 'transparent',
    },
    categoryText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    categoryTextSelected: {
        color: COLORS.slate[900],
    },
    categoryTextUnselected: {
        color: COLORS.slate[500],
    },
    subLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.slate[400],
    },
    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    toggleLabel: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    textBlue: {
        color: COLORS.blue[600],
    },
    textSlate: {
        color: COLORS.slate[400],
    },
    rowGap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 0,
    },
    equipAndSingleDoubleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    singleDoubleInEquipRow: {
        flexShrink: 0,
        width: 140,
    },
    dropdownStackShrink: {
        flex: 1,
        minWidth: 0,
    },
    dropdownStack: {
        gap: 12,
    },
    textSelected: {
        color: COLORS.slate[900],
        fontWeight: '500',
    },
    textPlaceholder: {
        color: COLORS.slate[400],
    },
    equipmentGripRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 4,
        marginTop: 12,
        flexWrap: 'wrap',
    },
    add2ndToggleRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginTop: 12,
    },
    circleButtonWrapper: {
        alignItems: 'center',
        flex: 1,
        minWidth: 70,
    },
    equipmentCircleButton: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    circleButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: COLORS.slate[100],
        borderWidth: 2,
        borderColor: COLORS.slate[200],
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    circleButtonSelected: {
        backgroundColor: COLORS.blue[50],
        borderColor: COLORS.blue[200],
    },
    circleButtonPlaceholder: {
        width: 44,
        height: 44,
    },
    circleLabel: {
        fontSize: 13,
        textAlign: 'center',
        maxWidth: 120,
    },
    singleDoubleToggleWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 72,
        flexShrink: 1,
        minWidth: 100,
    },
    singleDoubleContainer: {
        flexDirection: 'column',
        backgroundColor: COLORS.slate[100],
        padding: 4,
        borderRadius: 8,
        gap: 4,
        minWidth: 100,
    },
    singleDoubleButton: {
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    gripStanceRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    gripStanceField: {
        flex: 1,
    },
    marginTop12: {
        marginTop: 12,
    },
    footer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.slate[100],
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: COLORS.transparent,
        borderWidth: 1,
        borderColor: COLORS.slate[300],
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.slate[500],
    },
    saveButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: COLORS.blue[600],
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    popupOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 16,
    },
    popupContent: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 24,
        maxHeight: '80%',
    },
    popupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    popupTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.slate[900],
    },
    popupSubtitle: {
        fontSize: 14,
        fontWeight: 'normal',
        color: COLORS.slate[400],
    },
    popupSkip: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.blue[600],
    },
    popupChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 24,
    },
    popupDoneButton: {
        backgroundColor: COLORS.blue[600],
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    popupDoneText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.white,
    },
});

export default styles;
