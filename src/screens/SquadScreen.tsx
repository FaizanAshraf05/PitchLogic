import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  ImageBackground,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';
import { API_BASE } from '../api/config';

const { width } = Dimensions.get('window');

interface Player {
  playerID: number;
  name: string;
  position: string;
  overallRating: number;
  squadRole: 'Starter' | 'Bench' | string | null;
  squadPositionIndex?: number;
  isFatigued?: boolean;
  injuredWeeksRemaining?: number;
}

const POS_GROUPS: Record<string, string[]> = {
  F: ['ST', 'LW', 'RW', 'CF', 'LF', 'RF'],
  M: ['CAM', 'CM', 'CDM', 'LM', 'RM'],
  D: ['CB', 'LB', 'RB', 'LWB', 'RWB'],
  G: ['GK'],
};

const getGroup = (pos: string) => {
  for (const [group, positions] of Object.entries(POS_GROUPS)) {
    if (positions.includes(pos)) return group;
  }
  return 'M'; // fallback
};

const getRatingDrop = (actualPos: string, playedPos: string) => {
  if (actualPos === playedPos) return 0;
  
  const actualGroup = getGroup(actualPos);
  const playedGroup = getGroup(playedPos);
  
  if (actualGroup === 'G' || playedGroup === 'G') {
    return 40; // GK out of position
  }
  
  if (actualGroup === playedGroup) {
    return 2; // same group
  }
  
  // one group apart
  if ((actualGroup === 'F' && playedGroup === 'M') || 
      (actualGroup === 'M' && playedGroup === 'F') ||
      (actualGroup === 'M' && playedGroup === 'D') ||
      (actualGroup === 'D' && playedGroup === 'M')) {
    return 5;
  }
  
  // opposite ends
  if ((actualGroup === 'F' && playedGroup === 'D') ||
      (actualGroup === 'D' && playedGroup === 'F')) {
    return 15;
  }
  
  return 5; // fallback
};

const FORMATIONS = {
  '4-3-3 ATTACK': [
    { id: 0, label: 'ST', top: '15%', left: '50%' },
    { id: 1, label: 'LW', top: '25%', left: '20%' },
    { id: 2, label: 'RW', top: '25%', left: '80%' },
    { id: 3, label: 'CAM', top: '38%', left: '50%' },
    { id: 4, label: 'CM', top: '50%', left: '30%' },
    { id: 5, label: 'CM', top: '50%', left: '70%' },
    { id: 6, label: 'LB', top: '65%', left: '15%' },
    { id: 7, label: 'CB', top: '65%', left: '38%' },
    { id: 8, label: 'CB', top: '65%', left: '62%' },
    { id: 9, label: 'RB', top: '65%', left: '85%' },
    { id: 10, label: 'GK', top: '85%', left: '50%' },
  ],
  '4-4-2 FLAT': [
    { id: 0, label: 'ST', top: '15%', left: '35%' },
    { id: 1, label: 'ST', top: '15%', left: '65%' },
    { id: 2, label: 'LM', top: '45%', left: '15%' },
    { id: 3, label: 'CM', top: '45%', left: '38%' },
    { id: 4, label: 'CM', top: '45%', left: '62%' },
    { id: 5, label: 'RM', top: '45%', left: '85%' },
    { id: 6, label: 'LB', top: '65%', left: '15%' },
    { id: 7, label: 'CB', top: '65%', left: '38%' },
    { id: 8, label: 'CB', top: '65%', left: '62%' },
    { id: 9, label: 'RB', top: '65%', left: '85%' },
    { id: 10, label: 'GK', top: '85%', left: '50%' },
  ],
  '4-2-3-1 WIDE': [
    { id: 0, label: 'ST', top: '15%', left: '50%' },
    { id: 1, label: 'CAM', top: '28%', left: '50%' },
    { id: 2, label: 'LM', top: '35%', left: '15%' },
    { id: 3, label: 'RM', top: '35%', left: '85%' },
    { id: 4, label: 'CDM', top: '48%', left: '35%' },
    { id: 5, label: 'CDM', top: '48%', left: '65%' },
    { id: 6, label: 'LB', top: '65%', left: '15%' },
    { id: 7, label: 'CB', top: '65%', left: '38%' },
    { id: 8, label: 'CB', top: '65%', left: '62%' },
    { id: 9, label: 'RB', top: '65%', left: '85%' },
    { id: 10, label: 'GK', top: '85%', left: '50%' },
  ],
  '3-5-2': [
    { id: 0, label: 'ST', top: '15%', left: '35%' },
    { id: 1, label: 'ST', top: '15%', left: '65%' },
    { id: 2, label: 'CAM', top: '30%', left: '50%' },
    { id: 3, label: 'LM', top: '45%', left: '15%' },
    { id: 4, label: 'RM', top: '45%', left: '85%' },
    { id: 5, label: 'CDM', top: '55%', left: '35%' },
    { id: 6, label: 'CDM', top: '55%', left: '65%' },
    { id: 7, label: 'CB', top: '70%', left: '20%' },
    { id: 8, label: 'CB', top: '70%', left: '50%' },
    { id: 9, label: 'CB', top: '70%', left: '80%' },
    { id: 10, label: 'GK', top: '85%', left: '50%' },
  ]
};

export function SquadScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const teamId = route.params?.teamId || navigation.getState()?.routes.find((r: any) => r.name === 'Main')?.params?.teamId || 10;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [starters, setStarters] = useState<(Player | null)[]>(new Array(11).fill(null));
  const [subs, setSubs] = useState<Player[]>([]);
  const [reserves, setReserves] = useState<Player[]>([]);

  // which slot is tapped
  const [selectedSlot, setSelectedSlot] = useState<{ type: string; index: number } | null>(null);

  const [selectedFormationKey, setSelectedFormationKey] = useState<keyof typeof FORMATIONS>('4-3-3 ATTACK');
  const [showFormationDropdown, setShowFormationDropdown] = useState(false);
  const activeFormation = FORMATIONS[selectedFormationKey];

  const [fatiguedIds, setFatiguedIds] = useState<number[]>([]);
  const [injuredPlayers, setInjuredPlayers] = useState<{playerID: number; name: string; position: string; weeksRemaining: number}[]>([]);
  const injuredIds = injuredPlayers.map(p => p.playerID);

  useFocusEffect(
    useCallback(() => {
      fetchPlayers();
      fetchFatigueStatus();
    }, [teamId])
  );

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const managerName = route.params?.managerName || navigation.getState()?.routes.find((r: any) => r.name === 'Main')?.params?.managerName || 'default';
      const response = await fetch(`${API_BASE}/teams/${teamId}/players`, {
        headers: { 'x-manager-name': managerName }
      });
      
      if (!response.ok) throw new Error('Failed to fetch players');
      
      const data: Player[] = await response.json();
      
      let dbStarters = data.filter(p => p.squadRole === 'Starter');
      let dbBench = data.filter(p => p.squadRole === 'Bench');
      let dbReserves = data.filter(p => p.squadRole === 'Reserve');

      dbStarters.sort((a, b) => (a.squadPositionIndex ?? 99) - (b.squadPositionIndex ?? 99));
      dbBench.sort((a, b) => (a.squadPositionIndex ?? 99) - (b.squadPositionIndex ?? 99));
      dbReserves.sort((a, b) => (a.squadPositionIndex ?? 99) - (b.squadPositionIndex ?? 99));

      const newStarters = new Array(11).fill(null);
      const hasSavedPositions = dbStarters.every(p => p.squadPositionIndex !== undefined && p.squadPositionIndex !== null);

      if (hasSavedPositions && dbStarters.length === 11) {
          dbStarters.forEach(p => {
              if (p.squadPositionIndex !== undefined && p.squadPositionIndex >= 0 && p.squadPositionIndex < 11) {
                  newStarters[p.squadPositionIndex] = p;
              }
          });
          // fill empty slots
          dbStarters.forEach(p => {
              if (!newStarters.includes(p)) {
                  const emptyIdx = newStarters.findIndex(s => s === null);
                  if (emptyIdx !== -1) newStarters[emptyIdx] = p;
              }
          });
      } else {
          // backup
          const unassigned: Player[] = [];
          dbStarters.forEach(p => {
            let placed = false;
            for (let i = 0; i < 11; i++) {
               if (newStarters[i] === null && activeFormation[i].label === p.position) {
                  newStarters[i] = p;
                  placed = true;
                  break;
               }
            }
            if (!placed) unassigned.push(p);
          });
          
          let lineupChanged = false;
          unassigned.forEach(p => {
             const emptyIdx = newStarters.findIndex(s => s === null);
             if (emptyIdx !== -1) {
                newStarters[emptyIdx] = p;
                lineupChanged = true;
             } else {
                dbBench.unshift(p);
                lineupChanged = true;
             }
          });

          if (lineupChanged) {
            saveLineup(newStarters, dbBench, dbReserves);
          }
      }
      
      setStarters(newStarters);
      setSubs(dbBench);
      setReserves(dbReserves);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load squad.');
    }
  };

  const fetchFatigueStatus = async () => {
    try {
      const managerName = route.params?.managerName || navigation.getState()?.routes.find((r: any) => r.name === 'Main')?.params?.managerName || 'default';
      const response = await fetch(`${API_BASE}/teams/${teamId}/fatigue-status`, {
        headers: { 'x-manager-name': managerName }
      });
      if (response.ok) {
        const data = await response.json();
        setFatiguedIds((data.fatiguedPlayers || []).map((p: any) => p.playerID));
        setInjuredPlayers(data.injuredPlayers || []);
      }
    } catch (error) {
      console.error('Error fetching fatigue status:', error);
    }
  };

  const saveLineup = async (currentStarters: (Player | null)[], currentSubs: Player[], currentReserves: Player[]) => {
    try {
      setSaving(true);
      const starterIds = currentStarters.map(p => p?.playerID).filter(id => id !== undefined);
      const subIds = currentSubs.map(p => p.playerID);
      const reserveIds = currentReserves.map(p => p.playerID);
      
      if (starterIds.length !== 11) {
        Alert.alert('Error', 'Lineup must have exactly 11 players.');
        setSaving(false);
        return;
      }

      // team rating with drops
      let currentOvr = 0;
      const validStarters = currentStarters.filter(p => p !== null) as Player[];
      if (validStarters.length > 0) {
        let total = 0;
        validStarters.forEach((p, idx) => {
          const drop = getRatingDrop(p.position, activeFormation[idx].label);
          total += Math.max(1, p.overallRating - drop);
        });
        currentOvr = Math.round(total / validStarters.length);
      }

      const managerName = route.params?.managerName || navigation.getState()?.routes.find((r: any) => r.name === 'Main')?.params?.managerName || 'default';
      const response = await fetch(`${API_BASE}/teams/${teamId}/lineup`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-manager-name': managerName
        },
        body: JSON.stringify({ 
            starters: starterIds, 
            bench: subIds, 
            reserves: reserveIds,
            teamOverallRating: currentOvr
        }),
      });

      if (!response.ok) throw new Error('Failed to save lineup');
    } catch (error) {
      console.error('Error saving lineup:', error);
      Alert.alert('Error', 'Lineup changes were not saved.');
    } finally {
      setSaving(false);
    }
  };

  const handleSlotPress = (type: 'starter' | 'sub' | 'reserve', index: number) => {
    if (!selectedSlot) {
      setSelectedSlot({ type, index });
      return;
    }

    if (selectedSlot.type === type && selectedSlot.index === index) {
      // tap again to deselect
      setSelectedSlot(null);
      return;
    }

    // swap the two
    const newStarters = [...starters];
    const newSubs = [...subs];
    const newReserves = [...reserves];

    const getPlayer = (t: string, i: number) => {
      if (t === 'starter') return newStarters[i];
      if (t === 'sub') return newSubs[i];
      if (t === 'reserve') return newReserves[i];
      return null;
    };

    const setPlayer = (t: string, i: number, p: Player | null) => {
      if (t === 'starter') newStarters[i] = p;
      if (t === 'sub' && p) newSubs[i] = p;
      if (t === 'reserve' && p) newReserves[i] = p;
    };

    // no injured starters
    const player1 = getPlayer(selectedSlot.type, selectedSlot.index);
    const player2 = getPlayer(type, index);

    if (type === 'starter' && player1 && injuredIds.includes(player1.playerID)) {
      Alert.alert('Injured', `${player1.name} is injured for ${injuredPlayers.find(p => p.playerID === player1.playerID)?.weeksRemaining} more week(s) and cannot start.`);
      setSelectedSlot(null);
      return;
    }
    if (selectedSlot.type === 'starter' && player2 && injuredIds.includes(player2.playerID)) {
      // moving out, fine
    }
    if (type === 'starter' && selectedSlot.type !== 'starter' && player1 && injuredIds.includes(player1.playerID)) {
      Alert.alert('Injured', `${player1.name} is injured and cannot start.`);
      setSelectedSlot(null);
      return;
    }
    if (selectedSlot.type === 'starter' && type !== 'starter') {
      // starter to bench, fine
    }
    // bench injured → starter blocked
    if (selectedSlot.type !== 'starter' && type === 'starter') {
      if (player1 && injuredIds.includes(player1.playerID)) {
        Alert.alert('Injured', `${player1.name} is injured and cannot start.`);
        setSelectedSlot(null);
        return;
      }
    }
    if (type !== 'starter' && selectedSlot.type === 'starter') {
      if (player2 && injuredIds.includes(player2.playerID)) {
        Alert.alert('Injured', `${player2.name} is injured and cannot start.`);
        setSelectedSlot(null);
        return;
      }
    }

    setPlayer(selectedSlot.type, selectedSlot.index, player2);
    setPlayer(type, index, player1);

    setStarters(newStarters);
    setSubs(newSubs);
    setReserves(newReserves);
    setSelectedSlot(null);

    // lineup changed, save
    if (selectedSlot.type === 'starter' || type === 'starter' || selectedSlot.type === 'sub' || type === 'sub') {
      saveLineup(newStarters, newSubs, newReserves);
    }
  };

  const calculateOVR = () => {
    const validStarters = starters.filter(p => p !== null) as Player[];
    if (validStarters.length === 0) return 0;
    
    let total = 0;
    validStarters.forEach((p, idx) => {
      const drop = getRatingDrop(p.position, activeFormation[idx].label);
      total += Math.max(1, p.overallRating - drop);
    });
    
    return Math.round(total / validStarters.length);
  };

  const renderPlayerNode = (
    player: Player | null,
    positionLabel: string,
    isSelected: boolean,
    onPress: () => void,
    isBench: boolean = false
  ) => {
    const name = player ? player.name.split(' ').pop() : 'Empty';
    const effectiveRating = player 
      ? Math.max(1, player.overallRating - (!isBench ? getRatingDrop(player.position, positionLabel) : 0))
      : 0;
    const isFatigued = player ? fatiguedIds.includes(player.playerID) : false;
    const isInjured = player ? injuredIds.includes(player.playerID) : false;

    return (
      <TouchableOpacity 
        style={[styles.nodeContainer, isSelected && styles.nodeSelected]} 
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={[styles.nodeName, isFatigued && styles.nodeNameFatigued, isInjured && styles.nodeNameInjured]} numberOfLines={1}>{name}</Text>
        <View style={[styles.iconCircle, isInjured && styles.iconCircleInjured]}>
          <MaterialCommunityIcons name="account" size={32} color={isInjured ? '#999' : '#000'} />
          {player && (
            <View style={[styles.ovrBadge, isInjured && { backgroundColor: Colors.red }]}>
              <Text style={styles.ovrBadgeText}>{effectiveRating}</Text>
            </View>
          )}
          {isInjured && (
            <View style={styles.injuryOverlay}>
              <MaterialCommunityIcons name="bandage" size={16} color={Colors.red} />
            </View>
          )}
        </View>
        <View style={styles.posPill}>
          <Text style={styles.posPillText}>{positionLabel}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.green} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#111111" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-u-left-top" size={28} color={Colors.green} />
        </TouchableOpacity>
        <Text style={styles.title}>SQUAD MANAGEMENT</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* OVR Display */}
        <View style={styles.ovrContainer}>
          <Text style={styles.ovrLabel}>OVR </Text>
          <Text style={styles.ovrValue}>{calculateOVR()}</Text>
          {saving && <ActivityIndicator size="small" color={Colors.green} style={{ marginLeft: 10 }} />}
        </View>

        {/* Fatigue Warning Bar */}
        {fatiguedIds.length > 0 && (
          <View style={styles.fatigueBar}>
            <MaterialCommunityIcons name="alert" size={18} color="#FFF" />
            <Text style={styles.fatigueBarText}>
              {(() => {
                const names = starters
                  .filter((p): p is Player => p !== null && fatiguedIds.includes(p.playerID))
                  .map(p => `${p.name.split(' ').pop()} (${p.position})`);
                if (names.length === 0) return 'Fatigued player has been subbed out ✓';
                return `FATIGUED: ${names.join(', ')} — Sub out or risk injury!`;
              })()}
            </Text>
          </View>
        )}

        {/* The Pitch */}
        <View style={styles.pitchContainer}>
          <View style={styles.pitchLines}>
            {/* Center Circle & Line */}
            <View style={styles.centerLine} />
            <View style={styles.centerCircle} />
            {/* Penalty Boxes */}
            <View style={styles.penaltyBoxTop} />
            <View style={styles.penaltyBoxBottom} />
          </View>
          
          {/* Players */}
          {activeFormation.map((pos, index) => {
            const isSelected = selectedSlot?.type === 'starter' && selectedSlot?.index === index;
            return (
              <View 
                key={`starter-${index}`} 
                style={[styles.absoluteNode, { top: pos.top as any, left: pos.left as any }]}
              >
                {renderPlayerNode(starters[index], pos.label, isSelected, () => handleSlotPress('starter', index))}
              </View>
            );
          })}
        </View>

        {/* Formation Dropdown */}
        <View style={{ zIndex: 100 }}>
          <View style={styles.formationBar}>
            <Text style={styles.formationLabel}>FORMATION</Text>
            <TouchableOpacity 
              style={styles.formationSelect} 
              activeOpacity={0.7} 
              onPress={() => setShowFormationDropdown(!showFormationDropdown)}
            >
              <Text style={styles.formationSelectText}>{selectedFormationKey}</Text>
              <MaterialCommunityIcons name={showFormationDropdown ? "menu-up" : "menu-down"} size={24} color="#000" />
            </TouchableOpacity>
          </View>
          
          {showFormationDropdown && (
            <View style={styles.dropdownMenu}>
              {Object.keys(FORMATIONS).map((formKey) => (
                <TouchableOpacity
                  key={formKey}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedFormationKey(formKey as keyof typeof FORMATIONS);
                    setShowFormationDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    selectedFormationKey === formKey && styles.dropdownItemTextActive
                  ]}>{formKey}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Bench & Reserves */}
        <View style={styles.benchCard}>
          <Text style={styles.benchTitle}>Substitutes</Text>
          <View style={styles.benchGrid}>
            {subs.map((p, idx) => {
              const isSelected = selectedSlot?.type === 'sub' && selectedSlot?.index === idx;
              return (
                <View key={`sub-${p.playerID}`} style={styles.benchNode}>
                  {renderPlayerNode(p, p.position, isSelected, () => handleSlotPress('sub', idx), true)}
                </View>
              );
            })}
          </View>

          <View style={styles.divider} />

          <Text style={styles.benchTitle}>Reserves</Text>
          <View style={styles.benchGrid}>
            {reserves.map((p, idx) => {
              const isSelected = selectedSlot?.type === 'reserve' && selectedSlot?.index === idx;
              return (
                <View key={`res-${p.playerID}`} style={styles.benchNode}>
                  {renderPlayerNode(p, p.position, isSelected, () => handleSlotPress('reserve', idx), true)}
                </View>
              );
            })}
          </View>
        </View>

        {/* Injured Players List */}
        {injuredPlayers.length > 0 && (
          <View style={styles.injuredCard}>
            <Text style={styles.injuredTitle}>INJURED</Text>
            {injuredPlayers.map(p => (
              <View key={p.playerID} style={styles.injuredRow}>
                <MaterialCommunityIcons name="bandage" size={16} color={Colors.red} />
                <Text style={styles.injuredName}>{p.name} ({p.position})</Text>
                <Text style={styles.injuredWeeks}>{p.weeksRemaining} week{p.weeksRemaining !== 1 ? 's' : ''}</Text>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 20,
    marginBottom: 10,
  },
  backButton: {
    marginRight: 10,
  },
  title: {
    fontSize: 20,
    color: Colors.green,
    fontWeight: '900',
    letterSpacing: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
  },
  ovrContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  ovrLabel: {
    fontSize: 28,
    color: '#FFF',
    fontWeight: 'bold',
  },
  ovrValue: {
    fontSize: 32,
    color: Colors.green,
    fontWeight: '900',
  },
  pitchContainer: {
    width: '100%',
    aspectRatio: 0.7,
    backgroundColor: '#2D8B4E', // pitch green
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
  },
  pitchLines: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    margin: 15,
  },
  centerLine: {
    position: 'absolute',
    top: '50%',
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  centerCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    transform: [{ translateX: -40 }, { translateY: -40 }],
  },
  penaltyBoxTop: {
    position: 'absolute',
    top: 0,
    left: '25%',
    width: '50%',
    height: '15%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    borderTopWidth: 0,
  },
  penaltyBoxBottom: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    width: '50%',
    height: '15%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    borderBottomWidth: 0,
  },
  absoluteNode: {
    position: 'absolute',
    transform: [{ translateX: -30 }, { translateY: -40 }],
    width: 60,
    alignItems: 'center',
  },
  nodeContainer: {
    alignItems: 'center',
    padding: 4,
    borderRadius: 8,
  },
  nodeSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  nodeName: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#000',
  },
  ovrBadge: {
    position: 'absolute',
    top: -5,
    right: -8,
    backgroundColor: Colors.green,
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#000',
  },
  ovrBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  posPill: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: -8,
    zIndex: -1,
    paddingTop: 8, // hide behind circle
  },
  posPillText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  formationBar: {
    backgroundColor: Colors.green,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  formationLabel: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  formationSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  formationSelectText: {
    color: '#000',
    fontWeight: 'bold',
    marginRight: 4,
  },
  benchCard: {
    backgroundColor: Colors.green,
    borderRadius: 20,
    padding: 20,
  },
  benchTitle: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  benchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  benchNode: {
    width: 60,
    alignItems: 'center',
  },
  divider: {
    height: 3,
    backgroundColor: '#FFF',
    marginVertical: 15,
  },
  dropdownMenu: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    marginTop: -10,
    marginBottom: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#000',
  },
  dropdownItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  dropdownItemText: {
    color: '#000',
    fontWeight: 'bold',
  },
  dropdownItemTextActive: {
    color: Colors.green,
  },
  fatigueBar: {
    backgroundColor: 'rgba(231, 76, 60, 0.85)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fatigueBarText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
  },
  nodeNameFatigued: {
    backgroundColor: 'rgba(231, 76, 60, 0.7)',
    color: '#FFF',
  },
  nodeNameInjured: {
    backgroundColor: 'rgba(231, 76, 60, 0.9)',
    color: '#FFF',
  },
  iconCircleInjured: {
    backgroundColor: '#ddd',
    borderColor: Colors.red,
  },
  injuryOverlay: {
    position: 'absolute',
    bottom: -4,
    left: -4,
  },
  injuredCard: {
    backgroundColor: 'rgba(231, 76, 60, 0.15)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.3)',
    padding: 16,
    marginTop: 16,
  },
  injuredTitle: {
    color: Colors.red,
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 1,
    marginBottom: 10,
  },
  injuredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  injuredName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  injuredWeeks: {
    color: Colors.red,
    fontSize: 13,
    fontWeight: 'bold',
  },
});
