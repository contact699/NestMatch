'use client'

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'

interface AgreementPDFProps {
  title: string
  address: string
  province: string
  moveInDate: string
  roommates: string[]
  clauses: {
    title: string
    content: string
  }[]
  generatedAt: string
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 11,
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 24,
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  paragraph: {
    textAlign: 'justify',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  infoLabel: {
    fontWeight: 'bold',
    width: 100,
  },
  infoValue: {
    flex: 1,
  },
  roommateList: {
    marginLeft: 16,
  },
  roommateItem: {
    marginBottom: 4,
  },
  clauseContainer: {
    marginBottom: 16,
  },
  clauseTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  clauseContent: {
    textAlign: 'justify',
    marginBottom: 8,
  },
  signaturesContainer: {
    marginTop: 24,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  signatureBlock: {
    width: '45%',
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#000000',
    paddingTop: 4,
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 9,
    color: '#666666',
  },
  disclaimer: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#f0f0f0',
  },
  disclaimerText: {
    fontSize: 9,
    color: '#666666',
    textAlign: 'justify',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#999999',
  },
})

export function AgreementPDF({
  title,
  address,
  province,
  moveInDate,
  roommates,
  clauses,
  generatedAt,
}: AgreementPDFProps) {
  // Limit signatures to max 4 roommates
  const signatureRoommates = roommates.slice(0, 4)

  // Create pairs for signature rows (2 signatures per row)
  const signaturePairs: string[][] = []
  for (let i = 0; i < signatureRoommates.length; i += 2) {
    signaturePairs.push(signatureRoommates.slice(i, i + 2))
  }

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>Roommate Agreement</Text>
        </View>

        {/* Property Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Address:</Text>
            <Text style={styles.infoValue}>{address}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Province:</Text>
            <Text style={styles.infoValue}>{province}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Move-in Date:</Text>
            <Text style={styles.infoValue}>{moveInDate}</Text>
          </View>
        </View>

        {/* Roommates Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Roommates</Text>
          <View style={styles.roommateList}>
            {roommates.map((roommate, index) => (
              <Text key={index} style={styles.roommateItem}>
                • {roommate}
              </Text>
            ))}
          </View>
        </View>

        {/* Clauses Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agreement Clauses</Text>
          {clauses.map((clause, index) => (
            <View key={index} style={styles.clauseContainer}>
              <Text style={styles.clauseTitle}>
                {index + 1}. {clause.title}
              </Text>
              <Text style={styles.clauseContent}>{clause.content}</Text>
            </View>
          ))}
        </View>

        {/* Signatures Section */}
        <View style={styles.signaturesContainer}>
          <Text style={styles.sectionTitle}>Signatures</Text>
          <Text style={styles.paragraph}>
            By signing below, each roommate agrees to abide by the terms outlined in this agreement.
          </Text>
          {signaturePairs.map((pair, pairIndex) => (
            <View key={pairIndex} style={styles.signatureRow}>
              {pair.map((roommate, index) => (
                <View key={index} style={styles.signatureBlock}>
                  <View style={styles.signatureLine}>
                    <Text>{roommate}</Text>
                  </View>
                  <Text style={styles.signatureLabel}>Signature</Text>
                  <View style={{ marginTop: 16 }}>
                    <View style={styles.signatureLine}>
                      <Text> </Text>
                    </View>
                    <Text style={styles.signatureLabel}>Date</Text>
                  </View>
                </View>
              ))}
              {pair.length === 1 && <View style={styles.signatureBlock} />}
            </View>
          ))}
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            DISCLAIMER: This roommate agreement is provided for informational purposes only and does not constitute legal advice.
            This document is not a legally binding contract unless signed and witnessed according to the laws of your jurisdiction.
            NestMatch recommends consulting with a qualified legal professional for advice specific to your situation.
            NestMatch is not responsible for any disputes arising from the use of this agreement.
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Generated on {generatedAt} via NestMatch
        </Text>
      </Page>
    </Document>
  )
}
