import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {
  SafeAreaView
} from 'react-native-safe-area-context';
import {
  Colors, Typography, Spacing, BorderRadius
} from '../theme';
import * as FileSystem from 'expo-file-system';

const API_BASE = 'https://obliged-preamble-amplifier.ngrok-free.dev/api';

interface TitleScreenProps {
  navigation: any;
}

export function TitleScreen({ navigation }: TitleScreenProps) {
  const [loadingGame, setLoadingGame] = React.useState(false);

  const handleNewGame = () => {
    navigation.navigate('TeamSelect');
  };

  const handleLoadGame = async () => {
    try {
      setLoadingGame(true);
      const saveFile = new FileSystem.File(FileSystem.Paths.document, 'savegame.txt');

      if (!saveFile.exists) {
        Alert.alert('No Save Found', 'No saved game found on this device.');
        setLoadingGame(false);
        return;
      }

      const saveData = await saveFile.text();
      const parsed = JSON.parse(saveData);

      // Send to backend to restore game state
      const res = await fetch(`${API_BASE}/game/load`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-manager-name': parsed.managerName
        },
        body: JSON.stringify({
          managerName: parsed.managerName,
          gameState: parsed.gameState
        })
      });

      if (!res.ok) {
        Alert.alert('Error', 'Failed to load saved game.');
        setLoadingGame(false);
        return;
      }

      const result = await res.json();
      Alert.alert('Game Loaded', `Welcome back, ${parsed.managerName}!`, [
        {
          text: 'Continue',
          onPress: () => navigation.navigate('Main', {
            managerName: parsed.managerName,
            teamId: parsed.teamId
          })
        }
      ]);
    } catch (error) {
      console.error('Load error:', error);
      Alert.alert('Error', 'Failed to load saved game. The save file may be corrupted.');
    } finally {
      setLoadingGame(false);
    }
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
          disabled={loadingGame}
        >
          <View style={styles.menuButtonInnerOutline}>
            {loadingGame ? (
              <ActivityIndicator color={Colors.green} />
            ) : (
              <Text style={styles.menuButtonTextOutline}>Load Game</Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Multiplayer')}
        >
          <View style={styles.menuButtonInnerOutline}>
            <Text style={styles.menuButtonTextOutline}>Multiplayer</Text>
          </View>
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
  Author: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    paddingBottom: Spacing.sm,
  },
});
