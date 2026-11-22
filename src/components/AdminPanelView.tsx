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
  Trash2,
  Ban,
  MinusCircle,
  Users,
  Film,
  LogIn,
  ShieldAlert,
  UserCheck
} from 'lucide-react';
import { playUiSound } from '../utils/soundEffects';
import { getClientAuthHeaders } from '../utils/recapEngine';

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

export interface AdminUserSummary {
  userId: string;
  name: string;
  email: string;
  credits: number;
  isPaidUser: boolean;
  isBanned: boolean;
  banReason?: string;
  paidVideosToday: number;
  totalPaidVideos: number;
  freeUsedToday: number;
  totalFreeVideos: number;
  createdAt?: number;
}

export interface BannedUserSummary {
  email?: string;
  userId?: string;
  reason: string;
  bannedAt: number;
  bannedBy: string;
}

export const AdminPanelView: React.FC<{
  userId?: string;
  userEmail?: string;
  onAddUserCredits?: (amount: number) => void;
  onOpenSignIn?: () => void;
}> = ({ userId = '', userEmail = '', onAddUserCredits, onOpenSignIn }) => {
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

  // Manual Credit Grant / Deduct Form
  const [creditToolMode, setCreditToolMode] = useState<'grant' | 'deduct'>('grant');
  const [manualPhone, setManualPhone] = useState<string>('');
  const [manualCredits, setManualCredits] = useState<number>(260);
  const [deductAllMode, setDeductAllMode] = useState<boolean>(false);
  const [manualReason, setManualReason] = useState<string>('VIP Creator Grant');
  const [isGrantingManual, setIsGrantingManual] = useState<boolean>(false);
  const [manualGrantMsg, setManualGrantMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Users, Credit Mode Video Stats & Ban Management
  const [adminUsers, setAdminUsers] = useState<AdminUserSummary[]>([]);
  const [bannedUsers, setBannedUsers] = useState<BannedUserSummary[]>([]);
  const [usersStats, setUsersStats] = useState<{
    totalUsers: number;
    paidUsersCount: number;
    bannedUsersCount: number;
    totalPaidVideosToday: number;
    totalPaidVideosAllTime: number;
  }>({
    totalUsers: 0,
    paidUsersCount: 0,
    bannedUsersCount: 0,
    totalPaidVideosToday: 0,
    totalPaidVideosAllTime: 0
  });
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [userListFilter, setUserListFilter] = useState<'all' | 'paid' | 'banned'>('all');
  const [banTargetInput, setBanTargetInput] = useState<string>('');
  const [banReasonInput, setBanReasonInput] = useState<string>('Unauthorized Credit Exploitation');
  const [isBanning, setIsBanning] = useState<boolean>(false);
  const [banActionMsg, setBanActionMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busyUserKey, setBusyUserKey] = useState<string | null>(null);

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

  // Dual-Layer Security Gate (Owner Gmail Session + In-Memory Signed Admin Token ONLY)
  const [adminToken, setAdminToken] = useState<string>('');
  const [adminPinInput, setAdminPinInput] = useState<string>('');
  const [setupPasscode, setSetupPasscode] = useState<string>('');
  const [setupConfirmPasscode, setSetupConfirmPasscode] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [adminGateStatus, setAdminGateStatus] = useState<{
    loading: boolean;
    isOwner: boolean;
    authenticated: boolean;
    signedInEmail: string;
    needsSetup: boolean;
    source: string;
  }>({
    loading: true,
    isOwner: false,
    authenticated: false,
    signedInEmail: '',
    needsSetup: false,
    source: 'none'
  });

  const isUnlocked = Boolean(adminToken);

  const getAdminHeaders = (extra?: Record<string, string>): Record<string, string> => ({
    ...getClientAuthHeaders(),
    ...(adminToken ? { 'x-admin-session': adminToken } : {}),
    ...(extra || {})
  });

  const checkAdminStatus = async () => {
    setAdminGateStatus((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/admin/status', {
        headers: getClientAuthHeaders(),
        cache: 'no-store'
      });
      const data = await res.json();
      setAdminGateStatus({
        loading: false,
        isOwner: Boolean(data.isOwner),
        authenticated: Boolean(data.authenticated),
        signedInEmail: String(data.signedInEmail || ''),
        needsSetup: Boolean(data.needsSetup),
        source: String(data.source || 'none')
      });
      if (!data.isOwner) {
        setAdminToken('');
      }
    } catch {
      setAdminGateStatus((prev) => ({ ...prev, loading: false, isOwner: false }));
    }
  };

  useEffect(() => {
    checkAdminStatus();
  }, [userEmail, userId]);

  const handleBootstrapPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    const pass = setupPasscode.trim();
    if (pass.length < 8) {
      setPinError('Admin Password သည် အနည်းဆုံး ၈ လုံး ရှိရပါမည်');
      return;
    }
    if (pass !== setupConfirmPasscode.trim()) {
      setPinError('Password နှစ်ခု မတူညီပါ — ပြန်စစ်ပေးပါ');
      return;
    }
    setIsVerifying(true);
    setPinError('');
    try {
      const res = await fetch('/api/admin/bootstrap-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getClientAuthHeaders() },
        body: JSON.stringify({ passcode: pass })
      });
      const data = await res.json();
      if (data.ok && data.adminToken) {
        playUiSound('success');
        setAdminToken(String(data.adminToken));
        setSetupPasscode('');
        setSetupConfirmPasscode('');
        setAdminGateStatus((prev) => ({ ...prev, needsSetup: false, source: 'claimed' }));
      } else {
        playUiSound('blocked');
        setPinError(data.error || 'Admin Password သတ်မှတ်၍ မရပါ');
      }
    } catch {
      setPinError('Server နှင့် ချိတ်ဆက်၍ မရပါ');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminPinInput.trim()) {
      setPinError('Admin Password ရိုက်ထည့်ပါ');
      return;
    }
    setIsVerifying(true);
    setPinError('');
    try {
      const res = await fetch('/api/admin/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getClientAuthHeaders() },
        body: JSON.stringify({ passcode: adminPinInput.trim() })
      });
      const data = await res.json();
      if (data.ok && data.adminToken) {
        playUiSound('success');
        setAdminToken(String(data.adminToken));
        setAdminPinInput('');
      } else {
        playUiSound('blocked');
        if (data.needsSetup) {
          setAdminGateStatus((prev) => ({ ...prev, needsSetup: true }));
        }
        setPinError(data.error || 'Admin Password မမှန်ကန်ပါ');
      }
    } catch {
      setPinError('စစ်ဆေး၍ မရပါ');
    } finally {
      setIsVerifying(false);
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payments', {
        headers: getAdminHeaders()
      });
      if (res.status === 403) {
        setAdminToken('');
        return;
      }
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

  const fetchAdminUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: getAdminHeaders()
      });
      if (res.status === 403) {
        setAdminToken('');
        return;
      }
      const data = await res.json();
      if (data.ok) {
        setAdminUsers(Array.isArray(data.users) ? data.users : []);
        setBannedUsers(Array.isArray(data.bannedUsers) ? data.bannedUsers : []);
        setUsersStats({
          totalUsers: Number(data.totalUsers || 0),
          paidUsersCount: Number(data.paidUsersCount || 0),
          bannedUsersCount: Number(data.bannedUsersCount || 0),
          totalPaidVideosToday: Number(data.totalPaidVideosToday || 0),
          totalPaidVideosAllTime: Number(data.totalPaidVideosAllTime || 0)
        });
      }
    } catch (err) {
      console.warn('Failed to load admin users:', err);
    }
  };

  const fetchR2Config = async () => {
    try {
      const res = await fetch('/api/admin/r2-config', {
        headers: getAdminHeaders()
      });
      if (res.status === 403) {
        setAdminToken('');
        return;
      }
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
      fetchAdminUsers();
      fetchR2Config();
    }
  }, [isUnlocked]);

  const handleSaveR2Config = async () => {
    setR2Saving(true);
    setR2StatusMsg(null);
    try {
      const res = await fetch('/api/admin/r2-config', {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
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
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
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
        headers: getAdminHeaders()
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
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
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
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
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
        headers: getAdminHeaders()
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
      setManualGrantMsg({ ok: false, text: 'အသုံးပြုသူ Gmail သို့မဟုတ် UID ထည့်ပါ' });
      return;
    }
    setIsGrantingManual(true);
    setManualGrantMsg(null);
    try {
      if (creditToolMode === 'grant') {
        const res = await fetch('/api/admin/manual-credit', {
          method: 'POST',
          headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            targetPhoneOrEmail: manualPhone.trim(),
            credits: manualCredits,
            reason: manualReason || 'VIP Creator Grant'
          })
        });
        const data = await res.json();
        if (data.ok) {
          playUiSound('success');
          setManualGrantMsg({ ok: true, text: `+${manualCredits} Credits ထည့်သွင်း အောင်မြင်ပါသည်!` });
          setManualPhone('');
          fetchPayments();
          fetchAdminUsers();
          if (
            onAddUserCredits &&
            userEmail &&
            manualPhone.trim().toLowerCase() === userEmail.trim().toLowerCase()
          ) {
            onAddUserCredits(manualCredits);
          }
        } else {
          playUiSound('blocked');
          setManualGrantMsg({ ok: false, text: data.error || 'Credit ထည့်သွင်း၍ မရပါ' });
        }
      } else {
        const res = await fetch('/api/admin/deduct-credit', {
          method: 'POST',
          headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            targetIdentifier: manualPhone.trim(),
            amount: deductAllMode ? 'all' : manualCredits,
            reason: manualReason || 'Admin Credit Revocation'
          })
        });
        const data = await res.json();
        if (data.ok && data.result) {
          playUiSound('success');
          setManualGrantMsg({
            ok: true,
            text: `-${data.result.deducted} Credits ပြန်နှုတ်ပြီးပါပြီ! (လက်ကျန်: ${data.result.newCredits} Cr)`
          });
          setManualPhone('');
          fetchPayments();
          fetchAdminUsers();
        } else {
          playUiSound('blocked');
          setManualGrantMsg({ ok: false, text: data.error || 'Credit နှုတ်၍ မရပါ' });
        }
      }
    } catch (err) {
      setManualGrantMsg({ ok: false, text: String(err) });
    } finally {
      setIsGrantingManual(false);
    }
  };

  const handleBanSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const target = banTargetInput.trim();
    if (!target) {
      setBanActionMsg({ ok: false, text: 'Ban လုပ်လိုသော Gmail သို့မဟုတ် UID ထည့်ပါ' });
      return;
    }
    setIsBanning(true);
    setBanActionMsg(null);
    try {
      const res = await fetch('/api/admin/ban-user', {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          targetIdentifier: target,
          reason: banReasonInput.trim() || 'Admin Permanent Ban'
        })
      });
      const data = await res.json();
      if (data.ok) {
        playUiSound('success');
        setBanActionMsg({ ok: true, text: `🚫 ${target} ကို အပြီးပိတ် (Permanent Ban) ပြီးပါပြီ!` });
        setBanTargetInput('');
        fetchAdminUsers();
      } else {
        playUiSound('blocked');
        setBanActionMsg({ ok: false, text: data.error || 'Ban လုပ်၍ မရပါ' });
      }
    } catch (err) {
      setBanActionMsg({ ok: false, text: String(err) });
    } finally {
      setIsBanning(false);
    }
  };

  const handleQuickDeductAll = async (target: string) => {
    setBusyUserKey(`deduct:${target}`);
    setBanActionMsg(null);
    try {
      const res = await fetch('/api/admin/deduct-credit', {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          targetIdentifier: target,
          amount: 'all',
          reason: 'Admin Quick Credit Revocation'
        })
      });
      const data = await res.json();
      if (data.ok && data.result) {
        playUiSound('success');
        setBanActionMsg({
          ok: true,
          text: `➖ ${target} မှ -${data.result.deducted} Credits နှုတ်ပြီး 0 ဖြစ်သွားပါပြီ`
        });
        fetchAdminUsers();
        fetchPayments();
      } else {
        playUiSound('blocked');
        setBanActionMsg({ ok: false, text: data.error || 'Credit နှုတ်၍ မရပါ' });
      }
    } finally {
      setBusyUserKey(null);
    }
  };

  const handleQuickBanToggle = async (target: string, currentlyBanned: boolean) => {
    setBusyUserKey(`ban:${target}`);
    setBanActionMsg(null);
    try {
      const endpoint = currentlyBanned ? '/api/admin/unban-user' : '/api/admin/ban-user';
      const payload = currentlyBanned
        ? { targetIdentifier: target }
        : { targetIdentifier: target, reason: 'Admin Permanent Ban' };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.ok) {
        playUiSound('success');
        setBanActionMsg({
          ok: true,
          text: currentlyBanned
            ? `✅ ${target} ကို Unban ပြန်ဖွင့်ပြီးပါပြီ`
            : `🚫 ${target} ကို အပြီး Ban ပြီးပါပြီ`
        });
        fetchAdminUsers();
      } else {
        playUiSound('blocked');
        setBanActionMsg({ ok: false, text: data.error || 'လုပ်ဆောင်၍ မရပါ' });
      }
    } finally {
      setBusyUserKey(null);
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

  // Filtered users
  const filteredAdminUsers = adminUsers.filter((u) => {
    if (userListFilter === 'paid' && !u.isPaidUser && u.totalPaidVideos === 0) return false;
    if (userListFilter === 'banned' && !u.isBanned) return false;
    const q = userSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      u.userId.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q)
    );
  });

  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const approvedCount = payments.filter((p) => p.status === 'approved').length;
  const totalCreditsGranted = payments
    .filter((p) => p.status === 'approved' && (p.credits || 0) > 0)
    .reduce((sum, p) => sum + (p.credits || 0), 0);

  if (!isUnlocked) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-black/[0.1] dark:border-white/[0.1] bg-white dark:bg-[#121217] p-7 shadow-2xl space-y-6 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 ring-8 ring-amber-500/5">
            {adminGateStatus.isOwner ? <Lock className="size-8" /> : <ShieldAlert className="size-8" />}
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
              <ShieldCheck className="size-3.5" />
              <span>Dual-Layer Owner Security Gate</span>
            </div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">
              TTAK Admin Access Lock
            </h2>
          </div>

          {adminGateStatus.loading ? (
            <div className="py-6 flex flex-col items-center gap-2 text-xs text-gray-500">
              <RefreshCw className="size-5 animate-spin text-amber-500" />
              <span>Owner Session စစ်ဆေးနေပါသည်...</span>
            </div>
          ) : !adminGateStatus.isOwner ? (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                ဤနေရာသည် Owner Gmail အကောင့်ဖြင့် Sign In ဝင်ထားမှသာ ဝင်ရောက်ခွင့်ရှိပါသည်။
                {adminGateStatus.signedInEmail ? (
                  <span className="block mt-1.5 font-mono text-[11px] text-red-500 font-bold">
                    လက်ရှိအကောင့် ({adminGateStatus.signedInEmail}) သည် Owner မဟုတ်ပါ။
                  </span>
                ) : null}
              </p>

              {onOpenSignIn && (
                <button
                  type="button"
                  onClick={() => {
                    playUiSound('open');
                    onOpenSignIn();
                  }}
                  className="w-full h-12 flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <LogIn className="size-4" />
                  <span>Owner Gmail ဖြင့် Sign In ဝင်မည်</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => checkAdminStatus()}
                className="w-full h-10 flex items-center justify-center gap-1.5 rounded-xl border border-black/[0.1] dark:border-white/[0.1] text-xs font-bold text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-[#1A1A22] cursor-pointer"
              >
                <RefreshCw className="size-3.5" />
                <span>ပြန်လည်စစ်ဆေးမည်</span>
              </button>
            </div>
          ) : adminGateStatus.needsSetup ? (
            <form onSubmit={handleBootstrapPasscode} className="space-y-4 text-left">
              <p className="text-xs text-gray-500 dark:text-zinc-400 text-center leading-relaxed">
                Owner Gmail (<strong className="text-emerald-500">{adminGateStatus.signedInEmail}</strong>) အတည်ပြုပြီးပါပြီ။ ပထမဆုံးအကြိမ်အဖြစ် ကိုယ်ပိုင် Admin Password အသစ် (အနည်းဆုံး ၈ လုံး) သတ်မှတ်ပေးပါ။
              </p>
              <div className="space-y-2.5">
                <input
                  type="password"
                  autoFocus
                  value={setupPasscode}
                  onChange={(e) => {
                    setSetupPasscode(e.target.value);
                    if (pinError) setPinError('');
                  }}
                  placeholder="Admin Password အသစ် (အနည်းဆုံး ၈ လုံး)"
                  className="w-full font-mono text-sm py-3 px-4 rounded-2xl border border-black/[0.15] dark:border-white/[0.15] bg-gray-50 dark:bg-[#1A1A22] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <input
                  type="password"
                  value={setupConfirmPasscode}
                  onChange={(e) => {
                    setSetupConfirmPasscode(e.target.value);
                    if (pinError) setPinError('');
                  }}
                  placeholder="Admin Password ထပ်မံအတည်ပြုပါ"
                  className="w-full font-mono text-sm py-3 px-4 rounded-2xl border border-black/[0.15] dark:border-white/[0.15] bg-gray-50 dark:bg-[#1A1A22] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                {pinError && (
                  <p className="text-xs font-bold text-red-500 text-center">{pinError}</p>
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
                    <span>သိမ်းဆည်းနေပါသည်...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-4" />
                    <span>Admin Password သတ်မှတ်ပြီး ဖွင့်မည်</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleUnlock} className="space-y-4">
              <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                Owner (<strong className="text-emerald-500">{adminGateStatus.signedInEmail}</strong>) အတည်ပြုပြီးပါပြီ။ Admin Panel ဖွင့်ရန် လျှို့ဝှက် Admin Password ရိုက်ထည့်ပါ။
              </p>
              <div>
                <input
                  type="password"
                  maxLength={64}
                  autoFocus
                  value={adminPinInput}
                  onChange={(e) => {
                    setAdminPinInput(e.target.value);
                    if (pinError) setPinError('');
                  }}
                  placeholder="Admin Password ရိုက်ထည့်ပါ..."
                  className="w-full text-center font-mono text-base py-3.5 px-4 rounded-2xl border border-black/[0.15] dark:border-white/[0.15] bg-gray-50 dark:bg-[#1A1A22] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
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
          )}

          <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-gray-400 dark:text-zinc-500">
            🔒 Owner Session + Server-Signed Admin Token Guard Active
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
              fetchAdminUsers();
            }}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-gray-50 dark:bg-[#18181F] px-3.5 py-2 text-xs font-bold text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-[#202028] cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin text-sky-500' : ''}`} />
            <span>Refresh All</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playUiSound('close');
              setAdminToken('');
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

          {/* Manual Add / Deduct Credit Tool */}
          <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.05] space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex rounded-xl bg-gray-100 dark:bg-[#18181F] p-0.5 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => {
                    playUiSound('select');
                    setCreditToolMode('grant');
                    setManualReason('VIP Creator Grant');
                    setManualGrantMsg(null);
                  }}
                  className={`rounded-lg px-2.5 py-1 cursor-pointer transition-colors ${
                    creditToolMode === 'grant'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-gray-500 dark:text-zinc-400'
                  }`}
                >
                  + Credit ထည့်မည်
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playUiSound('select');
                    setCreditToolMode('deduct');
                    setManualReason('Unauthorized Credit Revocation');
                    setManualGrantMsg(null);
                  }}
                  className={`rounded-lg px-2.5 py-1 cursor-pointer transition-colors ${
                    creditToolMode === 'deduct'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-gray-500 dark:text-zinc-400'
                  }`}
                >
                  - Credit နှုတ်မည်
                </button>
              </div>
              {userEmail && creditToolMode === 'grant' && (
                <button
                  type="button"
                  onClick={() => {
                    setManualPhone(userEmail);
                    playUiSound('tap');
                  }}
                  className="text-[10px] text-gray-500 font-bold hover:underline cursor-pointer"
                >
                  My Email
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <input
                type="text"
                placeholder="အသုံးပြုသူ Gmail သို့မဟုတ် UID (e.g. user@gmail.com)"
                value={manualPhone}
                onChange={(e) => setManualPhone(e.target.value)}
                className="w-full rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-gray-50 dark:bg-[#18181F] px-3 py-2 text-xs text-gray-900 dark:text-white outline-none focus:border-amber-500"
              />

              {creditToolMode === 'deduct' && (
                <label className="flex items-center gap-2 text-[11px] font-bold text-red-600 dark:text-red-400 cursor-pointer select-none pt-0.5">
                  <input
                    type="checkbox"
                    checked={deductAllMode}
                    onChange={(e) => setDeductAllMode(e.target.checked)}
                    className="rounded accent-red-600"
                  />
                  <span>လက်ကျန် Credit အားလုံး (0 ဖြစ်အောင်) အကုန်နှုတ်မည်</span>
                </label>
              )}

              {!(creditToolMode === 'deduct' && deductAllMode) && (
                <>
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
                            ? creditToolMode === 'deduct'
                              ? 'bg-red-600 text-white shadow-xs'
                              : 'bg-amber-500 text-white shadow-xs'
                            : 'bg-gray-100 dark:bg-[#202028] text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-[#2a2a34]'
                        }`}
                      >
                        {creditToolMode === 'deduct' ? '-' : '+'}
                        {amt.toLocaleString()} Cr
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
                    <span
                      className={`text-xs font-bold ${
                        creditToolMode === 'deduct' ? 'text-red-500' : 'text-amber-500'
                      }`}
                    >
                      Credits
                    </span>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              disabled={isGrantingManual}
              onClick={handleManualGrant}
              className={`w-full rounded-xl text-white py-2.5 text-xs font-extrabold shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                creditToolMode === 'deduct'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:opacity-95'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95'
              }`}
            >
              {creditToolMode === 'deduct' ? (
                <MinusCircle className="size-3.5" />
              ) : (
                <Zap className="size-3.5 fill-white" />
              )}
              <span>
                {isGrantingManual
                  ? 'လုပ်ဆောင်နေပါသည်...'
                  : creditToolMode === 'deduct'
                  ? deductAllMode
                    ? 'Credit အားလုံး (0) ချက်ချင်း နှုတ်မည်'
                    : `-${manualCredits.toLocaleString()} Credits ချက်ချင်း နှုတ်မည်`
                  : `+${manualCredits.toLocaleString()} Credits ချက်ချင်း ထည့်မည်`}
              </span>
            </button>
            {manualGrantMsg && (
              <p
                className={`text-[11px] font-bold text-center py-1.5 px-2 rounded-lg ${
                  manualGrantMsg.ok
                    ? 'text-emerald-500 bg-emerald-500/10'
                    : 'text-red-500 bg-red-500/10'
                }`}
              >
                {manualGrantMsg.text}
              </p>
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

      {/* Users, Credit Mode Video Usage & Permanent Gmail Ban Manager */}
      <div className="rounded-3xl border border-black/[0.08] dark:border-white/[0.09] bg-white dark:bg-[#111116] p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-500">
              <Users className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-gray-900 dark:text-white">
                Users, Credit Mode Videos &amp; Gmail Ban ထိန်းချုပ်ခန်း
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Credit Mode ဗီဒီယိုထုတ်ယူမှု စာရင်း ({usersStats.totalPaidVideosToday} ယနေ့ / {usersStats.totalPaidVideosAllTime} စုစုပေါင်း) · Paid Users: {usersStats.paidUsersCount} · Banned: {usersStats.bannedUsersCount}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-gray-100 dark:bg-[#18181E] p-1 text-xs">
              {(
                [
                  { id: 'all', label: `All (${usersStats.totalUsers})` },
                  { id: 'paid', label: `Credit (${usersStats.paidUsersCount})` },
                  { id: 'banned', label: `Banned (${usersStats.bannedUsersCount})` }
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    playUiSound('select');
                    setUserListFilter(tab.id);
                  }}
                  className={`rounded-lg px-2.5 py-1 font-bold cursor-pointer ${
                    userListFilter === tab.id
                      ? 'bg-white dark:bg-[#26262E] text-gray-900 dark:text-white shadow-xs'
                      : 'text-gray-500'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="size-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Gmail / UID ရှာရန်..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-gray-50 dark:bg-[#18181F] pl-8 pr-3 py-1.5 text-xs text-gray-900 dark:text-white outline-none"
              />
            </div>
          </div>
        </div>

        {/* Direct Gmail Permanent Ban Form */}
        <form
          onSubmit={handleBanSubmit}
          className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-3.5"
        >
          <input
            type="text"
            value={banTargetInput}
            onChange={(e) => setBanTargetInput(e.target.value)}
            placeholder="အပြီး Ban လုပ်လိုသော Gmail သို့မဟုတ် UID (e.g. spam@gmail.com)"
            className="sm:col-span-5 rounded-xl border border-red-500/25 bg-white dark:bg-[#18181F] px-3 py-2 text-xs text-gray-900 dark:text-white outline-none focus:border-red-500"
          />
          <input
            type="text"
            value={banReasonInput}
            onChange={(e) => setBanReasonInput(e.target.value)}
            placeholder="Ban အကြောင်းပြချက်"
            className="sm:col-span-4 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#18181F] px-3 py-2 text-xs text-gray-900 dark:text-white outline-none focus:border-red-500"
          />
          <button
            type="submit"
            disabled={isBanning}
            className="sm:col-span-3 rounded-xl bg-red-600 hover:bg-red-500 text-white py-2 px-3 text-xs font-extrabold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Ban className="size-3.5" />
            <span>{isBanning ? 'Ban နေသည်...' : 'Gmail အပြီး Ban မည်'}</span>
          </button>
        </form>

        {banActionMsg && (
          <p
            className={`text-xs font-bold px-3 py-2 rounded-xl ${
              banActionMsg.ok
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-500/10 text-red-500'
            }`}
          >
            {banActionMsg.text}
          </p>
        )}

        {/* Active Banned Gmail List */}
        {bannedUsers.length > 0 && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-3.5 space-y-2">
            <p className="text-xs font-extrabold text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <Ban className="size-3.5" />
              <span>Banned Accounts List ({bannedUsers.length})</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {bannedUsers.map((b, idx) => {
                const target = b.email || b.userId || '';
                return (
                  <div
                    key={`${target}-${idx}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-500/25 bg-white dark:bg-[#18181F] px-3 py-1.5 text-xs"
                  >
                    <span className="font-mono font-bold text-gray-900 dark:text-white">
                      {target}
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-zinc-400">
                      ({b.reason})
                    </span>
                    <button
                      type="button"
                      disabled={busyUserKey === `ban:${target}`}
                      onClick={() => handleQuickBanToggle(target, true)}
                      className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer disabled:opacity-50"
                    >
                      Unban
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Users & Credit Mode Video Counts List */}
        {filteredAdminUsers.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            အသုံးပြုသူ စာရင်း မတွေ့ရှိပါ
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-[11px] text-gray-500 dark:text-zinc-400">
                  <th className="py-2 pr-3 font-bold">User / Gmail</th>
                  <th className="py-2 px-3 font-bold">Credits</th>
                  <th className="py-2 px-3 font-bold">Credit Mode Videos</th>
                  <th className="py-2 px-3 font-bold">Free Mode</th>
                  <th className="py-2 pl-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                {filteredAdminUsers.slice(0, 50).map((u) => {
                  const targetKey = u.email || u.userId;
                  return (
                    <tr key={u.userId} className="hover:bg-gray-50/70 dark:hover:bg-white/[0.02]">
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-900 dark:text-white">{u.name}</span>
                          {u.isBanned && (
                            <span className="rounded-md bg-red-500/15 px-1.5 py-0.5 text-[10px] font-extrabold text-red-500">
                              BANNED
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-[11px] text-gray-500 dark:text-zinc-400">
                          {u.email || u.userId} · {u.userId}
                        </p>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-extrabold text-amber-600 dark:text-amber-400">
                        {u.credits.toLocaleString()} Cr
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-sky-600 dark:text-sky-400">
                          <Film className="size-3.5" />
                          <span>
                            ယနေ့ {u.paidVideosToday} / စုစုပေါင်း {u.totalPaidVideos} ပုဒ်
                          </span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-gray-500 dark:text-zinc-400">
                        {u.freeUsedToday}/5 · ({u.totalFreeVideos} total)
                      </td>
                      <td className="py-2.5 pl-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {u.credits > 0 && (
                            <button
                              type="button"
                              disabled={busyUserKey === `deduct:${targetKey}`}
                              onClick={() => handleQuickDeductAll(targetKey)}
                              className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 cursor-pointer disabled:opacity-50"
                            >
                              -0 Cr
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busyUserKey === `ban:${targetKey}`}
                            onClick={() => handleQuickBanToggle(targetKey, u.isBanned)}
                            className={`rounded-lg px-2.5 py-1 text-[10px] font-bold cursor-pointer disabled:opacity-50 inline-flex items-center gap-1 ${
                              u.isBanned
                                ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                                : 'border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20'
                            }`}
                          >
                            {u.isBanned ? (
                              <>
                                <UserCheck className="size-3" />
                                <span>Unban</span>
                              </>
                            ) : (
                              <>
                                <Ban className="size-3" />
                                <span>Ban</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
