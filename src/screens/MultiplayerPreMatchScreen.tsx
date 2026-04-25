import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
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

interface ActiveMatch {
  matchId: number;
  homeManager: string;
  awayManager: string;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  homeOVR: number;
  awayOVR: number;
  homeManagerReady: boolean;
  awayManagerReady: boolean;
  homeGoals: number | null;
  awayGoals: number | null;
  status: 'waiting' | 'done';
}

export function MultiplayerPreMatchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { matchId, leagueCode, managerName } = route.params as {
    matchId: number;
    leagueCode: string;
    managerName: string;
  };

  const [match, setMatch] = useState<ActiveMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [pressing, setPressing] = useState(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultShown = useRef(false);

  const fetchMatch = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/mp/matches/${matchId}?leagueCode=${leagueCode}`);
      if (!res.ok) return;
      const data = await res.json();
      const m: ActiveMatch = data.match;
      setMatch(m);
      setLoading(false);

      if (m.status === 'done' && !resultShown.current) {
        resultShown.current = true;
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }

        const isHome = managerName === m.homeManager;
        const myGoals = isHome ? m.homeGoals! : m.awayGoals!;
        const theirGoals = isHome ? m.awayGoals! : m.homeGoals!;
        const myTeam = isHome ? m.homeTeamName : m.awayTeamName;
        const theirTeam = isHome ? m.awayTeamName : m.homeTeamName;
        const outcome = myGoals > theirGoals ? 'WIN 🏆' : myGoals < theirGoals ? 'LOSS' : 'DRAW';

        Alert.alert(
          'Full Time',
          `${myTeam} ${myGoals} – ${theirGoals} ${theirTeam}\n\nResult: ${outcome}`,
          [{ text: 'Back to League', onPress: () => navigation.goBack() }],
          { cancelable: false }
        );
      }
    } catch (_) {}
  }, [matchId, leagueCode, managerName, navigation]);

  useFocusEffect(
    useCallback(() => {
      resultShown.current = false;
      fetchMatch();
      pollRef.current = setInterval(fetchMatch, 3000);
      return () => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      };
    }, [fetchMatch])
  );

  const handleReady = async () => {
    try {
      setPressing(true);
      const res = await fetch(`${API_BASE}/mp/matches/${matchId}/ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueCode, managerName }),
      });
      if (!res.ok) throw new Error();
      setWaitingForOpponent(true);
      fetchMatch();
    } catch (_) {
      Alert.alert('Error', 'Could not confirm ready status.');
    } finally {
      setPressing(false);
    }
  };

  if (loading || !match) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.green} />
      </View>
    );
  }

  const isHome = managerName === match.homeManager;
  const myTeamName = isHome ? match.homeTeamName : match.awayTeamName;
  const oppTeamName = isHome ? match.awayTeamName : match.homeTeamName;
  const myOVR = isHome ? match.homeOVR : match.awayOVR;
  const oppOVR = isHome ? match.awayOVR : match.homeOVR;
  const oppManager = isHome ? match.awayManager : match.homeManager;

  const totalOVR = match.homeOVR + match.awayOVR;
  const homeWinProb = totalOVR > 0 ? ((match.homeOVR / totalOVR) * 100).toFixed(0) : '50';
  const awayWinProb = totalOVR > 0 ? ((match.awayOVR / totalOVR) * 100).toFixed(0) : '50';
  const myWinProb = isHome ? homeWinProb : awayWinProb;
  const oppWinProb = isHome ? awayWinProb : homeWinProb;

  const homeLogo = TEAM_LOGOS[match.homeTeamName] || null;
  const awayLogo = TEAM_LOGOS[match.awayTeamName] || null;
  const myLogo = isHome ? homeLogo : awayLogo;
  const oppLogo = isHome ? awayLogo : homeLogo;

  const iAlreadyReady = isHome ? match.homeManagerReady : match.awayManagerReady;
  const opponentReady = isHome ? match.awayManagerReady : match.homeManagerReady;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Image source={require('../../assets/pitch-bg.png')} style={styles.backgroundImage} />
      <View style={styles.overlay} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="keyboard-return" size={32} color={Colors.green} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Multiplayer Match</Text>
      </View>

      {/* Matchup Banner */}
      <View style={styles.matchupContainer}>
        <View style={styles.teamLogoContainer}>
          {myLogo
            ? <Image source={myLogo} style={styles.logo} resizeMode="contain" />
            : <Text style={styles.fallbackLogo}>{myTeamName.charAt(0)}</Text>
          }
          <Text style={styles.teamNameText} numberOfLines={1}>{myTeamName}</Text>
          <Text style={styles.managerLabel}>{managerName} (You)</Text>
        </View>

        <View style={styles.vsContainer}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        <View style={styles.teamLogoContainer}>
          {oppLogo
            ? <Image source={oppLogo} style={styles.logo} resizeMode="contain" />
            : <Text style={styles.fallbackLogo}>{oppTeamName.charAt(0)}</Text>
          }
          <Text style={styles.teamNameText} numberOfLines={1}>{oppTeamName}</Text>
          <Text style={styles.managerLabel}>{oppManager}</Text>
        </View>
      </View>

      {/* Stats Card */}
      <View style={styles.statsCard}>
        <Text style={styles.tableTitle}>TEAM COMPARISON</Text>

        <View style={styles.statRow}>
          <Text style={styles.statValueHome}>{myWinProb}%</Text>
          <Text style={styles.statLabel}>Win Probability</Text>
          <Text style={styles.statValueAway}>{oppWinProb}%</Text>
        </View>
        <View style={styles.divider} />

        <View style={styles.statRow}>
          <Text style={styles.statValueHome}>{myOVR}</Text>
          <Text style={styles.statLabel}>Overall Rating</Text>
          <Text style={styles.statValueAway}>{oppOVR}</Text>
        </View>
        <View style={styles.divider} />

        {/* Readiness indicators */}
        <View style={styles.statRow}>
          <View style={styles.readyIndicator}>
            <MaterialCommunityIcons
              name={iAlreadyReady ? 'check-circle' : 'clock-outline'}
              size={20}
              color={iAlreadyReady ? Colors.green : Colors.textMuted}
            />
            <Text style={[styles.readyText, iAlreadyReady && styles.readyTextActive]}>
              {iAlreadyReady ? 'Ready' : 'Not ready'}
            </Text>
          </View>
          <Text style={styles.statLabel}>Status</Text>
          <View style={[styles.readyIndicator, { justifyContent: 'flex-end' }]}>
            <MaterialCommunityIcons
              name={opponentReady ? 'check-circle' : 'clock-outline'}
              size={20}
              color={opponentReady ? Colors.green : Colors.textMuted}
            />
            <Text style={[styles.readyText, opponentReady && styles.readyTextActive]}>
              {opponentReady ? 'Ready' : 'Not ready'}
            </Text>
          </View>
        </View>
      </View>

      {/* Play Match Button */}
      <View style={styles.buttonContainer}>
        {(waitingForOpponent || iAlreadyReady) ? (
          <View style={styles.waitingButton}>
            <ActivityIndicator color={Colors.green} style={{ marginRight: Spacing.md }} />
            <Text style={styles.waitingButtonText}>Waiting for opponent...</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.playButton}
            onPress={handleReady}
            disabled={pressing}
            activeOpacity={0.8}
          >
            {pressing ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.playButtonText}>PLAY MATCH</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    opacity: 0.15,
  },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  backButton: { padding: Spacing.xs, marginRight: Spacing.md },
  headerTitle: { fontSize: 26, color: '#FFF', fontWeight: '800' },
  matchupContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  teamLogoContainer: { alignItems: 'center', width: 100 },
  logo: { width: 72, height: 72, marginBottom: Spacing.xs },
  fallbackLogo: {
    width: 72, height: 72,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 36,
    color: '#FFF',
    fontSize: 36,
    textAlign: 'center',
    lineHeight: 72,
    marginBottom: Spacing.xs,
    fontWeight: '800',
  },
  teamNameText: { color: '#FFF', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  managerLabel: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 2 },
  vsContainer: { justifyContent: 'center', alignItems: 'center' },
  vsText: { color: Colors.green, fontSize: 24, fontWeight: '800' },
  statsCard: {
    backgroundColor: 'rgba(25,25,25,0.85)',
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tableTitle: {
    color: Colors.green,
    fontSize: 15,
    fontWeight: '800',
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
  statLabel: { color: '#999', fontSize: 13, flex: 1, textAlign: 'center' },
  statValueHome: { color: '#FFF', fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'left' },
  statValueAway: { color: '#FFF', fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'right' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 4 },
  readyIndicator: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  readyText: { fontSize: 13, color: Colors.textMuted },
  readyTextActive: { color: Colors.green, fontWeight: '700' },
  buttonContainer: { flex: 1, justifyContent: 'flex-end', paddingBottom: Spacing.xl * 2 },
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
  playButtonText: { color: '#000', fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  waitingButton: {
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.green,
  },
  waitingButtonText: { color: Colors.green, fontSize: 16, fontWeight: '700' },
});
