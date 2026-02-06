import React, { useRef, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, PanResponder, Animated } from 'react-native';
import { X, Calendar, Trophy, Pencil } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/colors';
import type { ExerciseLibraryItem, ExerciseStats } from '@/types/workout';

type TabKey = 'Records' | 'History' | 'About';

interface ExerciseHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  exercise: ExerciseLibraryItem | null;
  stats: ExerciseStats | {};
  onEdit?: (exercise: ExerciseLibraryItem) => void;
}

const TABS: TabKey[] = ['Records', 'History', 'About'];

const ExerciseHistoryModal: React.FC<ExerciseHistoryModalProps> = ({ visible, onClose, exercise, stats, onEdit }) => {
  const insets = useSafeAreaInsets();
  const pan = useRef(new Animated.ValueXY()).current;
  const [activeTab, setActiveTab] = useState<TabKey>('History');

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          pan.setValue({ x: 0, y: gestureState.dy });
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          onClose();
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  React.useEffect(() => {
    if (visible) {
      pan.setValue({ x: 0, y: 0 });
      setActiveTab('History');
    }
  }, [visible, pan]);

  if (!exercise) return null;

  const exerciseStats = stats as ExerciseStats;
  const history = exerciseStats?.history || [];
  const pr = exerciseStats?.pr || 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.container, 
            { marginTop: insets.top + 16, transform: [{ translateY: pan.y }] }
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>
          
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{exercise.name}</Text>
              <Text style={styles.subtitle}>{exercise.category}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={COLORS.slate[400]} />
            </TouchableOpacity>
          </View>

          {/* Tabs + Edit Button Row */}
          <View style={styles.tabRow}>
            <View style={styles.tabContainer}>
              {TABS.map(tab => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[styles.tabButton, activeTab === tab ? styles.tabButtonSelected : styles.tabButtonUnselected]}
                >
                  <Text style={[styles.tabText, activeTab === tab ? styles.tabTextSelected : styles.tabTextUnselected]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {onEdit && (
              <TouchableOpacity
                onPress={() => onEdit(exercise)}
                style={styles.editButton}
              >
                <Pencil size={14} color={COLORS.white} strokeWidth={2.5} />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {activeTab === 'History' && (
            <>
              {pr > 0 && (
                <View style={styles.prContainer}>
                  <Trophy size={20} color={COLORS.amber[500]} />
                  <Text style={styles.prText}>Personal Record: {pr} {exercise.category === 'Lifts' ? 'lbs' : ''}</Text>
                </View>
              )}

              <ScrollView contentContainerStyle={styles.content}>
                {history.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No history recorded yet.</Text>
                  </View>
                ) : (
                  history.map((session, index) => (
                    <View key={index} style={styles.sessionCard}>
                      <View style={styles.sessionHeader}>
                        <Calendar size={16} color={COLORS.slate[500]} />
                        <Text style={styles.sessionDate}>{session.date}</Text>
                      </View>
                      <View style={styles.setsContainer}>
                        <View style={styles.setRowHeader}>
                          <Text style={styles.colSet}>Set</Text>
                          <Text style={styles.colMetric}>{exercise.category === 'Lifts' ? 'Weight' : 'Time'}</Text>
                          <Text style={styles.colMetric}>{exercise.category === 'Lifts' ? 'Reps' : 'Distance'}</Text>
                        </View>
                        {session.sets.map((set, setIndex) => (
                          <View key={setIndex} style={styles.setRow}>
                            <Text style={styles.colSet}>{setIndex + 1}</Text>
                            <Text style={styles.colMetric}>
                              {set.weight || set.duration || '-'}
                            </Text>
                            <Text style={styles.colMetric}>
                              {set.reps || set.distance || '-'}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </>
          )}

          {activeTab === 'Records' && (
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Records coming soon.</Text>
              </View>
            </ScrollView>
          )}

          {activeTab === 'About' && (
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>About coming soon.</Text>
              </View>
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.slate[50],
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingTop: 8,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.slate[300],
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.slate[900],
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.slate[500],
  },
  closeButton: {
    padding: 4,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  tabContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.slate[100],
    padding: 4,
    borderRadius: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonSelected: {
    backgroundColor: COLORS.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonUnselected: {
    backgroundColor: 'transparent',
  },
  tabText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabTextSelected: {
    color: COLORS.slate[900],
  },
  tabTextUnselected: {
    color: COLORS.slate[500],
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.blue[600],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  prContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.amber[50],
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.amber[200],
  },
  prText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.amber[700],
  },
  content: {
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: COLORS.slate[400],
    fontSize: 16,
  },
  sessionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.slate[200],
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[100],
  },
  sessionDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.slate[700],
  },
  setsContainer: {
    gap: 8,
  },
  setRowHeader: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  setRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  colSet: {
    width: 40,
    fontSize: 14,
    color: COLORS.slate[400],
    fontWeight: 'bold',
  },
  colMetric: {
    flex: 1,
    fontSize: 14,
    color: COLORS.slate[600],
    textAlign: 'center',
  },
});

export default ExerciseHistoryModal;
