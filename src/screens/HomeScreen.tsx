import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Shadow } from 'react-native-shadow-2';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';

const { width, height } = Dimensions.get('window');

const API_BASE = 'https://obliged-preamble-amplifier.ngrok-free.dev/api';

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
  const [budget, setBudget] = useState<number | null>(null);
  const [nextMatch, setNextMatch] = useState<any | null>(null);
  const [teamsMap, setTeamsMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  // Try to get manager name and team ID from parent route (Main)
  const parentRoute = navigation.getParent()?.getState()?.routes.find((r: any) => r.name === 'Main');
  const managerName = parentRoute?.params?.managerName || '[NAME]';
  const teamId = parentRoute?.params?.teamId || 10; // Fallback to Man City
  const managerNameUpper = managerName.toUpperCase();

  useEffect(() => {
    fetchData();
  }, [teamId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch all teams to get budget and map names
      const teamsRes = await fetch(`${API_BASE}/teams`);
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
      }

      // Fetch next match
      const matchRes = await fetch(`${API_BASE}/teams/${teamId}/next-match`);
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

  const handleAdvance = () => {
    // Navigate or trigger advance action
  };

  const actions = [
    { id: 'squad', title: 'Squad', icon: 'account-group', route: 'Squad' },
    { id: 'transfers', title: 'Transfers', icon: 'swap-horizontal', route: 'Transfers' },
    { id: 'training', title: 'Training', icon: 'flag', route: 'Training' },
    { id: 'league_table', title: 'League Table', icon: 'table', route: 'League' },
    { id: 'statistics', title: 'Statistics', icon: 'chart-bar', route: 'Statistics' },
    { id: 'schedule', title: 'Schedule', icon: 'calendar-month', route: 'Schedule' },
  ];

  const formatCurrency = (value: number | null) => {
    if (value === null) return '$0';
    return '$' + value.toLocaleString();
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
          <Text style={styles.dateText}>{dateStr} | STADIUM</Text>
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
          <Text style={styles.greetingText}>Good Morning</Text>
          <Text style={styles.nameText}>{managerNameUpper}</Text>
        </View>

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
              onPress={() => action.route && navigation.navigate(action.route)}
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
            containerStyle={{ width: '100%', paddingHorizontal: Spacing.xl }}
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
  },
  backgroundImage: {
    width: width,
    height: height,
    opacity: 0.3,
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
    marginBottom: 25,
    alignItems: 'flex-start',
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
  budgetContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  budgetCard: {
    backgroundColor: 'rgba(30, 30, 30, 0.7)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.3)', // subtle green border
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    minWidth: '60%',
    // Removed shadow/elevation properties to prevent black background bug on Android
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
    width: (width - Spacing.xl * 2 - 30) / 3, // 3 columns, minus padding and gaps
    aspectRatio: 1.2, // Rectangular rather than square makes it smaller vertically
    backgroundColor: '#357a38', // Green matching image
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
    backgroundColor: '#2e6b32', // Dark green card
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
    backgroundColor: 'rgba(0,0,0,0.4)', // Circle behind logo
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
    borderColor: '#e68a00', // Orange border
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
});