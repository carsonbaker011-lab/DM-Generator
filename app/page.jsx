'use client';
import { useEffect, useState, useRef } from 'react';
import { useUser, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';

const PLANS = {
  free:   { name: 'Free',   price: 0,  limit: 3,       maxUrls: 0, emailSend: false },
  silver: { name: 'Silver', price: 19, limit: 50,       maxUrls: 1, emailSend: true  },
  gold:   { name: 'Gold',   price: 39, limit: Infinity, maxUrls: 4, emailSend: true  },
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
  const [showPricing, setShowPricing] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [emailModal, setEmailModal]   = useState(null);
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
Each object must have: angle, duration (number in seconds), opener, pattern_interrupt, value_pitch, objection, close.
Respond ONLY with a valid JSON array. No preamble, no markdown, no backticks.`
      : `You are an expert cold outreach copywriter. Write 5 high-converting cold messages for:
- Product/Service: ${product}
- Target Audience: ${audience}
- Goal: ${goal}
- Platform: ${platform}
- Tone: ${tone}${urlContext}
${activeUrls.length ? 'Personalize with specific details from researching the URLs.' : ''}
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
        if (data.limitReached) setShowUpgrade(true);
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
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      setScanning(false);
    }
  }

  async function checkout(plan) {
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {}
  }

  async function openPortal() {
    try {
      const res = await fetch('/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || 'Could not open portal.');
    } catch {}
  }

  const planBadgeClass = `plan-badge plan-${usageData.plan}`;
  const planEmoji = usageData.plan === 'gold' ? '🥇' : usageData.plan === 'silver' ? '🥈' : '🆓';

  return (
    <>
      <div className="bg-grid" />
      <div className="bg-orb1" />
      <div className="bg-orb2" />

      <div className="app">
        <div className="header-wrap">
          <div className="header-top">
            <div className="badge">
              <span className="badge-dot" />
              AI-Powered Outreach
            </div>
            <div className="nav">
              {isSignedIn ? (
                <>
                  <div className={planBadgeClass}>{planEmoji} {PLANS[usageData.plan]?.name}</div>
                  {(usageData.plan === 'silver' || usageData.plan === 'gold') && (
                    <button className="btn-nav" onClick={openPortal}>Manage Plan</button>
                  )}
                  <button className="btn-nav" onClick={() => setShowPricing(true)}>Upgrade</button>
                  <UserButton afterSignOutUrl="/" />
                </>
              ) : (
                <>
                  <SignInButton mode="modal"><button className="btn-nav">Sign in</button></SignInButton>
                  <SignUpButton mode="modal"><button className="btn-nav btn-nav-accent">Get started free</button></SignUpButton>
                </>
              )}
            </div>
          </div>
          <h1 className="site-title">Growth Flow AI</h1>
          <p className="subtitle">AI messages that actually get replies</p>
        </div>

        {isSignedIn && (
          <div className="usage-wrap">
            <div className="usage-row">
              <span>{usageData.usage} / {usageData.limit === Infinity ? '∞' : usageData.limit} generations this month</span>
              <span>{PLANS[usageData.plan]?.name} plan</span>
            </div>
            <div className="usage-track">
              <div className="usage-fill" style={{ width: `${usagePct}%` }} />
            </div>
          </div>
        )}

        <div className="card">
          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Product / Service</label>
              <input value={product} onChange={e=>setProduct(e.target.value)} placeholder="e.g. SaaS tool for freelancers, coaching program..." />
            </div>
            <div className="form-group full">
              <label className="form-label">Target Audience</label>
              <input value={audience} onChange={e=>setAudience(e.target.value)} placeholder="e.g. e-commerce founders, fitness coaches..." />
            </div>
            <div className="form-group">
              <label className="form-label">Goal</label>
              <select value={goal} onChange={e=>setGoal(e.target.value)}>
                <option>Book a call</option>
                <option>Sell a product</option>
                <option>Get a reply</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Platform</label>
              <select value={platform} onChange={e=>setPlatform(e.target.value)}>
                <option>Instagram DM</option>
                <option>Email</option>
                <option>LinkedIn</option>
                <option value="Phone Call Script">📞 Phone Call Script</option>
              </select>
            </div>
            <div className="form-group full">
              <label className="form-label">Tone <span className="label-opt">(optional)</span></label>
              <select value={tone} onChange={e=>setTone(e.target.value)}>
                <option>Friendly</option><option>Direct</option><option>Casual</option><option>Professional</option>
              </select>
            </div>

            <div className="form-group full">
              <label className="form-label">Prospect URLs <span className="label-opt">(optional)</span></label>
              <div className="url-section">
                <div className="url-header" onClick={() => setUrlOpen(o=>!o)}>
                  <div className="url-label">
                    🔍 Paste links to personalize messages
                    <span className="url-badge">AI Research</span>
                  </div>
                  <span className={`url-chevron${urlOpen?' open':''}`}>▾</span>
                </div>
                {urlOpen && (
                  <div className="url-body">
                    <div className="url-platforms">
                      {['🌐 Website','📍 Google Maps','📸 Instagram','🎵 TikTok'].map(p=>(
                        <div key={p} className="url-tag">{p}</div>
                      ))}
                    </div>
                    <div className="url-inputs">
                      {[
                        {key:'website',icon:'🌐',ph:'https://theirwebsite.com'},
                        {key:'maps',icon:'📍',ph:'https://maps.google.com/...'},
                        {key:'insta',icon:'📸',ph:'https://instagram.com/username'},
                        {key:'tiktok',icon:'🎵',ph:'https://tiktok.com/@username'},
                      ].map(({key,icon,ph},idx) => {
                        const locked = (usageData.plan==='free'&&isSignedIn)||(usageData.plan==='silver'&&idx>=1);
                        return (
                          <div key={key} className="url-row">
                            <span className="url-icon">{icon}</span>
                            <input
                              type="url"
                              className="url-inp"
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
                      <div className="url-upgrade" onClick={()=>setShowPricing(true)}>
                        ⚡ Upgrade to Silver or Gold to unlock URL research →
                      </div>
                    )}
                    {scanning && (
                      <div className="scan-status">
                        <span className="scan-dot" /> AI is researching their online presence…
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group full">
              <label className="form-label">Options</label>
              <div className="toggle-row">
                <div className="toggle-info">
                  <span className="toggle-title">Show Why This Works</span>
                  <span className="toggle-sub">Breakdown of hook + CTA strategy per message</span>
                </div>
                <div className={`toggle-sw${showWhy?' on':''}`} onClick={()=>setShowWhy(w=>!w)} />
              </div>
            </div>
          </div>

          {error && <div className="error-box">{error}</div>}
          <button className="btn-gen" onClick={generate} disabled={loading}>
            {loading ? <><span className="spinner" />{scanning?'Researching prospect…':'Generating…'}</> : '✦ Generate'}
          </button>
        </div>

        {results && (
          <div className="output-section" ref={outputRef}>
            {results.hasProspect && <div className="prospect-pill">✦ Personalized using prospect research</div>}
            <div className="output-header">
              <span className="output-title">✦ {results.items.length} {results.isCall?'Call Scripts':'Messages'} Generated</span>
              <button className="btn-regen" onClick={generate}>
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

        {history.length > 0 && (
          <div className="history-sec">
            <div className="history-title">Recent Sessions</div>
            {history.slice(0,5).map((h,i) => (
              <div key={i} className="history-item" onClick={()=>{
                setProduct(h.product); setAudience(h.audience);
                setGoal(h.goal); setPlatform(h.platform); setTone(h.tone);
                setResults({items:h.dms, isCall:h.platform==='Phone Call Script', hasProspect:h.urls?.length>0});
                window.scrollTo({top:0,behavior:'smooth'});
              }}>
                <div className="history-meta"><strong>{h.product}</strong> → {h.audience} · {h.platform}</div>
                <div className="history-time">{timeAgo(h.ts)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer>Made with AI · Growth Flow AI</footer>

      {showPricing && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowPricing(false)}>
          <div className="modal">
            <button className="modal-close" onClick={()=>setShowPricing(false)}>×</button>
            <h2 className="modal-h2">{isSignedIn?'Choose your plan':'Start for free'}</h2>
            <p className="modal-p">Upgrade anytime. Cancel anytime.</p>
            {!isSignedIn && (
              <div>
                <p style={{fontSize:14,color:'var(--text-muted)',marginTop:12}}>Sign up to get 3 free generations every month.</p>
                <div className="sign-btns">
                  <SignInButton mode="modal"><button className="btn-sign-ghost">Sign in</button></SignInButton>
                  <SignUpButton mode="modal"><button className="btn-sign-primary">Create free account</button></SignUpButton>
                </div>
              </div>
            )}
            <div className="pricing-grid">
              <div className="pricing-card">
                <div className="plan-name">🆓 Free</div>
                <div className="plan-price">$0</div>
                <div className="plan-features"><strong>3</strong> generations/mo<br/>No URL research<br/>All platforms<br/>Call scripts</div>
                <button className="btn-plan" disabled style={{opacity:.5}}>Current</button>
              </div>
              <div className="pricing-card pricing-featured">
                <div className="featured-badge">Most Popular</div>
                <div className="plan-name">🥈 Silver</div>
                <div className="plan-price">$19<span>/mo</span></div>
                <div className="plan-features"><strong>50</strong> generations/mo<br/><strong>1 URL</strong> research<br/>Email sending<br/>All platforms</div>
                <button className="btn-plan btn-plan-accent" onClick={()=>{setShowPricing(false);checkout('silver')}}>Upgrade →</button>
              </div>
              <div className="pricing-card">
                <div className="plan-name">🥇 Gold</div>
                <div className="plan-price">$39<span>/mo</span></div>
                <div className="plan-features"><strong>Unlimited</strong> generations<br/><strong>All 4 URLs</strong> research<br/>Email sending<br/>Priority AI</div>
                <button className="btn-plan btn-plan-accent" onClick={()=>{setShowPricing(false);checkout('gold')}}>Upgrade →</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUpgrade && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowUpgrade(false)}>
          <div className="modal-sm">
            <button className="modal-close" onClick={()=>setShowUpgrade(false)}>×</button>
            <div style={{fontSize:40,marginBottom:16}}>⚡</div>
            <h2 className="modal-h2" style={{fontSize:26}}>Monthly limit reached</h2>
            <p className="modal-p" style={{marginBottom:24}}>You have used all {usageData.limit} generations this month. Upgrade for more.</p>
            <button className="btn-plan btn-plan-accent" style={{maxWidth:240,margin:'0 auto',display:'block',padding:'12px 24px',border:'none',borderRadius:8}}
              onClick={()=>{setShowUpgrade(false);setShowPricing(true)}}>View plans →</button>
          </div>
        </div>
      )}

      {emailModal && <EmailModal text={emailModal.text} onClose={()=>setEmailModal(null)} />}
    </>
  );
}

function DMCard({ dm, i, showWhy, canEmail, onEmail }) {
  const [text, setText]         = useState(dm.message);
  const [feedback, setFeedback] = useState('');
  const [copied, setCopied]     = useState(false);
  const [fbLoad, setFbLoad]     = useState(false);
  const [modLoad, setModLoad]   = useState(false);
  const taRef = useRef(null);

  async function applyFeedback() {
    if (!feedback.trim()||fbLoad) return;
    setFbLoad(true);
    const r = await callAI(`Rewrite this cold DM based on feedback: "${feedback}"\n\nOriginal:\n${text}\n\nReturn ONLY the rewritten DM text.`);
    if (r) { setText(r); setFeedback(''); if(taRef.current) taRef.current.style.height='auto'; }
    setFbLoad(false);
  }

  async function modify(mode) {
    if (modLoad) return;
    setModLoad(true);
    const instr = mode==='shorter'
      ? 'Rewrite this cold DM to be significantly shorter (under 50 words).'
      : 'Rewrite this cold DM to be more direct, bold, assertive.';
    const r = await callAI(`${instr}\n\nOriginal:\n${text}\n\nReturn ONLY the rewritten text.`);
    if (r) setText(r);
    setModLoad(false);
  }

  return (
    <div className="dm-card" style={{animationDelay:`${i*.06}s`}}>
      <div className="dm-card-top">
        <div className="dm-angle"><span className="angle-dot" />{dm.angle}</div>
        <div className="dm-actions">
          <button className="btn-action" onClick={()=>modify('shorter')} disabled={modLoad}>Make shorter</button>
          <button className="btn-action" onClick={()=>modify('aggressive')} disabled={modLoad}>More aggressive</button>
          {canEmail && <button className="btn-action" onClick={onEmail}>✉️ Send</button>}
          <button className={`btn-action${copied?' btn-copied':''}`} onClick={()=>{
            navigator.clipboard.writeText(text).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000); });
          }}>{copied?'✓ Copied':'Copy'}</button>
        </div>
      </div>
      <div className="dm-text" style={{opacity:modLoad?0.4:1}}>{text}</div>
      {showWhy && (
        <div className="why-box">
          <h4 className="why-h4">Why it works</h4>
          <div className="why-text">
            <span className="why-label">Hook:</span> {dm.hook_why||'—'}<br/><br/>
            <span className="why-label">CTA:</span> {dm.cta_why||'—'}
          </div>
        </div>
      )}
      <div className="fb-row">
        <textarea ref={taRef} className="fb-inp" placeholder='Give feedback… e.g. "make it funnier"' rows={1}
          value={feedback}
          onChange={e=>{setFeedback(e.target.value);e.target.style.height='auto';e.target.style.height=e.target.scrollHeight+'px'}}
          onKeyDown={e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){applyFeedback();e.preventDefault()}}}
        />
        <button className="btn-fb" onClick={applyFeedback} disabled={fbLoad}>
          {fbLoad?<span className="fb-spinner"/>:'→'} Rewrite
        </button>
      </div>
      <div className="fb-hint">⌘↵ to apply feedback</div>
    </div>
  );
}

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
  const secLabels = { opener:'Opener', pattern_interrupt:'Pattern Interrupt', value_pitch:'Value Pitch', objection:'Handle Objection', close:'Close' };
  const secClass  = { opener:'', pattern_interrupt:'', value_pitch:'', objection:'call-obj', close:'call-cls' };

  async function applyFeedback() {
    if (!feedback.trim()||fbLoad) return;
    setFbLoad(true);
    const current = Object.entries(secs).map(([k,v])=>`[${k}]\n${v}`).join('\n\n');
    const raw = await callAI(`Rewrite this call script based on feedback: "${feedback}"\n\nCurrent:\n${current}\n\nRespond ONLY with valid JSON: opener,pattern_interrupt,value_pitch,objection,close.`);
    try { const u=JSON.parse((raw||'').replace(/```json|```/g,'').trim()); setSecs(s=>({...s,...u})); setFeedback(''); } catch {}
    setFbLoad(false);
  }

  return (
    <div className="call-card" style={{animationDelay:`${i*.07}s`}}>
      <div className="call-card-top">
        <div className="call-badge">📞 {script.angle}</div>
        <button className={`btn-action${copied?' btn-copied':''}`} onClick={()=>{
          const t=Object.entries(secs).map(([k,v])=>`[${k.toUpperCase()}]\n${v}`).join('\n\n');
          navigator.clipboard.writeText(t).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000); });
        }}>{copied?'✓ Copied':'Copy Script'}</button>
      </div>
      {Object.entries(secs).map(([key,val])=>(
        <div key={key} className="call-sec">
          <div className="call-sec-label">{secLabels[key]}</div>
          <div className={`call-sec-text${secClass[key]?' '+secClass[key]:''}`}>{val}</div>
        </div>
      ))}
      <div className="call-dur">🕐 Estimated call: ~{durStr}</div>
      <div className="fb-row">
        <textarea ref={taRef} className="fb-inp" placeholder='Give feedback… e.g. "softer opener"' rows={1}
          value={feedback}
          onChange={e=>{setFeedback(e.target.value);e.target.style.height='auto';e.target.style.height=e.target.scrollHeight+'px'}}
          onKeyDown={e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){applyFeedback();e.preventDefault()}}}
        />
        <button className="btn-fb" onClick={applyFeedback} disabled={fbLoad}>
          {fbLoad?<span className="fb-spinner"/>:'→'} Rewrite
        </button>
      </div>
      <div className="fb-hint">⌘↵ to apply feedback</div>
    </div>
  );
}

function EmailModal({ text, onClose }) {
  const [to, setTo]           = useState('');
  const [from, setFrom]       = useState('');
  const [subject, setSubject] = useState('');
  const [status, setStatus]   = useState(null);
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
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:460}}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2 className="modal-h2" style={{fontSize:22}}>✉️ Send this Email</h2>
        <p className="modal-p" style={{marginBottom:20}}>Replies go directly to your email.</p>
        <div className="email-preview">{text}</div>
        <div className="email-fields">
          <div className="email-field">
            <label className="email-lbl">Recipient Email</label>
            <input type="email" placeholder="their@email.com" value={to} onChange={e=>setTo(e.target.value)} />
          </div>
          <div className="email-field">
            <label className="email-lbl">Your Email (replies come here)</label>
            <input type="email" placeholder="you@youremail.com" value={from} onChange={e=>setFrom(e.target.value)} />
          </div>
          <div className="email-field">
            <label className="email-lbl">Subject Line</label>
            <input type="text" placeholder="Quick question about your business…" value={subject} onChange={e=>setSubject(e.target.value)} />
          </div>
        </div>
        <button className="btn-send" onClick={send} disabled={sending}>
          {sending?<span className="spinner"/>:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>}
          {sending?'Sending…':'Send Email'}
        </button>
        {status && <div className={status.type==='success'?'send-success':'send-error'}>{status.msg}</div>}
        <div className="modal-divider" />
        <div className="modal-hint">Powered by Resend · Sends from noreply@growthflowai.app</div>
      </div>
    </div>
  );
}

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
