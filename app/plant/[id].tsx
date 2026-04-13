import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  Image, TouchableOpacity, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';
import { usePlants } from '../../src/hooks/usePlants';
import { Colors, Typography, Spacing, Radii, Shadows } from '../../src/constants/theme';
import { Button } from '../../src/components/ui';
import {
  formatWaterAmount, getWaterStatusLabel, getSeasonLabel,
  getCurrentSeason, getSeasonEmoji,
} from '../../src/lib/plantUtils';
import { WateringLog } from '../../src/types/database';

export default function PlantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { plants, waterPlant, deletePlant, getWateringHistory } = usePlants();
  const [history, setHistory] = useState<WateringLog[]>([]);
  const [watering, setWatering] = useState(false);

  const plant = plants.find(p => p.id === id);
  const season = getCurrentSeason();

  useEffect(() => {
    if (id) {
      getWateringHistory(id).then(setHistory);
    }
  }, [id, plants]);

  if (!plant) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Plante ikke fundet</Text>
          <Button title="Gå tilbage" onPress={() => router.back()} variant="ghost" />
        </View>
      </SafeAreaView>
    );
  }

  async function handleWater() {
    setWatering(true);
    const err = await waterPlant(plant!.id);
    setWatering(false);
    if (err) Alert.alert('Fejl', err);
  }

  async function handleDelete() {
    Alert.alert(
      `Slet ${plant!.name}`,
      'Er du sikker? Alle vandingsdata slettes også.',
      [
        { text: 'Annuller', style: 'cancel' },
        {
          text: 'Slet',
          style: 'destructive',
          onPress: async () => {
            const err = await deletePlant(plant!.id);
            if (err) Alert.alert('Fejl', err);
            else router.back();
          },
        },
      ]
    );
  }

  const STATUS_COLOR = {
    overdue: Colors.danger,
    today: Colors.water,
    tomorrow: Colors.warning,
    upcoming: Colors.forest[500],
    just_watered: Colors.forest[500],
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero image */}
        <View style={styles.hero}>
          {plant.image_url ? (
            <Image source={{ uri: plant.image_url }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Text style={styles.heroEmoji}>🪴</Text>
            </View>
          )}
          <View style={styles.heroOverlay}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backBtnText}>←</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>🗑️</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.heroNames}>
            <Text style={styles.heroPlantName}>{plant.name}</Text>
            {plant.scientific_name && (
              <Text style={styles.heroScientificName}>{plant.scientific_name}</Text>
            )}
          </View>
        </View>

        <View style={styles.content}>
          {/* Status card */}
          <View style={[styles.statusCard, { borderColor: STATUS_COLOR[plant.waterStatus] }]}>
            <View style={styles.statusLeft}>
              <Text style={[styles.statusLabel, { color: STATUS_COLOR[plant.waterStatus] }]}>
                {getWaterStatusLabel(plant.waterStatus, plant.daysUntilWatering)}
              </Text>
              <Text style={styles.statusDate}>
                Næste vanding: {format(new Date(plant.next_watering_at), 'EEEE d. MMMM', { locale: da })}
              </Text>
            </View>
            {(plant.waterStatus === 'overdue' || plant.waterStatus === 'today') && (
              <Button
                title="Vand nu 💧"
                onPress={handleWater}
                loading={watering}
                size="sm"
              />
            )}
          </View>

          {/* Info grid */}
          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Text style={styles.infoEmoji}>💧</Text>
              <Text style={styles.infoValue}>{formatWaterAmount(plant.water_amount_ml)}</Text>
              <Text style={styles.infoLabel}>Vandmængde</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoEmoji}>🔄</Text>
              <Text style={styles.infoValue}>Hver {plant.seasonalInterval}. dag</Text>
              <Text style={styles.infoLabel}>Interval ({getSeasonLabel(season)})</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoEmoji}>{getSeasonEmoji(season)}</Text>
              <Text style={styles.infoValue}>×{plant[`season_${season}_multiplier`].toFixed(1)}</Text>
              <Text style={styles.infoLabel}>Sæsonfaktor</Text>
            </View>
            {plant.room && (
              <View style={styles.infoCard}>
                <Text style={styles.infoEmoji}>📍</Text>
                <Text style={styles.infoValue}>{plant.room}</Text>
                <Text style={styles.infoLabel}>Placering</Text>
              </View>
            )}
          </View>

          {/* Seasonal intervals */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vandingsinterval pr. årstid</Text>
            <View style={styles.seasonGrid}>
              {[
                { season: 'spring', emoji: '🌸', label: 'Forår', multiplier: plant.season_spring_multiplier },
                { season: 'summer', emoji: '☀️', label: 'Sommer', multiplier: plant.season_summer_multiplier },
                { season: 'autumn', emoji: '🍂', label: 'Efterår', multiplier: plant.season_autumn_multiplier },
                { season: 'winter', emoji: '❄️', label: 'Vinter', multiplier: plant.season_winter_multiplier },
              ].map(({ season: s, emoji, label, multiplier }) => {
                const interval = Math.round(plant.watering_interval_days * multiplier);
                const isCurrent = s === season;
                return (
                  <View key={s} style={[styles.seasonCard, isCurrent && styles.seasonCardActive]}>
                    <Text style={styles.seasonEmoji}>{emoji}</Text>
                    <Text style={[styles.seasonLabel, isCurrent && styles.seasonLabelActive]}>{label}</Text>
                    <Text style={[styles.seasonInterval, isCurrent && styles.seasonIntervalActive]}>
                      {interval}d
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Notes */}
          {plant.notes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Noter</Text>
              <View style={styles.notesCard}>
                <Text style={styles.notesText}>{plant.notes}</Text>
              </View>
            </View>
          )}

          {/* Watering history */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vandingshistorik</Text>
            {history.length === 0 ? (
              <Text style={styles.emptyHistory}>Ingen vandinger registreret endnu</Text>
            ) : (
              <View style={styles.historyList}>
                {history.map(log => (
                  <View key={log.id} style={styles.historyItem}>
                    <View style={styles.historyDot} />
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyDate}>
                        {format(new Date(log.watered_at), 'EEEE d. MMMM yyyy', { locale: da })}
                      </Text>
                      <Text style={styles.historyAmount}>{formatWaterAmount(log.water_amount_ml)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Water now button (always visible at bottom) */}
          {plant.waterStatus !== 'overdue' && plant.waterStatus !== 'today' && (
            <Button
              title="Registrér vanding 💧"
              onPress={handleWater}
              loading={watering}
              variant="secondary"
              size="lg"
              style={styles.bottomWaterBtn}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.stone[50] },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  notFoundText: { fontSize: Typography.sizes.lg, color: Colors.stone[500] },

  hero: { height: 300, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.forest[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: { fontSize: 72 },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.base,
    paddingTop: Spacing.xl,
  },
  backBtn: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { fontSize: 20, color: Colors.white },
  deleteBtn: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: { fontSize: 18 },
  heroNames: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.base,
    paddingBottom: Spacing.lg,
    backgroundColor: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
  },
  heroPlantName: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: '800',
    color: Colors.white,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 4,
  },
  heroScientificName: {
    fontSize: Typography.sizes.base,
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
  },

  content: { padding: Spacing.base, gap: Spacing.lg, paddingBottom: Spacing['4xl'] },

  statusCard: {
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    padding: Spacing.base,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    ...Shadows.sm,
  },
  statusLeft: { flex: 1, marginRight: Spacing.sm },
  statusLabel: { fontSize: Typography.sizes.md, fontWeight: '700' },
  statusDate: { fontSize: Typography.sizes.sm, color: Colors.stone[500], marginTop: 2 },

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  infoCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
    ...Shadows.sm,
  },
  infoEmoji: { fontSize: 24 },
  infoValue: { fontSize: Typography.sizes.sm, fontWeight: '700', color: Colors.stone[800] },
  infoLabel: { fontSize: Typography.sizes.xs, color: Colors.stone[400] },

  section: { gap: Spacing.sm },
  sectionTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: '700',
    color: Colors.stone[500],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  seasonGrid: { flexDirection: 'row', gap: Spacing.sm },
  seasonCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: 2,
    ...Shadows.sm,
  },
  seasonCardActive: { backgroundColor: Colors.forest[600] },
  seasonEmoji: { fontSize: 18 },
  seasonLabel: { fontSize: Typography.sizes.xs, color: Colors.stone[500], fontWeight: '600' },
  seasonLabelActive: { color: 'rgba(255,255,255,0.8)' },
  seasonInterval: { fontSize: Typography.sizes.sm, fontWeight: '800', color: Colors.forest[700] },
  seasonIntervalActive: { color: Colors.white },

  notesCard: {
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    padding: Spacing.base,
    ...Shadows.sm,
  },
  notesText: { fontSize: Typography.sizes.base, color: Colors.stone[700], lineHeight: 22 },

  emptyHistory: { fontSize: Typography.sizes.sm, color: Colors.stone[400] },
  historyList: { gap: Spacing.sm },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    ...Shadows.sm,
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.water,
  },
  historyInfo: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  historyDate: { fontSize: Typography.sizes.sm, color: Colors.stone[700] },
  historyAmount: { fontSize: Typography.sizes.sm, color: Colors.stone[400], fontWeight: '600' },

  bottomWaterBtn: { marginTop: Spacing.sm },
});
