// Petite bibliothèque d'UI maison (sombre, mate, « Pyramid Ascension ») — volontairement sans
// dépendance externe : quelques primitives suffisent pour toute l'app.
import { useEffect, useRef, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, font, radius, spacing } from '../theme'

export function Screen({
  children,
  scroll = true,
  padded = true,
  style,
}: {
  children: ReactNode
  scroll?: boolean
  padded?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const inner = padded ? styles.screenPadded : null
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[inner, { paddingBottom: spacing.xxl * 2 }, style]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, inner, style]}>{children}</View>
      )}
    </SafeAreaView>
  )
}

export function Card({ children, style, accent }: { children: ReactNode; style?: StyleProp<ViewStyle>; accent?: 'amber' | 'emerald' }) {
  return (
    <View
      style={[
        styles.card,
        accent === 'amber' && { borderLeftColor: colors.amber, borderLeftWidth: 3 },
        accent === 'emerald' && { borderColor: 'rgba(52,211,153,0.3)', backgroundColor: colors.emeraldSoft },
        style,
      ]}
    >
      {children}
    </View>
  )
}

export function H1({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.h1, style]}>{children}</Text>
}
export function H2({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.h2, style]}>{children}</Text>
}
export function Body({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.body, style]}>{children}</Text>
}
export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.muted, style]}>{children}</Text>
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: {
  label: string
  onPress: () => void
  variant?: ButtonVariant
  loading?: boolean
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const inactive = disabled || loading
  const textColor =
    variant === 'primary' || variant === 'success' ? '#0f172a' : variant === 'danger' ? colors.rose : colors.text
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        variantStyles[variant],
        pressed && !inactive && { transform: [{ scale: 0.97 }], opacity: 0.92 },
        inactive && { opacity: 0.55 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : <Text style={[styles.buttonText, { color: textColor }]}>{label}</Text>}
    </Pressable>
  )
}

export function Chip({ label, tone = 'neutral', mono = false }: { label: string; tone?: 'neutral' | 'amber' | 'emerald'; mono?: boolean }) {
  const palette = {
    neutral: { bg: 'rgba(15,23,42,0.6)', border: colors.border, text: colors.text },
    amber: { bg: colors.amberSoft, border: 'rgba(201,138,82,0.35)', text: '#d9ab7c' },
    emerald: { bg: colors.emeraldSoft, border: 'rgba(52,211,153,0.35)', text: colors.emerald },
  }[tone]
  return (
    <View style={[styles.chip, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[{ color: palette.text, fontSize: 14 }, mono ? font.mono : font.semibold]}>{label}</Text>
    </View>
  )
}

export function ErrorBanner({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <View accessibilityRole="alert" style={styles.errorBanner}>
      <Text style={{ color: '#fecdd3', fontSize: 14, lineHeight: 20 }}>{message}</Text>
      {action}
    </View>
  )
}

export function CreditBadge({ credits, label }: { credits: number; label: string }) {
  const low = credits <= 1
  return (
    <View style={[styles.badge, { borderColor: low ? 'rgba(201,138,82,0.5)' : colors.border }]}>
      <Text style={{ color: low ? colors.amber : colors.emerald, fontSize: 13 }}>{`⚡ ${label}`}</Text>
    </View>
  )
}

// Apparition douce (fondu + montée de 8 px), ignorée si l'élément est déjà présent au montage
// du parent — `delay` permet de décaler une cascade.
export function FadeIn({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const progress = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 320,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }, [progress, delay])
  return (
    <Animated.View
      style={[
        { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  )
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.md }} />
}

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: colors.amber },
  success: { backgroundColor: colors.emerald },
  secondary: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.roseSoft, borderWidth: 1, borderColor: 'rgba(251,113,133,0.35)' },
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenPadded: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  h1: { color: colors.text, fontSize: 28, lineHeight: 34, ...font.display },
  h2: { color: colors.text, fontSize: 20, lineHeight: 26, ...font.bold },
  body: { color: colors.text, fontSize: 16, lineHeight: 24 },
  muted: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 16, ...font.bold },
  chip: {
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  errorBanner: {
    backgroundColor: colors.roseSoft,
    borderColor: 'rgba(251,113,133,0.4)',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
})
