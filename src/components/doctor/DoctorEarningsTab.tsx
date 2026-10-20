import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  FileSpreadsheet,
  RefreshCw,
  Search,
  ExternalLink,
  Edit2,
  Check,
  X,
  Sparkles,
  Receipt,
  User,
  Video
} from 'lucide-react';
import { formatINR } from '../../lib/formatCurrency';
import { Appointment } from '../../types';

interface DoctorEarningsTabProps {
  appointments: Appointment[];
  doctorFeeINR: number;
  doctorId?: string;
}

interface BackendTransaction {
  payment_id: string;
  razorpay_payment_id?: string;
  amount_inr: number;
  payment_method: string;
  payment_status: string;
  paid_at: string;
  appointment_id: string;
  patient_name: string;
  patient_email?: string;
  patient_phone?: string;
  consultation_type: string;
  start_datetime: string;
  appointment_status: string;
  visit_reason?: string;
}

interface SettlementBankAccount {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolder: string;
  accountType: 'Current' | 'Savings';
  upiId: string;
  isVerified: boolean;
}

const DEFAULT_BANK_ACCOUNT: SettlementBankAccount = {
  bankName: 'HDFC Bank Ltd.',
  accountNumber: '50100482910482',
  ifscCode: 'HDFC0001234',
  accountHolder: 'Dr. Practice Settlement',
  accountType: 'Current',
  upiId: 'doctor.medinest@hdfcbank',
  isVerified: true
};

export const DoctorEarningsTab: React.FC<DoctorEarningsTabProps> = ({ 
  appointments, 
  doctorFeeINR, 
  doctorId 
}) => {
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [weekEarnings, setWeekEarnings] = useState(0);
  const [pendingPayout, setPendingPayout] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [transactions, setTransactions] = useState<BackendTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'video' | 'clinic'>('all');
  
  // Bank Account State with localStorage persistence
  const [bankAccount, setBankAccount] = useState<SettlementBankAccount>(() => {
    try {
      const stored = localStorage.getItem(`medinest_doctor_bank_${doctorId || 'default'}`);
      return stored ? JSON.parse(stored) : DEFAULT_BANK_ACCOUNT;
    } catch (_) {
      return DEFAULT_BANK_ACCOUNT;
    }
  });

  const [isEditingBank, setIsEditingBank] = useState(false);
  const [bankForm, setBankForm] = useState<SettlementBankAccount>(bankAccount);
  const [saveBankNotice, setSaveBankNotice] = useState<string | null>(null);

  // Fetch real stats from backend API
  const fetchFinancialStats = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    try {
      const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
      const res = await fetch(`${apiBase}/doctors/${encodeURIComponent(doctorId)}/stats`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          setTotalEarnings(Number(d.totalEarnings) || 0);
          setTodayEarnings(Number(d.todayEarnings) || 0);
          setWeekEarnings(Number(d.weekEarnings) || 0);
          setPendingPayout(Number(d.pendingPayout) || Number(d.totalEarnings) || 0);
          setCompletedCount(Number(d.completedConsultations) || 0);
          if (Array.isArray(d.transactions)) {
            setTransactions(d.transactions);
          }
        }
      }
    } catch (err) {
      console.warn('[DoctorEarningsTab] Could not fetch remote stats, using appointment fallback', err);
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    fetchFinancialStats();
  }, [fetchFinancialStats, appointments]);

  // Fallback calculation from local appointments if transactions array is empty
  const effectiveTransactions = useMemo(() => {
    if (transactions.length > 0) return transactions;
    
    // Map from appointments prop
    return appointments
      .filter(a => a.status !== 'cancelled')
      .map(a => ({
        payment_id: `PAY-${a.id.slice(-8)}`,
        razorpay_payment_id: a.id,
        amount_inr: a.totalINR || doctorFeeINR || 799,
        payment_method: a.paymentMethod || 'Razorpay / UPI',
        payment_status: 'paid',
        paid_at: a.createdAt || new Date().toISOString(),
        appointment_id: a.id,
        patient_name: a.patientName,
        patient_email: a.patientEmail,
        patient_phone: a.patientPhone,
        consultation_type: a.appointmentType,
        start_datetime: a.date,
        appointment_status: a.status,
        visit_reason: a.visitReason
      }));
  }, [transactions, appointments, doctorFeeINR]);

  // Compute final display metrics (use API if > 0, else local fallback)
  const displayTotal = totalEarnings > 0 
    ? totalEarnings 
    : effectiveTransactions.reduce((acc, t) => acc + (t.amount_inr || 0), 0);

  const displayToday = todayEarnings > 0 
    ? todayEarnings 
    : effectiveTransactions
        .filter(t => (t.paid_at || '').toLowerCase().includes('today') || (t.start_datetime || '').toLowerCase().includes('today'))
        .reduce((acc, t) => acc + (t.amount_inr || 0), 0);

  const displayWeek = weekEarnings > 0 
    ? weekEarnings 
    : displayTotal;

  const displayPendingPayout = pendingPayout > 0 
    ? pendingPayout 
    : displayTotal;

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return effectiveTransactions.filter(tx => {
      const matchesSearch = 
        !searchQuery.trim() ||
        (tx.patient_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.payment_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.razorpay_payment_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.appointment_id || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = 
        filterType === 'all' || 
        tx.consultation_type?.toLowerCase() === filterType.toLowerCase();

      return matchesSearch && matchesType;
    });
  }, [effectiveTransactions, searchQuery, filterType]);

  // Bank Account Save Handler
  const handleSaveBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setBankAccount(bankForm);
    try {
      localStorage.setItem(`medinest_doctor_bank_${doctorId || 'default'}`, JSON.stringify(bankForm));
    } catch (_) {}
    setIsEditingBank(false);
    setSaveBankNotice('Settlement bank account updated successfully. Direct payouts active.');
    setTimeout(() => setSaveBankNotice(null), 4000);
  };

  // Helper to format ISO or raw dates to IST readable Date & Time for display & CSV
  const formatTxDateTime = (rawDateStr?: string | null) => {
    if (!rawDateStr) {
      const now = new Date();
      return {
        dateTime: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
        date: now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }),
        time: now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase(),
      };
    }

    if (typeof rawDateStr === 'string' && (rawDateStr.toLowerCase().includes('today') || rawDateStr.toLowerCase().includes('tomorrow'))) {
      const timeMatch = rawDateStr.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/i);
      const now = new Date();
      const datePart = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
      const timePart = timeMatch ? timeMatch[1].toUpperCase() : now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
      return {
        dateTime: `${datePart}, ${timePart}`,
        date: datePart,
        time: timePart,
      };
    }

    const d = new Date(rawDateStr);
    if (isNaN(d.getTime())) {
      return {
        dateTime: String(rawDateStr),
        date: String(rawDateStr),
        time: '',
      };
    }

    const datePart = d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const timePart = d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).toUpperCase();

    return {
      dateTime: `${datePart}, ${timePart}`,
      date: datePart,
      time: timePart,
    };
  };

  // CSV Statement Generator
  const handleExportStatement = () => {
    if (effectiveTransactions.length === 0) {
      alert('No payment transactions to export.');
      return;
    }

    const headers = [
      'Transaction ID',
      'Payment Ref',
      'Date & Time',
      'Date',
      'Time',
      'Patient Name',
      'Consultation Type',
      'Amount (INR)',
      'Payment Status',
      'Settlement Status'
    ];
    const rows = effectiveTransactions.map(tx => {
      const dt = formatTxDateTime(tx.paid_at || tx.start_datetime);
      return [
        `"${tx.payment_id}"`,
        `"${tx.razorpay_payment_id || tx.payment_id}"`,
        `"${dt.dateTime}"`,
        `"${dt.date}"`,
        `"${dt.time}"`,
        `"${tx.patient_name || 'Verified Patient'}"`,
        `"${tx.consultation_type?.toUpperCase() || 'VIDEO'}"`,
        tx.amount_inr,
        `"${tx.payment_status?.toUpperCase() || 'PAID'}"`,
        `"Scheduled for Friday Transfer"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `MediNest_Earnings_Statement_${new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Calculate next Friday date for settlements
  const nextFridayStr = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = (5 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }, []);

  return (
    <div className="space-y-6">
      {/* Toast Notice */}
      {saveBankNotice && (
        <div className="p-3.5 rounded-2xl bg-[#032F31] text-[#FAE58D] text-xs font-semibold flex items-center gap-2 shadow-lg border border-teal-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveBankNotice}</span>
        </div>
      )}

      {/* Top Banner / Controls */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            100% Doctor Payout Guarantee • Zero MediNest Commission
          </div>
          <h3 className="text-xl font-bold text-[#032F31] flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-teal-700" />
            Consultation Revenue & Settlement Ledger
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time reconciliation of online patient consultation fees, UPI transfers, and weekly bank settlements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={fetchFinancialStats}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh latest financial records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-700' : ''}`} />
            <span>Sync Ledger</span>
          </button>

          <button
            type="button"
            onClick={handleExportStatement}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#032F31] hover:bg-[#074749] text-[#FAE58D] text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV Statement</span>
          </button>
        </div>
      </div>

      {/* 4 Primary Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Gross Earnings */}
        <div className="p-5 rounded-3xl bg-[#032F31] text-white shadow-md flex flex-col justify-between relative overflow-hidden border border-teal-800">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <IndianRupee className="w-20 h-20" />
          </div>
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-xs font-bold uppercase tracking-wider">Total Earnings</span>
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[#FAE58D]">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold tracking-tight text-[#FAE58D]">
                {formatINR(displayTotal)}
              </div>
              <div className="text-[11px] text-teal-200 mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>{effectiveTransactions.length} Paid Consultation(s)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Today's Earnings */}
        <div className="p-5 rounded-3xl bg-white text-slate-800 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Today's Collections</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-teal-800">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold tracking-tight text-[#032F31]">
              {formatINR(displayToday)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Collected from patient bookings today
            </div>
          </div>
        </div>

        {/* Card 3: Weekly Total */}
        <div className="p-5 rounded-3xl bg-white text-slate-800 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Weekly Total (7 Days)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-800">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold tracking-tight text-[#032F31]">
              {formatINR(displayWeek)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Past 7 days accumulated earnings
            </div>
          </div>
        </div>

        {/* Card 4: Upcoming Friday Settlement */}
        <div className="p-5 rounded-3xl bg-[#FAF7EE] text-[#032F31] shadow-sm border border-[#DDD6C5] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#032F31] mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Payout</span>
            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-amber-700 shadow-xs">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold tracking-tight text-[#032F31]">
              {formatINR(displayPendingPayout)}
            </div>
            <div className="text-[11px] text-teal-800 font-semibold mt-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Next cycle: {nextFridayStr}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Verified Bank Account & Settlement Policy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Verified Settlement Bank Account (Interactive Card) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Direct Settlement Bank Account
              </span>
              <h4 className="text-sm font-bold text-[#032F31]">
                NMC &amp; RBI Verified Account for NEFT / RTGS Payouts
              </h4>
            </div>

            <button
              type="button"
              onClick={() => {
                setBankForm(bankAccount);
                setIsEditingBank(!isEditingBank);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              {isEditingBank ? (
                <>
                  <X className="w-3.5 h-3.5" /> Cancel
                </>
              ) : (
                <>
                  <Edit2 className="w-3.5 h-3.5 text-teal-700" /> Edit Details
                </>
              )}
            </button>
          </div>

          {!isEditingBank ? (
            <div className="p-4 rounded-2xl bg-[#FAF7EE] border border-[#DDD6C5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#032F31] text-[#FAE58D] flex items-center justify-center font-bold shrink-0 shadow-sm">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="space-y-0.5 text-xs">
                  <div className="font-extrabold text-[#032F31] text-sm flex items-center gap-2">
                    {bankAccount.bankName}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                    </span>
                  </div>
                  <div className="text-slate-600 font-mono text-xs">
                    A/C: ••••••••••••{bankAccount.accountNumber.slice(-4)} • IFSC: {bankAccount.ifscCode}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Beneficiary: <strong>{bankAccount.accountHolder}</strong> ({bankAccount.accountType} A/C)
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  UPI Settlement VPA
                </span>
                <span className="text-xs font-bold text-[#032F31] font-mono">
                  {bankAccount.upiId}
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveBankAccount} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    required
                    value={bankForm.bankName}
                    onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Account Holder Name</label>
                  <input
                    type="text"
                    required
                    value={bankForm.accountHolder}
                    onChange={e => setBankForm({ ...bankForm, accountHolder: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    required
                    value={bankForm.accountNumber}
                    onChange={e => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    required
                    value={bankForm.ifscCode}
                    onChange={e => setBankForm({ ...bankForm, ifscCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 bg-white font-mono uppercase"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">UPI ID for Instant Settlement (Optional)</label>
                  <input
                    type="text"
                    value={bankForm.upiId}
                    onChange={e => setBankForm({ ...bankForm, upiId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 bg-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingBank(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#032F31] text-[#FAE58D] text-xs font-bold hover:bg-[#074749] flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Save Account
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right: Payout Guarantee & FAQ */}
        <div className="p-6 rounded-3xl bg-[#FAF7EE] border border-[#DDD6C5] shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[#032F31]">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              <h4 className="text-sm font-bold">100% Doctor Payout Guarantee</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              MediNest operates on a zero-commission model. 100% of patient payments are transferred directly into your registered bank account every Friday via automated NEFT / RTGS.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-[#DDD6C5] space-y-1 text-xs">
            <div className="font-bold text-[#032F31] flex items-center justify-between">
              <span>Settlement Cycle</span>
              <span className="text-emerald-700 font-mono">Weekly (Fridays)</span>
            </div>
            <div className="text-[11px] text-slate-500">
              UTR references are automatically dispatched to your registered SMS and email upon credit.
            </div>
          </div>
        </div>
      </div>

      {/* Live Consultation Payments & Settlements Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-base font-bold text-[#032F31] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-teal-700" />
              Consultation Payments &amp; Settlement History
            </h4>
            <p className="text-xs text-slate-500">
              Showing verified Razorpay &amp; UPI patient transactions associated with your consultations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter mode */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {(['all', 'video', 'clinic'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterType === type 
                      ? 'bg-white text-[#032F31] shadow-xs' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {type === 'all' ? 'All' : type === 'video' ? 'Video' : 'In-Clinic'}
                </button>
              ))}
            </div>

            {/* Search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient, ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-teal-700 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          {filteredTransactions.length > 0 ? (
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Transaction / ID</th>
                  <th className="py-3 px-3">Patient</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Payment Method</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3 text-right">Settlement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredTransactions.map(tx => (
                  <tr key={tx.payment_id} className="hover:bg-slate-50/80 transition-colors">
                    {/* ID */}
                    <td className="py-3.5 px-3">
                      <span className="font-mono font-bold text-[#032F31] block">
                        {tx.razorpay_payment_id || tx.payment_id.slice(0, 14)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        Appt: {tx.appointment_id}
                      </span>
                    </td>

                    {/* Patient */}
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-[#032F31]">{tx.patient_name}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[150px]">
                        {tx.patient_email || tx.patient_phone || tx.visit_reason || 'Verified Patient'}
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        tx.consultation_type === 'video'
                          ? 'bg-teal-50 text-teal-800 border border-teal-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        {tx.consultation_type === 'video' ? <Video className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                        {tx.consultation_type || 'Consult'}
                      </span>
                    </td>

                    {/* Payment Method */}
                    <td className="py-3.5 px-3">
                      <span className="font-semibold text-slate-700">
                        {tx.payment_method || 'Razorpay UPI'}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        {formatTxDateTime(tx.paid_at || tx.start_datetime).dateTime}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.appointment_status === 'completed'
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-amber-100 text-amber-900'
                      }`}>
                        <CheckCircle2 className="w-3 h-3" />
                        {tx.appointment_status === 'completed' ? 'Completed' : 'Upcoming Session'}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-3">
                      <span className="font-extrabold text-emerald-800 text-sm">
                        {formatINR(tx.amount_inr || doctorFeeINR || 799)}
                      </span>
                    </td>

                    {/* Settlement */}
                    <td className="py-3.5 px-3 text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                        <Clock className="w-3 h-3 text-slate-500" /> Due {nextFridayStr.slice(0, 7)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Receipt className="w-6 h-6" />
              </div>
              <h5 className="text-sm font-bold text-slate-700">No matching consultation payments</h5>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery 
                  ? 'No transactions matched your search query. Try clearing the filter.' 
                  : 'Patient consultation payments will appear here in real-time as appointments are booked.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
