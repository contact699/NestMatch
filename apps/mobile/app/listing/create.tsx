import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../src/lib/supabase'
import { useAuth } from '../../src/providers/auth-provider'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronLeft, Camera } from 'lucide-react-native'

type ListingType = 'room' | 'shared_room' | 'entire_place'

type FormData = {
  type: ListingType
  title: string
  description: string
  price: string
  city: string
  province: string
  available_date: string
  amenities: string[]
  newcomer_friendly: boolean
  pets_allowed: boolean
  smoking_allowed: boolean
  parking_included: boolean
  ideal_for_students: boolean
  no_credit_history_ok: boolean
  utilities_included: boolean
}

const INITIAL_FORM: FormData = {
  type: 'room',
  title: '',
  description: '',
  price: '',
  city: '',
  province: '',
  available_date: '',
  amenities: [],
  newcomer_friendly: false,
  pets_allowed: false,
  smoking_allowed: false,
  parking_included: false,
  ideal_for_students: false,
  no_credit_history_ok: false,
  utilities_included: false,
}

const LISTING_TYPES: { value: ListingType; label: string; description: string }[] = [
  { value: 'room', label: 'Private Room', description: 'A private room in a shared home' },
  { value: 'shared_room', label: 'Shared Room', description: 'A shared room with roommates' },
  { value: 'entire_place', label: 'Entire Place', description: 'An entire apartment or house' },
]

const AMENITIES = [
  'WiFi',
  'Laundry',
  'Kitchen',
  'Air Conditioning',
  'Heating',
  'Dishwasher',
  'Gym',
  'Pool',
  'Balcony',
  'Furnished',
  'Storage',
  'Elevator',
]

const PROVINCES = [
  'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT',
]

const TOTAL_STEPS = 4

export default function CreateListingScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>(INITIAL_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
  }

  const toggleAmenity = (amenity: string) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }))
  }

  const togglePreference = (key: keyof FormData) => {
    setForm((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const validateStep = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}

    if (step === 1) {
      if (!form.title.trim()) newErrors.title = 'Title is required'
      if (form.title.trim().length > 0 && form.title.trim().length < 5)
        newErrors.title = 'Title must be at least 5 characters'
    }

    if (step === 2) {
      if (!form.price.trim()) newErrors.price = 'Price is required'
      else if (isNaN(Number(form.price)) || Number(form.price) <= 0)
        newErrors.price = 'Price must be a positive number'
      if (!form.city.trim()) newErrors.city = 'City is required'
      if (!form.province.trim()) newErrors.province = 'Province is required'
      if (!form.available_date.trim())
        newErrors.available_date = 'Available date is required'
      else if (!/^\d{4}-\d{2}-\d{2}$/.test(form.available_date.trim()))
        newErrors.available_date = 'Use format YYYY-MM-DD'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep()) {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS))
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => s - 1)
    } else {
      router.back()
    }
  }

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('listings').insert({
        user_id: user.id,
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        city: form.city.trim(),
        province: form.province.trim(),
        available_date: form.available_date.trim(),
        amenities: form.amenities,
        newcomer_friendly: form.newcomer_friendly,
        pets_allowed: form.pets_allowed,
        smoking_allowed: form.smoking_allowed,
        parking_included: form.parking_included,
        ideal_for_students: form.ideal_for_students,
        no_credit_history_ok: form.no_credit_history_ok,
        utilities_included: form.utilities_included,
        photos: [],
      })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] })
      queryClient.invalidateQueries({ queryKey: ['listings-count'] })
      Alert.alert('Success', 'Your listing has been created!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ])
    },
    onError: (err) => {
      Alert.alert('Error', 'Failed to create listing. Please try again.')
    },
  })

  const handleSubmit = () => {
    if (validateStep()) {
      submitMutation.mutate()
    }
  }

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
        <View key={s} style={styles.stepRow}>
          <View
            style={[
              styles.stepDot,
              s <= step && styles.stepDotActive,
              s < step && styles.stepDotCompleted,
            ]}
          >
            <Text
              style={[
                styles.stepDotText,
                s <= step && styles.stepDotTextActive,
              ]}
            >
              {s}
            </Text>
          </View>
          {s < TOTAL_STEPS && (
            <View
              style={[
                styles.stepLine,
                s < step && styles.stepLineActive,
              ]}
            />
          )}
        </View>
      ))}
    </View>
  )

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>What are you listing?</Text>
      <Text style={styles.stepSubtitle}>
        Choose the type, add a title and description
      </Text>

      {/* Type Selection */}
      <Text style={styles.fieldLabel}>Listing Type</Text>
      {LISTING_TYPES.map((lt) => (
        <TouchableOpacity
          key={lt.value}
          style={[
            styles.typeCard,
            form.type === lt.value && styles.typeCardSelected,
          ]}
          onPress={() => updateField('type', lt.value)}
        >
          <Text
            style={[
              styles.typeCardTitle,
              form.type === lt.value && styles.typeCardTitleSelected,
            ]}
          >
            {lt.label}
          </Text>
          <Text style={styles.typeCardDescription}>{lt.description}</Text>
        </TouchableOpacity>
      ))}

      {/* Title */}
      <Text style={styles.fieldLabel}>Title</Text>
      <TextInput
        style={[styles.input, errors.title && styles.inputError]}
        placeholder="e.g. Sunny room near downtown"
        placeholderTextColor="#94a3b8"
        value={form.title}
        onChangeText={(v) => updateField('title', v)}
        maxLength={100}
      />
      {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}

      {/* Description */}
      <Text style={styles.fieldLabel}>Description (optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Describe your space, neighbourhood, what's included..."
        placeholderTextColor="#94a3b8"
        value={form.description}
        onChangeText={(v) => updateField('description', v)}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        maxLength={2000}
      />
    </View>
  )

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>Location & Price</Text>
      <Text style={styles.stepSubtitle}>
        Set your price and tell us where it is
      </Text>

      {/* Price */}
      <Text style={styles.fieldLabel}>Monthly Price (CAD)</Text>
      <TextInput
        style={[styles.input, errors.price && styles.inputError]}
        placeholder="e.g. 800"
        placeholderTextColor="#94a3b8"
        value={form.price}
        onChangeText={(v) => updateField('price', v.replace(/[^0-9.]/g, ''))}
        keyboardType="numeric"
      />
      {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}

      {/* City */}
      <Text style={styles.fieldLabel}>City</Text>
      <TextInput
        style={[styles.input, errors.city && styles.inputError]}
        placeholder="e.g. Toronto"
        placeholderTextColor="#94a3b8"
        value={form.city}
        onChangeText={(v) => updateField('city', v)}
      />
      {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}

      {/* Province */}
      <Text style={styles.fieldLabel}>Province</Text>
      <View style={styles.provinceContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {PROVINCES.map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.provinceChip,
                form.province === p && styles.provinceChipSelected,
              ]}
              onPress={() => updateField('province', p)}
            >
              <Text
                style={[
                  styles.provinceChipText,
                  form.province === p && styles.provinceChipTextSelected,
                ]}
              >
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {errors.province && (
        <Text style={styles.errorText}>{errors.province}</Text>
      )}

      {/* Available Date */}
      <Text style={styles.fieldLabel}>Available Date</Text>
      <TextInput
        style={[styles.input, errors.available_date && styles.inputError]}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#94a3b8"
        value={form.available_date}
        onChangeText={(v) => updateField('available_date', v)}
        maxLength={10}
      />
      {errors.available_date && (
        <Text style={styles.errorText}>{errors.available_date}</Text>
      )}

      {/* Utilities */}
      <TouchableOpacity
        style={styles.toggleRow}
        onPress={() => togglePreference('utilities_included')}
      >
        <Text style={styles.toggleLabel}>Utilities included in rent</Text>
        <View
          style={[
            styles.toggleSwitch,
            form.utilities_included && styles.toggleSwitchActive,
          ]}
        >
          <View
            style={[
              styles.toggleThumb,
              form.utilities_included && styles.toggleThumbActive,
            ]}
          />
        </View>
      </TouchableOpacity>
    </View>
  )

  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>Amenities & Preferences</Text>
      <Text style={styles.stepSubtitle}>
        What does your space offer?
      </Text>

      {/* Amenities */}
      <Text style={styles.fieldLabel}>Amenities</Text>
      <View style={styles.chipGrid}>
        {AMENITIES.map((amenity) => (
          <TouchableOpacity
            key={amenity}
            style={[
              styles.amenityChip,
              form.amenities.includes(amenity) && styles.amenityChipSelected,
            ]}
            onPress={() => toggleAmenity(amenity)}
          >
            <Text
              style={[
                styles.amenityChipText,
                form.amenities.includes(amenity) &&
                  styles.amenityChipTextSelected,
              ]}
            >
              {amenity}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Preferences */}
      <Text style={[styles.fieldLabel, { marginTop: 24 }]}>Preferences</Text>

      <TouchableOpacity
        style={styles.toggleRow}
        onPress={() => togglePreference('newcomer_friendly')}
      >
        <Text style={styles.toggleLabel}>Newcomer Friendly</Text>
        <View
          style={[
            styles.toggleSwitch,
            form.newcomer_friendly && styles.toggleSwitchActive,
          ]}
        >
          <View
            style={[
              styles.toggleThumb,
              form.newcomer_friendly && styles.toggleThumbActive,
            ]}
          />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.toggleRow}
        onPress={() => togglePreference('pets_allowed')}
      >
        <Text style={styles.toggleLabel}>Pets Allowed</Text>
        <View
          style={[
            styles.toggleSwitch,
            form.pets_allowed && styles.toggleSwitchActive,
          ]}
        >
          <View
            style={[
              styles.toggleThumb,
              form.pets_allowed && styles.toggleThumbActive,
            ]}
          />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.toggleRow}
        onPress={() => togglePreference('smoking_allowed')}
      >
        <Text style={styles.toggleLabel}>Smoking Allowed</Text>
        <View
          style={[
            styles.toggleSwitch,
            form.smoking_allowed && styles.toggleSwitchActive,
          ]}
        >
          <View
            style={[
              styles.toggleThumb,
              form.smoking_allowed && styles.toggleThumbActive,
            ]}
          />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.toggleRow}
        onPress={() => togglePreference('parking_included')}
      >
        <Text style={styles.toggleLabel}>Parking Included</Text>
        <View
          style={[
            styles.toggleSwitch,
            form.parking_included && styles.toggleSwitchActive,
          ]}
        >
          <View
            style={[
              styles.toggleThumb,
              form.parking_included && styles.toggleThumbActive,
            ]}
          />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.toggleRow}
        onPress={() => togglePreference('ideal_for_students')}
      >
        <Text style={styles.toggleLabel}>Ideal for Students</Text>
        <View
          style={[
            styles.toggleSwitch,
            form.ideal_for_students && styles.toggleSwitchActive,
          ]}
        >
          <View
            style={[
              styles.toggleThumb,
              form.ideal_for_students && styles.toggleThumbActive,
            ]}
          />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.toggleRow}
        onPress={() => togglePreference('no_credit_history_ok')}
      >
        <Text style={styles.toggleLabel}>No Credit History OK</Text>
        <View
          style={[
            styles.toggleSwitch,
            form.no_credit_history_ok && styles.toggleSwitchActive,
          ]}
        >
          <View
            style={[
              styles.toggleThumb,
              form.no_credit_history_ok && styles.toggleThumbActive,
            ]}
          />
        </View>
      </TouchableOpacity>
    </View>
  )

  const renderStep4 = () => (
    <View>
      <Text style={styles.stepTitle}>Photos</Text>
      <Text style={styles.stepSubtitle}>
        Add photos of your space to attract more interest
      </Text>

      <TouchableOpacity style={styles.photoUploadArea}>
        <Camera color="#94a3b8" size={40} />
        <Text style={styles.photoUploadText}>Tap to add photos</Text>
        <Text style={styles.photoUploadHint}>
          Photo upload coming soon. You can add photos later from the web app.
        </Text>
      </TouchableOpacity>

      {/* Review Summary */}
      <View style={styles.reviewSection}>
        <Text style={styles.fieldLabel}>Review Your Listing</Text>

        <View style={styles.reviewCard}>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Type</Text>
            <Text style={styles.reviewValue}>
              {LISTING_TYPES.find((t) => t.value === form.type)?.label}
            </Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Title</Text>
            <Text style={styles.reviewValue}>{form.title}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Price</Text>
            <Text style={styles.reviewValue}>${form.price}/month</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Location</Text>
            <Text style={styles.reviewValue}>
              {form.city}, {form.province}
            </Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Available</Text>
            <Text style={styles.reviewValue}>{form.available_date}</Text>
          </View>
          {form.amenities.length > 0 && (
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Amenities</Text>
              <Text style={styles.reviewValue}>
                {form.amenities.join(', ')}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  )

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleBack} style={styles.topBarBack}>
            <ChevronLeft color="#0f172a" size={24} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Create Listing</Text>
          <View style={{ width: 40 }} />
        </View>

        {renderStepIndicator()}

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={100}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          {step > 1 && (
            <TouchableOpacity style={styles.backNavButton} onPress={handleBack}>
              <Text style={styles.backNavButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          <View style={styles.flex} />
          {step < TOTAL_STEPS ? (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.submitButton,
                submitMutation.isPending && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Create Listing</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </>
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

  // Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  topBarBack: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0f172a',
  },

  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 40,
    backgroundColor: '#ffffff',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: '#2563eb',
  },
  stepDotCompleted: {
    backgroundColor: '#2563eb',
  },
  stepDotText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  stepDotTextActive: {
    color: '#ffffff',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#2563eb',
  },

  // Scroll Content
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Step Headers
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 24,
    lineHeight: 22,
  },

  // Fields
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#0f172a',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  textArea: {
    minHeight: 100,
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    marginTop: 4,
  },

  // Type Cards
  typeCard: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  typeCardSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  typeCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  typeCardTitleSelected: {
    color: '#2563eb',
  },
  typeCardDescription: {
    fontSize: 14,
    color: '#64748b',
  },

  // Province Chips
  provinceContainer: {
    marginBottom: 4,
  },
  provinceChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  provinceChipSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  provinceChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  provinceChipTextSelected: {
    color: '#ffffff',
  },

  // Amenity Chips
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  amenityChipSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  amenityChipText: {
    fontSize: 14,
    color: '#334155',
  },
  amenityChipTextSelected: {
    color: '#2563eb',
    fontWeight: '500',
  },

  // Toggle Rows
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  toggleLabel: {
    fontSize: 15,
    color: '#334155',
    flex: 1,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleSwitchActive: {
    backgroundColor: '#2563eb',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },

  // Photo Upload
  photoUploadArea: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoUploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  photoUploadHint: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },

  // Review Section
  reviewSection: {
    marginTop: 8,
  },
  reviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  reviewLabel: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
    flex: 2,
    textAlign: 'right',
  },

  // Bottom Navigation
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  backNavButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  backNavButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  nextButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 160,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
})
