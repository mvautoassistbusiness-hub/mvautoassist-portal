'use client';

import Link from 'next/link';
import { Shield, ChevronRight, Printer, Download } from 'lucide-react';

// ─── types ────────────────────────────────────────────────────────────────────

export type CertData = {
  id: string;
  cert_number: string;
  customer_name: string;
  customer_dob: string | null;
  customer_mobile: string;
  customer_email: string | null;
  customer_address: string | null;
  vehicle_type: string;
  registration_no: string | null;
  make_model: string;
  variant: string | null;
  engine_no: string;
  chassis_no: string;
  fuel_type: string | null;
  manufacturing_year: number | null;
  start_date: string;
  end_date: string;
  insurance_amount: number;
  rsa_amount: number;
  total_amount: number;
  status: string;
  agent_id: string;
};

export type AgentData = {
  full_name: string;
  email: string;
  location: string | null;
};

// ─── static coverage data ─────────────────────────────────────────────────────

const COVERAGES = [
  { id: 1, title: 'Battery Check Up & Jump Start',  desc: 'A Technician to be arranged for Jumpstart',                                                                                                                    val: 'Yes' },
  { id: 2, title: 'Flat Tyre',                       desc: 'Arrange For a Technician to Repair the Puncture Tyre. The Cost of Puncture repair and all incidental charges to be borne by Customer on actual basis',       val: 'Yes' },
  { id: 3, title: 'Fuel Arrangement Assistance*',    desc: 'Arrange For a Fuel Delivery in Case Vehicle Is Out of Fuel. Fuel Cost on actual basis payable by Customer',                                                   val: 'Yes' },
  { id: 4, title: 'Relay of Urgent Messages',        desc: "Pass On Message to Rider's Friends & Family",                                                                                                                 val: 'Yes' },
  { id: 5, title: 'Vehicle Breakdown Phone Support', desc: 'Guiding The Rider On Phone about Vehicle Related Problem',                                                                                                     val: 'Yes' },
  { id: 6, title: 'Towing Assistance',               desc: 'To and fro upto-15 kms from the breakdown spot (one towing)*',                                                                                                val: 'Yes' },
  { id: 7, title: 'Number of Services',              desc: 'during a plan',                                                                                                                                                val: '1'   },
] as const;

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtYMD(d: string | null, time = '00:00') { return d ? `${d} ${time}` : '—'; }
function fmtDMY(d: string | null, time?: string) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return time ? `${day}-${m}-${y} ${time}` : `${day}-${m}-${y}`;
}
function fmtAmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n);
}

// ─── style constants (Deerika reference pattern) ─────────────────────────────

const BD   = '1px solid #ddd';
// Standard cell — used on every <td> in the main table
const C: React.CSSProperties  = { border: BD, padding: '8px 6px', verticalAlign: 'top' };
// Label cell — <th> for every field label
const TH: React.CSSProperties = { ...C, fontWeight: 700, width: 200, backgroundColor: '#f9fafb', textAlign: 'left' };
// Section banner row
const BNR: React.CSSProperties = { border: BD, padding: '6px 10px', backgroundColor: '#0f172a14', fontSize: 13, fontWeight: 600, color: '#0f172a' };
// Inner-table header cell
const ITH: React.CSSProperties = { border: BD, padding: '7px 6px', backgroundColor: '#f3f4f6', fontWeight: 700, fontSize: 13, verticalAlign: 'top', textAlign: 'left' as const };
// Inner-table body cell
const ITC: React.CSSProperties = { border: BD, padding: '7px 6px', verticalAlign: 'top', fontSize: 13 };

// ─── component ────────────────────────────────────────────────────────────────

type Props = { cert: CertData; agent: AgentData; helpline: string; backHref: string };

export default function CertificatePreview({ cert, helpline, backHref }: Props) {
  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 14, color: '#111' }}
         className="min-h-screen bg-stone-100 p-4 sm:p-8 print:bg-white print:p-0">

      {/* ── Action bar — hidden on print ──────────────────────────────────── */}
      <div className="max-w-[1000px] mx-auto mb-3 flex items-center gap-2 justify-between print:hidden">
        <Link href={backHref}
              className="flex items-center gap-2 text-sm font-semibold bg-white px-4 py-2 border border-stone-300 hover:bg-stone-50 transition-colors">
          <ChevronRight className="w-4 h-4 rotate-180" /> Back
        </Link>
        <div className="flex gap-2">
          <button onClick={() => window.print()}
                  className="flex items-center gap-2 text-sm font-semibold bg-white px-4 py-2 border border-stone-300 hover:bg-stone-50 transition-colors">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button title="Coming soon"
                  className="flex items-center gap-2 text-sm font-semibold bg-slate-900 text-white px-4 py-2 opacity-60 cursor-not-allowed">
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </div>

      {/* ── Certificate document ──────────────────────────────────────────── */}
      <div className="max-w-[1000px] mx-auto bg-white shadow-sm rounded-lg p-4">

        {/*
          Main table — 4 logical columns:
            col A (TH, 200px) | col B (TD, flex) | col C (TH, 200px) | col D (TD, flex)

          Header row uses colSpan=2 on each half.
          Banner rows use colSpan=4.
          Coverage and RSA sections use a nested <table> inside <td colSpan=4 padding=0>
          so their column widths are independent of the 200px label columns.
        */}
        <table style={{ borderCollapse: 'collapse', width: '100%', border: BD }}>
          <tbody>

            {/* ── ROW 1 : Header — logo + issuer | Bill To ─────────────── */}
            <tr>
              <td colSpan={2} style={C}>
                {/* Logo row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 40, height: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#f59e0b,#dc2626)' }}>
                    <Shield className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em', color: '#0f172a' }}>MVAUTOASSIST</div>
                    <div style={{ fontSize: 10, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Service Certificate Portal</div>
                  </div>
                </div>
                {/* Toll free */}
                <div style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>
                  Toll Free: {helpline}
                </div>
                {/* Issuer */}
                <div style={{ fontSize: 11, color: '#57534e', marginTop: 6, lineHeight: 1.6 }}>
                  <strong style={{ fontWeight: 600, color: '#374151' }}>SHREEVARDHAN SERVICES</strong><br />
                  RS No. 226/A/1, Unit No. 2, Kamabe Turf,<br />
                  Thane, Kolhapur – 416012
                </div>
              </td>

              <td colSpan={2} style={{ ...C, textAlign: 'right' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Bill To
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>{cert.customer_name}</div>
                {cert.customer_address && (
                  <div style={{ fontSize: 12, color: '#57534e', marginTop: 4, lineHeight: 1.6, maxWidth: 320, marginLeft: 'auto' }}>
                    {cert.customer_address}
                  </div>
                )}
                <div style={{ fontSize: 13, color: '#374151', marginTop: 4, fontWeight: 600 }}>{cert.customer_mobile}</div>
                {cert.customer_email && (
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{cert.customer_email}</div>
                )}
              </td>
            </tr>

            {/* ── ROW 2 : Cert No | Start Date ─────────────────────────── */}
            <tr>
              <th style={TH}>Tax Invoice / Certificate No</th>
              <td style={{ ...C, fontFamily: 'monospace', fontWeight: 600 }}>{cert.cert_number}</td>
              <th style={TH}>Certificate Start Date</th>
              <td style={C}>{fmtYMD(cert.start_date, '00:00')}</td>
            </tr>

            {/* ── ROW 3 : Customer DOB | End Date ──────────────────────── */}
            <tr>
              <th style={TH}>Customer DOB</th>
              <td style={C}>{fmtDMY(cert.customer_dob)}</td>
              <th style={TH}>Certificate End Date</th>
              <td style={C}>{fmtDMY(cert.end_date, '23:59')}</td>
            </tr>

            {/* ── ROW 4 : BANNER — Vehicle Details ──────────────────────── */}
            <tr><td colSpan={4} style={BNR}>Vehicle Details</td></tr>

            {/* ── ROW 5 : Reg No | Vehicle Type ────────────────────────── */}
            <tr>
              <th style={TH}>Registration No</th>
              <td style={C}>{cert.registration_no || 'New'}</td>
              <th style={TH}>Vehicle Type</th>
              <td style={C}>{cert.vehicle_type || '—'}</td>
            </tr>

            {/* ── ROW 6 : Make + Model | Variant ───────────────────────── */}
            <tr>
              <th style={TH}>Make and Model</th>
              <td style={C}>{cert.make_model || '—'}</td>
              <th style={TH}>Variant</th>
              <td style={C}>{cert.variant || '—'}</td>
            </tr>

            {/* ── ROW 7 : Engine No | Chassis No ───────────────────────── */}
            <tr>
              <th style={TH}>Engine No</th>
              <td style={{ ...C, fontFamily: 'monospace' }}>{cert.engine_no || '—'}</td>
              <th style={TH}>Chassis No</th>
              <td style={{ ...C, fontFamily: 'monospace' }}>{cert.chassis_no || '—'}</td>
            </tr>

            {/* ── ROW 8 : Fuel Type | Manufacturing Year ────────────────── */}
            <tr>
              <th style={TH}>Fuel Type</th>
              <td style={C}>{cert.fuel_type || '—'}</td>
              <th style={TH}>Manufacturing Year</th>
              <td style={C}>{cert.manufacturing_year?.toString() || '—'}</td>
            </tr>

            {/* ── ROW 9 : BANNER — Coverages ───────────────────────────── */}
            <tr>
              <td colSpan={4} style={BNR}>
                Coverages of Road Side Assistance — Toll Free: {helpline}
              </td>
            </tr>

            {/* ── ROW 10 : Nested coverages table ──────────────────────── */}
            <tr>
              <td colSpan={4} style={{ padding: 0 }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <colgroup>
                    <col style={{ width: '5%' }} />
                    <col style={{ width: '25%' }} />
                    <col style={{ width: '55%' }} />
                    <col style={{ width: '15%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={{ ...ITH, textAlign: 'center' }}>#</th>
                      <th style={ITH}>Featured Benefit</th>
                      <th style={ITH}>Description</th>
                      <th style={{ ...ITH, textAlign: 'center' }}>Applicable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COVERAGES.map((row, i) => (
                      <tr key={row.id} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                        <td style={{ ...ITC, textAlign: 'center', color: '#6b7280' }}>{row.id}</td>
                        <td style={{ ...ITC, fontWeight: 500 }}>{row.title}</td>
                        <td style={{ ...ITC, color: '#374151', lineHeight: 1.55 }}>{row.desc}</td>
                        <td style={{ ...ITC, textAlign: 'center', fontWeight: 700 }}>{row.val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </td>
            </tr>

            {/* ── ROW 11 : BANNER — RSA Premium Breakup ────────────────── */}
            <tr><td colSpan={4} style={BNR}>RSA Premium Breakup</td></tr>

            {/* ── ROW 12 : Nested premium table — Vilas rule 2 (no GST) ── */}
            <tr>
              <td colSpan={4} style={{ padding: 0 }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ ...ITH, width: '28%' }}>Plan Name</th>
                      <th style={{ ...ITH, textAlign: 'right' }}>Insurance Premium</th>
                      <th style={{ ...ITH, textAlign: 'right' }}>RSA Premium</th>
                      <th style={{ ...ITH, textAlign: 'right' }}>Total Premium</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ ...ITC, fontWeight: 600 }}>MVAutoAssist RSA</td>
                      <td style={{ ...ITC, textAlign: 'right' }}>{fmtAmt(cert.insurance_amount)}</td>
                      <td style={{ ...ITC, textAlign: 'right' }}>{fmtAmt(cert.rsa_amount)}</td>
                      <td style={{ ...ITC, textAlign: 'right', fontWeight: 700 }}>{fmtAmt(cert.total_amount)}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            {/* ── ROW 13 : TOTAL — dark navy, white text ────────────────── */}
            <tr>
              <td colSpan={4} style={{ border: BD, padding: '10px 12px', backgroundColor: '#0f172a', color: '#fff', textAlign: 'right', fontWeight: 700, fontSize: 15 }}>
                Total Amount:&nbsp;&nbsp;{fmtAmt(cert.total_amount)}
              </td>
            </tr>

            {/* ── ROW 14 : Special conditions ──────────────────────────── */}
            <tr>
              <td colSpan={4} style={{ border: BD, padding: '8px 6px', fontSize: 12, color: '#6b7280', fontStyle: 'italic', lineHeight: 1.75 }}>
                <strong style={{ fontStyle: 'normal', fontWeight: 600, color: '#374151' }}>
                  Special Conditions (applicable to all coverages):
                </strong>{' '}
                (a) All additional expenses regarding replacement of a part, additional Fuel and any other service
                which does not form a part of the standard services provided would be on chargeable basis to the
                Certificate holder. (b) This Certificate is valid subject to realisation of the payment and is
                effective from the Payment realisation date or certificate issue date, whichever is later.
              </td>
            </tr>

          </tbody>
        </table>

        {/* ── Print footer ──────────────────────────────────────────────── */}
        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 11, color: '#9ca3af', borderTop: '1px solid #e5e7eb', paddingTop: 10 }}>
          This is a computer generated certificate and hence signature is not required.
        </div>

      </div>
    </div>
  );
}
