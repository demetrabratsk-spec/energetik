import { supabase } from "./supabase";

/* ── Пробежки ─────────────────────────────────────────── */
export async function listRuns() {
  const { data } = await supabase.from("runs").select("*").order("date", { ascending: false });
  return (data || []).map(r => ({
    id: r.id, uid: r.member_id, name: r.name, ava: r.ava,
    km: Number(r.km), note: r.note, date: r.date, ts: r.created_at,
  }));
}
export const addRun = (me, km, note, date) =>
  supabase.from("runs").insert({ member_id: me.id, name: me.name, ava: me.ava, km, note, date });
export const delRun = id => supabase.from("runs").delete().eq("id", id);

/* ── События ──────────────────────────────────────────── */
export async function listEvents() {
  const { data } = await supabase.from("events").select("*").order("date");
  return (data || []).map(e => ({
    id: e.id, title: e.title, date: e.date, type: e.type, place: e.place, desc: e.descr, ts: e.created_at,
  }));
}
export const addEvent = e =>
  supabase.from("events").insert({ title: e.title, date: e.date, type: e.type, place: e.place, descr: e.desc });
export const delEvent = id => supabase.from("events").delete().eq("id", id);

/* ── Фото ─────────────────────────────────────────────── */
export async function savePhoto(dataURL) {
  const { data } = await supabase.from("photos").insert({ data: dataURL }).select("id").single();
  return data?.id;
}
export async function getPhoto(id) {
  const { data } = await supabase.from("photos").select("data").eq("id", id).single();
  return data?.data || "";
}

/* ── Чаты (комнаты) ───────────────────────────────────── */
export async function listChats() {
  const { data } = await supabase.from("chats").select("*")
    .order("is_general", { ascending: false }).order("created_at");
  return (data || []).map(c => ({ id: c.id, title: c.title, icon: c.icon, general: c.is_general, createdBy: c.created_by }));
}
// на случай пустой базы: гарантируем наличие Общего чата
export async function ensureGeneral() {
  const { data } = await supabase.from("chats").select("id").eq("is_general", true).limit(1);
  if (data && data.length) return data[0].id;
  const { data: ins } = await supabase.from("chats").insert({ title: "Общий чат", icon: "💬", is_general: true }).select("id").single();
  return ins?.id;
}
export const addChat = (me, title, icon) =>
  supabase.from("chats").insert({ title, icon, is_general: false, created_by: me.id });
export async function delChat(id) {
  const { data: ms } = await supabase.from("messages").select("id").eq("chat_id", id);
  const ids = (ms || []).map(m => m.id);
  if (ids.length) {
    await supabase.from("reactions").delete().in("message_id", ids);
    await supabase.from("votes").delete().in("message_id", ids);
    await supabase.from("messages").delete().eq("chat_id", id);
  }
  await supabase.from("chats").delete().eq("id", id);
}

/* ── Сообщения одного чата ────────────────────────────── */
export async function loadChat(chatId) {
  const { data: msgs } = await supabase.from("messages").select("*")
    .eq("chat_id", chatId).order("created_at").limit(300);
  const ids = (msgs || []).map(m => m.id);
  let rx = [], vt = [];
  if (ids.length) {
    const [a, b] = await Promise.all([
      supabase.from("reactions").select("*").in("message_id", ids),
      supabase.from("votes").select("*").in("message_id", ids),
    ]);
    rx = a.data || []; vt = b.data || [];
  }
  const rmap = {}, vmap = {};
  rx.forEach(r => { (rmap[r.message_id] = rmap[r.message_id] || {}); (rmap[r.message_id][r.emoji] = rmap[r.message_id][r.emoji] || []).push(r.member_id); });
  vt.forEach(v => { (vmap[v.message_id] = vmap[v.message_id] || {})[v.member_id] = v.choice; });
  return (msgs || []).map(m => ({
    id: m.id, uid: m.member_id, name: m.name, ava: m.ava, text: m.text,
    photoId: m.photo_id, replyTo: m.reply_to, ts: new Date(m.created_at).getTime(),
    reactions: rmap[m.id] || {},
    poll: m.poll ? { ...m.poll, votes: vmap[m.id] || {} } : undefined,
  }));
}
export const addMessage = (me, chatId, text, photoId, poll, replyTo) =>
  supabase.from("messages").insert({
    member_id: me.id, name: me.name, ava: me.ava, chat_id: chatId,
    text: text || null, photo_id: photoId || null, poll: poll || null, reply_to: replyTo || null,
  });
export async function delMessage(id) {
  await supabase.from("reactions").delete().eq("message_id", id);
  await supabase.from("votes").delete().eq("message_id", id);
  await supabase.from("messages").delete().eq("id", id);
}
export async function toggleReaction(mid, me, emoji) {
  const { data } = await supabase.from("reactions").select("emoji")
    .eq("message_id", mid).eq("member_id", me.id).eq("emoji", emoji);
  if (data && data.length)
    await supabase.from("reactions").delete().eq("message_id", mid).eq("member_id", me.id).eq("emoji", emoji);
  else
    await supabase.from("reactions").insert({ message_id: mid, member_id: me.id, emoji });
}
export const setVote = (mid, me, choice) =>
  supabase.from("votes").upsert({ message_id: mid, member_id: me.id, choice });

/* ── Realtime ─────────────────────────────────────────── */
export function subscribeChat(cb) {
  const ch = supabase.channel("rt-chat")
    .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, cb)
    .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, cb)
    .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, cb)
    .subscribe();
  return () => supabase.removeChannel(ch);
}
export function subscribeChats(cb) {
  const ch = supabase.channel("rt-chats")
    .on("postgres_changes", { event: "*", schema: "public", table: "chats" }, cb)
    .subscribe();
  return () => supabase.removeChannel(ch);
}
export function subscribeData(cb) {
  const ch = supabase.channel("rt-data")
    .on("postgres_changes", { event: "*", schema: "public", table: "runs" }, cb)
    .on("postgres_changes", { event: "*", schema: "public", table: "events" }, cb)
    .subscribe();
  return () => supabase.removeChannel(ch);
}

/* ── Участники (профиль: имя + аватар эмодзи/фото) ────── */
export async function listMembers() {
  const { data } = await supabase.from("members").select("*");
  const map = {};
  (data || []).forEach(m => { map[m.id] = { id: m.id, name: m.name, ava: m.ava, photoId: m.photo_id }; });
  return map;
}
export const upsertMember = m =>
  supabase.from("members").upsert({
    id: m.id, name: m.name, ava: m.ava || null, photo_id: m.photoId || null,
    updated_at: new Date().toISOString(),
  });
export function subscribeMembers(cb) {
  const ch = supabase.channel("rt-members")
    .on("postgres_changes", { event: "*", schema: "public", table: "members" }, cb)
    .subscribe();
  return () => supabase.removeChannel(ch);
}
