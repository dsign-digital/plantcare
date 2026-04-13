import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, Switch, Linking, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { usePlants } from '../../src/hooks/usePlants';
import { Colors, Typography, Spacing, Radii, Shadows } from '../../src/constants/theme';
import { remainingScans, getCurrentSeason, getSeasonLabel, getSeasonEmoji } from '../../src/lib/plantUtils';
import { rescheduleAllNotifications } from '../../src/lib/notifications';
import { restorePurchases } from '../../src/lib/purchases';

const NOTIFICATION_TIMES = ['07:00', '08:00', '09:00', '18:00', '19:00', '20:00'];

export default function SettingsScreen() {
  const { profile, signOut, deleteAccount, refreshProfile } = useAuth();
  const { plants } = usePlants();
  const [restoringPurchases, setRestoringPurchases] = useState(false);

  const isPremium = profile?.is_premium ?? false;
  const scansLeft = remainingScans(
    profile?.scan_count_this_month ?? 0,
    profile?.scan_count_reset_at ?? new Date().toISOString()
  );
  const season = getCurrentSeason();

  async function handleNotificationTimeChange(time: string) {
    const { supabase } = await import('../../src/lib/supabase');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').update({ notification_time: time }).eq('id', user.id);
    await rescheduleAllNotifications(plants, time);
    await refreshProfile();
  }

  async function handleSignOut() {
    Alert.alert('Log ud', 'Er du sikker på, at du vil logge ud?', [
      { text: 'Annuller', style: 'cancel' },
      { text: 'Log ud', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  async function handleDeleteAccount() {
    Alert.alert(
      'Slet konto',
      'Dette sletter din konto og alle dine planter permanent. Denne handling kan ikke fortrydes.',
      [
        { text: 'Annuller', style: 'cancel' },
        {
          text: 'Slet konto',
          style: 'destructive',
          onPress: async () => {
            const err = await deleteAccount();
            if (err) Alert.alert('Fejl', err);
          },
        },
      ]
    );
  }

  async function handleRestorePurchases() {
    setRestoringPurchases(true);
    const restored = await restorePurchases();
    setRestoringPurchases(false);
    if (restored) {
      await refreshProfile();
      Alert.alert('✅ Gendannet', 'Dit Premium-abonnement er gendannet.');
    } else {
      Alert.alert('Ingen køb fundet', 'Vi fandt ingen aktive abonnementer at gendanne.');
    }
  }

  async function handleManageSubscription() {
    const url = Platform.OS === 'ios'
      ? 'https://apps.apple.com/account/subscriptions'
      : 'https://play.google.com/store/account/subscriptions';

    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('Kunne ikke åbne', 'Åbn App Store/Google Play og administrer dit abonnement derfra.');
      return;
    }
    await Linking.openURL(url);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Indstillinger</Text>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.full_name ?? 'Bruger'}</Text>
            <Text style={styles.profileEmail}>{profile?.email}</Text>
          </View>
          {isPremium && (
            <View style={styles.premiumTag}>
              <Text style={styles.premiumTagText}>✨ Premium</Text>
            </View>
          )}
        </View>

        {/* Plan section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dit abonnement</Text>
          <View style={styles.card}>
            <View style={styles.planRow}>
              <Text style={styles.planLabel}>{isPremium ? '✨ Premium' : '🌱 Gratis'}</Text>
              {!isPremium && (
                <TouchableOpacity
                  style={styles.upgradeBtn}
                  onPress={() => router.push('/premium')}
                >
                  <Text style={styles.upgradeBtnText}>Opgrader</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.divider} />
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{plants.length}</Text>
                <Text style={styles.statLabel}>Planter</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{isPremium ? '∞' : `${scansLeft}/3`}</Text>
                <Text style={styles.statLabel}>Scanninger i md.</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {getSeasonEmoji(season)} {getSeasonLabel(season)}
                </Text>
                <Text style={styles.statLabel}>Årstid</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Notification time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Påmindelsestidspunkt</Text>
          <View style={styles.card}>
            <Text style={styles.cardDescription}>
              Hvornår vil du modtage vandingspåmindelser?
            </Text>
            <View style={styles.timePicker}>
              {NOTIFICATION_TIMES.map(time => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeChip,
                    profile?.notification_time === time && styles.timeChipActive,
                  ]}
                  onPress={() => handleNotificationTimeChange(time)}
                >
                  <Text style={[
                    styles.timeChipText,
                    profile?.notification_time === time && styles.timeChipTextActive,
                  ]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Account actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Konto</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleRestorePurchases}
              disabled={restoringPurchases}
            >
              <Text style={styles.actionText}>
                {restoringPurchases ? 'Gendanner...' : 'Gendan køb'}
              </Text>
              <Text style={styles.actionArrow}>→</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            {isPremium && (
              <>
                <TouchableOpacity style={styles.actionRow} onPress={handleManageSubscription}>
                  <Text style={styles.actionText}>Administrer/opsig abonnement</Text>
                  <Text style={styles.actionArrow}>→</Text>
                </TouchableOpacity>
                <View style={styles.divider} />
              </>
            )}
            <TouchableOpacity style={styles.actionRow} onPress={handleSignOut}>
              <Text style={styles.actionText}>Log ud</Text>
              <Text style={styles.actionArrow}>→</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.actionRow} onPress={handleDeleteAccount}>
              <Text style={[styles.actionText, styles.actionDanger]}>Slet konto</Text>
              <Text style={[styles.actionArrow, styles.actionDanger]}>→</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App version */}
        <Text style={styles.version}>PlantCare v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.stone[50] },
  scroll: { flex: 1 },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  pageTitle: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: '800',
    color: Colors.forest[900],
    letterSpacing: -0.5,
    marginBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },

  profileCard: {
    backgroundColor: Colors.white,
    borderRadius: Radii.xl,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadows.sm,
    marginBottom: Spacing.lg,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: Radii.full,
    backgroundColor: Colors.forest[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: Typography.sizes.xl,
    fontWeight: '800',
    color: Colors.white,
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: Typography.sizes.md,
    fontWeight: '700',
    color: Colors.stone[800],
  },
  profileEmail: {
    fontSize: Typography.sizes.sm,
    color: Colors.stone[400],
    marginTop: 2,
  },
  premiumTag: {
    backgroundColor: Colors.earth[100],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  premiumTagText: {
    fontSize: Typography.sizes.xs,
    color: Colors.earth[600],
    fontWeight: '700',
  },

  section: { marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: '700',
    color: Colors.stone[500],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    padding: Spacing.base,
    ...Shadows.sm,
  },
  cardDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.stone[500],
    marginBottom: Spacing.md,
  },

  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  planLabel: {
    fontSize: Typography.sizes.md,
    fontWeight: '700',
    color: Colors.forest[800],
  },
  upgradeBtn: {
    backgroundColor: Colors.forest[600],
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radii.full,
  },
  upgradeBtnText: {
    color: Colors.white,
    fontSize: Typography.sizes.sm,
    fontWeight: '700',
  },

  divider: { height: 1, backgroundColor: Colors.stone[100], marginVertical: Spacing.sm },

  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: {
    fontSize: Typography.sizes.md,
    fontWeight: '800',
    color: Colors.forest[700],
  },
  statLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.stone[400],
    marginTop: 2,
    textAlign: 'center',
  },

  timePicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  timeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radii.full,
    backgroundColor: Colors.stone[100],
    borderWidth: 1,
    borderColor: Colors.stone[200],
  },
  timeChipActive: {
    backgroundColor: Colors.forest[600],
    borderColor: Colors.forest[600],
  },
  timeChipText: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    color: Colors.stone[600],
  },
  timeChipTextActive: { color: Colors.white },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  actionText: {
    fontSize: Typography.sizes.base,
    color: Colors.stone[800],
  },
  actionArrow: {
    fontSize: Typography.sizes.base,
    color: Colors.stone[400],
  },
  actionDanger: { color: Colors.danger },

  version: {
    textAlign: 'center',
    fontSize: Typography.sizes.xs,
    color: Colors.stone[300],
    marginTop: Spacing.sm,
  },
});
