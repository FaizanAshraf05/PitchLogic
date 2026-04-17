import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../theme';

export function HomeScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good Morning</Text>
            <Text style={styles.clubName}>Manager</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>PL</Text>
          </View>
        </View>

        <View style={styles.overviewCard}>
          <View style={styles.overviewGradient}>
            <Text style={styles.overviewLabel}>YOUR TEAM</Text>
            <Text style={styles.overviewTeamName}>Set up your club</Text>
            <View style={styles.overviewStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>Played</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>Won</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>Drawn</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>Lost</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          {[
            { emoji: '⚽', label: 'Play Match' },
            { emoji: '📋', label: 'Tactics' },
            { emoji: '💰', label: 'Transfers' },
            { emoji: '🏋️', label: 'Training' },
          ].map((action, index) => (
            <View key={index} style={styles.actionCard}>
              <Text style={styles.actionEmoji}>{action.emoji}</Text>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Next Match</Text>
        <View style={styles.matchCard}>
          <Text style={styles.matchCompetition}>League • Matchday 1</Text>
          <View style={styles.matchTeams}>
            <View style={styles.matchTeam}>
              <View style={styles.teamBadge}>
                <Text style={styles.badgeText}>PL</Text>
              </View>
              <Text style={styles.teamName}>Your Team</Text>
            </View>
            <Text style={styles.vsText}>VS</Text>
            <View style={styles.matchTeam}>
              <View style={[styles.teamBadge, styles.opponentBadge]}>
                <Text style={styles.badgeText}>?</Text>
              </View>
              <Text style={styles.teamName}>Opponent</Text>
            </View>
          </View>
          <Text style={styles.matchTime}>Start a new season to play</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  greeting: {
    fontSize: Typography.fontSize.md,
    color: Colors.textDim,
    fontWeight: Typography.fontWeight.regular,
  },
  clubName: {
    fontSize: Typography.fontSize['3xl'],
    color: Colors.text,
    fontWeight: Typography.fontWeight.bold,
    marginTop: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.textOnPrimary,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  overviewCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    ...Shadow.lg,
  },
  overviewGradient: {
    backgroundColor: Colors.greenDark,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.greenDim,
  },
  overviewLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.green,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: Typography.letterSpacing.widest,
  },
  overviewTeamName: {
    fontSize: Typography.fontSize['2xl'],
    color: Colors.text,
    fontWeight: Typography.fontWeight.bold,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: Typography.fontSize.xl,
    color: Colors.accent,
    fontWeight: Typography.fontWeight.bold,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textDim,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    color: Colors.text,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionEmoji: {
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  actionLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textDim,
    fontWeight: Typography.fontWeight.medium,
  },
  matchCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  matchCompetition: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: Typography.letterSpacing.wide,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  matchTeams: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  matchTeam: {
    alignItems: 'center',
    flex: 1,
  },
  teamBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  opponentBadge: {
    backgroundColor: Colors.surface2,
  },
  badgeText: {
    color: Colors.textOnPrimary,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  teamName: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textDim,
    fontWeight: Typography.fontWeight.medium,
  },
  vsText: {
    fontSize: Typography.fontSize.xl,
    color: Colors.textMuted,
    fontWeight: Typography.fontWeight.bold,
  },
  matchTime: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
