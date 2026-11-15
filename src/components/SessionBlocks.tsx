// Renders an ordered list of v2 session blocks — shared between the
// Schedule (planned targets), Complete (editable actuals) and Result
// (recorded actuals) screens so the three read identically.

import React from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { colors, spacing, radii } from '../theme/grit';
import { GritText } from './grit';
import type { V2Block, V2Set } from '../types/sessionV2';

// field -> [label, unit]. Only fields actually present on a block are shown —
// never invent a 0 for a measure the block doesn't carry.
const MEASURES: Array<[keyof V2Block, string, string]> = [
  ['distanceM', 'Distance', 'm'],
  ['durationSec', 'Duration', 's'],
  ['paceSecPerKm', 'Pace', 's/km'],
  ['speedKph', 'Speed', 'km/h'],
  ['avgHrBpm', 'Avg HR', 'bpm'],
  ['avgPowerW', 'Avg power', 'W'],
  ['cadenceSpm', 'Cadence', 'spm'],
  ['cadenceRpm', 'Cadence', 'rpm'],
  ['loadKg', 'Load', 'kg'],
  ['poolLengthM', 'Pool length', 'm'],
  ['elevationGainM', 'Elevation', 'm'],
  ['restSec', 'Rest', 's'],
];

export function blockMeasureFields(block: V2Block): Array<[keyof V2Block, string, string]> {
  return MEASURES.filter(([key]) => block[key] !== undefined);
}

function measureLine(block: V2Block): string {
  const parts = blockMeasureFields(block).map(([key, , unit]) => `${block[key]}${unit}`);
  // strokeType is categorical, not a MEASURES entry (it has no unit to convert) —
  // appended as its own token so a swim block still shows it.
  if (block.strokeType) parts.push(block.strokeType);
  return parts.join(' · ');
}

function repsLabel(s: V2Set): string {
  if (s.reps != null) return String(s.reps);
  // A prescribed RANGE ("6-8 reps") — reps is null, the target lives in
  // repsMin/repsMax instead. Showing "—" here (the old behaviour) silently
  // hid the actual prescription from the athlete, so a range-prescribed
  // exercise always looked unrecorded instead of showing its real target.
  if (s.repsMin != null && s.repsMax != null) return `${s.repsMin}–${s.repsMax}`;
  return '—';
}

function setSummary(sets: V2Set[]): string {
  return sets.map((s) => `${repsLabel(s)}${s.bodyweight ? ' BW' : s.weightKg != null ? `×${s.weightKg}kg` : ''}`).join(', ');
}

/** One repeats block's read-only summary: "3 × 8min threshold effort (480s · 224W) + Easy pedalling (240s)". */
function RepeatsSummary({ block }: { block: V2Block }) {
  const r = block.repeats!;
  const workLine = measureLine(r.work);
  const recoveryLine = r.recovery ? measureLine(r.recovery) : '';
  return (
    <Text style={styles.measure}>
      {r.count} × {r.work.name}{workLine ? ` (${workLine})` : ''}
      {r.recovery ? ` + ${r.recovery.name}${recoveryLine ? ` (${recoveryLine})` : ''}` : ''}
    </Text>
  );
}

/** Read-only block list — planned targets (Schedule) or recorded actuals (Result). */
export function SessionBlockList({ blocks }: { blocks: V2Block[] }) {
  return (
    <View style={styles.list}>
      {blocks.map((b) => (
        <View key={b.index} style={styles.row}>
          <Text style={styles.kind}>{b.kind}</Text>
          <View style={{ flex: 1 }}>
            <GritText variant="bodyStrong" style={styles.name}>{b.name}</GritText>
            {b.sets && b.sets.length > 0 && (
              <Text style={styles.measure}>{setSummary(b.sets)}</Text>
            )}
            {b.repeats && <RepeatsSummary block={b} />}
          </View>
          {!b.repeats && (
            <Text style={styles.measure}>{measureLine(b)}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

export interface BlockActuals { [index: number]: Record<string, string> }

/** One editable strength set row: reps, load (kg), and a BODYWEIGHT toggle. */
function SetEditor({
  blockIndex, set, i, values, onChange,
}: {
  blockIndex: number; set: V2Set; i: number;
  values: Record<string, string>; onChange: (index: number, field: string, text: string) => void;
}) {
  const repsKey = `set${i}.reps`;
  const weightKey = `set${i}.weightKg`;
  const bwKey = `set${i}.bodyweight`;
  const isBodyweight = (values[bwKey] ?? (set.bodyweight ? '1' : '')) === '1';
  // A range-prescribed set (reps null, repsMin/repsMax set) has nothing to
  // pre-fill — the athlete logs a specific number they actually did — but
  // the input must still show the TARGET as a placeholder, or the athlete
  // has no idea what they were asked to aim for while completing it.
  const repsPlaceholder = set.reps == null && set.repsMin != null && set.repsMax != null
    ? `${set.repsMin}–${set.repsMax}` : '—';
  return (
    <View style={setStyles.row}>
      <Text style={setStyles.setNum}>Set {set.setNumber}</Text>
      <View style={setStyles.field}>
        <Text style={styles.fieldLabel}>Reps</Text>
        <TextInput
          value={values[repsKey] ?? (set.reps != null ? String(set.reps) : '')}
          onChangeText={(t) => onChange(blockIndex, repsKey, t)}
          keyboardType="numeric"
          placeholder={repsPlaceholder}
          placeholderTextColor={colors.concrete}
          style={styles.input}
        />
      </View>
      {isBodyweight ? (
        <View style={setStyles.field}>
          <Text style={styles.fieldLabel}>Load (kg)</Text>
          <View style={[styles.input, setStyles.bwInput]}><Text style={setStyles.bwInputTxt}>Bodyweight</Text></View>
        </View>
      ) : (
        <View style={setStyles.field}>
          <Text style={styles.fieldLabel}>Load (kg)</Text>
          <TextInput
            value={values[weightKey] ?? (set.weightKg != null ? String(set.weightKg) : '')}
            onChangeText={(t) => onChange(blockIndex, weightKey, t)}
            keyboardType="numeric"
            placeholder="—"
            placeholderTextColor={colors.concrete}
            style={styles.input}
          />
        </View>
      )}
      <Pressable
        onPress={() => onChange(blockIndex, bwKey, isBodyweight ? '' : '1')}
        accessibilityLabel={`Mark set ${set.setNumber} as bodyweight${isBodyweight ? ', currently on' : ''}`}
        style={[setStyles.bwToggle, isBodyweight && setStyles.bwToggleOn]}
      >
        <Text style={[setStyles.bwToggleTxt, isBodyweight && setStyles.bwToggleTxtOn]}>BW</Text>
      </Pressable>
    </View>
  );
}

/** Editable work/recovery measures for one repeats block — the repeat COUNT itself is fixed by the prescription, not editable. */
function RepeatsEditor({
  block, values, onChange,
}: {
  block: V2Block; values: Record<string, string>; onChange: (index: number, field: string, text: string) => void;
}) {
  const r = block.repeats!;
  const renderSide = (side: 'work' | 'recovery', sideBlock: V2Block) => (
    <View style={repeatStyles.side}>
      <Text style={repeatStyles.sideLabel}>{sideBlock.name}</Text>
      <View style={styles.editFields}>
        {blockMeasureFields(sideBlock).map(([key, label, unit]) => {
          const fieldKey = `${side}.${String(key)}`;
          return (
            <View key={fieldKey} style={styles.field}>
              <Text style={styles.fieldLabel}>{label} ({unit})</Text>
              <TextInput
                value={values[fieldKey] ?? (sideBlock[key] != null ? String(sideBlock[key]) : '')}
                onChangeText={(t) => onChange(block.index, fieldKey, t)}
                keyboardType="numeric"
                placeholder="—"
                placeholderTextColor={colors.concrete}
                style={styles.input}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
  return (
    <View style={repeatStyles.container}>
      <Text style={repeatStyles.count}>× {r.count}</Text>
      {renderSide('work', r.work)}
      {r.recovery && renderSide('recovery', r.recovery)}
    </View>
  );
}

/**
 * Editable block list for logging actuals — pre-filled with the planned
 * value for every measure the PLANNED block carries, including strength
 * sets (reps / load / an explicit bodyweight toggle, never invented from an
 * absent load) and the work/recovery sides of a repeats block. A measure
 * the PLANNED block never had is never invented here.
 */
export function SessionBlockEditor({
  blocks, values, onChange,
}: {
  blocks: V2Block[];
  values: BlockActuals;
  onChange: (index: number, field: string, text: string) => void;
}) {
  return (
    <View style={styles.list}>
      {blocks.map((b) => {
        const blockValues = values[b.index] || {};
        return (
          <View key={b.index} style={styles.editRow}>
            <View style={styles.editHead}>
              <Text style={styles.kind}>{b.kind}</Text>
              <GritText variant="bodyStrong" style={styles.name}>{b.name}</GritText>
            </View>

            {b.sets && b.sets.length > 0 && (
              <View style={{ gap: spacing[2] }}>
                {b.sets.map((s, i) => (
                  <SetEditor key={s.setNumber} blockIndex={b.index} set={s} i={i} values={blockValues} onChange={onChange} />
                ))}
              </View>
            )}

            {b.repeats && <RepeatsEditor block={b} values={blockValues} onChange={onChange} />}

            {!b.sets && !b.repeats && (
              <View style={styles.editFields}>
                {blockMeasureFields(b).map(([key, label, unit]) => (
                  <View key={String(key)} style={styles.field}>
                    <Text style={styles.fieldLabel}>{label} ({unit})</Text>
                    <TextInput
                      value={blockValues[String(key)] ?? (b[key] != null ? String(b[key]) : '')}
                      onChangeText={(t) => onChange(b.index, String(key), t)}
                      keyboardType="numeric"
                      placeholder="—"
                      placeholderTextColor={colors.concrete}
                      style={styles.input}
                    />
                  </View>
                ))}
                {blockMeasureFields(b).length === 0 && (
                  <Text style={styles.noMeasures}>No numeric targets on this block — mark it done when complete.</Text>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: radii.control, padding: spacing[3] },
  kind: { fontFamily: 'IBMPlexSans-Bold', fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.concrete, width: 68 },
  name: { color: colors.chalk },
  measure: { color: colors.muted, fontFamily: 'IBMPlexSans-Medium', fontSize: 12, fontVariant: ['tabular-nums'] },

  editRow: { backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: radii.control, padding: spacing[3], gap: spacing[2] },
  editHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  editFields: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  field: { minWidth: 100 },
  fieldLabel: { fontFamily: 'IBMPlexSans-Medium', fontSize: 10, color: colors.concrete, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    fontFamily: 'IBMPlexSans-SemiBold', fontSize: 14, color: colors.chalk,
    backgroundColor: colors.iron, borderRadius: radii.sharp, borderWidth: 1, borderColor: colors.line,
    paddingHorizontal: spacing[2], paddingVertical: 8, minWidth: 90,
  },
  noMeasures: { color: colors.concrete, fontFamily: 'IBMPlexSans-Regular', fontSize: 12, fontStyle: 'italic' },
});

const setStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[2] },
  setNum: { fontFamily: 'IBMPlexSans-Bold', fontSize: 12, color: colors.concrete, width: 46, marginBottom: 10 },
  field: { minWidth: 86 },
  bwInput: { alignItems: 'center', justifyContent: 'center' },
  bwInputTxt: { fontFamily: 'IBMPlexSans-SemiBold', fontSize: 12, color: colors.acid },
  bwToggle: {
    borderWidth: 1, borderColor: colors.line, borderRadius: radii.sharp,
    paddingHorizontal: 10, paddingVertical: 9, marginBottom: 1,
  },
  bwToggleOn: { backgroundColor: 'rgba(215,255,69,0.14)', borderColor: colors.acid },
  bwToggleTxt: { fontFamily: 'IBMPlexSans-Bold', fontSize: 11, color: colors.concrete, letterSpacing: 0.4 },
  bwToggleTxtOn: { color: colors.acid },
});

const repeatStyles = StyleSheet.create({
  container: { gap: spacing[2] },
  count: { fontFamily: 'IBMPlexSans-Bold', fontSize: 13, color: colors.acid },
  side: { gap: spacing[1] },
  sideLabel: { fontFamily: 'IBMPlexSans-SemiBold', fontSize: 12, color: colors.chalk },
});
