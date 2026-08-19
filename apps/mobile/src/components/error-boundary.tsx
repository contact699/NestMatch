import { Component, type ReactNode } from 'react'
import { ScrollView, Text, TouchableOpacity, View, StyleSheet } from 'react-native'

// Catches any JS error thrown during render of the children tree.
//
// In development it renders the error message + stack on-screen, so a crash on
// the preview APK is visible without needing adb logcat. In a release build it
// renders a friendly card instead — a raw stack trace on a red-on-black screen
// is both a bad experience and an App Store review risk.

interface State {
  error: Error | null
  info: { componentStack?: string | null } | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, info: null }

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null }
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    this.setState({ error, info })
  }

  reset = () => {
    this.setState({ error: null, info: null })
  }

  render() {
    const { error, info } = this.state
    if (!error) return this.props.children

    if (!__DEV__) {
      return (
        <View style={styles.friendlyContainer}>
          <View style={styles.friendlyCard}>
            <Text style={styles.friendlyTitle}>Something went wrong</Text>
            <Text style={styles.friendlyBody}>
              NestMatch ran into an unexpected problem. Try again, or restart the app if the
              problem keeps happening.
            </Text>
            <TouchableOpacity style={styles.friendlyButton} onPress={this.reset}>
              <Text style={styles.friendlyButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        </View>
      )
    }

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Something crashed at startup</Text>
        <Text style={styles.label}>Error</Text>
        <Text style={styles.body}>
          {error.name}: {error.message}
        </Text>
        {error.stack ? (
          <>
            <Text style={styles.label}>Stack</Text>
            <Text style={styles.body}>{error.stack}</Text>
          </>
        ) : null}
        {info?.componentStack ? (
          <>
            <Text style={styles.label}>Component stack</Text>
            <Text style={styles.body}>{info.componentStack}</Text>
          </>
        ) : null}
      </ScrollView>
    )
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  content: { padding: 24, paddingTop: 64 },
  title: { color: '#ff6b6b', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  label: { color: '#888', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 16, marginBottom: 4, textTransform: 'uppercase' },
  body: { color: '#eee', fontSize: 12, fontFamily: 'monospace' },

  friendlyContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    padding: 24,
  },
  friendlyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 24,
  },
  friendlyTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  friendlyBody: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 20 },
  friendlyButton: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  friendlyButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
})
