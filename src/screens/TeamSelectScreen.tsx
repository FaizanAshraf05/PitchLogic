import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  Dimensions,
  Platform,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shadow } from 'react-native-shadow-2';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { API_BASE } from '../api/config';

const { width } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const GRID_PADDING = 24;
const GRID_GAP = 14;
const ICON_SIZE = (width - GRID_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

const API_URL = `${API_BASE}/teams`;

interface TeamFromAPI {
  teamID: number;
  teamName: string;
  transferBudget: number;
  wageBudget: number;
  formation: string;
  points: number;
  goalDifference: number;
  teamStyle: string;
  leagueID: number;
  managerID: number | null;
  facilityID: number | null;
}

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

interface TeamSelectScreenProps {
  navigation: any;
}

export function TeamSelectScreen({ navigation }: TeamSelectScreenProps) {
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [managerName, setManagerName] = useState('');
  const [teams, setTeams] = useState<TeamFromAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Failed to fetch teams');
      const data: TeamFromAPI[] = await response.json();
      setTeams(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleAdvance = async () => {
    if (!selectedTeam) {
      Alert.alert('Select a Team', 'Please select a team to manage.');
      return;
    }
    if (!managerName.trim()) {
      Alert.alert('Enter Your Name', 'Please enter your manager name.');
      return;
    }

    setIsStarting(true);
    try {
      const response = await fetch(`${API_BASE}/game/new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          managerName: managerName.trim(),
          teamId: selectedTeam,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start new game');
      }

      const team = teams.find((t) => t.teamID === selectedTeam);
      navigation.navigate('Main', {
        teamId: selectedTeam,
        teamName: team?.teamName,
        managerName: managerName.trim(),
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not start new game.');
    } finally {
      setIsStarting(false);
    }
  };

  const renderTeamGrid = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.green} />
          <Text style={styles.loadingText}>Loading teams...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchTeams}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.teamGrid}>
        {teams.map((team) => {
          const isSelected = selectedTeam === team.teamID;
          const logo = TEAM_LOGOS[team.teamName];
          return (
            <TouchableOpacity
              key={team.teamID}
              style={[
                styles.teamCard,
                isSelected && styles.teamCardSelected,
              ]}
              activeOpacity={0.7}
              onPress={() => setSelectedTeam(team.teamID)}
            >
              {logo ? (
                <Image
                  source={logo}
                  style={styles.teamLogo}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.logoFallback}>
                  <Text style={styles.logoFallbackText}>
                    {team.teamName ? team.teamName.charAt(0) : '?'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      <View style={styles.backgroundWrapper}>
        <Image
          source={require('../../assets/Rectangle 5.png')}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <Text style={styles.welcomeText}>Welcome To</Text>
          <Text style={styles.titleText}>Pitch Logic</Text>
        </View>

        <Text style={styles.sectionLabel}>Select Your Team</Text>

        {renderTeamGrid()}

        <Text style={styles.sectionLabel}>Setup Your Manager Profile</Text>

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.nameInput}
            placeholder="Enter Your Name"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={managerName}
            onChangeText={setManagerName}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>

        <Shadow
          distance={20}
          startColor={'rgba(29, 185, 84, 0.4)'}
          endColor={'rgba(29, 185, 84, 0)'}
          offset={[0, 4]}
          style={{ width: '100%' }}
          containerStyle={{ width: '100%' }}
        >
          <TouchableOpacity
            style={[styles.advanceButton, isStarting && { opacity: 0.7 }]}
            activeOpacity={0.8}
            onPress={handleAdvance}
            disabled={isStarting}
          >
            {isStarting ? (
              <ActivityIndicator color={Colors.textOnPrimary} />
            ) : (
              <Text style={styles.advanceButtonText}>ADVANCE</Text>
            )}
          </TouchableOpacity>
        </Shadow>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  backgroundWrapper: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
  },
  backgroundImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['2xl'],
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  welcomeText: {
    fontSize: Typography.fontSize['2xl'],
    color: Colors.text,
    fontWeight: Typography.fontWeight.bold,
    fontStyle: 'italic',
  },
  titleText: {
    fontSize: Typography.fontSize['4xl'],
    color: Colors.green,
    fontWeight: Typography.fontWeight.extrabold,
    fontStyle: 'italic',
  },
  sectionLabel: {
    fontSize: Typography.fontSize.xl,
    color: Colors.textDim,
    fontWeight: Typography.fontWeight.semibold,
    fontStyle: 'italic',
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  teamGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: GRID_GAP,
    marginBottom: Spacing['2xl'],
  },
  teamCard: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  teamCardSelected: {
    borderColor: '#3333CC',
    borderWidth: 3,
  },
  teamLogo: {
    width: ICON_SIZE * 0.7,
    height: ICON_SIZE * 0.7,
  },
  inputWrapper: {
    marginBottom: Spacing.lg,
  },
  nameInput: {
    backgroundColor: 'rgba(150, 170, 220, 0.35)',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.lg,
    fontSize: Typography.fontSize.lg,
    color: Colors.text,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(150, 170, 220, 0.5)',
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
  loadingContainer: {
    paddingVertical: Spacing['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['2xl'],
  },
  loadingText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textDim,
    marginTop: Spacing.md,
  },
  errorText: {
    fontSize: Typography.fontSize.base,
    color: Colors.red,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.green,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  retryButtonText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textOnPrimary,
    fontWeight: Typography.fontWeight.bold,
  },
  logoFallback: {
    width: ICON_SIZE * 0.7,
    height: ICON_SIZE * 0.7,
    borderRadius: ICON_SIZE * 0.35,
    backgroundColor: Colors.surface2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoFallbackText: {
    fontSize: Typography.fontSize['3xl'],
    color: Colors.green,
    fontWeight: Typography.fontWeight.bold,
  },
});