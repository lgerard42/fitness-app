import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';
import { COLORS } from '../../../../constants/colors';

const SearchBar = ({ search, setSearch }) => {
  return (
    <View style={styles.searchContainer}>
      <Search size={18} color={COLORS.slate[400]} style={styles.searchIcon} />
      <TextInput 
        style={styles.searchInput}
        placeholder="Search exercises..."
        placeholderTextColor={COLORS.slate[400]}
        value={search}
        onChangeText={setSearch}
        autoFocus={false} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    position: 'relative',
    marginBottom: 12,
    zIndex: 1,
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: 10,
    zIndex: 2,
  },
  searchInput: {
    backgroundColor: COLORS.slate[100],
    borderRadius: 999,
    paddingLeft: 40,
    paddingRight: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.slate[900],
  },
});

export default SearchBar;

