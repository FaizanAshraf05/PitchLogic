import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';

const { width } = Dimensions.get('window');
const API_BASE = 'https://obliged-preamble-amplifier.ngrok-free.dev/api';

interface Offer {
  offerId: number;
  fromTeamID: number;
  fromTeamName: string;
  targetPlayerID: number;
  targetPlayerName: string;
  targetPlayerOVR: number;
  targetPlayerPos: string;
  offerAmount: number;
  status: string;
}

export function InboxScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const teamId = route.params?.teamId || 10;

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<number | null>(null);
  const [counteringId, setCounteringId] = useState<number | null>(null);
  const [counterValue, setCounterValue] = useState('');

  const getManagerName = () => {
    return route.params?.managerName || navigation.getState()?.routes.find((r: any) => r.name === 'Main')?.params?.managerName || 'default';
  };

  useFocusEffect(
    useCallback(() => {
      fetchOffers();
    }, [])
  );

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/transfers/inbox`, {
        headers: { 'x-manager-name': getManagerName() }
      });
      if (res.ok) {
        const data = await res.json();
        setOffers(data);
      }
    } catch (error) {
      console.error('Error fetching inbox:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (offerId: number, action: string, counterAmount?: number) => {
    try {
      setResponding(offerId);
      const body: any = { offerId, action };
      if (action === 'counter' && counterAmount) {
        body.counterAmount = counterAmount;
      }

      const res = await fetch(`${API_BASE}/transfers/inbox/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-manager-name': getManagerName()
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      Alert.alert(
        action === 'accept' ? 'Transfer Complete' :
        action === 'reject' ? 'Offer Rejected' : 'Counter Response',
        data.message
      );

      setCounteringId(null);
      setCounterValue('');
      fetchOffers();
    } catch (error) {
      Alert.alert('Error', 'Failed to process response.');
    } finally {
      setResponding(null);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value}`;
  };

  const renderOffer = (offer: Offer) => {
    const isCountering = counteringId === offer.offerId;
    const isResponding = responding === offer.offerId;

    return (
      <View key={offer.offerId} style={styles.offerCard}>
        {/* Player Info */}
        <View style={styles.playerInfoRow}>
          <View style={styles.playerInfoLeft}>
            <Text style={styles.teamName}>{offer.fromTeamName}</Text>
            <Text style={styles.playerName}>{offer.targetPlayerName}</Text>
            <View style={styles.tagRow}>
              <Text style={styles.tagText}>{offer.targetPlayerPos}</Text>
              <Text style={styles.tagText}>{offer.targetPlayerOVR} OVR</Text>
            </View>
          </View>
          <View style={styles.offerAmountBox}>
            <Text style={styles.offerAmountLabel}>OFFER</Text>
            <Text style={styles.offerAmountValue}>{formatCurrency(offer.offerAmount)}</Text>
          </View>
        </View>

        {/* Action Buttons or Counter Input */}
        {isCountering ? (
          <View style={styles.counterSection}>
            <Text style={styles.counterLabel}>Your Counter Offer:</Text>
            <View style={styles.counterInputRow}>
              <TextInput
                style={styles.counterInput}
                placeholder="Enter amount"
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={counterValue}
                onChangeText={setCounterValue}
              />
              <TouchableOpacity
                style={styles.counterSubmitBtn}
                onPress={() => {
                  const amount = parseInt(counterValue);
                  if (isNaN(amount) || amount <= 0) {
                    Alert.alert('Invalid', 'Enter a valid counter amount.');
                    return;
                  }
                  handleRespond(offer.offerId, 'counter', amount);
                }}
                disabled={isResponding}
              >
                {isResponding ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.counterSubmitText}>SEND</Text>
                )}
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => { setCounteringId(null); setCounterValue(''); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={() => handleRespond(offer.offerId, 'accept')}
              disabled={isResponding}
            >
              {isResponding ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.actionBtnText}>Accept</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.counterBtn]}
              onPress={() => { setCounteringId(offer.offerId); setCounterValue(''); }}
              disabled={isResponding}
            >
              <Text style={styles.actionBtnText}>Counter</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => handleRespond(offer.offerId, 'reject')}
              disabled={isResponding}
            >
              <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
        <Text style={styles.headerTitle}>Transfer Inbox</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.green} />
        </View>
      ) : offers.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="email-open-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No Incoming Offers</Text>
          <Text style={styles.emptySubtitle}>
            AI teams will send bids for your players every 4 match weeks.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {offers.map(renderOffer)}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    opacity: 0.08,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    marginBottom: Spacing.lg,
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
  badgeContainer: {
    marginLeft: Spacing.sm,
  },
  badge: {
    backgroundColor: Colors.red,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: Colors.textDim,
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  offerCard: {
    backgroundColor: 'rgba(25, 30, 25, 0.9)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(46, 204, 113, 0.2)',
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamName: {
    color: Colors.green,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  playerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  playerInfoLeft: {
    flex: 1,
  },
  playerName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tagText: {
    color: Colors.textDim,
    fontSize: 13,
    fontWeight: '600',
  },
  offerAmountBox: {
    alignItems: 'center',
  },
  offerAmountLabel: {
    color: Colors.textDim,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 2,
  },
  offerAmountValue: {
    color: Colors.green,
    fontSize: 18,
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 4,
  },
  acceptBtn: {
    backgroundColor: Colors.green,
  },
  counterBtn: {
    backgroundColor: Colors.amber,
  },
  rejectBtn: {
    backgroundColor: 'rgba(231, 76, 60, 0.8)',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000',
  },
  counterSection: {
    alignItems: 'center',
  },
  counterLabel: {
    color: Colors.amber,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  counterInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  counterInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: Colors.amber,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFF',
    fontSize: 16,
    marginRight: 8,
  },
  counterSubmitBtn: {
    backgroundColor: Colors.amber,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  counterSubmitText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cancelText: {
    color: Colors.textDim,
    fontSize: 13,
    marginTop: 4,
  },
});
