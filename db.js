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

/* ── Чат: сообщения + реакции + голоса ────────────────── */
export async function loadChat() {
  const [{ data: msgs }, { data: rx }, { data: vt }] = await Promise.all([
    supabase.from("messages").select("*").order("created_at").limit(200),
    supabase.from("reactions").select("*"),
    supabase.from("votes").select("*"),
  ]);
  const rmap = {}, vmap = {};
  (rx || []).forEach(r => {
    (rmap[r.message_id] = rmap[r.message_id] || {});
    (rmap[r.message_id][r.emoji] = rmap[r.message_id][r.emoji] || []).push(r.member_id);
  });
  (vt || []).forEach(v => { (vmap[v.message_id] = vmap[v.message_id] || {})[v.member_id] = v.choice; });
  return (msgs || []).map(m => ({
    id: m.id, uid: m.member_id, name: m.name, ava: m.ava, text: m.text,
    photoId: m.photo_id, ts: new Date(m.created_at).getTime(),
    reactions: rmap[m.id] || {},
    poll: m.poll ? { ...m.poll, votes: vmap[m.id] || {} } : undefined,
  }));
}
export const addMessage = (me, text, photoId, poll) =>
  supabase.from("messages").insert({
    member_id: me.id, name: me.name, ava: me.ava,
    text: text || null, photo_id: photoId || null, poll: poll || null,
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
export function subscribeData(cb) {
  const ch = supabase.channel("rt-data")
    .on("postgres_changes", { event: "*", schema: "public", table: "runs" }, cb)
    .on("postgres_changes", { event: "*", schema: "public", table: "events" }, cb)
    .subscribe();
  return () => supabase.removeChannel(ch);
}
