import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { Colors, Typography, Spacing, Radii } from '../../src/constants/theme';
import { Button, Input } from '../../src/components/ui';

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignup() {
    if (!fullName || !email || !password) {
      setError('Udfyld alle felter.');
      return;
    }
    if (password.length < 6) {
      setError('Adgangskoden skal være mindst 6 tegn.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Adgangskoderne stemmer ikke overens.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await signUp(email, password, fullName);

    if (result === 'CHECK_EMAIL') {
      setLoading(false);
      Alert.alert(
        'Bekræft din email',
        'Vi har sendt dig en bekræftelsesmail. Klik på linket i mailen og log derefter ind.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
      return;
    }

    if (result) {
      setError(result);
    }
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>← Tilbage</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.emoji}>🌱</Text>
            <Text style={styles.title}>Opret din konto</Text>
            <Text style={styles.subtitle}>Gratis – 3 planter inkluderet</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Dit navn"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Anders Andersen"
              autoCapitalize="words"
              autoComplete="name"
            />
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
              placeholder="Mindst 6 tegn"
              secureTextEntry
              autoComplete="new-password"
            />
            <Input
              label="Bekræft adgangskode"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Gentag adgangskode"
              secureTextEntry
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              title="Opret konto"
              onPress={handleSignup}
              loading={loading}
              size="lg"
              style={styles.submitBtn}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Har du allerede en konto? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.footerLink}>Log ind</Text>
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
  title: { fontSize: Typography.sizes['2xl'], fontWeight: '800', color: Colors.forest[900], letterSpacing: -0.5 },
  subtitle: { fontSize: Typography.sizes.base, color: Colors.stone[500], marginTop: Spacing.xs },
  form: { gap: Spacing.base },
  error: {
    fontSize: Typography.sizes.sm, color: Colors.danger, textAlign: 'center',
    backgroundColor: Colors.dangerLight, padding: Spacing.sm, borderRadius: Radii.sm,
  },
  submitBtn: { marginTop: Spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing['2xl'] },
  footerText: { fontSize: Typography.sizes.base, color: Colors.stone[500] },
  footerLink: { fontSize: Typography.sizes.base, color: Colors.forest[600], fontWeight: '700' },
});
