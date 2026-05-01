import React from 'react'
import path from 'path'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { DevisWithRelations, FactureWithRelations } from '@/lib/supabase/types'
import { SALON } from '@/lib/salon-info'

const GOLD  = '#C9A96E'
const DARK  = '#1a1a1a'
const GRAY  = '#666666'
const LIGHT = '#f9f6f2'
const LINE  = '#e8e0d6'

const LOGO_PATH = path.join(process.cwd(), 'public', 'logo-black.png')

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: DARK,
    paddingTop: 36,
    paddingBottom: 52,
    paddingHorizontal: 40,
    backgroundColor: '#ffffff',
  },

  // ── Header ──────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  logo: {
    width: 110,
    height: 48,
    objectFit: 'contain',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  docType: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: GOLD,
    marginBottom: 4,
    letterSpacing: 2,
  },
  refRow: { flexDirection: 'row', gap: 6, marginTop: 3 },
  refLabel: { color: GRAY },
  refValue: { fontFamily: 'Helvetica-Bold' },

  // ── Salon + Client ───────────────────────────────────────
  partiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 16,
  },
  partyBox: {
    flex: 1,
    backgroundColor: LIGHT,
    padding: 10,
    borderRadius: 3,
    borderLeftWidth: 2,
    borderLeftColor: GOLD,
  },
  partyLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: GOLD,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
  },
  partyName: { fontFamily: 'Helvetica-Bold', fontSize: 10, marginBottom: 2 },
  partyLine: { color: GRAY, marginBottom: 1 },

  // ── Table ────────────────────────────────────────────────
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: GOLD,
    padding: '5 8',
  },
  tableRow: {
    flexDirection: 'row',
    padding: '6 8',
    borderBottomWidth: 0.5,
    borderBottomColor: LINE,
  },
  tableRowAlt: {
    flexDirection: 'row',
    padding: '6 8',
    backgroundColor: LIGHT,
    borderBottomWidth: 0.5,
    borderBottomColor: LINE,
  },
  thText: { color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 8 },
  colDesc:  { flex: 4 },
  colQty:   { flex: 1, textAlign: 'center' },
  colPrice: { flex: 2, textAlign: 'right' },
  colTva:   { flex: 1, textAlign: 'center' },
  colTotal: { flex: 2, textAlign: 'right' },

  // ── Totals ───────────────────────────────────────────────
  totalsSection: { alignItems: 'flex-end', marginTop: 14, marginBottom: 16 },
  totalsRow: {
    flexDirection: 'row',
    width: 260,
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalsLabel: { color: GRAY },
  totalsValue: {},
  totalsTTCRow: {
    flexDirection: 'row',
    width: 260,
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 7,
    borderTopWidth: 1.5,
    borderTopColor: GOLD,
  },
  totalsTTCLabel: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: GOLD },
  totalsTTCValue: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: GOLD },

  // ── Info box (notes / validity / payment) ────────────────
  infoBox: {
    backgroundColor: LIGHT,
    padding: 10,
    marginBottom: 14,
    borderRadius: 3,
  },
  infoLabel: { fontFamily: 'Helvetica-Bold', marginBottom: 4, color: DARK },
  infoText:  { color: GRAY },

  // ── Footer ───────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: LINE,
    paddingTop: 7,
  },
  footerText: { color: GRAY, fontSize: 7.5 },
})

function fmtAmount(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MAD'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR')
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', sent: 'Envoyé', accepted: 'Accepté',
  rejected: 'Refusé', expired: 'Expiré', paid: 'Payée', cancelled: 'Annulée',
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Espèces', card: 'Carte bancaire', transfer: 'Virement',
}

interface Props {
  doc: DevisWithRelations | FactureWithRelations
  type: 'devis' | 'facture'
}

export function DocumentTemplate({ doc, type }: Props) {
  const isFacture = type === 'facture'
  const facture = isFacture ? (doc as FactureWithRelations) : null
  const devis   = !isFacture ? (doc as DevisWithRelations) : null

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ── Header: logo left / doc type + ref right ── */}
        <View style={styles.headerRow}>
          <Image src={LOGO_PATH} style={styles.logo} />
          <View style={styles.headerRight}>
            <Text style={styles.docType}>{isFacture ? 'FACTURE' : 'DEVIS'}</Text>
            <View style={styles.refRow}>
              <Text style={styles.refLabel}>Réf :</Text>
              <Text style={styles.refValue}>{doc.number}</Text>
            </View>
            <View style={styles.refRow}>
              <Text style={styles.refLabel}>Date :</Text>
              <Text>{fmtDate(doc.created_at)}</Text>
            </View>
            <View style={styles.refRow}>
              <Text style={styles.refLabel}>Statut :</Text>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>{STATUS_LABELS[doc.status] ?? doc.status}</Text>
            </View>
            {devis?.valid_until && (
              <View style={styles.refRow}>
                <Text style={styles.refLabel}>Valable jusqu'au :</Text>
                <Text>{fmtDate(devis.valid_until)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Salon + Client side by side ── */}
        <View style={styles.partiesRow}>
          {/* Salon */}
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Émetteur</Text>
            <Text style={styles.partyName}>{SALON.name}</Text>
            <Text style={styles.partyLine}>{SALON.address}</Text>
            <Text style={styles.partyLine}>Tél : {SALON.phone}</Text>
            {SALON.email ? <Text style={styles.partyLine}>{SALON.email}</Text> : null}
            {SALON.ice   ? <Text style={styles.partyLine}>ICE : {SALON.ice}</Text> : null}
            {SALON.if_   ? <Text style={styles.partyLine}>IF : {SALON.if_}</Text>  : null}
            {SALON.rc    ? <Text style={styles.partyLine}>RC : {SALON.rc}</Text>   : null}
          </View>

          {/* Client */}
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Client</Text>
            <Text style={styles.partyName}>{doc.clients.name}</Text>
            {doc.clients.phone ? <Text style={styles.partyLine}>Tél : {doc.clients.phone}</Text> : null}
            {doc.clients.email ? <Text style={styles.partyLine}>{doc.clients.email}</Text> : null}
          </View>
        </View>

        {/* ── Items table ── */}
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

        {/* ── Totals ── */}
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

        {/* ── Info box: notes / payment ── */}
        {(doc.notes || facture?.paid_at) ? (
          <View style={styles.infoBox}>
            {doc.notes ? (
              <>
                <Text style={styles.infoLabel}>Notes</Text>
                <Text style={styles.infoText}>{doc.notes}</Text>
              </>
            ) : null}
            {facture?.paid_at ? (
              <Text style={{ ...styles.infoText, marginTop: doc.notes ? 8 : 0 }}>
                {'Payée le '}
                {fmtDate(facture.paid_at)}
                {facture.payment_method ? ` — ${PAYMENT_LABELS[facture.payment_method] ?? facture.payment_method}` : ''}
                {facture.paid_amount != null ? ` — ${fmtAmount(Number(facture.paid_amount))}` : ''}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Merci de votre confiance — {SALON.name} — {SALON.phone}</Text>
          <Text style={styles.footerText}>{doc.number}</Text>
        </View>

      </Page>
    </Document>
  )
}
