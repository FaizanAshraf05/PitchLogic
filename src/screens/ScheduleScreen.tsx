import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Spacing } from '../theme';

export function ScheduleScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const teamId = route.params?.teamId || 10; 

  useEffect(() => {
    fetchSchedule();
  }, [teamId]);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const API_BASE = 'https://obliged-preamble-amplifier.ngrok-free.dev/api';
      const managerName = route.params?.managerName || navigation.getState()?.routes.find((r: any) => r.name === 'Main')?.params?.managerName || 'default';
      const response = await fetch(`${API_BASE}/teams/${teamId}/schedule`, {
        headers: { 'x-manager-name': managerName }
      });
      if (response.ok) {
        const data = await response.json();
        setSchedule(data);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return `${d.getDate()}/${d.getMonth() + 1}`; // e.g. "15/8"
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#111111" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-u-left-top" size={28} color={Colors.green} />
        </TouchableOpacity>
        <Text style={styles.title}>Schedule</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {/* Table Header */}
          <View style={[styles.row, styles.headerRow]}>
            <View style={[styles.colDate, styles.borderRight]}>
              <Text style={styles.headerText}>Date</Text>
            </View>
            <View style={styles.colMatch}>
              <Text style={styles.headerText}>Match</Text>
            </View>
            <View style={styles.colResult}>
              <Text style={styles.headerText}>Res</Text>
            </View>
          </View>

          {/* Table Body */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#000" size="large" />
            </View>
          ) : (
            schedule.map((match, index) => {
              const isLast = index === schedule.length - 1;
              const isHome = match.homeTeamID === teamId;
              const opponent = isHome ? match.awayTeamName : match.homeTeamName;
              const location = isHome ? '(H)' : '(A)';
              const resultText = match.isSimulated 
                ? `${match.homeScore} - ${match.awayScore}` 
                : 'VS';
              
              return (
                <View 
                  key={match.matchID} 
                  style={[styles.row, !isLast && styles.rowBorder]}
                >
                  <View style={[styles.colDate, styles.borderRight]}>
                    <Text style={styles.rowText}>{formatDate(match.matchDate)}</Text>
                  </View>
                  <View style={styles.colMatch}>
                    <Text style={styles.rowText} numberOfLines={1}>
                      {opponent} {location}
                    </Text>
                  </View>
                  <View style={styles.colResult}>
                    <Text style={styles.rowText}>{resultText}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
        
        {/* Legend Card */}
        <View style={styles.legendCard}>
          <Text style={styles.legendText}>Date = Match Date (DD/MM)</Text>
          <Text style={styles.legendText}>Match = Opponent (H=Home, A=Away)</Text>
          <Text style={styles.legendText}>Res = Result (or VS if unplayed)</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 20,
    marginBottom: 30,
  },
  backButton: {
    marginRight: 20,
  },
  title: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.green, // matches League Table screenshot
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRow: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#000',
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.4)', // thin white lines like screenshot
  },
  borderRight: {
    borderRightWidth: 1.5,
    borderRightColor: '#000', // black vertical line
  },
  colDate: {
    flex: 0.25,
    paddingVertical: 12,
    alignItems: 'center',
  },
  colMatch: {
    flex: 0.55,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  colResult: {
    flex: 0.2,
    paddingVertical: 12,
    alignItems: 'center',
  },
  headerText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  rowText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 13,
  },
  legendCard: {
    backgroundColor: Colors.green,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  legendText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 12,
    marginBottom: 4,
  },
});
