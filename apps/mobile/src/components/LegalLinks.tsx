// Liens légaux (exigés par Apple/Google : politique de confidentialité + conditions, et sur le
// paywall des abonnements). Ouverts dans un navigateur intégré, sur les pages publiques du site.
import * as WebBrowser from 'expo-web-browser'
import { StyleSheet, Text, View } from 'react-native'
import { legalUrl } from '../config'
import { colors } from '../theme'

type Item = { page: 'privacy' | 'terms' | 'refunds' | 'contact'; label: string }

export function LegalLinks({ items }: { items: Item[] }) {
  return (
    <View style={styles.row}>
      {items.map((item) => (
        <Text
          key={item.page}
          accessibilityRole="link"
          onPress={() => void WebBrowser.openBrowserAsync(legalUrl(item.page))}
          style={styles.link}
        >
          {item.label}
        </Text>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginTop: 8 },
  link: { color: colors.amber, fontSize: 13, textDecorationLine: 'underline', paddingVertical: 4 },
})
