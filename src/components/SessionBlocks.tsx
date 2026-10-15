// Renders an ordered list of v2 session blocks — shared between the
// Schedule (planned targets), Complete (editable actuals) and Result
// (recorded actuals) screens so the three read identically.

import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { colors, spacing, radii } from '../theme/grit';
import { GritText } from './grit';
import type { V2Block } from '../types/sessionV2';

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
              <Text style={styles.measure}>
                {b.sets.map((s) => `${s.reps ?? '—'}${s.bodyweight ? ' BW' : s.weightKg != null ? `×${s.weightKg}kg` : ''}`).join(', ')}
              </Text>
            )}
          </View>
          <Text style={styles.measure}>
            {blockMeasureFields(b).map(([key, , unit]) => `${b[key]}${unit}`).join(' · ')}
          </Text>
        </View>
      ))}
    </View>
  );
}

export interface BlockActuals { [index: number]: Record<string, string> }

/**
 * Editable block list for logging actuals — one numeric field per measure
 * the PLANNED block carries, pre-filled with the planned value (the athlete
 * edits toward what actually happened, rather than typing every field from
 * scratch). Sets, if the block has them, are not individually editable here
 * (MVP) — see the completion screen's notes field for anything that needs
 * more detail than the per-block totals capture.
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
      {blocks.map((b) => (
        <View key={b.index} style={styles.editRow}>
          <View style={styles.editHead}>
            <Text style={styles.kind}>{b.kind}</Text>
            <GritText variant="bodyStrong" style={styles.name}>{b.name}</GritText>
          </View>
          <View style={styles.editFields}>
            {blockMeasureFields(b).map(([key, label, unit]) => (
              <View key={String(key)} style={styles.field}>
                <Text style={styles.fieldLabel}>{label} ({unit})</Text>
                <TextInput
                  value={values[b.index]?.[String(key)] ?? (b[key] != null ? String(b[key]) : '')}
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
        </View>
      ))}
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
