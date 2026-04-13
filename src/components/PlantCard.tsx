import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { PlantWithStatus } from '../types/database';
import { Colors, Typography, Spacing, Radii, Shadows } from '../constants/theme';
import { getWaterStatusLabel, formatWaterAmount, getSeasonEmoji, getCurrentSeason } from '../lib/plantUtils';

interface PlantCardProps {
  plant: PlantWithStatus;
  onPress: () => void;
  onWater: () => void;
}

const STATUS_CONFIG = {
  overdue: { color: Colors.danger, bg: Colors.dangerLight, label: '🚨 Forsinket' },
  today: { color: Colors.water, bg: Colors.waterLight, label: '💧 Vand i dag' },
  tomorrow: { color: Colors.warning, bg: Colors.warningLight, label: '⏰ I morgen' },
  upcoming: { color: Colors.forest[500], bg: Colors.forest[50], label: '✅ God tilstand' },
  just_watered: { color: Colors.forest[500], bg: Colors.forest[50], label: '✅ Netop vandet' },
};

export function PlantCard({ plant, onPress, onWater }: PlantCardProps) {
  console.log(plant.name, plant.image_url);
  const config = STATUS_CONFIG[plant.waterStatus];
  const season = getCurrentSeason();
  const seasonEmoji = getSeasonEmoji(season);
  const imageUrl = typeof plant.image_url === 'string' ? plant.image_url.trim() : '';
  const hasImage = imageUrl.length > 0;
  console.log('PlantCard image_url:', plant.image_url);
  console.log('PlantCard hasImage:', hasImage);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Plant image */}
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderEmoji}>🪴</Text>
          </View>
        )}
        {/* Season indicator */}
        <View style={styles.seasonBadge}>
          <Text style={styles.seasonEmoji}>{seasonEmoji}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.names}>
            <Text style={styles.plantName} numberOfLines={1}>{plant.name}</Text>
            {plant.scientific_name && (
              <Text style={styles.scientificName} numberOfLines={1}>{plant.scientific_name}</Text>
            )}
          </View>
          {plant.room && (
            <Text style={styles.room}>{plant.room}</Text>
          )}
        </View>

        {/* Status row */}
        <View style={[styles.statusRow, { backgroundColor: config.bg }]}>
          <Text style={[styles.statusLabel, { color: config.color }]}>
            {config.label}
          </Text>
          <Text style={[styles.statusDate, { color: config.color }]}>
            {getWaterStatusLabel(plant.waterStatus, plant.daysUntilWatering)}
          </Text>
        </View>

        {/* Water info */}
        <View style={styles.waterInfo}>
          <View style={styles.waterDetail}>
            <Text style={styles.waterDetailLabel}>Mængde</Text>
            <Text style={styles.waterDetailValue}>{formatWaterAmount(plant.water_amount_ml)}</Text>
          </View>
          <View style={styles.waterDetail}>
            <Text style={styles.waterDetailLabel}>Interval</Text>
            <Text style={styles.waterDetailValue}>Hver {plant.seasonalInterval}. dag</Text>
          </View>

          {/* Water button */}
          {(plant.waterStatus === 'overdue' || plant.waterStatus === 'today') && (
            <TouchableOpacity
              style={styles.waterBtn}
              onPress={(e) => { e.stopPropagation(); onWater(); }}
              activeOpacity={0.8}
            >
              <Text style={styles.waterBtnText}>Vand nu 💧</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radii.xl,
    overflow: 'hidden',
    ...Shadows.md,
    marginBottom: Spacing.base,
  },
  imageContainer: {
    height: 160,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.forest[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderEmoji: { fontSize: 48 },
  seasonBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: Radii.full,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seasonEmoji: { fontSize: 16 },
  content: { padding: Spacing.base },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  names: { flex: 1, marginRight: Spacing.sm },
  plantName: {
    fontSize: Typography.sizes.md,
    fontWeight: '700',
    color: Colors.forest[900],
  },
  scientificName: {
    fontSize: Typography.sizes.sm,
    color: Colors.stone[500],
    fontStyle: 'italic',
    marginTop: 2,
  },
  room: {
    fontSize: Typography.sizes.xs,
    color: Colors.stone[400],
    backgroundColor: Colors.stone[100],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  statusLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
  },
  statusDate: {
    fontSize: Typography.sizes.xs,
    fontWeight: '500',
  },
  waterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  waterDetail: { flex: 1 },
  waterDetailLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.stone[400],
    marginBottom: 2,
  },
  waterDetailValue: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    color: Colors.stone[700],
  },
  waterBtn: {
    backgroundColor: Colors.forest[600],
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.md,
  },
  waterBtnText: {
    color: Colors.white,
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
  },
});
