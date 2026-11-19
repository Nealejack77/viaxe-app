// VIAXE — complete a scheduled v2 prescription with actual splits. Pins the
// result to the exact prescription revision it was performed against
// (prescriptionRef), so a later plan edit can never rewrite what this
// result says happened.

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, radii, type as T } from '../theme/grit';
import { GritText, GritButton } from '../components/grit';
import PressableScale from '../components/motion/PressableScale';
import { SessionBlockEditor, BlockActuals } from '../components/SessionBlocks';
import { completeV2Session } from '../lib/scheduleV2';
import { localDateKey } from '../lib/date';
import type { V2Block, V2Prescription, V2Set } from '../types/sessionV2';

// strokeType is categorical (a string enum), not a NUMBER()-coercible
// measure — it must never go through resolveMeasure, which would silently
// drop it the moment it's left untouched ("freestyle" is not Number.isFinite).
// There is no UI to edit it yet, so it is always carried through unedited.
const NON_MEASURE_KEYS = new Set(['index', 'kind', 'modality', 'name', 'notes', 'sets', 'repeats', 'strokeType']);

/** One measure field, edited-or-planned-or-cleared — the same rule everywhere. */
function resolveMeasure(raw: string | undefined, planned: number | null | undefined): number | null | undefined {
  if (raw === '') return undefined;                      // explicitly cleared -> omit (not measured)
  const n = raw !== undefined ? Number(raw) : planned;    // edited or fall back to planned
  return (n === null || Number.isFinite(n)) ? n : undefined;
}

function carryStrokeType(block: V2Block, planned: V2Block) {
  if (planned.strokeType !== undefined) block.strokeType = planned.strokeType;
}

/**
 * Strength sets: reps (or a timed/distance measure), load, and an explicit
 * bodyweight toggle — never an inferred bodyweight from an absent load.
 * SessionBlockEditor's SetEditor writes `set{i}.reps` / `set{i}.durationSec`
 * / `set{i}.distanceM` / `set{i}.weightKg` / `set{i}.bodyweight` ('1' | '').
 */
function buildActualSets(plannedSets: V2Set[], edited: Record<string, string>): V2Set[] {
  return plannedSets.map((s, i) => {
    const bwRaw = edited[`set${i}.bodyweight`];
    const bodyweight = bwRaw !== undefined ? bwRaw === '1' : !!s.bodyweight;
    const out: V2Set = { setNumber: s.setNumber, reps: null };

    // A set is rep-counted, OR timed, OR distance-based — never more than
    // one (session-schema.js's mutual-exclusivity rule). Which measure this
    // set uses is fixed by the PLANNED set's own shape, never guessed here.
    if (s.durationSec != null) {
      const durationSec = resolveMeasure(edited[`set${i}.durationSec`], s.durationSec);
      if (durationSec !== undefined) out.durationSec = durationSec;
    } else if (s.distanceM != null) {
      const distanceM = resolveMeasure(edited[`set${i}.distanceM`], s.distanceM);
      if (distanceM !== undefined) out.distanceM = distanceM;
    } else {
      const reps = resolveMeasure(edited[`set${i}.reps`], s.reps);
      out.reps = reps === undefined ? null : reps;
    }
    if (s.perSide) out.perSide = true;   // an orthogonal modifier, not something the athlete edits per completion

    // Bodyweight PLUS an added load ("BW+10kg" weighted pull-ups) is a real,
    // distinct prescription — toggling bodyweight on must never zero an
    // already-planned or athlete-edited load; it only defaults to 0 (the
    // schema's explicit flag for "no external load") when there genuinely
    // is none.
    const weightKg = resolveMeasure(edited[`set${i}.weightKg`], s.weightKg);
    if (bodyweight) {
      out.bodyweight = true;
      out.weightKg = weightKg !== undefined ? weightKg : 0;
    } else if (weightKg !== undefined) {
      out.weightKg = weightKg;
    }
    if (s.rpe !== undefined) out.rpe = s.rpe;   // no RPE input yet — carried through unedited
    return out;
  });
}

/** One side (work or recovery) of a repeats block, edited the same way a plain block is. */
function buildActualSide(planned: V2Block, edited: Record<string, string>, prefix: string): V2Block {
  const block: V2Block = { index: planned.index, kind: planned.kind, modality: planned.modality, name: planned.name };
  carryStrokeType(block, planned);
  for (const key of Object.keys(planned)) {
    if (NON_MEASURE_KEYS.has(key) || (planned as any)[key] === undefined) continue;
    const n = resolveMeasure(edited[`${prefix}.${key}`], (planned as any)[key]);
    if (n !== undefined) (block as any)[key] = n;
  }
  return block;
}

/**
 * Merge the athlete's edited values onto the planned block shape. For each
 * measure the planned block carries:
 *   - edited to a number  -> that number (the real actual)
 *   - edited to ''        -> explicitly cleared; omitted (not measured)
 *   - never touched       -> the PLANNED value is kept as the starting
 *     actual (SessionBlockEditor pre-fills the input with it, so this is
 *     what the athlete implicitly confirmed by not changing it)
 * A measure the PLANNED block never had is never invented here. Strength
 * sets and a repeats block's work/recovery sides get the same treatment,
 * one level down.
 */
function buildActualBlocks(planned: V2Block[], actuals: BlockActuals): V2Block[] {
  return planned.map((b) => {
    const edited = actuals[b.index] || {};
    const block: V2Block = { index: b.index, kind: b.kind, modality: b.modality, name: b.name };
    carryStrokeType(block, b);

    if (b.sets) block.sets = buildActualSets(b.sets, edited);
    if (b.repeats) {
      const repeats: V2Block['repeats'] = { count: b.repeats.count, work: buildActualSide(b.repeats.work, edited, 'work') };
      if (b.repeats.recovery) repeats.recovery = buildActualSide(b.repeats.recovery, edited, 'recovery');
      block.repeats = repeats;
    }

    for (const key of Object.keys(b)) {
      if (NON_MEASURE_KEYS.has(key) || (b as any)[key] === undefined) continue;
      const n = resolveMeasure(edited[key], (b as any)[key]);
      if (n !== undefined) (block as any)[key] = n;
    }
    return block;
  });
}

export default function CompleteSessionScreen() {
  const nav = useNavigation() as any;
  const route = useRoute() as any;
  const prescription: V2Prescription = route.params.prescription;

  const [actuals, setActuals] = useState<BlockActuals>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange = (index: number, field: string, text: string) => {
    setActuals((prev) => ({ ...prev, [index]: { ...prev[index], [field]: text } }));
  };

  const onSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const blocks = buildActualBlocks(prescription.blocks, actuals);
    const result = await completeV2Session({
      prescriptionRef: { programmeId: prescription.programmeId, planItemId: prescription.planItemId, rev: prescription.rev },
      sport: prescription.sport,
      sessionType: prescription.sessionType,
      date: localDateKey(new Date()),
      completedAt: new Date().toISOString(),
      status: 'completed',
      blocks,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error || 'Could not save this session.');
      return;
    }
    nav.replace('SessionResult', {
      item: { mappable: true, session: result.session, flags: [], source: { collection: 'sessions_v2', id: result.session!.sessionId } },
      justCompleted: true,
    });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={styles.header}>
          <PressableScale onPress={() => nav.goBack()} accessibilityLabel="Cancel" style={styles.backBtn}>
            <Text style={styles.backArrow}>✕</Text>
          </PressableScale>
          <GritText variant="title" style={styles.headerTitle} numberOfLines={1}>{prescription.title}</GritText>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.sub}>
            {prescription.sport} · {prescription.sessionType} · plan item {prescription.planItemId.slice(0, 12)}… rev {prescription.rev}
          </Text>
          <GritText variant="label" style={styles.sectionLabel}>Log your actuals</GritText>
          <SessionBlockEditor blocks={prescription.blocks} values={actuals} onChange={onChange} />

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorTxt}>{error}</Text>
            </View>
          )}

          <View style={{ height: spacing[6] }} />
          <GritButton
            label={submitting ? 'Saving…' : 'Complete session'}
            onPress={onSubmit}
            disabled={submitting}
            tone="acid"
          />
          {submitting && <ActivityIndicator color={colors.ember} style={{ marginTop: spacing[3] }} />}
          <View style={{ height: spacing[10] }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.asphalt },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[5], paddingVertical: spacing[3] },
  backBtn: { width: 38, height: 38, borderRadius: radii.control, backgroundColor: colors.iron, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontFamily: 'BarlowCondensed-Black', fontSize: 18, color: colors.chalk },
  headerTitle: { color: colors.chalk, flex: 1, textAlign: 'center', marginHorizontal: spacing[2] },
  scroll: { paddingHorizontal: spacing[5], paddingBottom: spacing[10] },
  sub: { ...T.body, color: colors.concrete, marginBottom: spacing[5] },
  sectionLabel: { color: colors.muted, marginBottom: spacing[3] },
  errorBox: { backgroundColor: 'rgba(255,75,34,0.12)', borderWidth: 1, borderColor: 'rgba(255,75,34,0.3)', borderRadius: radii.control, padding: spacing[3], marginTop: spacing[4] },
  errorTxt: { color: colors.ember, fontFamily: 'IBMPlexSans-SemiBold', fontSize: 13 },
});
