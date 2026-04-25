import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';

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

interface Team {
  teamID: number;
  teamName: string;
}

interface LeaguePlayer {
  managerName: string;
  teamId: number | null;
  teamName: string | null;
}

interface League {
  code: string;
  hostManagerName: string;
  status: string;
  players: LeaguePlayer[];
}

export function MultiplayerLobbyScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { code, managerName, isHost } = route.params as { code: string; managerName: string; isHost: boolean };

  const [league, setLeague] = useState<League | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [teamConfirmed, setTeamConfirmed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [starting, setStarting] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(true);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLeague = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/mp/league/${code}`);
      if (!res.ok) return;
      const data: League = await res.json();
      setLeague(data);

      if (data.status === 'active') {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        navigation.replace('MultiplayerLeague', { code, managerName });
      }
    } catch (_) {}
  }, [code, managerName, navigation]);

  useFocusEffect(
    useCallback(() => {
      fetchLeague();
      pollRef.current = setInterval(fetchLeague, 3000);
      return () => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      };
    }, [fetchLeague])
  );

  React.useEffect(() => {
    const loadTeams = async () => {
      try {
        const res = await fetch(`${API_BASE}/teams`);
        if (!res.ok) return;
        const data = await res.json();
        setTeams(data);
      } catch (_) {}
      finally { setLoadingTeams(false); }
    };
    loadTeams();
  }, []);

  const handleConfirmTeam = async () => {
    if (!selectedTeamId) {
      Alert.alert('Select a Team', 'Please choose a team first.');
      return;
    }
    try {
      setConfirming(true);
      const res = await fetch(`${API_BASE}/mp/league/${code}/select-team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerName, teamId: selectedTeamId }),
      });
      if (!res.ok) throw new Error();
      setTeamConfirmed(true);
      fetchLeague();
    } catch (_) {
      Alert.alert('Error', 'Could not confirm team selection.');
    } finally {
      setConfirming(false);
    }
  };

  const handleStart = async () => {
    try {
      setStarting(true);
      const res = await fetch(`${API_BASE}/mp/league/${code}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerName }),
      });
      if (!res.ok) {
        const json = await res.json();
        Alert.alert('Cannot Start', json.message || 'Not ready to start.');
        return;
      }
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      navigation.replace('MultiplayerLeague', { code, managerName });
    } catch (_) {
      Alert.alert('Error', 'Could not start the league.');
    } finally {
      setStarting(false);
    }
  };

  const allReady = league ? league.players.every(p => p.teamId !== null) && league.players.length >= 2 : false;
  const myEntry = league?.players.find(p => p.managerName === managerName);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="keyboard-return" size={32} color={Colors.green} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lobby</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* League Code Badge */}
        <View style={styles.codeBadge}>
          <Text style={styles.codeLabel}>LEAGUE CODE</Text>
          <Text style={styles.codeText}>{code}</Text>
          <Text style={styles.codeHint}>Share this code with friends</Text>
        </View>

        {/* Players List */}
        <Text style={styles.sectionTitle}>Players ({league?.players.length ?? 0})</Text>
        <View style={styles.playersList}>
          {(league?.players ?? []).map(p => (
            <View key={p.managerName} style={styles.playerRow}>
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>{p.managerName}</Text>
                {p.managerName === league?.hostManagerName && (
                  <View style={styles.hostBadge}><Text style={styles.hostBadgeText}>HOST</Text></View>
                )}
              </View>
              <View style={styles.playerTeam}>
                {p.teamId ? (
                  <>
                    {TEAM_LOGOS[p.teamName ?? ''] && (
                      <Image source={TEAM_LOGOS[p.teamName ?? '']} style={styles.smallLogo} resizeMode="contain" />
                    )}
                    <Text style={styles.playerTeamName}>{p.teamName}</Text>
                    <MaterialCommunityIcons name="check-circle" size={18} color={Colors.green} />
                  </>
                ) : (
                  <Text style={styles.selectingText}>Selecting...</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Team Selection Grid */}
        {!teamConfirmed && (
          <>
            <Text style={styles.sectionTitle}>Select Your Team</Text>
            {loadingTeams ? (
              <ActivityIndicator color={Colors.green} style={{ marginVertical: Spacing.xl }} />
            ) : (
              <View style={styles.teamGrid}>
                {teams.map(team => {
                  const logo = TEAM_LOGOS[team.teamName];
                  const selected = selectedTeamId === team.teamID;
                  const takenByOther = league?.players.some(
                    p => p.managerName !== managerName && p.teamId === team.teamID
                  );
                  return (
                    <TouchableOpacity
                      key={team.teamID}
                      style={[
                        styles.teamCard,
                        selected && styles.teamCardSelected,
                        takenByOther && styles.teamCardTaken,
                      ]}
                      onPress={() => !takenByOther && setSelectedTeamId(team.teamID)}
                      disabled={takenByOther}
                      activeOpacity={0.7}
                    >
                      {logo ? (
                        <Image source={logo} style={styles.teamLogo} resizeMode="contain" />
                      ) : (
                        <View style={styles.teamLogoPlaceholder}>
                          <Text style={styles.teamLogoLetter}>{team.teamName.charAt(0)}</Text>
                        </View>
                      )}
                      <Text style={[styles.teamName, takenByOther && styles.teamNameTaken]} numberOfLines={2}>
                        {team.teamName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <TouchableOpacity
              style={[styles.confirmButton, !selectedTeamId && styles.confirmButtonDisabled]}
              onPress={handleConfirmTeam}
              disabled={!selectedTeamId || confirming}
              activeOpacity={0.8}
            >
              {confirming ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm Team</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {teamConfirmed && myEntry?.teamName && (
          <View style={styles.confirmedBadge}>
            {TEAM_LOGOS[myEntry.teamName] && (
              <Image source={TEAM_LOGOS[myEntry.teamName]} style={styles.confirmedLogo} resizeMode="contain" />
            )}
            <Text style={styles.confirmedText}>You're playing as {myEntry.teamName}</Text>
            <MaterialCommunityIcons name="check-circle" size={22} color={Colors.green} />
          </View>
        )}

        {/* Start League (host only) */}
        {isHost && (
          <TouchableOpacity
            style={[styles.startButton, !allReady && styles.startButtonDisabled]}
            onPress={handleStart}
            disabled={!allReady || starting}
            activeOpacity={0.8}
          >
            {starting ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.startButtonText}>
                {allReady ? 'START LEAGUE' : 'Waiting for all players...'}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {!isHost && (
          <Text style={styles.waitingText}>Waiting for host to start the league...</Text>
        )}

        <View style={{ height: Spacing.xl * 2 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  backButton: { marginRight: Spacing.md },
  headerTitle: { fontSize: 28, color: Colors.text, fontWeight: '800' },
  scroll: { paddingHorizontal: Spacing.xl },
  codeBadge: {
    backgroundColor: Colors.surface2,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  codeLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textDim,
    letterSpacing: 3,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  codeText: {
    fontSize: 40,
    color: Colors.green,
    fontWeight: '900',
    letterSpacing: 8,
  },
  codeHint: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.textDim,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },
  playersList: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface2,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  playerInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  playerName: { fontSize: Typography.fontSize.base, color: Colors.text, fontWeight: '700' },
  hostBadge: {
    backgroundColor: Colors.green,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  hostBadgeText: { fontSize: 10, color: '#000', fontWeight: '900' },
  playerTeam: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  smallLogo: { width: 22, height: 22 },
  playerTeamName: { fontSize: Typography.fontSize.sm, color: Colors.text, fontWeight: '600' },
  selectingText: { fontSize: Typography.fontSize.sm, color: Colors.textMuted, fontStyle: 'italic' },
  teamGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  teamCard: {
    width: '30%',
    aspectRatio: 0.85,
    backgroundColor: Colors.surface2,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  teamCardSelected: {
    borderColor: Colors.green,
    backgroundColor: 'rgba(29,185,84,0.12)',
  },
  teamCardTaken: { opacity: 0.3 },
  teamLogo: { width: 48, height: 48, marginBottom: Spacing.xs },
  teamLogoPlaceholder: {
    width: 48, height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  teamLogoLetter: { color: Colors.text, fontSize: 22, fontWeight: '800' },
  teamName: {
    fontSize: 10,
    color: Colors.text,
    textAlign: 'center',
    fontWeight: '600',
  },
  teamNameTaken: { color: Colors.textMuted },
  confirmButton: {
    backgroundColor: Colors.green,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  confirmButtonDisabled: { backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border },
  confirmButtonText: { fontSize: Typography.fontSize.lg, color: '#000', fontWeight: '800' },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: 'rgba(29,185,84,0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.green,
    marginBottom: Spacing.xl,
  },
  confirmedLogo: { width: 36, height: 36 },
  confirmedText: { flex: 1, fontSize: Typography.fontSize.base, color: Colors.text, fontWeight: '700' },
  startButton: {
    backgroundColor: Colors.green,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  startButtonDisabled: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  startButtonText: { fontSize: Typography.fontSize.lg, color: '#000', fontWeight: '800', letterSpacing: 1 },
  waitingText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: Spacing.lg,
  },
});
