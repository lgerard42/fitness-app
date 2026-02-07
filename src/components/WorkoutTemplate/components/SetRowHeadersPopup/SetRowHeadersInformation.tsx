import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { COLORS } from '@/constants/colors';

interface SetRowHeadersInformationProps {
    visible: boolean;
    onClose: () => void;
    initialSection?: 'Weight Units' | 'Total Weight Config' | 'Total Reps Config' | 'Dist. Measurement Units';
}

const SetRowHeadersInformation: React.FC<SetRowHeadersInformationProps> = ({
    visible,
    onClose,
    initialSection = 'Weight Units'
}) => {
    const [activeSection, setActiveSection] = useState<'Weight Units' | 'Total Weight Config' | 'Total Reps Config' | 'Dist. Measurement Units'>(initialSection || 'Weight Units');

    useEffect(() => {
        if (visible) {
            setActiveSection(initialSection || 'Weight Units');
        }
    }, [visible, initialSection]);

    const sections: Array<'Weight Units' | 'Total Weight Config' | 'Total Reps Config' | 'Dist. Measurement Units'> = ['Weight Units', 'Total Weight Config', 'Total Reps Config', 'Dist. Measurement Units'];

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.infoModalBackdrop}>
                <View style={styles.infoModalContainer}>
                    <View style={styles.infoModalHeader}>
                        <View style={styles.infoModalHeaderTop}>
                            <Text style={styles.infoModalTitle}>About Set Inputs</Text>
                            <TouchableOpacity
                                onPress={onClose}
                                style={styles.infoModalCloseButton}
                            >
                                <Text style={styles.infoModalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.sectionToggleContainer}>
                            {sections.map((section) => (
                                <TouchableOpacity
                                    key={section}
                                    onPress={() => setActiveSection(section)}
                                    style={[
                                        styles.sectionToggleButton,
                                        activeSection === section ? styles.sectionToggleButtonSelected : styles.sectionToggleButtonUnselected
                                    ]}
                                >
                                    <Text style={[
                                        styles.sectionToggleText,
                                        activeSection === section ? styles.sectionToggleTextSelected : styles.sectionToggleTextUnselected
                                    ]}>
                                        {section}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <ScrollView
                        style={styles.infoModalContent}
                        contentContainerStyle={styles.infoModalContentContainer}
                        showsVerticalScrollIndicator={false}
                        scrollEnabled={true}
                        nestedScrollEnabled={true}
                        bounces={true}
                        scrollEventThrottle={16}
                    >
                        {activeSection === 'Weight Units' && (
                            <View style={styles.infoSection}>
                                <Text style={styles.infoSectionTitle}>Weight Units</Text>
                                <Text style={styles.infoSectionText}>
                                    The Weight Units option allows you to switch between kilograms (KG) and pounds (LBS) for displaying and tracking weight values.
                                </Text>
                                <View style={styles.infoBulletPoint}>
                                    <Text style={styles.infoBullet}>•</Text>
                                    <Text style={styles.infoSectionText}>
                                        <Text style={styles.infoBold}>KG:</Text> Displays weights in kilograms (metric system)
                                    </Text>
                                </View>
                                <View style={styles.infoBulletPoint}>
                                    <Text style={styles.infoBullet}>•</Text>
                                    <Text style={styles.infoSectionText}>
                                        <Text style={styles.infoBold}>LBS:</Text> Displays weights in pounds (imperial system)
                                    </Text>
                                </View>
                                <Text style={styles.infoSectionText}>
                                    When you switch units, all weight values for this exercise will be converted automatically.
                                </Text>
                            </View>
                        )}

                        {activeSection === 'Total Weight Config' && (
                            <View style={styles.infoSection}>
                                <Text style={styles.infoSectionTitle}>Total Weight Config</Text>
                                <Text style={styles.infoSectionText}>
                                    The Total Weight Config option allows you to adjust how total weight is calculated for exercises that use paired equipment.
                                </Text>
                                <View style={styles.infoBulletPoint}>
                                    <Text style={styles.infoBullet}>•</Text>
                                    <Text style={styles.infoSectionText}>
                                        <Text style={styles.infoBold}>1 x Input:</Text> The total weight equals the input value. This is the default for most exercises.
                                    </Text>
                                </View>
                                <View style={styles.infoBulletPoint}>
                                    <Text style={styles.infoBullet}>•</Text>
                                    <Text style={styles.infoSectionText}>
                                        <Text style={styles.infoBold}>2 x Input:</Text> The total weight is multiplied by 2. This is useful for exercises like dumbbell work where you're using two weights (e.g., 25lb dumbbells = 50lb total).
                                    </Text>
                                </View>
                                <Text style={styles.infoSectionText}>
                                    The adjustment affects how totals are displayed and calculated in your workout summary.
                                </Text>
                            </View>
                        )}

                        {activeSection === 'Total Reps Config' && (
                            <View style={styles.infoSection}>
                                <Text style={styles.infoSectionTitle}>Total Reps Config</Text>
                                <Text style={styles.infoSectionText}>
                                    The Total Reps Config option allows you to adjust how total reps are calculated for exercises.
                                </Text>
                                <View style={styles.infoBulletPoint}>
                                    <Text style={styles.infoBullet}>•</Text>
                                    <Text style={styles.infoSectionText}>
                                        <Text style={styles.infoBold}>1x:</Text> The total reps equals the input value. This is the default for most exercises.
                                    </Text>
                                </View>
                                <View style={styles.infoBulletPoint}>
                                    <Text style={styles.infoBullet}>•</Text>
                                    <Text style={styles.infoSectionText}>
                                        <Text style={styles.infoBold}>2x:</Text> The total reps are multiplied by 2. This is useful for alternating exercises where each side counts separately (e.g., 10 reps per side = 20 total reps).
                                    </Text>
                                </View>
                                <View style={styles.infoBulletPoint}>
                                    <Text style={styles.infoBullet}>•</Text>
                                    <Text style={styles.infoSectionText}>
                                        <Text style={styles.infoBold}>L/R Split:</Text> Two separate inputs are shown for left and right sides. The total reps equals the sum of both inputs. This is useful for tracking each side independently.
                                    </Text>
                                </View>
                                <Text style={styles.infoSectionText}>
                                    The adjustment affects how totals are displayed and calculated in your workout summary.
                                </Text>
                            </View>
                        )}

                        {activeSection === 'Dist. Measurement Units' && (
                            <View style={styles.infoSection}>
                                <Text style={styles.infoSectionTitle}>Dist. Measurement Units</Text>
                                <Text style={styles.infoSectionText}>
                                    The Dist. Measurement Units option allows you to switch between Metric and US/Imperial systems for displaying and tracking distance values.
                                </Text>
                                <View style={styles.infoBulletPoint}>
                                    <Text style={styles.infoBullet}>•</Text>
                                    <Text style={styles.infoSectionText}>
                                        <Text style={styles.infoBold}>Metric:</Text> Displays distances in meters (m) and kilometers (km). This is the metric system used in most countries worldwide.
                                    </Text>
                                </View>
                                <View style={styles.infoBulletPoint}>
                                    <Text style={styles.infoBullet}>•</Text>
                                    <Text style={styles.infoSectionText}>
                                        <Text style={styles.infoBold}>US / Imperial:</Text> Displays distances in feet (ft), yards (yd), and miles (mi). This is the imperial system commonly used in the United States.
                                    </Text>
                                </View>
                                <Text style={styles.infoSectionText}>
                                    When you switch systems, all distance values for this exercise will be converted automatically. You can also select specific units (meters, kilometers, feet, yards, or miles) after choosing your preferred system.
                                </Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    infoModalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoModalContainer: {
        width: '90%',
        maxWidth: 600,
        height: '80%',
        maxHeight: 800,
        backgroundColor: COLORS.slate[900],
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 12,
        flexDirection: 'column',
    },
    infoModalHeader: {
        padding: 20,
        paddingBottom: 0,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.slate[700],
        backgroundColor: COLORS.slate[800],
    },
    infoModalHeaderTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    infoModalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.white,
    },
    infoModalCloseButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.slate[600],
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoModalCloseText: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.white,
    },
    infoModalContent: {
        maxHeight: 800,
    },
    infoModalContentContainer: {
        padding: 20,
        paddingTop: 48,
    },
    infoSection: {
        marginBottom: 24,
    },
    infoSectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.white,
        marginBottom: 12,
    },
    infoSectionText: {
        fontSize: 14,
        lineHeight: 22,
        color: COLORS.slate[300],
        marginBottom: 10,
        flex: 1,
    },
    infoBulletPoint: {
        flexDirection: 'row',
        marginBottom: 10,
        paddingRight: 8,
    },
    infoBullet: {
        fontSize: 14,
        lineHeight: 22,
        color: COLORS.slate[200],
        marginRight: 8,
        width: 12,
    },
    infoBold: {
        fontWeight: '700',
        color: COLORS.white,
    },
    sectionToggleContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.slate[700],
        padding: 4,
        marginHorizontal: -8,
        borderRadius: 8,
        marginBottom: -18,
    },
    sectionToggleButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    sectionToggleButtonSelected: {
        backgroundColor: COLORS.slate[900],
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    sectionToggleButtonUnselected: {
        backgroundColor: 'transparent',
    },
    sectionToggleText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    sectionToggleTextSelected: {
        color: COLORS.white,
    },
    sectionToggleTextUnselected: {
        color: COLORS.slate[400],
    },
});

export default SetRowHeadersInformation;
