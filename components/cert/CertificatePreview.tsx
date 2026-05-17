'use client';

import Link from 'next/link';
import { Shield, ChevronRight, Printer, Download } from 'lucide-react';
import InfoBox from '@/components/cert/InfoBox';

// ─── types (shared with page.tsx) ────────────────────────────────────────────

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

// ─── coverage rows (static business content) ─────────────────────────────────

const COVERAGES = [
  {
    id: 1,
    title: 'Battery Check Up & Jump Start',
    description: 'A Technician to be arranged for Jumpstart',
    applicable: 'Yes',
  },
  {
    id: 2,
    title: 'Flat Tyre',
    description: 'Arrange For a Technician to Repair the Puncture Tyre. Repair cost would be on actual basis',
    applicable: 'Yes',
  },
  {
    id: 3,
    title: 'Fuel Arrangement Assistance',
    description: 'Arrange For a Fuel Delivery in Case Vehicle Is Out of Fuel. Fuel cost would be on actual basis',
    applicable: 'Yes',
  },
  {
    id: 4,
    title: 'Relay of Urgent Messages',
    description: "Pass On Message to Rider's Friends & Family",
    applicable: 'Yes',
  },
  {
    id: 5,
    title: 'Vehicle Breakdown Phone Support',
    description: 'Guiding The Rider On Phone about Vehicle Related Problem',
    applicable: 'Yes',
  },
  {
    id: 6,
    title: 'Towing Assistance',
    description: 'To and fro upto 15 kms from the breakdown spot (one towing)',
    applicable: 'Yes',
  },
  {
    id: 7,
    title: 'Number of Services',
    description: 'During a plan',
    applicable: '1',
  },
] as const;

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtYMD(d: string | null): string {
  if (!d) return '—';
  return d; // stored as YYYY-MM-DD
}

function fmtDMY(d: string | null): string {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}-${m}-${y}`;
}

// Vilas rule 2: show DB amounts directly — no GST derivation
function fmtAmt(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(n);
}

// ─── component ────────────────────────────────────────────────────────────────

type Props = {
  cert:     CertData;
  agent:    AgentData;
  helpline: string;
  backHref: string;
};

export default function CertificatePreview({ cert, agent, helpline, backHref }: Props) {
  return (
    <div
      className="min-h-screen bg-stone-200 p-4 sm:p-8 print:bg-white print:p-0"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* ── Top action bar — hidden when printing ──────────────────────────── */}
      <div className="max-w-4xl mx-auto mb-4 flex flex-wrap items-center gap-3 justify-between print:hidden">
        <Link
          href={backHref}
          className="flex items-center gap-2 text-sm font-semibold bg-white px-4 py-2 rounded-lg border border-stone-300 hover:bg-stone-50 transition-colors"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Back
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 text-sm font-semibold bg-white px-4 py-2 rounded-lg border border-stone-300 hover:bg-stone-50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          {/* Download PDF — Phase 5 */}
          <button
            title="Coming soon"
            className="flex items-center gap-2 text-sm font-semibold bg-slate-900 text-white px-4 py-2 rounded-lg opacity-60 cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>

      {/* ── Certificate card ───────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl border border-stone-200 overflow-hidden print:shadow-none print:rounded-none print:border-0 print:max-w-full">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="p-6 border-b-2 border-slate-900 flex items-start justify-between gap-6">

          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)' }}
            >
              <Shield className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-bold text-lg tracking-tight">MVAUTOASSIST</div>
              <div className="text-[10px] text-stone-500 tracking-[0.15em] uppercase">
                Service Certificate Portal
              </div>
            </div>
          </div>

          {/* Centre — cert number */}
          <div className="flex-1 text-center px-4">
            <div className="text-[10px] text-stone-500 uppercase tracking-wider mb-1">
              Tax Invoice cum Certificate Number :
            </div>
            <div
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
              className="font-bold text-base"
            >
              {cert.cert_number}
            </div>
          </div>

          {/* Right — issuer block */}
          <div className="text-right text-[11px] shrink-0 max-w-[220px]">
            <div className="text-[10px] text-stone-500 uppercase tracking-wider mb-1">
              Certificate issuer &amp; Servicing Office :
            </div>
            <div className="font-bold text-sm">SHREEVARDHAN SERVICES</div>
            <div className="text-stone-600 mt-0.5 leading-snug">
              RS No. 226/A/1, Unit No. 2, Kamabe Turf,<br />
              Thane, Kolhapur – 416012
            </div>
            <div className="text-stone-600 mt-1 leading-snug">
              For Road Side Assistance, Please contact on<br />
              toll free no:{' '}
              <span className="font-semibold">{helpline}</span>
            </div>
            <div className="text-stone-500 mt-0.5">care@mvautoassist.com</div>
            <div className="text-stone-500">www.mvautoassist.com</div>
          </div>
        </div>

        {/* ── Customer info grid ──────────────────────────────────────────── */}
        <div className="border-b border-stone-200">

          <div className="grid grid-cols-2">
            <InfoBox label="Tax Invoice Cum Certificate Number" value={cert.cert_number} mono />
            <InfoBox label="Certificate Start Date" value={fmtYMD(cert.start_date)} />
          </div>

          <div className="grid grid-cols-2">
            <InfoBox label="Name of the Certificate Holder" value={cert.customer_name} />
            <InfoBox label="Certificate End Date" value={fmtDMY(cert.end_date)} />
          </div>

          <div className="grid grid-cols-2">
            <InfoBox label="Customer DOB" value={fmtDMY(cert.customer_dob)} />
            <InfoBox label="Customer Mobile No" value={cert.customer_mobile} />
          </div>

          <div><InfoBox label="Customer Address" value={cert.customer_address} /></div>
          <div><InfoBox label="Customer Email ID"  value={cert.customer_email}  /></div>

        </div>

        {/* ── Vehicle Details ──────────────────────────────────────────────── */}
        <div className="bg-stone-50 px-6 py-2 text-center text-xs font-semibold uppercase tracking-wider border-b border-stone-200">
          Vehicle Details
        </div>

        <div>
          <div className="grid grid-cols-2">
            <InfoBox label="Registration No"    value={cert.registration_no || 'New'} />
            <InfoBox label="Vehicle Type"       value={cert.vehicle_type} />
          </div>
          <div className="grid grid-cols-2">
            <InfoBox label="Make and Model"     value={cert.make_model} />
            <InfoBox label="Variant"            value={cert.variant} />
          </div>
          <div className="grid grid-cols-2">
            <InfoBox label="Engine No"          value={cert.engine_no}  mono />
            <InfoBox label="Chassis No"         value={cert.chassis_no} mono />
          </div>
          <div className="grid grid-cols-2 border-b border-stone-200">
            <InfoBox label="Fuel Type"          value={cert.fuel_type} />
            <InfoBox label="Manufacturing Year" value={cert.manufacturing_year?.toString()} />
          </div>
        </div>

        {/* ── Coverages ───────────────────────────────────────────────────── */}
        <div className="bg-stone-50 px-6 py-2 text-center text-xs font-semibold uppercase tracking-wider border-b border-stone-200">
          Coverages of Road Side Assistance — Toll free No. {helpline}
        </div>

        <div className="overflow-x-auto border-b border-stone-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-4 py-2.5 text-left font-semibold w-8">#</th>
                <th className="px-4 py-2.5 text-left font-semibold">Featured Benefits</th>
                <th className="px-4 py-2.5 text-left font-semibold">Description</th>
                <th className="px-4 py-2.5 text-center font-semibold w-20">Applicable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {COVERAGES.map((row, i) => (
                <tr
                  key={row.id}
                  className={i % 2 === 0 ? 'bg-white' : 'bg-stone-50'}
                >
                  <td className="px-4 py-2.5 text-stone-400">{row.id}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-800">{row.title}</td>
                  <td className="px-4 py-2.5 text-stone-600">{row.description}</td>
                  <td className="px-4 py-2.5 text-center font-bold text-emerald-700">{row.applicable}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── RSA Premium Breakup (Vilas rule 2 — direct DB columns, no GST math) */}
        <div className="bg-slate-900 text-white p-6">
          <div className="text-[10px] uppercase tracking-[0.2em] text-amber-300 mb-4">
            RSA Premium Breakup
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-stone-400 text-[10px] uppercase">
                <th className="text-left font-semibold pb-3">Plan Name</th>
                <th className="text-right font-semibold pb-3">Insurance Premium</th>
                <th className="text-right font-semibold pb-3">RSA Premium</th>
                <th className="text-right font-semibold pb-3">Total Premium</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-semibold">MVAutoAssist RSA</td>
                <td className="text-right">{fmtAmt(cert.insurance_amount)}</td>
                <td className="text-right">{fmtAmt(cert.rsa_amount)}</td>
                <td
                  className="text-right font-bold text-amber-300"
                  style={{ fontFamily: "'Instrument Serif', serif", fontSize: '1.4rem', lineHeight: 1 }}
                >
                  {fmtAmt(cert.total_amount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Special Conditions ──────────────────────────────────────────── */}
        <div className="p-6 text-[10px] text-stone-500 leading-relaxed">
          <strong className="not-italic text-stone-600">
            Special conditions (applicable to all coverages):
          </strong>{' '}
          (a) All additional expenses regarding replacement of a part, additional Fuel and any other
          service which does not form a part of the standard services provided would be on chargeable
          basis to the Certificate holder. (b) This Certificate is valid subject to realisation of
          the payment and is effective from the Payment realisation date or certificate issue date,
          whichever is later.
        </div>

      </div>
    </div>
  );
}
