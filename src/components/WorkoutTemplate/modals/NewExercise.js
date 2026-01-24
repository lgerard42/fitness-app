import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, ToggleLeft, ToggleRight } from 'lucide-react-native';
import { COLORS } from '../../../constants/colors';
import { PRIMARY_MUSCLES, CARDIO_TYPES, TRAINING_FOCUS, WEIGHT_EQUIP_TAGS, PRIMARY_TO_SECONDARY_MAP } from '../../../constants/data';
import Chip from '../../Chip';
import CustomDropdown from '../../CustomDropdown';

const NewExercise = ({ isOpen, onClose, onSave, categories }) => {
  const [newExercise, setNewExercise] = useState({ 
    name: "", category: "", primaryMuscles: [], secondaryMuscles: [], 
    cardioType: "", trainingFocus: "", weightEquipTags: [], description: "", trackDuration: false 
  });
  const [secondaryMusclesEnabled, setSecondaryMusclesEnabled] = useState(true);
  const [activePrimaryForPopup, setActivePrimaryForPopup] = useState(null);
  const [showDescription, setShowDescription] = useState(false);
  const [showSecondEquip, setShowSecondEquip] = useState(false);
  const [showWeightEquip, setShowWeightEquip] = useState(false);

  const toggleSelection = (field, value) => {
    setNewExercise(prev => {
      const current = prev[field] || [];
      return { ...prev, [field]: current.includes(value) ? current.filter(item => item !== value) : [...current, value] };
    });
  };

  const handleMakePrimary = (muscle) => {
    setNewExercise(prev => {
      const others = prev.primaryMuscles.filter(m => m !== muscle);
      return { ...prev, primaryMuscles: [muscle, ...others] };
    });
  };

  const handleEquipChange = (index, value) => {
    setNewExercise(prev => {
      const newTags = [...prev.weightEquipTags];
      newTags[index] = value;
      return { ...prev, weightEquipTags: newTags };
    });
  };

  const handlePrimaryMuscleToggle = (muscle) => {
    setNewExercise(prev => {
      const isSelected = prev.primaryMuscles.includes(muscle);
      const isSpecial = ["Full Body", "Olympic"].includes(muscle);
      const currentSpecials = prev.primaryMuscles.filter(m => ["Full Body", "Olympic"].includes(m));
      const hasSpecialSelected = currentSpecials.length > 0;
      let newPrimaries = [], newSecondaries = prev.secondaryMuscles;
      
      if (isSelected) {
        newPrimaries = prev.primaryMuscles.filter(m => m !== muscle);
        const secondariesToRemove = PRIMARY_TO_SECONDARY_MAP[muscle] || [];
        newSecondaries = prev.secondaryMuscles.filter(s => !secondariesToRemove.includes(s));
      } else {
        if (isSpecial) { newPrimaries = [muscle]; newSecondaries = []; } 
        else {
           if (hasSpecialSelected) { newPrimaries = [muscle]; newSecondaries = []; } 
           else { newPrimaries = [...prev.primaryMuscles, muscle]; }
        }
        const hasSecondaries = PRIMARY_TO_SECONDARY_MAP[muscle] && PRIMARY_TO_SECONDARY_MAP[muscle].length > 0;
        if (secondaryMusclesEnabled && hasSecondaries) setActivePrimaryForPopup(muscle);
      }
      return { ...prev, primaryMuscles: newPrimaries, secondaryMuscles: newSecondaries };
    });
  };

  const handleCategoryChange = (cat) => {
    setNewExercise(prev => ({ ...prev, category: cat, primaryMuscles: [], secondaryMuscles: [], cardioType: "", trainingFocus: "", weightEquipTags: [] }));
    setShowWeightEquip(false);
  };

  const handleSave = () => {
    if (!newExercise.name || !newExercise.category) return;
    if (newExercise.category === 'Lifts' && newExercise.primaryMuscles.length === 0) return;
    onSave(newExercise);
    setNewExercise({ name: "", category: "", primaryMuscles: [], secondaryMuscles: [], cardioType: "", trainingFocus: "", weightEquipTags: [], description: "", trackDuration: false });
    setSecondaryMusclesEnabled(true);
    setShowDescription(false); setShowSecondEquip(false); setShowWeightEquip(false);
  };

  const getAvailableSecondaryMuscles = (primary) => {
    if (PRIMARY_TO_SECONDARY_MAP[primary]) {
      return PRIMARY_TO_SECONDARY_MAP[primary].sort();
    }
    return [];
  };

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>New Exercise</Text>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>EXERCISE NAME</Text>
            <TextInput 
              style={styles.input}
              placeholder="e.g. Bulgarian Split Squat"
              placeholderTextColor={COLORS.slate[400]}
              value={newExercise.name}
              onChangeText={text => setNewExercise({...newExercise, name: text})}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>CATEGORY <Text style={styles.required}>*</Text></Text>
            <View style={styles.categoryContainer}>
              {categories.map(cat => (
                <TouchableOpacity 
                  key={cat} 
                  onPress={() => handleCategoryChange(cat)} 
                  style={[styles.categoryButton, newExercise.category === cat ? styles.categoryButtonSelected : styles.categoryButtonUnselected]}
                >
                  <Text style={[styles.categoryText, newExercise.category === cat ? styles.categoryTextSelected : styles.categoryTextUnselected]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {newExercise.category === 'Lifts' && (
            <View style={styles.section}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>MUSCLE GROUPS</Text>
                <View style={styles.rowBetween}>
                  <Text style={styles.subLabel}>PRIMARY <Text style={styles.required}>*</Text></Text>
                  <TouchableOpacity 
                    style={styles.toggleContainer} 
                    onPress={() => { 
                      const newVal = !secondaryMusclesEnabled; 
                      setSecondaryMusclesEnabled(newVal); 
                      if (!newVal) setNewExercise(prev => ({...prev, secondaryMuscles: []})); 
                    }}
                  >
                    <Text style={[styles.toggleLabel, secondaryMusclesEnabled ? styles.textBlue : styles.textSlate]}>SECONDARY</Text>
                    {secondaryMusclesEnabled ? <ToggleRight size={28} color={COLORS.blue[600]} /> : <ToggleLeft size={28} color={COLORS.slate[300]} />}
                  </TouchableOpacity>
                </View>
                <View style={styles.chipsContainer}>
                  {PRIMARY_MUSCLES.map(m => (
                    <Chip 
                      key={m} 
                      label={m} 
                      selected={newExercise.primaryMuscles.includes(m)} 
                      isPrimary={newExercise.primaryMuscles[0] === m} 
                      isSpecial={["Full Body", "Olympic"].includes(m)} 
                      onClick={() => handlePrimaryMuscleToggle(m)} 
                      onMakePrimary={() => handleMakePrimary(m)} 
                    />
                  ))}
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.fieldGroup}>
                <View style={styles.rowBetween}>
                  <Text style={styles.label}>WEIGHT EQUIP.</Text>
                  <View style={styles.rowGap}>
                    <TouchableOpacity style={styles.toggleContainer} onPress={() => setNewExercise(prev => ({ ...prev, trackDuration: !prev.trackDuration }))}>
                      <Text style={[styles.toggleLabel, newExercise.trackDuration ? styles.textBlue : styles.textSlate]}>DURATION</Text>
                      {newExercise.trackDuration ? <ToggleRight size={28} color={COLORS.blue[600]} /> : <ToggleLeft size={28} color={COLORS.slate[300]} />}
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.toggleContainer} 
                      onPress={() => { 
                        const newVal = !showSecondEquip; 
                        setShowSecondEquip(newVal); 
                        if (!newVal) setNewExercise(prev => ({...prev, weightEquipTags: [prev.weightEquipTags[0]].filter(Boolean)})); 
                      }}
                    >
                      <Text style={[styles.toggleLabel, showSecondEquip ? styles.textBlue : styles.textSlate]}>ADD 2ND</Text>
                      {showSecondEquip ? <ToggleRight size={28} color={COLORS.blue[600]} /> : <ToggleLeft size={28} color={COLORS.slate[300]} />}
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.dropdownStack}>
                  <CustomDropdown 
                    value={newExercise.weightEquipTags[0] || ""} 
                    onChange={(val) => handleEquipChange(0, val)} 
                    options={WEIGHT_EQUIP_TAGS} 
                    placeholder="Select Equipment..." 
                  />
                  {showSecondEquip && (
                    <CustomDropdown 
                      value={newExercise.weightEquipTags[1] || ""} 
                      onChange={(val) => handleEquipChange(1, val)} 
                      options={WEIGHT_EQUIP_TAGS} 
                      placeholder="Select 2nd Equipment..." 
                    />
                  )}
                </View>
              </View>
            </View>
          )}

          {newExercise.category === 'Cardio' && (
            <View style={styles.section}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>CARDIO TYPE</Text>
                <CustomDropdown 
                  value={newExercise.cardioType} 
                  onChange={(val) => setNewExercise({...newExercise, cardioType: val})} 
                  options={CARDIO_TYPES} 
                  placeholder="Select Cardio Type..." 
                />
              </View>
              <View style={styles.divider} />
              <TouchableOpacity onPress={() => setShowWeightEquip(!showWeightEquip)} style={styles.rowBetween}>
                <Text style={styles.label}>WEIGHT EQUIP.</Text>
                <View style={styles.rowGap}>
                  <Text style={[styles.toggleLabel, showWeightEquip ? styles.textBlue : styles.textSlate]}>{showWeightEquip ? "HIDE" : "ADD"}</Text>
                  <ChevronDown size={16} color={showWeightEquip ? COLORS.blue[600] : COLORS.slate[400]} style={{ transform: [{ rotate: showWeightEquip ? '180deg' : '0deg' }] }} />
                </View>
              </TouchableOpacity>
              {showWeightEquip && (
                <View style={styles.marginTop}>
                   <View style={[styles.rowBetween, { marginBottom: 12 }]}>
                      <View />
                      <TouchableOpacity 
                        style={styles.toggleContainer} 
                        onPress={() => { 
                          const newVal = !showSecondEquip; 
                          setShowSecondEquip(newVal); 
                          if (!newVal) setNewExercise(prev => ({...prev, weightEquipTags: [prev.weightEquipTags[0]].filter(Boolean)})); 
                        }}
                      >
                        <Text style={[styles.toggleLabel, showSecondEquip ? styles.textBlue : styles.textSlate]}>ADD 2ND</Text>
                        {showSecondEquip ? <ToggleRight size={28} color={COLORS.blue[600]} /> : <ToggleLeft size={28} color={COLORS.slate[300]} />}
                      </TouchableOpacity>
                   </View>
                   <View style={styles.dropdownStack}>
                      <CustomDropdown value={newExercise.weightEquipTags[0] || ""} onChange={(val) => handleEquipChange(0, val)} options={WEIGHT_EQUIP_TAGS} placeholder="Select Equipment..." />
                      {showSecondEquip && <CustomDropdown value={newExercise.weightEquipTags[1] || ""} onChange={(val) => handleEquipChange(1, val)} options={WEIGHT_EQUIP_TAGS} placeholder="Select 2nd Equipment..." />}
                   </View>
                </View>
              )}
            </View>
          )}

          {newExercise.category === 'Training' && (
             <View style={styles.section}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>TRAINING FOCUS</Text>
                  <CustomDropdown value={newExercise.trainingFocus} onChange={(val) => setNewExercise({...newExercise, trainingFocus: val})} options={TRAINING_FOCUS} placeholder="Select Training Focus..." />
                </View>
                <View style={styles.divider} />
                <TouchableOpacity onPress={() => setShowWeightEquip(!showWeightEquip)} style={styles.rowBetween}>
                  <Text style={styles.label}>WEIGHT EQUIP.</Text>
                  <View style={styles.rowGap}>
                    <Text style={[styles.toggleLabel, showWeightEquip ? styles.textBlue : styles.textSlate]}>{showWeightEquip ? "HIDE" : "ADD"}</Text>
                    <ChevronDown size={16} color={showWeightEquip ? COLORS.blue[600] : COLORS.slate[400]} style={{ transform: [{ rotate: showWeightEquip ? '180deg' : '0deg' }] }} />
                  </View>
                </TouchableOpacity>
                {showWeightEquip && (
                  <View style={styles.marginTop}>
                     <View style={[styles.rowBetween, { marginBottom: 12 }]}>
                        <View />
                        <View style={styles.rowGap}>
                          <TouchableOpacity style={styles.toggleContainer} onPress={() => setNewExercise(prev => ({ ...prev, trackDuration: !prev.trackDuration }))}>
                            <Text style={[styles.toggleLabel, newExercise.trackDuration ? styles.textBlue : styles.textSlate]}>DURATION</Text>
                            {newExercise.trackDuration ? <ToggleRight size={28} color={COLORS.blue[600]} /> : <ToggleLeft size={28} color={COLORS.slate[300]} />}
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.toggleContainer} 
                            onPress={() => { 
                              const newVal = !showSecondEquip; 
                              setShowSecondEquip(newVal); 
                              if (!newVal) setNewExercise(prev => ({...prev, weightEquipTags: [prev.weightEquipTags[0]].filter(Boolean)})); 
                            }}
                          >
                            <Text style={[styles.toggleLabel, showSecondEquip ? styles.textBlue : styles.textSlate]}>ADD 2ND</Text>
                            {showSecondEquip ? <ToggleRight size={28} color={COLORS.blue[600]} /> : <ToggleLeft size={28} color={COLORS.slate[300]} />}
                          </TouchableOpacity>
                        </View>
                     </View>
                     <View style={styles.dropdownStack}>
                        <CustomDropdown value={newExercise.weightEquipTags[0] || ""} onChange={(val) => handleEquipChange(0, val)} options={WEIGHT_EQUIP_TAGS} placeholder="Select Equipment..." />
                        {showSecondEquip && <CustomDropdown value={newExercise.weightEquipTags[1] || ""} onChange={(val) => handleEquipChange(1, val)} options={WEIGHT_EQUIP_TAGS} placeholder="Select 2nd Equipment..." />}
                     </View>
                  </View>
                )}
             </View>
          )}

          {newExercise.category && (
            <View style={styles.section}>
               <View style={styles.divider} />
               <TouchableOpacity onPress={() => setShowDescription(!showDescription)} style={styles.rowBetween}>
                  <Text style={styles.label}>DESCRIPTION</Text>
                  <View style={styles.rowGap}>
                    <Text style={[styles.toggleLabel, showDescription ? styles.textBlue : styles.textSlate]}>{showDescription ? "HIDE" : "ADD"}</Text>
                    <ChevronDown size={16} color={showDescription ? COLORS.blue[600] : COLORS.slate[400]} style={{ transform: [{ rotate: showDescription ? '180deg' : '0deg' }] }} />
                  </View>
               </TouchableOpacity>
               {showDescription && (
                 <View style={styles.marginTop}>
                   <TextInput 
                     style={styles.textArea}
                     placeholder="Add notes about form, cues, or setup..."
                     placeholderTextColor={COLORS.slate[400]}
                     multiline
                     numberOfLines={3}
                     value={newExercise.description}
                     onChangeText={text => setNewExercise({...newExercise, description: text})}
                   />
                 </View>
               )}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleSave} 
            disabled={!newExercise.name || !newExercise.category || (newExercise.category === 'Lifts' && newExercise.primaryMuscles.length === 0)}
            style={[styles.saveButton, (!newExercise.name || !newExercise.category || (newExercise.category === 'Lifts' && newExercise.primaryMuscles.length === 0)) && styles.saveButtonDisabled]}
          >
            <Text style={styles.saveButtonText}>Save Exercise</Text>
          </TouchableOpacity>
        </View>

        {/* Secondary Selection Popup */}
        <Modal visible={!!activePrimaryForPopup} transparent animationType="fade" onRequestClose={() => setActivePrimaryForPopup(null)}>
           <TouchableOpacity style={styles.popupOverlay} activeOpacity={1} onPress={() => setActivePrimaryForPopup(null)}>
              <View style={styles.popupContent} onStartShouldSetResponder={() => true}>
                 <View style={styles.popupHeader}>
                    <Text style={styles.popupTitle}>{activePrimaryForPopup} <Text style={styles.popupSubtitle}>Secondary Muscles</Text></Text>
                    <TouchableOpacity onPress={() => setActivePrimaryForPopup(null)}><Text style={styles.popupSkip}>Skip</Text></TouchableOpacity>
                 </View>
                 <View style={styles.popupChips}>
                    {getAvailableSecondaryMuscles(activePrimaryForPopup).map(m => (
                       <Chip key={m} label={m} selected={newExercise.secondaryMuscles.includes(m)} onClick={() => toggleSelection('secondaryMuscles', m)} />
                    ))}
                 </View>
                 <TouchableOpacity onPress={() => setActivePrimaryForPopup(null)} style={styles.popupDoneButton}>
                    <Text style={styles.popupDoneText}>Done</Text>
                 </TouchableOpacity>
              </View>
           </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
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
  fieldGroup: {
    marginBottom: 24,
  },
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
    shadowColor: "#000",
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
  section: {
    marginTop: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.slate[100],
    marginVertical: 16,
  },
  rowGap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  dropdownStack: {
    gap: 12,
  },
  marginTop: {
    marginTop: 12,
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

export default NewExercise;

