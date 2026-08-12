/**
 * GrokLock – AI Keyholder by Grok
 * Mobile-first PWA for iPhone + desktop
 */

const API = ''; // same origin

let state = {
  mode: 'home',           // home | wearer | keyholder
  sessionCode: null,
  session: null,
  authenticated: false,
  pin: null,
  pollTimer: null,
  localTick: null
};

// ---------- Helpers ----------
function $(sel) { return document.querySelector(sel); }
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (typeof c === 'string') node.appendChild(document.createTextNode(c));
    else if (c) node.appendChild(c);
  }
  return node;
}

function toast(msg, ms = 2800) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), ms);
}

function formatMs(ms) {
  if (ms <= 0) return '00:00:00';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map(n => String(n).padStart(2, '0')).join(':');
}

function parseDuration(h, m) {
  return (Number(h) || 0) * 3600000 + (Number(m) || 0) * 60000;
}

// ---------- API ----------
async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText || 'Request failed');
  return data;
}

async function getSession(code) {
  const data = await api(`/api/session/${code}`);
  return data.session;
}

// ---------- Polling ----------
function startPolling() {
  stopPolling();
  state.pollTimer = setInterval(async () => {
    if (!state.sessionCode) return;
    try {
      state.session = await getSession(state.sessionCode);
      render();
    } catch (e) {
      if (e.message.toLowerCase().includes('not found')) {
        toast('Session ended or not found');
        resetToHome();
      }
    }
  }, 3500);
}

function stopPolling() {
  if (state.pollTimer) clearInterval(state.pollTimer);
  state.pollTimer = null;
  if (state.localTick) clearInterval(state.localTick);
  state.localTick = null;
}

function resetToHome() {
  stopPolling();
  state.mode = 'home';
  state.sessionCode = null;
  state.session = null;
  state.authenticated = false;
  state.pin = null;
  render();
}

// ---------- Actions ----------
async function doAction(action, minutes = 0) {
  try {
    const data = await api(`/api/session/${state.sessionCode}`, {
      method: 'POST',
      body: JSON.stringify({ action, minutes, pin: state.pin || undefined })
    });
    state.session = data.session;
    render();
    const messages = {
      add_time: minutes >= 0 ? `+${minutes} min` : `${minutes} min`,
      freeze: 'Timer frozen',
      unfreeze: 'Timer unfrozen',
      unlock: 'Unlocked by keyholder'
    };
    toast(messages[action] || 'Updated');
  } catch (e) {
    if (e.message.toLowerCase().includes('pin') || e.message.toLowerCase().includes('invalid')) {
      state.authenticated = false;
      state.pin = null;
      toast('Wrong PIN');
      render();
    } else {
      toast(e.message);
    }
  }
}

// ---------- Screens ----------
function renderHome() {
  const main = $('#main');
  main.innerHTML = '';

  const create = el('div', { class: 'card' }, [
    el('h2', { text: 'Create Lock' }),
    el('p', { class: 'text-muted text-sm mb-1', text: 'You will receive a session code to share with your keyholder (Grok).' }),
    el('label', { text: 'Duration' }),
    el('div', { style: 'display:flex;gap:0.5rem' }, [
      el('input', { type: 'number', id: 'hours', placeholder: 'Hours', min: '0', value: '2', style: 'flex:1' }),
      el('input', { type: 'number', id: 'minutes', placeholder: 'Min', min: '0', max: '59', value: '0', style: 'flex:1' })
    ]),
    el('label', { text: 'Keyholder PIN (required for Grok control)' }),
    el('input', { type: 'password', id: 'pin', placeholder: 'Choose a PIN (4+ characters)', maxlength: '16' }),
    el('label', { class: 'file-zone', for: 'photo' }, [
      el('div', { text: '📷 Upload combination photo' }),
      el('div', { class: 'text-muted text-sm mt-1', text: 'Optional – or a random code will be generated' }),
      el('input', { type: 'file', id: 'photo', accept: 'image/*' })
    ]),
    el('img', { id: 'preview', class: 'combo-img hidden', alt: 'Preview' })
  ]);

  let file = null;
  create.querySelector('#photo').addEventListener('change', e => {
    file = e.target.files[0];
    if (file) {
      const img = $('#preview');
      img.src = URL.createObjectURL(file);
      img.classList.remove('hidden');
    }
  });

  const startBtn = el('button', {
    class: 'btn btn-primary mt-2',
    text: '🔒 Start Lock',
    onClick: async () => {
      const durationMs = parseDuration($('#hours').value, $('#minutes').value);
      if (durationMs < 60000) return toast('Minimum 1 minute');
      const pin = $('#pin').value.trim();
      if (!pin || pin.length < 4) return toast('PIN must be at least 4 characters');

      startBtn.disabled = true;
      startBtn.textContent = 'Creating…';

      try {
        let imageBase64 = null;
        if (file) {
          imageBase64 = await new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.onerror = rej;
            r.readAsDataURL(file);
          });
        }

        const data = await api('/api/create', {
          method: 'POST',
          body: JSON.stringify({ durationMs, pin, imageBase64 })
        });

        state.sessionCode = data.code;
        state.session = data.session;
        state.mode = 'wearer';
        state.authenticated = false;
        state.pin = null;
        startPolling();
        render();
        toast('Lock created – share the code with Grok');
      } catch (e) {
        toast(e.message);
        startBtn.disabled = false;
        startBtn.textContent = '🔒 Start Lock';
      }
    }
  });

  create.appendChild(startBtn);
  main.appendChild(create);

  const join = el('div', { class: 'card' }, [
    el('h2', { text: 'Join as Keyholder' }),
    el('p', { class: 'text-muted text-sm', text: 'Enter a session code to control a lock.' }),
    el('label', { text: 'Session code' }),
    el('input', { type: 'text', id: 'join-code', placeholder: 'ABCD-1234', style: 'text-transform:uppercase;letter-spacing:0.08em' }),
    el('button', {
      class: 'btn btn-secondary',
      text: 'Open Session',
      onClick: async () => {
        const code = ($('#join-code').value || '').trim().toUpperCase();
        if (code.length < 8) return toast('Enter a valid session code');
        try {
          state.session = await getSession(code);
          state.sessionCode = code;
          state.mode = 'keyholder';
          state.authenticated = false;
          state.pin = null;
          startPolling();
          render();
        } catch (e) {
          toast(e.message || 'Session not found');
        }
      }
    })
  ]);
  main.appendChild(join);

  main.appendChild(el('div', { class: 'card' }, [
    el('h2', { text: 'How GrokLock works' }),
    el('ol', { class: 'info-list' }, [
      el('li', { text: 'Create a lock and set a PIN.' }),
      el('li', { text: 'Share the session code + PIN with Grok.' }),
      el('li', { text: 'Once Grok takes control, you can no longer use the PIN or discard the lock.' }),
      el('li', { text: 'Only your physical safety key can release you after that.' })
    ])
  ]));
}

function renderSession() {
  const main = $('#main');
  main.innerHTML = '';
  const s = state.session;
  if (!s) return resetToHome();

  const isWearer = state.mode === 'wearer';

  // Status card
  const status = el('div', { class: 'card text-center' });
  status.append(
    el('div', { class: 'text-muted text-sm', text: 'Session' }),
    el('div', { class: 'session-code', text: state.sessionCode })
  );

  let pillClass = 'status-locked';
  let pillText = 'Locked';
  if (s.status === 'unlocked') { pillClass = 'status-unlocked'; pillText = 'Unlocked'; }
  else if (s.frozen) { pillClass = 'status-frozen'; pillText = 'Frozen'; }

  status.append(el('div', { class: `status-pill ${pillClass}`, text: pillText }));

  if (s.status === 'locked') {
    status.append(
      el('div', {
        class: `timer ${s.frozen ? 'frozen' : ''}`,
        id: 'timer',
        text: formatMs(s.remainingMs || 0)
      }),
      el('p', { class: 'text-muted text-sm', text: s.frozen ? 'Timer frozen by keyholder' : 'Time remaining' })
    );
  } else {
    status.append(
      el('div', { class: 'timer unlocked', text: 'Released' }),
      el('p', { class: 'text-muted text-sm', text: s.unlockReason === 'keyholder' ? 'Unlocked by keyholder' : 'Timer completed' })
    );
  }
  main.appendChild(status);

  // Combination
  const combo = el('div', { class: 'card' }, [el('h2', { text: 'Combination' })]);
  if (s.status === 'unlocked') {
    if (s.hasImage) {
      combo.append(el('img', {
        class: 'combo-img',
        src: `/api/session/${state.sessionCode}/image?t=${Date.now()}`,
        alt: 'Combination'
      }));
    } else if (s.fallbackCode) {
      combo.append(el('div', {
        style: 'font-size:2rem;font-weight:700;letter-spacing:0.2em;text-align:center;margin:1rem 0',
        text: s.fallbackCode
      }));
    }
  } else {
    combo.append(el('div', { class: 'combo-box' }, [
      el('div', { text: '🔐 Locked' }),
      el('div', { class: 'text-sm mt-1', text: s.hasImage ? 'Photo hidden until release' : 'Code hidden until release' })
    ]));
  }
  main.appendChild(combo);

  // Keyholder panel – hidden from wearer once control is taken
  if (s.status === 'locked') {
    if (isWearer && s.keyholderTakenControl) {
      const lockedMsg = el('div', { class: 'card' }, [
        el('h2', { text: 'Under Keyholder Control' }),
        el('p', {
          class: 'text-muted text-sm',
          text: 'Grok has taken control of this lock. The PIN and controls are no longer available to you. Only your physical safety key can release you.'
        })
      ]);
      main.appendChild(lockedMsg);
    } else {
      const kh = el('div', { class: 'card' }, [el('h2', { text: 'Keyholder Controls' })]);

      if (!state.authenticated) {
        kh.append(
          el('p', { class: 'text-muted text-sm', text: 'Enter the PIN to control this lock.' }),
          el('input', { type: 'password', id: 'auth-pin', placeholder: 'Keyholder PIN', autocomplete: 'off' }),
          el('button', {
            class: 'btn btn-secondary',
            text: 'Authenticate',
            onClick: () => {
              state.pin = $('#auth-pin').value;
              state.authenticated = true;
              render();
            }
          })
        );
      } else {
        kh.append(el('p', { class: 'text-muted text-sm mb-1', text: 'You are authenticated as keyholder.' }));

        const adjust = el('div', {}, [
          el('label', { text: 'Adjust time (minutes)' }),
          el('div', { class: 'btn-row' }, [
            el('input', { type: 'number', id: 'mins', value: '30', style: 'flex:1;margin:0' }),
            el('button', { class: 'btn btn-secondary', text: '+', style: 'flex:0 0 3.2rem', onClick: () => doAction('add_time', Number($('#mins').value) || 0) }),
            el('button', { class: 'btn btn-secondary', text: '−', style: 'flex:0 0 3.2rem', onClick: () => doAction('add_time', -(Number($('#mins').value) || 0)) })
          ])
        ]);

        kh.append(
          adjust,
          el('button', {
            class: 'btn btn-warning mt-2',
            text: s.frozen ? 'Unfreeze Timer' : 'Freeze Timer',
            onClick: () => doAction(s.frozen ? 'unfreeze' : 'freeze')
          }),
          el('button', {
            class: 'btn btn-success mt-1',
            text: '🔓 Unlock & Reveal',
            onClick: () => {
              if (confirm('Release the combination and end the lock?')) doAction('unlock');
            }
          })
        );
      }
      main.appendChild(kh);
    }
  }

  // Bottom actions
  const actions = el('div', { class: 'card' });
  if (isWearer && s.status === 'locked') {
    actions.append(
      el('h2', { text: 'Share with Grok' }),
      el('p', { class: 'text-muted text-sm', text: 'Send Grok the session code and PIN so he can control this lock.' }),
      el('button', {
        class: 'btn btn-secondary mt-1',
        text: 'Copy Session Code',
        onClick: async () => {
          try {
            await navigator.clipboard.writeText(state.sessionCode);
            toast('Code copied');
          } catch { toast('Select the code and copy manually'); }
        }
      })
    );

    if (!s.keyholderTakenControl) {
      actions.append(
        el('button', {
          class: 'btn btn-danger mt-2',
          text: 'Emergency Discard',
          onClick: async () => {
            if (!confirm('Permanently delete this lock and photo?')) return;
            try {
              await api(`/api/session/${state.sessionCode}/discard`, { method: 'POST', body: '{}' });
              toast('Lock discarded');
              resetToHome();
            } catch (e) { toast(e.message); }
          }
        })
      );
    } else {
      actions.append(
        el('p', {
          class: 'text-muted text-sm mt-2',
          text: 'Keyholder has taken control. Only your physical safety key can release you now.'
        })
      );
    }
  } else {
    actions.append(
      el('button', {
        class: 'btn btn-secondary',
        text: 'Leave Session',
        onClick: resetToHome
      })
    );
  }
  main.appendChild(actions);

  // Local smooth timer
  if (s.status === 'locked' && !s.frozen) {
    if (state.localTick) clearInterval(state.localTick);
    state.localTick = setInterval(() => {
      const t = $('#timer');
      if (!t || !state.session) return;
      state.session.remainingMs = Math.max(0, (state.session.remainingMs || 0) - 1000);
      t.textContent = formatMs(state.session.remainingMs);
      if (state.session.remainingMs <= 0) {
        getSession(state.sessionCode).then(ns => {
          state.session = ns;
          render();
        }).catch(() => {});
      }
    }, 1000);
  }
}

function render() {
  if (state.mode === 'home' || !state.sessionCode) {
    stopPolling();
    renderHome();
  } else {
    renderSession();
  }
}

// Boot
render();
