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
  Image,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronLeft } from 'lucide-react-native'
import { useAuth } from '../src/providers/auth-provider'
import { supabase } from '../src/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'

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
  const [photoUri, setPhotoUri] = useState<string | null>(null)
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
      .select('name, bio, occupation, city, province, phone, profile_photo')
      .eq('user_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          Alert.alert('Error', 'Failed to load profile.')
        } else if (data) {
          const d = data as Record<string, unknown>
          setFields({
            name: d.name as string ?? '',
            bio: d.bio as string ?? '',
            occupation: d.occupation as string ?? '',
            city: d.city as string ?? '',
            province: d.province as string ?? '',
            phone: d.phone as string ?? '',
          })
          if (d.profile_photo) {
            setPhotoUri(d.profile_photo as string)
          }
        }
        setLoading(false)
      })
  }, [user])

  const updateField = (key: keyof ProfileFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  const pickProfilePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri)
    }
  }

  const uploadProfilePhoto = async (): Promise<string | null> => {
    if (!photoUri || !user || photoUri.startsWith('http')) return photoUri
    const ext = photoUri.split('.').pop() || 'jpg'
    const fileName = `${user.id}/${Date.now()}.${ext}`
    const response = await fetch(photoUri)
    const blob = await response.blob()
    const arrayBuffer = await new Response(blob).arrayBuffer()
    const { error } = await supabase.storage
      .from('profile-photos')
      .upload(fileName, arrayBuffer, { contentType: `image/${ext}`, upsert: true })
    if (error) return null
    const { data: urlData } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(fileName)
    return urlData.publicUrl
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    const newPhotoUrl = await uploadProfilePhoto()
    const { error } = await supabase
      .from('profiles')
      .update({
        name: fields.name || null,
        bio: fields.bio || null,
        occupation: fields.occupation || null,
        city: fields.city || null,
        province: fields.province || null,
        phone: fields.phone || null,
        profile_photo: newPhotoUrl,
      } as Record<string, unknown>)
      .eq('user_id', user.id)

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
          <TouchableOpacity onPress={pickProfilePhoto} style={{ alignItems: 'center', marginBottom: 20 }}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={{ width: 100, height: 100, borderRadius: 50 }} />
            ) : (
              <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 36, color: '#94a3b8' }}>+</Text>
              </View>
            )}
            <Text style={{ fontSize: 13, color: '#2563eb', fontWeight: '600', marginTop: 8 }}>
              Change Photo
            </Text>
          </TouchableOpacity>

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
