import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../theme';
import { API_BASE } from '../api/config';

interface TeamStanding {
  teamID: number;
  name: string;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goalDifference: number;
}

export function LeagueScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchStandings();
    }, [])
  );

  const fetchStandings = async () => {
    try {
      setLoading(true);
      const managerName = route.params?.managerName || navigation.getState()?.routes.find((r: any) => r.name === 'Main')?.params?.managerName || 'default';
      const response = await fetch(`${API_BASE}/league/standings`, {
        headers: { 'x-manager-name': managerName }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch standings');
      }
      
      const data = await response.json();
      setStandings(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Background Image (subtle pitch) */}
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
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.green} />
        </View>
      ) : standings.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No League Data Available</Text>
        </View>
      ) : (
        <View style={styles.tableWrapper}>
          <View style={styles.tableContainer}>
            {/* Table Header */}
            <View style={styles.tableHeaderRow}>
              <View style={styles.rankCol} />
              <View style={styles.verticalDividerHeader} />
              <View style={styles.clubCol}>
                <Text style={styles.headerText}>Club</Text>
              </View>
              <View style={styles.statsContainer}>
                <Text style={styles.headerStatText}>MP</Text>
                <Text style={styles.headerStatText}>W</Text>
                <Text style={styles.headerStatText}>L</Text>
                <Text style={styles.headerStatText}>Pts</Text>
                <Text style={styles.headerStatText}>GD</Text>
              </View>
            </View>

            {/* Table Rows */}
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {standings.map((team, index) => {
                // Shorten some names to fit better like in the UI
                let shortName = team.name;
                if (shortName === 'Manchester City') shortName = 'M.City';
                if (shortName === 'Manchester United') shortName = 'United';
                if (shortName === 'West Ham United') shortName = 'Wst.Ham';

                return (
                  <View key={team.teamID} style={styles.tableRow}>
                    <View style={styles.rankCol}>
                      <Text style={styles.rankText}>{index + 1}.</Text>
                    </View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.clubCol}>
                      <Text style={styles.clubText} numberOfLines={1}>{shortName}</Text>
                    </View>
                    <View style={styles.statsContainer}>
                      <Text style={styles.statText}>{team.matchesPlayed}</Text>
                      <Text style={styles.statText}>{team.wins}</Text>
                      <Text style={styles.statText}>{team.losses}</Text>
                      <Text style={styles.statText}>{team.points}</Text>
                      <Text style={styles.statText}>{team.goalDifference}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E24',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 30, 36, 0.85)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  backButton: {
    position: 'absolute',
    left: Spacing.xl,
    top: Spacing.lg,
    zIndex: 10,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    color: '#FFF',
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '800',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
  },
  tableWrapper: {
    paddingHorizontal: Spacing.lg,
    flex: 1,
    paddingBottom: Spacing.xl,
  },
  tableContainer: {
    backgroundColor: Colors.green, // vibrant green from theme
    borderRadius: 24,
    overflow: 'hidden',
    paddingVertical: 12,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
  },
  rankCol: {
    width: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalDividerHeader: {
    width: 2,
    height: 20,
    backgroundColor: 'transparent', // keep invisible for header
    marginRight: 8,
  },
  verticalDivider: {
    width: 2,
    height: 28,
    backgroundColor: '#000',
    marginRight: 8,
  },
  clubCol: {
    flex: 1.5,
    justifyContent: 'center',
  },
  statsContainer: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingRight: 10,
  },
  headerText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    fontFamily: Typography.fontFamily.bold,
  },
  headerStatText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '900',
    fontFamily: Typography.fontFamily.bold,
    width: 28,
    textAlign: 'center',
  },
  rankText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    fontFamily: Typography.fontFamily.bold,
  },
  clubText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '900',
    fontFamily: Typography.fontFamily.bold,
  },
  statText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '900',
    fontFamily: Typography.fontFamily.bold,
    width: 28,
    textAlign: 'center',
  },
});
