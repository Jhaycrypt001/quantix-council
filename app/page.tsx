// @ts-nocheck
'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useBalance, useSendTransaction, useSignMessage } from 'wagmi';
import { parseEther } from 'viem';
import {
  Zap, ShieldCheck, Terminal, TrendingUp, TrendingDown,
  Activity, Globe, Database, Settings, LogOut,
  ChevronRight, ArrowUpRight, ArrowDownRight,
  Layers, Lock, CircleDot, BarChart3, Radio,
  Fingerprint, Search, Bell, Copy, CheckCircle2, QrCode, Server, X
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
interface Proposal {
  id: string | number;
  title: string;
  amount: number | string;
  toToken: string;
  status: 'executed' | 'rejected' | 'pending';
}

const ACCENT       = '#B8FF3C';   // electric lime
const ACCENT_DIM   = '#B8FF3C22';
const BG_DEEP      = '#020205';
const BG_PANEL     = '#07070F';
const BG_RAISED    = '#0C0C18';
const BORDER       = 'rgba(255,255,255,0.055)';

const NAV_ITEMS = [
  { id: 'dashboard', icon: BarChart3,  label: 'Dashboard' },
  { id: 'activity',  icon: Activity,   label: 'Activity'  },
  { id: 'nodes',     icon: Globe,      label: 'Nodes'     },
  { id: 'vault',     icon: Database,   label: 'Vault'     },
  { id: 'settings',  icon: Settings,   label: 'Settings'  },
];

const BOOT_SEQUENCE = [
  'SYS: Quantix kernel v4.1.0 loaded',
  'NET: Council handshake — 12/12 nodes',
  'SEC: Ed25519 identity verified',
  'MEM: Signal buffer allocated (64mb)',
  'RPC: Zerion endpoint alive',
  'ORD: Execution queue ready',
];

// ─────────────────────────────────────────────────────────────────────────────
// MICRO-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function NoiseLayer() {
  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-50" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)', opacity: 0.6 }} />
      <div className="fixed inset-0 pointer-events-none z-40" style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(2,2,5,0.85) 100%)' }} />
    </>
  );
}

function GlowOrbs() {
  return (
    <>
      <motion.div className="fixed pointer-events-none" style={{ top: '-20%', right: '-8%', width: 900, height: 900, borderRadius: '50%', background: `radial-gradient(circle, ${ACCENT}09 0%, transparent 65%)`, filter: 'blur(40px)' }} animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="fixed pointer-events-none" style={{ bottom: '-15%', left: '-5%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(80,120,255,0.05) 0%, transparent 65%)', filter: 'blur(60px)' }} animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 3 }} />
    </>
  );
}

function GridBg() {
  return <div className="fixed inset-0 pointer-events-none z-0" style={{ backgroundImage: `radial-gradient(circle, rgba(184,255,60,0.07) 1px, transparent 1px)`, backgroundSize: '40px 40px', maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)' }} />;
}

function Pill({ status }: { status: Proposal['status'] }) {
  const map = {
    executed: { label: 'EXECUTED', color: ACCENT,        bg: ACCENT_DIM,          textColor: ACCENT        },
    rejected: { label: 'REJECTED', color: '#FF4444',     bg: 'rgba(255,68,68,0.1)', textColor: '#FF6666'   },
    pending:  { label: 'PENDING',  color: '#F59E0B',     bg: 'rgba(245,158,11,0.1)', textColor: '#FBBF24'  },
  }[status];

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.25em]" style={{ background: map.bg, color: map.textColor, border: `1px solid ${map.color}22` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: map.color, boxShadow: `0 0 6px ${map.color}`, animation: status === 'pending' ? 'pulse 1.5s infinite' : 'none' }} />
      {map.label}
    </span>
  );
}

function Ticker({ value, prefix = '', suffix = '' }: { value: string | number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => { setDisplay(value); }, [value]);
  return <motion.span key={String(value)} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>{prefix}{display}{suffix}</motion.span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
export default function CouncilDashboard() {
  const [proposals,   setProposals]   = useState<Proposal[]>([]);
  const [mounted,     setMounted]     = useState(false);
  const [activeTab,   setActiveTab]   = useState('dashboard');
  const [logs,        setLogs]        = useState<string[]>(BOOT_SEQUENCE);
  const [booted,      setBooted]      = useState(false);
  const [tick,        setTick]        = useState(0);        
  const [hoveredRow,  setHoveredRow]  = useState<string | number | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // ─── MODALS & FUNCTIONAL STATES ───
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [vaultModal, setVaultModal] = useState<'none' | 'deposit' | 'withdraw'>('none');
  const [copied, setCopied] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ address: '', amount: '' });
  const [txStatus, setTxStatus] = useState<string | null>(null);

  // ─── WAGMI HOOKS ───
  const { open }                    = useAppKit();
  const { address, isConnected }    = useAppKitAccount();
  const { data: currentBalance } = useBalance({ address: address as `0x${string}` });
  const { data: usdcBase } = useBalance({ address: address as `0x${string}`, token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`, chainId: 8453 });
  const { data: usdtArb } = useBalance({ address: address as `0x${string}`, token: '0xFd086bC7CD5C481DCC9C85EBE478A1C0b69FCbb9' as `0x${string}`, chainId: 42161 });
  const { sendTransactionAsync } = useSendTransaction();
  const { signMessageAsync } = useSignMessage();

  const formatBal = (bal: any, fix = 2) => {
    if (!bal || typeof bal.value === 'undefined' || typeof bal.decimals === 'undefined') return (0).toFixed(fix);
    return (Number(bal.value) / (10 ** bal.decimals)).toFixed(fix);
  };

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDeposit = async () => {
    if (!isConnected) return open();
    try {
      setTxStatus('Awaiting Signature...');
      const hash = await sendTransactionAsync({ to: '0x000000000000000000000000000000000000dEaD', value: parseEther('0.0001') });
      setTxStatus(`Deposit Confirmed: 0x...${hash.slice(-6)}`);
      setTimeout(() => setTxStatus(null), 5000);
    } catch (e) { setTxStatus('Deposit Cancelled'); setTimeout(() => setTxStatus(null), 3000); }
  };

  const executeWithdrawal = async () => {
    if (!isConnected) return open();
    if (!withdrawForm.address || !withdrawForm.amount) return;
    try {
      setTxStatus('Authenticating...');
      await signMessageAsync({ message: `QUANTIX COUNCIL:\nAuthorize withdrawal of ${withdrawForm.amount} ETH to ${withdrawForm.address}` });
      setTxStatus('Withdrawal queued.');
      setTimeout(() => { setTxStatus(null); setVaultModal('none'); setWithdrawForm({ address: '', amount: '' }); }, 4000);
    } catch (e) { setTxStatus('Failed'); setTimeout(() => setTxStatus(null), 3000); }
  };

  // ─── EFFECTS & DATA SYNC ───
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setMounted(true);
    let i = 0;
    const bootTimer = setInterval(() => { i++; if (i >= BOOT_SEQUENCE.length) { clearInterval(bootTimer); setTimeout(() => setBooted(true), 600); } }, 220);

    const fetchData = async () => {
      try {
        const res  = await fetch(`/api/proposals?t=${Date.now()}`);
        if (!res.ok) return; 
        const data = await res.json();
        if (Array.isArray(data)) setProposals([...data].reverse());
      } catch (e) { console.error('📡 Sync Error:', e); }
    };
    
    const fetchLogs = async () => {
      try {
        const res = await fetch(`/api/logs?t=${Date.now()}`);
        if (!res.ok) return; 
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) setLogs(data);
        logRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (e) { console.error('📡 Log Error:', e); }
    };

    fetchData(); fetchLogs();
    const dataInterval = setInterval(fetchData, 2000);
    const logInterval = setInterval(fetchLogs, 2500); 

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setIsSearchOpen(prev => !prev); }
      if (e.key === 'Escape') { setIsSearchOpen(false); setSearchQuery(''); setIsNotifOpen(false); setVaultModal('none'); }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => { clearInterval(bootTimer); clearInterval(dataInterval); clearInterval(logInterval); window.removeEventListener('keydown', handleKeyDown); };
  }, []);

  if (!mounted) return null;

  // ─── COMPUTED DATA ───
  const execCount    = proposals.filter(p => p.status === 'executed').length;
  const pendingCount = proposals.filter(p => p.status === 'pending').length;
  const rejectCount  = proposals.filter(p => p.status === 'rejected').length;

  const filteredProposals = proposals.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.toToken.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.toString().includes(searchQuery));

  const STATS = [
    { label: 'Total Signals',  value: proposals.length, suffix: '',    delta: '+3',             positive: true  },
    { label: 'Executed',       value: execCount,        suffix: '',    delta: `${execCount}`,   positive: true  },
    { label: 'Pending',        value: pendingCount,      suffix: '',    delta: `${pendingCount}`, positive: null  },
    { label: 'Avg Latency',    value: '14',             suffix: 'ms',  delta: '-2ms',           positive: true  },
    { label: 'Fill Rate',      value: '99.1',           suffix: '%',   delta: '+0.3',           positive: true  },
    { label: 'Nodes',          value: '12',             suffix: '/12', delta: 'all',            positive: true  },
  ];

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour12: false });
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();

  return (
    <div className="flex min-h-screen overflow-hidden" style={{ background: BG_DEEP, color: '#C8CDD8', fontFamily: "'IBM Plex Mono', 'Fira Code', monospace" }}>
      <NoiseLayer />
      <GlowOrbs />
      <GridBg />

      {/* ══════════════════════════════════════════════════════════════════
          SIDEBAR
      ══════════════════════════════════════════════════════════════════ */}
      <aside className="relative w-[68px] hidden md:flex flex-col items-center py-8 z-20 flex-shrink-0" style={{ borderRight: `1px solid ${BORDER}`, background: `${BG_PANEL}CC` }}>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="mb-10 cursor-pointer flex items-center justify-center" style={{ width: 40, height: 40, background: ACCENT, clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
          <Zap size={18} className="text-black" fill="currentColor" />
        </motion.div>
        <nav className="flex flex-col gap-2 flex-1">
          {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
            const active = activeTab === id;
            return (
              <motion.button key={id} onClick={() => setActiveTab(id)} whileHover={{ x: 2 }} title={label} className="relative w-10 h-10 flex items-center justify-center transition-all" style={{ color: active ? ACCENT : 'rgba(255,255,255,0.22)', background: active ? ACCENT_DIM : 'transparent', border: active ? `1px solid ${ACCENT}33` : '1px solid transparent' }}>
                <Icon size={16} strokeWidth={active ? 2.5 : 1.5} />
                {active && <motion.div layoutId="nav-indicator" className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5" style={{ background: ACCENT, boxShadow: `0 0 8px ${ACCENT}` }} />}
              </motion.button>
            );
          })}
        </nav>
        <div className="flex flex-col items-center gap-4 mt-auto">
          <div className="w-2 h-2 rounded-full" style={{ background: ACCENT, boxShadow: `0 0 10px ${ACCENT}` }}><motion.div className="w-2 h-2 rounded-full" style={{ background: ACCENT }} animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 2, repeat: Infinity }} /></div>
          <button className="w-10 h-10 flex items-center justify-center transition-colors" style={{ color: 'rgba(255,255,255,0.2)' }} onMouseEnter={e => (e.currentTarget.style.color = '#FF4444')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}><LogOut size={15} strokeWidth={1.5} /></button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden z-10">
        {/* ── Top chrome bar ── */}
        <div className="flex items-center justify-between px-8 h-14 flex-shrink-0 relative z-50" style={{ borderBottom: `1px solid ${BORDER}`, background: `${BG_PANEL}99` }}>
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.35em]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            <span>QUANTIX</span><ChevronRight size={10} /><span style={{ color: ACCENT }}>COUNCIL</span><ChevronRight size={10} /><span style={{ color: 'rgba(255,255,255,0.5)' }}>{activeTab.toUpperCase()}</span>
          </div>
          <div className="hidden lg:flex items-center gap-6 text-[10px] tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>
            
            {/* Search Trigger */}
            <div onClick={() => setIsSearchOpen(true)} className="cursor-pointer flex items-center gap-2 px-3 py-1.5 transition-colors" style={{ border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.02)' }}>
              <Search size={12} /><span>SEARCH...</span><span className="ml-2" style={{ color: ACCENT }}>⌘K</span>
            </div>

            {/* Notification */}
            <div className="relative">
              <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="flex items-center justify-center transition-colors hover:text-white relative"><Bell size={14} /><span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} /></button>
              <AnimatePresence>
                {isNotifOpen && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 mt-4 w-80 shadow-2xl overflow-hidden z-50" style={{ background: BG_PANEL, border: `1px solid ${BORDER}` }}>
                    <div className="p-3 flex justify-between items-center" style={{ borderBottom: `1px solid ${BORDER}` }}><span className="text-[10px] uppercase tracking-widest font-bold text-white">System Alerts</span><span className="text-[9px] px-2 py-0.5" style={{ background: ACCENT_DIM, color: ACCENT }}>LIVE</span></div>
                    <div className="max-h-60 overflow-y-auto p-3 space-y-3">
                      {logs.slice(0, 5).map((log, i) => (<div key={i} className="text-[9px] pb-2 last:border-0" style={{ borderBottom: `1px solid ${BORDER}` }}><span className="block mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{timeStr}</span><span style={{ color: i === 0 ? ACCENT : '#C8CDD8' }}>{log}</span></div>))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <span>{dateStr}</span>
            <span style={{ color: ACCENT, fontVariantNumeric: 'tabular-nums' }}>{timeStr}</span>
            <div className="flex items-center gap-1.5"><Radio size={10} style={{ color: ACCENT }} /><span>MAINNET</span></div>
          </div>
          
          <motion.button onClick={() => open()} whileTap={{ scale: 0.97 }} className="flex items-center gap-2.5 px-4 py-2 text-[10px] uppercase tracking-widest transition-all" style={{ border: `1px solid ${isConnected ? ACCENT + '44' : BORDER}`, background: isConnected ? ACCENT_DIM : 'transparent', color: isConnected ? ACCENT : 'rgba(255,255,255,0.4)' }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: isConnected ? ACCENT : 'rgba(255,255,255,0.3)', boxShadow: isConnected ? `0 0 8px ${ACCENT}` : 'none' }} />
            <span>{isConnected ? `${address?.slice(0, 6)}···${address?.slice(-4)}` : 'CONNECT WALLET'}</span>
            {isConnected && <ShieldCheck size={11} />}
          </motion.button>
        </div>

        {/* ── Scrollable Tab Content ── */}
        <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: `${ACCENT}18 transparent` }}>
          <AnimatePresence mode="wait">
            
            {/* ================= DASHBOARD TAB ================= */}
            {activeTab === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
                <div className="relative px-8 pt-10 pb-8 overflow-hidden" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <div className="absolute right-0 top-0 select-none pointer-events-none" style={{ fontSize: '28vw', fontWeight: 900, lineHeight: 0.85, color: 'rgba(184,255,60,0.018)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '-0.05em' }}>Q</div>
                  <div className="relative z-10 max-w-3xl">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex items-center gap-2 px-3 py-1.5 text-[9px] uppercase tracking-[0.4em]" style={{ border: `1px solid ${ACCENT}33`, background: ACCENT_DIM, color: ACCENT }}>
                        <motion.span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: ACCENT }} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
                        COUNCIL ACTIVE — EPOCH 441
                      </div>
                      <span className="text-[9px] uppercase tracking-[0.3em]" style={{ color: 'rgba(255,255,255,0.2)' }}>{booted ? 'ALL SYSTEMS NOMINAL' : 'BOOTING...'}</span>
                    </div>
                    <h1 style={{ fontSize: 'clamp(2.8rem, 5vw, 5.5rem)', fontWeight: 900, lineHeight: 0.92, letterSpacing: '-0.04em', color: '#FFFFFF' }}>LIQUID<br /><span style={{ color: ACCENT }}>EXECUTION</span><br /><span style={{ color: 'rgba(255,255,255,0.25)', fontWeight: 300, fontStyle: 'italic' }}>INTELLIGENCE</span></h1>
                    <p className="mt-6 text-sm leading-relaxed max-w-md" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'system-ui, sans-serif' }}>Non-custodial, composable signal execution governed by the Council. Every trade is verifiable, every node is auditable.</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 lg:grid-cols-6" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {STATS.map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 * i }} className="px-6 py-5 group cursor-default" style={{ borderRight: i < STATS.length - 1 ? `1px solid ${BORDER}` : 'none' }} onMouseEnter={e => (e.currentTarget.style.background = BG_RAISED)} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <p className="text-[9px] uppercase tracking-[0.35em] mb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>{s.label}</p>
                      <p className="text-2xl font-black tracking-tighter" style={{ color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}><Ticker value={s.value} suffix={s.suffix} /></p>
                      {s.positive !== null && <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: s.positive ? ACCENT : '#FF6666' }}>{s.positive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}{s.delta}</p>}
                    </motion.div>
                  ))}
                </div>

                <div className="grid grid-cols-12" style={{ minHeight: '60vh' }}>
                  <div className="col-span-12 lg:col-span-8" style={{ borderRight: `1px solid ${BORDER}` }}>
                    <div className="flex items-center justify-between px-8 h-12" style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <div className="flex items-center gap-3"><Terminal size={13} style={{ color: ACCENT }} /><span className="text-[10px] uppercase tracking-[0.35em]" style={{ color: 'rgba(255,255,255,0.5)' }}>Live Signal Stream</span><span className="px-2 py-0.5 text-[9px] tracking-widest" style={{ border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.2)' }}>{proposals.length} SIGNALS</span></div>
                    </div>
                    <div className="grid gap-0 px-8 py-3 text-[9px] uppercase tracking-[0.35em]" style={{ gridTemplateColumns: '2rem 1fr 8rem 6rem 2rem 5rem 7rem', borderBottom: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.2)' }}>
                      <div>#</div><div>SIGNAL</div><div>HASH</div><div className="text-right">AMOUNT</div><div /><div>TARGET</div><div className="text-right">STATUS</div>
                    </div>
                    <div>
                      <AnimatePresence mode="popLayout">
                        {proposals.slice(0, 12).map((p, idx) => {
                          const isHovered = hoveredRow === p.id;
                          return (
                            <motion.div key={p.id} layout initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} className="grid gap-0 px-8 py-4 cursor-pointer transition-colors" style={{ gridTemplateColumns: '2rem 1fr 8rem 6rem 2rem 5rem 7rem', alignItems: 'center', borderBottom: `1px solid ${BORDER}`, background: isHovered ? BG_RAISED : 'transparent', borderLeft: isHovered ? `2px solid ${ACCENT}` : '2px solid transparent' }} onMouseEnter={() => setHoveredRow(p.id)} onMouseLeave={() => setHoveredRow(null)}>
                              <div className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.2)' }}>{String(idx + 1).padStart(2, '0')}</div>
                              <div className="flex items-center gap-3 pr-4"><div className="w-6 h-6 flex items-center justify-center flex-shrink-0" style={{ background: p.status === 'executed' ? ACCENT_DIM : p.status === 'rejected' ? 'rgba(255,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: p.status === 'executed' ? ACCENT : p.status === 'rejected' ? '#FF6666' : '#FBBF24' }}>{p.status === 'executed' ? <TrendingUp size={12} /> : p.status === 'rejected' ? <TrendingDown size={12} /> : <CircleDot size={12} />}</div><span className="text-sm font-medium truncate" style={{ color: isHovered ? '#FFFFFF' : 'rgba(255,255,255,0.7)', fontFamily: 'system-ui, sans-serif' }}>{p.title}</span></div>
                              <div className="text-[10px] tracking-wider" style={{ color: 'rgba(255,255,255,0.2)' }}>0x{String(p.id).slice(-8).padStart(8, '0')}</div>
                              <div className="text-right text-sm font-bold" style={{ color: '#FFFFFF' }}>{p.amount}<span className="text-xs ml-1" style={{ color: 'rgba(255,255,255,0.3)' }}>ETH</span></div>
                              <div style={{ color: 'rgba(255,255,255,0.15)' }}><ChevronRight size={12} /></div>
                              <div className="text-sm font-black" style={{ color: ACCENT }}>{p.toToken}</div>
                              <div className="flex justify-end"><Pill status={p.status} /></div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                      {proposals.length === 0 && <div className="flex flex-col items-center justify-center py-24 gap-3" style={{ color: 'rgba(255,255,255,0.12)' }}><Radio size={28} strokeWidth={1} /><p className="text-[10px] uppercase tracking-[0.5em]">Awaiting signal</p></div>}
                    </div>
                  </div>
                  
                  {/* Right Panel */}
                  <div className="col-span-12 lg:col-span-4 flex flex-col">
                    <div className="flex-1 p-7 flex flex-col" style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <div className="flex items-center justify-between mb-5"><div className="flex items-center gap-2.5"><ShieldCheck size={14} style={{ color: ACCENT }} /><span className="text-[10px] uppercase tracking-[0.35em]" style={{ color: 'rgba(255,255,255,0.5)' }}>Council Policy</span></div><span className="flex items-center gap-1 text-[9px] uppercase tracking-widest px-2 py-0.5" style={{ border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.2)' }}><Lock size={8} /> ENC</span></div>
                      <div ref={logRef} className="flex-1 p-4 overflow-hidden space-y-1.5 text-[10px] leading-relaxed" style={{ background: '#000000AA', border: `1px solid ${BORDER}`, minHeight: 200, maxHeight: 280, overflowY: 'auto', scrollbarWidth: 'none' }}>
                        <AnimatePresence>
                          {logs.map((log, i) => (<motion.div key={log + i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2"><span style={{ color: 'rgba(255,255,255,0.15)', flexShrink: 0 }}>{timeStr}</span><span style={{ color: i === 0 ? ACCENT : 'rgba(255,255,255,0.25)' }}>{log}</span></motion.div>))}
                        </AnimatePresence>
                        <div className="flex gap-2"><span style={{ color: 'rgba(255,255,255,0.15)' }}>{timeStr}</span><motion.span style={{ color: ACCENT, fontWeight: 900 }} animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }}>█</motion.span></div>
                      </div>
                    </div>
                    <div className="p-7">
                      <p className="text-[9px] uppercase tracking-[0.4em] mb-5" style={{ color: 'rgba(255,255,255,0.25)' }}>Signal Breakdown</p>
                      {[ { label: 'Executed', count: execCount, total: proposals.length, color: ACCENT }, { label: 'Pending', count: pendingCount, total: proposals.length, color: '#F59E0B' }, { label: 'Rejected', count: rejectCount, total: proposals.length, color: '#FF4444' }].map(({ label, count, total, color }) => {
                        const pct = total > 0 ? (count / total) * 100 : 0;
                        return (
                          <div key={label} className="mb-4">
                            <div className="flex justify-between text-[10px] mb-1.5 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}><span>{label}</span><span style={{ color: 'rgba(255,255,255,0.6)' }}>{count} <span style={{ color: 'rgba(255,255,255,0.2)' }}>/ {total}</span></span></div>
                            <div className="w-full h-0.5" style={{ background: 'rgba(255,255,255,0.06)' }}><motion.div className="h-0.5" style={{ background: color, boxShadow: `0 0 8px ${color}66` }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} /></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ================= VAULT TAB ================= */}
            {activeTab === 'vault' && (
              <motion.div key="vault" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-10 space-y-8 flex-1">
                <div className="max-w-4xl mx-auto">
                  <h2 className="text-3xl font-black mb-2 tracking-tight text-white">INSTITUTIONAL <span style={{ color: ACCENT }}>VAULT</span></h2>
                  <p className="text-xs uppercase tracking-widest mb-10" style={{ color: 'rgba(255,255,255,0.4)' }}>Secure Multi-Chain Storage</p>
                  
                  {isConnected ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="p-8 relative overflow-hidden" style={{ background: BG_RAISED, border: `1px solid ${ACCENT}44` }}>
                        <div className="absolute top-0 right-0 p-8 opacity-5"><Database size={150} /></div>
                        <div className="relative z-10">
                          <div className="flex justify-between mb-6"><span className="text-[10px] uppercase tracking-widest flex items-center gap-2" style={{ color: ACCENT }}><span className="w-2 h-2 rounded-full animate-pulse" style={{ background: ACCENT }}/> SYNCED</span><button onClick={() => open({ view: 'Networks' })} className="text-[9px] uppercase px-3 py-1" style={{ border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.5)' }}>Switch Network</button></div>
                          <h3 className="text-5xl font-black text-white tracking-tighter mb-2">{formatBal(currentBalance, 4)} <span className="text-xl font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>{currentBalance?.symbol || 'ETH'}</span></h3>
                          
                          <div className="flex gap-4 mt-8 pt-8" style={{ borderTop: `1px solid ${BORDER}` }}>
                            <button onClick={() => setVaultModal('deposit')} className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all" style={{ background: ACCENT, color: '#000' }}>Receive</button>
                            <button onClick={() => setVaultModal('withdraw')} className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all" style={{ border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.8)', background: 'transparent' }}>Execute Transfer</button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-8" style={{ background: BG_PANEL, border: `1px solid ${BORDER}` }}>
                        <h4 className="text-[10px] uppercase tracking-[0.3em] mb-6" style={{ color: 'rgba(255,255,255,0.3)' }}>Allocation Spline</h4>
                        <div className="space-y-5">
                          <div className="flex justify-between pb-4" style={{ borderBottom: `1px solid ${BORDER}` }}><span className="text-sm font-medium text-white">{currentBalance?.symbol || 'ETH'}</span><span className="text-sm font-black" style={{ color: ACCENT }}>{formatBal(currentBalance, 4)}</span></div>
                          <div className="flex justify-between pb-4" style={{ borderBottom: `1px solid ${BORDER}` }}><span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>USDC (BASE)</span><span className="text-sm font-black" style={{ color: 'rgba(255,255,255,0.8)' }}>{formatBal(usdcBase, 2)}</span></div>
                          <div className="flex justify-between pb-4" style={{ borderBottom: `1px solid ${BORDER}` }}><span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>USDT (ARB)</span><span className="text-sm font-black" style={{ color: 'rgba(255,255,255,0.8)' }}>{formatBal(usdtArb, 2)}</span></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-16" style={{ background: BG_PANEL, border: `1px solid ${BORDER}` }}>
                      <Lock size={32} style={{ color: 'rgba(255,255,255,0.1)' }} className="mb-4" />
                      <p className="text-[10px] uppercase tracking-widest mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>Authentication Required</p>
                      <button onClick={() => open()} className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest" style={{ border: `1px solid ${ACCENT}44`, color: ACCENT, background: ACCENT_DIM }}>Connect Handshake</button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ================= ACTIVITY TAB ================= */}
            {activeTab === 'activity' && (
              <motion.div key="activity" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-10 space-y-8 flex-1">
                <div className="max-w-4xl mx-auto">
                  <h2 className="text-3xl font-black mb-2 tracking-tight text-white">SYSTEM <span style={{ color: ACCENT }}>LEDGER</span></h2>
                  <p className="text-xs uppercase tracking-widest mb-10" style={{ color: 'rgba(255,255,255,0.4)' }}>Immutable Execution Log</p>
                  
                  <div className="p-2" style={{ background: BG_PANEL, border: `1px solid ${BORDER}` }}>
                    <div className="grid grid-cols-4 text-[9px] uppercase tracking-[0.3em] px-6 py-4" style={{ color: 'rgba(255,255,255,0.3)', borderBottom: `1px solid ${BORDER}` }}>
                      <div>TX HASH</div><div>INTENT</div><div>VALUE</div><div className="text-right">STATUS</div>
                    </div>
                    {proposals.length > 0 ? proposals.map((p, idx) => (
                      <div key={`${p.id}-${idx}`} className="grid grid-cols-4 items-center px-6 py-4 transition-colors hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}` }}>
                        <div className="text-[10px] tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>0x{p.id.toString().slice(-12)}</div>
                        <div className="text-sm text-white">{p.title}</div>
                        <div className="text-sm font-black" style={{ color: ACCENT }}>{p.amount} <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>ETH</span></div>
                        <div className="flex justify-end"><Pill status={p.status}/></div>
                      </div>
                    )) : <div className="py-20 text-center text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>No history found</div>}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ================= NODES TAB ================= */}
            {activeTab === 'nodes' && (
              <motion.div key="nodes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-10 space-y-8 flex-1">
                <div className="max-w-4xl mx-auto">
                  <h2 className="text-3xl font-black mb-2 tracking-tight text-white">COUNCIL <span style={{ color: ACCENT }}>NODES</span></h2>
                  <p className="text-xs uppercase tracking-widest mb-10" style={{ color: 'rgba(255,255,255,0.4)' }}>Distributed Agent Network</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-8" style={{ background: BG_PANEL, border: `1px solid ${BORDER}` }}>
                      <div className="flex justify-between items-start mb-6"><div className="flex items-center gap-3"><Server style={{ color: ACCENT }} size={24} /><h3 className="text-lg font-bold text-white">Proposer Node</h3></div><span className="text-[9px] px-2 py-1 uppercase tracking-widest" style={{ background: ACCENT_DIM, color: ACCENT }}>Connected</span></div>
                      <p className="text-xs leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>Monitors Web3 oracles and local state to suggest high-conviction reallocations.</p>
                      <div className="text-[10px] uppercase tracking-widest space-y-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        <p>UPTIME: <span className="text-white">99.9%</span></p>
                        <p>PINGS: <span className="text-white">{proposals.length * 12}</span></p>
                      </div>
                    </div>
                    <div className="p-8" style={{ background: BG_PANEL, border: `1px solid ${BORDER}` }}>
                      <div className="flex justify-between items-start mb-6"><div className="flex items-center gap-3"><ShieldCheck style={{ color: ACCENT }} size={24} /><h3 className="text-lg font-bold text-white">Approver Node</h3></div><span className="text-[9px] px-2 py-1 uppercase tracking-widest" style={{ background: ACCENT_DIM, color: ACCENT }}>Connected</span></div>
                      <p className="text-xs leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>Enforces risk governance, checks slippage, and signs valid intents on-chain.</p>
                      <div className="text-[10px] uppercase tracking-widest space-y-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        <p>SIGNATURES: <span className="text-white">{execCount}</span></p>
                        <p>REJECTS: <span className="text-white">{rejectCount}</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ================= SETTINGS TAB ================= */}
            {activeTab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-10 space-y-8 flex-1">
                <div className="max-w-3xl mx-auto">
                  <h2 className="text-3xl font-black mb-2 tracking-tight text-white">SYSTEM <span style={{ color: ACCENT }}>SETTINGS</span></h2>
                  <p className="text-xs uppercase tracking-widest mb-10" style={{ color: 'rgba(255,255,255,0.4)' }}>Execution & Risk Parameters</p>
                  
                  <div className="p-8 space-y-8" style={{ background: BG_PANEL, border: `1px solid ${BORDER}` }}>
                    <div className="flex justify-between items-center pb-8" style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <div><h4 className="text-sm font-bold text-white mb-1">Autonomous Routing</h4><p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Allow smart contracts to bypass manual signatures if risk is low.</p></div>
                      <div className="w-12 h-6 rounded-full relative cursor-pointer" style={{ background: ACCENT }}><div className="w-4 h-4 rounded-full absolute right-1 top-1" style={{ background: '#000' }}></div></div>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1">Slippage Tolerance</h4>
                      <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>Auto-reject trades that exceed this price movement.</p>
                      <div className="flex gap-3">
                        {['0.1%', '0.5%', '1.0%'].map((s, i) => (<div key={i} className="px-4 py-2 text-[10px] tracking-widest uppercase cursor-pointer" style={{ border: i === 1 ? `1px solid ${ACCENT}` : `1px solid ${BORDER}`, color: i === 1 ? ACCENT : 'rgba(255,255,255,0.5)', background: i === 1 ? ACCENT_DIM : 'transparent' }}>{s}</div>))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MODALS & OVERLAYS
      ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        
        {/* SEARCH MODAL */}
        {isSearchOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] backdrop-blur-md flex items-start justify-center pt-32 px-4" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}>
            <motion.div initial={{ scale: 0.95, y: -20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: -20 }} onClick={e => e.stopPropagation()} className="w-full max-w-2xl flex flex-col max-h-[70vh] shadow-2xl" style={{ background: BG_PANEL, border: `1px solid ${BORDER}` }}>
              <div className="flex items-center px-6 py-5 flex-shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <Search size={18} style={{ color: ACCENT }} className="mr-4" />
                <input autoFocus type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Query intent, hash, or token..." className="bg-transparent border-none outline-none flex-1 text-white text-lg font-mono placeholder-white/20" />
                <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="px-2 py-1 text-[10px] tracking-widest uppercase" style={{ border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.4)' }}>ESC</button>
              </div>
              
              <div className="overflow-y-auto flex-1">
                {searchQuery.trim() === '' ? (
                  <>
                    <div className="px-6 py-4 text-[9px] uppercase tracking-[0.4em]" style={{ color: 'rgba(255,255,255,0.3)' }}>Action Directives</div>
                    <div className="px-2 pb-4">
                      <div onClick={() => { setActiveTab('vault'); setVaultModal('withdraw'); setIsSearchOpen(false); }} className="px-6 py-4 cursor-pointer flex items-center justify-between transition-colors hover:bg-white/[0.02]">
                        <div className="flex items-center gap-4"><Zap size={14} style={{ color: ACCENT }} /><span className="text-sm text-white">Swap ETH to USDC</span></div>
                        <span className="text-[9px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>CMD</span>
                      </div>
                      <div onClick={() => { setActiveTab('vault'); setIsSearchOpen(false); }} className="px-6 py-4 cursor-pointer flex items-center justify-between transition-colors hover:bg-white/[0.02]">
                        <div className="flex items-center gap-4"><Database size={14} style={{ color: ACCENT }} /><span className="text-sm text-white">View Vault Analytics</span></div>
                        <span className="text-[9px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>NAV</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="px-6 py-4 text-[9px] uppercase tracking-[0.4em]" style={{ color: 'rgba(255,255,255,0.3)' }}>Query Results</div>
                    <div className="px-2 pb-4">
                      {filteredProposals.length > 0 ? filteredProposals.map(p => (
                        <div key={p.id} className="px-6 py-4 cursor-pointer flex items-center justify-between transition-colors hover:bg-white/[0.02]">
                          <div className="flex items-center gap-4"><Terminal size={14} style={{ color: 'rgba(255,255,255,0.3)' }} /><span className="text-sm text-white">{p.title}</span></div>
                          <div className="flex items-center gap-4"><Pill status={p.status} /><span className="text-[10px] tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>0x{p.id.toString().slice(-8)}</span></div>
                        </div>
                      )) : <div className="px-6 py-10 text-center text-xs tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>No intents match "{searchQuery}"</div>}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* VAULT: DEPOSIT MODAL */}
        {vaultModal === 'deposit' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] backdrop-blur-md flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setVaultModal('none')}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onClick={e => e.stopPropagation()} className="w-full max-w-md shadow-2xl" style={{ background: BG_PANEL, border: `1px solid ${BORDER}` }}>
              <div className="flex justify-between items-center px-6 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}><h3 className="text-white font-bold tracking-tight">INBOUND TRANSFER</h3><button onClick={() => setVaultModal('none')} style={{ color: 'rgba(255,255,255,0.4)' }}><X size={18} /></button></div>
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-center p-8" style={{ background: BG_RAISED, border: `1px solid ${BORDER}` }}><div className="bg-white p-2"><QrCode size={120} className="text-black" /></div></div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.3em] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Deposit Address</p>
                  <div className="flex items-center justify-between p-3" style={{ background: '#000', border: `1px solid ${BORDER}` }}><span className="text-sm font-mono text-white truncate mr-4">{address}</span><button onClick={handleCopy} style={{ color: ACCENT }}>{copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}</button></div>
                </div>
                <button onClick={handleDeposit} className="w-full py-3 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all" style={{ background: ACCENT, color: '#000' }}>Mock Direct Deposit (0.0001 ETH)</button>
                {txStatus && <p className="text-center text-[10px] font-mono mt-3 animate-pulse" style={{ color: ACCENT }}>{txStatus}</p>}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* VAULT: WITHDRAW MODAL */}
        {vaultModal === 'withdraw' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] backdrop-blur-md flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setVaultModal('none')}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onClick={e => e.stopPropagation()} className="w-full max-w-md shadow-2xl" style={{ background: BG_PANEL, border: `1px solid ${BORDER}` }}>
              <div className="flex justify-between items-center px-6 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}><h3 className="text-white font-bold tracking-tight">EXECUTE TRANSFER</h3><button onClick={() => setVaultModal('none')} style={{ color: 'rgba(255,255,255,0.4)' }}><X size={18} /></button></div>
              <div className="p-6 space-y-6">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.3em] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Destination Address</p>
                  <input type="text" placeholder="0x..." value={withdrawForm.address} onChange={e => setWithdrawForm({...withdrawForm, address: e.target.value})} className="w-full p-3 text-white font-mono text-sm outline-none transition-colors" style={{ background: '#000', border: `1px solid ${BORDER}` }} />
                </div>
                <div>
                  <div className="flex justify-between mb-2"><p className="text-[9px] uppercase tracking-[0.3em]" style={{ color: 'rgba(255,255,255,0.4)' }}>Amount (ETH)</p><span className="text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>AVAIL: {formatBal(currentBalance, 4)}</span></div>
                  <div className="relative">
                    <input type="number" placeholder="0.00" value={withdrawForm.amount} onChange={e => setWithdrawForm({...withdrawForm, amount: e.target.value})} className="w-full p-3 text-white font-mono text-lg outline-none transition-colors" style={{ background: '#000', border: `1px solid ${BORDER}` }} />
                    <button onClick={() => setWithdrawForm({...withdrawForm, amount: formatBal(currentBalance, 4)})} className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black tracking-widest px-2 py-1" style={{ color: ACCENT, background: ACCENT_DIM }}>MAX</button>
                  </div>
                </div>
                <div className="pt-2">
                  <button onClick={executeWithdrawal} disabled={!withdrawForm.address || !withdrawForm.amount} className="w-full py-3.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all disabled:opacity-50" style={{ background: ACCENT, color: '#000' }}>{txStatus || 'Sign Intent'}</button>
                  {txStatus && <p className="text-center text-[10px] font-mono mt-4 animate-pulse" style={{ color: ACCENT }}>{txStatus}</p>}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Global Styles ── */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,700;0,900;1,300&display=swap');
        * { box-sizing: border-box; }
        ::selection { background: ${ACCENT}33; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: ${ACCENT}15; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
      `}</style>
    </div>
  );
}