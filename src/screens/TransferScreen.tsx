import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';

const { width, height } = Dimensions.get('window');

type MarketPlayer = {
  playerID: number;
  name: string;
  position: string;
  overallRating: number;
  marketValue: number;
  currentTeam: string;
};

export function TransferScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const teamId = route.params?.teamId || 10;

  const [players, setPlayers] = useState<MarketPlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<MarketPlayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bidValue, setBidValue] = useState('');

  useEffect(() => {
    fetchMarketPlayers();
  }, []);

  const fetchMarketPlayers = async () => {
    try {
      const API_BASE = 'https://obliged-preamble-amplifier.ngrok-free.dev/api';
      const response = await fetch(`${API_BASE}/transfers/market/all`);
      if (!response.ok) throw new Error('Failed to fetch transfer market');
      const data: MarketPlayer[] = await response.json();

      // Filter out players already on your team based on currentTeam name (rough check)
      // Since we don't have the explicit team name here, showing all is fine,
      // but maybe we can just show all and let the backend reject if it's our own player.
      setPlayers(data);

      if (data.length > 0) {
        setSelectedPlayer(data[0]);
      }
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load transfer market.');
    }
  };

  const handleBidSubmit = async () => {
    if (!selectedPlayer) return;
    const bidAmount = parseInt(bidValue);
    if (isNaN(bidAmount) || bidAmount <= 0) {
      Alert.alert('Invalid Bid', 'Please enter a valid numeric bid amount.');
      return;
    }

    try {
      setSubmitting(true);
      const API_BASE = 'https://obliged-preamble-amplifier.ngrok-free.dev/api';
      const response = await fetch(`${API_BASE}/transfers/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerTeamId: teamId,
          playerId: selectedPlayer.playerID,
          bidAmount: bidAmount
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Transfer Failed', data.message || 'Error executing transfer.');
      } else {
        Alert.alert('Transfer Successful', data.message || 'Player signed to your team!');
        // Refresh market list
        fetchMarketPlayers();
        setBidValue('');
      }
      setSubmitting(false);
    } catch (error) {
      console.error(error);
      setSubmitting(false);
      Alert.alert('Error', 'An unexpected error occurred while making the bid.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.green} />
      </View>
    );
  }

  const formatCurrency = (value: number | null) => {
    if (value === null) return '$0';
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Image
        source={require('../../assets/pitch-bg.png')}
        style={styles.backgroundImage}
      />
      <View style={styles.overlay} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.mainContainer}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="keyboard-return" size={32} color={Colors.green} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Transfer Window</Text>
          </View>

          {/* Player List (Scrollable) */}
          <ScrollView
            style={styles.playerListScroll}
            contentContainerStyle={styles.playerListContent}
            showsVerticalScrollIndicator={false}
          >
            {players.map((player) => {
              const isSelected = selectedPlayer?.playerID === player.playerID;
              return (
                <TouchableOpacity
                  key={player.playerID}
                  style={styles.playerListItem}
                  onPress={() => {
                    setSelectedPlayer(player);
                    setBidValue('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.playerListName, isSelected && styles.playerListNameActive]}>
                    {player.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Fixed Bottom Section */}
          <View style={styles.bottomFixedSection}>
            {/* Selected Player Focus Pill */}
            {selectedPlayer && (
              <View style={styles.selectedPillContainer}>
                <View style={styles.selectedPill}>
                  <Text style={styles.selectedPillText}>{selectedPlayer.name}</Text>
                </View>
              </View>
            )}

            {/* Player Details Card */}
            {selectedPlayer && (
              <View style={styles.detailsCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Overall Rating</Text>
                  <View style={styles.detailValuePill}>
                    <Text style={styles.detailValueText}>{selectedPlayer.overallRating}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Current Team</Text>
                  <View style={styles.detailValuePill}>
                    <Text style={styles.detailValueText}>{selectedPlayer.currentTeam}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Position</Text>
                  <View style={styles.detailValuePill}>
                    <Text style={styles.detailValueText}>{selectedPlayer.position}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Bidding Section */}
            {selectedPlayer && (
              <View style={styles.biddingSection}>
                <Text style={styles.chooseBidText}>Choose Your Bid</Text>

                <View style={styles.bidColumns}>
                  {/* Recommended Bid */}
                  <View style={styles.bidColumn}>
                    <Text style={styles.bidColumnLabel}>Recommended Bid</Text>
                    <View style={styles.recommendedBidPill}>
                      <Text style={styles.recommendedBidText}>{formatCurrency(selectedPlayer.marketValue)}</Text>
                    </View>
                  </View>

                  {/* Your Bid */}
                  <View style={styles.bidColumn}>
                    <Text style={styles.bidColumnLabel}>Your Bid</Text>
                    <View style={styles.yourBidContainer}>
                      <TextInput
                        style={styles.bidInput}
                        placeholder="Enter Value"
                        placeholderTextColor="#666"
                        keyboardType="numeric"
                        value={bidValue}
                        onChangeText={setBidValue}
                      />
                      <TouchableOpacity
                        style={styles.submitBidBtn}
                        onPress={handleBidSubmit}
                        disabled={submitting}
                      >
                        {submitting ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <MaterialCommunityIcons name="arrow-right-box" size={24} color="#FFF" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    opacity: 0.12,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  mainContainer: {
    flex: 1,
    paddingTop: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
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
  playerListScroll: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  playerListContent: {
    alignItems: 'center',
    paddingBottom: Spacing.lg,
  },
  bottomFixedSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl * 1.5,
  },
  playerListItem: {
    paddingVertical: 8,
  },
  playerListName: {
    fontSize: 18,
    color: '#CCC',
    fontFamily: Typography.fontFamily.bold,
  },
  playerListNameActive: {
    color: Colors.green,
    fontSize: 20,
  },
  selectedPillContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  selectedPill: {
    borderColor: Colors.green,
    borderWidth: 2,
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
  },
  selectedPillText: {
    color: '#FFF',
    fontSize: 20,
    fontFamily: Typography.fontFamily.bold,
  },
  detailsCard: {
    backgroundColor: Colors.green,
    borderRadius: 20,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    color: '#000',
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
  },
  detailValuePill: {
    backgroundColor: '#000',
    borderRadius: 15,
    paddingVertical: 4,
    paddingHorizontal: 16,
    minWidth: 100,
    alignItems: 'center',
  },
  detailValueText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
  },
  biddingSection: {
    alignItems: 'center',
  },
  chooseBidText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: Spacing.md,
  },
  bidColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  bidColumn: {
    flex: 1,
    alignItems: 'center',
  },
  bidColumnLabel: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: 8,
  },
  recommendedBidPill: {
    borderColor: Colors.green,
    borderWidth: 2,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    minWidth: 120,
    alignItems: 'center',
  },
  recommendedBidText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
  },
  yourBidContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: Colors.green,
    borderWidth: 2,
    borderRadius: 20,
    backgroundColor: '#111',
    paddingLeft: 12,
    paddingRight: 4,
    height: 44,
  },
  bidInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    paddingVertical: 0,
    minWidth: 90,
  },
  submitBidBtn: {
    padding: 4,
  },
});
