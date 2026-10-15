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
import type { V2Block, V2Prescription } from '../types/sessionV2';

const NON_MEASURE_KEYS = new Set(['index', 'kind', 'modality', 'name', 'notes', 'sets', 'repeats']);

/**
 * Merge the athlete's edited values onto the planned block shape. For each
 * measure the planned block carries:
 *   - edited to a number  -> that number (the real actual)
 *   - edited to ''        -> explicitly cleared; omitted (not measured)
 *   - never touched       -> the PLANNED value is kept as the starting
 *     actual (SessionBlockEditor pre-fills the input with it, so this is
 *     what the athlete implicitly confirmed by not changing it)
 * A measure the PLANNED block never had is never invented here.
 */
function buildActualBlocks(planned: V2Block[], actuals: BlockActuals): V2Block[] {
  return planned.map((b) => {
    const edited = actuals[b.index] || {};
    const block: V2Block = { index: b.index, kind: b.kind, modality: b.modality, name: b.name };
    if (b.sets) block.sets = b.sets;   // MVP: sets carried through unedited

    for (const key of Object.keys(b)) {
      if (NON_MEASURE_KEYS.has(key) || (b as any)[key] === undefined) continue;
      const raw = edited[key];
      if (raw === '') continue;                                    // explicitly cleared
      const n = raw !== undefined ? Number(raw) : (b as any)[key];  // edited or fall back to planned
      if (n === null || Number.isFinite(n)) (block as any)[key] = n;
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
