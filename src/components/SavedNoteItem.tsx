import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Platform } from 'react-native';
import { Pin, Trash2 } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '@/constants/colors';
import type { Note } from '@/types/workout';

interface SavedNoteItemProps {
  note: Note;
  onPin: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (note: Note) => void;
  readOnly?: boolean;
}

const SavedNoteItem: React.FC<SavedNoteItemProps> = ({ note, onPin, onRemove, onUpdate, readOnly = false }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleTextChange = (text: string) => {
    if (onUpdate) onUpdate({ ...note, text });
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate && onUpdate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      onUpdate({ ...note, date: dateString });
    }
  };

  const formatDateText = () => {
    const date = new Date(note.date);
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const calculateTimeAgo = () => {
    const noteDate = new Date(note.date);
    const today = new Date();
    
    noteDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - noteDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return '';
    if (diffDays === 0) return '';
    
    const months = Math.floor(diffDays / 30);
    const remainingDaysAfterMonths = diffDays % 30;
    const weeks = Math.floor(remainingDaysAfterMonths / 7);
    const days = remainingDaysAfterMonths % 7;
    
    const parts: string[] = [];
    if (months > 0) parts.push(`${months}m`);
    if (weeks > 0) parts.push(`${weeks}w`);
    if (days > 0) parts.push(`${days}d`);
    
    return parts.length > 0 ? ` — ${parts.join(' ')}` : '';
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
          <View style={styles.dateContainer}>
            {isExpanded && !readOnly ? (
              Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={new Date(note.date)}
                  mode="date"
                  display="compact"
                  onChange={onDateChange}
                  style={{ transform: [{ scale: 0.8 }], marginLeft: -15 }}
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
                {formatDateText()}{note.pinned ? calculateTimeAgo() : ''}
              </Text>
            )}
          </View>

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
              fill="transparent"
            />
          </TouchableOpacity>
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
    borderRadius: 4,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 4,
  },
  defaultContainer: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.slate[100],
  },
  pinnedContainer: {
    backgroundColor: '#fffbeb80',
    borderColor: COLORS.amber[200],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 8,
    paddingRight: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
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
    paddingLeft: 8,
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
