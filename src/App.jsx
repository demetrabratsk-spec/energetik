import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Zap, Calendar as CalIcon, MessageCircle, User, Plus, Trash2, Send,
  Smile, Medal, Crown, Shield, Check, X, BarChart2, MapPin, Image as ImageIcon,
  ChevronLeft, ChevronRight, CornerUpLeft, Search, ChevronUp, ChevronDown, Camera,
} from "lucide-react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from "recharts";
import logo from "./assets/logo.png";
import { ADMIN_PIN } from "./config";
import { configured } from "./supabase";
import {
  listRuns, addRun, delRun, listEvents, addEvent, delEvent,
  listChats, ensureGeneral, addChat, delChat,
  loadChat, addMessage, delMessage, toggleReaction, setVote,
  savePhoto, getPhoto,
  listMembers, upsertMember,
  subscribeChat, subscribeChats, subscribeMembers, subscribeData,
} from "./db";

/* ── Тема ─────────────────────────────────────────────── */
const T = {
  bg: "#1B2E24", surface: "#274638", surface2: "#2F5343",
  gold: "#F2A81C", goldDim: "rgba(242,168,28,.16)",
  text: "#F3F1E7", muted: "#9DB3A6", line: "rgba(255,255,255,.09)", danger: "#E5675B",
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0}
.eg-root{font-family:'Inter',system-ui,sans-serif;color:${T.text};background:${T.bg};min-height:100vh}
.eg-disp{font-family:'Oswald','Inter',sans-serif;text-transform:uppercase;letter-spacing:.02em;font-weight:700;line-height:.95}
.eg-shell{max-width:520px;margin:0 auto;min-height:100vh;display:flex;flex-direction:column;position:relative}
.eg-top{position:sticky;top:0;z-index:20;background:${T.bg}dd;backdrop-filter:blur(10px);border-bottom:1px solid ${T.line};padding:12px 16px;display:flex;align-items:center;gap:10px}
.eg-body{flex:1;padding:16px 16px 96px}
.eg-card{background:${T.surface};border:1px solid ${T.line};border-radius:18px;padding:16px}
.eg-btn{border:0;border-radius:12px;font-weight:600;font-size:15px;padding:12px 16px;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;justify-content:center;gap:8px}
.eg-btn:active{transform:scale(.98)}
.eg-btn:disabled{opacity:.45}
.eg-gold{background:${T.gold};color:#22160a}
.eg-ghost{background:transparent;color:${T.text};border:1px solid ${T.line}}
.eg-in{width:100%;background:${T.bg};border:1px solid ${T.line};border-radius:12px;padding:12px 14px;color:${T.text};font-size:16px;font-family:inherit;outline:none}
.eg-in:focus{border-color:${T.gold}}
.eg-lbl{font-size:12px;color:${T.muted};text-transform:uppercase;letter-spacing:.08em;font-weight:600}
.eg-tabbar{position:fixed;left:0;right:0;bottom:0;z-index:30;background:${T.bg}f2;backdrop-filter:blur(12px);border-top:1px solid ${T.line};display:flex;max-width:520px;margin:0 auto;padding:8px 6px calc(8px + env(safe-area-inset-bottom))}
.eg-tab{flex:1;background:0;border:0;color:${T.muted};display:flex;flex-direction:column;align-items:center;gap:3px;font-size:11px;font-weight:600;padding:6px 0;cursor:pointer;font-family:inherit}
.eg-tab.on{color:${T.gold}}
.eg-row{display:flex;align-items:center;gap:12px}
.eg-ava{width:38px;height:38px;border-radius:50%;background:${T.surface2};display:flex;align-items:center;justify-content:center;font-size:19px;flex:0 0 auto}
.eg-chip{background:${T.bg};border:1px solid ${T.line};border-radius:999px;padding:3px 10px;font-size:13px;cursor:pointer;display:inline-flex;gap:5px;align-items:center;color:inherit}
.eg-chip.on{background:${T.goldDim};border-color:${T.gold}}
.eg-emoji-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:2px;max-height:210px;overflow:auto}
.eg-emoji{font-size:22px;background:0;border:0;padding:6px;border-radius:9px;cursor:pointer;color:inherit}
.eg-emoji:active{background:${T.goldDim}}
.eg-bubble{max-width:82%;padding:9px 12px;border-radius:16px;background:${T.surface};font-size:15px;line-height:1.35;word-break:break-word}
.eg-mine{background:${T.goldDim};border:1px solid ${T.gold}55}
.eg-meta{font-size:11px;color:${T.muted}}
.eg-bar{height:8px;border-radius:99px;background:${T.bg};overflow:hidden}
.eg-bar>i{display:block;height:100%;background:${T.gold};border-radius:99px}
.eg-scroll::-webkit-scrollbar{width:6px}
.eg-scroll::-webkit-scrollbar-thumb{background:${T.surface2};border-radius:9px}
select.eg-in{appearance:none}
@keyframes egpop{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.eg-pop{animation:egpop .18s ease}
@media (prefers-reduced-motion:reduce){.eg-pop{animation:none}}
`;

/* ── Утилиты ───────────────────────────────────────────── */
const uid = () => (window.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
const YEAR = new Date().getFullYear();
const GOAL = 1000;
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = s => new Date(s + "T00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
const fmtTime = ts => new Date(ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
const AVATARS = ["🏃","🏃‍♀️","⚡","🔥","🐆","🦌","🐅","🚀","💪","🌟","🥇","👟"];
const QUICK = ["🔥","👍","❤️","👏","💪","😂","🎉","⚡"];
const EMOJIS = "🏃 🏃‍♀️ 👟 🥇 🥈 🥉 🏅 🎽 ⛰️ 🌄 💦 💨 ⚡ 🔥 💪 ⏱️ 😀 😄 😁 😅 😂 🙂 😉 😍 😎 🤩 🥳 😤 🥵 😴 🤝 🙏 👍 👎 👏 🙌 ✊ 👊 ✌️ 🫶 💯 ❤️ 🧡 💛 💚 💙 💜 🎉 🎊 🎈 🏆 ⭐ ✨ 🌟 🥂 🍾 🎂 ☀️ 🌧️ ❄️ 🌈 🌳 🏞️ 🍓 🍎 🍌 ☕ 🍺".split(" ");
const EVTYPES = { забег: { i: "🏁" }, тренировка: { i: "🏃" }, праздник: { i: "🎉" }, другое: { i: "📌" } };

function compressImage(file, maxDim = 1280) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      let { width: w, height: h } = img;
      if (w > h && w > maxDim) { h = Math.round(h * maxDim / w); w = maxDim; }
      else if (h >= w && h > maxDim) { w = Math.round(w * maxDim / h); h = maxDim; }
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      let q = 0.72, out = c.toDataURL("image/jpeg", q);
      while (out.length > 1_400_000 && q > 0.35) { q -= 0.15; out = c.toDataURL("image/jpeg", q); }
      res(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("bad image")); };
    img.src = url;
  });
}

/* ── Молния-заряд ──────────────────────────────────────── */
function Bolt({ pct = 0, size = 132 }) {
  const p = Math.max(0, Math.min(1, pct));
  const H = 168, cid = useRef("b" + uid().slice(0, 6)).current;
  const path = "M96 8 L34 96 L74 96 L60 160 L134 60 L92 60 Z";
  return (
    <svg width={size} height={size} viewBox="0 0 168 168" style={{ display: "block" }}>
      <defs><clipPath id={cid}><rect x="0" y={H * (1 - p)} width="168" height={H} /></clipPath></defs>
      <path d={path} fill={T.bg} stroke={T.line} strokeWidth="3" />
      <g clipPath={`url(#${cid})`}><path d={path} fill={T.gold} /></g>
      <path d={path} fill="none" stroke={T.gold} strokeWidth="2.5" opacity=".55" />
    </svg>
  );
}

function EmojiPanel({ onPick, onClose }) {
  return (
    <div className="eg-card eg-pop eg-scroll" style={{ padding: 8, marginTop: 8 }}>
      <div className="eg-row" style={{ justifyContent: "space-between", padding: "2px 6px 6px" }}>
        <span className="eg-lbl">Эмодзи</span>
        <button className="eg-emoji" style={{ fontSize: 16 }} onClick={onClose}><X size={16} /></button>
      </div>
      <div className="eg-emoji-grid">
        {EMOJIS.map((e, i) => <button key={i} className="eg-emoji" onClick={() => onPick(e)}>{e}</button>)}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════ */
export default function App() {
  const [me, setMe] = useState(() => { try { return JSON.parse(localStorage.getItem("energetik_me")); } catch { return null; } });
  const [tab, setTab] = useState("run");
  const [runs, setRuns] = useState([]);
  const [events, setEvents] = useState([]);
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem("energetik_admin") === "1");
  const [emojiFreq, setEmojiFreq] = useState(() => { try { return JSON.parse(localStorage.getItem("energetik_emoji_freq")) || {}; } catch { return {}; } });
  const [profiles, setProfiles] = useState({});

  const refreshRuns = () => listRuns().then(setRuns).catch(() => {});
  const refreshEvents = () => listEvents().then(setEvents).catch(() => {});
  const refreshProfiles = () => listMembers().then(setProfiles).catch(() => {});

  useEffect(() => {
    if (!configured) return;
    refreshRuns(); refreshEvents(); refreshProfiles();
    if (me) upsertMember(me).then(refreshProfiles).catch(() => {});
    const u1 = subscribeData(() => { refreshRuns(); refreshEvents(); });
    const u2 = subscribeMembers(refreshProfiles);
    return () => { u1(); u2(); };
  }, []);

  const bumpEmoji = e => setEmojiFreq(f => { const n = { ...f, [e]: (f[e] || 0) + 1 }; localStorage.setItem("energetik_emoji_freq", JSON.stringify(n)); return n; });
  const frequentEmojis = useMemo(() => {
    const sorted = Object.keys(emojiFreq).sort((a, b) => emojiFreq[b] - emojiFreq[a]);
    const list = [...sorted];
    for (const e of QUICK) if (!list.includes(e)) list.push(e);
    return list.slice(0, 7);
  }, [emojiFreq]);

  const saveMe = m => { localStorage.setItem("energetik_me", JSON.stringify(m)); setMe(m); upsertMember(m).then(refreshProfiles).catch(() => {}); };
  const tryAdmin = pin => { if (pin === ADMIN_PIN) { localStorage.setItem("energetik_admin", "1"); setIsAdmin(true); return true; } return false; };

  if (!configured) return <><style>{CSS}</style><NotConfigured /></>;
  if (!me) return <><style>{CSS}</style><Onboarding onDone={saveMe} /></>;

  return (
    <div className="eg-root">
      <style>{CSS}</style>
      <div className="eg-shell">
        <header className="eg-top">
          <img src={logo} alt="Энергетик" style={{ height: 40, width: 40, objectFit: "contain", borderRadius: 8 }} />
          <div>
            <div className="eg-disp" style={{ fontSize: 20 }}>Энергетик<span style={{ color: T.gold }}>.</span></div>
            <div className="eg-meta" style={{ marginTop: -2 }}>беговой клуб · Братск</div>
          </div>
          {isAdmin && <span className="eg-chip on" style={{ marginLeft: "auto", fontSize: 11 }}><Shield size={12} /> админ</span>}
        </header>

        <main className="eg-body">
          {tab === "run" && <RunTab {...{ me, runs, refreshRuns, profiles }} />}
          {tab === "cal" && <CalTab {...{ events, refreshEvents, isAdmin }} />}
          {tab === "chat" && <ChatSection {...{ me, isAdmin, profiles, frequentEmojis, bumpEmoji }} />}
          {tab === "me" && <MeTab {...{ me, saveMe, isAdmin, tryAdmin, profiles }} />}
        </main>

        <nav className="eg-tabbar">
          {[["run", Zap, "Пробег"], ["cal", CalIcon, "Календарь"], ["chat", MessageCircle, "Чат"], ["me", User, "Профиль"]].map(([k, Ic, l]) => (
            <button key={k} className={"eg-tab" + (tab === k ? " on" : "")} onClick={() => setTab(k)}>
              <Ic size={22} strokeWidth={tab === k ? 2.4 : 1.9} /><span>{l}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

/* ── Экран «не настроено» ──────────────────────────────── */
function NotConfigured() {
  return (
    <div className="eg-root"><div className="eg-shell"><div className="eg-body" style={{ paddingTop: 60 }}>
      <div style={{ textAlign: "center" }}>
        <img src={logo} alt="" style={{ width: 96, height: 96, objectFit: "contain" }} />
        <h1 className="eg-disp" style={{ fontSize: 30, marginTop: 10 }}>Почти готово</h1>
      </div>
      <div className="eg-card" style={{ marginTop: 20, lineHeight: 1.6 }}>
        Открой файл <b>src/config.js</b> и вставь туда <b>SUPABASE_URL</b> и <b>SUPABASE_ANON_KEY</b> из панели Supabase
        (Project Settings → API). После этого приложение заработает. Подробности — в README.
      </div>
    </div></div></div>
  );
}

/* ── Знакомство ────────────────────────────────────────── */
function Onboarding({ onDone }) {
  const [name, setName] = useState("");
  const [sel, setSel] = useState({ ava: "🏃", photoId: null, photoPending: null });
  const [saving, setSaving] = useState(false);
  const enter = async () => {
    setSaving(true);
    let pid = sel.photoId;
    if (sel.photoPending) { try { pid = await savePhoto(sel.photoPending); } catch {} }
    onDone({ id: uid(), name: name.trim(), ava: sel.ava || "🏃", photoId: pid || null });
  };
  return (
    <div className="eg-root"><div className="eg-shell"><div className="eg-body" style={{ paddingTop: 34 }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <img src={logo} alt="Энергетик" style={{ width: 150, height: 150, objectFit: "contain" }} />
        <p style={{ color: T.muted, marginTop: 4 }}>Заряжай молнию — беги к 1000 км за год.</p>
      </div>
      <div className="eg-card">
        <label className="eg-lbl">Как тебя зовут в клубе</label>
        <input className="eg-in" style={{ marginTop: 8 }} placeholder="Имя и фамилия" value={name} onChange={e => setName(e.target.value)} />
        <div className="eg-lbl" style={{ margin: "16px 0 8px" }}>Аватар — фото или эмодзи</div>
        <AvatarPicker onChange={setSel} />
        <button className="eg-btn eg-gold" style={{ width: "100%", marginTop: 18 }} disabled={!name.trim() || saving} onClick={enter}>
          {saving ? "Входим…" : "Войти в клуб"}
        </button>
      </div>
    </div></div></div>
  );
}

/* ── Вкладка «Пробег» ──────────────────────────────────── */
function RunTab({ me, runs, refreshRuns, profiles }) {
  const [km, setKm] = useState(""); const [note, setNote] = useState(""); const [date, setDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);
  const yearRuns = runs.filter(r => r.date.startsWith(String(YEAR)));

  const board = useMemo(() => {
    const map = {};
    yearRuns.forEach(r => { const m = map[r.uid] || (map[r.uid] = { uid: r.uid, km: 0, n: 0 }); m.km += r.km; m.n++; m.name = r.name; m.ava = r.ava; });
    return Object.values(map).sort((a, b) => b.km - a.km);
  }, [yearRuns]);
  const top = board[0]?.km || 1;
  const mine = board.find(b => b.uid === me.id) || { km: 0, n: 0 };
  const myRank = board.findIndex(b => b.uid === me.id) + 1;
  const clubKm = board.reduce((s, b) => s + b.km, 0);

  const monthly = useMemo(() => {
    const arr = Array.from({ length: 12 }, (_, i) => ({ m: ["Я","Ф","М","А","М","И","И","А","С","О","Н","Д"][i], km: 0 }));
    yearRuns.filter(r => r.uid === me.id).forEach(r => { arr[new Date(r.date + "T00:00").getMonth()].km += r.km; });
    return arr;
  }, [yearRuns]);

  const submit = async () => {
    const v = parseFloat(String(km).replace(",", ".")); if (!v || v <= 0) return;
    setSaving(true);
    await addRun(me, Math.round(v * 100) / 100, note.trim() || null, date);
    setKm(""); setNote(""); await refreshRuns(); setSaving(false);
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="eg-card" style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <div style={{ position: "relative", flex: "0 0 auto" }}>
          <Bolt pct={mine.km / GOAL} size={104} />
          {mine.km >= GOAL && <Crown size={22} color={T.gold} style={{ position: "absolute", top: -6, right: 2 }} fill={T.gold} />}
        </div>
        <div style={{ flex: 1 }}>
          <div className="eg-lbl">твой пробег за {YEAR}</div>
          <div className="eg-disp" style={{ fontSize: 40, color: T.gold }}>{mine.km.toFixed(1)}<span style={{ fontSize: 18, color: T.text }}> км</span></div>
          <div className="eg-meta">до 1000 км осталось {Math.max(0, GOAL - mine.km).toFixed(0)} км · {mine.n} тренир.{myRank ? ` · место #${myRank}` : ""}</div>
          {mine.km >= GOAL && <div style={{ color: T.gold, fontWeight: 600, fontSize: 13, marginTop: 4 }}>⚡ Цель года взята — памятный приз твой!</div>}
        </div>
      </div>

      <div className="eg-card">
        <div className="eg-lbl" style={{ marginBottom: 10 }}>Записать пробежку</div>
        <div className="eg-row" style={{ gap: 8 }}>
          <input className="eg-in" style={{ flex: 1 }} inputMode="decimal" placeholder="км, напр. 5" value={km} onChange={e => setKm(e.target.value)} />
          <input className="eg-in" style={{ width: 150 }} type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <input className="eg-in" style={{ marginTop: 8 }} placeholder="Комментарий (необязательно)" value={note} onChange={e => setNote(e.target.value)} />
        <button className="eg-btn eg-gold" style={{ width: "100%", marginTop: 10 }} disabled={saving} onClick={submit}><Plus size={18} /> {saving ? "Сохраняю…" : "Добавить"}</button>
      </div>

      {mine.n > 0 && (
        <div className="eg-card">
          <div className="eg-lbl" style={{ marginBottom: 6 }}><BarChart2 size={13} style={{ verticalAlign: -2 }} /> Твои месяцы, км</div>
          <div style={{ height: 120 }}>
            <ResponsiveContainer><BarChart data={monthly}>
              <XAxis dataKey="m" tick={{ fill: T.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Bar dataKey="km" radius={[4, 4, 0, 0]}>{monthly.map((_, i) => <Cell key={i} fill={T.gold} />)}</Bar>
            </BarChart></ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="eg-card">
        <div className="eg-row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <div className="eg-lbl">Таблица клуба · {YEAR}</div>
          <div className="eg-meta">клуб намотал {clubKm.toFixed(0)} км</div>
        </div>
        {board.length === 0 && <div className="eg-meta">Пока пусто. Запиши первую пробежку — и возглавь таблицу.</div>}
        <div style={{ display: "grid", gap: 12 }}>
          {board.map((b, i) => (
            <div key={b.uid} className="eg-row">
              <div style={{ width: 22, textAlign: "center", fontWeight: 700, color: i < 3 ? T.gold : T.muted }}>
                {i === 0 ? <Medal size={18} color={T.gold} /> : i + 1}
              </div>
              <Avatar profile={profiles[b.uid]} name={b.name} ava={b.ava} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="eg-row" style={{ justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {(profiles[b.uid]?.name || b.name)}{b.uid === me.id && " · ты"} {b.km >= GOAL && "⚡"}
                  </span>
                  <span style={{ fontWeight: 700, color: T.gold }}>{b.km.toFixed(0)}</span>
                </div>
                <div className="eg-bar" style={{ marginTop: 5 }}><i style={{ width: (b.km / top * 100) + "%" }} /></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {runs.filter(r => r.uid === me.id).length > 0 && (
        <div className="eg-card">
          <div className="eg-lbl" style={{ marginBottom: 10 }}>Твои пробежки</div>
          <div style={{ display: "grid", gap: 8 }}>
            {runs.filter(r => r.uid === me.id).slice(0, 15).map(r => (
              <div key={r.id} className="eg-row" style={{ justifyContent: "space-between" }}>
                <div><b>{r.km} км</b> <span className="eg-meta">· {fmtDate(r.date)}{r.note ? " · " + r.note : ""}</span></div>
                <button className="eg-emoji" style={{ fontSize: 15, color: T.muted }} onClick={async () => { await delRun(r.id); refreshRuns(); }}><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Вкладка «Календарь» ───────────────────────────────── */
function CalTab({ events, refreshEvents, isAdmin }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", date: todayStr(), type: "забег", place: "", desc: "" });
  const today = todayStr();
  const upcoming = events.filter(e => e.date >= today);
  const past = events.filter(e => e.date < today).reverse();

  const save = async () => {
    await addEvent({ ...f, title: f.title.trim() });
    setF({ title: "", date: todayStr(), type: "забег", place: "", desc: "" }); setOpen(false); refreshEvents();
  };

  const Card = ({ e }) => (
    <div className="eg-card" style={{ display: "flex", gap: 12, padding: 14 }}>
      <div style={{ flex: "0 0 52px", textAlign: "center" }}>
        <div className="eg-disp" style={{ fontSize: 22, color: T.gold }}>{new Date(e.date + "T00:00").getDate()}</div>
        <div className="eg-meta">{new Date(e.date + "T00:00").toLocaleDateString("ru-RU", { month: "short" })}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="eg-row" style={{ gap: 6 }}><span style={{ fontSize: 15 }}>{(EVTYPES[e.type] || EVTYPES.другое).i}</span><b style={{ fontSize: 15 }}>{e.title}</b></div>
        <div className="eg-meta" style={{ marginTop: 2 }}>
          {new Date(e.date + "T00:00").toLocaleDateString("ru-RU", { weekday: "long" })}
          {e.place && <> · <MapPin size={11} style={{ verticalAlign: -1 }} /> {e.place}</>}
        </div>
        {e.desc && <div style={{ fontSize: 14, marginTop: 6, opacity: .9 }}>{e.desc}</div>}
      </div>
      {isAdmin && <button className="eg-emoji" style={{ color: T.muted, alignSelf: "start" }} onClick={async () => { await delEvent(e.id); refreshEvents(); }}><Trash2 size={16} /></button>}
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="eg-row" style={{ justifyContent: "space-between" }}>
        <h2 className="eg-disp" style={{ fontSize: 22 }}>Календарь</h2>
        {isAdmin && <button className="eg-btn eg-gold" style={{ padding: "8px 12px" }} onClick={() => setOpen(o => !o)}>{open ? <X size={16} /> : <Plus size={16} />} Событие</button>}
      </div>

      {isAdmin && open && (
        <div className="eg-card eg-pop" style={{ display: "grid", gap: 8 }}>
          <input className="eg-in" placeholder="Название (напр. Полумарафон на Ангаре)" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
          <div className="eg-row" style={{ gap: 8 }}>
            <input className="eg-in" type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} />
            <select className="eg-in" value={f.type} onChange={e => setF({ ...f, type: e.target.value })}>
              {Object.keys(EVTYPES).map(k => <option key={k} value={k}>{EVTYPES[k].i} {k}</option>)}
            </select>
          </div>
          <input className="eg-in" placeholder="Место" value={f.place} onChange={e => setF({ ...f, place: e.target.value })} />
          <input className="eg-in" placeholder="Описание" value={f.desc} onChange={e => setF({ ...f, desc: e.target.value })} />
          <button className="eg-btn eg-gold" disabled={!f.title.trim()} onClick={save}>Добавить в календарь</button>
        </div>
      )}

      {events.length === 0 && <div className="eg-card eg-meta">Событий пока нет.{isAdmin ? " Добавь первое — забег, тренировку или день рождения клуба." : ""}</div>}
      {upcoming.length > 0 && <div className="eg-lbl">Ближайшие</div>}
      {upcoming.map(e => <Card key={e.id} e={e} />)}
      {past.length > 0 && <div className="eg-lbl" style={{ marginTop: 6 }}>Прошедшие</div>}
      {past.map(e => <div key={e.id} style={{ opacity: .55 }}><Card e={e} /></div>)}
    </div>
  );
}

/* ── Аватар: фото или эмодзи, привязан к участнику ─────── */
const _avaCache = {};
function Avatar({ profile, name, ava, size = 38 }) {
  const pid = profile?.photoId;
  const [url, setUrl] = React.useState(pid ? _avaCache[pid] || null : null);
  React.useEffect(() => {
    let a = true;
    if (pid && !_avaCache[pid]) getPhoto(pid).then(u => { _avaCache[pid] = u; if (a) setUrl(u); });
    else setUrl(pid ? _avaCache[pid] : null);
    return () => { a = false; };
  }, [pid]);
  const emoji = profile?.ava || ava || "🏃";
  return (
    <div className="eg-ava" style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}>
      {pid && url ? <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} /> : emoji}
    </div>
  );
}

/* выбор аватара: фото ИЛИ эмодзи */
function AvatarPicker({ initAva = "🏃", initPhotoId = null, onChange }) {
  const [ava, setAva] = React.useState(initAva || "🏃");
  const [photoId, setPhotoId] = React.useState(initPhotoId || null);
  const [pending, setPending] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const fileRef = React.useRef(null);

  const pickEmoji = a => { setAva(a); setPhotoId(null); setPending(null); onChange({ ava: a, photoId: null, photoPending: null }); };
  const pickPhoto = async e => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    setBusy(true);
    try { const url = await compressImage(f, 512); setPending(url); onChange({ ava, photoId: null, photoPending: url }); } catch {} finally { setBusy(false); }
  };

  return (
    <div>
      <div className="eg-row" style={{ gap: 14, marginBottom: 12 }}>
        <div className="eg-ava" style={{ width: 68, height: 68, fontSize: 32, overflow: "hidden" }}>
          {pending ? <img src={pending} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : photoId ? <Avatar profile={{ photoId }} size={68} /> : ava}
        </div>
        <div style={{ flex: 1 }}>
          <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} style={{ display: "none" }} />
          <button className="eg-btn eg-ghost" style={{ width: "100%" }} onClick={() => fileRef.current?.click()}>
            <Camera size={18} /> {busy ? "Готовлю…" : (pending || photoId ? "Сменить фото" : "Своё фото")}
          </button>
          {(pending || photoId) && <div className="eg-meta" style={{ marginTop: 6 }}>Или выбери эмодзи ниже — фото сбросится.</div>}
        </div>
      </div>
      <div className="eg-row" style={{ flexWrap: "wrap", gap: 8 }}>
        {AVATARS.map(a => {
          const on = !photoId && !pending && a === ava;
          return <button key={a} className="eg-emoji" style={{ fontSize: 24, borderRadius: 12, background: on ? T.goldDim : T.bg, border: on ? `1px solid ${T.gold}` : `1px solid ${T.line}` }} onClick={() => pickEmoji(a)}>{a}</button>;
        })}
      </div>
    </div>
  );
}

/* ── Раздел «Чат»: список комнат + переписка ──────────── */
function ChatSection({ me, isAdmin, profiles, frequentEmojis, bumpEmoji }) {
  const [chats, setChats] = React.useState([]);
  const [openId, setOpenId] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = () => listChats().then(cs => { setChats(cs); setLoading(false); });
  React.useEffect(() => {
    let alive = true;
    (async () => { await ensureGeneral(); if (alive) refresh(); })();
    const u = subscribeChats(refresh);
    return () => { alive = false; u(); };
  }, []);

  const open = chats.find(c => c.id === openId);
  if (open) return <Room {...{ me, isAdmin, profiles, chat: open, onBack: () => setOpenId(null), frequentEmojis, bumpEmoji }} />;
  return <ChatList {...{ me, isAdmin, chats, loading, onOpen: setOpenId, refresh }} />;
}

function ChatList({ me, isAdmin, chats, loading, onOpen, refresh }) {
  const [creating, setCreating] = React.useState(false);
  const [title, setTitle] = React.useState(""); const [icon, setIcon] = React.useState("💬");
  const [pickIcon, setPickIcon] = React.useState(false);

  const create = async () => {
    if (!title.trim()) return;
    await addChat(me, title.trim(), icon);
    setTitle(""); setIcon("💬"); setCreating(false); refresh();
  };
  const remove = async c => {
    if (!window.confirm(`Удалить чат «${c.title}» вместе со всеми сообщениями?`)) return;
    await delChat(c.id); refresh();
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="eg-row" style={{ justifyContent: "space-between" }}>
        <h2 className="eg-disp" style={{ fontSize: 22 }}>Чаты</h2>
        <button className="eg-btn eg-gold" style={{ padding: "8px 12px" }} onClick={() => setCreating(v => !v)}>{creating ? <X size={16} /> : <Plus size={16} />} Чат</button>
      </div>

      {creating && (
        <div className="eg-card eg-pop" style={{ display: "grid", gap: 8 }}>
          <div className="eg-lbl">Новый чат по интересам</div>
          <div className="eg-row" style={{ gap: 8 }}>
            <button className="eg-btn eg-ghost" style={{ padding: "8px 12px", fontSize: 22 }} onClick={() => setPickIcon(p => !p)}>{icon}</button>
            <input className="eg-in" placeholder="Название, напр. Барахолка" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          {pickIcon && <div className="eg-emoji-grid eg-card eg-scroll" style={{ padding: 6 }}>{EMOJIS.map((e, i) => <button key={i} className="eg-emoji" onClick={() => { setIcon(e); setPickIcon(false); }}>{e}</button>)}</div>}
          <button className="eg-btn eg-gold" disabled={!title.trim()} onClick={create}>Создать чат</button>
        </div>
      )}

      {loading && <div className="eg-card eg-meta">Загрузка…</div>}
      {chats.map(c => (
        <div key={c.id} className="eg-card eg-row" style={{ justifyContent: "space-between", cursor: "pointer", padding: 14 }} onClick={() => onOpen(c.id)}>
          <div className="eg-row" style={{ gap: 12 }}>
            <div className="eg-ava" style={{ fontSize: 20 }}>{c.icon || "💬"}</div>
            <div>
              <div style={{ fontWeight: 600 }}>{c.title}</div>
              <div className="eg-meta">{c.general ? "основной чат клуба" : "чат по интересам"}</div>
            </div>
          </div>
          <div className="eg-row" style={{ gap: 6 }}>
            {isAdmin && !c.general && <button className="eg-emoji" style={{ color: T.muted }} onClick={e => { e.stopPropagation(); remove(c); }}><Trash2 size={16} /></button>}
            <ChevronRight size={18} color={T.muted} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Room({ me, isAdmin, profiles, chat, onBack, frequentEmojis, bumpEmoji }) {
  const [messages, setMessages] = React.useState([]);
  const [text, setText] = React.useState("");
  const [showEmoji, setShowEmoji] = React.useState(false);
  const [reactFor, setReactFor] = React.useState(null);
  const [reactPicker, setReactPicker] = React.useState(null);
  const [pollMode, setPollMode] = React.useState(false);
  const [pq, setPq] = React.useState(""); const [popts, setPopts] = React.useState(["", ""]);
  const [pending, setPending] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [photos, setPhotos] = React.useState({});
  const [zoom, setZoom] = React.useState(null);
  const [reply, setReply] = React.useState(null);
  const [searchOn, setSearchOn] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [hit, setHit] = React.useState(0);
  const endRef = React.useRef(null); const fileRef = React.useRef(null);
  const msgRefs = React.useRef({});

  const refresh = () => loadChat(chat.id).then(setMessages).catch(() => {});
  React.useEffect(() => { refresh(); const u = subscribeChat(refresh); return () => u(); }, [chat.id]);

  const msgs = messages.slice(-300);
  const byId = React.useMemo(() => { const m = {}; messages.forEach(x => m[x.id] = x); return m; }, [messages]);
  const nameOf = m => profiles[m.uid]?.name || m.name;

  // поиск: id сообщений, где встречается слово
  const matches = React.useMemo(() => {
    const s = q.trim().toLowerCase(); if (!s) return [];
    return msgs.filter(m => (m.text || "").toLowerCase().includes(s)).map(m => m.id);
  }, [q, msgs]);
  React.useEffect(() => { setHit(0); }, [q]);
  const gotoHit = i => {
    if (!matches.length) return;
    const idx = (i + matches.length) % matches.length; setHit(idx);
    const el = msgRefs.current[matches[idx]];
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  React.useEffect(() => { if (!searchOn) endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);
  React.useEffect(() => {
    let alive = true;
    (async () => { for (const m of msgs) if (m.photoId && !(m.photoId in photos)) { const url = await getPhoto(m.photoId); if (alive) setPhotos(p => ({ ...p, [m.photoId]: url })); } })();
    return () => { alive = false; };
  }, [msgs.map(m => m.photoId).join(",")]);

  const onFile = async e => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; setBusy(true); try { setPending({ url: await compressImage(f) }); } catch {} finally { setBusy(false); } };
  const send = async () => {
    const t = text.trim(); if (!t && !pending) return;
    let pid = null;
    if (pending) { pid = await savePhoto(pending.url); if (pid) setPhotos(p => ({ ...p, [pid]: pending.url })); }
    await addMessage(me, chat.id, t, pid, null, reply?.id || null);
    setText(""); setPending(null); setShowEmoji(false); setReply(null); refresh();
  };
  const createPoll = async () => {
    const opts = popts.map(o => o.trim()).filter(Boolean);
    if (!pq.trim() || opts.length < 2) return;
    await addMessage(me, chat.id, null, null, { q: pq.trim(), opts }, null);
    setPq(""); setPopts(["", ""]); setPollMode(false); refresh();
  };
  const react = async (mid, emoji) => { bumpEmoji(emoji); await toggleReaction(mid, me, emoji); refresh(); };
  const vote = async (mid, idx) => { await setVote(mid, me, idx); refresh(); };
  const remove = async mid => { await delMessage(mid); refresh(); };
  const insertEmoji = e => { bumpEmoji(e); setText(t => t + e); };

  const hl = (txt) => {
    const s = q.trim(); if (!s || !txt) return txt;
    const parts = txt.split(new RegExp(`(${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"));
    return parts.map((p, i) => p.toLowerCase() === s.toLowerCase()
      ? <mark key={i} style={{ background: T.gold, color: "#22160a", borderRadius: 3, padding: "0 2px" }}>{p}</mark> : p);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 150px)" }}>
      {/* шапка комнаты */}
      <div className="eg-row" style={{ gap: 8, paddingBottom: 10, borderBottom: `1px solid ${T.line}`, marginBottom: 10 }}>
        <button className="eg-btn eg-ghost" style={{ padding: "6px 8px" }} onClick={onBack}><ChevronLeft size={20} /></button>
        <div className="eg-ava" style={{ width: 34, height: 34, fontSize: 18 }}>{chat.icon || "💬"}</div>
        <div style={{ fontWeight: 700, fontSize: 17, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{chat.title}</div>
        <button className="eg-btn eg-ghost" style={{ padding: "6px 8px" }} onClick={() => { setSearchOn(s => !s); setQ(""); }}><Search size={18} color={searchOn ? T.gold : T.text} /></button>
      </div>

      {searchOn && (
        <div className="eg-row" style={{ gap: 8, marginBottom: 10 }}>
          <input className="eg-in" autoFocus placeholder="Поиск по сообщениям…" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && gotoHit(hit + 1)} />
          <span className="eg-meta" style={{ whiteSpace: "nowrap" }}>{matches.length ? `${hit + 1}/${matches.length}` : (q ? "0" : "")}</span>
          <button className="eg-btn eg-ghost" style={{ padding: 10 }} disabled={!matches.length} onClick={() => gotoHit(hit - 1)}><ChevronUp size={18} /></button>
          <button className="eg-btn eg-ghost" style={{ padding: 10 }} disabled={!matches.length} onClick={() => gotoHit(hit + 1)}><ChevronDown size={18} /></button>
        </div>
      )}

      <div className="eg-scroll" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, paddingBottom: 8 }}>
        {msgs.length === 0 && <div className="eg-card eg-meta" style={{ margin: "auto" }}>Пока пусто. Напиши первым 👋</div>}
        {msgs.map(m => {
          const mine = m.uid === me.id;
          const rep = m.replyTo ? byId[m.replyTo] : null;
          const isHit = matches[hit] === m.id;
          return (
            <div key={m.id} ref={el => (msgRefs.current[m.id] = el)} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", gap: 3 }}>
              {!mine && <div className="eg-meta" style={{ marginLeft: 44 }}>{nameOf(m)}</div>}
              <div className="eg-row" style={{ alignItems: "flex-end", gap: 8, flexDirection: mine ? "row-reverse" : "row", maxWidth: "100%" }}>
                {!mine && <Avatar profile={profiles[m.uid]} name={m.name} ava={m.ava} size={32} />}
                <div>
                  <div className={"eg-bubble" + (mine ? " eg-mine" : "")} style={{ outline: isHit ? `2px solid ${T.gold}` : "none" }}>
                    {rep && (
                      <div style={{ borderLeft: `3px solid ${T.gold}`, padding: "2px 8px", margin: "0 0 6px", background: "rgba(0,0,0,.18)", borderRadius: 6, fontSize: 13 }}>
                        <div style={{ color: T.gold, fontWeight: 600 }}>{nameOf(rep)}</div>
                        <div className="eg-meta" style={{ color: T.text, opacity: .8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 210 }}>{rep.photoId ? "📷 фото" : (rep.poll ? "📊 " + rep.poll.q : rep.text)}</div>
                      </div>
                    )}
                    {m.photoId && (photos[m.photoId]
                      ? <img src={photos[m.photoId]} alt="фото" onClick={() => setZoom(photos[m.photoId])} style={{ display: "block", maxWidth: 240, width: "100%", borderRadius: 12, cursor: "zoom-in", marginBottom: m.text ? 6 : 0 }} />
                      : <div style={{ width: 200, height: 140, borderRadius: 12, background: T.bg, display: "grid", placeItems: "center", color: T.muted }}><ImageIcon size={22} /></div>)}
                    {m.text && <div>{hl(m.text)}</div>}
                    {m.poll && <Poll m={m} me={me} onVote={vote} />}
                    <div className="eg-meta" style={{ marginTop: 4, textAlign: "right" }}>{fmtTime(m.ts)}</div>
                  </div>
                  <div className="eg-row" style={{ gap: 5, marginTop: 5, flexWrap: "wrap", justifyContent: mine ? "flex-end" : "flex-start" }}>
                    {Object.entries(m.reactions || {}).map(([e, us]) => (
                      <button key={e} className={"eg-chip" + (us.includes(me.id) ? " on" : "")} onClick={() => react(m.id, e)}>{e} {us.length}</button>
                    ))}
                    <button className="eg-chip" style={{ color: T.muted }} onClick={() => { setReactFor(reactFor === m.id ? null : m.id); setReactPicker(null); }}><Smile size={14} /></button>
                    <button className="eg-chip" style={{ color: T.muted }} onClick={() => setReply(m)}><CornerUpLeft size={13} /></button>
                    {(mine || isAdmin) && <button className="eg-chip" style={{ color: T.muted }} onClick={() => remove(m.id)}><Trash2 size={13} /></button>}
                  </div>
                  {reactFor === m.id && (
                    <div className="eg-card eg-pop" style={{ padding: 6, marginTop: 6, display: "flex", gap: 2, width: "fit-content", alignItems: "center" }}>
                      {frequentEmojis.map(e => <button key={e} className="eg-emoji" onClick={() => { react(m.id, e); setReactFor(null); }}>{e}</button>)}
                      <button className="eg-emoji" style={{ color: T.muted }} onClick={() => { setReactPicker(m.id); setReactFor(null); }}><Plus size={18} /></button>
                    </div>
                  )}
                  {reactPicker === m.id && <EmojiPanel onPick={e => { react(m.id, e); setReactPicker(null); }} onClose={() => setReactPicker(null)} />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {pollMode && (
        <div className="eg-card eg-pop" style={{ display: "grid", gap: 8, marginBottom: 8 }}>
          <div className="eg-lbl">Новая голосовалка</div>
          <input className="eg-in" placeholder="Вопрос, напр. Куда бежим в субботу?" value={pq} onChange={e => setPq(e.target.value)} />
          {popts.map((o, i) => (
            <div className="eg-row" key={i} style={{ gap: 6 }}>
              <input className="eg-in" placeholder={"Вариант " + (i + 1)} value={o} onChange={e => { const c = [...popts]; c[i] = e.target.value; setPopts(c); }} />
              {popts.length > 2 && <button className="eg-emoji" style={{ color: T.muted }} onClick={() => setPopts(popts.filter((_, j) => j !== i))}><X size={16} /></button>}
            </div>
          ))}
          <div className="eg-row" style={{ gap: 8 }}>
            {popts.length < 6 && <button className="eg-btn eg-ghost" style={{ flex: 1, padding: 9 }} onClick={() => setPopts([...popts, ""])}><Plus size={15} /> вариант</button>}
            <button className="eg-btn eg-gold" style={{ flex: 1, padding: 9 }} onClick={createPoll}>Опубликовать</button>
          </div>
        </div>
      )}

      {showEmoji && <EmojiPanel onPick={insertEmoji} onClose={() => setShowEmoji(false)} />}

      {reply && (
        <div className="eg-card eg-pop eg-row" style={{ gap: 10, marginBottom: 8, padding: "8px 10px" }}>
          <CornerUpLeft size={16} color={T.gold} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: T.gold, fontWeight: 600, fontSize: 13 }}>{nameOf(reply)}</div>
            <div className="eg-meta" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{reply.photoId ? "📷 фото" : (reply.poll ? "📊 " + reply.poll.q : reply.text)}</div>
          </div>
          <button className="eg-emoji" style={{ color: T.muted }} onClick={() => setReply(null)}><X size={18} /></button>
        </div>
      )}

      {(pending || busy) && (
        <div className="eg-card eg-pop eg-row" style={{ gap: 10, marginBottom: 8, padding: 8 }}>
          {busy && <div className="eg-meta">Готовлю фото…</div>}
          {pending && <>
            <img src={pending.url} alt="" style={{ width: 54, height: 54, objectFit: "cover", borderRadius: 10 }} />
            <div className="eg-meta" style={{ flex: 1 }}>Фото готово. Можно добавить подпись.</div>
            <button className="eg-emoji" style={{ color: T.muted }} onClick={() => setPending(null)}><X size={18} /></button>
          </>}
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
      <div className="eg-row" style={{ gap: 6, marginTop: 8 }}>
        <button className="eg-btn eg-ghost" style={{ padding: 12 }} onClick={() => { setShowEmoji(s => !s); setPollMode(false); }}><Smile size={20} color={showEmoji ? T.gold : T.text} /></button>
        <button className="eg-btn eg-ghost" style={{ padding: 12 }} onClick={() => fileRef.current?.click()}><ImageIcon size={20} /></button>
        <button className="eg-btn eg-ghost" style={{ padding: 12 }} onClick={() => { setPollMode(p => !p); setShowEmoji(false); }}><BarChart2 size={20} color={pollMode ? T.gold : T.text} /></button>
        <input className="eg-in" placeholder="Сообщение…" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} />
        <button className="eg-btn eg-gold" style={{ padding: 12 }} onClick={send}><Send size={18} /></button>
      </div>

      {zoom && (
        <div onClick={() => setZoom(null)} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,.9)", display: "grid", placeItems: "center", padding: 16 }}>
          <img src={zoom} alt="" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 12 }} />
          <button className="eg-btn eg-ghost" style={{ position: "absolute", top: 16, right: 16, padding: 10 }}><X size={20} /></button>
        </div>
      )}
    </div>
  );
}

function Poll({ m, me, onVote }) {
  const votes = m.poll.votes || {};
  const total = Object.keys(votes).length;
  const mine = votes[me.id];
  const counts = m.poll.opts.map((_, i) => Object.values(votes).filter(v => v === i).length);
  return (
    <div style={{ marginTop: 4, display: "grid", gap: 7, minWidth: 220 }}>
      <div className="eg-row" style={{ gap: 6, fontWeight: 600 }}><BarChart2 size={15} color={T.gold} /> {m.poll.q}</div>
      {m.poll.opts.map((o, i) => {
        const pct = total ? Math.round(counts[i] / total * 100) : 0;
        const chosen = mine === i;
        return (
          <button key={i} onClick={() => onVote(m.id, i)} style={{ textAlign: "left", border: 0, background: "transparent", padding: 0, cursor: "pointer", color: "inherit" }}>
            <div className="eg-row" style={{ justifyContent: "space-between", fontSize: 14, marginBottom: 3 }}>
              <span>{chosen && <Check size={13} color={T.gold} style={{ verticalAlign: -1 }} />} {o}</span>
              <span className="eg-meta">{pct}%</span>
            </div>
            <div className="eg-bar"><i style={{ width: pct + "%", opacity: chosen ? 1 : .5 }} /></div>
          </button>
        );
      })}
      <div className="eg-meta">{total} голос(ов){mine != null ? " · можно переголосовать" : " · нажми, чтобы проголосовать"}</div>
    </div>
  );
}

/* ── Вкладка «Профиль» ─────────────────────────────────── */
function MeTab({ me, saveMe, isAdmin, tryAdmin }) {
  const [name, setName] = useState(me.name);
  const [sel, setSel] = useState({ ava: me.ava, photoId: me.photoId || null, photoPending: null });
  const [saving, setSaving] = useState(false);
  const [pin, setPin] = useState(""); const [err, setErr] = useState(false);
  const dirty = name.trim() && (name.trim() !== me.name || sel.ava !== me.ava || (sel.photoId || null) !== (me.photoId || null) || sel.photoPending);
  const save = async () => {
    setSaving(true);
    let pid = sel.photoId;
    if (sel.photoPending) { try { pid = await savePhoto(sel.photoPending); } catch {} }
    saveMe({ ...me, name: name.trim(), ava: sel.ava || "🏃", photoId: pid || null });
    setSaving(false);
  };
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="eg-card">
        <div className="eg-lbl" style={{ marginBottom: 10 }}>Профиль</div>
        <input className="eg-in" value={name} onChange={e => setName(e.target.value)} />
        <div className="eg-lbl" style={{ margin: "14px 0 8px" }}>Аватар — фото или эмодзи</div>
        <AvatarPicker initAva={me.ava} initPhotoId={me.photoId} onChange={setSel} />
        <button className="eg-btn eg-gold" style={{ width: "100%", marginTop: 14 }} disabled={!dirty || saving} onClick={save}>{saving ? "Сохраняю…" : "Сохранить"}</button>
      </div>

      {!isAdmin ? (
        <div className="eg-card">
          <div className="eg-lbl" style={{ marginBottom: 8 }}><Shield size={13} style={{ verticalAlign: -2 }} /> Режим администратора</div>
          <div className="eg-meta" style={{ marginBottom: 8 }}>Право добавлять события и удалять сообщения.</div>
          <div className="eg-row" style={{ gap: 8 }}>
            <input className="eg-in" type="password" placeholder="PIN" value={pin} onChange={e => { setPin(e.target.value); setErr(false); }} />
            <button className="eg-btn eg-ghost" onClick={() => { if (!tryAdmin(pin)) setErr(true); }}>Войти</button>
          </div>
          {err && <div style={{ color: T.danger, fontSize: 13, marginTop: 6 }}>Неверный PIN</div>}
        </div>
      ) : (
        <div className="eg-card eg-row" style={{ justifyContent: "space-between" }}>
          <span><Shield size={14} style={{ verticalAlign: -2 }} color={T.gold} /> Ты вошёл как админ</span>
          <button className="eg-btn eg-ghost" style={{ padding: "8px 12px" }} onClick={() => { localStorage.removeItem("energetik_admin"); location.reload(); }}>Выйти</button>
        </div>
      )}

      <div className="eg-card">
        <div className="eg-lbl" style={{ marginBottom: 8 }}>Добавить на экран телефона</div>
        <div style={{ fontSize: 14, lineHeight: 1.5, opacity: .9 }}>
          <b>iPhone:</b> Safari → «Поделиться» → «На экран „Домой“».<br />
          <b>Android:</b> Chrome → меню ⋮ → «Добавить на главный экран».
        </div>
      </div>

      <div style={{ textAlign: "center", color: T.muted, fontSize: 12, padding: "4px 0 20px" }}>⚡ Энергетик · Братск · {YEAR}</div>
    </div>
  );
}
