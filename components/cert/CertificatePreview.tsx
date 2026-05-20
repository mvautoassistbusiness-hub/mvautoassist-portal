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

// ─── coverage data ────────────────────────────────────────────────────────────

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

// ─── tailwind class constants ─────────────────────────────────────────────────

// Outer table — body cell
const TD  = 'border border-stone-300 px-3 py-2 align-top';
// Section banner (full-width dark row)
const BNR = 'border border-stone-300 bg-stone-800 text-white text-center font-semibold py-1.5 text-xs uppercase tracking-wider';
// Label line inside a cell
const LBL = 'text-[10px] uppercase tracking-wider text-stone-500 leading-none mb-0.5';
// Value line inside a cell
const VAL = 'text-sm font-semibold text-stone-900 leading-snug';
// Inner-table header cell (coverages / RSA breakup)
const ITH = 'bg-stone-100 px-3 py-2 text-[10px] uppercase tracking-wider font-semibold text-stone-700 border border-stone-300 text-left';
// Inner-table body cell
const ITC = 'px-3 py-2 text-xs border border-stone-300 align-top';

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <>
      <div className={LBL}>{label}</div>
      <div className={`${VAL}${mono ? ' font-mono' : ''}`}>{value ?? '—'}</div>
    </>
  );
}

// ─── component ────────────────────────────────────────────────────────────────

type Props = { cert: CertData; agent: AgentData; helpline: string; backHref: string };

export default function CertificatePreview({ cert, helpline, backHref }: Props) {
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
         className="min-h-screen bg-stone-200 p-4 sm:p-8 print:bg-white print:p-0">

      {/* ── Action bar — hidden on print ──────────────────────────────────── */}
      <div className="max-w-4xl mx-auto mb-3 flex flex-wrap items-center gap-2 justify-between print:hidden">
        <Link href={backHref}
              className="flex items-center gap-2 text-sm font-semibold bg-white px-4 py-2 rounded-lg border border-stone-300 hover:bg-stone-50 transition-colors">
          <ChevronRight className="w-4 h-4 rotate-180" /> Back
        </Link>
        <div className="flex gap-2">
          <button onClick={() => window.print()}
                  className="flex items-center gap-2 text-sm font-semibold bg-white px-4 py-2 rounded-lg border border-stone-300 hover:bg-stone-50 transition-colors">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button title="Coming soon"
                  className="flex items-center gap-2 text-sm font-semibold bg-slate-900 text-white px-4 py-2 rounded-lg opacity-60 cursor-not-allowed">
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </div>

      {/* ── Certificate document ──────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto bg-white shadow-xl print:shadow-none print:max-w-full">

        {/*
          Outer table: 2 equal columns (50 / 50).
          The coverages and RSA sections each use colSpan=2 + a nested <table>
          so their internal column widths (Sl.No ~6%, Benefits ~22%,
          Description ~57%, Applicable ~15%) don't distort the 50/50 grid.
          The nested tables' outer cells supply all visual borders; the wrapping
          <td> carries padding:0 and no border so border-collapse on the outer
          table produces clean 1 px joints above and below each section.
        */}
        <table className="w-full border-collapse">
          <colgroup>
            <col style={{ width: '50%' }} />
            <col style={{ width: '50%' }} />
          </colgroup>
          <tbody>

            {/* ── ROW 1 : Logo | Tax Invoice heading ───────────────────── */}
            <tr>
              <td className={TD}>
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-md shrink-0 flex items-center justify-center"
                       style={{ background: 'linear-gradient(135deg,#f59e0b,#dc2626)' }}>
                    <Shield className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="font-black text-sm tracking-tight text-stone-900">MVAUTOASSIST</div>
                    <div className="text-[8px] uppercase tracking-widest text-stone-400">Service Certificate Portal</div>
                  </div>
                </div>
              </td>
              <td className={`${TD} text-center`}>
                <div className={LBL}>Tax Invoice cum Certificate Number</div>
                <div className="font-mono font-black text-xl text-stone-900 tracking-tight mt-0.5">
                  {cert.cert_number}
                </div>
              </td>
            </tr>

            {/* ── ROW 2 : Issuer | RSA contact ─────────────────────────── */}
            <tr>
              <td className={TD}>
                <div className={LBL}>Certificate issuer &amp; Servicing Office :</div>
                <div className="text-sm font-bold text-stone-900">SHREEVARDHAN SERVICES</div>
                <div className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                  RS No. 226/A/1, Unit No. 2, Kamabe Turf,<br />
                  Thane, Kolhapur – 416012
                </div>
              </td>
              <td className={TD}>
                <div className={LBL}>For Road Side Assistance :</div>
                <div className="text-xs text-stone-600 leading-relaxed">
                  Please contact on toll free no :{' '}
                  <span className="font-bold text-stone-900 text-sm">{helpline}</span><br />
                  Email : care@mvautoassist.com<br />
                  Web : www.mvautoassist.com
                </div>
              </td>
            </tr>

            {/* ── Customer info ─────────────────────────────────────────── */}
            <tr>
              <td className={TD}><Field label="Tax Invoice Cum Certificate Number" value={cert.cert_number} mono /></td>
              <td className={TD}><Field label="Certificate Start Date"              value={fmtYMD(cert.start_date, '00:00')} /></td>
            </tr>
            <tr>
              <td className={TD}><Field label="Name of the Certificate Holder" value={cert.customer_name} /></td>
              <td className={TD}><Field label="Certificate End Date"            value={fmtDMY(cert.end_date, '23:59')} /></td>
            </tr>
            <tr>
              <td className={TD}><Field label="Customer DOB"       value={fmtDMY(cert.customer_dob)} /></td>
              <td className={TD}><Field label="Customer Mobile No" value={cert.customer_mobile} /></td>
            </tr>
            <tr>
              <td colSpan={2} className={TD}><Field label="Customer Address"  value={cert.customer_address} /></td>
            </tr>
            <tr>
              <td colSpan={2} className={TD}><Field label="Customer Email ID" value={cert.customer_email} /></td>
            </tr>

            {/* ── Vehicle Details ────────────────────────────────────────── */}
            <tr><td colSpan={2} className={BNR}>Vehicle Details</td></tr>
            <tr>
              <td className={TD}><Field label="Registration No" value={cert.registration_no || 'New'} /></td>
              <td className={TD}><Field label="Vehicle Type"    value={cert.vehicle_type} /></td>
            </tr>
            <tr>
              <td className={TD}><Field label="Make and Model" value={cert.make_model} /></td>
              <td className={TD}><Field label="Variant"        value={cert.variant} /></td>
            </tr>
            <tr>
              <td className={TD}><Field label="Engine No"  value={cert.engine_no}  mono /></td>
              <td className={TD}><Field label="Chassis No" value={cert.chassis_no} mono /></td>
            </tr>
            <tr>
              <td className={TD}><Field label="Fuel Type"          value={cert.fuel_type} /></td>
              <td className={TD}><Field label="Manufacturing Year" value={cert.manufacturing_year?.toString()} /></td>
            </tr>

            {/* ── Coverages ─────────────────────────────────────────────── */}
            <tr>
              <td colSpan={2} className={BNR}>
                Coverages of Road Side Assistance — Toll free No. {helpline}
              </td>
            </tr>

            {/* Nested table — gives the 4 coverage columns their own widths */}
            <tr>
              <td colSpan={2} style={{ padding: 0 }}>
                <table className="w-full border-collapse">
                  <colgroup>
                    <col style={{ width: '6%' }} />
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '57%' }} />
                    <col style={{ width: '15%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className={`${ITH} text-center`}>Sl. No.</th>
                      <th className={ITH}>Featured Benefits</th>
                      <th className={ITH}>Description</th>
                      <th className={`${ITH} text-center`}>Applicable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COVERAGES.map((row, i) => (
                      <tr key={row.id} className={i % 2 === 1 ? 'bg-stone-50' : 'bg-white'}>
                        <td className={`${ITC} text-center text-stone-500`}>{row.id}</td>
                        <td className={`${ITC} font-semibold`}>{row.title}</td>
                        <td className={`${ITC} text-stone-600 leading-relaxed`}>{row.desc}</td>
                        <td className={`${ITC} text-center font-bold`}>{row.val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </td>
            </tr>

            {/* ── RSA Premium Breakup ────────────────────────────────────── */}
            <tr><td colSpan={2} className={BNR}>RSA Premium Breakup</td></tr>

            {/* Nested table — Vilas rule 2: insurance + RSA + total, no GST */}
            <tr>
              <td colSpan={2} style={{ padding: 0 }}>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={ITH}>Plan Name</th>
                      <th className={`${ITH} text-right`}>Insurance Premium</th>
                      <th className={`${ITH} text-right`}>RSA Premium</th>
                      <th className={`${ITH} text-right`}>Total Premium</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={`${ITC} font-semibold`}>MVAutoAssist RSA</td>
                      <td className={`${ITC} text-right`}>{fmtAmt(cert.insurance_amount)}</td>
                      <td className={`${ITC} text-right`}>{fmtAmt(cert.rsa_amount)}</td>
                      <td className={`${ITC} text-right font-bold text-sm`}>{fmtAmt(cert.total_amount)}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            {/* ── Special Conditions ────────────────────────────────────── */}
            <tr>
              <td colSpan={2} className="border border-stone-300 px-3 py-2 text-[10px] text-stone-500 leading-relaxed">
                <strong className="text-stone-700">Special Conditions (applicable to all coverages):</strong>{' '}
                (a) All additional expenses regarding replacement of a part, additional Fuel and any other service
                which does not form a part of the standard services provided would be on chargeable basis to the
                Certificate holder. (b) This Certificate is valid subject to realisation of the payment and is
                effective from the Payment realisation date or certificate issue date, whichever is later.
              </td>
            </tr>

          </tbody>
        </table>
      </div>
    </div>
  );
}
