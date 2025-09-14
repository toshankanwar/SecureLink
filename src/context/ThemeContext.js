import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Appearance } from 'react-native';
import { getTheme } from '../styles/colors';
import { THEME_TYPES, STORAGE_KEYS } from '../utils/constants';
import StorageService from '../services/storage';

const ThemeContext = createContext();

const initialState = {
  isDark: Appearance.getColorScheme() === 'dark',
  theme: getTheme(Appearance.getColorScheme() === 'dark'),
};

function themeReducer(state, action) {
  switch (action.type) {
    case 'TOGGLE_THEME':
      const newIsDark = !state.isDark;
      return {
        isDark: newIsDark,
        theme: getTheme(newIsDark),
      };
    case 'SET_THEME':
      return {
        isDark: action.payload,
        theme: getTheme(action.payload),
      };
    default:
      return state;
  }
}

export function ThemeProvider({ children }) {
  const [state, dispatch] = useReducer(themeReducer, initialState);

  useEffect(() => {
    loadThemePreference();
    
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      dispatch({ type: 'SET_THEME', payload: colorScheme === 'dark' });
    });

    return () => subscription?.remove();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await StorageService.getData(STORAGE_KEYS.THEME);
      if (savedTheme !== null) {
        dispatch({ type: 'SET_THEME', payload: savedTheme === THEME_TYPES.DARK });
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newIsDark = !state.isDark;
      await StorageService.storeData(
        STORAGE_KEYS.THEME, 
        newIsDark ? THEME_TYPES.DARK : THEME_TYPES.LIGHT
      );
      dispatch({ type: 'TOGGLE_THEME' });
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        ...state,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
