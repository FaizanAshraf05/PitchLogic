import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';

const API_BASE = 'https://obliged-preamble-amplifier.ngrok-free.dev/api';

interface FreeAgent {
  playerID: number;
  name: string;
  position: string;
  overallRating: number;
  marketValue: number;
}

interface Bid {
  managerName: string;
  amount: number;
  timestamp: number;
}

interface Auction {
  auctionId: number;
  playerId: number;
  playerName: string;
  playerPosition: string;
  playerOVR: number;
  playerMarketValue: number;
  startedBy: string;
  endTime: number;
  status: 'active' | 'completed';
  bids: Bid[];
  winnerId: string | null;
  winnerAmount: number | null;
}

interface LeaguePlayer {
  managerName: string;
  budget: number;
}

interface League {
  players: LeaguePlayer[];
  auctions: Auction[];
  signedPlayers: { playerId: number; playerName: string; signedBy: string; amount: number }[];
}

function fmt(amount: number) {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

function fmtTime(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function MultiplayerAuctionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { code, managerName } = route.params as { code: string; managerName: string };

  const [freeAgents, setFreeAgents] = useState<FreeAgent[]>([]);
  const [league, setLeague] = useState<League | null>(null);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [bidInput, setBidInput] = useState('');
  const [placingBid, setPlacingBid] = useState(false);
  const [startingAuction, setStartingAuction] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevSignedCount = useRef(0);

  // ── Fetch free agents (re-fetch when signed list grows) ─────────────────────
  const fetchFreeAgents = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/mp/league/${code}/free-agents`);
      if (!res.ok) return;
      const data = await res.json();
      setFreeAgents(data);
    } catch (_) {}
    finally { setLoadingAgents(false); }
  }, [code]);

  // ── Poll league state every 2s ───────────────────────────────────────────────
  const fetchLeague = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/mp/league/${code}`);
      if (!res.ok) return;
      const data: League = await res.json();
      setLeague(data);

      // Re-fetch free agents when a new player gets signed
      if (data.signedPlayers.length > prevSignedCount.current) {
        prevSignedCount.current = data.signedPlayers.length;
        fetchFreeAgents();
      }
    } catch (_) {}
  }, [code, fetchFreeAgents]);

  useFocusEffect(
    useCallback(() => {
      prevSignedCount.current = 0;
      fetchFreeAgents();
      fetchLeague();
      pollRef.current = setInterval(fetchLeague, 2000);
      return () => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      };
    }, [fetchLeague, fetchFreeAgents])
  );

  // ── Countdown timer driven by activeAuction.endTime ─────────────────────────
  const activeAuction = league?.auctions.find(a => a.status === 'active') ?? null;

  useEffect(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (!activeAuction) { setTimeLeft(0); return; }

    const tick = () => setTimeLeft(Math.max(0, activeAuction.endTime - Date.now()));
    tick();
    timerRef.current = setInterval(tick, 500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeAuction?.auctionId, activeAuction?.endTime]);

  // ── Derived data ─────────────────────────────────────────────────────────────
  const myEntry = league?.players.find(p => p.managerName === managerName);
  const myBudget = myEntry?.budget ?? 0;

  const topBid = activeAuction && activeAuction.bids.length > 0
    ? activeAuction.bids.reduce((max, b) => b.amount > max.amount ? b : max)
    : null;

  const recentAuctions = league?.auctions
    .filter(a => a.status === 'completed')
    .slice(-3)
    .reverse() ?? [];

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleStartAuction = async (agent: FreeAgent) => {
    Alert.alert(
      'Start Auction',
      `Start a 60-second auction for ${agent.name} (${agent.position}, OVR ${agent.overallRating})?\nMarket value: ${fmt(agent.marketValue)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            try {
              setStartingAuction(true);
              const res = await fetch(`${API_BASE}/mp/league/${code}/auction/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  managerName,
                  playerId: agent.playerID,
                  playerName: agent.name,
                  playerPosition: agent.position,
                  playerOVR: agent.overallRating,
                  playerMarketValue: agent.marketValue,
                }),
              });
              if (!res.ok) {
                const json = await res.json();
                Alert.alert('Cannot Start', json.message);
                return;
              }
              fetchLeague();
            } catch (_) {
              Alert.alert('Error', 'Could not start auction.');
            } finally {
              setStartingAuction(false);
            }
          },
        },
      ]
    );
  };

  const handlePlaceBid = async () => {
    if (!activeAuction) return;
    const amount = parseFloat(bidInput) * 1_000_000;
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Bid', 'Enter a bid amount in millions (e.g. 5 for $5M).');
      return;
    }
    try {
      setPlacingBid(true);
      const res = await fetch(`${API_BASE}/mp/league/${code}/auction/${activeAuction.auctionId}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerName, amount }),
      });
      if (!res.ok) {
        const json = await res.json();
        Alert.alert('Bid Rejected', json.message);
        return;
      }
      setBidInput('');
      fetchLeague();
    } catch (_) {
      Alert.alert('Error', 'Could not place bid.');
    } finally {
      setPlacingBid(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="keyboard-return" size={32} color={Colors.green} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Auctions</Text>
        </View>
        <View style={styles.budgetBadge}>
          <Text style={styles.budgetLabel}>Budget</Text>
          <Text style={styles.budgetValue}>{fmt(myBudget)}</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ── ACTIVE AUCTION CARD ── */}
          {activeAuction && (
            <View style={styles.auctionCard}>
              <View style={styles.auctionCardHeader}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE AUCTION</Text>
                <View style={[styles.timerBadge, timeLeft < 15000 && styles.timerBadgeUrgent]}>
                  <MaterialCommunityIcons name="timer-outline" size={14} color={timeLeft < 15000 ? '#ff4444' : Colors.green} />
                  <Text style={[styles.timerText, timeLeft < 15000 && styles.timerTextUrgent]}>
                    {fmtTime(timeLeft)}
                  </Text>
                </View>
              </View>

              <View style={styles.playerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.playerName}>{activeAuction.playerName}</Text>
                  <Text style={styles.playerMeta}>{activeAuction.playerPosition} · OVR {activeAuction.playerOVR} · MV {fmt(activeAuction.playerMarketValue)}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {topBid ? (
                <View style={styles.topBidRow}>
                  <MaterialCommunityIcons name="trophy-outline" size={16} color={Colors.green} />
                  <Text style={styles.topBidText}>
                    <Text style={styles.topBidAmount}>{fmt(topBid.amount)}</Text>
                    {'  by  '}
                    <Text style={styles.topBidManager}>{topBid.managerName}</Text>
                  </Text>
                </View>
              ) : (
                <Text style={styles.noBidsText}>No bids yet — be the first!</Text>
              )}

              {/* Bid history (last 4, newest first) */}
              {activeAuction.bids.length > 0 && (
                <View style={styles.bidHistory}>
                  {[...activeAuction.bids]
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, 4)
                    .map((b, i) => (
                      <View key={i} style={styles.bidHistoryRow}>
                        <Text style={styles.bidHistoryManager}>{b.managerName}</Text>
                        <Text style={styles.bidHistoryAmount}>{fmt(b.amount)}</Text>
                      </View>
                    ))}
                </View>
              )}

              <View style={styles.divider} />

              {/* Bid input */}
              <View style={styles.bidInputRow}>
                <Text style={styles.currencyPrefix}>$</Text>
                <TextInput
                  style={styles.bidInput}
                  placeholder="0.0"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                  value={bidInput}
                  onChangeText={setBidInput}
                />
                <Text style={styles.millionSuffix}>M</Text>
                <TouchableOpacity
                  style={[styles.bidButton, placingBid && styles.bidButtonDisabled]}
                  onPress={handlePlaceBid}
                  disabled={placingBid || timeLeft === 0}
                  activeOpacity={0.8}
                >
                  {placingBid
                    ? <ActivityIndicator color="#000" size="small" />
                    : <Text style={styles.bidButtonText}>BID</Text>
                  }
                </TouchableOpacity>
              </View>
              <Text style={styles.bidHint}>Enter amount in millions.</Text>
            </View>
          )}

          {/* ── RECENTLY COMPLETED ── */}
          {recentAuctions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Results</Text>
              {recentAuctions.map(a => (
                <View key={a.auctionId} style={styles.completedRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.completedPlayerName}>{a.playerName}</Text>
                    <Text style={styles.completedMeta}>{a.playerPosition} · OVR {a.playerOVR}</Text>
                  </View>
                  {a.winnerId ? (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.completedWinner}>{a.winnerId}</Text>
                      <Text style={styles.completedAmount}>{fmt(a.winnerAmount!)}</Text>
                    </View>
                  ) : (
                    <Text style={styles.unsoldText}>Unsold</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* ── FREE AGENTS LIST ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Free Agents ({freeAgents.length})
            </Text>

            {loadingAgents ? (
              <ActivityIndicator color={Colors.green} style={{ marginVertical: Spacing.xl }} />
            ) : freeAgents.length === 0 ? (
              <Text style={styles.emptyText}>No free agents available.</Text>
            ) : (
              freeAgents.map(agent => {
                const alreadyInAuction = activeAuction?.playerId === agent.playerID;
                return (
                  <View key={agent.playerID} style={styles.agentRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.agentName}>{agent.name}</Text>
                      <Text style={styles.agentMeta}>{agent.position} · OVR {agent.overallRating} · {fmt(agent.marketValue)}</Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.startBtn,
                        (!!activeAuction || alreadyInAuction) && styles.startBtnDisabled,
                      ]}
                      onPress={() => handleStartAuction(agent)}
                      disabled={!!activeAuction || startingAuction}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.startBtnText,
                        (!!activeAuction || alreadyInAuction) && styles.startBtnTextDisabled,
                      ]}>
                        {alreadyInAuction ? 'Live' : 'Auction'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>

          <View style={{ height: Spacing.xl * 2 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  backButton: { marginRight: Spacing.sm },
  headerTitle: { fontSize: 22, color: Colors.text, fontWeight: '800' },
  budgetBadge: {
    alignItems: 'flex-end',
    backgroundColor: Colors.surface2,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  budgetLabel: { fontSize: 9, color: Colors.textMuted, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  budgetValue: { fontSize: Typography.fontSize.sm, color: Colors.green, fontWeight: '800' },
  scroll: { paddingHorizontal: Spacing.lg },

  // Active auction card
  auctionCard: {
    backgroundColor: Colors.surface2,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1.5,
    borderColor: Colors.green,
  },
  auctionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  liveDot: {
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4444',
  },
  liveText: {
    fontSize: Typography.fontSize.xs,
    color: '#ff4444',
    fontWeight: '900',
    letterSpacing: 2,
    flex: 1,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timerBadgeUrgent: {},
  timerText: { fontSize: 16, color: Colors.green, fontWeight: '900', fontVariant: ['tabular-nums'] },
  timerTextUrgent: { color: '#ff4444' },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  playerName: { fontSize: Typography.fontSize.base, color: Colors.text, fontWeight: '800' },
  playerMeta: { fontSize: Typography.fontSize.xs, color: Colors.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
  topBidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  topBidText: { fontSize: Typography.fontSize.sm, color: Colors.textDim },
  topBidAmount: { color: Colors.green, fontWeight: '800', fontSize: Typography.fontSize.base },
  topBidManager: { color: Colors.text, fontWeight: '700' },
  noBidsText: { fontSize: Typography.fontSize.sm, color: Colors.textMuted, marginBottom: Spacing.sm, fontStyle: 'italic' },
  bidHistory: { gap: 4, marginBottom: Spacing.sm },
  bidHistoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 6,
  },
  bidHistoryManager: { fontSize: Typography.fontSize.xs, color: Colors.textDim },
  bidHistoryAmount: { fontSize: Typography.fontSize.xs, color: Colors.text, fontWeight: '700' },
  bidInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  currencyPrefix: { fontSize: 18, color: Colors.textMuted, fontWeight: '700' },
  bidInput: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.text,
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  millionSuffix: { fontSize: 16, color: Colors.textMuted, fontWeight: '700' },
  bidButton: {
    backgroundColor: Colors.green,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    minWidth: 64,
    alignItems: 'center',
  },
  bidButtonDisabled: { opacity: 0.5 },
  bidButtonText: { color: '#000', fontWeight: '900', fontSize: Typography.fontSize.base },
  bidHint: { fontSize: Typography.fontSize.xs, color: Colors.textMuted, textAlign: 'right' },

  // Sections
  section: { marginBottom: Spacing.xl },
  sectionTitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textDim,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },
  emptyText: { color: Colors.textMuted, fontSize: Typography.fontSize.sm, textAlign: 'center', paddingVertical: Spacing.xl, fontStyle: 'italic' },

  // Completed auctions
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface2,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  completedPlayerName: { fontSize: Typography.fontSize.sm, color: Colors.text, fontWeight: '700' },
  completedMeta: { fontSize: Typography.fontSize.xs, color: Colors.textMuted },
  completedWinner: { fontSize: Typography.fontSize.sm, color: Colors.green, fontWeight: '700' },
  completedAmount: { fontSize: Typography.fontSize.xs, color: Colors.textMuted },
  unsoldText: { fontSize: Typography.fontSize.sm, color: Colors.textMuted, fontStyle: 'italic' },

  // Free agents list
  agentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface2,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  agentName: { fontSize: Typography.fontSize.sm, color: Colors.text, fontWeight: '700' },
  agentMeta: { fontSize: Typography.fontSize.xs, color: Colors.textMuted, marginTop: 2 },
  startBtn: {
    backgroundColor: Colors.green,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  startBtnDisabled: { backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border },
  startBtnText: { fontSize: Typography.fontSize.xs, color: '#000', fontWeight: '800' },
  startBtnTextDisabled: { color: Colors.textMuted },
});
