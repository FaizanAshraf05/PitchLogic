import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  ImageBackground,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing } from '../theme';

const API_BASE = 'https://obliged-preamble-amplifier.ngrok-free.dev/api';

interface MPPlayer {
  managerName: string;
  teamId: number;
  teamName: string;
  teamOVR: number;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  matchesPlayed: number;
  goalDifference: number;
}

interface PendingInvite {
  inviteId: number;
  fromManager: string;
  toManager: string;
  fromTeamName: string;
  toTeamName: string;
  status: string;
}

interface ActiveMatch {
  matchId: number;
  homeManager: string;
  awayManager: string;
  status: string;
}

interface League {
  code: string;
  hostManagerName: string;
  status: string;
  players: MPPlayer[];
  pendingInvites: PendingInvite[];
  activeMatches: ActiveMatch[];
}

export function MultiplayerLeagueScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { code, managerName } = route.params as { code: string; managerName: string };

  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inviteAlertShown = useRef(false);
  const outgoingNavigated = useRef(false);

  const fetchLeague = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/mp/league/${code}`);
      if (!res.ok) return;
      const data: League = await res.json();
      setLeague(data);
      setLoading(false);

      // Check if an outgoing invite was accepted — navigate the challenger to PreMatch
      if (!outgoingNavigated.current) {
        const accepted = data.pendingInvites.find(
          i => i.fromManager === managerName && i.status === 'accepted'
        );
        if (accepted) {
          const match = data.activeMatches.find(
            m => (m.homeManager === managerName || m.awayManager === managerName) && m.status === 'waiting'
          );
          if (match) {
            outgoingNavigated.current = true;
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            navigation.navigate('MultiplayerPreMatch', { matchId: match.matchId, leagueCode: code, managerName });
            return;
          }
        }
      }

      // Check for incoming invites
      const incoming = data.pendingInvites.find(
        i => i.toManager === managerName && i.status === 'pending'
      );
      if (incoming && !inviteAlertShown.current) {
        inviteAlertShown.current = true;
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }

        Alert.alert(
          'Match Invite',
          `${incoming.fromManager} (${incoming.fromTeamName}) has challenged you to a match!`,
          [
            {
              text: 'Decline',
              style: 'cancel',
              onPress: async () => {
                try {
                  await fetch(`${API_BASE}/mp/matches/respond`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ leagueCode: code, inviteId: incoming.inviteId, action: 'reject' }),
                  });
                } catch (_) {}
                inviteAlertShown.current = false;
                pollRef.current = setInterval(fetchLeague, 3000);
              },
            },
            {
              text: 'Accept',
              onPress: async () => {
                try {
                  const res2 = await fetch(`${API_BASE}/mp/matches/respond`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ leagueCode: code, inviteId: incoming.inviteId, action: 'accept' }),
                  });
                  const json = await res2.json();
                  inviteAlertShown.current = false;
                  navigation.navigate('MultiplayerPreMatch', {
                    matchId: json.matchId,
                    leagueCode: code,
                    managerName,
                  });
                } catch (_) {
                  Alert.alert('Error', 'Could not accept the match invite.');
                  inviteAlertShown.current = false;
                  pollRef.current = setInterval(fetchLeague, 3000);
                }
              },
            },
          ],
          { cancelable: false }
        );
      }
    } catch (_) {}
  }, [code, managerName, navigation]);

  useFocusEffect(
    useCallback(() => {
      inviteAlertShown.current = false;
      outgoingNavigated.current = false;
      fetchLeague();
      pollRef.current = setInterval(fetchLeague, 3000);
      return () => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      };
    }, [fetchLeague])
  );

  const handleRowPress = (target: MPPlayer) => {
    if (target.managerName === managerName) return;
    Alert.alert(
      'Challenge',
      `Send a match invite to ${target.managerName} (${target.teamName})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Invite',
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE}/mp/matches/invite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leagueCode: code, fromManager: managerName, toManager: target.managerName }),
              });
              if (!res.ok) throw new Error();
              Alert.alert('Invite Sent', `Waiting for ${target.managerName} to accept...`);
            } catch (_) {
              Alert.alert('Error', 'Could not send invite.');
            }
          },
        },
      ]
    );
  };

  const sortedPlayers = league
    ? [...league.players].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.goalDifference - a.goalDifference;
      })
    : [];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />
      <ImageBackground
        source={require('../../assets/pitch-bg.png')}
        style={styles.backgroundImage}
        imageStyle={{ opacity: 0.15 }}
      >
        <View style={styles.overlay} />
      </ImageBackground>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="keyboard-return" size={36} color={Colors.green} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>League Table</Text>
          <Text style={styles.subtitle}>Code: {code}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.green} />
        </View>
      ) : (
        <View style={styles.tableWrapper}>
          <View style={styles.tableContainer}>
            {/* Table Header */}
            <View style={styles.tableHeaderRow}>
              <View style={styles.rankCol} />
              <View style={styles.verticalDividerHeader} />
              <View style={styles.managerCol}>
                <Text style={styles.headerText}>Manager</Text>
              </View>
              <View style={styles.statsContainer}>
                <Text style={styles.headerStatText}>MP</Text>
                <Text style={styles.headerStatText}>W</Text>
                <Text style={styles.headerStatText}>D</Text>
                <Text style={styles.headerStatText}>L</Text>
                <Text style={styles.headerStatText}>Pts</Text>
                <Text style={styles.headerStatText}>GD</Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {sortedPlayers.map((player, index) => {
                const isMe = player.managerName === managerName;
                return (
                  <TouchableOpacity
                    key={player.managerName}
                    style={[styles.tableRow, isMe && styles.tableRowMe]}
                    onPress={() => handleRowPress(player)}
                    activeOpacity={isMe ? 1 : 0.6}
                  >
                    <View style={styles.rankCol}>
                      <Text style={styles.rankText}>{index + 1}.</Text>
                    </View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.managerCol}>
                      <Text style={styles.managerText} numberOfLines={1}>{player.managerName}</Text>
                      <Text style={styles.teamSubText} numberOfLines={1}>{player.teamName}</Text>
                    </View>
                    <View style={styles.statsContainer}>
                      <Text style={styles.statText}>{player.matchesPlayed}</Text>
                      <Text style={styles.statText}>{player.wins}</Text>
                      <Text style={styles.statText}>{player.draws}</Text>
                      <Text style={styles.statText}>{player.losses}</Text>
                      <Text style={styles.statText}>{player.points}</Text>
                      <Text style={styles.statText}>{player.goalDifference}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
          <Text style={styles.tapHint}>Tap a manager to send a match invite</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.auctionButton}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('MultiplayerAuction', { code, managerName })}
      >
        <MaterialCommunityIcons name="gavel" size={20} color="#000" style={{ marginRight: 8 }} />
        <Text style={styles.auctionButtonText}>Sign Free Agents</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E1E24' },
  backgroundImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(30, 30, 36, 0.85)' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  backButton: { position: 'absolute', left: Spacing.xl, top: Spacing.lg, zIndex: 10 },
  titleContainer: { flex: 1, alignItems: 'center' },
  title: { fontSize: 28, color: '#FFF', fontWeight: '800' },
  subtitle: { fontSize: Typography.fontSize.sm, color: Colors.textMuted, marginTop: 2 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tableWrapper: { paddingHorizontal: Spacing.lg, flex: 1, paddingBottom: Spacing.md },
  tableContainer: {
    backgroundColor: Colors.green,
    borderRadius: 24,
    overflow: 'hidden',
    paddingVertical: 12,
    flex: 1,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
  },
  tableRowMe: { backgroundColor: 'rgba(0,0,0,0.15)' },
  rankCol: { width: 35, alignItems: 'center', justifyContent: 'center' },
  verticalDividerHeader: { width: 2, height: 20, backgroundColor: 'transparent', marginRight: 8 },
  verticalDivider: { width: 2, height: 32, backgroundColor: '#000', marginRight: 8 },
  managerCol: { flex: 1.8, justifyContent: 'center' },
  statsContainer: { flex: 2.5, flexDirection: 'row', justifyContent: 'space-around', paddingRight: 8 },
  headerText: { color: '#FFF', fontSize: 15, fontWeight: '900' },
  headerStatText: { color: '#FFF', fontSize: 13, fontWeight: '900', width: 26, textAlign: 'center' },
  rankText: { color: '#FFF', fontSize: 14, fontWeight: '900' },
  managerText: { color: '#000', fontSize: 13, fontWeight: '900' },
  teamSubText: { color: 'rgba(0,0,0,0.55)', fontSize: 10, fontWeight: '600' },
  statText: { color: '#000', fontSize: 13, fontWeight: '900', width: 26, textAlign: 'center' },
  tapHint: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.md,
    fontStyle: 'italic',
  },
  auctionButton: {
    backgroundColor: Colors.green,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.base,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  auctionButtonText: {
    fontSize: Typography.fontSize.base,
    color: '#000',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
