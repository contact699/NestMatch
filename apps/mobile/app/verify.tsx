import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  ChevronLeft,
  ShieldCheck,
  Check,
  X,
  Clock,
  ExternalLink,
} from 'lucide-react-native'
import { useAuth } from '../src/providers/auth-provider'
import { supabase } from '../src/lib/supabase'

type VerificationStatus = 'verified' | 'pending' | 'unverified'

type VerificationItem = {
  label: string
  key: string
  status: VerificationStatus
  certn: boolean // requires web-based Certn flow
}

type ProfileVerification = {
  email_verified: boolean | null
  phone_verified: boolean | null
  verification_level: string | null
}

type VerificationRecord = {
  type: 'id' | 'credit' | 'criminal' | 'reference'
  status: 'pending' | 'completed' | 'failed'
}

export default function VerifyScreen() {
  const router = useRouter()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<VerificationItem[]>([])
  const [trustScore, setTrustScore] = useState(0)

  const loadVerificationData = useCallback(async () => {
    if (!user) return

    try {
      const [profileResult, verificationsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('email_verified, phone_verified, verification_level')
          .eq('id', user.id)
          .single(),
        supabase
          .from('verifications')
          .select('*')
          .eq('user_id', user.id),
      ])

      const profile = (profileResult.data ?? {}) as Partial<ProfileVerification>
      const verifications = (verificationsResult.data ?? []) as VerificationRecord[]

      const getVerificationStatus = (type: string): VerificationStatus => {
        const record = verifications.find((v) => v.type === type)
        if (!record) return 'unverified'
        if (record.status === 'completed') return 'verified'
        if (record.status === 'pending') return 'pending'
        return 'unverified'
      }

      const verificationItems: VerificationItem[] = [
        {
          label: 'Email Verified',
          key: 'email',
          status: profile.email_verified ? 'verified' : 'unverified',
          certn: false,
        },
        {
          label: 'Phone Verified',
          key: 'phone',
          status: profile.phone_verified ? 'verified' : 'unverified',
          certn: false,
        },
        {
          label: 'ID Verified',
          key: 'id',
          status: getVerificationStatus('id'),
          certn: true,
        },
        {
          label: 'Background Check',
          key: 'criminal',
          status: getVerificationStatus('criminal'),
          certn: true,
        },
        {
          label: 'Credit Check',
          key: 'credit',
          status: getVerificationStatus('credit'),
          certn: true,
        },
      ]

      setItems(verificationItems)

      // Calculate trust score as percentage of verified items
      const verifiedCount = verificationItems.filter((i) => i.status === 'verified').length
      const pendingCount = verificationItems.filter((i) => i.status === 'pending').length
      const total = verificationItems.length
      const score = Math.round(((verifiedCount + pendingCount * 0.5) / total) * 100)
      setTrustScore(score)
    } catch {
      Alert.alert('Error', 'Failed to load verification status.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadVerificationData()
  }, [loadVerificationData])

  const getStatusIcon = (status: VerificationStatus) => {
    switch (status) {
      case 'verified':
        return <Check color="#16a34a" size={20} />
      case 'pending':
        return <Clock color="#d97706" size={20} />
      default:
        return <X color="#dc2626" size={20} />
    }
  }

  const getStatusColor = (status: VerificationStatus) => {
    switch (status) {
      case 'verified':
        return { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' }
      case 'pending':
        return { bg: '#fefce8', border: '#fef08a', text: '#d97706' }
      default:
        return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' }
    }
  }

  const getStatusLabel = (status: VerificationStatus) => {
    switch (status) {
      case 'verified':
        return 'Verified'
      case 'pending':
        return 'Pending'
      default:
        return 'Not Verified'
    }
  }

  const handleVerifyOnWeb = () => {
    Linking.openURL('https://www.nestmatch.app/verify')
  }

  const getTrustColor = () => {
    if (trustScore >= 80) return '#16a34a'
    if (trustScore >= 50) return '#d97706'
    return '#dc2626'
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft color="#0f172a" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trust Center</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color="#0f172a" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trust Center</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Trust Score */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreCircle}>
            <ShieldCheck color={getTrustColor()} size={28} />
          </View>
          <Text style={[styles.scoreValue, { color: getTrustColor() }]}>
            {trustScore}%
          </Text>
          <Text style={styles.scoreLabel}>Trust Quotient</Text>
          <Text style={styles.scoreDescription}>
            Complete verifications to increase your trust score and stand out to potential roommates.
          </Text>
        </View>

        {/* Verification Items */}
        <Text style={styles.sectionLabel}>Verifications</Text>
        <View style={styles.card}>
          {items.map((item, index) => {
            const colors = getStatusColor(item.status)
            return (
              <View key={item.key}>
                {index > 0 && <View style={styles.separator} />}
                <View style={styles.verificationRow}>
                  <View style={styles.verificationLeft}>
                    <View style={[styles.statusDot, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                      {getStatusIcon(item.status)}
                    </View>
                    <View style={styles.verificationInfo}>
                      <Text style={styles.verificationLabel}>{item.label}</Text>
                      <Text style={[styles.verificationStatus, { color: colors.text }]}>
                        {getStatusLabel(item.status)}
                      </Text>
                    </View>
                  </View>
                  {item.certn && item.status === 'unverified' && (
                    <TouchableOpacity
                      style={styles.verifyWebButton}
                      onPress={handleVerifyOnWeb}
                    >
                      <Text style={styles.verifyWebButtonText}>Verify on web</Text>
                      <ExternalLink color="#2563eb" size={14} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )
          })}
        </View>

        {/* Info Note */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Why verify?</Text>
          <Text style={styles.infoText}>
            Verified profiles receive 3x more responses from potential roommates. Verifications are powered by Certn and require a web browser to complete.
          </Text>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  scoreCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
  },
  scoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 2,
  },
  scoreLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  scoreDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 20,
  },
  separator: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginLeft: 62,
  },
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  verificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 12,
  },
  verificationInfo: {
    flex: 1,
  },
  verificationLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0f172a',
    marginBottom: 2,
  },
  verificationStatus: {
    fontSize: 13,
    fontWeight: '500',
  },
  verifyWebButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  verifyWebButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  bottomPadding: {
    height: 40,
  },
})
