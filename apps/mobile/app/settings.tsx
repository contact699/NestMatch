import { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  ChevronLeft,
  ChevronRight,
  UserPen,
  ShieldCheck,
  Bell,
  Eye,
  FileText,
  Lock,
  LogOut,
  Trash2,
} from 'lucide-react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '../src/providers/auth-provider'
import { supabase } from '../src/lib/supabase'

export default function SettingsScreen() {
  const router = useRouter()
  const { user, signOut } = useAuth()

  const [pushEnabled, setPushEnabled] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [showBadges, setShowBadges] = useState(true)
  const [loadingPrivacy, setLoadingPrivacy] = useState(true)

  useEffect(() => {
    if (!user) return
    AsyncStorage.getItem(`@settings:show_badges:${user.id}`)
      .then((val) => {
        if (val !== null) {
          setShowBadges(val === 'true')
        }
      })
      .finally(() => setLoadingPrivacy(false))
  }, [user])

  const toggleShowBadges = async (value: boolean) => {
    setShowBadges(value)
    if (!user) return
    try {
      await AsyncStorage.setItem(`@settings:show_badges:${user.id}`, String(value))
    } catch {
      setShowBadges(!value)
      Alert.alert('Error', 'Failed to update privacy setting.')
    }
  }

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => signOut(),
      },
    ])
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'This will permanently delete all your data, listings, and messages. Are you absolutely sure?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete My Account',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const { error } = await supabase.functions.invoke('delete-account')
                      if (error) throw error
                      await signOut()
                    } catch {
                      Alert.alert('Error', 'Failed to delete account. Please try again or contact support.')
                    }
                  },
                },
              ],
            )
          },
        },
      ],
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color="#0f172a" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Account Section */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/edit-profile')}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#eff6ff' }]}>
                <UserPen color="#2563eb" size={18} />
              </View>
              <Text style={styles.rowLabel}>Edit Profile</Text>
            </View>
            <ChevronRight color="#94a3b8" size={20} />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/verify')}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#f0fdf4' }]}>
                <ShieldCheck color="#16a34a" size={18} />
              </View>
              <Text style={styles.rowLabel}>Verification / Trust Center</Text>
            </View>
            <ChevronRight color="#94a3b8" size={20} />
          </TouchableOpacity>
        </View>

        {/* Notifications Section */}
        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#fef3c7' }]}>
                <Bell color="#d97706" size={18} />
              </View>
              <Text style={styles.rowLabel}>Push Notifications</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
              thumbColor={pushEnabled ? '#2563eb' : '#94a3b8'}
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#fef3c7' }]}>
                <Bell color="#d97706" size={18} />
              </View>
              <Text style={styles.rowLabel}>Email Notifications</Text>
            </View>
            <Switch
              value={emailEnabled}
              onValueChange={setEmailEnabled}
              trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
              thumbColor={emailEnabled ? '#2563eb' : '#94a3b8'}
            />
          </View>
        </View>

        {/* Privacy Section */}
        <Text style={styles.sectionLabel}>Privacy</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#f5f3ff' }]}>
                <Eye color="#7c3aed" size={18} />
              </View>
              <Text style={styles.rowLabel}>Show Verification Badges</Text>
            </View>
            {loadingPrivacy ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <Switch
                value={showBadges}
                onValueChange={toggleShowBadges}
                trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
                thumbColor={showBadges ? '#2563eb' : '#94a3b8'}
              />
            )}
          </View>
        </View>

        {/* Legal Section */}
        <Text style={styles.sectionLabel}>Legal</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => Linking.openURL('https://www.nestmatch.app/terms')}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#f1f5f9' }]}>
                <FileText color="#64748b" size={18} />
              </View>
              <Text style={styles.rowLabel}>Terms of Service</Text>
            </View>
            <ChevronRight color="#94a3b8" size={20} />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => Linking.openURL('https://www.nestmatch.app/privacy')}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#f1f5f9' }]}>
                <Lock color="#64748b" size={18} />
              </View>
              <Text style={styles.rowLabel}>Privacy Policy</Text>
            </View>
            <ChevronRight color="#94a3b8" size={20} />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <Text style={styles.sectionLabel}>Account Actions</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={handleSignOut}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#fef2f2' }]}>
                <LogOut color="#dc2626" size={18} />
              </View>
              <Text style={[styles.rowLabel, { color: '#dc2626' }]}>Sign Out</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity style={styles.row} onPress={handleDeleteAccount}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#fef2f2' }]}>
                <Trash2 color="#dc2626" size={18} />
              </View>
              <Text style={[styles.rowLabel, { color: '#dc2626' }]}>Delete Account</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0f172a',
  },
  headerSpacer: {
    width: 32,
  },
  scrollContent: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0f172a',
  },
  separator: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginLeft: 62,
  },
  bottomPadding: {
    height: 40,
  },
})
