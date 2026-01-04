import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Check } from 'lucide-react-native';
import { COLORS } from '../../../../constants/colors';

const FilterDropdown = ({ 
  label, 
  value, 
  options, 
  type, 
  leftAligned = false, 
  fullWidthContainer = false,
  openFilter,
  setOpenFilter,
  onToggleOption,
  filterMuscle
}) => {
  const isActive = Array.isArray(value) ? value.length > 0 : value !== "All";
  const displayText = Array.isArray(value) 
    ? (value.length === 0 ? label : value.length === 1 ? value[0] : `${value.length} selected`)
    : (value === "All" ? label : value);
  
  // Define styling condition variables
  const container_fullWidth = fullWidthContainer;
  const button_active = isActive;
  const button_inactive = !isActive;
  const button_muscleFilterPrimary = type === 'muscle' && filterMuscle.length > 0;
  const buttonText_active = isActive;
  const menu_leftAligned = leftAligned;

  return (
    <View style={[
      {
        flex: 1,
        position: 'relative',
        minWidth: 0,
      },
      container_fullWidth && {
        position: 'relative',
        zIndex: 1,
        flexShrink: 1,
      }
    ]}>
      <TouchableOpacity 
        onPress={() => setOpenFilter(openFilter === type ? null : type)}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8,
            borderWidth: 1,
            minHeight: 0,
          },
          button_active && {
            backgroundColor: COLORS.blue[100],
            borderColor: COLORS.blue[200],
          },
          button_inactive && {
            backgroundColor: COLORS.slate[100],
            borderColor: 'transparent',
          },
          button_muscleFilterPrimary && {
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
            borderRightWidth: 0,
          }
        ]}
      >
        <Text style={[
          {
            fontSize: 12,
            fontWeight: 'bold',
            color: COLORS.slate[600],
            textAlign: 'center',
          },
          buttonText_active && {
            color: COLORS.blue[700],
          }
        ]} numberOfLines={1}>
          {displayText}
        </Text>
      </TouchableOpacity>
      
      {openFilter === type && !fullWidthContainer && (
        <View 
          style={[
            {
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: 4,
              backgroundColor: COLORS.white,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: COLORS.slate[200],
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
              zIndex: 100,
              overflow: 'hidden',
            }, 
            menu_leftAligned && {
              right: 'auto',
              minWidth: 180,
            }
          ]}
          pointerEvents="box-none"
        >
          {options.map((item) => {
            const isSelected = Array.isArray(value) ? value.includes(item) : value === item;
            
            // Define option specific styling conditions
            const option_selected = isSelected;
            const optionText_selected = isSelected;

            return (
              <TouchableOpacity
                key={item}
                onPress={() => onToggleOption(type, item, value)}
                style={[
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    backgroundColor: COLORS.slate[600],
                  },
                  option_selected && {
                    backgroundColor: COLORS.blue[500],
                  }
                ]}
              >
                <Text style={[
                  {
                    fontSize: 14,
                    fontWeight: 'bold',
                    color: COLORS.white,
                  },
                  optionText_selected && {
                    color: COLORS.white,
                  }
                ]}>
                  {item}
                </Text>
                {isSelected && <Check size={12} color={COLORS.white} />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

export default FilterDropdown;