import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { usePlants } from '../../src/hooks/usePlants';
import { Colors, Typography, Spacing, Radii, Shadows } from '../../src/constants/theme';
import { PlantCard } from '../../src/components/PlantCard';
import { EmptyState, SectionHeader } from '../../src/components/ui';
import { getCurrentSeason, getSeasonLabel, getSeasonEmoji } from '../../src/lib/plantUtils';

export default function HomeScreen() {
  const { profile } = useAuth();
  const { plants, plantsNeedingWater, loading, fetchPlants, waterPlant } = usePlants();
  const [refreshing, setRefreshing] = useState(false);

  const season = getCurrentSeason();
  const isPremium = profile?.is_premium ?? false;
  const plantCount = plants.length;
  const firstName = profile?.full_name?.split(' ')[0] ?? 'der';

  async function onRefresh() {
    setRefreshing(true);
    await fetchPlants();
    setRefreshing(false);
  }

  async function handleWater(plantId: string, plantName: string) {
    Alert.alert(
      `Vand ${plantName}`,
      'Marker planten som vandet nu?',
      [
        { text: 'Annuller', style: 'cancel' },
        {
          text: 'Ja, vand nu 💧',
          onPress: async () => {
            const err = await waterPlant(plantId);
            if (err) Alert.alert('Fejl', err);
          },
        },
      ]
    );
  }

  function handleAddPlant() {
    if (!isPremium && plantCount >= 3) {
      router.push('/premium');
    } else {
      router.push('/add-plant');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.forest[500]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hej, {firstName} 👋</Text>
            <View style={styles.seasonRow}>
              <Text style={styles.seasonText}>
                {getSeasonEmoji(season)} {getSeasonLabel(season)} – vandingspåmindelser tilpasset
              </Text>
            </View>
          </View>
          {!isPremium && (
            <TouchableOpacity style={styles.premiumBadge} onPress={() => router.push('/premium')}>
              <Text style={styles.premiumBadgeText}>✨ Premium</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{plantCount}</Text>
            <Text style={styles.statLabel}>Planter</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, plantsNeedingWater.length > 0 && styles.statNumberAlert]}>
              {plantsNeedingWater.length}
            </Text>
            <Text style={styles.statLabel}>Skal vandes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {isPremium ? '∞' : `${3 - plantCount < 0 ? 0 : 3 - plantCount}`}
            </Text>
            <Text style={styles.statLabel}>{isPremium ? 'Premium' : 'Ledige pladser'}</Text>
          </View>
        </View>

        {/* Needs water now */}
        {plantsNeedingWater.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title={`💧 Skal vandes (${plantsNeedingWater.length})`} />
            {plantsNeedingWater.map(plant => (
              <PlantCard
                key={plant.id}
                plant={plant}
                onPress={() => router.push(`/plant/${plant.id}`)}
                onWater={() => handleWater(plant.id, plant.name)}
              />
            ))}
          </View>
        )}

        {/* All plants */}
        <View style={styles.section}>
          <SectionHeader
            title="Alle planter"
            action={
              <TouchableOpacity style={styles.addBtn} onPress={handleAddPlant}>
                <Text style={styles.addBtnText}>+ Tilføj</Text>
              </TouchableOpacity>
            }
          />

          {plants.length === 0 ? (
            <EmptyState
              emoji="🪴"
              title="Ingen planter endnu"
              subtitle="Tilføj din første plante og få vandingspåmindelser"
              action={
                <TouchableOpacity style={styles.addFirstBtn} onPress={handleAddPlant}>
                  <Text style={styles.addFirstBtnText}>Tilføj plante</Text>
                </TouchableOpacity>
              }
            />
          ) : (
            plants.map(plant => (
              <PlantCard
                key={plant.id}
                plant={plant}
                onPress={() => router.push(`/plant/${plant.id}`)}
                onWater={() => handleWater(plant.id, plant.name)}
              />
            ))
          )}
        </View>

        {/* Free plan nudge */}
        {!isPremium && plantCount >= 3 && (
          <TouchableOpacity style={styles.upgradeBanner} onPress={() => router.push('/premium')}>
            <Text style={styles.upgradeBannerEmoji}>🌟</Text>
            <View style={styles.upgradeBannerText}>
              <Text style={styles.upgradeBannerTitle}>Du har nået grænsen på 3 planter</Text>
              <Text style={styles.upgradeBannerSub}>Opgrader til Premium for ubegrænsede planter</Text>
            </View>
            <Text style={styles.upgradeBannerArrow}>→</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.stone[50] },
  scroll: { flex: 1 },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  greeting: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: '800',
    color: Colors.forest[900],
    letterSpacing: -0.5,
  },
  seasonRow: { marginTop: Spacing.xs },
  seasonText: { fontSize: Typography.sizes.sm, color: Colors.stone[500] },
  premiumBadge: {
    backgroundColor: Colors.earth[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.earth[200],
  },
  premiumBadgeText: {
    fontSize: Typography.sizes.sm,
    color: Colors.earth[600],
    fontWeight: '700',
  },

  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.sm,
  },
  statNumber: {
    fontSize: Typography.sizes.xl,
    fontWeight: '800',
    color: Colors.forest[700],
  },
  statNumberAlert: { color: Colors.danger },
  statLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.stone[400],
    marginTop: 2,
    textAlign: 'center',
  },

  section: { marginBottom: Spacing.lg },
  addBtn: {
    backgroundColor: Colors.forest[600],
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radii.full,
  },
  addBtnText: {
    color: Colors.white,
    fontSize: Typography.sizes.sm,
    fontWeight: '700',
  },

  addFirstBtn: {
    backgroundColor: Colors.forest[600],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Radii.md,
  },
  addFirstBtnText: {
    color: Colors.white,
    fontSize: Typography.sizes.base,
    fontWeight: '600',
  },

  upgradeBanner: {
    backgroundColor: Colors.earth[100],
    borderRadius: Radii.lg,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.earth[200],
    marginBottom: Spacing.base,
  },
  upgradeBannerEmoji: { fontSize: 28 },
  upgradeBannerText: { flex: 1 },
  upgradeBannerTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: '700',
    color: Colors.earth[600],
  },
  upgradeBannerSub: {
    fontSize: Typography.sizes.xs,
    color: Colors.earth[500],
    marginTop: 2,
  },
  upgradeBannerArrow: {
    fontSize: Typography.sizes.lg,
    color: Colors.earth[500],
  },
});
