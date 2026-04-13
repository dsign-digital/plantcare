import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { Colors, Typography, Spacing, Radii } from '../../src/constants/theme';
import { Button, Input } from '../../src/components/ui';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!email || !password) {
      setError('Udfyld email og adgangskode.');
      return;
    }
    setLoading(true);
    setError('');
    const err = await signIn(email.trim(), password);
    if (err) setError(err);
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Back */}
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>← Tilbage</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.emoji}>🌿</Text>
            <Text style={styles.title}>Velkommen tilbage</Text>
            <Text style={styles.subtitle}>Log ind for at se dine planter</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="din@email.dk"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Input
              label="Adgangskode"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoComplete="password"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              title="Log ind"
              onPress={handleLogin}
              loading={loading}
              size="lg"
              style={styles.submitBtn}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Har du ikke en konto? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/signup')}>
              <Text style={styles.footerLink}>Opret konto</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.stone[50] },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, padding: Spacing.xl },
  back: { marginBottom: Spacing.xl },
  backText: { fontSize: Typography.sizes.base, color: Colors.forest[600], fontWeight: '500' },
  header: { alignItems: 'center', marginBottom: Spacing['2xl'] },
  emoji: { fontSize: 48, marginBottom: Spacing.md },
  title: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: '800',
    color: Colors.forest[900],
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.sizes.base,
    color: Colors.stone[500],
    marginTop: Spacing.xs,
  },
  form: { gap: Spacing.base },
  error: {
    fontSize: Typography.sizes.sm,
    color: Colors.danger,
    textAlign: 'center',
    backgroundColor: Colors.dangerLight,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
  },
  submitBtn: { marginTop: Spacing.sm },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing['2xl'],
  },
  footerText: { fontSize: Typography.sizes.base, color: Colors.stone[500] },
  footerLink: {
    fontSize: Typography.sizes.base,
    color: Colors.forest[600],
    fontWeight: '700',
  },
});
