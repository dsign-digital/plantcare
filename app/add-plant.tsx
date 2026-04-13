import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Image, Alert, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { usePlants } from '../src/hooks/usePlants';
import { identifyPlant, isPlantIdError } from '../src/lib/plantId';
import { supabase } from '../src/lib/supabase';
import { Colors, Typography, Spacing, Radii, Shadows } from '../src/constants/theme';
import { Button, Input } from '../src/components/ui';
import { canScan, remainingScans } from '../src/lib/plantUtils';
import { addDays } from 'date-fns';

type Step = 'choose' | 'scanning' | 'result' | 'manual' | 'details';

const ROOMS = ['Stue', 'Soveværelse', 'Køkken', 'Badeværelse', 'Kontor', 'Altan', 'Have'];

export default function AddPlantScreen() {
  const { profile, refreshProfile } = useAuth();
  const { addPlant, fetchPlants } = usePlants();

  const [step, setStep] = useState<Step>('choose');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  // Plant data
  const [plantName, setPlantName] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [wateringInterval, setWateringInterval] = useState('7');
  const [waterAmount, setWaterAmount] = useState('200');
  const [room, setRoom] = useState('');
  const [notes, setNotes] = useState('');
  const [plantIdData, setPlantIdData] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const isPremium = profile?.is_premium ?? false;
  const scansLeft = remainingScans(
    profile?.scan_count_this_month ?? 0,
    profile?.scan_count_reset_at ?? new Date().toISOString()
  );
  const scanAllowed = canScan(
    profile?.scan_count_this_month ?? 0,
    profile?.scan_count_reset_at ?? new Date().toISOString(),
    isPremium
  );

  async function openCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Tilladelse nødvendig', 'PlantCare skal bruge kameraet for at identificere planter.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      await scanPlant(result.assets[0].uri);
    }
  }

  async function openGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      await scanPlant(result.assets[0].uri);
    }
  }

  async function scanPlant(uri: string) {
    if (!scanAllowed) {
      router.push('/premium');
      return;
    }
    setStep('scanning');
    setScanning(true);

    // Increment scan count
    if (!isPremium && profile) {
      const now = new Date();
      const resetDate = new Date(profile.scan_count_reset_at);
      const isSameMonth = resetDate.getMonth() === now.getMonth() &&
        resetDate.getFullYear() === now.getFullYear();
      const newCount = isSameMonth ? profile.scan_count_this_month + 1 : 1;
      await supabase
        .from('profiles')
        .update({
          scan_count_this_month: newCount,
          scan_count_reset_at: isSameMonth ? profile.scan_count_reset_at : now.toISOString(),
        })
        .eq('id', profile.id);
      await refreshProfile();
    }

    const result = await identifyPlant(uri);
    setScanning(false);

    if (isPlantIdError(result)) {
      Alert.alert('Scanningsfejl', result.message, [
        { text: 'Prøv igen', onPress: () => setStep('choose') },
        { text: 'Tilføj manuelt', onPress: () => setStep('manual') },
      ]);
      return;
    }

    // Pre-fill form with Plant.id results
    setPlantName(result.commonNames[0] ?? result.name);
    setScientificName(result.scientificName);
    setWateringInterval(String(result.wateringInterval));
    setWaterAmount(String(result.waterAmount));
    setPlantIdData(result.rawData);
    setStep('result');
  }

  async function handleSave() {
    if (!plantName.trim()) {
      Alert.alert('Fejl', 'Angiv et navn til planten.');
      return;
    }
    setSaving(true);

    // Upload image if we have one
    let imageUrl: string | null = null;
    if (imageUri && profile) {
      try {
        const ext = imageUri.split('.').pop() ?? 'jpg';
        const path = `${profile.id}/${Date.now()}.${ext}`;
        const response = await fetch(imageUri);
        const blob = await response.blob();
        console.log('Starting Supabase image upload', { path, contentType: `image/${ext}` });
        const { data, error } = await supabase.storage
          .from('plant-images')
          .upload(path, blob, { contentType: `image/${ext}` });
        console.log('Supabase upload result', { data, error });
        if (error) {
          console.warn('Supabase image upload error:', error.message);
          Alert.alert('Uploadfejl', error.message);
        }
        if (data) {
          const { data: urlData } = supabase.storage.from('plant-images').getPublicUrl(data.path);
          imageUrl = urlData.publicUrl;
        }
      } catch (e) {
        console.warn('Image upload failed:', e);
      }
      if (!imageUrl) {
        imageUrl = imageUri;
      }
      console.log('Final imageUrl for save:', imageUrl);
    }

    const interval = parseInt(wateringInterval) || 7;
    const amount = parseInt(waterAmount) || 200;
    const nextWatering = addDays(new Date(), interval);

    const err = await addPlant({
      name: plantName.trim(),
      scientific_name: scientificName.trim() || null,
      common_name: plantName.trim(),
      image_url: imageUrl,
      watering_interval_days: interval,
      water_amount_ml: amount,
      last_watered_at: null,
      next_watering_at: nextWatering.toISOString(),
      room: room || null,
      notes: notes.trim() || null,
      plant_id_data: plantIdData,
      season_spring_multiplier: 1.0,
      season_summer_multiplier: 0.8,
      season_autumn_multiplier: 1.2,
      season_winter_multiplier: 1.5,
    });

    setSaving(false);

    if (err === 'UPGRADE_REQUIRED') {
      router.replace('/premium');
      return;
    }
    if (err) {
      Alert.alert('Fejl', err);
      return;
    }
    await fetchPlants();
    await new Promise(resolve => setTimeout(resolve, 500));
    router.back();
  }

  // ── STEP: CHOOSE ────────────────────────────────────────
  if (step === 'choose') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancel}>Annuller</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tilføj plante</Text>
          <View style={{ width: 70 }} />
        </View>

        <View style={styles.chooseContent}>
          <Text style={styles.chooseTitle}>Hvordan vil du tilføje din plante?</Text>

          {/* Scan options */}
          <View style={styles.scanSection}>
            <View style={styles.scanHeader}>
              <Text style={styles.scanTitle}>🔍 AI-scanning</Text>
              {!isPremium && (
                <View style={styles.scanCounter}>
                  <Text style={styles.scanCounterText}>{scansLeft}/3 tilbage</Text>
                </View>
              )}
            </View>
            <Text style={styles.scanDesc}>
              Tag et billede af din plante, og AI identificerer den automatisk
            </Text>
            <View style={styles.scanButtons}>
              <TouchableOpacity
                style={[styles.scanBtn, !scanAllowed && styles.scanBtnDisabled]}
                onPress={openCamera}
                disabled={!scanAllowed}
              >
                <Text style={styles.scanBtnEmoji}>📷</Text>
                <Text style={styles.scanBtnText}>Kamera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.scanBtn, !scanAllowed && styles.scanBtnDisabled]}
                onPress={openGallery}
                disabled={!scanAllowed}
              >
                <Text style={styles.scanBtnEmoji}>🖼️</Text>
                <Text style={styles.scanBtnText}>Fotobibliotek</Text>
              </TouchableOpacity>
            </View>
            {!scanAllowed && (
              <TouchableOpacity onPress={() => router.push('/premium')}>
                <Text style={styles.scanLimitText}>
                  Du har brugt dine 3 gratis scanninger denne måned.{' '}
                  <Text style={styles.scanLimitLink}>Opgrader til Premium →</Text>
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Manual option */}
          <TouchableOpacity style={styles.manualBtn} onPress={() => setStep('manual')}>
            <Text style={styles.manualBtnEmoji}>✏️</Text>
            <View>
              <Text style={styles.manualBtnTitle}>Tilføj manuelt</Text>
              <Text style={styles.manualBtnSub}>Udfyld oplysningerne selv</Text>
            </View>
            <Text style={styles.manualArrow}>→</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── STEP: SCANNING ──────────────────────────────────────
  if (step === 'scanning') {
    return (
      <SafeAreaView style={[styles.safe, styles.centeredSafe]}>
        {imageUri && <Image source={{ uri: imageUri }} style={styles.scanningImage} />}
        <View style={styles.scanningOverlay}>
          <ActivityIndicator size="large" color={Colors.white} />
          <Text style={styles.scanningText}>Identificerer plante...</Text>
          <Text style={styles.scanningSubText}>AI analyserer dit billede</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── STEP: RESULT + MANUAL (shared form) ────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setStep('choose')}>
          <Text style={styles.cancel}>← Tilbage</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 'result' ? 'Bekræft plante' : 'Tilføj manuelt'}
        </Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        {/* Image preview */}
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
        ) : (
          <TouchableOpacity style={styles.imagePlaceholder} onPress={openCamera}>
            <Text style={styles.imagePlaceholderEmoji}>📷</Text>
            <Text style={styles.imagePlaceholderText}>Tilføj billede (valgfrit)</Text>
          </TouchableOpacity>
        )}

        {step === 'result' && (
          <View style={styles.aiResult}>
            <Text style={styles.aiResultLabel}>✨ AI-identificeret</Text>
            <Text style={styles.aiResultDesc}>Tjek og juster oplysningerne nedenfor</Text>
          </View>
        )}

        <View style={styles.formGroup}>
          <Input
            label="Navn"
            value={plantName}
            onChangeText={setPlantName}
            placeholder="F.eks. Monstera"
          />
          <Input
            label="Latinsk navn (valgfrit)"
            value={scientificName}
            onChangeText={setScientificName}
            placeholder="F.eks. Monstera deliciosa"
          />
        </View>

        <View style={styles.formRow}>
          <View style={{ flex: 1 }}>
            <Input
              label="Vandingsinterval (dage)"
              value={wateringInterval}
              onChangeText={setWateringInterval}
              keyboardType="number-pad"
              placeholder="7"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Vandmængde (ml)"
              value={waterAmount}
              onChangeText={setWaterAmount}
              keyboardType="number-pad"
              placeholder="200"
            />
          </View>
        </View>

        {/* Room picker */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Rum (valgfrit)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roomScroll}>
            <View style={styles.roomChips}>
              {ROOMS.map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roomChip, room === r && styles.roomChipActive]}
                  onPress={() => setRoom(room === r ? '' : r)}
                >
                  <Text style={[styles.roomChipText, room === r && styles.roomChipTextActive]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <Input
          label="Noter (valgfrit)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Særlige behov, placering..."
          multiline
          numberOfLines={3}
          style={styles.notesInput}
        />

        <Button
          title="Gem plante"
          onPress={handleSave}
          loading={saving}
          size="lg"
          style={styles.saveBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.stone[50] },
  centeredSafe: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.stone[100],
  },
  cancel: { fontSize: Typography.sizes.base, color: Colors.forest[600], fontWeight: '500' },
  headerTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '700',
    color: Colors.stone[800],
  },

  // Choose step
  chooseContent: { padding: Spacing.xl, gap: Spacing.lg },
  chooseTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '800',
    color: Colors.forest[900],
    letterSpacing: -0.5,
    marginBottom: Spacing.sm,
  },
  scanSection: {
    backgroundColor: Colors.white,
    borderRadius: Radii.xl,
    padding: Spacing.base,
    ...Shadows.sm,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  scanTitle: { fontSize: Typography.sizes.md, fontWeight: '700', color: Colors.stone[800] },
  scanCounter: {
    backgroundColor: Colors.forest[100],
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radii.full,
  },
  scanCounterText: { fontSize: Typography.sizes.xs, color: Colors.forest[700], fontWeight: '600' },
  scanDesc: {
    fontSize: Typography.sizes.sm,
    color: Colors.stone[500],
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  scanButtons: { flexDirection: 'row', gap: Spacing.sm },
  scanBtn: {
    flex: 1,
    backgroundColor: Colors.forest[600],
    borderRadius: Radii.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  scanBtnDisabled: { backgroundColor: Colors.stone[200] },
  scanBtnEmoji: { fontSize: 28 },
  scanBtnText: { fontSize: Typography.sizes.sm, fontWeight: '700', color: Colors.white },
  scanLimitText: {
    fontSize: Typography.sizes.xs,
    color: Colors.stone[400],
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  scanLimitLink: { color: Colors.forest[600], fontWeight: '700' },

  manualBtn: {
    backgroundColor: Colors.white,
    borderRadius: Radii.xl,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadows.sm,
  },
  manualBtnEmoji: { fontSize: 28 },
  manualBtnTitle: { fontSize: Typography.sizes.base, fontWeight: '700', color: Colors.stone[800] },
  manualBtnSub: { fontSize: Typography.sizes.sm, color: Colors.stone[400] },
  manualArrow: { marginLeft: 'auto', fontSize: Typography.sizes.lg, color: Colors.stone[400] },

  // Scanning step
  scanningImage: { ...StyleSheet.absoluteFillObject, opacity: 0.4 },
  scanningOverlay: { alignItems: 'center', gap: Spacing.md },
  scanningText: {
    fontSize: Typography.sizes.xl,
    fontWeight: '800',
    color: Colors.white,
  },
  scanningSubText: {
    fontSize: Typography.sizes.base,
    color: 'rgba(255,255,255,0.7)',
  },

  // Form
  formContent: { padding: Spacing.base, gap: Spacing.md, paddingBottom: Spacing['4xl'] },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: Radii.lg,
    marginBottom: Spacing.sm,
  },
  imagePlaceholder: {
    height: 120,
    backgroundColor: Colors.forest[50],
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.forest[100],
    borderStyle: 'dashed',
    gap: Spacing.xs,
  },
  imagePlaceholderEmoji: { fontSize: 32 },
  imagePlaceholderText: { fontSize: Typography.sizes.sm, color: Colors.forest[400] },

  aiResult: {
    backgroundColor: Colors.forest[50],
    borderRadius: Radii.md,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.forest[400],
  },
  aiResultLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: '700',
    color: Colors.forest[700],
  },
  aiResultDesc: { fontSize: Typography.sizes.xs, color: Colors.forest[500], marginTop: 2 },

  formGroup: { gap: Spacing.md },
  formRow: { flexDirection: 'row', gap: Spacing.sm },

  inputContainer: { gap: 6 },
  inputLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: '500',
    color: Colors.stone[700],
  },
  roomScroll: { marginTop: Spacing.xs },
  roomChips: { flexDirection: 'row', gap: Spacing.sm, paddingRight: Spacing.base },
  roomChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.stone[100],
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.stone[200],
  },
  roomChipActive: { backgroundColor: Colors.forest[600], borderColor: Colors.forest[600] },
  roomChipText: { fontSize: Typography.sizes.sm, fontWeight: '600', color: Colors.stone[600] },
  roomChipTextActive: { color: Colors.white },

  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: { marginTop: Spacing.md },
});
