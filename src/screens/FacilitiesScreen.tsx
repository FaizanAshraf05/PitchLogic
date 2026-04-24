import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing } from '../theme';

const API_BASE = 'https://obliged-preamble-amplifier.ngrok-free.dev/api';

export function FacilitiesScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const teamId = route.params?.teamId || navigation.getState()?.routes.find((r: any) => r.name === 'Main')?.params?.teamId || 10;
  const managerName = route.params?.managerName || navigation.getState()?.routes.find((r: any) => r.name === 'Main')?.params?.managerName || 'default';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [budget, setBudget] = useState(0);
  const [youthLevel, setYouthLevel] = useState(70);
  const [trainingLevel, setTrainingLevel] = useState(70);

  useFocusEffect(
    useCallback(() => {
      fetchFacilities();
    }, [teamId])
  );

  const fetchFacilities = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/teams`, {
        headers: { 'x-manager-name': managerName }
      });
      if (res.ok) {
        const teams = await res.json();
        const myTeam = teams.find((t: any) => t.teamID === teamId);
        if (myTeam) {
          setBudget(myTeam.transferBudget);
          setYouthLevel(myTeam.youthFacilityLevel || 70);
          setTrainingLevel(myTeam.trainingFacilityLevel || 70);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch facilities data.');
    } finally {
      setLoading(false);
    }
  };

  const getUpgradeCost = (level: number) => {
    if (level >= 100) return null;
    return Math.floor(1000000 * Math.pow(10, (level - 70) / 30));
  };

  const handleUpgrade = async (type: 'youth' | 'training') => {
    const currentLevel = type === 'youth' ? youthLevel : trainingLevel;
    const cost = getUpgradeCost(currentLevel);

    if (!cost) {
      Alert.alert('Max Level', 'This facility is already at maximum level (100).');
      return;
    }

    if (budget < cost) {
      Alert.alert('Insufficient Funds', `You need ${formatCurrency(cost)} to upgrade.`);
      return;
    }

    Alert.alert(
      'Confirm Upgrade',
      `Upgrade ${type === 'youth' ? 'Youth' : 'Training'} Facility to level ${currentLevel + 1} for ${formatCurrency(cost)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upgrade',
          style: 'default',
          onPress: async () => {
            try {
              setSubmitting(true);
              const res = await fetch(`${API_BASE}/teams/${teamId}/facilities/upgrade`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-manager-name': managerName
                },
                body: JSON.stringify({ type })
              });
              const data = await res.json();
              if (res.ok) {
                setBudget(data.newBudget);
                if (type === 'youth') setYouthLevel(data.newLevel);
                else setTrainingLevel(data.newLevel);
                Alert.alert('Success', data.message);
              } else {
                Alert.alert('Upgrade Failed', data.message);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to upgrade facility.');
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const handleSignYouth = async () => {
    const cost = 10000000;
    if (budget < cost) {
      Alert.alert('Insufficient Funds', `You need ${formatCurrency(cost)} to sign a youth player.`);
      return;
    }

    Alert.alert(
      'Sign Youth Player',
      `Scout and sign a new youth academy player for ${formatCurrency(cost)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign',
          style: 'default',
          onPress: async () => {
            try {
              setSubmitting(true);
              const res = await fetch(`${API_BASE}/teams/${teamId}/facilities/sign-youth`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-manager-name': managerName
                }
              });
              const data = await res.json();
              if (res.ok) {
                setBudget(data.newBudget);
                Alert.alert('Player Signed!', data.message);
              } else {
                Alert.alert('Signing Failed', data.message);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to sign youth player.');
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value}`;
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
      <Image
        source={require('../../assets/pitch-bg.png')}
        style={styles.backgroundImage}
      />
      <View style={styles.overlay} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="keyboard-return" size={32} color={Colors.green} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Club Facilities</Text>
      </View>

      <View style={styles.budgetContainer}>
        <Text style={styles.budgetText}>Club Budget: {formatCurrency(budget)}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Scout Facility */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Scouting Facilities</Text>
          </View>
          <Text style={styles.cardDesc}>
            Current Level: <Text style={styles.levelText}>{youthLevel}/100</Text>
          </Text>
          <Text style={styles.cardInfo}>
            Higher Scouting level means better players will be scouted.
          </Text>
          <TouchableOpacity
            style={[styles.actionBtn, submitting && styles.actionBtnDisabled]}
            onPress={() => handleUpgrade('youth')}
            disabled={submitting || youthLevel >= 100}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.actionBtnText}>
                {youthLevel >= 100 ? 'Max Level' : `Upgrade (${formatCurrency(getUpgradeCost(youthLevel) || 0)})`}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Training Facility */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Training Ground</Text>
          </View>
          <Text style={styles.cardDesc}>
            Current Level: <Text style={styles.levelText}>{trainingLevel}/100</Text>
          </Text>
          <Text style={styles.cardInfo}>
            Improves player growth.
          </Text>
          <TouchableOpacity
            style={[styles.actionBtn, submitting && styles.actionBtnDisabled]}
            onPress={() => handleUpgrade('training')}
            disabled={submitting || trainingLevel >= 100}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.actionBtnText}>
                {trainingLevel >= 100 ? 'Max Level' : `Upgrade (${formatCurrency(getUpgradeCost(trainingLevel) || 0)})`}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Scout Youth Player */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Scout Youth Player</Text>
          </View>
          <Text style={styles.cardDesc}>Cost: $10.0M</Text>
          <Text style={styles.cardInfo}>
            Scout a player from youth academy. Rating is based on your current Youth Academy Level.
          </Text>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnAlt, submitting && styles.actionBtnDisabled]}
            onPress={handleSignYouth}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Sign Youth Player</Text>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  backgroundImage: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', resizeMode: 'cover', opacity: 0.12 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  backButton: { padding: Spacing.xs, marginRight: Spacing.md },
  headerTitle: { fontSize: 28, color: '#FFF', fontFamily: Typography.fontFamily.bold },
  budgetContainer: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  budgetText: { color: Colors.green, fontSize: 18, fontFamily: Typography.fontFamily.bold },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  card: { backgroundColor: Colors.surface2, borderRadius: 16, padding: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderColor: '#333' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  cardTitle: { color: '#FFF', fontSize: 22, fontFamily: Typography.fontFamily.bold, marginLeft: Spacing.sm },
  cardDesc: { color: '#CCC', fontSize: 16, fontFamily: Typography.fontFamily.medium, marginBottom: Spacing.xs },
  levelText: { color: Colors.green, fontFamily: Typography.fontFamily.bold },
  cardInfo: { color: '#888', fontSize: 14, fontFamily: Typography.fontFamily.regular, marginBottom: Spacing.md },
  actionBtn: { backgroundColor: Colors.green, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  actionBtnAlt: { backgroundColor: 'transparent', borderWidth: 2, borderColor: Colors.green },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { color: '#000', fontSize: 16, fontFamily: Typography.fontFamily.bold },
});
