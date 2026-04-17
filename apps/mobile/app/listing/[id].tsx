import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../src/lib/supabase'
import { useAuth } from '../../src/providers/auth-provider'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Heart,
  MapPin,
  Calendar,
  MessageCircle,
  ChevronLeft,
  Shield,
  Check,
  Dog,
  Cigarette,
  Car,
  Users,
  GraduationCap,
  Globe,
  CreditCard,
  HandHelping,
} from 'lucide-react-native'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const PHOTO_HEIGHT = 280

const TYPE_LABELS: Record<string, string> = {
  room: 'Private Room',
  shared_room: 'Shared Room',
  entire_place: 'Entire Place',
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)

  const {
    data: listing,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['listing', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*, profiles(name, profile_photo, verification_level, created_at)')
        .eq('id', id!)
        .single()

      if (error) throw error
      return data as any
    },
    enabled: !!id,
  })

  const { data: isSaved } = useQuery({
    queryKey: ['saved-listing', id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('saved_listings')
        .select('id')
        .eq('listing_id', id!)
        .eq('user_id', user!.id)
        .maybeSingle()

      return !!data
    },
    enabled: !!id && !!user,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isSaved) {
        await supabase
          .from('saved_listings')
          .delete()
          .eq('listing_id', id!)
          .eq('user_id', user!.id)
      } else {
        await supabase
          .from('saved_listings')
          .insert({ listing_id: id!, user_id: user!.id })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-listing', id, user?.id] })
    },
  })

  const messageHostMutation = useMutation({
    mutationFn: async () => {
      if (!listing || !user) throw new Error('Not ready')

      const hostId = listing.user_id

      // Check for existing conversation between these users for this listing
      const { data: existingConversations } = await supabase
        .from('conversations')
        .select('id, participant_ids')
        .contains('participant_ids', [user.id, hostId])
        .eq('listing_id', id!)

      if (existingConversations && existingConversations.length > 0) {
        return existingConversations[0].id
      }

      // Create a new conversation
      const { data: newConversation, error } = await supabase
        .from('conversations')
        .insert({
          participant_ids: [user.id, hostId],
          listing_id: id!,
        })
        .select('id')
        .single()

      if (error) throw error
      return newConversation.id
    },
    onSuccess: () => {
      // Navigate to messages tab
      router.push('/(tabs)/messages')
    },
    onError: (err) => {
      Alert.alert('Error', 'Could not start conversation. Please try again.')
    },
  })

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x
    const index = Math.round(offsetX / SCREEN_WIDTH)
    setActivePhotoIndex(index)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-CA', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatMemberSince = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-CA', {
      month: 'long',
      year: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading listing...</Text>
        </SafeAreaView>
      </>
    )
  }

  if (error || !listing) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.centered}>
          <Text style={styles.errorText}>
            Failed to load listing. Please try again.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </>
    )
  }

  const photos: string[] = listing.photos ?? []
  const amenities: string[] = listing.amenities ?? []
  const profile = listing.profiles
  const isOwnListing = user?.id === listing.user_id

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Photo Carousel */}
          <View style={styles.photoSection}>
            {photos.length > 0 ? (
              <>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                >
                  {photos.map((photo, index) => (
                    <Image
                      key={index}
                      source={{ uri: photo }}
                      style={styles.photo}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>
                {photos.length > 1 && (
                  <View style={styles.photoIndicators}>
                    {photos.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.indicator,
                          index === activePhotoIndex && styles.indicatorActive,
                        ]}
                      />
                    ))}
                  </View>
                )}
              </>
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderText}>No photos</Text>
              </View>
            )}

            {/* Back button overlay */}
            <TouchableOpacity
              style={styles.navBackButton}
              onPress={() => router.back()}
            >
              <ChevronLeft color="#0f172a" size={24} />
            </TouchableOpacity>

            {/* Save button overlay */}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              <Heart
                color={isSaved ? '#ef4444' : '#0f172a'}
                fill={isSaved ? '#ef4444' : 'none'}
                size={22}
              />
            </TouchableOpacity>
          </View>

          {/* Header Info */}
          <View style={styles.content}>
            <View style={styles.headerRow}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>
                  {TYPE_LABELS[listing.type] ?? listing.type}
                </Text>
              </View>
            </View>

            <Text style={styles.title}>{listing.title}</Text>

            <View style={styles.locationRow}>
              <MapPin color="#64748b" size={16} />
              <Text style={styles.locationText}>
                {listing.city}, {listing.province}
              </Text>
            </View>

            <Text style={styles.price}>
              ${listing.price?.toLocaleString()}{' '}
              <Text style={styles.priceUnit}>/month</Text>
            </Text>

            {listing.utilities_included && (
              <Text style={styles.utilitiesNote}>Utilities included</Text>
            )}

            <View style={styles.availableRow}>
              <Calendar color="#64748b" size={16} />
              <Text style={styles.availableText}>
                Available {formatDate(listing.available_date)}
              </Text>
            </View>

            {/* Description */}
            {listing.description && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.descriptionText}>{listing.description}</Text>
              </View>
            )}

            {/* Amenities */}
            {amenities.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Amenities</Text>
                <View style={styles.chipContainer}>
                  {amenities.map((amenity, index) => (
                    <View key={index} style={styles.chip}>
                      <Text style={styles.chipText}>{amenity}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Preferences & Features */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Features</Text>
              <View style={styles.featuresList}>
                {listing.newcomer_friendly && (
                  <View style={styles.featureRow}>
                    <Globe color="#2563eb" size={18} />
                    <Text style={styles.featureText}>Newcomer Friendly</Text>
                  </View>
                )}
                {listing.no_credit_history_ok && (
                  <View style={styles.featureRow}>
                    <CreditCard color="#2563eb" size={18} />
                    <Text style={styles.featureText}>No Credit History OK</Text>
                  </View>
                )}
                {listing.ideal_for_students && (
                  <View style={styles.featureRow}>
                    <GraduationCap color="#2563eb" size={18} />
                    <Text style={styles.featureText}>Ideal for Students</Text>
                  </View>
                )}
                {listing.pets_allowed && (
                  <View style={styles.featureRow}>
                    <Dog color="#2563eb" size={18} />
                    <Text style={styles.featureText}>Pets Allowed</Text>
                  </View>
                )}
                {listing.smoking_allowed && (
                  <View style={styles.featureRow}>
                    <Cigarette color="#64748b" size={18} />
                    <Text style={styles.featureText}>Smoking Allowed</Text>
                  </View>
                )}
                {listing.parking_included && (
                  <View style={styles.featureRow}>
                    <Car color="#2563eb" size={18} />
                    <Text style={styles.featureText}>Parking Included</Text>
                  </View>
                )}
                {listing.help_needed && (
                  <View style={styles.featureRow}>
                    <HandHelping color="#2563eb" size={18} />
                    <Text style={styles.featureText}>Help Exchange Available</Text>
                  </View>
                )}
                {listing.bathroom_type && (
                  <View style={styles.featureRow}>
                    <Check color="#2563eb" size={18} />
                    <Text style={styles.featureText}>
                      {listing.bathroom_type.charAt(0).toUpperCase() +
                        listing.bathroom_type.slice(1)}{' '}
                      Bathroom
                    </Text>
                  </View>
                )}
                {listing.roommate_gender_preference &&
                  listing.roommate_gender_preference !== 'any' && (
                    <View style={styles.featureRow}>
                      <Users color="#64748b" size={18} />
                      <Text style={styles.featureText}>
                        Prefers{' '}
                        {listing.roommate_gender_preference.charAt(0).toUpperCase() +
                          listing.roommate_gender_preference.slice(1)}{' '}
                        Roommates
                      </Text>
                    </View>
                  )}
              </View>
            </View>

            {/* Host Info Card */}
            {profile && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Your Host</Text>
                <View style={styles.hostCard}>
                  <View style={styles.hostInfo}>
                    {profile.profile_photo ? (
                      <Image
                        source={{ uri: profile.profile_photo }}
                        style={styles.hostPhoto}
                      />
                    ) : (
                      <View style={styles.hostPhotoPlaceholder}>
                        <Text style={styles.hostPhotoPlaceholderText}>
                          {(profile.name ?? 'U').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.hostDetails}>
                      <Text style={styles.hostName}>
                        {profile.name ?? 'Unknown Host'}
                      </Text>
                      <View style={styles.verificationRow}>
                        {profile.verification_level === 'verified' ||
                        profile.verification_level === 'trusted' ? (
                          <>
                            <Shield color="#16a34a" size={14} />
                            <Text style={styles.verifiedText}>
                              {profile.verification_level === 'trusted'
                                ? 'Trusted'
                                : 'Verified'}
                            </Text>
                          </>
                        ) : (
                          <Text style={styles.unverifiedText}>Basic Member</Text>
                        )}
                      </View>
                      {profile.created_at && (
                        <Text style={styles.memberSince}>
                          Member since {formatMemberSince(profile.created_at)}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Spacer for bottom buttons */}
            <View style={{ height: 100 }} />
          </View>
        </ScrollView>

        {/* Bottom Action Bar */}
        {!isOwnListing && (
          <View style={styles.bottomBar}>
            <View style={styles.bottomBarPrice}>
              <Text style={styles.bottomBarPriceText}>
                ${listing.price?.toLocaleString()}
              </Text>
              <Text style={styles.bottomBarPriceUnit}>/month</Text>
            </View>
            <TouchableOpacity
              style={styles.messageButton}
              onPress={() => messageHostMutation.mutate()}
              disabled={messageHostMutation.isPending}
            >
              <MessageCircle color="#ffffff" size={18} />
              <Text style={styles.messageButtonText}>
                {messageHostMutation.isPending ? 'Starting...' : 'Message Host'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  errorText: {
    fontSize: 15,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },

  // Photo Section
  photoSection: {
    position: 'relative',
    height: PHOTO_HEIGHT,
    backgroundColor: '#e2e8f0',
  },
  photo: {
    width: SCREEN_WIDTH,
    height: PHOTO_HEIGHT,
  },
  photoPlaceholder: {
    width: SCREEN_WIDTH,
    height: PHOTO_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
  },
  photoPlaceholderText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  photoIndicators: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  indicatorActive: {
    backgroundColor: '#ffffff',
    width: 20,
  },
  navBackButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Content
  content: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  typeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 15,
    color: '#64748b',
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 4,
  },
  priceUnit: {
    fontSize: 16,
    fontWeight: '400',
    color: '#64748b',
  },
  utilitiesNote: {
    fontSize: 13,
    color: '#16a34a',
    fontWeight: '500',
    marginBottom: 8,
  },
  availableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 4,
  },
  availableText: {
    fontSize: 14,
    color: '#64748b',
  },

  // Sections
  section: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
  },

  // Amenities chips
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipText: {
    fontSize: 14,
    color: '#334155',
  },

  // Features
  featuresList: {
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 15,
    color: '#334155',
  },

  // Host Card
  hostCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
  },
  hostPhotoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  hostPhotoPlaceholderText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  hostDetails: {
    flex: 1,
  },
  hostName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  verifiedText: {
    fontSize: 13,
    color: '#16a34a',
    fontWeight: '500',
  },
  unverifiedText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  memberSince: {
    fontSize: 13,
    color: '#94a3b8',
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingBottom: 28,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomBarPrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bottomBarPriceText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  bottomBarPriceUnit: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 2,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  messageButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
})
