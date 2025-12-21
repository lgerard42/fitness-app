import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Platform } from 'react-native';
import { Pin, Trash2, ChevronDown, Calendar } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../constants/colors';

const SavedNoteItem = ({ note, onPin, onRemove, onUpdate, readOnly = false }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleTextChange = (text) => {
    if (onUpdate) onUpdate({ ...note, text });
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate && onUpdate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      onUpdate({ ...note, date: dateString });
    }
  };

  return (
    <View style={[
      styles.container,
      note.pinned ? styles.pinnedContainer : styles.defaultContainer
    ]}>
      <TouchableOpacity 
        onPress={() => setIsExpanded(!isExpanded)}
        style={styles.header}
      >
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={(e) => { 
              e.stopPropagation(); 
              if (!readOnly && onPin) onPin(note.id); 
            }}
            style={styles.iconButton}
            disabled={readOnly}
          >
            <Pin 
              size={14} 
              color={note.pinned ? COLORS.amber[500] : COLORS.slate[400]} 
              fill={note.pinned ? COLORS.amber[500] : 'transparent'}
            />
          </TouchableOpacity>
          
          <View style={styles.dateContainer}>
            <Calendar size={10} color={COLORS.slate[500]} />
            {isExpanded && !readOnly ? (
              Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={new Date(note.date)}
                  mode="date"
                  display="compact"
                  onChange={onDateChange}
                  style={{ transform: [{ scale: 0.8 }], marginLeft: -10 }}
                />
              ) : (
                <>
                  <TouchableOpacity 
                    onPress={(e) => {
                      e.stopPropagation();
                      setShowDatePicker(true);
                    }}
                  >
                    <Text style={styles.dateInput}>{note.date}</Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={new Date(note.date)}
                      mode="date"
                      display="default"
                      onChange={onDateChange}
                    />
                  )}
                </>
              )
            ) : (
              <Text style={styles.dateText}>
                {new Date(note.date).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.headerRight}>
          {!readOnly && (
            <TouchableOpacity 
              onPress={(e) => { e.stopPropagation(); onRemove(note.id); }}
              style={styles.iconButton}
            >
              <Trash2 size={14} color={COLORS.slate[300]} />
            </TouchableOpacity>
          )}
          
          <ChevronDown 
            size={14} 
            color={COLORS.slate[400]} 
            style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
          />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.content}>
          {readOnly ? (
            <Text style={styles.contentText}>{note.text}</Text>
          ) : (
            <TextInput
              value={note.text}
              onChangeText={handleTextChange}
              style={styles.contentInput}
              multiline
              placeholder="Add a note..."
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 8,
  },
  defaultContainer: {
    backgroundColor: COLORS.slate[50],
    borderColor: COLORS.slate[100],
  },
  pinnedContainer: {
    backgroundColor: '#fffbeb80', // amber-50 with opacity
    borderColor: COLORS.amber[200],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.slate[500],
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  contentText: {
    fontSize: 14,
    color: COLORS.slate[700],
  },
  dateInput: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.slate[700],
    padding: 0,
    minWidth: 80,
  },
  contentInput: {
    fontSize: 14,
    color: COLORS.slate[700],
    padding: 0,
    minHeight: 20,
  },
});

export default SavedNoteItem;
