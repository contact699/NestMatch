import { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronLeft } from 'lucide-react-native'
import { useAuth } from '../src/providers/auth-provider'
import { supabase } from '../src/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

type ProfileFields = {
  name: string
  bio: string
  occupation: string
  city: string
  province: string
  phone: string
}

export default function EditProfileScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fields, setFields] = useState<ProfileFields>({
    name: '',
    bio: '',
    occupation: '',
    city: '',
    province: '',
    phone: '',
  })

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('name, bio, occupation, city, province, phone')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          Alert.alert('Error', 'Failed to load profile.')
        } else if (data) {
          setFields({
            name: (data as Record<string, unknown>).name as string ?? '',
            bio: (data as Record<string, unknown>).bio as string ?? '',
            occupation: (data as Record<string, unknown>).occupation as string ?? '',
            city: (data as Record<string, unknown>).city as string ?? '',
            province: (data as Record<string, unknown>).province as string ?? '',
            phone: (data as Record<string, unknown>).phone as string ?? '',
          })
        }
        setLoading(false)
      })
  }, [user])

  const updateField = (key: keyof ProfileFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        name: fields.name || null,
        bio: fields.bio || null,
        occupation: fields.occupation || null,
        city: fields.city || null,
        province: fields.province || null,
        phone: fields.phone || null,
      } as Record<string, unknown>)
      .eq('id', user.id)

    setSaving(false)
    if (error) {
      Alert.alert('Error', 'Failed to save profile. Please try again.')
    } else {
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] })
      Alert.alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ])
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft color="#0f172a" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    )
  }

  const fieldConfig: { key: keyof ProfileFields; label: string; placeholder: string; multiline?: boolean }[] = [
    { key: 'name', label: 'Name', placeholder: 'Your full name' },
    { key: 'bio', label: 'Bio', placeholder: 'Tell others about yourself...', multiline: true },
    { key: 'occupation', label: 'Occupation', placeholder: 'e.g. Software Developer' },
    { key: 'city', label: 'City', placeholder: 'e.g. Toronto' },
    { key: 'province', label: 'Province', placeholder: 'e.g. Ontario' },
    { key: 'phone', label: 'Phone', placeholder: 'e.g. +1 (416) 555-0123' },
  ]

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color="#0f172a" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {fieldConfig.map(({ key, label, placeholder, multiline }) => (
            <View key={key} style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{label}</Text>
              <TextInput
                style={[styles.input, multiline && styles.inputMultiline]}
                value={fields[key]}
                onChangeText={(v) => updateField(key, v)}
                placeholder={placeholder}
                placeholderTextColor="#94a3b8"
                multiline={multiline}
                textAlignVertical={multiline ? 'top' : 'center'}
                autoCapitalize={key === 'phone' ? 'none' : 'words'}
                keyboardType={key === 'phone' ? 'phone-pad' : 'default'}
              />
            </View>
          ))}

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  flex: {
    flex: 1,
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
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0f172a',
  },
  inputMultiline: {
    minHeight: 100,
    paddingTop: 14,
  },
  saveButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
})
