import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { Z_INDEX, PADDING, BORDER_RADIUS } from '@/constants/layout';

interface SearchBarProps {
  search: string;
  setSearch: (search: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ search, setSearch }) => {
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
    marginBottom: PADDING.base,
    zIndex: 1,
  },
  searchIcon: {
    position: 'absolute',
    left: PADDING.base,
    top: 10,
    zIndex: 2,
  },
  searchInput: {
    backgroundColor: COLORS.slate[100],
    borderRadius: BORDER_RADIUS.full,
    paddingLeft: 40,
    paddingRight: PADDING.lg,
    paddingVertical: PADDING.base,
    fontSize: 14,
    color: COLORS.slate[900],
  },
});

export default SearchBar;
