import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { format, addDays, isSameDay, isToday } from 'date-fns';
import { da } from 'date-fns/locale';
import { usePlants } from '../../src/hooks/usePlants';
import { Colors, Typography, Spacing, Radii, Shadows } from '../../src/constants/theme';
import { formatWaterAmount } from '../../src/lib/plantUtils';
import { PlantWithStatus } from '../../src/types/database';

export default function CalendarScreen() {
  const { plants } = usePlants();

  // Build next 14 days of watering schedule
  const schedule = useMemo(() => {
    const days: { date: Date; plants: PlantWithStatus[] }[] = [];
    for (let i = 0; i < 14; i++) {
      const date = addDays(new Date(), i);
      const plantsOnDay = plants.filter(p => {
        const nextDate = new Date(p.next_watering_at);
        return isSameDay(nextDate, date);
      });
      days.push({ date, plants: plantsOnDay });
    }
    return days;
  }, [plants]);

  const totalUpcoming = schedule.reduce((sum, d) => sum + d.plants.length, 0);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Vandingskalender</Text>
          <Text style={styles.subtitle}>
            {totalUpcoming} vandinger planlagt de næste 2 uger
          </Text>
        </View>

        {/* Days */}
        {schedule.map(({ date, plants: dayPlants }) => (
          <View key={date.toISOString()} style={styles.dayRow}>
            {/* Date column */}
            <View style={[styles.dateCol, isToday(date) && styles.dateColToday]}>
              <Text style={[styles.dateDayName, isToday(date) && styles.dateTodayText]}>
                {isToday(date) ? 'I dag' : format(date, 'EEE', { locale: da })}
              </Text>
              <Text style={[styles.dateNumber, isToday(date) && styles.dateTodayText]}>
                {format(date, 'd')}
              </Text>
            </View>

            {/* Plants column */}
            <View style={styles.plantsCol}>
              {dayPlants.length === 0 ? (
                <View style={styles.emptyDay}>
                  <Text style={styles.emptyDayText}>Ingen vandinger</Text>
                </View>
              ) : (
                dayPlants.map(plant => (
                  <TouchableOpacity
                    key={plant.id}
                    style={[styles.calPlantCard, isToday(date) && styles.calPlantCardToday]}
                    onPress={() => router.push(`/plant/${plant.id}`)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.calPlantName}>{plant.name}</Text>
                    <View style={styles.calPlantMeta}>
                      <Text style={styles.calPlantMl}>💧 {formatWaterAmount(plant.water_amount_ml)}</Text>
                      {plant.room && <Text style={styles.calPlantRoom}>📍 {plant.room}</Text>}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        ))}

        {/* Overdue */}
        {plants.filter(p => p.waterStatus === 'overdue').length > 0 && (
          <View style={styles.overdueSection}>
            <Text style={styles.overdueTitle}>🚨 Forsinkede vandinger</Text>
            {plants.filter(p => p.waterStatus === 'overdue').map(plant => (
              <TouchableOpacity
                key={plant.id}
                style={styles.overdueCard}
                onPress={() => router.push(`/plant/${plant.id}`)}
              >
                <Text style={styles.overdueCardName}>{plant.name}</Text>
                <Text style={styles.overdueCardDays}>
                  {Math.abs(plant.daysUntilWatering)} dag{Math.abs(plant.daysUntilWatering) !== 1 ? 'e' : ''} forsinket
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.stone[50] },
  scroll: { flex: 1 },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },

  header: { marginBottom: Spacing.xl, paddingTop: Spacing.sm },
  title: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: '800',
    color: Colors.forest[900],
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.stone[500],
    marginTop: Spacing.xs,
  },

  dayRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
    minHeight: 52,
  },
  dateCol: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.stone[100],
  },
  dateColToday: { backgroundColor: Colors.forest[600] },
  dateDayName: {
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    color: Colors.stone[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateNumber: {
    fontSize: Typography.sizes.lg,
    fontWeight: '800',
    color: Colors.stone[700],
  },
  dateTodayText: { color: Colors.white },

  plantsCol: { flex: 1, gap: Spacing.xs },

  emptyDay: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: Spacing.sm,
  },
  emptyDayText: {
    fontSize: Typography.sizes.sm,
    color: Colors.stone[300],
  },

  calPlantCard: {
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    ...Shadows.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.water,
  },
  calPlantCardToday: {
    borderLeftColor: Colors.forest[500],
    backgroundColor: Colors.forest[50],
  },
  calPlantName: {
    fontSize: Typography.sizes.sm,
    fontWeight: '700',
    color: Colors.stone[800],
  },
  calPlantMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: 2,
  },
  calPlantMl: { fontSize: Typography.sizes.xs, color: Colors.stone[400] },
  calPlantRoom: { fontSize: Typography.sizes.xs, color: Colors.stone[400] },

  overdueSection: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.dangerLight,
    borderRadius: Radii.lg,
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  overdueTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: '700',
    color: Colors.danger,
    marginBottom: Spacing.xs,
  },
  overdueCard: {
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overdueCardName: {
    fontSize: Typography.sizes.sm,
    fontWeight: '700',
    color: Colors.stone[800],
  },
  overdueCardDays: {
    fontSize: Typography.sizes.xs,
    color: Colors.danger,
    fontWeight: '600',
  },
});
