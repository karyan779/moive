import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Check,
  X,
  Search,
  RefreshCw,
  ExternalLink,
  Copy,
  Send,
  Zap,
  Eye,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Smartphone,
  Crown,
  Filter,
  ArrowUpRight,
  Lock,
  Cloud,
  Trash2
} from 'lucide-react';
import { playUiSound } from '../utils/soundEffects';

export interface PaymentSubmissionRecord {
  id: string;
  userId?: string;
  planName: string;
  credits: number;
  amountMmk: string;
  walletType: string;
  walletAccountName: string;
  walletPhone: string;
  senderPhone: string;
  txnId: string;
  slipBase64?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: number;
  approvedAt?: number;
  telegramDelivered: boolean;
  telegramError?: string;
}

export const AdminPanelView: React.FC<{
  userId?: string;
  userEmail?: string;
  onAddUserCredits?: (amount: number) => void;
}> = ({ userId = 'UID-ADMIN', userEmail = 'admin@ttakmovierecap.com', onAddUserCredits }) => {
  const [payments, setPayments] = useState<PaymentSubmissionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Lightbox preview for slip image
  const [previewSlip, setPreviewSlip] = useState<{ url: string; title: string } | null>(null);

  // Telegram test state
  const [isTestingTelegram, setIsTestingTelegram] = useState<boolean>(false);
  const [telegramTestStatus, setTelegramTestStatus] = useState<{
    tested: boolean;
    ok?: boolean;
    msg?: string;
  }>({ tested: false });

  // Manual Credit Grant Form
  const [manualPhone, setManualPhone] = useState<string>(userEmail);
  const [manualCredits, setManualCredits] = useState<number>(260);
  const [manualReason, setManualReason] = useState<string>('VIP Creator Grant');
  const [isGrantingManual, setIsGrantingManual] = useState<boolean>(false);
  const [manualGrantMsg, setManualGrantMsg] = useState<string>('');

  // Cloudflare R2 Direct Storage Config (Admin Only)
  const [r2Configured, setR2Configured] = useState<boolean>(false);
  const [r2AccountId, setR2AccountId] = useState<string>('');
  const [r2AccessKeyId, setR2AccessKeyId] = useState<string>('');
  const [r2SecretAccessKey, setR2SecretAccessKey] = useState<string>('');
  const [r2BucketName, setR2BucketName] = useState<string>('');
  const [r2PublicUrl, setR2PublicUrl] = useState<string>('');
  const [r2MaskedAccess, setR2MaskedAccess] = useState<string>('');
  const [r2MaskedSecret, setR2MaskedSecret] = useState<string>('');
  const [r2Saving, setR2Saving] = useState<boolean>(false);
  const [r2Testing, setR2Testing] = useState<boolean>(false);
  const [r2StatusMsg, setR2StatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [adminPinInput, setAdminPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('ttak_admin_unlocked') === 'true';
    } catch {
      return false;
    }
  });

  const getAdminKey = () => {
    try {
      return sessionStorage.getItem('ttak_admin_key') || '198125';
    } catch {
      return '198125';
    }
  };

  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminPinInput.trim()) {
      setPinError('Admin PIN ရိုက်ထည့်ပါ');
      return;
    }
    setIsVerifying(true);
    setPinError('');
    try {
      const res = await fetch('/api/admin/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: adminPinInput.trim() })
      });
      const data = await res.json();
      if (data.ok) {
        playUiSound('success');
        try {
          sessionStorage.setItem('ttak_admin_unlocked', 'true');
          sessionStorage.setItem('ttak_admin_key', adminPinInput.trim());
        } catch {}
        setIsUnlocked(true);
        fetchPayments();
      } else {
        playUiSound('blocked');
        setPinError(data.error || 'Admin PIN မမှန်ကန်ပါ');
      }
    } catch (err) {
      setPinError('စစ်ဆေး၍ မရပါ');
    } finally {
      setIsVerifying(false);
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payments', {
        headers: { 'x-admin-key': getAdminKey() }
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.payments)) {
        setPayments(data.payments);
      }
    } catch (err) {
      console.warn('Failed to load admin payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchR2Config = async () => {
    try {
      const res = await fetch('/api/admin/r2-config', {
        headers: { 'x-admin-key': getAdminKey() }
      });
      const data = await res.json();
      if (data.ok) {
        setR2Configured(Boolean(data.configured));
        if (data.accountId) setR2AccountId(data.accountId);
        if (data.bucketName) setR2BucketName(data.bucketName);
        setR2PublicUrl(data.publicUrl || '');
        setR2MaskedAccess(data.accessKeyIdMasked || '');
        setR2MaskedSecret(data.secretAccessKeyMasked || '');
      }
    } catch {}
  };

  useEffect(() => {
    if (isUnlocked) {
      fetchPayments();
      fetchR2Config();
    }
  }, [isUnlocked]);

  const handleSaveR2Config = async () => {
    setR2Saving(true);
    setR2StatusMsg(null);
    try {
      const res = await fetch('/api/admin/r2-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': getAdminKey()
        },
        body: JSON.stringify({
          accountId: r2AccountId,
          accessKeyId: r2AccessKeyId,
          secretAccessKey: r2SecretAccessKey,
          bucketName: r2BucketName,
          publicUrl: r2PublicUrl
        })
      });
      const data = await res.json();
      if (data.ok) {
        playUiSound('success');
        setR2Configured(true);
        setR2MaskedAccess(data.accessKeyIdMasked || '');
        setR2MaskedSecret(data.secretAccessKeyMasked || '');
        setR2AccessKeyId('');
        setR2SecretAccessKey('');
        setR2StatusMsg({ ok: true, text: `✓ Cloudflare R2 Direct (${data.bucketName}) သိမ်းဆည်းပြီးပါပြီ!` });
      } else {
        playUiSound('blocked');
        setR2StatusMsg({ ok: false, text: data.error || 'R2 Config သိမ်းဆည်း၍မရပါ' });
      }
    } catch (err) {
      playUiSound('blocked');
      setR2StatusMsg({ ok: false, text: String(err) });
    } finally {
      setR2Saving(false);
    }
  };

  const handleTestAndCorsR2 = async () => {
    setR2Testing(true);
    setR2StatusMsg(null);
    try {
      const res = await fetch('/api/admin/r2-test-cors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': getAdminKey()
        },
        body: JSON.stringify({
          accountId: r2AccountId,
          accessKeyId: r2AccessKeyId,
          secretAccessKey: r2SecretAccessKey,
          bucketName: r2BucketName,
          publicUrl: r2PublicUrl
        })
      });
      const data = await res.json();
      if (data.ok) {
        playUiSound('success');
        setR2Configured(true);
        setR2StatusMsg({ ok: true, text: data.message });
        fetchR2Config();
      } else {
        playUiSound('blocked');
        setR2StatusMsg({ ok: false, text: data.error || 'R2 Test & CORS Setup မအောင်မြင်ပါ' });
      }
    } catch (err) {
      playUiSound('blocked');
      setR2StatusMsg({ ok: false, text: String(err) });
    } finally {
      setR2Testing(false);
    }
  };

  const handleClearR2Config = async () => {
    playUiSound('tap');
    try {
      await fetch('/api/admin/r2-config', {
        method: 'DELETE',
        headers: { 'x-admin-key': getAdminKey() }
      });
      setR2Configured(false);
      setR2AccountId('');
      setR2AccessKeyId('');
      setR2SecretAccessKey('');
      setR2BucketName('');
      setR2PublicUrl('');
      setR2MaskedAccess('');
      setR2MaskedSecret('');
      setR2StatusMsg({ ok: true, text: 'R2 Config ကို ဖယ်ရှားပြီးပါပြီ (Local Stream Fallback)' });
    } catch {}
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    playUiSound('tap');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleApprove = async (record: PaymentSubmissionRecord) => {
    playUiSound('tap');
    try {
      const res = await fetch('/api/admin/payments/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': getAdminKey()
        },
        body: JSON.stringify({ id: record.id })
      });
      const data = await res.json();
      if (data.ok) {
        playUiSound('success');
        setPayments((prev) =>
          prev.map((p) =>
            p.id === record.id
              ? { ...p, status: 'approved', approvedAt: Date.now() }
              : p
          )
        );
        if (onAddUserCredits) {
          onAddUserCredits(record.credits);
        }
      }
    } catch (err) {
      console.error('Approve failed:', err);
    }
  };

  const handleReject = async (id: string) => {
    playUiSound('tap');
    const reason = window.prompt(
      'ငြင်းပယ်ရသည့် အကြောင်းပြချက် ထည့်သွင်းပါ (Rejection Reason):',
      'ငွေလွှဲပြေစာ မမှန်ကန်ပါ သို့မဟုတ် လုပ်ငန်းစဉ် ID မကိုက်ညီပါ'
    );
    if (!reason) return;

    try {
      const res = await fetch('/api/admin/payments/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': getAdminKey()
        },
        body: JSON.stringify({ id, reason })
      });
      const data = await res.json();
      if (data.ok) {
        playUiSound('blocked');
        setPayments((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, status: 'rejected', rejectionReason: reason } : p
          )
        );
      }
    } catch (err) {
      console.error('Reject failed:', err);
    }
  };

  const handleTestTelegram = async () => {
    setIsTestingTelegram(true);
    setTelegramTestStatus({ tested: false });
    try {
      const res = await fetch('/api/admin/telegram-test', {
        method: 'POST',
        headers: { 'x-admin-key': getAdminKey() }
      });
      const data = await res.json();
      if (data.ok) {
        playUiSound('success');
        setTelegramTestStatus({
          tested: true,
          ok: true,
          msg: 'Telegram Bot သို့ စမ်းသပ်မက်ဆေ့ခ်ျ အောင်မြင်စွာ ပို့ပြီးပါပြီ!'
        });
      } else {
        playUiSound('blocked');
        setTelegramTestStatus({
          tested: true,
          ok: false,
          msg: data.error || 'Telegram Bot သို့ ချိတ်ဆက်၍ မရသေးပါ'
        });
      }
    } catch (err) {
      setTelegramTestStatus({
        tested: true,
        ok: false,
        msg: String(err)
      });
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const handleManualGrant = async () => {
    if (!manualPhone.trim()) {
      setManualGrantMsg('ဖုန်းနံပါတ် သို့မဟုတ် Email ထည့်ပါ');
      return;
    }
    setIsGrantingManual(true);
    setManualGrantMsg('');
    try {
      const res = await fetch('/api/admin/manual-credit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': getAdminKey()
        },
        body: JSON.stringify({
          targetPhoneOrEmail: manualPhone.trim(),
          credits: manualCredits,
          reason: manualReason
        })
      });
      const data = await res.json();
      if (data.ok) {
        playUiSound('success');
        setManualGrantMsg(`+${manualCredits} Credits ထည့်သွင်း အောင်မြင်ပါသည်!`);
        setManualPhone('');
        fetchPayments();
        if (onAddUserCredits) {
          onAddUserCredits(manualCredits);
        }
      }
    } catch (err) {
      setManualGrantMsg(String(err));
    } finally {
      setIsGrantingManual(false);
    }
  };

  // Filtered payments
  const filteredPayments = payments.filter((p) => {
    const matchesFilter = statusFilter === 'all' || p.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      p.senderPhone.toLowerCase().includes(q) ||
      p.txnId.toLowerCase().includes(q) ||
      p.planName.toLowerCase().includes(q) ||
      p.walletType.toLowerCase().includes(q);
    return matchesFilter && matchesQuery;
  });

  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const approvedCount = payments.filter((p) => p.status === 'approved').length;
  const totalCreditsGranted = payments
    .filter((p) => p.status === 'approved')
    .reduce((sum, p) => sum + (p.credits || 0), 0);

  if (!isUnlocked) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-black/[0.1] dark:border-white/[0.1] bg-white dark:bg-[#121217] p-7 shadow-2xl space-y-6 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 ring-8 ring-amber-500/5">
            <Lock className="size-8" />
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
              <ShieldCheck className="size-3.5" />
              <span>Admin Security Gate</span>
            </div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">
              TTAK Admin Access Lock
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
              ဤနေရာသည် တာဝန်ရှိ Admin သာ ဝင်ရောက်ခွင့်ရှိပါသည်။ ဆက်လက်လုပ်ဆောင်ရန် လျှို့ဝှက် Admin PIN (၆ လုံး) ကို ရိုက်ထည့်ပါ။
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <input
                type="password"
                maxLength={10}
                autoFocus
                value={adminPinInput}
                onChange={(e) => {
                  setAdminPinInput(e.target.value);
                  if (pinError) setPinError('');
                }}
                placeholder="Admin PIN ရိုက်ထည့်ပါ..."
                className="w-full text-center tracking-[0.3em] font-mono text-xl py-3.5 px-4 rounded-2xl border border-black/[0.15] dark:border-white/[0.15] bg-gray-50 dark:bg-[#1A1A22] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {pinError && (
                <p className="mt-2 text-xs font-bold text-red-500">
                  {pinError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full h-12 flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm transition-all cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  <span>စစ်ဆေးနေပါသည်...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" />
                  <span>Admin Panel ဖွင့်မည် (Unlock)</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-gray-400 dark:text-zinc-500">
            🔒 Server-side PIN Protected (403 Guard Active)
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-3xl border border-black/[0.08] dark:border-white/[0.09] bg-white dark:bg-[#111116] p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-0.5 text-[11px] font-extrabold text-amber-500 uppercase tracking-wider">
              <Crown className="size-3.5 fill-amber-500" />
              TTAK RECAP · ADMIN PANEL
            </span>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-500">
              Live Gateway Active
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white mt-1">
            Credit & Mobile Wallet ငွေလွှဲ အတည်ပြုခြင်း စနစ် (Admin Center)
          </h1>
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            Wave Pay & KBZ Pay ပြေစာများနှင့် Transaction ID (နောက်ဆုံး ၆ လုံး) ကို စစ်ဆေး၍ Credit ထည့်ပေးနိုင်ပါသည်
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              playUiSound('tap');
              fetchPayments();
            }}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-gray-50 dark:bg-[#18181F] px-3.5 py-2 text-xs font-bold text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-[#202028] cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin text-sky-500' : ''}`} />
            <span>Refresh Slips</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playUiSound('close');
              try {
                sessionStorage.removeItem('ttak_admin_unlocked');
                sessionStorage.removeItem('ttak_admin_key');
              } catch {}
              setIsUnlocked(false);
              setAdminPinInput('');
            }}
            className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/20 cursor-pointer"
          >
            <Lock className="size-3.5" />
            <span>Lock Panel</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Pending Approvals</span>
            <Clock className="size-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-2">
            {pendingCount} <span className="text-xs font-normal text-gray-400">စစ်ဆေးရန် ပြေစာ</span>
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Approved Payments</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-2">
            {approvedCount} <span className="text-xs font-normal text-gray-400">အတည်ပြုပြီး</span>
          </p>
        </div>

        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.04] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-600 dark:text-sky-400">Credits Granted</span>
            <Zap className="size-4 text-sky-500 fill-sky-500" />
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-2">
            +{totalCreditsGranted.toLocaleString()} <span className="text-xs font-normal text-gray-400">Credits</span>
          </p>
        </div>

        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/[0.04] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400">Total Submissions</span>
            <CreditCard className="size-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-2">
            {payments.length} <span className="text-xs font-normal text-gray-400">စုစုပေါင်း</span>
          </p>
        </div>
      </div>

      {/* Row: Telegram Bot Config Card & Mobile Wallet Accounts Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Telegram Bot Card */}
        <div className="lg:col-span-2 rounded-3xl border border-sky-500/30 bg-white dark:bg-[#111116] p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-sky-500 text-white">
                <Send className="size-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Telegram Bot Notification Engine
                </h3>
                <p className="text-xs text-sky-500 font-medium">@ttakrecap_bot · MOVIE RECAP ADMIN</p>
              </div>
            </div>

            <a
              href="https://t.me/ttakrecap_bot"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 rounded-xl bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 transition-colors"
            >
              <span>Open Bot</span>
              <ArrowUpRight className="size-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Telegram Bot Token</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                  <ShieldCheck className="size-3" />
                  Server Secured
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-gray-600 dark:text-zinc-400 tracking-wider">
                  •••••••••••••••••••••••••••••
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  Active on Server
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.07] bg-gray-50/70 dark:bg-[#18181F] p-3 space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Admin Chat / User ID</span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-gray-900 dark:text-white">
                  1981253384
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('1981253384', 'admin_id')}
                  className="text-sky-500 hover:underline text-[10px] font-bold cursor-pointer"
                >
                  {copiedKey === 'admin_id' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          {/* Test Bot Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-black/[0.05] dark:border-white/[0.05]">
            <p className="text-[11px] text-gray-500 dark:text-zinc-400">
              💡 မှတ်ချက်: Bot မက်ဆေ့ခ်ျ လက်ခံရရှိရန် Telegram တွင် <strong>@ttakrecap_bot</strong> သို့ <strong>/start</strong> နှိပ်ထားပေးရပါမည်။
            </p>

            <button
              type="button"
              onClick={handleTestTelegram}
              disabled={isTestingTelegram}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Send className="size-3.5" />
              <span>{isTestingTelegram ? 'စမ်းသပ်နေပါသည်...' : 'Telegram စမ်းသပ် Ping ပို့ရန်'}</span>
            </button>
          </div>

          {telegramTestStatus.tested && (
            <div
              className={`rounded-xl p-3 text-xs flex items-start gap-2 ${
                telegramTestStatus.ok
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300'
              }`}
            >
              {telegramTestStatus.ok ? (
                <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <p className="font-bold">{telegramTestStatus.msg}</p>
                {!telegramTestStatus.ok && (
                  <p className="text-[11px] opacity-90">
                    ကျေးဇူးပြု၍ Telegram ထဲသို့ သွားရောက်ကာ <a href="https://t.me/ttakrecap_bot" target="_blank" rel="noreferrer" className="underline font-bold">@ttakrecap_bot</a> ကို ရှာဖွေပြီး <strong>/start</strong> နှိပ်ပြီးမှ ထပ်မံစမ်းသပ်ပါ။
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Wallet Accounts & Quick Manual Credit Tool */}
        <div className="rounded-3xl border border-black/[0.08] dark:border-white/[0.09] bg-white dark:bg-[#111116] p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Official Receiving Accounts
            </h3>
            <p className="text-xs text-gray-500">အသုံးပြုသူများ ငွေလွှဲရန် သတ်မှတ်ထားသော ဖုန်းအကောင့်များ</p>
          </div>

          {/* Wave Pay Account */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src="/assets/payment/wavepay.png"
                alt="Wave Pay"
                className="h-8 object-contain rounded-md"
              />
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">KAUNG HTET</p>
                <p className="font-mono text-xs font-extrabold text-amber-600 dark:text-amber-400">
                  09772350006
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleCopy('09772350006', 'wave_phone')}
              className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Copy className="size-3" />
              <span>{copiedKey === 'wave_phone' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* KBZ Pay Account */}
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/[0.04] p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src="/assets/payment/kbzpay.png"
                alt="KBZ Pay"
                className="h-8 object-contain rounded-md"
              />
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">Ma Pyone Pyone</p>
                <p className="font-mono text-xs font-extrabold text-blue-600 dark:text-blue-400">
                  09797407339
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleCopy('09797407339', 'kbz_phone')}
              className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Copy className="size-3" />
              <span>{copiedKey === 'kbz_phone' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Manual Add Credit Tool */}
          <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.05] space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <Zap className="size-3.5 text-amber-500 fill-amber-500" />
                <span>Manual Credit တိုက်ရိုက် ထည့်ပေးရန်</span>
              </p>
              <div className="flex items-center gap-1.5">
                {userEmail && (
                  <button
                    type="button"
                    onClick={() => {
                      setManualPhone(userEmail);
                      playUiSound('tap');
                    }}
                    className="text-[10px] text-gray-500 font-bold hover:underline cursor-pointer"
                  >
                    Email
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <input
                type="text"
                placeholder="အသုံးပြုသူ ဖုန်း သို့မဟုတ် Email (e.g. 09... / email)"
                value={manualPhone}
                onChange={(e) => setManualPhone(e.target.value)}
                className="w-full rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-gray-50 dark:bg-[#18181F] px-3 py-2 text-xs text-gray-900 dark:text-white outline-none focus:border-amber-500"
              />

              {/* Quick Amount Pills */}
              <div className="flex flex-wrap gap-1.5">
                {[100, 260, 560, 1000, 3000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setManualCredits(amt);
                      playUiSound('select');
                    }}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold cursor-pointer transition-colors ${
                      manualCredits === amt
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-gray-100 dark:bg-[#202028] text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-[#2a2a34]'
                    }`}
                  >
                    +{amt.toLocaleString()} Cr
                  </button>
                ))}
              </div>

              {/* Custom Number Input */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-gray-400 font-medium">Custom Amount:</span>
                <input
                  type="number"
                  min={1}
                  max={50000}
                  value={manualCredits}
                  onChange={(e) => setManualCredits(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-24 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-gray-50 dark:bg-[#18181F] px-2.5 py-1 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-amber-500"
                />
                <span className="text-xs text-amber-500 font-bold">Credits</span>
              </div>
            </div>

            <button
              type="button"
              disabled={isGrantingManual}
              onClick={handleManualGrant}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-white py-2.5 text-xs font-extrabold shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Zap className="size-3.5 fill-white" />
              <span>{isGrantingManual ? 'ထည့်ပေးနေပါသည်...' : `+${manualCredits.toLocaleString()} Credits ချက်ချင်း ထည့်မည်`}</span>
            </button>
            {manualGrantMsg && (
              <p className="text-[11px] text-emerald-500 font-bold text-center bg-emerald-500/10 py-1.5 rounded-lg">{manualGrantMsg}</p>
            )}
          </div>
        </div>
      </div>

      {/* Cloudflare R2 Direct Storage Setup (Admin PIN Protected) */}
      <div
        data-testid="admin-r2-card"
        className="rounded-3xl border border-orange-500/25 bg-white dark:bg-[#111116] p-5 space-y-4 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-orange-500/15 text-orange-500">
              <Cloud className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
                  Cloudflare R2 Direct Storage (Up to 2GB Multipart)
                </h3>
                <span
                  data-testid="admin-r2-badge"
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                    r2Configured
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400'
                  }`}
                >
                  {r2Configured ? 'R2 Direct Active' : 'Not Configured · Local Fallback'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                StreamWave စနစ်အတိုင်း Server Presigned / Multipart Direct Upload (2GB ထိ) — <span className="font-mono font-bold text-orange-500">.env</span> (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME) သို့မဟုတ် ဤ Admin Panel မှ တိုက်ရိုက် ချိတ်ဆက်နိုင်ပါသည်
              </p>
            </div>
          </div>

          {r2Configured && (
            <button
              type="button"
              onClick={handleClearR2Config}
              className="inline-flex items-center gap-1 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-500/20 cursor-pointer shrink-0"
            >
              <Trash2 className="size-3.5" />
              <span>Clear R2</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
              Cloudflare Account ID
            </label>
            <input
              data-testid="admin-r2-account-input"
              type="text"
              value={r2AccountId}
              onChange={(e) => setR2AccountId(e.target.value)}
              placeholder="e.g. a1b2c3d4e5f6..."
              className="w-full rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-gray-50 dark:bg-[#18181F] px-3 py-2 text-xs font-mono text-gray-900 dark:text-white outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
              R2 Access Key ID
            </label>
            <input
              data-testid="admin-r2-access-input"
              type="password"
              value={r2AccessKeyId}
              onChange={(e) => setR2AccessKeyId(e.target.value)}
              placeholder={r2MaskedAccess || 'Access Key ID'}
              className="w-full rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-gray-50 dark:bg-[#18181F] px-3 py-2 text-xs font-mono text-gray-900 dark:text-white outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
              R2 Secret Access Key
            </label>
            <input
              data-testid="admin-r2-secret-input"
              type="password"
              value={r2SecretAccessKey}
              onChange={(e) => setR2SecretAccessKey(e.target.value)}
              placeholder={r2MaskedSecret || 'Secret Access Key'}
              className="w-full rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-gray-50 dark:bg-[#18181F] px-3 py-2 text-xs font-mono text-gray-900 dark:text-white outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
              Bucket Name
            </label>
            <input
              data-testid="admin-r2-bucket-input"
              type="text"
              value={r2BucketName}
              onChange={(e) => setR2BucketName(e.target.value)}
              placeholder="ttak-recap-videos"
              className="w-full rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-gray-50 dark:bg-[#18181F] px-3 py-2 text-xs font-mono text-gray-900 dark:text-white outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
              Public CDN URL (Optional)
            </label>
            <input
              data-testid="admin-r2-public-input"
              type="url"
              value={r2PublicUrl}
              onChange={(e) => setR2PublicUrl(e.target.value)}
              placeholder="https://cdn.yourdomain.com"
              className="w-full rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-gray-50 dark:bg-[#18181F] px-3 py-2 text-xs font-mono text-gray-900 dark:text-white outline-none focus:border-orange-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="admin-r2-save-btn"
              disabled={r2Saving}
              onClick={handleSaveR2Config}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 text-xs font-bold hover:opacity-90 cursor-pointer disabled:opacity-50"
            >
              <Check className="size-3.5" />
              <span>{r2Saving ? 'သိမ်းဆည်းနေသည်...' : 'Save R2 Config'}</span>
            </button>
            <button
              type="button"
              data-testid="admin-r2-test-btn"
              disabled={r2Testing}
              onClick={handleTestAndCorsR2}
              className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white px-4 py-2 text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${r2Testing ? 'animate-spin' : ''}`} />
              <span>{r2Testing ? 'စစ်ဆေးနေသည်...' : 'Test & Auto-Setup CORS'}</span>
            </button>
          </div>

          {r2StatusMsg && (
            <p
              data-testid="admin-r2-status-msg"
              className={`text-xs font-bold ${
                r2StatusMsg.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
              }`}
            >
              {r2StatusMsg.text}
            </p>
          )}
        </div>
      </div>

      {/* Guide Notice Banner: 2 Ways to Grant Credits */}
      <div className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.05] p-4 text-xs space-y-2">
        <p className="font-extrabold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
          <ShieldCheck className="size-4" />
          <span>Admin ဘက်မှ Credit ပြန်လည်ထည့်သွင်းပေးနိုင်သည့် နည်းလမ်း ၂ မျိုး:</span>
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-700 dark:text-zinc-300">
          <div className="rounded-xl bg-white/70 dark:bg-black/20 p-2.5 border border-sky-500/15 space-y-1">
            <p className="font-bold text-gray-900 dark:text-white">
              နည်းလမ်း ၁။ ငွေလွှဲပြေစာကို အတည်ပြုပြီး ထည့်ပေးခြင်း (Approve Slip)
            </p>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400">
              User များ Wallet မှ တင်ထားသော Wave / KBZ Pay ပြေစာအောက်ရှိ အစိမ်းရောင် <strong>"အတည်ပြုမည် (+... Cr)"</strong> ခလုတ်ကို နှိပ်လိုက်ရုံဖြင့် အကောင့်ထဲသို့ Credit ချက်ချင်း ရောက်ရှိသွားပါမည်။
            </p>
          </div>
          <div className="rounded-xl bg-white/70 dark:bg-black/20 p-2.5 border border-sky-500/15 space-y-1">
            <p className="font-bold text-gray-900 dark:text-white">
              နည်းလမ်း ၂။ Manual တိုက်ရိုက် ထည့်ပေးခြင်း (Direct Manual Grant)
            </p>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400">
              အပေါ်ဘက်ရှိ <strong>"Manual Credit တိုက်ရိုက် ထည့်ပေးရန်"</strong> Card တွင် User ၏ Phone/Email ထည့်ပြီး မိမိစိတ်ကြိုက် Credit ပမာဏ ရွေးချယ်ကာ <strong>"Credit ချက်ချင်း ထည့်မည်"</strong> ကို နှိပ်ပါ။
            </p>
          </div>
        </div>
      </div>

      {/* Slips Management Section */}
      <div className="rounded-3xl border border-black/[0.08] dark:border-white/[0.09] bg-white dark:bg-[#111116] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white">
              ငွေလွှဲပြေစာများနှင့် အတည်ပြုရန် စာရင်း ({filteredPayments.length})
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Transaction ID ၆ လုံး နှင့် Screenshot ပြေစာကို စစ်ဆေးအတည်ပြုပါ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter buttons */}
            <div className="inline-flex rounded-xl bg-gray-100 dark:bg-[#18181E] p-1 text-xs">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    playUiSound('select');
                    setStatusFilter(status);
                  }}
                  className={`rounded-lg px-2.5 py-1 font-bold capitalize cursor-pointer ${
                    statusFilter === status
                      ? 'bg-white dark:bg-[#26262E] text-gray-900 dark:text-white shadow-xs'
                      : 'text-gray-500'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-60">
              <Search className="size-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ဖုန်း / Txn ID ရှာဖွေရန်..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-gray-50 dark:bg-[#18181F] pl-8 pr-3 py-1.5 text-xs text-gray-900 dark:text-white outline-none"
              />
            </div>
          </div>
        </div>

        {/* Slips List */}
        {filteredPayments.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <CheckCircle2 className="size-10 text-gray-300 dark:text-neutral-700 mx-auto" />
            <p className="text-sm font-bold text-gray-500">ပြေစာ မရှိသေးပါ (No payment records)</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPayments.map((record) => {
              const isWave = record.walletType.toLowerCase().includes('wave');
              return (
                <div
                  key={record.id}
                  className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                    record.status === 'pending'
                      ? 'border-amber-500/40 bg-amber-500/[0.02] shadow-sm'
                      : record.status === 'approved'
                      ? 'border-emerald-500/30 bg-emerald-500/[0.02]'
                      : 'border-red-500/20 bg-red-500/[0.01]'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Row: Wallet & Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <img
                          src={isWave ? '/assets/payment/wavepay.png' : '/assets/payment/kbzpay.png'}
                          alt={record.walletType}
                          className="h-5 object-contain rounded"
                        />
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          {record.walletType}
                        </span>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                          record.status === 'pending'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            : record.status === 'approved'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-red-500/15 text-red-600 dark:text-red-400'
                        }`}
                      >
                        {record.status}
                      </span>
                    </div>

                    {/* Transaction Details Box */}
                    <div className="rounded-xl border border-black/[0.05] dark:border-white/[0.06] bg-gray-50 dark:bg-[#17171C] p-3 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Plan & Credits:</span>
                        <span className="font-extrabold text-gray-900 dark:text-white">
                          {record.planName} (+{record.credits} Cr)
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">ပမာဏ (Amount):</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {record.amountMmk}
                        </span>
                      </div>

                      {record.senderPhone && record.senderPhone !== '-' ? (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">လွှဲသူဖုန်း (Sender):</span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono font-bold text-gray-900 dark:text-white">
                              {record.senderPhone}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(record.senderPhone, `sender_${record.id}`)}
                              className="text-gray-400 hover:text-sky-500 cursor-pointer"
                            >
                              <Copy className="size-3" />
                            </button>
                          </div>
                        </div>
                      ) : null}

                      <div className="flex items-center justify-between pt-1 border-t border-black/[0.05] dark:border-white/[0.05]">
                        <span className="text-sky-500 font-bold">Txn ID (၆ လုံး):</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-sm font-black text-sky-500 bg-sky-500/10 px-2 py-0.5 rounded-md">
                            {record.txnId}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(record.txnId, `txn_${record.id}`)}
                            className="text-gray-400 hover:text-sky-500 cursor-pointer"
                          >
                            <Copy className="size-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Screenshot Preview */}
                    {record.slipBase64 ? (
                      <div
                        onClick={() =>
                          setPreviewSlip({
                            url: record.slipBase64 as string,
                            title: `Slip: ${record.planName} (${record.txnId})`
                          })
                        }
                        className="group relative flex items-center justify-center rounded-xl overflow-hidden border border-black/[0.1] dark:border-white/[0.1] h-32 bg-black/5 cursor-pointer"
                      >
                        <img
                          src={record.slipBase64}
                          alt="Payment Slip"
                          className="size-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                          <Eye className="size-4" />
                          <span>ပြေစာ အပြည့်အစုံ ကြည့်မည်</span>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-black/[0.08] dark:border-white/[0.08] py-2 px-3 text-center text-[11px] text-gray-400">
                        Screenshot မပါရှိပါ (No Image Slip)
                      </div>
                    )}

                    <div className="text-[10px] text-gray-400 flex items-center justify-between">
                      <span>{new Date(record.createdAt).toLocaleString('my-MM')}</span>
                      <span>
                        Telegram:{' '}
                        <strong className={record.telegramDelivered ? 'text-emerald-500' : 'text-amber-500'}>
                          {record.telegramDelivered ? 'Delivered' : 'Pending'}
                        </strong>
                      </span>
                    </div>

                    {record.rejectionReason && (
                      <p className="text-[11px] text-red-500 italic bg-red-500/10 p-2 rounded-lg">
                        ငြင်းပယ်ရခြင်း: {record.rejectionReason}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 mt-3 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center gap-2">
                    {record.status === 'pending' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApprove(record)}
                          className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white py-2 text-xs font-extrabold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Check className="size-3.5 stroke-[3]" />
                          <span>အတည်ပြုမည် (+{record.credits} Cr)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(record.id)}
                          className="rounded-xl border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 px-3 py-2 text-xs font-bold cursor-pointer"
                        >
                          ငြင်းမည်
                        </button>
                      </>
                    ) : record.status === 'approved' ? (
                      <div className="w-full flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 py-1.5 px-3 rounded-xl">
                        <span className="flex items-center gap-1">
                          <Check className="size-3.5 stroke-[3]" />
                          <span>အတည်ပြုပြီး (+{record.credits} Credits ထည့်ပြီးပါပြီ)</span>
                        </span>
                      </div>
                    ) : (
                      <div className="w-full flex items-center justify-between text-xs text-red-500 font-bold bg-red-500/10 py-1.5 px-3 rounded-xl">
                        <span>ငြင်းပယ်ထားပါသည်</span>
                        <button
                          type="button"
                          onClick={() => handleApprove(record)}
                          className="underline text-[11px] hover:opacity-80 cursor-pointer"
                        >
                          ပြန်လည်အတည်ပြုမည်
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slip Full Preview Lightbox Modal */}
      {previewSlip && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 cursor-pointer"
          onClick={() => setPreviewSlip(null)}
        >
          <div
            className="relative max-w-xl max-h-[90vh] bg-neutral-900 border border-white/20 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 border-b border-white/10 text-white">
              <span className="text-xs font-bold">{previewSlip.title}</span>
              <button
                type="button"
                onClick={() => setPreviewSlip(null)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="p-2 overflow-auto max-h-[80vh] flex items-center justify-center">
              <img
                src={previewSlip.url}
                alt="Payment Slip Full Preview"
                className="max-h-[75vh] w-auto rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
