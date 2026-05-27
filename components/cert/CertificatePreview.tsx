'use client';

import Link from 'next/link';
import { Shield, ChevronRight, Printer, Download } from 'lucide-react';

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
  payment_method: string | null;
  payment_reference: string | null;
};

export type AgentData = {
  full_name: string;
  email: string;
  location: string | null;
};

const COVERAGES = [
  { id: 1, title: 'Battery Check Up & Jump Start', desc: 'A Technician to be arranged for Jumpstart', applicable: 'Yes' },
  { id: 2, title: 'Flat Tyre', desc: 'Arrange For a Technician to Repair the Puncture Tyre. The Cost of Puncture repair and all incidental charges to be borne by Customer on actual basis', applicable: 'Yes' },
  { id: 3, title: 'Fuel Arrangement Assistance', desc: 'Arrange For a Fuel Delivery in Case Vehicle Is Out of Fuel. Fuel Cost on actual basis payable by Customer', applicable: 'Yes' },
  { id: 4, title: 'Relay of Urgent Messages', desc: "Pass On Message to Rider's Friends & Family", applicable: 'Yes' },
  { id: 5, title: 'Vehicle Breakdown Phone Support', desc: 'Guiding The Rider On Phone about Vehicle Related Problem', applicable: 'Yes' },
  { id: 6, title: 'Towing Assistance', desc: 'To and fro upto 15 kms from the breakdown spot (one towing)', applicable: 'Yes' },
  { id: 7, title: 'Number of Services', desc: 'During a plan', applicable: '1' },
] as const;

function fmtYMD(d: string | null, time = '00:00') {
  return d ? `${d} ${time}` : '-';
}

function fmtDMY(d: string | null, time?: string) {
  if (!d) return '-';
  const [y, m, day] = d.split('-');
  return time ? `${day}-${m}-${y} ${time}` : `${day}-${m}-${y}`;
}

function fmtAmt(n: number) {
  return `\u20b9${new Intl.NumberFormat('en-IN').format(n)}`;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash', upi: 'UPI', card: 'Card', cheque: 'Cheque', bank_transfer: 'Bank Transfer',
};

const BD = '1px solid #ddd';
const C: React.CSSProperties = { border: BD, padding: '6px 6px', verticalAlign: 'top' };
const TH: React.CSSProperties = { ...C, fontWeight: 700, width: 200, backgroundColor: '#f9fafb', textAlign: 'left' };
const BNR: React.CSSProperties = { border: BD, padding: '5px 9px', backgroundColor: '#0f172a14', fontSize: 12, fontWeight: 700, color: '#0f172a' };
const ITH: React.CSSProperties = { border: BD, padding: '5px 6px', backgroundColor: '#f3f4f6', fontWeight: 700, fontSize: 12, verticalAlign: 'top', textAlign: 'left' };
const ITC: React.CSSProperties = { border: BD, padding: '5px 6px', verticalAlign: 'top', fontSize: 12 };

type Props = { cert: CertData; agent: AgentData; helpline: string; backHref: string };

export default function CertificatePreview({ cert, agent, helpline, backHref }: Props) {
  return (
    <div
      style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 13, color: '#111' }}
      className="cert-print-root min-h-screen bg-stone-100 p-4 sm:p-8 print:bg-white print:p-0"
    >
      <div className="max-w-[1000px] mx-auto mb-3 flex items-center gap-2 justify-between print:hidden">
        <Link
          href={backHref}
          className="flex items-center gap-2 text-sm font-semibold bg-white px-4 py-2 border border-stone-300 hover:bg-stone-50 transition-colors"
        >
          <ChevronRight className="w-4 h-4 rotate-180" /> Back
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 text-sm font-semibold bg-white px-4 py-2 border border-stone-300 hover:bg-stone-50 transition-colors"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 text-sm font-semibold bg-slate-900 text-white px-4 py-2 hover:bg-slate-800 transition-colors"
          >
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </div>

      <div className="cert-document max-w-[960px] mx-auto bg-white shadow-sm rounded-lg p-4">
        <h1 className="cert-title">Tax Invoice / RSA Certificate</h1>

        <table className="cert-main-table" style={{ borderCollapse: 'collapse', width: '100%', border: BD }}>
          <tbody>
            <tr>
              <td colSpan={2} style={C}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
                  <div style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#f59e0b,#dc2626)' }}>
                    <Shield className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>MVAUTOASSIST</div>
                    <div style={{ fontSize: 10, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Service Certificate Portal</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>
                  Toll Free: {helpline}
                </div>
                <div style={{ fontSize: 10.5, color: '#57534e', marginTop: 4, lineHeight: 1.45 }}>
                  <strong style={{ fontWeight: 600, color: '#374151' }}>SHREEVARDHAN SERVICES</strong><br />
                  RS No. 226/A/1, Unit No. 2, Kamabe Turf,<br />
                  Thane, Kolhapur - 416012
                </div>
                <div style={{ fontSize: 10.5, color: '#374151', marginTop: 6, paddingTop: 6, borderTop: '1px solid #e5e7eb' }}>
                  <strong style={{ fontWeight: 600 }}>Issued by:</strong>{' '}
                  {agent.full_name}
                  {agent.location && <> &middot; {agent.location}</>}
                </div>
              </td>

              <td colSpan={2} style={{ ...C, textAlign: 'right' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Bill To
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{cert.customer_name}</div>
                {cert.customer_address && (
                  <div style={{ fontSize: 11, color: '#57534e', marginTop: 3, lineHeight: 1.45, maxWidth: 340, marginLeft: 'auto' }}>
                    {cert.customer_address}
                  </div>
                )}
                <div style={{ fontSize: 12, color: '#374151', marginTop: 3, fontWeight: 600 }}>{cert.customer_mobile}</div>
                {cert.customer_email && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{cert.customer_email}</div>}
              </td>
            </tr>

            <tr>
              <th style={TH}>Tax Invoice / Certificate No</th>
              <td style={{ ...C, fontFamily: 'monospace', fontWeight: 600 }}>{cert.cert_number}</td>
              <th style={TH}>Certificate Start Date</th>
              <td style={C}>{fmtYMD(cert.start_date, '00:00')}</td>
            </tr>
            <tr>
              <th style={TH}>Customer DOB</th>
              <td style={C}>{fmtDMY(cert.customer_dob)}</td>
              <th style={TH}>Certificate End Date</th>
              <td style={C}>{fmtDMY(cert.end_date, '23:59')}</td>
            </tr>

            <tr><td colSpan={4} style={BNR}>Vehicle Details</td></tr>
            <tr>
              <th style={TH}>Registration No</th>
              <td style={C}>{cert.registration_no || 'New'}</td>
              <th style={TH}>Vehicle Type</th>
              <td style={C}>{cert.vehicle_type || '-'}</td>
            </tr>
            <tr>
              <th style={TH}>Make and Model</th>
              <td style={C}>{cert.make_model || '-'}</td>
              <th style={TH}>Variant</th>
              <td style={C}>{cert.variant || '-'}</td>
            </tr>
            <tr>
              <th style={TH}>Engine No</th>
              <td style={{ ...C, fontFamily: 'monospace' }}>{cert.engine_no || '-'}</td>
              <th style={TH}>Chassis No</th>
              <td style={{ ...C, fontFamily: 'monospace' }}>{cert.chassis_no || '-'}</td>
            </tr>
            <tr>
              <th style={TH}>Fuel Type</th>
              <td style={C}>{cert.fuel_type || '-'}</td>
              <th style={TH}>Manufacturing Year</th>
              <td style={C}>{cert.manufacturing_year?.toString() || '-'}</td>
            </tr>

            <tr>
              <td colSpan={4} style={BNR}>
                Coverages of Road Side Assistance - Toll Free No. {helpline}
              </td>
            </tr>
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
                      <th style={ITH}>Featured Benefits</th>
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
                        <td style={{ ...ITC, textAlign: 'center', fontWeight: 700 }}>{row.applicable}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </td>
            </tr>

            <tr><td colSpan={4} style={BNR}>RSA Premium Breakup</td></tr>
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
            <tr>
              <th style={TH}>Payment Mode</th>
              <td colSpan={3} style={C}>
                {cert.payment_method
                  ? `${PAYMENT_LABELS[cert.payment_method] ?? cert.payment_method}${cert.payment_reference ? ` · ${cert.payment_reference}` : ''}`
                  : '—'
                }
              </td>
            </tr>
          </tbody>
        </table>

        <p className="cert-conditions text-xs text-stone-600 italic mt-3 px-2">
          Special conditions (applicable to all coverages): (a) All additional expenses regarding replacement of a part, additional Fuel and any other service which does not form a part of the standard services provided would be on chargeable basis to the Certificate holder. (b) This Certificate is valid subject to realisation of the payment and is effective from the Payment realisation date or certificate issue date, whichever is later.
        </p>

        <div className="cert-footer text-[11px] text-stone-500 text-center mt-2">
          This is a computer generated certificate and hence signature is not required.
        </div>
      </div>
    </div>
  );
}
