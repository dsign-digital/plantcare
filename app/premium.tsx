import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { getOfferings, purchasePremium, restorePurchases } from '../src/lib/purchases';
import { useAuth } from '../src/hooks/useAuth';
import { Colors, Typography, Spacing, Radii, Shadows } from '../src/constants/theme';
import { Button } from '../src/components/ui';

const FEATURES = [
  { emoji: '🪴', free: '3 planter', premium: 'Ubegrænsede planter' },
  { emoji: '🔍', free: '3 AI-scanninger / md', premium: 'Ubegrænsede scanninger' },
  { emoji: '💧', free: 'Vandingspåmindelser', premium: 'Vandingspåmindelser' },
  { emoji: '📅', free: 'Vandingskalender', premium: 'Vandingskalender' },
  { emoji: '🌸', free: 'Årstidsjustering', premium: 'Årstidsjustering' },
  { emoji: '📊', free: 'Vandingshistorik', premium: 'Vandingshistorik' },
];

export default function PremiumScreen() {
  const { profile, refreshProfile } = useAuth();
  const [offering, setOffering] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    getOfferings().then(o => {
      setOffering(o);
      setLoading(false);
    });
  }, []);

  const monthlyPackage = offering?.monthly ?? offering?.availablePackages?.[0];
  const priceString = monthlyPackage?.product?.priceString ?? '29,00 kr.';

  async function handlePurchase() {
    if (!monthlyPackage) {
      Alert.alert('Fejl', 'Abonnement ikke tilgængeligt. Prøv igen senere.');
      return;
    }
    setPurchasing(true);
    const result = await purchasePremium(monthlyPackage);
    setPurchasing(false);
    if (result === true) {
      await refreshProfile();
      Alert.alert('🎉 Velkommen til Premium!', 'Du har nu ubegrænset adgang til alle funktioner.', [
        { text: 'Fantastisk!', onPress: () => router.back() },
      ]);
    } else {
      if (result !== 'Køb annulleret.') {
        Alert.alert('Fejl', result);
      }
    }
  }

  async function handleRestore() {
    setRestoring(true);
    const restored = await restorePurchases();
    setRestoring(false);
    if (restored) {
      await refreshProfile();
      Alert.alert('✅ Gendannet', 'Dit Premium-abonnement er aktiveret.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('Ingen køb fundet', 'Vi fandt ingen aktive Premium-abonnementer.');
    }
  }

  if (profile?.is_premium) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.alreadyPremium}>
          <Text style={styles.alreadyEmoji}>✨</Text>
          <Text style={styles.alreadyTitle}>Du er allerede Premium!</Text>
          <Text style={styles.alreadySubtitle}>
            Du har adgang til alle funktioner i PlantCare.
          </Text>
          <Button title="Tilbage" onPress={() => router.back()} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.closeBtn}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>✨ PREMIUM</Text>
          </View>
          <Text style={styles.heroTitle}>Plej dine planter{'\n'}uden begrænsninger</Text>
          <Text style={styles.heroSubtitle}>
            Ubegrænsede planter og AI-scanninger for {priceString}/md
          </Text>
        </View>

        {/* Feature comparison */}
        <View style={styles.compareCard}>
          {/* Column headers */}
          <View style={styles.compareHeader}>
            <View style={styles.compareFeatureCol} />
            <View style={styles.compareCol}>
              <Text style={styles.compareColLabel}>Gratis</Text>
            </View>
            <View style={[styles.compareCol, styles.compareColPremium]}>
              <Text style={[styles.compareColLabel, styles.compareColLabelPremium]}>Premium</Text>
            </View>
          </View>

          {FEATURES.map((f, i) => (
            <View key={i} style={[styles.compareRow, i % 2 === 0 && styles.compareRowAlt]}>
              <View style={styles.compareFeatureCol}>
                <Text style={styles.compareEmoji}>{f.emoji}</Text>
              </View>
              <View style={styles.compareCol}>
                <Text style={styles.compareFreeText}>{f.free}</Text>
              </View>
              <View style={[styles.compareCol, styles.compareColPremium]}>
                <Text style={styles.comparePremiumText}>{f.premium}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Price card */}
        <View style={styles.priceCard}>
          <View style={styles.priceLeft}>
            <Text style={styles.priceAmount}>{priceString}</Text>
            <Text style={styles.pricePer}>per måned</Text>
          </View>
          <View style={styles.priceDetails}>
            <Text style={styles.priceDetail}>✓ Afmeld når som helst</Text>
            <Text style={styles.priceDetail}>✓ Ingen binding</Text>
            <Text style={styles.priceDetail}>✓ Øjeblikkelig adgang</Text>
          </View>
        </View>

        {/* CTA */}
        {loading ? (
          <ActivityIndicator color={Colors.forest[600]} size="large" style={styles.loader} />
        ) : (
          <Button
            title={`Start Premium – ${priceString}/md`}
            onPress={handlePurchase}
            loading={purchasing}
            size="lg"
            style={styles.ctaBtn}
          />
        )}

        <TouchableOpacity onPress={handleRestore} disabled={restoring} style={styles.restoreBtn}>
          <Text style={styles.restoreText}>
            {restoring ? 'Gendanner...' : 'Gendan tidligere køb'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          Abonnementet fornyes automatisk med {priceString}/måned, medmindre det opsiges
          mindst 24 timer inden den aktuelle abonnementsperiodes udløb. Du kan til enhver
          tid opsige abonnementet i din konto-indstillinger i App Store / Google Play.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.stone[50] },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: Spacing.base,
  },
  closeBtn: {
    fontSize: Typography.sizes.lg,
    color: Colors.stone[400],
    padding: Spacing.xs,
  },

  alreadyPremium: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.base,
    padding: Spacing['2xl'],
  },
  alreadyEmoji: { fontSize: 64 },
  alreadyTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '800',
    color: Colors.forest[900],
    textAlign: 'center',
  },
  alreadySubtitle: {
    fontSize: Typography.sizes.base,
    color: Colors.stone[500],
    textAlign: 'center',
    marginBottom: Spacing.md,
  },

  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'], gap: Spacing.lg },

  hero: { alignItems: 'center', paddingVertical: Spacing.lg },
  heroBadge: {
    backgroundColor: Colors.earth[100],
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radii.full,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.earth[200],
  },
  heroBadgeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: '800',
    color: Colors.earth[600],
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: '800',
    color: Colors.forest[900],
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  heroSubtitle: {
    fontSize: Typography.sizes.base,
    color: Colors.stone[500],
    textAlign: 'center',
    marginTop: Spacing.sm,
  },

  compareCard: {
    backgroundColor: Colors.white,
    borderRadius: Radii.xl,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  compareHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.stone[50],
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.stone[100],
  },
  compareFeatureCol: { width: 40 },
  compareCol: { flex: 1, alignItems: 'center' },
  compareColPremium: { backgroundColor: Colors.forest[50] },
  compareColLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: '700',
    color: Colors.stone[500],
  },
  compareColLabelPremium: { color: Colors.forest[700] },
  compareRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  compareRowAlt: { backgroundColor: Colors.stone[50] },
  compareEmoji: { fontSize: 18 },
  compareFreeText: {
    fontSize: Typography.sizes.xs,
    color: Colors.stone[500],
    textAlign: 'center',
  },
  comparePremiumText: {
    fontSize: Typography.sizes.xs,
    color: Colors.forest[700],
    fontWeight: '600',
    textAlign: 'center',
  },

  priceCard: {
    backgroundColor: Colors.forest[800],
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  priceLeft: { alignItems: 'center' },
  priceAmount: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: '800',
    color: Colors.white,
  },
  pricePer: {
    fontSize: Typography.sizes.xs,
    color: Colors.forest[300],
  },
  priceDetails: { flex: 1, gap: 4 },
  priceDetail: {
    fontSize: Typography.sizes.sm,
    color: Colors.forest[200],
    fontWeight: '500',
  },

  loader: { marginVertical: Spacing.lg },
  ctaBtn: {},
  restoreBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  restoreText: {
    fontSize: Typography.sizes.sm,
    color: Colors.stone[400],
    textDecorationLine: 'underline',
  },
  legal: {
    fontSize: Typography.sizes.xs,
    color: Colors.stone[300],
    textAlign: 'center',
    lineHeight: 18,
  },
});
