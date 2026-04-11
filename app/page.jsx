'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useUser, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';

const PLANS = {
  free:   { name: 'Free',   price: 0,  limit: 3,        maxUrls: 0, emailSend: false },
  silver: { name: 'Silver', price: 19, limit: 50,        maxUrls: 1, emailSend: true  },
  gold:   { name: 'Gold',   price: 39, limit: Infinity,  maxUrls: 4, emailSend: true  },
};

const S = {
  // ─ layout
  app: { position:'relative', zIndex:1, maxWidth:780, margin:'0 auto', padding:'0 20px 80px' },
  // ─ header
  headerWrap: { textAlign:'center', padding:'48px 0 40px', animation:'fadeUp .6s ease both' },
  headerTop: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:32 },
  badge: { display:'inline-flex', alignItems:'center', gap:8, background:'rgba(124,107,255,0.1)', border:'1px solid rgba(124,107,255,0.25)', borderRadius:100, padding:'5px 14px 5px 10px', fontSize:12, fontWeight:500, color:'#a78bfa', letterSpacing:'.03em' },
  badgeDot: { width:6, height:6, borderRadius:'50%', background:'#7c6bff', animation:'pulse 2s infinite' },
  h1: { fontFamily:"'Instrument Serif',serif", fontSize:'clamp(32px,6vw,54px)', fontWeight:400, lineHeight:1.1, letterSpacing:'-.02em', background:'linear-gradient(135deg,#f0eff8 0%,#a78bfa 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', marginBottom:12 },
  subtitle: { fontSize:16, color:'#7b7a8e', fontWeight:300 },
  // ─ nav
  nav: { display:'flex', alignItems:'center', gap:10 },
  btnNav: { padding:'8px 16px', borderRadius:8, border:'1px solid rgba(255,255,255,0.12)', background:'transparent', color:'#7b7a8e', fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:500, cursor:'pointer' },
  btnNavAccent: { background:'#7c6bff', borderColor:'#7c6bff', color:'white' },
  planBadgeFree:   { display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:100, fontSize:12, fontWeight:600, letterSpacing:'.04em', textTransform:'uppercase', background:'rgba(123,122,142,0.1)', border:'1px solid rgba(123,122,142,0.2)', color:'#7b7a8e' },
  planBadgeSilver: { display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:100, fontSize:12, fontWeight:600, letterSpacing:'.04em', textTransform:'uppercase', background:'rgba(148,163,184,0.1)', border:'1px solid rgba(148,163,184,0.25)', color:'#94a3b8' },
  planBadgeGold:   { display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:100, fontSize:12, fontWeight:600, letterSpacing:'.04em', textTransform:'uppercase', background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.25)', color:'#fbbf24' },
  // ─ usage bar
  usageWrap: { marginBottom:28, animation:'fadeUp .6s .1s ease both' },
  usageRow: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6, fontSize:12, color:'#7b7a8e' },
  usageTrack: { height:3, background:'#1e1e28', borderRadius:2, overflow:'hidden' },
  usageFill: { height:'100%', background:'linear-gradient(90deg,#7c6bff,#a78bfa)', borderRadius:2, transition:'width .4s' },
  // ─ card
  card: { background:'#111118', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:32, boxShadow:'0 1px 0 rgba(255,255,255,0.04) inset,0 24px 64px rgba(0,0,0,0.4)', animation:'fadeUp .6s .15s ease both', position:'relative', overflow:'hidden' },
  cardShine: { position:'absolute', inset:0, borderRadius:14, background:'linear-gradient(135deg,rgba(124,107,255,0.04) 0%,transparent 60%)', pointerEvents:'none' },
  // ─ form
  formGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 },
  formGroup: { display:'flex', flexDirection:'column', gap:7 },
  lbl: { fontSize:12, fontWeight:500, letterSpacing:'.06em', textTransform:'uppercase', color:'#7b7a8e' },
  lblOpt: { fontWeight:300, textTransform:'none', letterSpacing:0, color:'#4a4860', marginLeft:4 },
  inp: { width:'100%', padding:'11px 14px', background:'#18181f', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, color:'#f0eff8', fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:'none', appearance:'none', transition:'border-color .18s,box-shadow .18s,background .18s' },
  sel: { width:'100%', padding:'11px 36px 11px 14px', background:'#18181f', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, color:'#f0eff8', fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:'none', appearance:'none', backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='7' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%237b7a8e' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")", backgroundRepeat:'no-repeat', backgroundPosition:'right 14px center', cursor:'pointer' },
  // ─ toggle
  toggleRow: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', background:'#18181f', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, marginTop:4 },
  toggleInfo: { display:'flex', flexDirection:'column', gap:2 },
  toggleTitle: { fontSize:14, fontWeight:500, color:'#f0eff8' },
  toggleSub: { fontSize:12, color:'#7b7a8e' },
  // ─ url section
  urlSection: { background:'#18181f', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, overflow:'hidden' },
  urlHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 14px', cursor:'pointer', userSelect:'none' },
  urlLabel: { display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#7b7a8e' },
  urlBadge: { fontSize:10, fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase', background:'rgba(124,107,255,0.15)', color:'#a78bfa', border:'1px solid rgba(124,107,255,0.2)', borderRadius:4, padding:'2px 7px' },
  urlBody: { padding:'0 14px 14px' },
  urlPlatforms: { display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 },
  urlTag: { display:'flex', alignItems:'center', gap:5, padding:'4px 10px', background:'#1e1e28', border:'1px solid rgba(255,255,255,0.12)', borderRadius:100, fontSize:11, color:'#7b7a8e', fontWeight:500 },
  urlInputs: { display:'flex', flexDirection:'column', gap:8 },
  urlRow: { display:'flex', gap:8, alignItems:'center' },
  urlIcon: { fontSize:16, width:24, textAlign:'center', flexShrink:0 },
  urlInp: { flex:1, padding:'8px 12px', background:'#0a0a0f', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, color:'#f0eff8', fontFamily:"'DM Sans',sans-serif", fontSize:13, outline:'none' },
  scanStatus: { display:'flex', alignItems:'center', gap:8, marginTop:10, padding:'8px 12px', background:'rgba(124,107,255,0.06)', border:'1px solid rgba(124,107,255,0.15)', borderRadius:8, fontSize:12, color:'#a78bfa' },
  scanDot: { width:6, height:6, borderRadius:'50%', background:'#7c6bff', animation:'pulse 1.5s infinite' },
  // ─ button
  btnGen: { width:'100%', marginTop:20, padding:'14px 24px', background:'linear-gradient(135deg,#7c6bff,#9d8bff)', border:'none', borderRadius:8, color:'white', fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:600, cursor:'pointer', letterSpacing:'.01em', boxShadow:'0 4px 20px rgba(124,107,255,0.35)', transition:'all .18s', position:'relative', overflow:'hidden' },
  // ─ error
  errorBox: { padding:'14px 16px', background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:8, fontSize:13, color:'#f87171', marginTop:12 },
  // ─ output
  outputSection: { marginTop:24, animation:'fadeUp .5s ease both' },
  outputHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 },
  outputTitle: { fontSize:13, fontWeight:500, color:'#7b7a8e', letterSpacing:'.05em', textTransform:'uppercase' },
  btnRegen: { display:'flex', alignItems:'center', gap:6, padding:'7px 14px', background:'#18181f', border:'1px solid rgba(255,255,255,0.12)', borderRadius:100, color:'#7b7a8e', fontFamily:"'DM Sans',sans-serif", fontSize:13, cursor:'pointer' },
  prospectPill: { display:'inline-flex', alignItems:'center', gap:6, marginBottom:14, padding:'5px 12px', background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.2)', borderRadius:100, fontSize:12, color:'#34d399' },
  // ─ dm card
  dmCard: { background:'#18181f', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:20, marginBottom:12, transition:'border-color .18s', animation:'fadeUp .4s ease both' },
  dmCardTop: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14, gap:12 },
  dmAngle: { display:'inline-flex', alignItems:'center', gap:6, background:'#1e1e28', border:'1px solid rgba(255,255,255,0.12)', borderRadius:100, padding:'4px 11px', fontSize:11, fontWeight:600, color:'#a78bfa', letterSpacing:'.05em', textTransform:'uppercase', whiteSpace:'nowrap' },
  angleDot: { width:5, height:5, borderRadius:'50%', background:'#7c6bff' },
  dmActions: { display:'flex', gap:6, flexShrink:0, flexWrap:'wrap' },
  btnAction: { padding:'5px 11px', borderRadius:6, border:'1px solid rgba(255,255,255,0.12)', background:'transparent', color:'#7b7a8e', fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:500, cursor:'pointer' },
  btnCopied: { background:'rgba(52,211,153,0.12)', borderColor:'rgba(52,211,153,0.3)', color:'#34d399' },
  dmText: { fontSize:14.5, lineHeight:1.65, color:'#f0eff8', whiteSpace:'pre-wrap', wordBreak:'break-word', fontWeight:300 },
  whyBox: { marginTop:14, padding:'14px 16px', background:'rgba(124,107,255,0.06)', border:'1px solid rgba(124,107,255,0.15)', borderRadius:8 },
  whyH4: { fontSize:11, fontWeight:600, color:'#a78bfa', letterSpacing:'.07em', textTransform:'uppercase', marginBottom:8 },
  whyText: { fontSize:13, color:'#7b7a8e', lineHeight:1.6 },
  whyLabel: { fontWeight:600, color:'#f0eff8' },
  fbRow: { display:'flex', gap:8, marginTop:14, alignItems:'stretch', borderTop:'1px solid rgba(255,255,255,0.07)', paddingTop:14 },
  fbInp: { flex:1, padding:'9px 13px', background:'#1e1e28', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, color:'#f0eff8', fontFamily:"'DM Sans',sans-serif", fontSize:13, outline:'none', resize:'none', minHeight:38, lineHeight:1.5 },
  btnFb: { padding:'9px 16px', background:'#1e1e28', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, color:'#a78bfa', fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:6, flexShrink:0 },
  fbHint: { fontSize:11, color:'#4a4860', marginTop:6 },
  // ─ call card
  callCard: { background:'#18181f', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:20, marginBottom:12, transition:'border-color .18s', animation:'fadeUp .4s ease both' },
  callCardTop: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, gap:12 },
  callBadge: { display:'inline-flex', alignItems:'center', gap:6, background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.25)', borderRadius:100, padding:'4px 12px', fontSize:11, fontWeight:600, color:'#fbbf24', letterSpacing:'.05em', textTransform:'uppercase' },
  callSec: { marginBottom:14 },
  callSecLabel: { fontSize:10, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'#4a4860', marginBottom:6, display:'flex', alignItems:'center', gap:6 },
  callSecText: { fontSize:14, lineHeight:1.7, color:'#f0eff8', fontWeight:300, whiteSpace:'pre-wrap', background:'#1e1e28', borderRadius:8, padding:'12px 14px', borderLeft:'2px solid #7c6bff' },
  callDur: { display:'inline-flex', alignItems:'center', gap:5, fontSize:11, color:'#4a4860', marginTop:12 },
  // ─ history
  historySec: { marginTop:48 },
  historyTitle: { fontSize:12, fontWeight:500, color:'#4a4860', letterSpacing:'.07em', textTransform:'uppercase', marginBottom:12, display:'flex', alignItems:'center', gap:8 },
  historyItem: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'#111118', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, marginBottom:8, cursor:'pointer', transition:'all .18s', gap:12 },
  historyMeta: { fontSize:13, color:'#7b7a8e' },
  historyTime: { fontSize:11, color:'#4a4860', whiteSpace:'nowrap' },
  // ─ modal
  modalOverlay: { position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, animation:'fadeUp .2s ease' },
  modal: { background:'#111118', border:'1px solid rgba(255,255,255,0.12)', borderRadius:20, padding:36, maxWidth:520, width:'100%', boxShadow:'0 32px 80px rgba(0,0,0,0.6)', position:'relative' },
  modalClose: { position:'absolute', top:16, right:16, width:30, height:30, background:'#18181f', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'50%', color:'#7b7a8e', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' },
  modalSm: { background:'#111118', border:'1px solid rgba(255,255,255,0.12)', borderRadius:20, padding:36, maxWidth:420, width:'100%', boxShadow:'0 32px 80px rgba(0,0,0,0.6)', position:'relative', textAlign:'center' },
  // ─ pricing
  pricingGrid: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, margin:'24px 0' },
  pricingCard: { background:'#18181f', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:20, textAlign:'center', cursor:'pointer', position:'relative' },
  pricingCardFeatured: { borderColor:'#7c6bff', background:'rgba(124,107,255,0.06)' },
  featuredBadge: { position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)', background:'#7c6bff', color:'white', fontSize:10, fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', padding:'3px 10px', borderRadius:100, whiteSpace:'nowrap' },
  planName: { fontSize:13, fontWeight:600, color:'#7b7a8e', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 },
  planPrice: { fontFamily:"'Instrument Serif',serif", fontSize:32, color:'#f0eff8', marginBottom:4 },
  planFeatures: { fontSize:12, color:'#7b7a8e', lineHeight:1.8, margin:'12px 0' },
  btnPlan: { width:'100%', padding:10, borderRadius:8, border:'1px solid rgba(255,255,255,0.12)', background:'#1e1e28', color:'#f0eff8', fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, cursor:'pointer' },
  btnPlanAccent: { background:'#7c6bff', borderColor:'#7c6bff', color:'white' },
  // ─ sign btns
  signBox: { textAlign:'center', marginBottom:20 },
  signBtns: { display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap', marginTop:16 },
  btnSignGhost: { padding:'11px 28px', borderRadius:10, background:'transparent', border:'1px solid rgba(255,255,255,0.12)', color:'#7b7a8e', fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, cursor:'pointer' },
  btnSignPrimary: { padding:'11px 28px', borderRadius:10, background:'linear-gradient(135deg,#7c6bff,#9d8bff)', border:'none', color:'white', fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, cursor:'pointer', boxShadow:'0 4px 20px rgba(124,107,255,0.35)' },
  // ─ email modal fields
  emailFields: { display:'flex', flexDirection:'column', gap:12, marginBottom:18 },
  emailField: { display:'flex', flexDirection:'column', gap:6 },
  emailLbl: { fontSize:11, fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase', color:'#7b7a8e' },
  emailInp: { padding:'10px 14px', background:'#18181f', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, color:'#f0eff8', fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:'none' },
  emailPreview: { background:'#18181f', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, padding:14, fontSize:13, color:'#7b7a8e', lineHeight:1.6, marginBottom:18, maxHeight:120, overflowY:'auto', whiteSpace:'pre-wrap', borderLeft:'2px solid #7c6bff' },
  btnSend: { width:'100%', padding:13, background:'linear-gradient(135deg,#7c6bff,#9d8bff)', border:'none', borderRadius:8, color:'white', fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, cursor:'pointer', boxShadow:'0 4px 20px rgba(124,107,255,0.35)', display:'flex', alignItems:'center', justifyContent:'center', gap:8 },
  sendSuccess: { marginTop:12, padding:'10px 14px', borderRadius:8, fontSize:13, textAlign:'center', background:'rgba(52,211,153,0.12)', border:'1px solid rgba(52,211,153,0.3)', color:'#34d399' },
  sendError: { marginTop:12, padding:'10px 14px', borderRadius:8, fontSize:13, textAlign:'center', background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', color:'#f87171' },
};

export default function Home() {
  const { isSignedIn } = useUser();
  const [product, setProduct]   = useState('');
  const [audience, setAudience] = useState('');
  const [goal, setGoal]         = useState('Book a call');
  const [platform, setPlatform] = useState('Instagram DM');
  const [tone, setTone]         = useState('Friendly');
  const [urls, setUrls]         = useState({ website:'', maps:'', insta:'', tiktok:'' });
  const [urlOpen, setUrlOpen]   = useState(false);
  const [showWhy, setShowWhy]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [scanning, setScanning] = useState(false);
  const [results, setResults]   = useState(null);
  const [error, setError]       = useState('');
  const [history, setHistory]   = useState([]);
  const [showPricing, setShowPricing]   = useState(false);
  const [showUpgrade, setShowUpgrade]   = useState(null);
  const [emailModal, setEmailModal]     = useState(null); // { text }
  const [usageData, setUsageData] = useState({ plan:'free', usage:0, limit:3, remaining:3, maxUrls:0, emailSend:false });
  const outputRef = useRef(null);
  const isCall = platform === 'Phone Call Script';

  useEffect(() => {
    setHistory(JSON.parse(localStorage.getItem('dm_history') || '[]'));
  }, []);

  useEffect(() => {
    if (isSignedIn) fetchUsage();
  }, [isSignedIn]);

  async function fetchUsage() {
    try {
      const r = await fetch('/api/usage');
      if (r.ok) setUsageData(await r.json());
    } catch {}
  }

  const activeUrls = Object.values(urls).filter(Boolean);
  const planCfg = PLANS[usageData.plan] || PLANS.free;
  const usagePct = planCfg.limit === Infinity ? 5 : Math.min((usageData.usage / planCfg.limit) * 100, 100);

  async function generate() {
    if (loading) return;
    if (!isSignedIn) { setShowPricing(true); return; }
    if (!product.trim() || !audience.trim()) { setError('Please fill in Product/Service and Target Audience.'); return; }
    setError('');
    setLoading(true);
    setScanning(activeUrls.length > 0);

    const urlContext = activeUrls.length > 0
      ? `\n\nProspect URLs to research:\n${activeUrls.map((u,i) => `${i+1}. ${u}`).join('\n')}\nUse web search to gather intel about this prospect.`
      : '';

    const prompt = isCall
      ? `You are an elite sales coach. Write 3 cold call scripts for:
- Product/Service: ${product}
- Target Audience: ${audience}
- Goal: ${goal}
- Tone: ${tone}${urlContext}
${activeUrls.length ? 'IMPORTANT: Personalize using research from the URLs.' : ''}
Each object must have: angle, duration (seconds as number), opener, pattern_interrupt, value_pitch, objection, close.
Respond ONLY with a valid JSON array. No preamble, no markdown, no backticks.`
      : `You are an expert cold outreach copywriter. Write 5 high-converting cold messages for:
- Product/Service: ${product}
- Target Audience: ${audience}
- Goal: ${goal}
- Platform: ${platform}
- Tone: ${tone}${urlContext}
${activeUrls.length ? 'IMPORTANT: Personalize with specific details from researching the URLs.' : ''}
Rules: Under 80 words, strong hook, no spam, natural, low-pressure CTA.
Respond ONLY with a valid JSON array. No preamble, no markdown, no backticks.
Each object: {"angle":"...","message":"...","hook_why":"...","cta_why":"..."}`;

    const body = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      messages: [{ role:'user', content:prompt }],
      _urlCount: activeUrls.length,
    };
    if (activeUrls.length > 0) {
      body.tools = [{ type:'web_search_20250305', name:'web_search' }];
    }

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.limitReached) { setShowUpgrade('limit'); }
        else setError(data.error || 'Something went wrong.');
        return;
      }

      if (data._meta) setUsageData(p => ({ ...p, ...data._meta }));

      const raw = (data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
      let parsed;
      try { parsed = JSON.parse(raw.replace(/```json|```/g,'').trim()); }
      catch { const m=raw.match(/\[[\s\S]*\]/); if(m) parsed=JSON.parse(m[0]); else throw new Error('Parse error'); }

      setResults({ items:parsed, isCall, hasProspect: activeUrls.length > 0 });
      const entry = { product, audience, goal, platform, tone, urls:activeUrls, dms:parsed, ts:Date.now() };
      const h = [entry, ...history].slice(0,10);
      setHistory(h);
      localStorage.setItem('dm_history', JSON.stringify(h));
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior:'smooth' }), 100);
    } catch(err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      setScanning(false);
    }
  }

  async function checkout(plan) {
    try {
      const res = await fetch('/api/create-checkout', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {}
  }

  const planBadgeStyle = usageData.plan === 'gold' ? S.planBadgeGold : usageData.plan === 'silver' ? S.planBadgeSilver : S.planBadgeFree;
  const planEmoji = usageData.plan === 'gold' ? '🥇' : usageData.plan === 'silver' ? '🥈' : '🆓';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'DM Sans',sans-serif;background:#0a0a0f;color:#f0eff8;min-height:100vh;overflow-x:hidden;line-height:1.6}
        @keyframes drift{from{transform:translate(0,0) scale(1)}to{transform:translate(40px,30px) scale(1.05)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(124,107,255,0.4)}50%{opacity:.7;box-shadow:0 0 0 6px rgba(124,107,255,0)}}
        .bg-grid{position:fixed;inset:0;z-index:0;pointer-events:none;background-image:linear-gradient(rgba(124,107,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(124,107,255,0.03) 1px,transparent 1px);background-size:40px 40px}
        .bg-orb1{position:fixed;top:-200px;left:-200px;width:600px;height:600px;border-radius:50%;background:radial-gradient(circle,rgba(124,107,255,0.12),transparent 70%);z-index:0;pointer-events:none;animation:drift 18s ease-in-out infinite alternate}
        .bg-orb2{position:fixed;bottom:-150px;right:-100px;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(167,139,250,0.08),transparent 70%);z-index:0;pointer-events:none;animation:drift 22s ease-in-out infinite alternate-reverse}
        input::placeholder{color:#4a4860}
        input:focus,select:focus{border-color:#7c6bff!important;background:#1e1e28!important;box-shadow:0 0 0 3px rgba(124,107,255,0.25)!important}
        select option{background:#18181f}
        .dm-card:hover{border-color:rgba(255,255,255,0.12)!important}
        .call-card:hover{border-color:rgba(255,255,255,0.12)!important}
        .history-item:hover{border-color:rgba(255,255,255,0.12)!important;background:#18181f!important}
        .btn-action:hover{background:#1e1e28!important;color:#f0eff8!important}
        .btn-regen:hover{background:#1e1e28!important;color:#f0eff8!important}
        .btn-gen:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 28px rgba(124,107,255,0.5)!important;filter:brightness(1.05)}
        .btn-gen:disabled{opacity:.6;cursor:not-allowed}
        .call-sec-label::after{content:'';flex:1;height:1px;background:rgba(255,255,255,0.07)}
        .history-title::before,.history-title::after{content:'';flex:1;height:1px;background:rgba(255,255,255,0.07)}
        ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#0a0a0f}::-webkit-scrollbar-thumb{background:#1e1e28;border-radius:3px}
        .spinner{display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle;margin-right:8px}
        .fb-spinner{display:inline-block;width:12px;height:12px;border:1.5px solid rgba(167,139,250,0.3);border-top-color:#a78bfa;border-radius:50%;animation:spin .7s linear infinite}
        @media(max-width:600px){
          .pricing-grid{grid-template-columns:1fr!important}
          .form-grid{grid-template-columns:1fr!important}
          .dm-card-top{flex-direction:column;gap:10px}
        }
      `}</style>

      <div className="bg-grid" />
      <div className="bg-orb1" />
      <div className="bg-orb2" />

      <div style={S.app}>
        {/* Header */}
        <div style={S.headerWrap}>
          <div style={S.headerTop}>
            <div style={S.badge}><span style={S.badgeDot} /> AI-Powered Outreach</div>
            <div style={S.nav}>
              {isSignedIn ? (
                <>
                  <div style={planBadgeStyle}>{planEmoji} {PLANS[usageData.plan]?.name}</div>
                  <button style={S.btnNav} onClick={() => setShowPricing(true)}>Upgrade</button>
                  <UserButton afterSignOutUrl="/" />
                </>
              ) : (
                <>
                  <SignInButton mode="modal"><button style={S.btnNav}>Sign in</button></SignInButton>
                  <SignUpButton mode="modal"><button style={{...S.btnNav,...S.btnNavAccent}}>Get started free</button></SignUpButton>
                </>
              )}
            </div>
          </div>
          <h1 style={S.h1}>Growth Flow AI</h1>
          <p style={S.subtitle}>AI messages that actually get replies</p>
        </div>

        {/* Usage bar */}
        {isSignedIn && (
          <div style={S.usageWrap}>
            <div style={S.usageRow}>
              <span>{usageData.usage} / {usageData.limit === Infinity ? '∞' : usageData.limit} generations this month</span>
              <span style={{ color: usageData.plan==='gold'?'#fbbf24':usageData.plan==='silver'?'#94a3b8':'#7b7a8e' }}>
                {PLANS[usageData.plan]?.name} plan
              </span>
            </div>
            <div style={S.usageTrack}>
              <div style={{...S.usageFill, width:`${usagePct}%`}} />
            </div>
          </div>
        )}

        {/* Form card */}
        <div style={S.card}>
          <div style={S.cardShine} />
          <div className="form-grid" style={S.formGrid}>
            <div style={{...S.formGroup, gridColumn:'1/-1'}}>
              <label style={S.lbl}>Product / Service</label>
              <input style={S.inp} value={product} onChange={e=>setProduct(e.target.value)} placeholder="e.g. SaaS tool for freelancers, coaching program..." />
            </div>
            <div style={{...S.formGroup, gridColumn:'1/-1'}}>
              <label style={S.lbl}>Target Audience</label>
              <input style={S.inp} value={audience} onChange={e=>setAudience(e.target.value)} placeholder="e.g. e-commerce founders, fitness coaches..." />
            </div>
            <div style={S.formGroup}>
              <label style={S.lbl}>Goal</label>
              <select style={S.sel} value={goal} onChange={e=>setGoal(e.target.value)}>
                <option>Book a call</option>
                <option>Sell a product</option>
                <option>Get a reply</option>
              </select>
            </div>
            <div style={S.formGroup}>
              <label style={S.lbl}>Platform</label>
              <select style={S.sel} value={platform} onChange={e=>setPlatform(e.target.value)}>
                <option>Instagram DM</option>
                <option>Email</option>
                <option>LinkedIn</option>
                <option value="Phone Call Script">📞 Phone Call Script</option>
              </select>
            </div>
            <div style={{...S.formGroup, gridColumn:'1/-1'}}>
              <label style={S.lbl}>Tone <span style={S.lblOpt}>(optional)</span></label>
              <select style={S.sel} value={tone} onChange={e=>setTone(e.target.value)}>
                <option>Friendly</option><option>Direct</option><option>Casual</option><option>Professional</option>
              </select>
            </div>

            {/* URL section */}
            <div style={{...S.formGroup, gridColumn:'1/-1'}}>
              <label style={S.lbl}>Prospect URLs <span style={S.lblOpt}>(optional — AI researches these)</span></label>
              <div style={S.urlSection}>
                <div style={S.urlHeader} onClick={() => setUrlOpen(o=>!o)}>
                  <div style={S.urlLabel}>
                    🔍 Paste links to personalize messages
                    <span style={S.urlBadge}>AI Research</span>
                    {(!isSignedIn || usageData.plan==='free') && <span style={{fontSize:11,color:'#fbbf24'}}>⚡ Silver+</span>}
                  </div>
                  <span style={{color:'#4a4860', transition:'transform .25s', display:'inline-block', transform: urlOpen?'rotate(180deg)':'none'}}>▾</span>
                </div>
                {urlOpen && (
                  <div style={S.urlBody}>
                    <div style={S.urlPlatforms}>
                      {['🌐 Website','📍 Google Maps','📸 Instagram','🎵 TikTok'].map(p=>(
                        <div key={p} style={S.urlTag}>{p}</div>
                      ))}
                    </div>
                    <div style={S.urlInputs}>
                      {[
                        {key:'website',icon:'🌐',ph:'https://theirwebsite.com'},
                        {key:'maps',icon:'📍',ph:'https://maps.google.com/...'},
                        {key:'insta',icon:'📸',ph:'https://instagram.com/username'},
                        {key:'tiktok',icon:'🎵',ph:'https://tiktok.com/@username'},
                      ].map(({key,icon,ph},idx) => {
                        const locked = (usageData.plan==='free'&&isSignedIn) || (usageData.plan==='silver'&&idx>=1);
                        return (
                          <div key={key} style={S.urlRow}>
                            <span style={S.urlIcon}>{icon}</span>
                            <input
                              type="url" style={{...S.urlInp, opacity: locked?.5:1}}
                              placeholder={locked ? '🔒 Upgrade to unlock' : ph}
                              value={urls[key]}
                              onChange={e=>setUrls(u=>({...u,[key]:e.target.value}))}
                              disabled={locked}
                            />
                          </div>
                        );
                      })}
                    </div>
                    {usageData.plan==='free' && isSignedIn && (
                      <div style={{fontSize:11,color:'#a78bfa',cursor:'pointer',marginTop:8}} onClick={()=>setShowPricing(true)}>
                        ⚡ Upgrade to Silver or Gold to unlock URL research →
                      </div>
                    )}
                    {scanning && (
                      <div style={S.scanStatus}>
                        <span style={S.scanDot}/>AI is researching their online presence…
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Why toggle */}
            <div style={{...S.formGroup, gridColumn:'1/-1'}}>
              <label style={S.lbl}>Options</label>
              <div style={S.toggleRow}>
                <div style={S.toggleInfo}>
                  <span style={S.toggleTitle}>Show Why This Works</span>
                  <span style={S.toggleSub}>Breakdown of hook + CTA strategy per message</span>
                </div>
                <div onClick={()=>setShowWhy(w=>!w)} style={{ position:'relative', width:44, height:24, cursor:'pointer', background: showWhy?'#7c6bff':'#1e1e28', border:`1px solid ${showWhy?'#7c6bff':'rgba(255,255,255,0.12)'}`, borderRadius:100, transition:'all .18s', flexShrink:0 }}>
                  <div style={{ position:'absolute', top:3, left: showWhy?21:3, width:16, height:16, borderRadius:'50%', background:'white', transition:'left .18s', boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }} />
                </div>
              </div>
            </div>
          </div>

          {error && <div style={S.errorBox}>{error}</div>}

          <button className="btn-gen" style={S.btnGen} onClick={generate} disabled={loading}>
            {loading ? <><span className="spinner"/>{scanning?'Researching prospect…':'Generating…'}</> : '✦ Generate'}
          </button>
        </div>

        {/* Output */}
        {results && (
          <div style={S.outputSection} ref={outputRef}>
            {results.hasProspect && <div style={S.prospectPill}>✦ Personalized using prospect research</div>}
            <div style={S.outputHeader}>
              <span style={S.outputTitle}>✦ {results.items.length} {results.isCall?'Call Scripts':'Messages'} Generated</span>
              <button className="btn-regen" style={S.btnRegen} onClick={generate}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                Regenerate
              </button>
            </div>
            {results.items.map((item,i) =>
              results.isCall
                ? <CallCard key={i} script={item} i={i} />
                : <DMCard key={i} dm={item} i={i} showWhy={showWhy} canEmail={usageData.emailSend} onEmail={()=>setEmailModal({text:item.message})} />
            )}
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div style={S.historySec}>
            <div className="history-title" style={S.historyTitle}>Recent Sessions</div>
            {history.slice(0,5).map((h,i) => (
              <div key={i} className="history-item" style={S.historyItem} onClick={()=>{
                setProduct(h.product); setAudience(h.audience);
                setGoal(h.goal); setPlatform(h.platform); setTone(h.tone);
                setResults({items:h.dms, isCall:h.platform==='Phone Call Script', hasProspect:h.urls?.length>0});
                window.scrollTo({top:0,behavior:'smooth'});
              }}>
                <div style={S.historyMeta}><strong style={{color:'#f0eff8',fontWeight:500}}>{h.product}</strong> → {h.audience} · {h.platform}</div>
                <div style={S.historyTime}>{timeAgo(h.ts)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer style={{textAlign:'center',padding:'32px 0',fontSize:12,color:'#4a4860',position:'relative',zIndex:1}}>Made with AI · Growth Flow AI</footer>

      {/* Pricing Modal */}
      {showPricing && (
        <div style={S.modalOverlay} onClick={e=>e.target===e.currentTarget&&setShowPricing(false)}>
          <div style={S.modal}>
            <button style={S.modalClose} onClick={()=>setShowPricing(false)}>×</button>
            <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:28,fontWeight:400,marginBottom:6}}>
              {isSignedIn?'Choose your plan':'Start for free'}
            </h2>
            <p style={{fontSize:14,color:'#7b7a8e'}}>Upgrade anytime. Cancel anytime.</p>
            {!isSignedIn && (
              <div style={S.signBox}>
                <p style={{fontSize:14,color:'#7b7a8e',marginTop:12}}>Sign up to get 3 free generations every month.</p>
                <div style={S.signBtns}>
                  <SignInButton mode="modal"><button style={S.btnSignGhost}>Sign in</button></SignInButton>
                  <SignUpButton mode="modal"><button style={S.btnSignPrimary}>Create free account</button></SignUpButton>
                </div>
              </div>
            )}
            <div className="pricing-grid" style={S.pricingGrid}>
              <div style={S.pricingCard}>
                <div style={S.planName}>🆓 Free</div>
                <div style={S.planPrice}>$0</div>
                <div style={S.planFeatures}><strong style={{color:'#f0eff8'}}>3</strong> generations/mo<br/>No URL research<br/>All platforms<br/>Call scripts</div>
                <button style={{...S.btnPlan,opacity:.5}} disabled>Current</button>
              </div>
              <div style={{...S.pricingCard,...S.pricingCardFeatured}}>
                <div style={S.featuredBadge}>Most Popular</div>
                <div style={S.planName}>🥈 Silver</div>
                <div style={S.planPrice}>$19<span style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,color:'#7b7a8e'}}>/mo</span></div>
                <div style={S.planFeatures}><strong style={{color:'#f0eff8'}}>50</strong> generations/mo<br/><strong style={{color:'#f0eff8'}}>1 URL</strong> research<br/>Email sending<br/>All platforms</div>
                <button style={{...S.btnPlan,...S.btnPlanAccent}} onClick={()=>{setShowPricing(false);checkout('silver')}}>Upgrade →</button>
              </div>
              <div style={S.pricingCard}>
                <div style={S.planName}>🥇 Gold</div>
                <div style={S.planPrice}>$39<span style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,color:'#7b7a8e'}}>/mo</span></div>
                <div style={S.planFeatures}><strong style={{color:'#f0eff8'}}>Unlimited</strong> generations<br/><strong style={{color:'#f0eff8'}}>All 4 URLs</strong> research<br/>Email sending<br/>Priority AI</div>
                <button style={{...S.btnPlan,...S.btnPlanAccent}} onClick={()=>{setShowPricing(false);checkout('gold')}}>Upgrade →</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Limit modal */}
      {showUpgrade && (
        <div style={S.modalOverlay} onClick={e=>e.target===e.currentTarget&&setShowUpgrade(null)}>
          <div style={S.modalSm}>
            <button style={S.modalClose} onClick={()=>setShowUpgrade(null)}>×</button>
            <div style={{fontSize:40,marginBottom:16}}>⚡</div>
            <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:26,fontWeight:400,marginBottom:10}}>Monthly limit reached</h2>
            <p style={{fontSize:14,color:'#7b7a8e',marginBottom:24}}>You've used all {usageData.limit} generations this month. Upgrade for more.</p>
            <button style={{...S.btnPlan,...S.btnPlanAccent,maxWidth:240,margin:'0 auto',display:'block',padding:'12px 24px',border:'none',borderRadius:8}}
              onClick={()=>{setShowUpgrade(null);setShowPricing(true)}}>View plans →</button>
          </div>
        </div>
      )}

      {/* Email modal */}
      {emailModal && (
        <EmailModal text={emailModal.text} onClose={()=>setEmailModal(null)} />
      )}
    </>
  );
}

// ── DM Card ───────────────────────────────────────────
function DMCard({ dm, i, showWhy, canEmail, onEmail }) {
  const [text, setText]         = useState(dm.message);
  const [feedback, setFeedback] = useState('');
  const [copied, setCopied]     = useState(false);
  const [fbLoad, setFbLoad]     = useState(false);
  const [modLoad, setModLoad]   = useState(false);
  const taRef = useRef(null);

  async function applyFeedback() {
    if (!feedback.trim() || fbLoad) return;
    setFbLoad(true);
    const r = await callAI(`Rewrite this cold DM based on feedback: "${feedback}"\n\nOriginal:\n${text}\n\nRules: Under 80 words, natural, strong hook, low-pressure CTA.\nReturn ONLY the rewritten DM text.`);
    if (r) { setText(r); setFeedback(''); if(taRef.current) taRef.current.style.height='auto'; }
    setFbLoad(false);
  }

  async function modify(mode) {
    if (modLoad) return;
    setModLoad(true);
    const instr = mode==='shorter'
      ? 'Rewrite this cold DM to be significantly shorter (under 50 words), keeping the core message and CTA.'
      : 'Rewrite this cold DM to be more direct, bold, assertive. Add urgency.';
    const r = await callAI(`${instr}\n\nOriginal:\n${text}\n\nReturn ONLY the rewritten text.`);
    if (r) setText(r);
    setModLoad(false);
  }

  function copy() {
    navigator.clipboard.writeText(text).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000); });
  }

  return (
    <div className="dm-card" style={{...S.dmCard, animationDelay:`${i*.06}s`}}>
      <div className="dm-card-top" style={S.dmCardTop}>
        <div style={S.dmAngle}><span style={S.angleDot}/>{dm.angle}</div>
        <div style={S.dmActions}>
          <button className="btn-action" style={S.btnAction} onClick={()=>modify('shorter')} disabled={modLoad}>Make shorter</button>
          <button className="btn-action" style={S.btnAction} onClick={()=>modify('aggressive')} disabled={modLoad}>More aggressive</button>
          {canEmail && <button className="btn-action" style={S.btnAction} onClick={onEmail}>✉️ Send</button>}
          <button className="btn-action" style={{...S.btnAction,...(copied?S.btnCopied:{})}} onClick={copy}>{copied?'✓ Copied':'Copy'}</button>
        </div>
      </div>
      <div style={{...S.dmText, opacity: modLoad?.4:1}}>{text}</div>
      {showWhy && (
        <div style={S.whyBox}>
          <h4 style={S.whyH4}>Why it works</h4>
          <div style={S.whyText}>
            <span style={S.whyLabel}>Hook:</span> {dm.hook_why||'—'}<br/><br/>
            <span style={S.whyLabel}>CTA:</span> {dm.cta_why||'—'}
          </div>
        </div>
      )}
      <div style={S.fbRow}>
        <textarea ref={taRef} style={S.fbInp} placeholder='Give feedback… e.g. "make it funnier", "stronger hook"' rows={1}
          value={feedback}
          onChange={e=>{setFeedback(e.target.value);e.target.style.height='auto';e.target.style.height=e.target.scrollHeight+'px'}}
          onKeyDown={e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){applyFeedback();e.preventDefault()}}}
        />
        <button style={S.btnFb} onClick={applyFeedback} disabled={fbLoad}>
          {fbLoad?<span className="fb-spinner"/>:'→'} Rewrite
        </button>
      </div>
      <div style={S.fbHint}>⌘↵ to apply feedback</div>
    </div>
  );
}

// ── Call Card ─────────────────────────────────────────
function CallCard({ script, i }) {
  const [secs, setSecs] = useState({
    opener: script.opener, pattern_interrupt: script.pattern_interrupt,
    value_pitch: script.value_pitch, objection: script.objection, close: script.close,
  });
  const [feedback, setFeedback] = useState('');
  const [copied, setCopied]     = useState(false);
  const [fbLoad, setFbLoad]     = useState(false);
  const taRef = useRef(null);

  const dur = parseInt(script.duration)||45;
  const durStr = dur>=60?`${Math.floor(dur/60)}m ${dur%60}s`:`${dur}s`;

  async function applyFeedback() {
    if (!feedback.trim()||fbLoad) return;
    setFbLoad(true);
    const current = Object.entries(secs).map(([k,v])=>`[${k}]\n${v}`).join('\n\n');
    const raw = await callAI(`Rewrite this call script based on feedback: "${feedback}"\n\nCurrent:\n${current}\n\nRespond ONLY with valid JSON with keys: opener,pattern_interrupt,value_pitch,objection,close. No markdown.`);
    try {
      const updated = JSON.parse((raw||'').replace(/```json|```/g,'').trim());
      setSecs(s=>({...s,...updated}));
      setFeedback('');
      if(taRef.current) taRef.current.style.height='auto';
    } catch {}
    setFbLoad(false);
  }

  function copy() {
    const text = Object.entries(secs).map(([k,v])=>`[${k.toUpperCase()}]\n${v}`).join('\n\n');
    navigator.clipboard.writeText(text).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000); });
  }

  const secColors = { opener:'#7c6bff', pattern_interrupt:'#7c6bff', value_pitch:'#7c6bff', objection:'#fbbf24', close:'#34d399' };
  const secLabels = { opener:'Opener', pattern_interrupt:'Pattern Interrupt', value_pitch:'Value Pitch', objection:'Handle Objection', close:'Close' };

  return (
    <div className="call-card" style={{...S.callCard, animationDelay:`${i*.07}s`}}>
      <div style={S.callCardTop}>
        <div style={S.callBadge}>📞 {script.angle}</div>
        <div style={S.dmActions}>
          <button className="btn-action" style={{...S.btnAction,...(copied?S.btnCopied:{})}} onClick={copy}>{copied?'✓ Copied':'Copy Script'}</button>
        </div>
      </div>
      {Object.entries(secs).map(([key,val])=>(
        <div key={key} style={S.callSec}>
          <div className="call-sec-label" style={{...S.callSecLabel, display:'flex'}}>{secLabels[key]}</div>
          <div style={{...S.callSecText, borderLeftColor: secColors[key]}}>{val}</div>
        </div>
      ))}
      <div style={S.callDur}>🕐 Estimated call: ~{durStr}</div>
      <div style={S.fbRow}>
        <textarea ref={taRef} style={S.fbInp} placeholder='Give feedback… e.g. "softer opener", "stronger close"' rows={1}
          value={feedback}
          onChange={e=>{setFeedback(e.target.value);e.target.style.height='auto';e.target.style.height=e.target.scrollHeight+'px'}}
          onKeyDown={e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){applyFeedback();e.preventDefault()}}}
        />
        <button style={S.btnFb} onClick={applyFeedback} disabled={fbLoad}>
          {fbLoad?<span className="fb-spinner"/>:'→'} Rewrite
        </button>
      </div>
      <div style={S.fbHint}>⌘↵ to apply feedback</div>
    </div>
  );
}

// ── Email Modal ───────────────────────────────────────
function EmailModal({ text, onClose }) {
  const [to, setTo]         = useState('');
  const [from, setFrom]     = useState('');
  const [subject, setSubject] = useState('');
  const [status, setStatus] = useState(null); // { type, msg }
  const [sending, setSending] = useState(false);

  async function send() {
    if (!to||!from) { setStatus({type:'error',msg:'Please fill in both email fields.'}); return; }
    setSending(true); setStatus(null);
    try {
      const res = await fetch('/api/send-email', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ to, from, subject: subject||'Quick question', body: text }),
      });
      const data = await res.json();
      if (!res.ok) setStatus({type:'error',msg:data.error||'Failed to send.'});
      else { setStatus({type:'success',msg:`✓ Sent! Replies go to ${from}`}); setTo(''); }
    } catch { setStatus({type:'error',msg:'Connection error.'}); }
    finally { setSending(false); }
  }

  return (
    <div style={S.modalOverlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{...S.modal, maxWidth:460}}>
        <button style={S.modalClose} onClick={onClose}>×</button>
        <h2 style={{fontFamily:"'Instrument Serif',serif",fontSize:22,fontWeight:400,marginBottom:6}}>✉️ Send this Email</h2>
        <p style={{fontSize:13,color:'#7b7a8e',marginBottom:20}}>Replies go directly to your email.</p>
        <div style={S.emailPreview}>{text}</div>
        <div style={S.emailFields}>
          <div style={S.emailField}>
            <label style={S.emailLbl}>Recipient Email</label>
            <input style={S.emailInp} type="email" placeholder="their@email.com" value={to} onChange={e=>setTo(e.target.value)} />
          </div>
          <div style={S.emailField}>
            <label style={S.emailLbl}>Your Email (replies come here)</label>
            <input style={S.emailInp} type="email" placeholder="you@youremail.com" value={from} onChange={e=>setFrom(e.target.value)} />
          </div>
          <div style={S.emailField}>
            <label style={S.emailLbl}>Subject Line</label>
            <input style={S.emailInp} type="text" placeholder="Quick question about your business…" value={subject} onChange={e=>setSubject(e.target.value)} />
          </div>
        </div>
        <button style={{...S.btnSend,opacity:sending?.6:1,cursor:sending?'not-allowed':'pointer'}} onClick={send} disabled={sending}>
          {sending?<span className="spinner"/>:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>}
          {sending?'Sending…':'Send Email'}
        </button>
        {status && <div style={status.type==='success'?S.sendSuccess:S.sendError}>{status.msg}</div>}
        <div style={{height:1,background:'rgba(255,255,255,0.07)',margin:'16px 0'}} />
        <div style={{fontSize:11,color:'#4a4860',textAlign:'center'}}>Powered by Resend · Sends from noreply@growthflowai.app</div>
      </div>
    </div>
  );
}

// ── AI helper (modify/feedback use this) ──────────────
async function callAI(prompt) {
  try {
    const res = await fetch('/api/generate', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:400, messages:[{role:'user',content:prompt}], _urlCount:0 }),
    });
    const data = await res.json();
    return (data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('').trim();
  } catch { return null; }
}

function timeAgo(ts) {
  const m=Math.floor((Date.now()-ts)/60000);
  if(m<1) return 'just now'; if(m<60) return `${m}m ago`;
  const h=Math.floor(m/60); if(h<24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}
