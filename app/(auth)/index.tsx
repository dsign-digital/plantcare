import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ImageBackground } from 'react-native';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, Radii } from '../../src/constants/theme';
import { Button } from '../../src/components/ui';

export default function OnboardingScreen() {
  return (
    <View style={styles.container}>
      {/* Background gradient effect */}
      <View style={styles.bgTop} />
      <View style={styles.bgBottom} />

      <SafeAreaView style={styles.safe}>
        {/* Decorative leaf elements */}
        <View style={styles.decorLeafTop}>
          <Text style={styles.decorLeaf}>🌿</Text>
        </View>
        <View style={styles.decorLeafRight}>
          <Text style={styles.decorLeaf}>🌱</Text>
        </View>

        {/* Main content */}
        <View style={styles.content}>
          <View style={styles.logoArea}>
            <Text style={styles.logoEmoji}>🪴</Text>
            <Text style={styles.appName}>PlantCare</Text>
            <Text style={styles.tagline}>Din personlige planteassistent</Text>
          </View>

          <View style={styles.features}>
            {[
              { emoji: '🔍', text: 'Identificér planter med AI' },
              { emoji: '💧', text: 'Få påmindelser om vanding' },
              { emoji: '🌸', text: 'Tilpasset årstiderne' },
              { emoji: '📊', text: 'Hold styr på vandingshistorik' },
            ].map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Text style={styles.featureEmoji}>{f.emoji}</Text>
                </View>
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* CTA buttons */}
        <View style={styles.actions}>
          <Button
            title="Opret konto"
            onPress={() => router.push('/(auth)/signup')}
            size="lg"
            style={styles.btnPrimary}
          />
          <Button
            title="Jeg har allerede en konto"
            onPress={() => router.push('/(auth)/login')}
            variant="ghost"
            size="lg"
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.forest[800] },
  bgTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.forest[900],
  },
  bgBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: Colors.stone[50],
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },
  safe: { flex: 1 },
  decorLeafTop: { position: 'absolute', top: 60, right: 24, opacity: 0.3 },
  decorLeafRight: { position: 'absolute', top: 180, left: 16, opacity: 0.2 },
  decorLeaf: { fontSize: 64 },

  content: { flex: 1, alignItems: 'center', paddingTop: Spacing['4xl'] },
  logoArea: { alignItems: 'center', marginBottom: Spacing['3xl'] },
  logoEmoji: { fontSize: 72, marginBottom: Spacing.md },
  appName: {
    fontSize: Typography.sizes['3xl'],
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: Typography.sizes.md,
    color: Colors.forest[200],
    marginTop: Spacing.xs,
  },

  features: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    width: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureEmoji: { fontSize: 20 },
  featureText: {
    fontSize: Typography.sizes.base,
    color: Colors.white,
    fontWeight: '500',
  },

  actions: {
    padding: Spacing.xl,
    gap: Spacing.sm,
    backgroundColor: Colors.stone[50],
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingTop: Spacing['2xl'],
  },
  btnPrimary: { width: '100%' },
});
