import { Component, type ReactNode } from 'react'
import { ScrollView, Text, View, StyleSheet } from 'react-native'

// Catches any JS error thrown during render of the children tree and renders
// the error message + stack on-screen, so a crash on the preview APK is
// visible without needing adb logcat.

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

  render() {
    const { error, info } = this.state
    if (!error) return this.props.children

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
})
