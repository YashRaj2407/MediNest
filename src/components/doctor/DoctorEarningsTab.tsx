import React from 'react';
import { 
  IndianRupee, 
  TrendingUp, 
  Calendar, 
  CreditCard, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  Building2, 
  Download,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { Appointment } from '../../types';
import { DEMO_PAYOUT_HISTORY } from '../../data/doctorPortalData';

interface DoctorEarningsTabProps {
  appointments: Appointment[];
  doctorFeeINR: number;
}

export const DoctorEarningsTab: React.FC<DoctorEarningsTabProps> = ({
  appointments,
  doctorFeeINR
}) => {
  // Financial calculations strictly in INR
  const completedConsultations = appointments.filter(a => a.status === 'completed');
  
  // Total earned this month (includes historical seeded month total)
  const baseMonthEarnings = 48400;
  const currentTotalEarnings = baseMonthEarnings + (completedConsultations.length * doctorFeeINR);

  const todayCompleted = appointments.filter(
    a => a.status === 'completed' && (a.date.toLowerCase().includes('today') || a.date.toLowerCase().includes('sep 11'))
  );
  const todayEarnings = (todayCompleted.length + 3) * doctorFeeINR; // ₹1,996

  const weekEarnings = 11976;
  const pendingPayoutINR = 8982;

  return (
    <div className="space-y-6">
      {/* Top INR Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Earnings This Month */}
        <div className="p-5 rounded-3xl bg-[#032F31] text-white shadow-sm border border-teal-800 space-y-3">
          <div className="flex items-center justify-between text-[#FAE58D]">
            <span className="text-xs font-bold uppercase tracking-wider">Earnings This Month</span>
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-[#FAE58D]" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              ₹{currentTotalEarnings.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+18.4% vs August</span>
            </div>
          </div>
        </div>

        {/* Today's Earnings */}
        <div className="p-5 rounded-3xl bg-white text-slate-800 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Today's Earnings</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-teal-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#032F31]">
              ₹{todayEarnings.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              From completed consultations today
            </div>
          </div>
        </div>

        {/* This Week's Earnings */}
        <div className="p-5 rounded-3xl bg-white text-slate-800 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Weekly Total</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-teal-700">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#032F31]">
              ₹{weekEarnings.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Past 7 days accumulated earnings
            </div>
          </div>
        </div>

        {/* Pending Bank Payout */}
        <div className="p-5 rounded-3xl bg-[#FAF7EE] text-[#032F31] shadow-sm border border-[#DDD6C5] space-y-3">
          <div className="flex items-center justify-between text-[#032F31]">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Payout</span>
            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-amber-700 shadow-2xs">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#032F31]">
              ₹{pendingPayoutINR.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-teal-800 font-semibold mt-1 flex items-center gap-1">
              <span>Next cycle: Friday, 18 Sep 2026</span>
            </div>
          </div>
        </div>
      </div>

      {/* Verified Bank Account & Settlement Policy */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Verified Settlement Bank Account
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              <ShieldCheck className="w-3 h-3" /> Penny Drop Verified
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#032F31] text-[#FAE58D] flex items-center justify-center font-bold shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="space-y-0.5 text-xs">
              <div className="font-bold text-[#032F31]">HDFC Bank Ltd. • Indiranagar Branch</div>
              <div className="text-slate-500 font-mono">Account: •••• •••• 4892</div>
              <div className="text-slate-400 text-[11px]">IFSC: HDFC0001234 • Dr. Rohan Gupta</div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#FAF7EE] border border-[#DDD6C5] space-y-2 text-xs text-[#032F31]">
          <span className="font-bold block">100% Doctor Payout Guarantee</span>
          <p className="text-slate-600 leading-relaxed text-[11px]">
            MediNest charges zero commission or cut from medical consultations. 100% of patient payments (₹{doctorFeeINR} per consult) are transferred directly into your registered bank account every Friday via automated NEFT / RTGS.
          </p>
        </div>
      </div>

      {/* Payout History Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-base font-bold text-[#032F31] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-teal-700" />
              Direct Bank Payout History
            </h4>
            <p className="text-xs text-slate-500">
              Official monthly settlement statements with bank transaction references (UTR).
            </p>
          </div>

          <button
            type="button"
            onClick={() => alert('Downloading GST & Earnings TDS Statement for FY 2026-27...')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" /> Export Statement
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">Payout ID</th>
                <th className="py-3 px-3">Settlement Period</th>
                <th className="py-3 px-3">Date Processed</th>
                <th className="py-3 px-3 text-center">Consultations</th>
                <th className="py-3 px-3">Bank Reference (UTR)</th>
                <th className="py-3 px-3 text-right">Net Amount</th>
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {DEMO_PAYOUT_HISTORY.map(payout => (
                <tr key={payout.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-3 font-mono font-bold text-slate-700">{payout.id}</td>
                  <td className="py-3.5 px-3 font-semibold text-slate-800">{payout.month}</td>
                  <td className="py-3.5 px-3 text-slate-500">{payout.date}</td>
                  <td className="py-3.5 px-3 text-center font-bold text-teal-800">{payout.consultationsCount}</td>
                  <td className="py-3.5 px-3 font-mono text-slate-500 text-[11px]">{payout.bankRef}</td>
                  <td className="py-3.5 px-3 text-right font-bold text-[#032F31]">
                    ₹{payout.netINR.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3" /> {payout.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
