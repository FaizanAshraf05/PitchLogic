import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';

const API_BASE = 'https://obliged-preamble-amplifier.ngrok-free.dev/api';

export function MultiplayerScreen() {
  const navigation = useNavigation<any>();
  const [managerName, setManagerName] = React.useState('');
  const [joinCode, setJoinCode] = React.useState('');
  const [mode, setMode] = React.useState<'menu' | 'join'>('menu');
  const [loading, setLoading] = React.useState(false);

  const handleCreate = async () => {
    if (!managerName.trim()) {
      Alert.alert('Required', 'Please enter your manager name.');
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/mp/league/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerName: managerName.trim() }),
      });
      if (!res.ok) throw new Error('Failed to create league');
      const data = await res.json();
      navigation.navigate('MultiplayerLobby', {
        code: data.code,
        managerName: managerName.trim(),
        isHost: true,
      });
    } catch (err) {
      Alert.alert('Error', 'Could not create league. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!managerName.trim()) {
      Alert.alert('Required', 'Please enter your manager name.');
      return;
    }
    if (joinCode.trim().length !== 6) {
      Alert.alert('Invalid Code', 'League code must be 6 characters.');
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/mp/league/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode.trim().toUpperCase(), managerName: managerName.trim() }),
      });
      if (res.status === 404) {
        Alert.alert('Not Found', 'No league found with that code.');
        return;
      }
      if (res.status === 400) {
        const json = await res.json();
        Alert.alert('Error', json.message || 'Could not join league.');
        return;
      }
      if (!res.ok) throw new Error('Failed to join');
      navigation.navigate('MultiplayerLobby', {
        code: joinCode.trim().toUpperCase(),
        managerName: managerName.trim(),
        isHost: false,
      });
    } catch (err) {
      Alert.alert('Error', 'Could not join league. Check your connection.');
    } finally {
      setLoading(false);
    }
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

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="keyboard-return" size={32} color={Colors.green} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Multiplayer</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>Manager Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            placeholderTextColor={Colors.textMuted}
            value={managerName}
            onChangeText={setManagerName}
            autoCapitalize="words"
            maxLength={20}
          />

          {mode === 'menu' && (
            <>
              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.8}
                onPress={handleCreate}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.primaryButtonText}>Create League</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.outlineButton}
                activeOpacity={0.8}
                onPress={() => setMode('join')}
                disabled={loading}
              >
                <Text style={styles.outlineButtonText}>Join League</Text>
              </TouchableOpacity>
            </>
          )}

          {mode === 'join' && (
            <>
              <Text style={styles.sectionLabel}>League Code</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="ABC123"
                placeholderTextColor={Colors.textMuted}
                value={joinCode}
                onChangeText={t => setJoinCode(t.toUpperCase())}
                autoCapitalize="characters"
                maxLength={6}
                autoFocus
              />

              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.8}
                onPress={handleJoin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.primaryButtonText}>Join League</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.outlineButton}
                activeOpacity={0.8}
                onPress={() => setMode('menu')}
                disabled={loading}
              >
                <Text style={styles.outlineButtonText}>Back</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
    opacity: 0.12,
  },
  backgroundImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  backButton: {
    marginRight: Spacing.md,
  },
  headerTitle: {
    fontSize: 28,
    color: Colors.text,
    fontWeight: '800',
    letterSpacing: 2,
  },
  content: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.xl,
    gap: Spacing.md,
  },
  sectionLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textDim,
    fontWeight: Typography.fontWeight.medium,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: -Spacing.xs,
  },
  input: {
    backgroundColor: Colors.surface2,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    color: Colors.text,
    fontSize: Typography.fontSize.base,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  codeInput: {
    fontSize: Typography.fontSize.xl,
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: '800',
    color: Colors.green,
  },
  primaryButton: {
    backgroundColor: Colors.green,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  primaryButtonText: {
    fontSize: Typography.fontSize.lg,
    color: '#000',
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: Typography.letterSpacing.wide,
  },
  outlineButton: {
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.green,
  },
  outlineButtonText: {
    fontSize: Typography.fontSize.lg,
    color: Colors.green,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: Typography.letterSpacing.wide,
  },
});
