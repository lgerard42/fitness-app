import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { X, Camera, Mail, Phone, MapPin, Calendar, FileText, User } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '@/constants/colors';
import type { UserProfile } from '@/types/workout';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onSave: (updates: Partial<UserProfile>) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ visible, onClose, profile, onSave }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bio, setBio] = useState('');
  const [profilePictureUri, setProfilePictureUri] = useState<string | null>(null);

  useEffect(() => {
    if (visible && profile) {
      setName(profile.name || '');
      setEmail(profile.email || '');
      setPhone(profile.phone || '');
      setStreet(profile.address?.street || '');
      setCity(profile.address?.city || '');
      setState(profile.address?.state || '');
      setZipCode(profile.address?.zipCode || '');
      setCountry(profile.address?.country || '');
      setDateOfBirth(profile.dateOfBirth || '');
      setBio(profile.bio || '');
      setProfilePictureUri(profile.profilePictureUri || null);
    } else if (visible) {
      // Reset to defaults for new profile
      setName('');
      setEmail('');
      setPhone('');
      setStreet('');
      setCity('');
      setState('');
      setZipCode('');
      setCountry('');
      setDateOfBirth('');
      setBio('');
      setProfilePictureUri(null);
    }
  }, [visible, profile]);

  const requestImagePermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need access to your photos to set a profile picture.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const handlePickImage = async () => {
    const hasPermission = await requestImagePermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfilePictureUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleTakePhoto = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    if (cameraStatus !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need access to your camera to take a photo.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfilePictureUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleImageAction = () => {
    Alert.alert(
      'Profile Picture',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Library', onPress: handlePickImage },
        { text: 'Remove', onPress: () => setProfilePictureUri(null), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSave = () => {
    onSave({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      address: {
        street: street.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        zipCode: zipCode.trim() || undefined,
        country: country.trim() || undefined,
      },
      dateOfBirth: dateOfBirth.trim() || undefined,
      bio: bio.trim() || undefined,
      profilePictureUri: profilePictureUri || undefined,
    });
    onClose();
  };

  const hasChanges = name.trim() || email.trim();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={COLORS.slate[500]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Profile Picture */}
            <View style={styles.profilePictureSection}>
              <TouchableOpacity onPress={handleImageAction} style={styles.profilePictureContainer}>
                {profilePictureUri ? (
                  <View style={styles.profilePictureWrapper}>
                    <Image
                      source={{ uri: profilePictureUri }}
                      style={styles.profilePicture}
                      resizeMode="cover"
                    />
                  </View>
                ) : (
                  <View style={styles.profilePicture}>
                    <User size={32} color={COLORS.slate[400]} />
                  </View>
                )}
                <View style={styles.cameraBadge}>
                  <Camera size={14} color={COLORS.white} />
                </View>
              </TouchableOpacity>
              <Text style={styles.profilePictureHint}>Tap to change photo</Text>
            </View>

            {/* Basic Info */}
            <Text style={styles.sectionTitle}>Basic Information</Text>
            <View style={styles.inputGroup}>
              <View style={styles.inputRow}>
                <User size={16} color={COLORS.slate[400]} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor={COLORS.slate[400]}
                  value={name}
                  onChangeText={setName}
                />
              </View>
              <View style={styles.inputRow}>
                <Mail size={16} color={COLORS.slate[400]} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={COLORS.slate[400]}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.inputRow}>
                <Phone size={16} color={COLORS.slate[400]} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Phone (optional)"
                  placeholderTextColor={COLORS.slate[400]}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Address */}
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Address</Text>
            <View style={styles.inputGroup}>
              <View style={styles.inputRow}>
                <MapPin size={16} color={COLORS.slate[400]} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Street Address"
                  placeholderTextColor={COLORS.slate[400]}
                  value={street}
                  onChangeText={setStreet}
                />
              </View>
              <View style={styles.addressRow}>
                <View style={[styles.inputRow, { flex: 1, marginRight: 8 }]}>
                  <TextInput
                    style={styles.input}
                    placeholder="City"
                    placeholderTextColor={COLORS.slate[400]}
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
                <View style={[styles.inputRow, { flex: 1, marginLeft: 8 }]}>
                  <TextInput
                    style={styles.input}
                    placeholder="State"
                    placeholderTextColor={COLORS.slate[400]}
                    value={state}
                    onChangeText={setState}
                  />
                </View>
              </View>
              <View style={styles.addressRow}>
                <View style={[styles.inputRow, { flex: 1, marginRight: 8 }]}>
                  <TextInput
                    style={styles.input}
                    placeholder="ZIP Code"
                    placeholderTextColor={COLORS.slate[400]}
                    value={zipCode}
                    onChangeText={setZipCode}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={[styles.inputRow, { flex: 1, marginLeft: 8 }]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Country"
                    placeholderTextColor={COLORS.slate[400]}
                    value={country}
                    onChangeText={setCountry}
                  />
                </View>
              </View>
            </View>

            {/* Additional Info */}
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Additional Information</Text>
            <View style={styles.inputGroup}>
              <View style={styles.inputRow}>
                <Calendar size={16} color={COLORS.slate[400]} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Date of Birth (YYYY-MM-DD)"
                  placeholderTextColor={COLORS.slate[400]}
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                />
              </View>
              <View style={styles.bioRow}>
                <FileText size={16} color={COLORS.slate[400]} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  placeholder="Bio (optional)"
                  placeholderTextColor={COLORS.slate[400]}
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Save Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!hasChanges}
            >
              <Text style={[styles.saveButtonText, !hasChanges && styles.saveButtonTextDisabled]}>
                Save Profile
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[100],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.slate[900],
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  profilePictureSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profilePictureContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  profilePictureWrapper: {
    position: 'relative',
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.slate[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.slate[200],
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.blue[600],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  profilePictureHint: {
    fontSize: 12,
    color: COLORS.slate[500],
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  inputGroup: {
    gap: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.slate[50],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.slate[200],
    paddingHorizontal: 14,
    minHeight: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.slate[900],
    paddingVertical: 12,
  },
  addressRow: {
    flexDirection: 'row',
  },
  bioRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.slate[50],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.slate[200],
    paddingHorizontal: 14,
    paddingTop: 12,
    minHeight: 100,
  },
  bioInput: {
    minHeight: 80,
    paddingTop: 0,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate[100],
  },
  saveButton: {
    backgroundColor: COLORS.blue[600],
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.slate[200],
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  saveButtonTextDisabled: {
    color: COLORS.slate[400],
  },
});

export default EditProfileModal;
