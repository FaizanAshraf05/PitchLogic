import React, { useState, useEffect } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';

const { width } = Dimensions.get('window');

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

interface TeamPreview {
  teamID: number;
  name: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  avgGoals: string;
  overallRating: number;
}

interface MatchPreview {
  match: {
    matchID: number;
    matchDate: string;
    homeTeamID: number;
    awayTeamID: number;
  };
  homeTeam: TeamPreview;
  awayTeam: TeamPreview;
}

export function PreMatchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const matchId = route.params?.matchId;
  const teamId = route.params?.teamId;

  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [data, setData] = useState<MatchPreview | null>(null);

  useEffect(() => {
    if (!matchId) {
      Alert.alert('Error', 'No match specified');
      navigation.goBack();
      return;
    }
    fetchPreview();
  }, [matchId]);

  const fetchPreview = async () => {
    try {
      const res = await fetch(`${API_BASE}/matches/${matchId}/preview`);
      if (!res.ok) throw new Error('Failed to fetch preview');
      const json = await res.json();
      setData(json);
    } catch (error) {
      Alert.alert('Error', 'Failed to load pre-match briefing.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    if (!data) return;
    setSimulating(true);
    
    // Simulate a semi-random score based on probability
    const homeProb = data.homeTeam.overallRating / (data.homeTeam.overallRating + data.awayTeam.overallRating);
    
    // Quick random score algorithm favoring the higher probability team
    let homeGoals = 0;
    let awayGoals = 0;
    for(let i=0; i<5; i++) {
        if(Math.random() < (homeProb * 1.2)) homeGoals++;
        if(Math.random() < ((1 - homeProb) * 1.2)) awayGoals++;
    }

    try {
      const res = await fetch(`${API_BASE}/matches/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeTeamId: data.homeTeam.teamID,
          awayTeamId: data.awayTeam.teamID,
          homeGoals,
          awayGoals
        })
      });
      if (!res.ok) throw new Error('Simulation failed');
      
      Alert.alert('Full Time', `${data.homeTeam.name} ${homeGoals} - ${awayGoals} ${data.awayTeam.name}`, [
          { text: 'Continue', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Error', 'Failed to play match.');
    } finally {
      setSimulating(false);
    }
  };

  if (loading || !data) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.green} />
      </View>
    );
  }

  const { homeTeam, awayTeam } = data;
  const homeLogo = TEAM_LOGOS[homeTeam.name] || null;
  const awayLogo = TEAM_LOGOS[awayTeam.name] || null;

  const totalRating = homeTeam.overallRating + awayTeam.overallRating;
  const homeWinProb = totalRating > 0 ? ((homeTeam.overallRating / totalRating) * 100).toFixed(0) : '50';
  const awayWinProb = totalRating > 0 ? ((awayTeam.overallRating / totalRating) * 100).toFixed(0) : '50';

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
        <Text style={styles.headerTitle}>Pre-Match Briefing</Text>
      </View>

      {/* Matchup Banner */}
      <View style={styles.matchupContainer}>
        <View style={styles.teamLogoContainer}>
            {homeLogo ? <Image source={homeLogo} style={styles.logo} resizeMode="contain" /> : <Text style={styles.fallbackLogo}>{homeTeam.name.charAt(0)}</Text>}
            <Text style={styles.teamNameText} numberOfLines={1}>{homeTeam.name}</Text>
        </View>

        <View style={styles.vsContainer}>
            <Text style={styles.vsText}>VS</Text>
        </View>

        <View style={styles.teamLogoContainer}>
            {awayLogo ? <Image source={awayLogo} style={styles.logo} resizeMode="contain" /> : <Text style={styles.fallbackLogo}>{awayTeam.name.charAt(0)}</Text>}
            <Text style={styles.teamNameText} numberOfLines={1}>{awayTeam.name}</Text>
        </View>
      </View>

      {/* Stats Table */}
      <View style={styles.statsCard}>
          <Text style={styles.tableTitle}>TEAM COMPARISON</Text>
          
          <View style={styles.statRow}>
              <Text style={styles.statValueHome}>{homeWinProb}%</Text>
              <Text style={styles.statLabel}>Win Probability</Text>
              <Text style={styles.statValueAway}>{awayWinProb}%</Text>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.statRow}>
              <Text style={styles.statValueHome}>{homeTeam.overallRating}</Text>
              <Text style={styles.statLabel}>Overall Rating</Text>
              <Text style={styles.statValueAway}>{awayTeam.overallRating}</Text>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.statRow}>
              <Text style={styles.statValueHome}>{homeTeam.matchesPlayed}</Text>
              <Text style={styles.statLabel}>Matches Played</Text>
              <Text style={styles.statValueAway}>{awayTeam.matchesPlayed}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.statRow}>
              <Text style={styles.statValueHome}>{homeTeam.wins}</Text>
              <Text style={styles.statLabel}>Matches Won</Text>
              <Text style={styles.statValueAway}>{awayTeam.wins}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.statRow}>
              <Text style={styles.statValueHome}>{homeTeam.losses}</Text>
              <Text style={styles.statLabel}>Matches Lost</Text>
              <Text style={styles.statValueAway}>{awayTeam.losses}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.statRow}>
              <Text style={styles.statValueHome}>{homeTeam.avgGoals}</Text>
              <Text style={styles.statLabel}>Avg Goals per Game</Text>
              <Text style={styles.statValueAway}>{awayTeam.avgGoals}</Text>
          </View>
      </View>

      {/* Play Match Button */}
      <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: Spacing.xl * 2 }}>
        <TouchableOpacity 
            style={styles.playButton}
            onPress={handleSimulate}
            disabled={simulating}
        >
            {simulating ? (
                <ActivityIndicator color="#000" />
            ) : (
                <Text style={styles.playButtonText}>PLAY MATCH</Text>
            )}
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    opacity: 0.15,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  backButton: {
    padding: Spacing.xs,
    marginRight: Spacing.md,
  },
  headerTitle: {
    fontSize: 28,
    color: '#FFF',
    fontFamily: Typography.fontFamily.bold,
  },
  matchupContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl * 1.5,
  },
  teamLogoContainer: {
    alignItems: 'center',
    width: 100,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: Spacing.sm,
  },
  fallbackLogo: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 40,
    color: '#FFF',
    fontSize: 40,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 80,
    marginBottom: Spacing.sm,
    fontFamily: Typography.fontFamily.bold,
  },
  teamNameText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
    textAlign: 'center',
  },
  vsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  vsText: {
    color: Colors.green,
    fontSize: 24,
    fontFamily: Typography.fontFamily.bold,
  },
  statsCard: {
    backgroundColor: 'rgba(25, 25, 25, 0.85)',
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tableTitle: {
    color: Colors.green,
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    letterSpacing: 1,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  statLabel: {
    color: '#999',
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    flex: 1,
    textAlign: 'center',
  },
  statValueHome: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    flex: 1,
    textAlign: 'left',
  },
  statValueAway: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    flex: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 4,
  },
  playButton: {
    backgroundColor: Colors.green,
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  playButtonText: {
    color: '#000',
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 1,
  }
});
