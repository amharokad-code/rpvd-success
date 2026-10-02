// Affichage d'une analyse — MÉTHODE RPVD : Identification (CONNU / CHERCHE) toujours visible,
// puis la Démarche (un seul paragraphe de phrases « Tu… ») dévoilée au niveau 2, puis le Principe
// et le détail étape par étape au niveau 3. L'arbre de cheminement est le résumé condensé de la
// démarche (sur le web il vit dans la colonne de droite ; sur téléphone, sous la démarche).
// Les analyses sauvegardées avant la méthode (sans `demarche`) retombent sur level_1 / level_2.
import { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useApp } from '../context/AppContext'
import { isProPlan } from '../lib/plan'
import type { Analysis, CheminementStep } from '../lib/types'
import { colors, font, spacing } from '../theme'
import { plainMath } from '../lib/math'
import { MathFiche } from './MathFiche'
import { Body, Button, Card, Chip, FadeIn, H2, Muted } from './ui'

type Props = {
  analysis: Analysis
  plan: string | null | undefined
  saved: boolean
  canSave: boolean
  onSave: () => void
  onNew: () => void
}

function CheminementTree({ steps, title }: { steps: CheminementStep[]; title: string }) {
  return (
    <Card>
      <Muted style={{ marginBottom: spacing.sm, ...font.semibold }}>{title}</Muted>
      {steps.map((step, i) => (
        <View key={`${step.text}-${i}`} style={styles.treeRow}>
          <View style={styles.treeRail}>
            <View style={[styles.treeDot, step.type === 'concept' ? styles.dotConcept : styles.dotAction]} />
            {i < steps.length - 1 ? <View style={styles.treeLine} /> : null}
          </View>
          <Text
            style={[
              styles.treeText,
              step.isFormula ? font.mono : step.type === 'concept' ? { fontStyle: 'italic' } : null,
              step.type === 'concept' && { color: colors.textMuted },
            ]}
          >
            {plainMath(step.text)}
          </Text>
        </View>
      ))}
    </Card>
  )
}

export function AnalysisView({ analysis, plan, saved, canSave, onSave, onNew }: Props) {
  const { t } = useApp()
  const a = t.analysis
  const pro = isProPlan(plan)
  const [level, setLevel] = useState(1)
  const [done, setDone] = useState(false)
  const [firstTry, setFirstTry] = useState(false)
  const [showHint, setShowHint] = useState(false)

  useEffect(() => {
    setLevel(1)
    setDone(false)
    setFirstTry(false)
    setShowHint(false)
  }, [analysis])

  // Moteur D v2 : 3 niveaux LaTeX rendus dans MathFiche (les analyses plus anciennes gardent le rendu ci-dessous).
  const niveaux = analysis.niveaux && analysis.niveaux.length >= 3 ? analysis.niveaux : null
  const mathLabels = useMemo(() => ({ connu: a.connu, cherche: a.cherche, answer: a.finalAnswer }), [a])
  const hasMethode = Boolean(analysis.demarche)
  const steps = niveaux ? [] : (analysis.level_3_steps ?? [])
  const tree = analysis.cheminement ?? []
  const hasLevel3 = Boolean(niveaux) || steps.length > 0 || Boolean(analysis.final_answer) || Boolean(analysis.principe)

  function finish() {
    if (level === 1) setFirstTry(true)
    setDone(true)
  }

  return (
    <View>
      {analysis.problem_type ? (
        <View style={{ marginBottom: spacing.md }}>
          <Chip tone="amber" label={`${a.patternLabel} · ${analysis.problem_type}`} />
        </View>
      ) : null}

      <FadeIn>
        <Card>
          {niveaux ? (
            <>
              <H2>{a.visuelTitles[level - 1]}</H2>
              <View style={{ marginTop: spacing.md }}>
                <MathFiche key={level} level={niveaux[level - 1]} labels={mathLabels} />
              </View>
            </>
          ) : hasMethode ? (
            <>
              <H2>{a.level1Title}</H2>
              <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                {analysis.connu && analysis.connu.length > 0 ? (
                  <View style={styles.identRow}>
                    <Text style={[styles.identLabel, { color: colors.amber }]}>{a.connu} :</Text>
                    <View style={styles.chipWrap}>
                      {analysis.connu.map((item, i) => (
                        <Chip key={`${item}-${i}`} label={item} mono />
                      ))}
                    </View>
                  </View>
                ) : null}
                {analysis.cherche ? (
                  <View style={styles.identRow}>
                    <Text style={[styles.identLabel, { color: colors.emerald }]}>{a.cherche} :</Text>
                    <View style={styles.chipWrap}>
                      <Chip tone="emerald" label={analysis.cherche} mono />
                    </View>
                  </View>
                ) : null}
              </View>
            </>
          ) : (
            <>
              <H2>{level >= 2 ? a.level2Title : a.level1Title}</H2>
              <Body style={{ marginTop: spacing.md, lineHeight: 26 }}>
                {(level >= 2 ? analysis.level_2 : analysis.level_1) ?? analysis.level_1 ?? ''}
              </Body>
            </>
          )}

          {pro && analysis.hint ? (
            <View style={{ marginTop: spacing.md }}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowHint((v) => !v)}
                style={styles.hintButton}
              >
                <Text style={styles.hintButtonText}>{a.hintCta}</Text>
              </Pressable>
              {showHint ? (
                <FadeIn>
                  <Text style={styles.hintText}>{analysis.hint}</Text>
                </FadeIn>
              ) : null}
            </View>
          ) : null}

          {firstTry ? (
            <FadeIn style={{ marginTop: spacing.lg }}>
              <View style={styles.firstTry}>
                <Text style={styles.firstTryText}>{a.firstTry}</Text>
              </View>
            </FadeIn>
          ) : null}
        </Card>
      </FadeIn>

      {(hasMethode || niveaux) && level >= 2 ? (
        <FadeIn>
          {niveaux ? null : (
            <Card accent="amber">
              <H2>{a.level2Title}</H2>
              <Body style={{ marginTop: spacing.sm, lineHeight: 28, fontSize: 17 }}>{analysis.demarche}</Body>
            </Card>
          )}
          {tree.length > 0 ? <CheminementTree steps={tree} title={a.treeTitle} /> : null}
        </FadeIn>
      ) : null}

      {level >= 3 ? (
        <FadeIn>
          {hasMethode && analysis.principe ? (
            <Card accent="emerald">
              <Muted style={{ color: colors.emerald, ...font.semibold, marginBottom: 4 }}>{a.level3Title}</Muted>
              <Text style={{ color: '#d1fae5', fontSize: 15, lineHeight: 23 }}>{analysis.principe}</Text>
            </Card>
          ) : null}

          {steps.length > 0 ? (
            <Card>
              <H2>{a.stepsTitle}</H2>
              <View style={{ marginTop: spacing.md, gap: spacing.lg }}>
                {steps.map((step, i) => (
                  <FadeIn key={`${step.title}-${i}`} delay={i * 110} style={styles.stepRow}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stepTitle}>{step.title}</Text>
                      {step.text ? <Muted style={{ marginTop: 2, fontSize: 15, lineHeight: 22 }}>{step.text}</Muted> : null}
                    </View>
                  </FadeIn>
                ))}
              </View>
            </Card>
          ) : null}

          {!niveaux && analysis.final_answer ? (
            <Card>
              <Muted>{a.finalAnswer}</Muted>
              <View style={styles.answerBox}>
                <Text style={styles.answerText}>{analysis.final_answer}</Text>
              </View>
            </Card>
          ) : null}

          {pro && analysis.pitfall ? (
            <Card>
              <Text style={styles.noteTitle}>{a.pitfall}</Text>
              <Muted style={{ marginTop: 4, fontSize: 15, lineHeight: 22 }}>{analysis.pitfall}</Muted>
            </Card>
          ) : null}
          {pro && analysis.consigne_translation ? (
            <Card>
              <Text style={styles.noteTitle}>{a.consigne}</Text>
              <Muted style={{ marginTop: 4, fontSize: 15, lineHeight: 22 }}>{analysis.consigne_translation}</Muted>
            </Card>
          ) : null}
        </FadeIn>
      ) : null}

      <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
        {done ? (
          <>
            {canSave ? <Button label={saved ? a.saved : a.save} onPress={onSave} disabled={saved} /> : null}
            <Button label={a.newProblem} onPress={onNew} variant="secondary" />
          </>
        ) : (
          <>
            <Button label={a.done} onPress={finish} variant="success" />
            {level === 1 ? <Button label={a.showDemarche} onPress={() => setLevel(2)} variant="secondary" /> : null}
            {level === 2 && hasLevel3 ? <Button label={a.showPrincipe} onPress={() => setLevel(3)} variant="secondary" /> : null}
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  identRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  identLabel: { width: 78, fontSize: 13, paddingTop: 6, ...font.mono },
  chipWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  hintButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.amberSoft,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  hintButtonText: { color: '#d9ab7c', fontSize: 13, ...font.semibold },
  hintText: {
    marginTop: spacing.sm,
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderRadius: 14,
    padding: spacing.md,
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  firstTry: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF8E72',
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
  },
  firstTryText: { color: '#0f172a', fontSize: 15, ...font.bold },
  treeRow: { flexDirection: 'row', gap: spacing.md, minHeight: 28 },
  treeRail: { width: 14, alignItems: 'center' },
  treeDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  dotConcept: { backgroundColor: colors.textFaint },
  dotAction: { backgroundColor: colors.amber },
  treeLine: { flex: 1, width: 1, backgroundColor: colors.border, marginTop: 2 },
  treeText: { flex: 1, color: colors.text, fontSize: 15, lineHeight: 22, paddingBottom: 8 },
  stepRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  stepNumber: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.emeraldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { color: colors.emerald, fontSize: 16, ...font.display },
  stepTitle: { color: colors.text, fontSize: 16, ...font.semibold },
  answerBox: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    borderWidth: 2,
    borderColor: 'rgba(52,211,153,0.6)',
    backgroundColor: colors.emeraldSoft,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
  },
  answerText: { color: '#a7f3d0', fontSize: 20, ...font.mono },
  noteTitle: { color: colors.text, fontSize: 15, ...font.semibold },
})
