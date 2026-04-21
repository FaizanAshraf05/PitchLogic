import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  BackHandler,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';

interface TitleScreenProps {
  navigation: any;
}

export function TitleScreen({ navigation }: TitleScreenProps) {

  const handleNewGame = () => {
    navigation.navigate('Main');
  };

  const handleLoadGame = () => {
    // TODO: Load saved game logic
    Alert.alert('Load Game', 'No saved games found.');
  };

  const handleQuit = () => {
    Alert.alert(
      'Quit Game',
      'Are you sure you want to quit?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Quit', style: 'destructive', onPress: () => BackHandler.exitApp() },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      <View style={styles.backgroundWrapper}>
        <Image
          source={require('../../assets/Rectangle 5.png')}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
      </View>

      <View style={styles.titleSection}>
        <Text style={styles.titleTop}>PITCH</Text>
        <Text style={styles.titleBottom}>LOGIC</Text>
        <View style={styles.titleUnderline} />
        <Text style={styles.tagline}>Football Manager</Text>
      </View>

      <View style={styles.menuSection}>
        <TouchableOpacity
          style={styles.menuButton}
          activeOpacity={0.8}
          onPress={handleNewGame}
        >
          <View style={styles.menuButtonInner}>
            <Text style={styles.menuButtonText}>New Game</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuButton}
          activeOpacity={0.8}
          onPress={handleLoadGame}
        >
          <View style={styles.menuButtonInnerOutline}>
            <Text style={styles.menuButtonTextOutline}>Load Game</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quitButton}
          activeOpacity={0.8}
          onPress={handleQuit}
        >
          <Text style={styles.quitButtonText}>Quit</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.Author}>by</Text>
      <Text style={styles.Author}>Faizan</Text>
      <Text style={styles.Author}>Abdullah</Text>
      <Text style={styles.Author}>Ahmad Ibrahim</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backgroundWrapper: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12,
  },
  backgroundImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  titleSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleTop: {
    fontSize: 56,
    color: Colors.text,
    fontWeight: '800',
    letterSpacing: 8,
    lineHeight: 62,
  },
  titleBottom: {
    fontSize: 56,
    color: Colors.green,
    fontWeight: '800',
    letterSpacing: 8,
    lineHeight: 62,
  },
  titleUnderline: {
    width: 80,
    height: 3,
    backgroundColor: Colors.accent,
    marginTop: Spacing.md,
    borderRadius: 2,
  },
  tagline: {
    fontSize: Typography.fontSize.md,
    color: Colors.textDim,
    letterSpacing: Typography.letterSpacing.wider,
    marginTop: Spacing.md,
    fontWeight: Typography.fontWeight.medium,
  },
  menuSection: {
    width: '100%',
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  menuButton: {
    width: '100%',
  },
  menuButtonInner: {
    backgroundColor: Colors.green,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  menuButtonText: {
    fontSize: Typography.fontSize.lg,
    color: Colors.textOnPrimary,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: Typography.letterSpacing.wide,
  },
  menuButtonInnerOutline: {
    backgroundColor: Colors.transparent,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.green,
  },
  menuButtonTextOutline: {
    fontSize: Typography.fontSize.lg,
    color: Colors.green,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: Typography.letterSpacing.wide,
  },
  quitButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  quitButtonText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textMuted,
    fontWeight: Typography.fontWeight.medium,
  },
  Author: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    paddingBottom: Spacing.sm,
  },
});
