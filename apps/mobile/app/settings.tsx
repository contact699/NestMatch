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
import { useAuth } from '@/providers/auth-provider'
import { supabase } from '@/lib/supabase'
import { colors, radii, typography } from '@/theme/tokens'

export default function SettingsScreen() {
  const router = useRouter()
  const { user, signOut } = useAuth()

  const [pushEnabled, setPushEnabled] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [showBadges, setShowBadges] = useState(true)
  const [loadingPrivacy, setLoadingPrivacy] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      AsyncStorage.getItem(`@settings:show_badges:${user.id}`),
      AsyncStorage.getItem(`@settings:push_enabled:${user.id}`),
      AsyncStorage.getItem(`@settings:email_enabled:${user.id}`),
    ])
      .then(([badges, push, email]) => {
        if (badges !== null) setShowBadges(badges === 'true')
        if (push !== null) setPushEnabled(push === 'true')
        if (email !== null) setEmailEnabled(email === 'true')
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

  const togglePushEnabled = async (value: boolean) => {
    setPushEnabled(value)
    if (!user) return
    try {
      await AsyncStorage.setItem(`@settings:push_enabled:${user.id}`, String(value))
    } catch {
      setPushEnabled(!value)
      Alert.alert('Error', 'Failed to update notification setting.')
    }
  }

  const toggleEmailEnabled = async (value: boolean) => {
    setEmailEnabled(value)
    if (!user) return
    try {
      await AsyncStorage.setItem(`@settings:email_enabled:${user.id}`, String(value))
    } catch {
      setEmailEnabled(!value)
      Alert.alert('Error', 'Failed to update notification setting.')
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
          <ChevronLeft color={colors.primary} size={24} />
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
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryFixed }]}>
                <UserPen color={colors.primary} size={18} />
              </View>
              <Text style={styles.rowLabel}>Edit Profile</Text>
            </View>
            <ChevronRight color={colors.outline} size={20} />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/verify')}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.successContainer }]}>
                <ShieldCheck color={colors.secondary} size={18} />
              </View>
              <Text style={styles.rowLabel}>Verification / Trust Center</Text>
            </View>
            <ChevronRight color={colors.outline} size={20} />
          </TouchableOpacity>
        </View>

        {/* Notifications Section */}
        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.warningContainer }]}>
                <Bell color={colors.onWarningContainer} size={18} />
              </View>
              <Text style={styles.rowLabel}>Push Notifications</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={togglePushEnabled}
              trackColor={{ false: colors.outlineVariant, true: colors.secondaryContainer }}
              thumbColor={pushEnabled ? colors.secondary : colors.outline}
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.warningContainer }]}>
                <Bell color={colors.onWarningContainer} size={18} />
              </View>
              <Text style={styles.rowLabel}>Email Notifications</Text>
            </View>
            <Switch
              value={emailEnabled}
              onValueChange={toggleEmailEnabled}
              trackColor={{ false: colors.outlineVariant, true: colors.secondaryContainer }}
              thumbColor={emailEnabled ? colors.secondary : colors.outline}
            />
          </View>
        </View>

        {/* Privacy Section */}
        <Text style={styles.sectionLabel}>Privacy</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.surfaceContainerLow }]}>
                <Eye color={colors.primary} size={18} />
              </View>
              <Text style={styles.rowLabel}>Show Verification Badges</Text>
            </View>
            {loadingPrivacy ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Switch
                value={showBadges}
                onValueChange={toggleShowBadges}
                trackColor={{ false: colors.outlineVariant, true: colors.secondaryContainer }}
                thumbColor={showBadges ? colors.secondary : colors.outline}
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
              <View style={[styles.iconCircle, { backgroundColor: colors.surfaceContainerLow }]}>
                <FileText color={colors.onSurfaceVariant} size={18} />
              </View>
              <Text style={styles.rowLabel}>Terms of Service</Text>
            </View>
            <ChevronRight color={colors.outline} size={20} />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => Linking.openURL('https://www.nestmatch.app/privacy')}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.surfaceContainerLow }]}>
                <Lock color={colors.onSurfaceVariant} size={18} />
              </View>
              <Text style={styles.rowLabel}>Privacy Policy</Text>
            </View>
            <ChevronRight color={colors.outline} size={20} />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <Text style={styles.sectionLabel}>Account Actions</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={handleSignOut}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.errorContainer }]}>
                <LogOut color={colors.error} size={18} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.error }]}>Sign Out</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity style={styles.row} onPress={handleDeleteAccount}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.errorContainer }]}>
                <Trash2 color={colors.error} size={18} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.error }]}>Delete Account</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  backButton: { padding: 4 },
  headerTitle: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 16,
    color: colors.primary,
  },
  headerSpacer: { width: 32 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionLabel: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 18,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowLabel: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: 14,
    color: colors.primary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    marginLeft: 62,
  },
  bottomPadding: { height: 24 },
})
