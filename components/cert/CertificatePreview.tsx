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

// ─── static data ──────────────────────────────────────────────────────────────

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

// ─── shared style objects ─────────────────────────────────────────────────────

const B   = '1px solid #d1d5db';
const C: React.CSSProperties = { border: B, padding: '4px 8px', verticalAlign: 'top' };
const BNR: React.CSSProperties = { ...C, textAlign: 'center', fontWeight: 600, fontSize: 12, background: '#f9fafb', padding: '5px 8px' };
const LBL: React.CSSProperties = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#78716c', lineHeight: 1.2, marginBottom: 1 };
const VAL: React.CSSProperties = { fontSize: 13, color: '#0c0a09', lineHeight: 1.35 };
const TH:  React.CSSProperties = { ...C, background: '#f3f4f6', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#374151' };

// ─── component ────────────────────────────────────────────────────────────────

type Props = { cert: CertData; agent: AgentData; helpline: string; backHref: string };

export default function CertificatePreview({ cert, helpline, backHref }: Props) {
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, Arial, sans-serif' }}
         className="min-h-screen bg-stone-100 p-4 sm:p-8 print:bg-white print:p-0">

      {/* ── Action bar ─────────────────────────────────────── print:hidden ── */}
      <div className="max-w-[800px] mx-auto mb-3 flex items-center gap-2 justify-between print:hidden">
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

      {/* ── Certificate ───────────────────────────────────────────────────── */}
      <div className="max-w-[800px] mx-auto">

        {/*
          Single <table> with border-collapse.
          2-column colgroup (50 / 50) for the main grid.
          Coverages and RSA sections use a nested <table> inside a padding-0
          outer td so they can have their own column widths without breaking
          the 50/50 customer / vehicle split.
        */}
        <table style={{ borderCollapse: 'collapse', width: '100%', border: B }}>
          <colgroup>
            <col style={{ width: '50%' }} />
            <col style={{ width: '50%' }} />
          </colgroup>
          <tbody>

            {/* ── ROW 1 : Logo  |  Tax Invoice heading ─────────────────── */}
            <tr>
              <td style={C}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#f59e0b,#dc2626)' }}>
                    <Shield className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0c0a09' }}>MVAUTOASSIST</div>
                    <div style={{ fontSize: 9, color: '#a8a29e', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Service Certificate Portal</div>
                  </div>
                </div>
              </td>
              <td style={{ ...C, textAlign: 'center' }}>
                <div style={LBL}>Tax Invoice cum Certificate Number :</div>
                <div style={{ ...VAL, fontSize: 18, fontWeight: 700, fontFamily: 'monospace' }}>{cert.cert_number}</div>
              </td>
            </tr>

            {/* ── ROW 2 : Issuer  |  RSA contact ───────────────────────── */}
            <tr>
              <td style={C}>
                <div style={LBL}>Certificate issuer &amp; Servicing Office :</div>
                <div style={{ ...VAL, fontWeight: 600 }}>SHREEVARDHAN SERVICES</div>
                <div style={{ fontSize: 11, color: '#57534e', marginTop: 2, lineHeight: 1.5 }}>
                  RS No. 226/A/1, Unit No. 2, Kamabe Turf,<br />
                  Thane, Kolhapur – 416012
                </div>
              </td>
              <td style={C}>
                <div style={LBL}>For Road Side Assistance :</div>
                <div style={{ fontSize: 11, color: '#57534e', lineHeight: 1.7 }}>
                  Please contact on toll free no :{' '}
                  <span style={{ fontWeight: 700, color: '#0c0a09', fontSize: 13 }}>{helpline}</span><br />
                  Email : care@mvautoassist.com<br />
                  Web : www.mvautoassist.com
                </div>
              </td>
            </tr>

            {/* ── Customer info ─────────────────────────────────────────── */}
            <tr>
              <td style={C}><div style={LBL}>Tax Invoice Cum Certificate Number</div><div style={{ ...VAL, fontFamily: 'monospace' }}>{cert.cert_number}</div></td>
              <td style={C}><div style={LBL}>Certificate Start Date</div><div style={VAL}>{fmtYMD(cert.start_date, '00:00')}</div></td>
            </tr>
            <tr>
              <td style={C}><div style={LBL}>Name of the Certificate Holder</div><div style={VAL}>{cert.customer_name || '—'}</div></td>
              <td style={C}><div style={LBL}>Certificate End Date</div><div style={VAL}>{fmtDMY(cert.end_date, '23:59')}</div></td>
            </tr>
            <tr>
              <td style={C}><div style={LBL}>Customer DOB</div><div style={VAL}>{fmtDMY(cert.customer_dob)}</div></td>
              <td style={C}><div style={LBL}>Customer Mobile No</div><div style={VAL}>{cert.customer_mobile || '—'}</div></td>
            </tr>
            <tr>
              <td colSpan={2} style={C}><div style={LBL}>Customer Address</div><div style={VAL}>{cert.customer_address || '—'}</div></td>
            </tr>
            <tr>
              <td colSpan={2} style={C}><div style={LBL}>Customer Email ID</div><div style={VAL}>{cert.customer_email || '—'}</div></td>
            </tr>

            {/* ── Vehicle Details ────────────────────────────────────────── */}
            <tr><td colSpan={2} style={BNR}>Vehicle Details</td></tr>
            <tr>
              <td style={C}><div style={LBL}>Registration No</div><div style={VAL}>{cert.registration_no || 'New'}</div></td>
              <td style={C}><div style={LBL}>Vehicle Type</div><div style={VAL}>{cert.vehicle_type || '—'}</div></td>
            </tr>
            <tr>
              <td style={C}><div style={LBL}>Make and Model</div><div style={VAL}>{cert.make_model || '—'}</div></td>
              <td style={C}><div style={LBL}>Variant</div><div style={VAL}>{cert.variant || '—'}</div></td>
            </tr>
            <tr>
              <td style={C}><div style={LBL}>Engine No</div><div style={{ ...VAL, fontFamily: 'monospace' }}>{cert.engine_no || '—'}</div></td>
              <td style={C}><div style={LBL}>Chassis No</div><div style={{ ...VAL, fontFamily: 'monospace' }}>{cert.chassis_no || '—'}</div></td>
            </tr>
            <tr>
              <td style={C}><div style={LBL}>Fuel Type</div><div style={VAL}>{cert.fuel_type || '—'}</div></td>
              <td style={C}><div style={LBL}>Manufacturing Year</div><div style={VAL}>{cert.manufacturing_year?.toString() || '—'}</div></td>
            </tr>

            {/* ── Coverages ─────────────────────────────────────────────── */}
            <tr>
              <td colSpan={2} style={BNR}>
                Coverages of Road Side Assistance — Toll free No.{' '}
                <span style={{ fontSize: 14 }}>{helpline}</span>
              </td>
            </tr>

            {/*
              Nested table keeps coverage column proportions independent of
              the 50/50 outer grid. Outer td has padding:0 so the inner table's
              cell borders sit flush against the outer table's adjacent row borders.
            */}
            <tr>
              <td colSpan={2} style={{ padding: 0 }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <colgroup>
                    <col style={{ width: '6%' }} />
                    <col style={{ width: '24%' }} />
                    <col style={{ width: '55%' }} />
                    <col style={{ width: '15%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={{ ...TH, textAlign: 'center' }}>Sl. No.</th>
                      <th style={TH}>Featured Benefits</th>
                      <th style={TH}>Description</th>
                      <th style={{ ...TH, textAlign: 'center' }}>Applicable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COVERAGES.map((row, i) => (
                      <tr key={row.id} style={{ background: i % 2 === 1 ? '#fafaf9' : '#fff' }}>
                        <td style={{ ...C, textAlign: 'center', color: '#78716c', fontSize: 12 }}>{row.id}</td>
                        <td style={{ ...C, fontWeight: 500, fontSize: 12 }}>{row.title}</td>
                        <td style={{ ...C, color: '#57534e', fontSize: 12, lineHeight: 1.5 }}>{row.desc}</td>
                        <td style={{ ...C, textAlign: 'center', fontWeight: 700, fontSize: 12 }}>{row.val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </td>
            </tr>

            {/* ── RSA Premium Breakup ────────────────────────────────────── */}
            <tr><td colSpan={2} style={BNR}>RSA Premium Breakup</td></tr>

            {/* Nested table — Vilas rule 2: insurance + RSA + total, no GST */}
            <tr>
              <td colSpan={2} style={{ padding: 0 }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ ...TH, textAlign: 'left' }}>Plan Name</th>
                      <th style={{ ...TH, textAlign: 'right' }}>Insurance Premium</th>
                      <th style={{ ...TH, textAlign: 'right' }}>RSA Premium</th>
                      <th style={{ ...TH, textAlign: 'right' }}>Total Premium</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ ...C, fontWeight: 500 }}>MVAutoAssist RSA</td>
                      <td style={{ ...C, textAlign: 'right' }}>{fmtAmt(cert.insurance_amount)}</td>
                      <td style={{ ...C, textAlign: 'right' }}>{fmtAmt(cert.rsa_amount)}</td>
                      <td style={{ ...C, textAlign: 'right', fontWeight: 700, fontSize: 14 }}>{fmtAmt(cert.total_amount)}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

          </tbody>
        </table>

        {/* Special conditions — below the table, not inside a cell */}
        <p style={{ marginTop: 8, fontSize: 10, color: '#78716c', lineHeight: 1.7, fontStyle: 'italic' }}>
          <strong style={{ fontWeight: 600, fontStyle: 'normal', color: '#57534e' }}>
            Special Conditions (applicable to all coverages):
          </strong>{' '}
          (a) All additional expenses regarding replacement of a part, additional Fuel and any other
          service which does not form a part of the standard services provided would be on chargeable
          basis to the Certificate holder. (b) This Certificate is valid subject to realisation of the
          payment and is effective from the Payment realisation date or certificate issue date,
          whichever is later.
        </p>

      </div>
    </div>
  );
}
