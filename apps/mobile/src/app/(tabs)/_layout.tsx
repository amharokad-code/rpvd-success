// Onglets : Analyser · Bibliothèque (Pro) · Compte. La bibliothèque reste visible pour tous — un
// compte Basic y voit une présentation honnête du forfait Pro plutôt qu'un onglet qui disparaît.
import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { useApp } from '../../context/AppContext'
import { colors } from '../../theme'

export default function TabsLayout() {
  const { t } = useApp()
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t.tabs.home, tabBarIcon: ({ color, size }) => <Ionicons name="camera-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: t.tabs.history, tabBarIcon: ({ color, size }) => <Ionicons name="library-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: t.tabs.account, tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} /> }}
      />
    </Tabs>
  )
}
