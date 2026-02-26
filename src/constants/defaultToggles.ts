import { COLORS } from './colors';

type ToggleThemeStyles = {
  container: Record<string, unknown>;
  button: Record<string, unknown>;
  buttonSelected: Record<string, unknown>;
  buttonUnselected: Record<string, unknown>;
  text: Record<string, unknown>;
  textSelected: Record<string, unknown>;
  textUnselected: Record<string, unknown>;
};

export const defaultToggleStyles: { dark: ToggleThemeStyles; light: ToggleThemeStyles } = {
    dark: {
        container: {
            flexDirection: 'row',
            backgroundColor: COLORS.slate[700],
            padding: 4,
            borderRadius: 8,
        },
        button: {
            flex: 1,
            paddingVertical: 8,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
            minHeight: 36,
        },
        buttonSelected: {
            backgroundColor: COLORS.slate[900],
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
        },
        buttonUnselected: {
            backgroundColor: 'transparent',
        },
        text: {
            fontSize: 12,
            fontWeight: 'bold',
        },
        textSelected: {
            color: COLORS.white,
        },
        textUnselected: {
            color: COLORS.slate[400],
        },
    },
    light: {
        container: {
            flexDirection: 'row',
            backgroundColor: COLORS.slate[100],
            padding: 4,
            borderRadius: 12,
        },
        button: {
            flex: 1,
            paddingVertical: 8,
            alignItems: 'center',
            borderRadius: 8,
        },
        buttonSelected: {
            backgroundColor: COLORS.white,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
        },
        buttonUnselected: {
            backgroundColor: 'transparent',
        },
        text: {
            fontSize: 12,
            fontWeight: 'bold',
        },
        textSelected: {
            color: COLORS.slate[900],
        },
        textUnselected: {
            color: COLORS.slate[500],
        },
    },
};
