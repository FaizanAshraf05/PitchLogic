import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Shadow } from 'react-native-shadow-2';
import * as FileSystem from 'expo-file-system';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';

const { width, height } = Dimensions.get('window');

import { API_BASE } from '../api/config';

const TEAM_LOGOS: Record<string, any> = {
  'Arsenal': require('../../assets/teams/arsenal.png'),
  'Chelsea': require('../../assets/teams/chelsea.png'),
  'Everton': require('../../assets/teams/everton.png'),
  'Liverpool': require('../../assets/teams/liverpool.png'),
  'Manchester City': require('../../assets/teams/man_city.png'),
  'Manchester United': require('../../assets/teams/man_utd.png'),
  'Tottenham Hotspur': require('../../assets/teams/tottenham.png'),
  'West Ham United': require('../../assets/teams/west_ham.png'),
  'Leicester City': require('../../assets/teams/leicester.png'),
  'Wolverhampton Wanderers': require('../../assets/teams/wolves.png'),
  'Atlético Madrid': require('../../assets/teams/atletico.png'),
  'FC Barcelona': require('../../assets/teams/barcelona.png'),
  'Real Madrid CF': require('../../assets/teams/real_madrid.png'),
  'Athletic Club de Bilbao': require('../../assets/teams/bilbao.png'),
  'Real Betis Balompié': require('../../assets/teams/betis.png'),
  'RC Celta de Vigo': require('../../assets/teams/celta.png'),
  'Real Sociedad': require('../../assets/teams/sociedad.png'),
  'Valencia CF': require('../../assets/teams/valencia.png'),
  'Sevilla FC': require('../../assets/teams/sevilla.png'),
  'Villarreal CF': require('../../assets/teams/villarreal.png'),
};

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [budget, setBudget] = useState<number | null>(null);
  const [nextMatch, setNextMatch] = useState<any | null>(null);
  const [teamsMap, setTeamsMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [showManagerStats, setShowManagerStats] = useState(false);
  const [teamStats, setTeamStats] = useState<{played: number; wins: number; draws: number; losses: number}>({played: 0, wins: 0, draws: 0, losses: 0});

  // Get manager name and team ID directly from route params
  const managerName = route.params?.managerName || '[NAME]';
  const teamId = route.params?.teamId || 10; // Fallback to Man City
  const managerNameUpper = managerName.toUpperCase();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    if (hour < 21) return 'Good Evening';
    return 'Good Night';
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [teamId])
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      const reqManagerName = route.params?.managerName || navigation.getState()?.routes.find((r: any) => r.name === 'Main')?.params?.managerName || 'default';
      // Fetch all teams to get budget and map names
      const teamsRes = await fetch(`${API_BASE}/teams`, {
        headers: { 'x-manager-name': reqManagerName }
      });
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        const map: Record<number, string> = {};
        teamsData.forEach((t: any) => {
          map[t.teamID] = t.teamName;
          if (t.teamID === teamId) {
            setBudget(t.transferBudget);
          }
        });
        setTeamsMap(map);

        // Fetch team stats for manager bubble
        const statsRes = await fetch(`${API_BASE}/league/standings`, {
          headers: { 'x-manager-name': reqManagerName }
        });
        if (statsRes.ok) {
          const standings = await statsRes.json();
          const myTeam = standings.find((t: any) => t.teamID === teamId);
          if (myTeam) {
            setTeamStats({
              played: myTeam.matchesPlayed || 0,
              wins: myTeam.wins || 0,
              draws: myTeam.draws || 0,
              losses: myTeam.losses || 0,
            });
          }
        }
      }

      // Fetch next match
      const matchRes = await fetch(`${API_BASE}/teams/${teamId}/next-match`, {
        headers: { 'x-manager-name': reqManagerName }
      });
      if (matchRes.ok) {
        const matchData = await matchRes.json();
        if (!matchData.message) {
          setNextMatch(matchData);
        } else {
          setNextMatch(null);
        }
      }
    } catch (error) {
      console.error('Error fetching home screen data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndQuit = async () => {
    try {
      const reqManagerName = route.params?.managerName || 'default';
      const res = await fetch(`${API_BASE}/game/state`, {
        headers: { 'x-manager-name': reqManagerName }
      });
      if (!res.ok) {
        Alert.alert('Error', 'No active game to save.');
        return;
      }
      const gameState = await res.json();

      // Save to device local storage
      const saveData = JSON.stringify({
        managerName: reqManagerName,
        teamId,
        gameState
      });
      const saveFile = new FileSystem.File(FileSystem.Paths.document, 'savegame.txt');
      saveFile.write(saveData);

      Alert.alert('Game Saved', 'Your progress has been saved.', [
        { text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Title' }] }) }
      ]);
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save game.');
    }
  };

  const handleAdvance = () => {
    if (nextMatch) {
      navigation.navigate('PreMatch', { matchId: nextMatch.matchID, teamId });
    } else {
      Alert.alert('No Matches', 'There are no upcoming matches in your schedule.');
    }
  };

  const actions = [
    { id: 'squad', title: 'Squad', icon: 'account-group', route: 'Squad' },
    { id: 'transfers', title: 'Transfers', icon: 'swap-horizontal', route: 'Transfer' },
    { id: 'training', title: 'Training', icon: 'flag', route: 'Training' },
    { id: 'league_table', title: 'League Table', icon: 'table', route: 'League' },
    { id: 'facilities', title: 'Facilities', icon: 'office-building', route: 'Facilities' },
    { id: 'schedule', title: 'Schedule', icon: 'calendar-month', route: 'Schedule' },
  ];

  const formatCurrency = (value: number | null) => {
    if (value === null) return '$0';
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value}`;
  };

  const renderNextMatch = () => {
    if (loading) {
      return (
        <View style={styles.matchCard}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      );
    }

    if (!nextMatch) {
      return (
        <View style={styles.matchCard}>
          <Text style={styles.noMatchText}>No upcoming matches.</Text>
          <Text style={styles.noMatchSubText}>Generate a season to begin.</Text>
        </View>
      );
    }

    const homeTeamName = teamsMap[nextMatch.homeTeamID] || 'Unknown Team';
    const awayTeamName = teamsMap[nextMatch.awayTeamID] || 'Unknown Team';

    // Fallback if logo not found
    const homeLogo = TEAM_LOGOS[homeTeamName] || null;
    const awayLogo = TEAM_LOGOS[awayTeamName] || null;

    // Date formatting (assuming YYYY-MM-DD or ISO format)
    const matchDate = new Date(nextMatch.matchDate);
    const dateStr = isNaN(matchDate.getTime())
      ? nextMatch.matchDate
      : matchDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    return (
      <View style={styles.matchCard}>
        <Text style={styles.matchdayText}>Matchday</Text>

        <View style={styles.teamsRow}>
          <View style={styles.teamColumn}>
            <View style={styles.logoContainer}>
              {homeLogo ? (
                <Image source={homeLogo} style={styles.teamLogo} resizeMode="contain" />
              ) : (
                <Text style={styles.fallbackLogo}>{homeTeamName.charAt(0)}</Text>
              )}
            </View>
            <Text style={styles.teamNameText} numberOfLines={1}>{homeTeamName}</Text>
          </View>

          <Text style={styles.vsText}>VS</Text>

          <View style={styles.teamColumn}>
            <View style={styles.logoContainer}>
              {awayLogo ? (
                <Image source={awayLogo} style={styles.teamLogo} resizeMode="contain" />
              ) : (
                <Text style={styles.fallbackLogo}>{awayTeamName.charAt(0)}</Text>
              )}
            </View>
            <Text style={styles.teamNameText} numberOfLines={1}>{awayTeamName}</Text>
          </View>
        </View>

        <View style={styles.datePill}>
          <Text style={styles.dateText}>{dateStr}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />

      {/* Background Image */}
      <View style={styles.backgroundWrapper}>
        <Image
          source={require('../../assets/Rectangle 5.png')}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        <View style={styles.overlay} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingText}>{getGreeting()}</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => setShowManagerStats(true)}>
              <Text style={styles.nameText}>{managerNameUpper}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.inboxIcon}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Inbox', { teamId })}
          >
            <MaterialCommunityIcons name="email-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Manager Stats Bubble */}
        <Modal
          visible={showManagerStats}
          transparent
          animationType="fade"
          onRequestClose={() => setShowManagerStats(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowManagerStats(false)}
          >
            <View style={styles.statsBubble}>
              <Text style={styles.bubbleTitle}>{managerNameUpper}</Text>
              <View style={styles.bubbleDivider} />
              <View style={styles.bubbleRow}>
                <Text style={styles.bubbleLabel}>Matches Played</Text>
                <Text style={styles.bubbleValue}>{teamStats.played}</Text>
              </View>
              <View style={styles.bubbleRow}>
                <Text style={styles.bubbleLabel}>Wins</Text>
                <Text style={[styles.bubbleValue, { color: Colors.green }]}>{teamStats.wins}</Text>
              </View>
              <View style={styles.bubbleRow}>
                <Text style={styles.bubbleLabel}>Draws</Text>
                <Text style={[styles.bubbleValue, { color: Colors.amber }]}>{teamStats.draws}</Text>
              </View>
              <View style={styles.bubbleRow}>
                <Text style={styles.bubbleLabel}>Losses</Text>
                <Text style={[styles.bubbleValue, { color: Colors.red }]}>{teamStats.losses}</Text>
              </View>
              <View style={styles.bubbleDivider} />
              <View style={styles.bubbleRow}>
                <Text style={styles.bubbleLabel}>Win Rate</Text>
                <Text style={[styles.bubbleValue, { color: Colors.green }]}>
                  {teamStats.played > 0 ? `${Math.round((teamStats.wins / teamStats.played) * 100)}%` : '—'}
                </Text>
              </View>
              <TouchableOpacity style={styles.bubbleClose} onPress={() => setShowManagerStats(false)}>
                <Text style={styles.bubbleCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Budget Card */}
        <View style={styles.budgetContainer}>
          <View style={styles.budgetCard}>
            <Text style={styles.budgetTitle}>BUDGET</Text>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.budgetValue}>{formatCurrency(budget)}</Text>
            )}
          </View>
        </View>

        {/* Actions Grid */}
        <View style={styles.gridContainer}>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionButton}
              activeOpacity={0.8}
              onPress={() => action.route && navigation.navigate(action.route, { teamId })}
            >
              <MaterialCommunityIcons name={action.icon as any} size={28} color="#000" />
              <Text style={styles.actionText}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Next Match Section */}
        <View style={styles.nextMatchContainer}>
          <Text style={styles.nextMatchTitle}>Next Match</Text>
          {renderNextMatch()}
        </View>

        {/* Advance Button */}
        <View style={styles.advanceContainer}>
          <Shadow
            distance={20}
            startColor={'rgba(29, 185, 84, 0.4)'}
            endColor={'rgba(29, 185, 84, 0)'}
            offset={[0, 4]}
            style={{ width: '100%' }}
            containerStyle={{ width: '100%' }}
          >
            <TouchableOpacity
              style={styles.advanceButton}
              activeOpacity={0.8}
              onPress={handleAdvance}
            >
              <Text style={styles.advanceButtonText}>ADVANCE</Text>
            </TouchableOpacity>
          </Shadow>
        </View>

        {/* Save & Quit */}
        <TouchableOpacity
          style={styles.saveQuitButton}
          activeOpacity={0.7}
          onPress={handleSaveAndQuit}
        >
          <Text style={styles.saveQuitText}>SAVE & QUIT</Text>
        </TouchableOpacity>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
  },
  backgroundWrapper: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12,
  },
  backgroundImage: {
    width: width,
    height: height,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  greetingText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  nameText: {
    fontSize: 26,
    color: Colors.green,
    fontWeight: 'bold',
    marginTop: 2,
  },
  inboxIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  budgetContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  budgetCard: {
    backgroundColor: 'rgba(30, 30, 30, 0.7)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.3)',
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    minWidth: '60%',
  },
  budgetTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  budgetValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 25,
    gap: 12,
  },
  actionButton: {
    width: (width - Spacing.xl * 2 - 30) / 3,
    aspectRatio: 1.2,
    backgroundColor: Colors.green,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  nextMatchContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  nextMatchTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  matchCard: {
    backgroundColor: Colors.green,
    borderRadius: 20,
    padding: 16,
    width: '85%',
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
  },
  matchdayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 16,
  },
  teamColumn: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 4,
  },
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#000',
  },
  teamLogo: {
    width: 28,
    height: 28,
  },
  fallbackLogo: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  teamNameText: {
    color: '#FFFFFF',
    fontSize: 10,
    textAlign: 'center',
  },
  vsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginHorizontal: 12,
  },
  datePill: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e68a00',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 9,
  },
  noMatchText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  noMatchSubText: {
    color: '#ccc',
    fontSize: 12,
  },
  advanceContainer: {
    alignItems: 'center',
    marginTop: 15,
    width: '100%',
  },
  advanceButton: {
    backgroundColor: Colors.green,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    width: '100%',
  },
  advanceButtonText: {
    fontSize: Typography.fontSize.lg,
    color: Colors.textOnPrimary,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: Typography.letterSpacing.wider,
  },
  saveQuitButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 10,
  },
  saveQuitText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsBubble: {
    backgroundColor: '#1a1f1a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(46, 204, 113, 0.3)',
    padding: 24,
    width: width * 0.75,
  },
  bubbleTitle: {
    color: Colors.green,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  bubbleDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 10,
  },
  bubbleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  bubbleLabel: {
    color: '#AAA',
    fontSize: 14,
  },
  bubbleValue: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bubbleClose: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bubbleCloseText: {
    color: Colors.textDim,
    fontSize: 14,
    fontWeight: '600',
  },
});