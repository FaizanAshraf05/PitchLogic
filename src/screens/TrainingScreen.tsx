import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';

const { width } = Dimensions.get('window');

import { API_BASE } from '../api/config';

const POSITIONS = [
  { key: 'GK' },
  { key: 'CB' },
  { key: 'LB' },
  { key: 'RB' },
  { key: 'CDM' },
  { key: 'CM' },
  { key: 'CAM' },
  { key: 'LW' },
  { key: 'RW' },
  { key: 'ST' },
];

interface TrainingProgramme {
  position: string;
  matchesRemaining: number;
  boost: number;
}

export function TrainingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const teamId = route.params?.teamId;

  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [activeProgramme, setActiveProgramme] = useState<TrainingProgramme | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const managerName = route.params?.managerName
    || navigation.getState()?.routes.find((r: any) => r.name === 'Main')?.params?.managerName
    || 'default';

  useFocusEffect(
    useCallback(() => {
      fetchTrainingStatus();
    }, [teamId])
  );

  const fetchTrainingStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/teams/${teamId}/training`, {
        headers: { 'x-manager-name': managerName }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveProgramme(data.trainingProgramme || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTraining = async () => {
    if (!selectedPosition) {
      Alert.alert('Select Position', 'Please choose a position to focus training on.');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/teams/${teamId}/training`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-manager-name': managerName,
        },
        body: JSON.stringify({ position: selectedPosition }),
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert('Training', data.message || 'Failed to start training.');
      } else {
        Alert.alert('Training Started', data.message);
        setActiveProgramme(data.trainingProgramme);
        setSelectedPosition(null);
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.green} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />
      <Image
        source={require('../../assets/pitch-bg.png')}
        style={styles.backgroundImage}
      />
      <View style={styles.overlay} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="keyboard-return" size={28} color={Colors.green} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Training</Text>
      </View>

      {/* Active Training Banner */}
      {activeProgramme && (
        <View style={styles.activeBanner}>
          <MaterialCommunityIcons name="clock-outline" size={22} color={Colors.green} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.activeBannerTitle}>Training In Progress</Text>
            <Text style={styles.activeBannerSub}>
              Focus: <Text style={{ color: Colors.green, fontFamily: Typography.fontFamily.bold }}>{activeProgramme.position}</Text>
              {'  •  '}
              {activeProgramme.matchesRemaining} match{activeProgramme.matchesRemaining !== 1 ? 'es' : ''} remaining
            </Text>
          </View>
          <View style={styles.matchCountBadge}>
            <Text style={styles.matchCountText}>{activeProgramme.matchesRemaining}</Text>
          </View>
        </View>
      )}

      {/* Instructions */}
      <View style={styles.instructionContainer}>
        <Text style={styles.instructionTitle}>
          {activeProgramme ? 'Current Training Active' : 'Select Training Focus'}
        </Text>
        <Text style={styles.instructionSub}>
          {activeProgramme
            ? 'Complete the remaining matches to receive the rating boost.'
            : 'Choose a position group. All players in that position will receive an overall rating boost after 3 matches.'}
        </Text>
      </View>

      {/* Position Grid */}
      <View style={styles.gridContainer}>
        {POSITIONS.map(pos => {
          const isSelected = selectedPosition === pos.key;
          const isDisabled = !!activeProgramme;
          return (
            <TouchableOpacity
              key={pos.key}
              style={[
                styles.posCard,
                isSelected && styles.posCardSelected,
                isDisabled && styles.posCardDisabled,
              ]}
              activeOpacity={isDisabled ? 1 : 0.7}
              onPress={() => { if (!isDisabled) setSelectedPosition(pos.key); }}
            >

              <Text style={[styles.posKey, isSelected && { color: '#FFF' }]}>{pos.key}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Start Training Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[
            styles.startButton,
            (!!activeProgramme || !selectedPosition) && styles.startButtonDisabled,
          ]}
          onPress={handleStartTraining}
          disabled={!!activeProgramme || !selectedPosition || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.startButtonText}>
              {activeProgramme ? 'TRAINING IN PROGRESS' : 'START TRAINING'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const GRID_COLS = 5;
const GRID_GAP = 10;
const CARD_WIDTH = (width - Spacing.lg * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e0a',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    opacity: 0.1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
    marginRight: Spacing.md,
  },
  headerTitle: {
    fontSize: 26,
    color: '#FFF',
    fontFamily: Typography.fontFamily.bold,
  },

  // Active Training Banner
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 204, 113, 0.12)',
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(46, 204, 113, 0.3)',
    marginBottom: Spacing.md,
  },
  activeBannerTitle: {
    color: '#FFF',
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
  },
  activeBannerSub: {
    color: '#aaa',
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    marginTop: 2,
  },
  matchCountBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchCountText: {
    color: '#000',
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16,
  },

  // Instructions
  instructionContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  instructionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: 4,
  },
  instructionSub: {
    color: '#888',
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    lineHeight: 20,
  },

  // Position Grid
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: GRID_GAP,
  },
  posCard: {
    width: CARD_WIDTH,
    alignItems: 'center',
    backgroundColor: 'rgba(25, 25, 25, 0.8)',
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  posCardSelected: {
    borderColor: Colors.green,
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
  },
  posCardDisabled: {
    opacity: 0.4,
  },

  posKey: {
    color: '#ccc',
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
  },

  // Bottom
  bottomSection: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  startButton: {
    backgroundColor: Colors.green,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonDisabled: {
    backgroundColor: '#333',
    shadowOpacity: 0,
    elevation: 0,
  },
  startButtonText: {
    color: '#000',
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 1,
  },
});
