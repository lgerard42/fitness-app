import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { User } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import type { UserProfile } from '@/types/workout';

interface ProfileHeaderProps {
  profile: UserProfile | null;
  totalWorkouts: number;
  onEditPress?: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ profile, totalWorkouts, onEditPress }) => {
  const displayName = profile?.name || 'My Profile';
  const hasProfileData = profile && (profile.name || profile.email);

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        {profile?.profilePictureUri ? (
          <View style={styles.avatar}>
            <Image
              source={{ uri: profile.profilePictureUri }}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          </View>
        ) : (
          <View style={styles.avatar}>
            <User size={32} color={COLORS.white} />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.title}>{displayName}</Text>
        {profile?.email ? (
          <Text style={styles.subtitle}>{profile.email}</Text>
        ) : (
          <Text style={styles.subtitle}>
            {totalWorkouts} workout{totalWorkouts !== 1 ? 's' : ''} logged
          </Text>
        )}
        {hasProfileData && (
          <Text style={styles.workoutCount}>
            {totalWorkouts} workout{totalWorkouts !== 1 ? 's' : ''} logged
          </Text>
        )}
      </View>
      {onEditPress && (
        <TouchableOpacity onPress={onEditPress} style={styles.editButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.slate[100],
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.blue[600],
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.slate[900],
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.slate[500],
    marginBottom: 2,
  },
  workoutCount: {
    fontSize: 12,
    color: COLORS.slate[400],
    marginTop: 2,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.blue[50],
    borderWidth: 1,
    borderColor: COLORS.blue[200],
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.blue[600],
  },
});

export default ProfileHeader;
