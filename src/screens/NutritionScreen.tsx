import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme, Tokens } from '../context/ThemeContext';
import { PlusIcon, XIcon } from '../components/Icons';
import WaterCard from '../components/WaterCard';
import { useAppStore } from '../store/useAppStore';
import { apiFetch, getSessionToken, hasRealSession } from '../lib/api';
import { localDateKey } from '../lib/date';

// ── Types ─────────────────────────────────────────────────────────────────────

type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snacks';
type AddTab = 'search' | 'scan' | 'manual';

interface ViaxeFood {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  serving_size: number;
  serving_unit: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fibre_per_100g: number | null;
  source: string;
  verified: boolean;
}

interface FoodLog {
  id: string;
  name: string;
  brand?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
  quantity: number;
  meal: Meal;
  date: string;
}

interface FoodDraft {
  name: string;
  brand: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  servingUnit: string;
  isManual: boolean;
  defaultGrams: number;
  manualCalories?: number;
  manualProtein?: number;
  manualCarbs?: number;
  manualFat?: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MEALS: Meal[] = ['breakfast', 'lunch', 'dinner', 'snacks'];
const MEAL_LABELS: Record<Meal, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks' };

const todayStr = () => localDateKey();
const cacheKey = (d: string) => `@viaxe_food_v1_${d}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function isDemo(): Promise<boolean> {
  return !(await hasRealSession());
}

function viaxeFoodToDraft(f: ViaxeFood): FoodDraft {
  return {
    name: f.name,
    brand: f.brand || '',
    caloriesPer100g: f.calories_per_100g,
    proteinPer100g:  f.protein_per_100g,
    carbsPer100g:    f.carbs_per_100g,
    fatPer100g:      f.fat_per_100g,
    servingUnit:     f.serving_unit || 'g',
    isManual:        false,
    defaultGrams:    f.serving_size || 100,
  };
}

function offToDraft(p: any): FoodDraft | null {
  if (!p?.product_name) return null;
  const n = p.nutriments || {};
  const cal = n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0;
  if (!cal) return null;
  const lang = p.lang || p.lc || '';
  if (lang && !['en', 'en-gb', 'en-us', ''].includes(lang.toLowerCase())) return null;
  return {
    name:            p.product_name,
    brand:           p.brands ? p.brands.split(',')[0].trim() : '',
    caloriesPer100g: Math.round(cal),
    proteinPer100g:  Math.round(n.proteins_100g ?? 0),
    carbsPer100g:    Math.round(n.carbohydrates_100g ?? 0),
    fatPer100g:      Math.round(n.fat_100g ?? 0),
    servingUnit:     'g',
    isManual:        false,
    defaultGrams:    100,
  };
}

function computeMacros(draft: FoodDraft, grams: number) {
  if (draft.isManual) {
    return { calories: draft.manualCalories ?? 0, protein: draft.manualProtein ?? 0, carbs: draft.manualCarbs ?? 0, fat: draft.manualFat ?? 0 };
  }
  const r = grams / 100;
  return {
    calories: Math.round(draft.caloriesPer100g * r),
    protein:  Math.round(draft.proteinPer100g  * r),
    carbs:    Math.round(draft.carbsPer100g    * r),
    fat:      Math.round(draft.fatPer100g      * r),
  };
}

// ── MacroBar ──────────────────────────────────────────────────────────────────

function MacroBar({ label, val, target, color, t }: { label: string; val: number; target: number; color: string; t: Tokens }) {
  const pct = Math.min(val / Math.max(target, 1), 1);
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: t.textSec, letterSpacing: 0.5 }}>{label}</Text>
        <Text style={{ fontSize: 10, fontWeight: '700', color: t.text }}>{val}<Text style={{ color: t.textMuted }}>/{target}g</Text></Text>
      </View>
      <View style={{ height: 5, backgroundColor: t.border, borderRadius: 3 }}>
        <View style={{ height: 5, width: `${Math.round(pct * 100)}%` as any, backgroundColor: color, borderRadius: 3 }} />
      </View>
    </View>
  );
}

// ── ConfirmView ───────────────────────────────────────────────────────────────

function ConfirmView({ draft, grams, onGramsChange, meal, onMealChange, macros, saving, error, onLog, onBack, onClose, s, t }: {
  draft: FoodDraft; grams: string; onGramsChange: (g: string) => void;
  meal: Meal; onMealChange: (m: Meal) => void;
  macros: { calories: number; protein: number; carbs: number; fat: number };
  saving: boolean; error?: string | null; onLog: () => void; onBack: () => void; onClose: () => void;
  s: ReturnType<typeof makeStyles>; t: Tokens;
}) {
  return (
    <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
      <View style={[s.sheetHdr, { paddingBottom: 8 }]}>
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 12 }}>
          <Text style={{ color: t.red, fontSize: 14, fontWeight: '700' }}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose}><XIcon size={20} color={t.textSec} /></TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        <Text style={s.confirmName} numberOfLines={2}>{draft.name}</Text>
        {draft.brand ? <Text style={s.confirmBrand}>{draft.brand}</Text> : null}

        <View style={s.macroRow}>
          {([
            { label: 'KCAL', val: macros.calories, color: t.text },
            { label: 'P',    val: macros.protein,  color: t.red },
            { label: 'C',    val: macros.carbs,    color: t.purple },
            { label: 'F',    val: macros.fat,       color: t.gold },
          ] as const).map(({ label, val, color }) => (
            <View key={label} style={s.macroCell}>
              <Text style={[s.macroCellVal, { color }]}>{val}</Text>
              <Text style={s.macroCellLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {!draft.isManual && (
          <>
            <Text style={s.fldLabel}>AMOUNT (g)</Text>
            <TextInput
              style={s.fldInput} keyboardType="decimal-pad"
              value={grams} onChangeText={onGramsChange}
              placeholder="100" placeholderTextColor={t.textMuted} selectTextOnFocus
            />
            <Text style={{ fontSize: 10, color: t.textMuted, marginTop: 4 }}>
              Per 100g: {draft.caloriesPer100g} kcal · {draft.proteinPer100g}P · {draft.carbsPer100g}C · {draft.fatPer100g}F
            </Text>
          </>
        )}

        <Text style={[s.fldLabel, { marginTop: 20 }]}>MEAL</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {MEALS.map(m => (
            <TouchableOpacity key={m} style={[s.mealChip, meal === m && s.mealChipActive]} onPress={() => onMealChange(m)}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: meal === m ? '#fff' : t.textSec }}>
                {MEAL_LABELS[m]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? (
          <View style={s.errBanner}><Text style={s.errBannerTxt}>{error}</Text></View>
        ) : null}

        <TouchableOpacity style={[s.logBtn, { marginTop: error ? 12 : 24 }]} onPress={onLog} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.logBtnTxt}>LOG FOOD</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const makeStyles = (t: Tokens) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  hdr:  { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 0 },
  hero: { fontFamily: 'BarlowCondensed-Black', fontSize: 50, lineHeight: 44, color: t.text, letterSpacing: -0.8, textTransform: 'uppercase', marginTop: 2 },
  date:  { fontFamily: 'IBMPlexSans-Bold', fontSize: 11, color: t.textSec, letterSpacing: 1.2 },

  calCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: t.surface, marginHorizontal: 20, marginTop: 20, borderRadius: 4, padding: 18 },
  calVal:   { fontFamily: 'BarlowCondensed-Black', fontSize: 44, lineHeight: 42, color: t.text, letterSpacing: -1 },
  calLabel: { fontSize: 9, fontWeight: '700', color: t.textMuted, letterSpacing: 1.5 },
  macroCard: { backgroundColor: t.surface, marginHorizontal: 20, marginTop: 12, borderRadius: 4, padding: 18 },

  mealSection: { marginHorizontal: 20, marginTop: 12, backgroundColor: t.surface, borderRadius: 4, padding: 16 },
  mealHdr:  { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  mealTitle: { fontFamily: 'IBMPlexSans-Bold', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: t.textSec },
  mealCal:  { fontSize: 11, color: t.textMuted, marginLeft: 8 },
  addBtn:   { marginLeft: 'auto', width: 30, height: 30, borderRadius: 3, backgroundColor: t.green, alignItems: 'center', justifyContent: 'center' },
  emptyTxt: { fontSize: 12, color: t.textMuted, fontStyle: 'italic' },

  foodRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderTopWidth: 1, borderTopColor: t.border },
  foodName:   { fontSize: 13, color: t.text, fontWeight: '600' },
  foodBrand:  { fontSize: 10, color: t.textMuted, marginTop: 1 },
  foodMacros: { fontSize: 11, color: t.textMuted, marginTop: 2 },
  foodCal:    { fontSize: 15, fontWeight: '800', color: t.text },

  sheet:     { backgroundColor: t.bg2, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%' as any, overflow: 'hidden' },
  sheetHdr:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 14 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: t.text },

  tabBar:      { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  tabBtn:      { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassBorder, alignItems: 'center' },
  tabBtnActive: { backgroundColor: t.redDim, borderColor: t.redBorder },
  tabTxt:      { fontSize: 12, fontWeight: '700', color: t.textSec },
  tabTxtActive: { color: t.red },

  inputRow:  { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  textInput: { backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: t.text },
  goBtn:     { backgroundColor: t.red, borderRadius: 10, paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center' },

  resultRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: t.border },
  resultName:   { fontSize: 13, color: t.text, fontWeight: '600', marginBottom: 2 },
  resultBrand:  { fontSize: 10, color: t.textSec, marginBottom: 3 },
  resultMacros: { fontSize: 10, color: t.textMuted },
  resultCal:    { fontSize: 18, fontWeight: '900', color: t.text },
  verifiedBadge: { backgroundColor: 'rgba(52,199,89,0.15)', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },

  cameraBox:   { height: 200, margin: 16, borderRadius: 12, backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassBorder, alignItems: 'center', justifyContent: 'center' },
  scanOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
  viewfinder:  { position: 'absolute', top: '20%', left: '15%', right: '15%', bottom: '20%' },
  vfCorner:    { position: 'absolute', width: 20, height: 20, borderColor: t.red },
  permBtn:     { paddingHorizontal: 20, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: t.redBorder, backgroundColor: t.redDim },

  msgTxt:   { fontSize: 12, color: t.textMuted, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  fldLabel: { fontSize: 9, fontWeight: '700', color: t.textMuted, letterSpacing: 1.5, marginBottom: 6, marginTop: 12 },
  fldInput: { backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: t.text },
  logBtn:    { backgroundColor: t.green, borderRadius: 3, paddingVertical: 16, alignItems: 'center' },
  logBtnTxt: { fontFamily: 'IBMPlexSans-Bold', fontSize: 12, color: '#171714', letterSpacing: 1.2, textTransform: 'uppercase' },
  errBanner:    { backgroundColor: t.redDim, borderColor: t.redBorder, borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  errBannerTxt: { color: t.red, fontSize: 12.5, fontWeight: '600', textAlign: 'center', lineHeight: 17 },

  confirmName:   { fontSize: 20, fontWeight: '900', color: t.text, letterSpacing: -0.3, marginBottom: 4 },
  confirmBrand:  { fontSize: 12, color: t.textMuted, marginBottom: 16 },
  macroRow:      { flexDirection: 'row', gap: 8, marginBottom: 12 },
  macroCell:     { flex: 1, backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassBorder, borderRadius: 12, padding: 12, alignItems: 'center' },
  macroCellVal:  { fontSize: 20, fontWeight: '900' },
  macroCellLabel: { fontSize: 9, fontWeight: '700', color: t.textMuted, letterSpacing: 1, marginTop: 2 },
  mealChip:      { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassBorder },
  mealChipActive: { backgroundColor: t.redDim, borderColor: t.redBorder },
});

// ── NutritionScreen ───────────────────────────────────────────────────────────

export default function NutritionScreen() {
  const store = useAppStore();
  const { t } = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const TARGETS = store.macroTargets;
  const date = todayStr();

  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loadingDiary, setLoadingDiary] = useState(true);

  const [addMeal, setAddMeal]       = useState<Meal | null>(null);
  const [tab, setTab]               = useState<AddTab>('search');
  const [draft, setDraft]           = useState<FoodDraft | null>(null);
  const [draftGrams, setDraftGrams] = useState('100');
  const [draftMeal, setDraftMeal]   = useState<Meal>('breakfast');
  const [saving, setSaving]         = useState(false);
  const [logError, setLogError]     = useState<string | null>(null);

  const [searchQ, setSearchQ]               = useState('');
  const [searchResults, setSearchResults]   = useState<ViaxeFood[]>([]);
  const [searchLoading, setSearchLoading]   = useState(false);
  const [searchMsg, setSearchMsg]           = useState('');

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned]       = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanMsg, setScanMsg]       = useState('');

  const [mf, setMf] = useState({ name: '', brand: '', calories: '', protein: '', carbs: '', fat: '', grams: '100', unit: 'g' });

  // ── Load diary ────────────────────────────────────────────────────────────────
  const loadDiary = useCallback(async () => {
    setLoadingDiary(true);
    try {
      const demo = await isDemo();
      const cached = await AsyncStorage.getItem(cacheKey(date));
      if (cached) setLogs(JSON.parse(cached));

      if (!demo) {
        const res = await apiFetch(`/nutrition?date=${encodeURIComponent(date)}`);
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs || []);
          await AsyncStorage.setItem(cacheKey(date), JSON.stringify(data.logs || []));
        }
      }
    } catch {}
    setLoadingDiary(false);
  }, [date]);

  useEffect(() => { loadDiary(); }, []);

  // ── Log food ──────────────────────────────────────────────────────────────────
  const logFood = useCallback(async (d: FoodDraft, grams: number, meal: Meal) => {
    const macros = computeMacros(d, grams);
    const payload = {
      date, meal,
      name: d.name.trim(),
      brand: d.brand?.trim() || null,
      calories: macros.calories, protein: macros.protein, carbs: macros.carbs, fat: macros.fat,
      servingSize: grams, servingUnit: d.servingUnit || 'g', quantity: 1,
    };
    setSaving(true);
    setLogError(null);
    try {
      const demo = await isDemo();
      if (demo) {
        const entry: FoodLog = { ...payload, id: Date.now().toString() };
        const updated = [...logs, entry];
        setLogs(updated);
        await AsyncStorage.setItem(cacheKey(date), JSON.stringify(updated));
        setSaving(false);
        closeModal();
        return;
      }
      const res = await apiFetch('/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        const entry: FoodLog = { ...payload, id: data.id };
        const updated = [...logs, entry];
        setLogs(updated);
        await AsyncStorage.setItem(cacheKey(date), JSON.stringify(updated));
        setSaving(false);
        closeModal();
        return;
      }
      // Non-OK response — surface it instead of silently doing nothing, and keep
      // the sheet open so the entry the user typed isn't lost.
      if (res.status === 401) {
        setLogError('Your session has expired — signing you out to log back in.');
      } else {
        setLogError(`Couldn't save this food (error ${res.status}). Please try again.`);
      }
    } catch {
      setLogError('No connection — food not saved. Check your internet and try again.');
    }
    setSaving(false);
  }, [logs, date]);

  // ── Delete food ───────────────────────────────────────────────────────────────
  const deleteFood = useCallback(async (id: string) => {
    const demo = await isDemo();
    if (!demo) {
      try {
        const res = await apiFetch(`/nutrition?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (!res.ok) return;
      } catch {
        return;
      }
    }
    const updated = logs.filter(l => l.id !== id);
    setLogs(updated);
    await AsyncStorage.setItem(cacheKey(date), JSON.stringify(updated));
  }, [logs, date]);

  // ── Recents: shown before the user types — last week's foods are today's ─────
  const loadRecents = useCallback(async () => {
    try {
      const token = await getSessionToken();
      if (!token || token === 'demo') return;
      const res = await apiFetch('/foods?recent=1');
      if (res.ok) {
        const data = await res.json();
        const foods: ViaxeFood[] = data.foods || [];
        if (foods.length) {
          setSearchResults(foods);
          setSearchMsg('RECENT — foods you logged before');
        }
      }
    } catch {}
  }, []);

  // ── Search ────────────────────────────────────────────────────────────────────
  const runSearch = useCallback(async () => {
    if (!searchQ.trim()) return;
    setSearchLoading(true);
    setSearchMsg('');
    setSearchResults([]);
    try {
      const q = encodeURIComponent(searchQ.trim());

      // Primary: Viaxe Food Graph federated search (canonical + legacy, UK-first,
      // verification-ranked). Returns the same per-100g fields the rows read.
      let foods: ViaxeFood[] = [];
      let ok = false;
      const res = await apiFetch(`/foods?action=fg-search&q=${q}`);
      if (res.status === 401) { setSearchMsg('Session expired — sign in again.'); setSearchLoading(false); return; }
      if (res.ok) { const data = await res.json(); foods = data.results || []; ok = true; }

      // Fallback: legacy search if the Food Graph is unavailable or empty, so the
      // screen never regresses versus the previous behaviour.
      if (!ok || foods.length === 0) {
        const legacy = await apiFetch(`/foods?q=${q}`);
        if (legacy.status === 401) { setSearchMsg('Session expired — sign in again.'); setSearchLoading(false); return; }
        if (legacy.ok) { const d = await legacy.json(); const lf = d.foods || []; if (lf.length || !ok) { foods = lf; ok = true; } }
      }

      if (ok) {
        setSearchResults(foods);
        if (!foods.length) setSearchMsg('No results found. Try "manual" to add a custom food.');
      } else {
        setSearchMsg('Search unavailable. Try manual entry.');
      }
    } catch {
      setSearchMsg('Search failed. Check your connection.');
    }
    setSearchLoading(false);
  }, [searchQ]);

  // ── Barcode lookup ────────────────────────────────────────────────────────────
  const lookupBarcode = useCallback(async (barcode: string) => {
    if (!barcode.trim()) return;
    setScanLoading(true);
    setScanMsg('');
    try {
      const encodedBarcode = encodeURIComponent(barcode.trim());
      const internal = await apiFetch(`/foods?barcode=${encodedBarcode}`);
      if (internal.ok) {
        const data = await internal.json();
        if (data.found && data.food) {
          setDraft(viaxeFoodToDraft(data.food));
          setDraftGrams(String(data.food.serving_size || 100));
          setDraftMeal(addMeal ?? 'breakfast');
          setScanLoading(false);
          return;
        }
      }

      const off = await apiFetch(`https://world.openfoodfacts.org/api/v0/product/${encodedBarcode}.json`, {}, { auth: false });
      if (off.ok) {
        const data = await off.json();
        if (data.status === 1 && data.product) {
          const d = offToDraft(data.product);
          if (d) {
            setDraft(d);
            setDraftGrams('100');
            setDraftMeal(addMeal ?? 'breakfast');
            setScanLoading(false);
            return;
          }
        }
      }

      setScanMsg('Product not found. Switch to Manual to enter details.');
    } catch {
      setScanMsg('Lookup failed. Check your connection.');
    }
    setScanLoading(false);
    setScanned(false);
  }, [addMeal]);

  const handleBarcodeScan = useCallback(({ data }: { data: string }) => {
    if (scanned || scanLoading) return;
    setScanned(true);
    lookupBarcode(data);
  }, [scanned, scanLoading, lookupBarcode]);

  // ── Modal helpers ─────────────────────────────────────────────────────────────
  const openModal = (meal: Meal) => {
    setAddMeal(meal); setTab('search'); setDraft(null); setLogError(null);
    setSearchQ(''); setSearchResults([]); setSearchMsg('');
    setManualBarcode(''); setScanMsg(''); setScanned(false); setScanLoading(false);
    setMf({ name: '', brand: '', calories: '', protein: '', carbs: '', fat: '', grams: '100', unit: 'g' });
    loadRecents();
  };
  const closeModal = () => { setAddMeal(null); setDraft(null); };

  const selectFood = (f: ViaxeFood) => {
    setDraft(viaxeFoodToDraft(f));
    setDraftGrams(String(f.serving_size || 100));
    setDraftMeal(addMeal ?? 'breakfast');
  };

  const submitManual = () => {
    if (!mf.name.trim() || !mf.calories) return;
    const d: FoodDraft = {
      name: mf.name, brand: mf.brand,
      caloriesPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0,
      servingUnit: mf.unit || 'g', isManual: true,
      // Clamp to non-negative — a negative macro/gram would corrupt daily totals.
      defaultGrams: Math.max(1, parseFloat(mf.grams) || 100),
      manualCalories: Math.max(0, parseFloat(mf.calories) || 0),
      manualProtein:  Math.max(0, parseFloat(mf.protein)  || 0),
      manualCarbs:    Math.max(0, parseFloat(mf.carbs)    || 0),
      manualFat:      Math.max(0, parseFloat(mf.fat)      || 0),
    };
    logFood(d, d.defaultGrams, addMeal ?? 'breakfast');
  };

  // ── Computed ──────────────────────────────────────────────────────────────────
  const todayLogs = logs.filter(l => l.date === date);
  const totals = todayLogs.reduce(
    (acc, l) => ({ calories: acc.calories + l.calories, protein: acc.protein + l.protein, carbs: acc.carbs + l.carbs, fat: acc.fat + l.fat }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const calPct    = Math.min(totals.calories / Math.max(TARGETS.calories, 1), 1);
  const calRemain = Math.max(TARGETS.calories - totals.calories, 0);
  const confirmGrams  = parseFloat(draftGrams) || 0;
  const confirmMacros = draft ? computeMacros(draft, confirmGrams) : { calories: 0, protein: 0, carbs: 0, fat: 0 };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView edges={['top']} style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={s.hdr}>
          <Text style={s.date}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase()}</Text>
          <Text style={s.hero}>FUEL THE{'\n'}<Text style={{ color: t.green }}>WORK.</Text></Text>
        </View>

        <View style={s.calCard}>
          <View style={{ flex: 1 }}>
            <Text style={s.calVal}>{loadingDiary ? '—' : totals.calories.toLocaleString()}</Text>
            <Text style={s.calLabel}>KCAL EATEN</Text>
            <View style={{ height: 6, backgroundColor: t.border, borderRadius: 3, marginTop: 10 }}>
              <View style={{ height: 6, width: `${Math.round(calPct * 100)}%` as any, backgroundColor: calPct >= 1 ? t.red : t.green, borderRadius: 3 }} />
            </View>
            <Text style={{ fontSize: 11, color: t.textMuted, marginTop: 5 }}>
              {loadingDiary ? 'Loading…' : calRemain > 0 ? `${calRemain} kcal remaining` : 'Daily target reached'}
            </Text>
          </View>
          <View style={{ alignItems: 'center', paddingLeft: 16, borderLeftWidth: 1, borderLeftColor: t.border }}>
            <Text style={{ fontFamily: 'BarlowCondensed-Black', fontSize: 32, color: t.text }}>{TARGETS.calories}</Text>
            <Text style={{ fontSize: 9, fontWeight: '700', color: t.textMuted, letterSpacing: 1 }}>TARGET</Text>
          </View>
        </View>

        <View style={s.macroCard}>
          <View style={{ gap: 12 }}>
            <MacroBar label="PROTEIN" val={totals.protein} target={TARGETS.protein} color={totals.protein >= TARGETS.protein ? t.green : t.text} t={t} />
            <MacroBar label="CARBS"   val={totals.carbs}   target={TARGETS.carbs}   color={totals.carbs >= TARGETS.carbs ? t.green : t.text} t={t} />
            <MacroBar label="FAT"     val={totals.fat}     target={TARGETS.fat}     color={totals.fat >= TARGETS.fat ? t.green : t.text} t={t} />
          </View>
        </View>

        <WaterCard />

        {MEALS.map(meal => {
          const mealLogs = todayLogs.filter(l => l.meal === meal);
          const mealCal  = mealLogs.reduce((acc, l) => acc + l.calories, 0);
          return (
            <View key={meal} style={s.mealSection}>
              <View style={s.mealHdr}>
                <Text style={s.mealTitle}>{MEAL_LABELS[meal]}</Text>
                {mealCal > 0 && <Text style={s.mealCal}>{mealCal} kcal</Text>}
                <TouchableOpacity style={s.addBtn} onPress={() => openModal(meal)}>
                  <PlusIcon size={16} color="#171714" strokeWidth={2.8} />
                </TouchableOpacity>
              </View>

              {mealLogs.length === 0
                ? <Text style={s.emptyTxt}>Nothing logged yet</Text>
                : mealLogs.map(l => (
                  <View key={l.id} style={s.foodRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.foodName} numberOfLines={1}>{l.name}</Text>
                      {l.brand ? <Text style={s.foodBrand} numberOfLines={1}>{l.brand}</Text> : null}
                      <Text style={s.foodMacros}>{l.protein}g P · {l.carbs}g C · {l.fat}g F · {l.servingSize}{l.servingUnit}</Text>
                    </View>
                    <Text style={s.foodCal}>{l.calories}</Text>
                    <TouchableOpacity onPress={() => deleteFood(l.id)} style={{ padding: 6, marginLeft: 8 }}>
                      <XIcon size={14} color={t.textMuted} strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                ))
              }
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add food modal */}
      <Modal visible={addMeal !== null} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeModal} />
            <View style={s.sheet}>

              {draft ? (
                <ConfirmView
                  draft={draft} grams={draftGrams} onGramsChange={setDraftGrams}
                  meal={draftMeal} onMealChange={setDraftMeal} macros={confirmMacros}
                  saving={saving}
                  error={logError}
                  onLog={() => logFood(draft, confirmGrams, draftMeal)}
                  onBack={() => setDraft(null)} onClose={closeModal}
                  s={s} t={t}
                />
              ) : (
                <View style={{ flex: 1 }}>
                  <View style={s.sheetHdr}>
                    <Text style={s.sheetTitle}>Add to {MEAL_LABELS[addMeal ?? 'breakfast']}</Text>
                    <TouchableOpacity onPress={closeModal}><XIcon size={20} color={t.textSec} /></TouchableOpacity>
                  </View>

                  <View style={s.tabBar}>
                    {(['search', 'scan', 'manual'] as AddTab[]).map(tb => (
                      <TouchableOpacity key={tb} style={[s.tabBtn, tab === tb && s.tabBtnActive]} onPress={() => setTab(tb)}>
                        <Text style={[s.tabTxt, tab === tb && s.tabTxtActive]}>
                          {tb === 'search' ? 'Search' : tb === 'scan' ? 'Barcode' : 'Manual'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* ── Search tab ── */}
                  {tab === 'search' && (
                    <View style={{ flex: 1 }}>
                      <View style={s.inputRow}>
                        <TextInput
                          style={[s.textInput, { flex: 1 }]}
                          placeholder="Search Viaxe food database..."
                          placeholderTextColor={t.textMuted}
                          value={searchQ} onChangeText={setSearchQ}
                          returnKeyType="search" onSubmitEditing={runSearch} autoFocus
                        />
                        <TouchableOpacity style={s.goBtn} onPress={runSearch}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Go</Text>
                        </TouchableOpacity>
                      </View>

                      {searchLoading && (
                        <View style={{ padding: 24, alignItems: 'center' }}>
                          <ActivityIndicator color={t.red} />
                          <Text style={{ color: t.textMuted, marginTop: 8, fontSize: 12 }}>Searching...</Text>
                        </View>
                      )}
                      {!!searchMsg && !searchLoading && <Text style={s.msgTxt}>{searchMsg}</Text>}
                      {!searchQ.trim() && !searchLoading && !searchMsg && (
                        <Text style={[s.msgTxt, { fontStyle: 'italic' }]}>
                          Search 380+ UK foods — supermarket brands, takeaways, whole foods…
                        </Text>
                      )}

                      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
                        {searchResults.map(f => (
                          <TouchableOpacity key={f.id} style={s.resultRow} onPress={() => selectFood(f)}>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={s.resultName} numberOfLines={1}>{f.name}</Text>
                                {f.verified && (
                                  <View style={s.verifiedBadge}>
                                    <Text style={{ fontSize: 8, fontWeight: '700', color: t.green }}>✓</Text>
                                  </View>
                                )}
                              </View>
                              {f.brand ? <Text style={s.resultBrand} numberOfLines={1}>{f.brand}</Text> : null}
                              <Text style={s.resultMacros}>
                                {f.protein_per_100g}g P · {f.carbs_per_100g}g C · {f.fat_per_100g}g F · per 100g
                              </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={s.resultCal}>{f.calories_per_100g}</Text>
                              <Text style={{ fontSize: 9, color: t.textMuted }}>kcal/100g</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* ── Scan tab ── */}
                  {tab === 'scan' && (
                    <View style={{ flex: 1 }}>
                      {!permission?.granted ? (
                        <View style={s.cameraBox}>
                          <Text style={{ color: t.textSec, marginBottom: 12, textAlign: 'center', fontSize: 13 }}>Camera access needed to scan barcodes</Text>
                          <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
                            <Text style={{ color: t.red, fontWeight: '700', fontSize: 13 }}>Allow Camera</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={[s.cameraBox, { backgroundColor: '#000', overflow: 'hidden' }]}>
                          <CameraView
                            style={{ flex: 1 }} facing="back"
                            onBarcodeScanned={handleBarcodeScan}
                            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'] }}
                          />
                          {(scanned || scanLoading) && (
                            <View style={s.scanOverlay}>
                              <ActivityIndicator color={t.red} size="large" />
                              <Text style={{ color: t.text, marginTop: 10, fontSize: 13 }}>Looking up barcode...</Text>
                            </View>
                          )}
                          {!scanned && !scanLoading && (
                            <View style={s.viewfinder}>
                              <View style={[s.vfCorner, { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 }]} />
                              <View style={[s.vfCorner, { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 }]} />
                              <View style={[s.vfCorner, { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 }]} />
                              <View style={[s.vfCorner, { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 }]} />
                            </View>
                          )}
                        </View>
                      )}

                      {!!scanMsg && <Text style={[s.msgTxt, { color: t.gold }]}>{scanMsg}</Text>}

                      <View style={{ padding: 16, paddingTop: 10 }}>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: t.textMuted, letterSpacing: 1.5, marginBottom: 8 }}>
                          OR ENTER BARCODE MANUALLY
                        </Text>
                        <View style={s.inputRow}>
                          <TextInput
                            style={[s.textInput, { flex: 1 }]} keyboardType="number-pad"
                            placeholder="e.g. 5000159484695" placeholderTextColor={t.textMuted}
                            value={manualBarcode} onChangeText={setManualBarcode}
                            returnKeyType="search" onSubmitEditing={() => lookupBarcode(manualBarcode)}
                          />
                          <TouchableOpacity style={s.goBtn} onPress={() => lookupBarcode(manualBarcode)}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Go</Text>
                          </TouchableOpacity>
                        </View>
                        {scanned && (
                          <TouchableOpacity onPress={() => { setScanned(false); setScanMsg(''); setManualBarcode(''); }} style={{ marginTop: 10 }}>
                            <Text style={{ color: t.red, fontSize: 13, fontWeight: '600' }}>Scan again</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}

                  {/* ── Manual tab ── */}
                  {tab === 'manual' && (
                    <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
                      <View style={{ padding: 16, paddingBottom: 40 }}>
                        <Text style={s.fldLabel}>FOOD NAME *</Text>
                        <TextInput style={s.fldInput} placeholder="e.g. Chicken Breast" placeholderTextColor={t.textMuted}
                          value={mf.name} onChangeText={v => setMf(f => ({ ...f, name: v }))} autoFocus />

                        <Text style={s.fldLabel}>BRAND (optional)</Text>
                        <TextInput style={s.fldInput} placeholder="e.g. Tesco" placeholderTextColor={t.textMuted}
                          value={mf.brand} onChangeText={v => setMf(f => ({ ...f, brand: v }))} />

                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <View style={{ flex: 2 }}>
                            <Text style={s.fldLabel}>SERVING SIZE *</Text>
                            <TextInput style={s.fldInput} placeholder="100" placeholderTextColor={t.textMuted}
                              keyboardType="decimal-pad" value={mf.grams} onChangeText={v => setMf(f => ({ ...f, grams: v }))} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.fldLabel}>UNIT</Text>
                            <TextInput style={s.fldInput} placeholder="g" placeholderTextColor={t.textMuted}
                              value={mf.unit} onChangeText={v => setMf(f => ({ ...f, unit: v }))} />
                          </View>
                        </View>

                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                          {([['calories', 'CALORIES *'], ['protein', 'PROTEIN (g)'], ['carbs', 'CARBS (g)'], ['fat', 'FAT (g)']] as const).map(([key, lbl]) => (
                            <View key={key} style={{ width: '47%' }}>
                              <Text style={s.fldLabel}>{lbl}</Text>
                              <TextInput
                                style={[s.fldInput, { textAlign: 'center' }]} keyboardType="decimal-pad"
                                placeholder="0" placeholderTextColor={t.textMuted}
                                value={mf[key]} onChangeText={v => setMf(f => ({ ...f, [key]: v }))}
                              />
                            </View>
                          ))}
                        </View>

                        {logError ? (
                          <View style={[s.errBanner, { marginTop: 16 }]}><Text style={s.errBannerTxt}>{logError}</Text></View>
                        ) : null}

                        <TouchableOpacity
                          style={[s.logBtn, { marginTop: logError ? 12 : 20 }, (!mf.name.trim() || !mf.calories) && { opacity: 0.4 }]}
                          onPress={submitManual} disabled={!mf.name.trim() || !mf.calories || saving}
                        >
                          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.logBtnTxt}>LOG FOOD</Text>}
                        </TouchableOpacity>
                      </View>
                    </ScrollView>
                  )}
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
