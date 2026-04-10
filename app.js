
// ── State ──────────────────────────────────────────────
let showWhy = false;
let isLoading = false;
let history = JSON.parse(localStorage.getItem('dm_history') || '[]');

// ── Toggle Why ────────────────────────────────────────
function toggleWhy() {
  showWhy = !showWhy;
  const sw = document.getElementById('whyToggle');
  sw.classList.toggle('on', showWhy);
  document.querySelectorAll('.why-box').forEach(b => b.classList.toggle('visible', showWhy));
}

// ── URL Section Toggle ────────────────────────────────
function toggleUrlSection() {
  const body = document.getElementById('urlBody');
  const chevron = document.getElementById('urlChevron');
  body.classList.toggle('open');
  chevron.classList.toggle('open');
}

// ── Collect URLs ──────────────────────────────────────
function collectUrls() {
  return [
    document.getElementById('urlWebsite')?.value.trim(),
    document.getElementById('urlMaps')?.value.trim(),
    document.getElementById('urlInsta')?.value.trim(),
    document.getElementById('urlTiktok')?.value.trim(),
  ].filter(Boolean);
}

// ── Generate ──────────────────────────────────────────
async function generate() {
  if (isLoading) return;

  const product  = document.getElementById('product').value.trim();
  const audience = document.getElementById('audience').value.trim();
  const goal     = document.getElementById('goal').value;
  const platform = document.getElementById('platform').value;
  const tone     = document.getElementById('tone').value;
  const urls     = collectUrls();
  const isCallScript = platform === 'Phone Call Script';

  if (!product || !audience) {
    showError('Please fill in Product/Service and Target Audience.');
    return;
  }
  hideError();

  isLoading = true;
  const btn = document.getElementById('genBtn');
  btn.disabled = true;

  // Show scan status if URLs provided
  if (urls.length > 0) {
    document.getElementById('urlBody').classList.add('open');
    document.getElementById('urlChevron').classList.add('open');
    document.getElementById('scanStatus').classList.add('visible');
    btn.innerHTML = '<span class="spinner"></span> Researching prospect…';
  } else {
    btn.innerHTML = '<span class="spinner"></span> Generating…';
  }

  const urlContext = urls.length > 0
    ? `\n\nProspect URLs to research (use web search to gather intel — business name, niche, recent posts, reviews, services, personality, pain points):\n${urls.map((u,i) => `${i+1}. ${u}`).join('\n')}`
    : '';

  const isCall = isCallScript;

  const prompt = isCall
    ? `You are an elite sales coach who writes phone call scripts that book meetings.

Write 3 cold call scripts for:
- Product/Service: ${product}
- Target Audience: ${audience}
- Goal: ${goal}
- Tone: ${tone}${urlContext}

${urls.length > 0 ? 'IMPORTANT: Use what you find from researching the URLs to personalize each script with specific details about the prospect — their business name, recent activity, services, or pain points you identify.' : ''}

Each script must include these exact sections:
1. opener: Natural cold call opener (10-15 words, not "how are you?")
2. pattern_interrupt: Something unexpected that makes them stop and listen
3. value_pitch: Their problem → your solution (2-3 sentences max)
4. objection: Handle "I'm not interested" or "send me an email"
5. close: The ask — specific, low pressure, time-bounded

Respond ONLY with a valid JSON array. No preamble, no markdown, no backticks. Each object:
{
  "angle": "short label e.g. 'pain-first' or 'curiosity'",
  "duration": "estimated call duration in seconds e.g. 45",
  "opener": "...",
  "pattern_interrupt": "...",
  "value_pitch": "...",
  "objection": "...",
  "close": "..."
}`
    : `You are an expert copywriter specializing in cold outreach that gets replies.

Write 5 high-converting cold messages for:
- Product/Service: ${product}
- Target Audience: ${audience}
- Goal: ${goal}
- Platform: ${platform}
- Tone: ${tone}${urlContext}

${urls.length > 0 ? 'IMPORTANT: Use what you find from researching the URLs to personalize each message with specific details — mention their business name, a recent post, a specific service, a review they got, or a pain point you notice.' : ''}

Rules:
- Under 80 words each
- Strong first-line hook using real details if available
- No spam language, feels natural and human
- Focus on recipient's problem
- Low-pressure CTA

Respond ONLY with a valid JSON array. No preamble, no markdown, no backticks. Each object:
{
  "angle": "short label e.g. 'curiosity' or 'value-first'",
  "message": "the DM text",
  "hook_why": "why the first line works",
  "cta_why": "why the CTA works"
}`;

  try {
    const body = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    };
    // Attach web_search only when URLs provided
    if (urls.length > 0) {
      body.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
    }

    const res  = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    // Extract text blocks (ignore tool_use / tool_result blocks)
    const rawText = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    let results;
    try {
      const clean = rawText.replace(/```json|```/g, '').trim();
      results = JSON.parse(clean);
    } catch {
      const match = rawText.match(/\[[\s\S]*\]/);
      if (match) results = JSON.parse(match[0]);
      else throw new Error('Could not parse response');
    }

    // Build prospect summary from URLs
    const prospectInfo = urls.length > 0 ? urls.join(', ') : null;

    // Save history
    const entry = { product, audience, goal, platform, tone, urls, dms: results, ts: Date.now() };
    history.unshift(entry);
    if (history.length > 10) history = history.slice(0, 10);
    localStorage.setItem('dm_history', JSON.stringify(history));

    renderOutput(results, product, audience, goal, platform, tone, isCall, prospectInfo);
    renderHistory();

  } catch (err) {
    console.error(err);
    showError('Something went wrong. Please check your connection and try again.');
  } finally {
    isLoading = false;
    btn.disabled = false;
    btn.innerHTML = '✦ Generate';
    document.getElementById('scanStatus').classList.remove('visible');
  }
}

// ── Render Output ─────────────────────────────────────
function renderOutput(results, product, audience, goal, platform, tone, isCall, prospectInfo) {
  const out = document.getElementById('output');
  out.style.display = 'block';
  const label = isCall ? 'Call Scripts' : 'Messages';
  const prospectPill = prospectInfo ? `
    <div class="prospect-pill">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      Personalized using prospect research
    </div>` : '';

  out.innerHTML = `
    ${prospectPill}
    <div class="output-header">
      <span class="output-title">✦ ${results.length} ${label} Generated</span>
      <button class="btn-regen" onclick="generate()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
        Regenerate
      </button>
    </div>
    ${results.map((r, i) => isCall ? renderCallCard(r, i) : renderDMCard(r, i)).join('')}
  `;
  out.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Render Call Script Card ───────────────────────────
function renderCallCard(script, i) {
  const id = `call_${i}_${Date.now()}`;
  const dur = parseInt(script.duration) || 45;
  const mins = Math.floor(dur / 60);
  const secs = dur % 60;
  const durStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  const fullScript = [
    `[OPENER]\n${script.opener}`,
    `[PATTERN INTERRUPT]\n${script.pattern_interrupt}`,
    `[VALUE PITCH]\n${script.value_pitch}`,
    `[OBJECTION HANDLE]\n${script.objection}`,
    `[CLOSE]\n${script.close}`
  ].join('\n\n');

  return `
    <div class="call-card" style="animation-delay:${i * 0.07}s">
      <div class="call-card-top">
        <div class="call-badge">📞 ${escapeHtml(script.angle)}</div>
        <div class="dm-actions">
          <button class="btn-action btn-copy" id="copy_${id}" onclick="copyText('${id}', \`${fullScript.replace(/`/g,'\\`')}\`)">Copy Script</button>
        </div>
      </div>

      <div class="call-section">
        <div class="call-section-label">Opener</div>
        <div class="call-section-text">${escapeHtml(script.opener || '')}</div>
      </div>
      <div class="call-section">
        <div class="call-section-label">Pattern Interrupt</div>
        <div class="call-section-text">${escapeHtml(script.pattern_interrupt || '')}</div>
      </div>
      <div class="call-section">
        <div class="call-section-label">Value Pitch</div>
        <div class="call-section-text">${escapeHtml(script.value_pitch || '')}</div>
      </div>
      <div class="call-section">
        <div class="call-section-label">Handle Objection</div>
        <div class="call-section-text call-objection">${escapeHtml(script.objection || '')}</div>
      </div>
      <div class="call-section">
        <div class="call-section-label">Close</div>
        <div class="call-section-text call-close">${escapeHtml(script.close || '')}</div>
      </div>

      <div class="call-duration">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Estimated call: ~${durStr}
      </div>

      <div class="feedback-row">
        <textarea class="feedback-input" id="fb_${id}" placeholder='Give feedback… e.g. "make the opener softer", "stronger close", "add FOMO"' rows="1"
          onkeydown="if((event.metaKey||event.ctrlKey)&&event.key==='Enter'){feedbackCall('${id}');event.preventDefault();}"
          oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"></textarea>
        <button class="btn-feedback" id="fbBtn_${id}" onclick="feedbackCall('${id}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          Rewrite
        </button>
      </div>
      <div class="feedback-hint">⌘↵ to apply feedback</div>
    </div>
  `;
}

function renderDMCard(dm, i) {
  const id = `dm_${i}_${Date.now()}`;
  return `
    <div class="dm-card stagger-${i + 1}" style="animation-delay:${i * 0.06}s" id="card_${id}">
      <div class="dm-card-top">
        <div class="dm-angle"><span class="angle-dot"></span>${escapeHtml(dm.angle)}</div>
        <div class="dm-actions">
          <button class="btn-action" onclick="modifyDM('${id}', 'shorter')">Make shorter</button>
          <button class="btn-action" onclick="modifyDM('${id}', 'aggressive')">More aggressive</button>
          <button class="btn-action" onclick="openEmailModal('${id}')">✉️ Send</button>
          <button class="btn-action btn-copy" id="copy_${id}" onclick="copyDM('${id}')">Copy</button>
        </div>
      </div>
      <div class="dm-text" id="text_${id}">${escapeHtml(dm.message)}</div>
      <div class="why-box ${showWhy ? 'visible' : ''}" id="why_${id}">
        <h4>Why it works</h4>
        <div class="why-text">
          <span class="why-label">Hook:</span> ${escapeHtml(dm.hook_why || '—')}<br><br>
          <span class="why-label">CTA:</span> ${escapeHtml(dm.cta_why || '—')}
        </div>
      </div>
      <div class="feedback-row">
        <textarea class="feedback-input" id="fb_${id}" placeholder="Give feedback… e.g. "make it funnier", "use a question hook", "reference their podcast"" rows="1"
          onkeydown="if((event.metaKey||event.ctrlKey)&&event.key==='Enter'){feedbackDM('${id}');event.preventDefault();}"
          oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"></textarea>
        <button class="btn-feedback" id="fbBtn_${id}" onclick="feedbackDM('${id}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          Rewrite
        </button>
      </div>
      <div class="feedback-hint">⌘↵ to apply feedback</div>
    </div>
  `;
}

// ── Feedback Rewrite ──────────────────────────────────
async function feedbackDM(id) {
  const textEl = document.getElementById('text_' + id);
  const fbInput = document.getElementById('fb_' + id);
  const fbBtn = document.getElementById('fbBtn_' + id);
  if (!textEl || !fbInput) return;

  const feedback = fbInput.value.trim();
  if (!feedback) { fbInput.focus(); return; }

  const original = textEl.innerText;
  textEl.style.opacity = '0.4';
  fbBtn.disabled = true;
  fbBtn.innerHTML = '<span class="fb-spinner"></span>';

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `You are an expert cold outreach copywriter. Rewrite the following cold DM based on this feedback: "${feedback}"\n\nOriginal DM:\n${original}\n\nRules: Keep it under 80 words. Natural and human. Strong hook. Low-pressure CTA.\n\nReturn ONLY the rewritten DM text. No labels, no explanation, nothing else.`
        }]
      })
    });
    const data = await res.json();
    const newText = data.content?.map(b => b.text || '').join('').trim();
    if (newText) {
      textEl.style.opacity = '0';
      setTimeout(() => {
        textEl.textContent = newText;
        textEl.style.transition = 'opacity 0.3s';
        textEl.style.opacity = '1';
      }, 120);
      fbInput.value = '';
      fbInput.style.height = 'auto';
    }
  } catch (err) {
    console.error(err);
  } finally {
    fbBtn.disabled = false;
    fbBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg> Rewrite`;
    textEl.style.opacity = '1';
  }
}

// ── Copy ──────────────────────────────────────────────
function copyDM(id) {
  copyText(id, document.getElementById('text_' + id)?.innerText || '');
}
function copyText(id, text) {
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copy_' + id);
    if (!btn) return;
    const orig = btn.textContent;
    btn.textContent = '✓ Copied';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 2000);
  });
}

// ── Feedback Call Script Rewrite ──────────────────────
async function feedbackCall(id) {
  const fbInput = document.getElementById('fb_' + id);
  const fbBtn   = document.getElementById('fbBtn_' + id);
  const card    = document.getElementById('fbBtn_' + id)?.closest('.call-card');
  if (!fbInput || !card) return;

  const feedback = fbInput.value.trim();
  if (!feedback) { fbInput.focus(); return; }

  // Grab existing script text
  const sections = card.querySelectorAll('.call-section-text');
  const currentScript = Array.from(sections).map(s => s.innerText).join('\n\n');

  card.style.opacity = '0.5';
  fbBtn.disabled = true;
  fbBtn.innerHTML = '<span class="fb-spinner"></span>';

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `You are an elite sales call script writer. Rewrite the following phone call script based on this feedback: "${feedback}"\n\nCurrent script:\n${currentScript}\n\nRespond ONLY with a valid JSON object with these keys: opener, pattern_interrupt, value_pitch, objection, close. Nothing else.`
        }]
      })
    });
    const data = await res.json();
    const raw = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
    const clean = raw.replace(/```json|```/g, '').trim();
    const updated = JSON.parse(clean);

    // Update each section in-place
    const labels = ['opener','pattern_interrupt','value_pitch','objection','close'];
    labels.forEach((key, idx) => {
      if (updated[key] && sections[idx]) {
        sections[idx].style.opacity = '0';
        setTimeout(() => {
          sections[idx].textContent = updated[key];
          sections[idx].style.transition = 'opacity 0.3s';
          sections[idx].style.opacity = '1';
        }, 120);
      }
    });

    fbInput.value = '';
    fbInput.style.height = 'auto';
  } catch (err) {
    console.error(err);
  } finally {
    card.style.opacity = '1';
    fbBtn.disabled = false;
    fbBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg> Rewrite`;
  }
}

// ── Modify DM ─────────────────────────────────────────
async function modifyDM(id, mode) {
  const textEl = document.getElementById('text_' + id);
  if (!textEl || isLoading) return;

  const original = textEl.innerText;
  const instruction = mode === 'shorter'
    ? 'Rewrite this cold DM to be significantly shorter (under 50 words), keeping the core message and CTA.'
    : 'Rewrite this cold DM to be more direct, bold, and assertive while still being professional. Add more urgency.';

  textEl.style.opacity = '0.5';

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `${instruction}\n\nOriginal DM:\n${original}\n\nReturn ONLY the rewritten DM text, nothing else.`
        }]
      })
    });
    const data = await res.json();
    const newText = data.content?.map(b => b.text || '').join('').trim();
    if (newText) textEl.textContent = newText;
  } catch (err) {
    console.error(err);
  } finally {
    textEl.style.opacity = '1';
  }
}

// ── History ───────────────────────────────────────────
function renderHistory() {
  if (history.length === 0) return;
  const sec = document.getElementById('history-section');
  sec.style.display = 'block';
  sec.innerHTML = `
    <div class="history-title">Recent Sessions</div>
    ${history.slice(0, 5).map((h, i) => `
      <div class="history-item" onclick="restoreHistory(${i})">
        <div class="history-meta"><strong>${escapeHtml(h.product)}</strong> → ${escapeHtml(h.audience)} · ${h.platform}</div>
        <div class="history-time">${timeAgo(h.ts)}</div>
      </div>
    `).join('')}
  `;
}

function restoreHistory(i) {
  const h = history[i];
  if (!h) return;
  document.getElementById('product').value = h.product;
  document.getElementById('audience').value = h.audience;
  document.getElementById('goal').value = h.goal;
  document.getElementById('platform').value = h.platform;
  document.getElementById('tone').value = h.tone;
  if (h.urls?.length) {
    const ids = ['urlWebsite','urlMaps','urlInsta','urlTiktok'];
    h.urls.forEach((u, i) => { if (ids[i]) document.getElementById(ids[i]).value = u; });
    document.getElementById('urlBody').classList.add('open');
    document.getElementById('urlChevron').classList.add('open');
  }
  const isCall = h.platform === 'Phone Call Script';
  const prospectInfo = h.urls?.length ? h.urls.join(', ') : null;
  renderOutput(h.dms, h.product, h.audience, h.goal, h.platform, h.tone, isCall, prospectInfo);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Helpers ───────────────────────────────────────────
function showError(msg) {
  const b = document.getElementById('errorBox');
  b.textContent = msg; b.classList.add('visible');
}
function hideError() { document.getElementById('errorBox').classList.remove('visible'); }

function escapeHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Email Modal ───────────────────────────────────────
let currentEmailText = '';

function openEmailModal(id) {
  const text = document.getElementById('text_' + id)?.innerText || '';
  currentEmailText = text;
  document.getElementById('emailPreview').textContent = text;
  document.getElementById('sendStatus').className = 'send-status';
  document.getElementById('sendStatus').textContent = '';
  document.getElementById('emailModal').classList.add('open');
}

function closeEmailModal() {
  document.getElementById('emailModal').classList.remove('open');
}

document.getElementById('emailModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeEmailModal();
});

async function sendEmail() {
  const to      = document.getElementById('emailTo').value.trim();
  const from    = document.getElementById('emailFrom').value.trim();
  const subject = document.getElementById('emailSubject').value.trim() || 'Quick question';
  const body    = currentEmailText;

  if (!to || !from) {
    showSendStatus('error', 'Please fill in both email fields.');
    return;
  }
  if (!to.includes('@') || !from.includes('@')) {
    showSendStatus('error', 'Please enter valid email addresses.');
    return;
  }

  const btn = document.getElementById('sendEmailBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Sending…';

  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, from, subject, body }),
    });
    const data = await res.json();
    if (!res.ok) {
      showSendStatus('error', data.error || 'Failed to send. Please try again.');
    } else {
      showSendStatus('success', '✓ Email sent successfully! Replies will go to ' + from);
      document.getElementById('emailTo').value = '';
    }
  } catch (err) {
    showSendStatus('error', 'Connection error. Please try again.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Send Email';
  }
}

function showSendStatus(type, msg) {
  const el = document.getElementById('sendStatus');
  el.className = 'send-status ' + type;
  el.textContent = msg;
}

// ── Init ───────────────────────────