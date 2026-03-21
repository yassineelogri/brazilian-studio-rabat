import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { DevisWithRelations, FactureWithRelations } from '@/lib/supabase/types'

const PINK = '#B76E79'
const DARK = '#1a1a1a'
const GRAY = '#666666'
const LIGHT = '#f8f4f4'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: DARK,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
  },
  // ---- Header ----
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: PINK, marginBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  headerLeft: { flex: 1 },
  headerRight: { flex: 1, alignItems: 'flex-end' },
  companyName: { fontFamily: 'Helvetica-Bold', fontSize: 11, marginBottom: 3 },
  companyLine: { color: GRAY, marginBottom: 2 },
  refLabel: { color: GRAY },
  refValue: { fontFamily: 'Helvetica-Bold', fontSize: 10 },
  // ---- Client section ----
  clientBox: {
    backgroundColor: LIGHT,
    padding: 10,
    marginBottom: 20,
    borderRadius: 3,
  },
  clientLabel: { color: GRAY, marginBottom: 3 },
  clientName: { fontFamily: 'Helvetica-Bold', fontSize: 10 },
  clientLine: { color: GRAY },
  // ---- Table ----
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: PINK,
    padding: 6,
    marginBottom: 0,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e8dede',
  },
  tableRowAlt: {
    flexDirection: 'row',
    padding: 6,
    backgroundColor: LIGHT,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e8dede',
  },
  thText: { color: 'white', fontFamily: 'Helvetica-Bold' },
  colDesc: { flex: 4 },
  colQty: { flex: 1, textAlign: 'center' },
  colPrice: { flex: 2, textAlign: 'right' },
  colTva: { flex: 1, textAlign: 'center' },
  colTotal: { flex: 2, textAlign: 'right' },
  // ---- Totals ----
  totalsSection: { alignItems: 'flex-end', marginTop: 12, marginBottom: 16 },
  totalsRow: {
    flexDirection: 'row',
    width: 240,
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalsLabel: { color: GRAY },
  totalsValue: {},
  totalsTTCRow: {
    flexDirection: 'row',
    width: 240,
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: PINK,
  },
  totalsTTCLabel: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: PINK },
  totalsTTCValue: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: PINK },
  // ---- Notes / info ----
  notesBox: {
    backgroundColor: LIGHT,
    padding: 10,
    marginBottom: 16,
    borderRadius: 3,
  },
  notesLabel: { fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  notesText: { color: GRAY },
  // ---- Footer ----
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#e8dede',
    paddingTop: 8,
  },
  footerText: { color: GRAY, fontSize: 8 },
})

function fmtAmount(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MAD'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR')
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  accepted: 'Accepté',
  rejected: 'Refusé',
  expired: 'Expiré',
  paid: 'Payée',
  cancelled: 'Annulée',
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Espèces',
  card: 'Carte bancaire',
  transfer: 'Virement',
}

interface Props {
  doc: DevisWithRelations | FactureWithRelations
  type: 'devis' | 'facture'
}

export function DocumentTemplate({ doc, type }: Props) {
  const isFacture = type === 'facture'
  const facture = isFacture ? (doc as FactureWithRelations) : null
  const devis = !isFacture ? (doc as DevisWithRelations) : null

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Title */}
        <Text style={styles.title}>{isFacture ? 'FACTURE' : 'DEVIS'}</Text>

        {/* Header: company left, ref right */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>Brazilian Studio Rabat</Text>
            <Text style={styles.companyLine}>Rabat, Maroc</Text>
            <Text style={styles.companyLine}>Tél: +212 600 000 000</Text>
            <Text style={styles.companyLine}>ICE: 000000000000000</Text>
            <Text style={styles.companyLine}>IF: 00000000</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.refLabel}>Référence</Text>
            <Text style={styles.refValue}>{doc.number}</Text>
            <Text style={{ ...styles.refLabel, marginTop: 6 }}>Date</Text>
            <Text>{fmtDate(doc.created_at)}</Text>
            <Text style={{ ...styles.refLabel, marginTop: 6 }}>Statut</Text>
            <Text>{STATUS_LABELS[doc.status] ?? doc.status}</Text>
          </View>
        </View>

        {/* Client */}
        <View style={styles.clientBox}>
          <Text style={styles.clientLabel}>Client</Text>
          <Text style={styles.clientName}>{doc.clients.name}</Text>
          {doc.clients.phone ? <Text style={styles.clientLine}>{doc.clients.phone}</Text> : null}
          {doc.clients.email ? <Text style={styles.clientLine}>{doc.clients.email}</Text> : null}
        </View>

        {/* Items table */}
        <View style={styles.tableHeader}>
          <Text style={{ ...styles.thText, ...styles.colDesc }}>Description</Text>
          <Text style={{ ...styles.thText, ...styles.colQty }}>Qté</Text>
          <Text style={{ ...styles.thText, ...styles.colPrice }}>Prix HT</Text>
          <Text style={{ ...styles.thText, ...styles.colTva }}>TVA</Text>
          <Text style={{ ...styles.thText, ...styles.colTotal }}>Total HT</Text>
        </View>
        {doc.items.map((item, idx) => (
          <View key={item.id} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
            <Text style={styles.colDesc}>{item.description}</Text>
            <Text style={styles.colQty}>{Number(item.quantity)}</Text>
            <Text style={styles.colPrice}>{fmtAmount(Number(item.unit_price))}</Text>
            <Text style={styles.colTva}>{Number(doc.tva_rate)}%</Text>
            <Text style={styles.colTotal}>{fmtAmount(Number(item.quantity) * Number(item.unit_price))}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Sous-total HT</Text>
            <Text style={styles.totalsValue}>{fmtAmount(doc.subtotal_ht)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>TVA ({Number(doc.tva_rate)}%)</Text>
            <Text style={styles.totalsValue}>{fmtAmount(doc.tva_amount)}</Text>
          </View>
          <View style={styles.totalsTTCRow}>
            <Text style={styles.totalsTTCLabel}>Total TTC</Text>
            <Text style={styles.totalsTTCValue}>{fmtAmount(doc.total_ttc)}</Text>
          </View>
        </View>

        {/* Notes / devis validity / facture payment */}
        {(doc.notes || devis?.valid_until || facture?.paid_at) ? (
          <View style={styles.notesBox}>
            {doc.notes ? (
              <>
                <Text style={styles.notesLabel}>Notes</Text>
                <Text style={styles.notesText}>{doc.notes}</Text>
              </>
            ) : null}
            {devis?.valid_until ? (
              <Text style={{ ...styles.notesText, marginTop: doc.notes ? 8 : 0 }}>
                Ce devis est valable jusqu&apos;au {fmtDate(devis.valid_until)}.
              </Text>
            ) : null}
            {facture?.paid_at ? (
              <Text style={{ ...styles.notesText, marginTop: doc.notes ? 8 : 0 }}>
                Payée le {fmtDate(facture.paid_at)}
                {facture.payment_method ? ` — ${PAYMENT_LABELS[facture.payment_method] ?? facture.payment_method}` : ''}
                {facture.paid_amount != null ? ` — ${fmtAmount(Number(facture.paid_amount))}` : ''}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Merci de votre confiance — Brazilian Studio Rabat</Text>
          <Text style={styles.footerText}>{doc.number}</Text>
        </View>
      </Page>
    </Document>
  )
}
