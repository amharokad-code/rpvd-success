// Connexion par lien magique (même modèle que la PWA : pas de mot de passe). Le lien ouvre l'app
// via le deep link rpvd://auth-callback ; un code à 6 chiffres sert de repli quand le client
// courriel (ou son navigateur intégré) bloque les liens vers une app.
import { useEffect, useState } from 'react'
import { Image, StyleSheet, TextInput, View } from 'react-native'
import { LegalLinks } from '../../components/LegalLinks'
import { Body, Button, Card, ErrorBanner, H1, H2, Muted, Screen } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { trackEvent } from '../../lib/track'
import { colors, radius, spacing } from '../../theme'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default function Login() {
  const { t, region } = useApp()
  const { sendLink, verifyCode } = useAuth()
  const l = t.login
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    trackEvent('pageview', 'login', { region })
  }, [region])

  async function submit() {
    const value = email.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(value)) {
      setError(l.errorInvalid)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await sendLink(value)
      trackEvent('signup_started', 'login', { region })
      setSentTo(value)
    } catch (e) {
      const message = e instanceof Error ? e.message : ''
      setError(/rate|limit/i.test(message) ? t.errors.RATE_LIMITED : t.errors.NETWORK)
    } finally {
      setBusy(false)
    }
  }

  async function submitCode() {
    if (!sentTo || !/^\d{6,8}$/.test(code.trim())) {
      setError(l.errorCode)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await verifyCode(sentTo, code.trim())
    } catch {
      setError(l.errorCode)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <Image source={require('../../../assets/icon.png')} style={styles.logo} accessibilityLabel="RPVD Success" />
        <H1>RPVD Success</H1>
      </View>

      <Card>
        {sentTo ? (
          <View style={{ gap: spacing.md }}>
            <H2>{l.sentTitle}</H2>
            <Body style={{ color: colors.textMuted }}>{l.sentBody(sentTo)}</Body>
            <Muted>{l.codeLabel}</Muted>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder={l.codePlaceholder}
              placeholderTextColor={colors.textFaint}
              keyboardType="number-pad"
              maxLength={8}
              autoComplete="one-time-code"
              style={[styles.input, styles.codeInput]}
              accessibilityLabel={l.codeLabel}
            />
            {error ? <ErrorBanner message={error} /> : null}
            <Button label={busy ? l.verifying : l.verify} onPress={() => void submitCode()} loading={busy} disabled={!code.trim()} />
            <Button label={l.resend} onPress={() => void submit()} variant="secondary" disabled={busy} />
            <Button
              label={l.changeEmail}
              onPress={() => {
                setSentTo(null)
                setCode('')
                setError(null)
              }}
              variant="ghost"
            />
          </View>
        ) : (
          <View style={{ gap: spacing.md }}>
            <H2>{l.title}</H2>
            <Muted>{l.subtitle}</Muted>
            <Muted style={{ marginTop: spacing.sm }}>{l.emailLabel}</Muted>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={l.emailPlaceholder}
              placeholderTextColor={colors.textFaint}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              style={styles.input}
              accessibilityLabel={l.emailLabel}
              onSubmitEditing={() => void submit()}
            />
            {error ? <ErrorBanner message={error} /> : null}
            <Button label={busy ? l.sending : l.submit} onPress={() => void submit()} loading={busy} disabled={!email.trim()} />
            <Muted style={{ fontSize: 12, textAlign: 'center' }}>{l.footer}</Muted>
          </View>
        )}
      </Card>

      <LegalLinks
        items={[
          { page: 'privacy', label: t.account.privacy },
          { page: 'terms', label: t.account.terms },
        ]}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.md, marginVertical: spacing.xl },
  logo: { width: 72, height: 72, borderRadius: 18 },
  input: {
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(15,23,42,0.6)',
    color: colors.text,
    fontSize: 17,
    paddingHorizontal: spacing.lg,
  },
  codeInput: { textAlign: 'center', letterSpacing: 6, fontSize: 22 },
})
