import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { COLORS } from '../../../../constants/colors';

const ExerciseListItem = ({ 
  item, 
  isSelected, 
  isLastSelected, 
  selectionOrder, 
  onToggle,
  hideNumber = false,
  isReordering = false,
  isReordered = false,
  showAddMore = false,
  onAddMore = null,
  onRemoveSet = null,
  selectedCount = 0,
  selectedInListStyle = null,
  selectedInListNameStyle = null,
  renderingSection = null, // 'selectedSection' | 'unselectedList' | null
}) => {
  const handlePress = () => {
    // In selectedSection, container click does nothing - user must use +/- buttons
    if (renderingSection === 'selectedSection') {
      return;
    }
    
    if (isSelected && showAddMore && onRemoveSet) {
      // If already selected, clicking container removes one set (only in unselectedList)
      onRemoveSet(item.id);
    } else if (onToggle) {
      // If unselected, clicking container adds one set
      onToggle(item.id);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    if (onRemoveSet) {
      onRemoveSet(item.id);
    }
  };

  const handleAdd = (e) => {
    e.stopPropagation();
    if (showAddMore && onAddMore) {
      // For selected exercises, add another set
      onAddMore(item.id);
    } else if (onToggle) {
      // For unselected exercises, use onToggle to add
      onToggle(item.id);
    }
  };

  // Define styling condition variables
  const container_selectedInSection = isSelected && !showAddMore;
  const container_selectedInList = isSelected && showAddMore;
  const container_lastSelected = isLastSelected;
  const container_reorderingMode = isReordering && !isReordered;
  const container_reorderedItem = isReordering && isReordered;
  const container_addMoreMode = showAddMore;

  const text_selectedInSection = isSelected && !showAddMore;
  const text_selectedInList = isSelected && showAddMore;
  const text_reorderingMode = isReordering && !isReordered;
  const text_addMoreMode = showAddMore;

  const tagContainer_addMoreMode = showAddMore;
  const tagText_addMoreMode = showAddMore;
  
  const muscleTagContainer_addMoreMode = showAddMore;
  const muscleTagText_addMoreMode = showAddMore;

  const checkbox_reorderingUnmoved = isReordering && !isReordered;
  const checkbox_reorderingMoved = isReordering && isReordered;

  // Determine if we should show the count badge next to name (selected, non-reorder, only in unselectedList)
  const showCountBadge = isSelected && selectedCount > 0 ;

  // Determine if we should show the + button (selected, non-reorder)
  const showAddRemoveButtons = isSelected && !isReordering && showAddMore;
  
  // Determine if we should show just the + button (unselected, non-reorder)
  const showAddButtonOnly = !isSelected && !isReordering;

  // Button style condition variables
  const addButton_selected = isSelected && !isReordering;
  const addButton_unselected = !isSelected && !isReordering;
  const removeButton_selected = isSelected && !isReordering;

  return (
    <TouchableOpacity 
      onPress={handlePress}
      style={[
        {
          paddingLeft: 16,
          paddingRight: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.slate[50],
        }, 
        container_selectedInSection && {
          backgroundColor: COLORS.blue[50],
          borderBottomColor: COLORS.white,
          paddingRight: 32,
        },
        container_selectedInSection && renderingSection === 'selectedSection' && {
        },
        container_selectedInList && {
          backgroundColor: COLORS.blue[50],
          borderBottomColor: COLORS.slate[100],
        },
        container_selectedInList && renderingSection === 'unselectedList' && {
        },
        container_lastSelected && {
          borderBottomColor: COLORS.slate[100],
        },
        container_reorderingMode && {
          backgroundColor: COLORS.white,
          borderBottomColor: COLORS.blue[100],
        },
        container_reorderedItem && {
          backgroundColor: COLORS.blue[50],
          borderBottomColor: COLORS.blue[100],
        },
        container_addMoreMode && {
        },
        selectedInListStyle,
      ]}
    >
      <View style={{ flex: 1 }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}>
          <Text style={[
            {
              fontSize: 16,
              fontWeight: 'bold',
              color: COLORS.slate[900],
            }, 
            text_selectedInSection && {
              color: COLORS.blue[600],
            },
            text_selectedInSection && renderingSection === 'selectedSection' && {
            },
            text_selectedInList && {
              color: COLORS.slate[900],
            },
            text_selectedInList && renderingSection === 'unselectedList' && {
            },
            text_reorderingMode && {
              color: COLORS.amber[600],
            },
            text_addMoreMode && {
            },
            selectedInListNameStyle,
          ]}>
            {item.name}
          </Text>
          {showCountBadge && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 4,
              paddingVertical: 2,
              borderRadius: 12,
              backgroundColor: COLORS.blue[50],
            }}>
              <Text style={{
                color: COLORS.slate[600],
                fontSize: 14,
                fontWeight: 'normal',
                marginRight: 1,
              }}>+</Text>
              <Text style={{
                color: COLORS.blue[600],
                fontSize: 14,
                fontWeight: 'bold',
              }}>{selectedCount}</Text>
            </View>
          )}
        </View>
        <View style={{
          flexDirection: 'row',
          gap: 8,
          marginTop: 4,
        }}>
          <View style={[
            {
              backgroundColor: COLORS.slate[100],
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
            },
            tagContainer_addMoreMode && {
            },
            tagContainer_addMoreMode && renderingSection === 'unselectedList' && {
            }
          ]}>
            <Text style={[
              {
                fontSize: 10,
                color: COLORS.slate[500],
              },
              tagText_addMoreMode && {
              },
              tagText_addMoreMode && renderingSection === 'unselectedList' && {
              }
            ]}>{item.category}</Text>
          </View>
          {item.primaryMuscles.slice(0, 2).map(m => (
            <View key={m} style={[
              {
                backgroundColor: COLORS.indigo[50],
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
              },
              muscleTagContainer_addMoreMode && {
              },
              muscleTagContainer_addMoreMode && renderingSection === 'unselectedList' && {
              }
            ]}>
              <Text style={[
                {
                  fontSize: 10,
                  color: COLORS.indigo[600],
                },
              muscleTagText_addMoreMode && {
              },
              muscleTagText_addMoreMode && renderingSection === 'unselectedList' && {
              }
              ]}>{m}</Text>
            </View>
          ))}
        </View>
      </View>
      {showAddRemoveButtons ? (
        renderingSection === 'selectedSection' ? (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}>
            <TouchableOpacity
              onPress={handleRemove}
              style={[
                {
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: COLORS.white,
                  borderWidth: 1,
                  borderColor: COLORS.slate[300],
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                removeButton_selected && {
                },
                removeButton_selected && renderingSection === 'selectedSection' && {
                },
                removeButton_selected && renderingSection === 'unselectedList' && {
                }
              ]}
            >
              <Text style={[
                {
                  color: COLORS.slate[700],
                  fontSize: 14,
                  fontWeight: 'bold',
                  lineHeight: 16,
                },
                removeButton_selected && {
                },
                removeButton_selected && renderingSection === 'selectedSection' && {
                },
                removeButton_selected && renderingSection === 'unselectedList' && {
                }
              ]}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAdd}
              style={[
                {
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: COLORS.slate[50],
                  borderWidth: 1,
                  borderColor: COLORS.blue[400],
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                addButton_selected && {
                },
                addButton_selected && renderingSection === 'selectedSection' && {
                  backgroundColor: COLORS.blue[600],
                  borderWidth: 1,
                  borderColor: COLORS.blue[600], 
                },
                addButton_selected && renderingSection === 'unselectedList' && {
                }
              ]}
            >
              <Text style={[
                {
                  color: COLORS.blue[500],
                  fontSize: 14,
                  fontWeight: 'bold',
                  lineHeight: 16,
                },
                addButton_selected && {
                },
                addButton_selected && renderingSection === 'selectedSection' && {
                  color: COLORS.white,
                },
                addButton_selected && renderingSection === 'unselectedList' && {
                }
              ]}>+</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleAdd}
            style={[
              {
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: COLORS.slate[50],
                borderWidth: 1,
                borderColor: COLORS.blue[400],
                alignItems: 'center',
                justifyContent: 'center',
              },
              addButton_selected && {
              },
              addButton_selected && renderingSection === 'selectedSection' && {
                backgroundColor: COLORS.blue[600],
                borderWidth: 1,
                borderColor: COLORS.blue[600], 
              },
              addButton_selected && renderingSection === 'unselectedList' && {
              }
            ]}
          >
            <Text style={[
              {
                color: COLORS.blue[500],
                fontSize: 14,
                fontWeight: 'bold',
                lineHeight: 16,
              },
              addButton_selected && {
              },
              addButton_selected && renderingSection === 'selectedSection' && {
                color: COLORS.white,
              },
              addButton_selected && renderingSection === 'unselectedList' && {
              }
            ]}>+</Text>
          </TouchableOpacity>
        )
      ) : showAddButtonOnly ? (
        <TouchableOpacity
          onPress={handleAdd}
          style={[
            {
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: COLORS.slate[50],
              borderWidth: 1,
              borderColor: COLORS.slate[300],
              alignItems: 'center',
              justifyContent: 'center',
            },
            addButton_unselected && {
            },
            addButton_unselected && renderingSection === 'selectedSection' && {
            },
            addButton_unselected && renderingSection === 'unselectedList' && {
            }
          ]}
        >
          <Text style={[
            {
              color: COLORS.slate[300],
              fontSize: 14,
              fontWeight: 'bold',
              lineHeight: 16,
            },
            addButton_unselected && {
            },
            addButton_unselected && renderingSection === 'selectedSection' && {
            },
            addButton_unselected && renderingSection === 'unselectedList' && {
            }
          ]}>+</Text>
        </TouchableOpacity>
      ) : (
        <View style={[
          {
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 2,
            alignItems: 'center',
            justifyContent: 'center',
          },
          checkbox_reorderingUnmoved && {
            backgroundColor: 'transparent',
            borderColor: COLORS.amber[400],
            borderStyle: 'dashed',
          },
          checkbox_reorderingMoved && {
            backgroundColor: COLORS.forestgreen[100],
            borderColor: COLORS.forestgreen[150],
          }
        ]}>
          {isSelected && !hideNumber ? (
            <Text style={{
              color: COLORS.green[500],
              fontSize: 12,
              fontWeight: 'bold',
            }}>{selectionOrder}</Text>
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
};

export default ExerciseListItem;