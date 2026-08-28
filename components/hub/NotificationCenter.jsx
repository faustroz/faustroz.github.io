"use client";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { requireSupabase } from "@/lib/supabase/client";
export default function NotificationCenter() {
 const [items, setItems] = useState([]); const [open, setOpen] = useState(false);
 useEffect(() => { let live = true; (async () => { try { const client = requireSupabase(); const { data } = await client.from("hub_notifications").select("*").is("read_at", null).order("created_at", { ascending: false }).limit(12); if (live) setItems(data || []); } catch {} })(); return () => { live = false; }; }, []);
 const markRead = async (id) => { await requireSupabase().from("hub_notifications").update({ read_at: new Date().toISOString() }).eq("id", id); setItems((all) => all.filter((item) => item.id !== id)); };
 return <div className="hub-notification-center"><button type="button" onClick={() => setOpen(!open)} aria-label="Open private notifications"><Bell />{items.length > 0 && <b>{items.length}</b>}</button>{open && <section><header><span>PRIVATE ALERTS</span><button type="button" onClick={() => { if ("Notification" in window) Notification.requestPermission(); }}>ENABLE PWA</button></header>{items.length ? items.map((item) => <button key={item.id} type="button" onClick={() => markRead(item.id)}><strong>{item.title}</strong><small>{item.body}</small></button>) : <p>NO ACTIVE ALERTS</p>}</section>}</div>;
}
