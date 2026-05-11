import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'porashikhi.ui.theme.v1';

type ColorTokens = {
  // backgrounds
  bgScreen: string;
  bgSurface: string;
  bgSubtle: string;
  bgWarm: string;
  bgOrangeTint: string;
  bgGreenTint: string;
  bgRedTint: string;
  bgCream: string;
  bgGrey: string;
  bgBlueTint: string;
  bgProgressTrack: string;
  bgLetterProgressTrack: string;
  bgCloseButton: string;
  // text
  textHeading: string;
  textBody: string;
  textMuted: string;
  textSecondary: string;
  textDisabled: string;
  textFaint: string;
  textLetterGlyph: string;
  textNavInactive: string;
  textDark: string;
  textSuccess: string;
  textDanger: string;
  textWarning: string;
  textOnDark: string;
  textYellow: string;
  textAccent: string;
  textBlue: string;
  textClose: string;
  // borders
  borderDefault: string;
  borderSubtle: string;
  borderWarm: string;
  borderGrey: string;
  borderRed: string;
  borderOrange: string;
  borderGreen: string;
  borderGreenBright: string;
  borderPeach: string;
  borderBlue: string;
  // fills
  fillTeal: string;
  fillOrange: string;
  fillTeal2: string;
  fillAmber: string;
  fillAccent: string;
  // specials
  backdropOverlay: string;
  progressBreakpoint: string;
  tooltipBg: string;
  tooltipDivider: string;
  tooltipLabel: string;
  tooltipValue: string;
};

const LIGHT: ColorTokens = {
  bgScreen: '#f7f3e8',
  bgSurface: '#ffffff',
  bgSubtle: '#fffdf7',
  bgWarm: '#fffbeb',
  bgOrangeTint: '#fff7ed',
  bgGreenTint: '#ecfdf3',
  bgRedTint: '#fff1f2',
  bgCream: '#fffaf0',
  bgGrey: '#f1f1f1',
  bgBlueTint: '#eff6ff',
  bgProgressTrack: '#fbf6e9',
  bgLetterProgressTrack: '#f8f1e3',
  bgCloseButton: '#fee2e2',
  textHeading: '#111827',
  textBody: '#4b5563',
  textMuted: '#8b8790',
  textSecondary: '#6b7280',
  textDisabled: '#9ca3af',
  textFaint: '#b8b8b8',
  textLetterGlyph: '#b9b2a6',
  textNavInactive: '#6f7080',
  textDark: '#374151',
  textSuccess: '#047857',
  textDanger: '#be123c',
  textWarning: '#c2410c',
  textOnDark: '#ffffff',
  textYellow: '#facc15',
  textAccent: '#f4512a',
  textBlue: '#1d4ed8',
  textClose: '#ef4444',
  borderDefault: '#e8deca',
  borderSubtle: '#ece5d5',
  borderWarm: '#e5ddc7',
  borderGrey: '#e5e7eb',
  borderRed: '#fecaca',
  borderOrange: '#fed7aa',
  borderGreen: '#bbf7d0',
  borderGreenBright: '#86efac',
  borderPeach: '#fdba74',
  borderBlue: '#bae6fd',
  fillTeal: '#88d4c9',
  fillOrange: '#f97316',
  fillTeal2: '#14b8a6',
  fillAmber: '#f59e0b',
  fillAccent: '#f4512a',
  backdropOverlay: 'rgba(17, 24, 39, 0.38)',
  progressBreakpoint: 'rgba(143, 130, 105, 0.18)',
  tooltipBg: '#1f2937',
  tooltipDivider: '#374151',
  tooltipLabel: '#9ca3af',
  tooltipValue: '#f3f4f6',
};

const DARK: ColorTokens = {
  bgScreen: '#0f0e0b',
  bgSurface: '#1c1a15',
  bgSubtle: '#1a1810',
  bgWarm: '#1e1b10',
  bgOrangeTint: '#1f1509',
  bgGreenTint: '#0a1f13',
  bgRedTint: '#1f0a0c',
  bgCream: '#1a1810',
  bgGrey: '#252520',
  bgBlueTint: '#0a1228',
  bgProgressTrack: '#18160f',
  bgLetterProgressTrack: '#1c1810',
  bgCloseButton: '#3d0f0f',
  textHeading: '#f0ece0',
  textBody: '#9fa5b0',
  textMuted: '#706c75',
  textSecondary: '#8b8f97',
  textDisabled: '#4b4f57',
  textFaint: '#3a3a3a',
  textLetterGlyph: '#5a5550',
  textNavInactive: '#7a7a8a',
  textDark: '#b0b8c4',
  textSuccess: '#34d399',
  textDanger: '#fb7185',
  textWarning: '#fb923c',
  textOnDark: '#ffffff',
  textYellow: '#facc15',
  textAccent: '#f4512a',
  textBlue: '#60a5fa',
  textClose: '#ef4444',
  borderDefault: '#2a261d',
  borderSubtle: '#252018',
  borderWarm: '#2e2820',
  borderGrey: '#27272a',
  borderRed: '#7f1d1d',
  borderOrange: '#7c2d12',
  borderGreen: '#14532d',
  borderGreenBright: '#166534',
  borderPeach: '#7c3a12',
  borderBlue: '#0c4a6e',
  fillTeal: '#0d9488',
  fillOrange: '#ea580c',
  fillTeal2: '#0d9488',
  fillAmber: '#d97706',
  fillAccent: '#e84016',
  backdropOverlay: 'rgba(0, 0, 0, 0.55)',
  progressBreakpoint: 'rgba(255, 255, 255, 0.10)',
  tooltipBg: '#0d1117',
  tooltipDivider: '#21262d',
  tooltipLabel: '#8b949e',
  tooltipValue: '#c9d1d9',
};

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.bgScreen,
    },
    shell: {
      flex: 1,
      width: '100%',
      maxWidth: 520,
      alignSelf: 'center',
      gap: 8,
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 10,
    },
    header: {
      minHeight: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerSpacer: {
      width: 44,
    },
    titleBlock: {
      flex: 1,
      alignItems: 'center',
      gap: 3,
    },
    brand: {
      color: c.textHeading,
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: 0,
    },
    stage: {
      color: c.textBody,
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 0,
    },
    practiceContent: {
      flex: 1,
      justifyContent: 'space-between',
      gap: 16,
    },
    progressStack: {
      gap: 8,
      marginTop: -2,
    },
    progressBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 32,
    },
    progressLabel: {
      color: c.textMuted,
      width: 68,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0,
    },
    progressValue: {
      color: c.textMuted,
      flexShrink: 0,
      width: 84,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0,
      textAlign: 'right',
    },
    progressTrack: {
      position: 'relative',
      flex: 1,
      height: 20,
      overflow: 'hidden',
      borderColor: c.borderDefault,
      borderRadius: 10,
      borderWidth: 1,
      backgroundColor: c.bgProgressTrack,
    },
    progressFill: {
      height: '100%',
      borderRadius: 10,
      backgroundColor: c.fillTeal,
    },
    progressBreakpoint: {
      position: 'absolute',
      top: 2,
      bottom: 2,
      width: 1,
      backgroundColor: c.progressBreakpoint,
    },
    card: {
      flex: 1,
      minHeight: 250,
      flexDirection: 'column',
      overflow: 'hidden',
      borderColor: c.textHeading,
      borderRadius: 8,
      borderWidth: 2,
      backgroundColor: c.bgSurface,
      paddingHorizontal: 24,
      paddingBottom: 26,
      paddingTop: 26,
    },
    glyphZone: {
      flex: 1,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    stripZone: {
      width: '100%',
      alignItems: 'center',
      paddingTop: 4,
      paddingBottom: 4,
    },
    cardAccent: {
      position: 'absolute',
      width: 104,
      height: 10,
      borderRadius: 5,
      opacity: 0.5,
    },
    cardAccentTop: {
      top: 24,
      left: -28,
      backgroundColor: c.fillAmber,
    },
    cardAccentBottom: {
      right: -24,
      bottom: 30,
      backgroundColor: c.fillTeal2,
    },
    letter: {
      color: c.textHeading,
      fontSize: 168,
      fontWeight: '700',
      letterSpacing: 0,
      textAlign: 'center',
    },
    vowelSignLetter: {
      fontSize: 140,
    },
    letterProgressMark: {
      width: '82%',
      maxWidth: 320,
      minHeight: 60,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderColor: c.borderSubtle,
      borderRadius: 8,
      borderWidth: 1,
      backgroundColor: c.bgSubtle,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    letterProgressGlyph: {
      color: c.textLetterGlyph,
      width: 42,
      fontSize: 32,
      fontWeight: '900',
      includeFontPadding: true,
      letterSpacing: 0,
      lineHeight: 48,
      textAlign: 'center',
    },
    letterProgressBody: {
      flex: 1,
      gap: 6,
    },
    letterProgressTopRow: {
      minHeight: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    letterProgressLabel: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0,
    },
    letterProgressValue: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0,
    },
    letterProgressTrack: {
      position: 'relative',
      height: 18,
      overflow: 'hidden',
      borderColor: c.borderWarm,
      borderRadius: 9,
      borderWidth: 1,
      backgroundColor: c.bgLetterProgressTrack,
    },
    letterProgressFill: {
      height: '100%',
      borderRadius: 9,
      backgroundColor: c.fillOrange,
    },
    letterProgressBreakpoint: {
      position: 'absolute',
      top: 2,
      bottom: 2,
      width: 1,
      backgroundColor: c.progressBreakpoint,
    },
    feedbackBadge: {
      position: 'absolute',
      top: 16,
      right: 16,
      minHeight: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 14,
    },
    feedbackRight: {
      borderColor: c.borderGreenBright,
      backgroundColor: c.bgGreenTint,
    },
    feedbackWrong: {
      borderColor: c.borderOrange,
      backgroundColor: c.bgOrangeTint,
    },
    feedbackText: {
      fontSize: 16,
      fontWeight: '900',
      letterSpacing: 0,
    },
    feedbackRightText: {
      color: c.textSuccess,
    },
    feedbackWrongText: {
      color: c.textWarning,
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
    },
    actionButton: {
      flex: 1,
      minHeight: 68,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      borderWidth: 1,
      userSelect: 'none',
    },
    wrongButton: {
      borderColor: c.borderRed,
      backgroundColor: c.bgRedTint,
    },
    rightButton: {
      borderColor: c.borderGreen,
      backgroundColor: c.bgGreenTint,
    },
    buttonPressed: {
      opacity: 0.72,
      transform: [{ scale: 0.99 }],
    },
    actionText: {
      fontSize: 24,
      fontWeight: '800',
      letterSpacing: 0,
      userSelect: 'none',
    },
    wrongText: {
      color: c.textDanger,
    },
    rightText: {
      color: c.textSuccess,
    },
    lettersScreen: {
      flex: 1,
      gap: 14,
    },
    lettersTopRow: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
    },
    lettersTitle: {
      color: c.textHeading,
      fontSize: 25,
      fontWeight: '900',
      letterSpacing: 0,
    },
    lettersMeta: {
      color: c.textSecondary,
      fontSize: 14,
      fontWeight: '800',
      letterSpacing: 0,
      marginTop: 2,
    },
    lettersCountBadge: {
      minWidth: 48,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: c.borderBlue,
      borderRadius: 8,
      borderWidth: 1,
      backgroundColor: c.bgBlueTint,
    },
    lettersCountText: {
      color: c.textBlue,
      fontSize: 18,
      fontWeight: '900',
      letterSpacing: 0,
    },
    practiceListRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    practiceListButton: {
      minHeight: 42,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      borderColor: c.borderWarm,
      borderRadius: 8,
      borderWidth: 1,
      backgroundColor: c.bgCream,
      paddingHorizontal: 12,
    },
    practiceListButtonActive: {
      borderColor: c.textHeading,
      backgroundColor: c.textHeading,
    },
    practiceListButtonDisabled: {
      opacity: 0.42,
    },
    practiceListText: {
      color: c.textDark,
      fontSize: 15,
      fontWeight: '900',
      letterSpacing: 0,
    },
    practiceListTextActive: {
      color: c.bgScreen,
    },
    practiceListCount: {
      color: c.textSecondary,
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 0,
    },
    practiceListCountActive: {
      color: c.textYellow,
    },
    letterGridScroll: {
      flex: 1,
    },
    letterGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      paddingBottom: 8,
    },
    letterTile: {
      width: '31.4%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: c.borderWarm,
      borderRadius: 8,
      borderWidth: 1,
      backgroundColor: c.bgSurface,
    },
    letterTileStarted: {
      borderColor: c.borderOrange,
      backgroundColor: c.bgOrangeTint,
    },
    letterTileMastered: {
      borderColor: c.borderGreen,
      backgroundColor: c.bgGreenTint,
    },
    letterTileActive: {
      borderColor: c.textHeading,
      borderWidth: 2,
    },
    tilePressed: {
      opacity: 0.78,
      transform: [{ scale: 0.97 }],
    },
    letterTileLetter: {
      color: c.textHeading,
      fontSize: 50,
      fontWeight: '800',
      includeFontPadding: true,
      letterSpacing: 0,
      lineHeight: 76,
      textAlign: 'center',
    },
    letterPercent: {
      position: 'absolute',
      bottom: 8,
      left: 8,
      color: c.textBody,
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 0,
    },
    letterPercentUntouched: {
      color: c.textDisabled,
    },
    letterPercentMastered: {
      color: c.textSuccess,
    },
    pathScreen: {
      flex: 1,
      gap: 14,
    },
    universeWrap: {
      borderColor: c.borderSubtle,
      borderRadius: 10,
      borderWidth: 1,
      backgroundColor: c.bgSubtle,
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    universeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
    },
    universeCell: {
      width: 18,
      height: 18,
      borderRadius: 3,
      borderWidth: 1,
      borderColor: c.borderWarm,
      backgroundColor: c.bgSurface,
    },
    universeCellStarted: {
      borderColor: c.borderOrange,
      backgroundColor: c.bgOrangeTint,
    },
    universeCellMastered: {
      borderColor: c.borderGreenBright,
      backgroundColor: c.borderGreenBright,
    },
    universeCellPressed: {
      opacity: 0.6,
    },
    pathScroll: {
      flex: 1,
    },
    pathScrollContent: {
      paddingTop: 4,
      paddingBottom: 24,
    },
    pathColumn: {
      gap: 14,
    },
    pathRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    pathRowLeft: {
      paddingLeft: 12,
      justifyContent: 'flex-start',
    },
    pathRowRight: {
      paddingLeft: 96,
      justifyContent: 'flex-start',
    },
    pathNode: {
      width: 64,
      height: 64,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 32,
      borderWidth: 2,
      borderColor: c.borderWarm,
      backgroundColor: c.bgSurface,
    },
    pathNodeLocked: {
      opacity: 0.55,
    },
    pathNodeStarted: {
      borderColor: c.borderPeach,
      backgroundColor: c.bgOrangeTint,
    },
    pathNodeMastered: {
      borderColor: c.borderGreenBright,
      backgroundColor: c.bgGreenTint,
    },
    pathNodeCurrent: {
      borderColor: c.textHeading,
      borderWidth: 3,
      backgroundColor: c.bgWarm,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 10,
      elevation: 4,
    },
    pathNodeGlyph: {
      color: c.textHeading,
      fontSize: 32,
      fontWeight: '900',
      letterSpacing: 0,
      lineHeight: 40,
      textAlign: 'center',
    },
    pathNodeGlyphCurrent: {
      color: c.textAccent,
    },
    pathNodeGlyphLocked: {
      color: c.textDisabled,
    },
    pathNodeTick: {
      color: c.textSuccess,
      fontSize: 30,
      fontWeight: '900',
      lineHeight: 34,
    },
    pathLabelBlock: {
      flex: 1,
      gap: 2,
    },
    pathLabel: {
      color: c.textHeading,
      fontSize: 16,
      fontWeight: '900',
      letterSpacing: 0,
    },
    pathLabelLocked: {
      color: c.textDisabled,
    },
    pathCount: {
      color: c.textSecondary,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0,
    },
    pathCountLocked: {
      color: c.textFaint,
    },
    startPill: {
      alignSelf: 'flex-start',
      minHeight: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
      backgroundColor: c.fillAccent,
      paddingHorizontal: 16,
      paddingVertical: 4,
      marginTop: 4,
    },
    startPillText: {
      color: c.textOnDark,
      fontSize: 15,
      fontWeight: '900',
      letterSpacing: 0,
    },
    bottomNav: {
      width: '92%',
      maxWidth: 440,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 4,
      borderColor: c.borderGrey,
      borderRadius: 34,
      borderWidth: 2,
      backgroundColor: c.bgSurface,
      marginBottom: 14,
      padding: 8,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.12,
      shadowRadius: 18,
      elevation: 8,
    },
    bottomTab: {
      flex: 1,
      minHeight: 76,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      borderRadius: 28,
      backgroundColor: 'transparent',
      paddingHorizontal: 4,
      paddingVertical: 8,
    },
    bottomTabActive: {
      backgroundColor: c.bgGrey,
    },
    bottomTabIcon: {
      color: c.textNavInactive,
      fontSize: 27,
      fontWeight: '900',
      letterSpacing: 0,
      lineHeight: 32,
    },
    bottomTabIconActive: {
      color: c.textAccent,
    },
    bottomTabText: {
      color: c.textNavInactive,
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: 0,
      lineHeight: 21,
    },
    bottomTabTextActive: {
      color: c.textAccent,
    },
    menuLayer: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 10,
    },
    menuBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: c.backdropOverlay,
    },
    menuPanel: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: '78%',
      maxWidth: 340,
      borderLeftColor: c.borderWarm,
      borderLeftWidth: 1,
      backgroundColor: c.bgCream,
      paddingHorizontal: 20,
      paddingTop: 52,
      paddingBottom: 24,
    },
    menuHeader: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    menuTitle: {
      color: c.textHeading,
      fontSize: 24,
      fontWeight: '800',
      letterSpacing: 0,
    },
    closeIconButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.bgCloseButton,
      borderRadius: 18,
    },
    closeIconText: {
      color: c.textClose,
      fontSize: 16,
      fontWeight: '900',
      lineHeight: 18,
    },
    menuScroll: {
      flex: 1,
      marginTop: 4,
    },
    menuScrollContent: {
      paddingBottom: 24,
    },
    menuList: {
      gap: 0,
      marginTop: 16,
      borderTopColor: c.borderWarm,
      borderTopWidth: 1,
    },
    menuItem: {
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      borderBottomColor: c.borderWarm,
      borderBottomWidth: 1,
    },
    menuLabel: {
      flex: 1,
      color: c.textBody,
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0,
    },
    menuValue: {
      color: c.textHeading,
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: 0,
      textAlign: 'right',
    },
    collapsibleSection: {
      marginTop: 14,
    },
    collapsibleHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
    },
    collapsibleTitle: {
      color: c.textHeading,
      fontSize: 17,
      fontWeight: '900',
      letterSpacing: 0,
    },
    collapsibleIcon: {
      color: c.textSecondary,
      fontSize: 12,
    },
    collapsibleContent: {
      marginTop: 4,
    },
    resetButton: {
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: c.borderRed,
      borderRadius: 8,
      borderWidth: 1,
      backgroundColor: c.bgRedTint,
      marginTop: 12,
    },
    resetText: {
      color: c.textDanger,
      fontSize: 17,
      fontWeight: '800',
      letterSpacing: 0,
    },
    footerContainer: {
      marginTop: 24,
      alignItems: 'center',
      position: 'relative',
    },
    footerVersion: {
      color: c.textDisabled,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    footerText: {
      color: c.textSecondary,
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 4,
    },
    poweredByRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    footerLink: {
      color: c.textBody,
      textDecorationLine: 'underline',
    },
    infoIconContainer: {
      padding: 2,
      marginTop: -4,
    },
    infoIcon: {
      color: '#8b5cf6',
      fontSize: 16,
      fontWeight: '600',
    },
    tooltipContainer: {
      position: 'absolute',
      bottom: 50,
      backgroundColor: c.tooltipBg,
      padding: 16,
      borderRadius: 8,
      width: 280,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 5,
    },
    tooltipLabel: {
      color: c.tooltipLabel,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
      marginBottom: 8,
    },
    tooltipValue: {
      color: c.tooltipValue,
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 20,
    },
    tooltipDivider: {
      height: 1,
      backgroundColor: c.tooltipDivider,
      marginVertical: 12,
    },
    tooltipVersion: {
      color: c.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    practiceListHint: {
      color: c.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      marginTop: 6,
      letterSpacing: 0,
    },
    pathHeatmapRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: 4,
    },
    heatmapToggle: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.borderWarm,
      backgroundColor: c.bgSubtle,
    },
    heatmapToggleText: {
      fontSize: 18,
      lineHeight: 22,
    },
    appFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingBottom: 2,
      position: 'relative',
    },
    themeChip: {
      minHeight: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.borderWarm,
      backgroundColor: c.bgSubtle,
      paddingHorizontal: 10,
    },
    themeChipActive: {
      borderColor: c.textAccent,
      backgroundColor: c.bgOrangeTint,
    },
    themeChipText: {
      color: c.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    themeChipTextActive: {
      color: c.textAccent,
    },
  });
}

export type AppStyles = ReturnType<typeof makeStyles>;

type ThemeContextValue = {
  colors: ColorTokens;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  styles: AppStyles;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored);
        }
      })
      .catch(() => {});
  }, []);

  const isDark =
    preference === 'system' ? systemScheme === 'dark' : preference === 'dark';

  const colors = isDark ? DARK : LIGHT;

  const styles = useMemo(() => makeStyles(colors), [colors]);

  function setPreference(p: ThemePreference) {
    setPreferenceState(p);
    AsyncStorage.setItem(THEME_STORAGE_KEY, p).catch(() => {});
  }

  return (
    <ThemeContext.Provider value={{ colors, isDark, preference, setPreference, styles }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
