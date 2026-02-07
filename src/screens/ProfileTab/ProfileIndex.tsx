import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Ruler,
  Scale,
  Weight,
  Timer,
  Vibrate,
  Smartphone,
  Trophy,
  Target,
  TrendingUp,
  Plus,
  History,
  ChevronRight,
  Dumbbell,
  CalendarCheck,
  Settings,
  ArrowUpDown,
  Calculator,
  RotateCcw,
  Mail,
  Phone,
  MapPin,
  User,
} from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { useUserSettings } from '@/context/UserSettingsContext';
import { useWorkout } from '@/context/WorkoutContext';

// Components
import ProfileHeader from './components/ProfileHeader';
import SettingItem from './components/SettingItem';
import StatCard from './components/StatCard';
import SectionHeader from './components/SectionHeader';

// Hooks
import { useBodyStats } from './hooks/useBodyStats';
import { useGoals } from './hooks/useGoals';
import { usePersonalRecords } from './hooks/usePersonalRecords';
import { useUserProfile } from './hooks/useUserProfile';

// Modals
import AddMeasurementModal from './modals/AddMeasurementModal';
import AddGoalModal from './modals/AddGoalModal';
import MeasurementHistoryModal from './modals/MeasurementHistoryModal';
import EditProfileModal from './modals/EditProfileModal';

import { formatRestTime } from '@/utils/workoutHelpers';
import SwipeToDelete from '@/components/common/SwipeToDelete';

// ─── Rest Timer Picker ──────────────────────────────────────────────────────

const REST_TIMER_PRESETS = [30, 60, 90, 120, 180, 300];

const RestTimerPicker: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => (
  <View style={styles.restTimerGrid}>
    {REST_TIMER_PRESETS.map(seconds => (
      <TouchableOpacity
        key={seconds}
        onPress={() => onChange(seconds)}
        style={[styles.restTimerChip, value === seconds && styles.restTimerChipActive]}
      >
        <Text style={[styles.restTimerChipText, value === seconds && styles.restTimerChipTextActive]}>
          {formatRestTime(seconds)}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ─── Main Profile Screen ────────────────────────────────────────────────────

const ProfileIndex: React.FC = () => {
  const { settings, updateSettings } = useUserSettings();
  const { workoutHistory, activeWorkout } = useWorkout();
  const bodyStats = useBodyStats();
  const goalsHook = useGoals();
  const { records } = usePersonalRecords();
  const userProfile = useUserProfile();

  // Modal visibility
  const [showAddMeasurement, setShowAddMeasurement] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showMeasurementHistory, setShowMeasurementHistory] = useState(false);
  const [showRestTimerPicker, setShowRestTimerPicker] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  // Derived data
  const totalWorkouts = workoutHistory.length;
  const weightDelta = bodyStats.getWeightDelta();
  const bodyFatDelta = bodyStats.getBodyFatDelta();

  // Workouts this week (consistency tracking)
  const workoutsThisWeek = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return workoutHistory.filter(w => {
      const wDate = w.endedAt ? new Date(w.endedAt) : null;
      return wDate && wDate >= startOfWeek;
    }).length;
  }, [workoutHistory]);

  return (
    <SafeAreaView
      style={styles.container}
      edges={activeWorkout ? ['bottom', 'left', 'right'] : ['top', 'bottom', 'left', 'right']}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Profile Header ──────────────────────────────────── */}
        <ProfileHeader
          profile={userProfile.profile}
          totalWorkouts={totalWorkouts}
          onEditPress={() => setShowEditProfile(true)}
        />

        {/* ─── Profile Information ────────────────────────────── */}
        {userProfile.profile && (userProfile.profile.name || userProfile.profile.email) && (
          <>
            <SectionHeader title="Profile Information" />
            <View style={styles.card}>
              {userProfile.profile.name && (
                <SettingItem
                  icon={<User size={16} color={COLORS.slate[600]} />}
                  label="Name"
                  value={userProfile.profile.name}
                />
              )}
              {userProfile.profile.email && (
                <SettingItem
                  icon={<Mail size={16} color={COLORS.slate[600]} />}
                  label="Email"
                  value={userProfile.profile.email}
                />
              )}
              {userProfile.profile.phone && (
                <SettingItem
                  icon={<Phone size={16} color={COLORS.slate[600]} />}
                  label="Phone"
                  value={userProfile.profile.phone}
                />
              )}
              {(userProfile.profile.address?.street ||
                userProfile.profile.address?.city ||
                userProfile.profile.address?.state ||
                userProfile.profile.address?.zipCode) && (
                <View style={styles.addressSection}>
                  <View style={styles.addressRow}>
                    <MapPin size={16} color={COLORS.slate[600]} style={styles.addressIcon} />
                    <View style={styles.addressTextContainer}>
                      {userProfile.profile.address?.street && (
                        <Text style={styles.addressText}>{userProfile.profile.address.street}</Text>
                      )}
                      {(userProfile.profile.address?.city ||
                        userProfile.profile.address?.state ||
                        userProfile.profile.address?.zipCode) && (
                        <Text style={styles.addressText}>
                          {[
                            userProfile.profile.address?.city,
                            userProfile.profile.address?.state,
                            userProfile.profile.address?.zipCode,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </Text>
                      )}
                      {userProfile.profile.address?.country && (
                        <Text style={styles.addressText}>{userProfile.profile.address.country}</Text>
                      )}
                    </View>
                  </View>
                </View>
              )}
              {userProfile.profile.bio && (
                <View style={styles.bioSection}>
                  <Text style={styles.bioLabel}>Bio</Text>
                  <Text style={styles.bioText}>{userProfile.profile.bio}</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* ─── Body Stats At-a-Glance ──────────────────────────── */}
        <SectionHeader
          title="Body Stats"
          actionLabel="History"
          onAction={() => setShowMeasurementHistory(true)}
        />
        <View style={styles.statsRow}>
          <StatCard
            icon={<Scale size={14} color={COLORS.blue[600]} />}
            title="Weight"
            value={
              bodyStats.latestMeasurement?.weight
                ? `${bodyStats.latestMeasurement.weight} ${bodyStats.latestMeasurement.unit}`
                : '—'
            }
            subtitle={weightDelta?.label}
            accentColor={COLORS.blue[500]}
          />
          <StatCard
            icon={<TrendingUp size={14} color={COLORS.green[600]} />}
            title="Body Fat"
            value={
              bodyStats.latestMeasurement?.bodyFatPercent
                ? `${bodyStats.latestMeasurement.bodyFatPercent}%`
                : '—'
            }
            subtitle={bodyFatDelta?.label}
            accentColor={COLORS.green[500]}
          />
        </View>

        <TouchableOpacity
          style={styles.addMeasurementButton}
          onPress={() => setShowAddMeasurement(true)}
        >
          <Plus size={16} color={COLORS.blue[600]} />
          <Text style={styles.addMeasurementText}>Add Measurement</Text>
        </TouchableOpacity>

        {/* ─── Personal Records ────────────────────────────────── */}
        <SectionHeader title="Personal Records" />
        {records.length === 0 ? (
          <View style={styles.emptyCard}>
            <Trophy size={24} color={COLORS.slate[300]} />
            <Text style={styles.emptyText}>Complete workouts to see your PRs here</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {records.slice(0, 5).map((pr, idx) => (
              <View
                key={pr.exerciseId}
                style={[styles.prRow, idx < Math.min(records.length, 5) - 1 && styles.prRowBorder]}
              >
                <View style={styles.prLeft}>
                  <Trophy size={14} color={COLORS.amber[500]} />
                  <Text style={styles.prName} numberOfLines={1}>{pr.exerciseName}</Text>
                </View>
                <Text style={styles.prWeight}>{pr.weight} {pr.weightUnit}</Text>
              </View>
            ))}
            {records.length > 5 && (
              <Text style={styles.moreRecords}>+{records.length - 5} more records</Text>
            )}
          </View>
        )}

        {/* ─── Goals ───────────────────────────────────────────── */}
        <SectionHeader
          title="Goals"
          actionLabel="Add"
          onAction={() => setShowAddGoal(true)}
        />
        {goalsHook.goals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Target size={24} color={COLORS.slate[300]} />
            <Text style={styles.emptyText}>Set your first goal to stay motivated</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {goalsHook.goals.map((goal, idx) => {
              const isStrength = goal.type === 'strength';
              // Check if strength goal achieved
              const matchingPr = isStrength
                ? records.find(r => r.exerciseId === goal.exerciseId && r.weight >= (goal.targetWeight ?? 0))
                : null;
              const isAchieved = goal.completed || !!matchingPr;

              // Consistency goal progress
              const consistencyProgress = !isStrength ? workoutsThisWeek : 0;
              const consistencyTarget = goal.targetWorkoutsPerWeek ?? 0;

              return (
                <SwipeToDelete
                  key={goal.id}
                  onDelete={() => goalsHook.deleteGoal(goal.id)}
                >
                  <TouchableOpacity
                    style={[styles.goalRow, idx < goalsHook.goals.length - 1 && styles.prRowBorder]}
                    onPress={() => goalsHook.toggleGoalCompleted(goal.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.goalLeft}>
                      <View style={[styles.goalCheck, isAchieved && styles.goalCheckDone]}>
                        {isAchieved && <Text style={styles.goalCheckMark}>✓</Text>}
                      </View>
                      <View style={styles.goalInfo}>
                        <Text style={[styles.goalName, isAchieved && styles.goalNameDone]} numberOfLines={1}>
                          {isStrength
                            ? `${goal.exerciseName} — ${goal.targetWeight} ${goal.targetWeightUnit}`
                            : `${goal.targetWorkoutsPerWeek}x Workouts / Week`}
                        </Text>
                        <Text style={styles.goalMeta}>
                          {isStrength
                            ? (matchingPr ? '🎉 Achieved!' : 'Strength Goal')
                            : `${consistencyProgress} / ${consistencyTarget} this week`}
                        </Text>
                      </View>
                    </View>
                    <ChevronRight size={16} color={COLORS.slate[300]} />
                  </TouchableOpacity>
                </SwipeToDelete>
              );
            })}
          </View>
        )}

        {/* ─── Unit Settings ───────────────────────────────────── */}
        <SectionHeader title="Unit Preferences" />
        <View style={styles.card}>
          <SettingItem
            icon={<Ruler size={16} color={COLORS.slate[600]} />}
            label="Distance Units"
            options={['US', 'Metric']}
            selectedOption={settings.distanceUnit}
            onSelectOption={(v) => updateSettings({ distanceUnit: v as 'US' | 'Metric' })}
          />
          <SettingItem
            icon={<Weight size={16} color={COLORS.slate[600]} />}
            label="Weight Units"
            options={['lbs', 'kg']}
            selectedOption={settings.weightUnit}
            onSelectOption={(v) => updateSettings({ weightUnit: v as 'lbs' | 'kg' })}
          />
          <SettingItem
            icon={<Calculator size={16} color={COLORS.slate[600]} />}
            label="Total Weight Calc"
            options={['1x', '2x']}
            selectedOption={settings.weightCalcMode}
            onSelectOption={(v) => updateSettings({ weightCalcMode: v as '1x' | '2x' })}
          />
          <SettingItem
            icon={<RotateCcw size={16} color={COLORS.slate[600]} />}
            label="Total Reps Calc"
            options={['1x', '2x', 'L/R']}
            selectedOption={
              settings.repsConfigMode === 'lrSplit' ? 'L/R' : settings.repsConfigMode
            }
            onSelectOption={(v) => {
              const mode = v === 'L/R' ? 'lrSplit' : (v as '1x' | '2x');
              updateSettings({ repsConfigMode: mode });
            }}
            isLast
          />
        </View>

        {/* ─── Default Rest Timer ──────────────────────────────── */}
        <SectionHeader title="Default Rest Timer" />
        <View style={styles.card}>
          <SettingItem
            icon={<Timer size={16} color={COLORS.slate[600]} />}
            label="Rest Between Sets"
            value={formatRestTime(settings.defaultRestTimerSeconds)}
            onPress={() => setShowRestTimerPicker(!showRestTimerPicker)}
            isLast
          />
          {showRestTimerPicker && (
            <View style={styles.restTimerPickerContainer}>
              <RestTimerPicker
                value={settings.defaultRestTimerSeconds}
                onChange={(v) => {
                  updateSettings({ defaultRestTimerSeconds: v });
                  setShowRestTimerPicker(false);
                }}
              />
            </View>
          )}
        </View>

        {/* ─── App Preferences ─────────────────────────────────── */}
        <SectionHeader title="App Preferences" />
        <View style={styles.card}>
          <SettingItem
            icon={<Vibrate size={16} color={COLORS.slate[600]} />}
            label="Vibrate on Timer Finish"
            isToggle
            toggleValue={settings.vibrateOnTimerFinish}
            onToggle={(v) => updateSettings({ vibrateOnTimerFinish: v })}
          />
          <SettingItem
            icon={<Smartphone size={16} color={COLORS.slate[600]} />}
            label="Keep Screen Awake"
            isToggle
            toggleValue={settings.keepScreenAwake}
            onToggle={(v) => updateSettings({ keepScreenAwake: v })}
            isLast
          />
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ─── Modals ────────────────────────────────────────────── */}
      <AddMeasurementModal
        visible={showAddMeasurement}
        onClose={() => setShowAddMeasurement(false)}
        onSave={bodyStats.addMeasurement}
      />
      <AddGoalModal
        visible={showAddGoal}
        onClose={() => setShowAddGoal(false)}
        onSave={goalsHook.addGoal}
      />
      <MeasurementHistoryModal
        visible={showMeasurementHistory}
        onClose={() => setShowMeasurementHistory(false)}
        measurements={bodyStats.measurements}
        onDeleteMeasurement={bodyStats.deleteMeasurement}
      />
      <EditProfileModal
        visible={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        profile={userProfile.profile}
        onSave={userProfile.updateProfile}
      />
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.slate[50],
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
  },
  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  // Add measurement button
  addMeasurementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.blue[50],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.blue[200],
    paddingVertical: 10,
    marginBottom: 24,
  },
  addMeasurementText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.blue[600],
  },
  // Cards
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.slate[100],
    overflow: 'hidden',
    marginBottom: 24,
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.slate[100],
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.slate[400],
    marginTop: 10,
    textAlign: 'center',
  },
  // PR Row
  prRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  prRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[100],
  },
  prLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  prName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.slate[800],
    flex: 1,
  },
  prWeight: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.slate[900],
    marginLeft: 8,
  },
  moreRecords: {
    textAlign: 'center',
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.slate[500],
    fontWeight: '500',
  },
  // Goals
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
  },
  goalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  goalCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.slate[300],
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalCheckDone: {
    backgroundColor: COLORS.green[500],
    borderColor: COLORS.green[500],
  },
  goalCheckMark: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.slate[800],
  },
  goalNameDone: {
    textDecorationLine: 'line-through',
    color: COLORS.slate[400],
  },
  goalMeta: {
    fontSize: 12,
    color: COLORS.slate[500],
    marginTop: 2,
  },
  // Rest timer picker
  restTimerPickerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  restTimerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  restTimerChip: {
    backgroundColor: COLORS.slate[100],
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: '28%',
    alignItems: 'center',
  },
  restTimerChipActive: {
    backgroundColor: COLORS.blue[600],
  },
  restTimerChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.slate[600],
  },
  restTimerChipTextActive: {
    color: COLORS.white,
  },
  // Profile Information
  addressSection: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate[100],
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  addressTextContainer: {
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.slate[700],
    marginBottom: 2,
  },
  bioSection: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate[100],
  },
  bioLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.slate[500],
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bioText: {
    fontSize: 14,
    color: COLORS.slate[700],
    lineHeight: 20,
  },
});

export default ProfileIndex;
