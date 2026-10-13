"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { programDay, totalProgramDays, todayISO, formatDisplay, DEFAULT_START, DEFAULT_END } from "@/lib/dates";
import {
  LayoutDashboard, ListTodo, Clock, ClipboardList, Target, Repeat,
  Dumbbell, Wallet, TrendingUp, BarChart3, LogOut, Plus, X, Check
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell
} from "recharts";

type Profile = { id: string; email: string | null; full_name: string | null; program_start: string; program_end: string };
type Task = { id: string; title: string; domain: string; priority: string; impact: number; status: string; planned_date: string | null; is_priority_slot: boolean };
type DailyRecord = {
  id?: string; record_date: string; intent?: string; deep_work_hours: number; learning_hours: number;
  dsa_count: number; fitness_done: boolean; sports_done: boolean; content_done: boolean;
  energy: number; wake_on_time: boolean; no_social: boolean; expense_logged: boolean;
  accomplishments?: string; lesson?: string; tomorrow_priority?: string; journal?: string;
  score: number; submitted: boolean;
};
type TimeEntry = { id: string; entry_date: string; hour_slot: number | null; category: string; title: string; productivity: number | null };
type Habit = { id: string; name: string; domain: string };
type HabitLog = { habit_id: string; log_date: string; completed: boolean };
type Goal = { id: string; title: string; domain: string; current_value: number; target_value: number; status: string };
type Workout = { id: string; workout_date: string; activity_type: string; duration_min: number | null; notes: string | null };
type Expense = { id: string; expense_date: string; amount: number; category: string };
type Holding = { id: string; symbol: string; name: string; quantity: number; avg_cost: number; current_price: number; asset_class: string };

const DOMAINS = ["Career", "DSA", "Learning", "Fitness", "Sports", "Content", "Finance", "Personal"];
const HOURS = Array.from({ length: 18 }, (_, i) => i + 5);
const COLORS = ["#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#f43f5e", "#06b6d4", "#64748b", "#a78bfa"];

export default function LifeOSApp() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [view, setView] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [syncMsg, setSyncMsg] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [daily, setDaily] = useState<DailyRecord | null>(null);
  const [dailyHistory, setDailyHistory] = useState<DailyRecord[]>([]);
  const [hourly, setHourly] = useState<TimeEntry[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [modal, setModal] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const today = todayISO();
  const start = profile?.program_start || DEFAULT_START;
  const end = profile?.program_end || DEFAULT_END;
  const dayNum = programDay(start);
  const totalDays = totalProgramDays(start, end);

  const flash = (m: string) => { setSyncMsg(m); setTimeout(() => setSyncMsg(""), 2500); };

  const loadAll = useCallback(async (uid: string) => {
    const [
      { data: prof },
      { data: t },
      { data: d },
      { data: dh },
      { data: te },
      { data: h },
      { data: hl },
      { data: g },
      { data: w },
      { data: e },
      { data: inv },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).single(),
      supabase.from("tasks").select("*").eq("user_id", uid).eq("planned_date", today).order("created_at"),
      supabase.from("daily_records").select("*").eq("user_id", uid).eq("record_date", today).maybeSingle(),
      supabase.from("daily_records").select("*").eq("user_id", uid).eq("submitted", true).order("record_date", { ascending: true }).limit(60),
      supabase.from("time_entries").select("*").eq("user_id", uid).eq("entry_date", today).order("hour_slot"),
      supabase.from("habits").select("*").eq("user_id", uid).eq("is_active", true),
      supabase.from("habit_logs").select("*").eq("user_id", uid).eq("log_date", today),
      supabase.from("goals").select("*").eq("user_id", uid).order("created_at"),
      supabase.from("workouts").select("*").eq("user_id", uid).order("workout_date", { ascending: false }).limit(30),
      supabase.from("expenses").select("*").eq("user_id", uid).order("expense_date", { ascending: false }).limit(50),
      supabase.from("investment_holdings").select("*").eq("user_id", uid),
    ]);
    if (prof) setProfile(prof as Profile);
    setTasks((t as Task[]) || []);
    setDaily((d as DailyRecord) || {
      record_date: today, deep_work_hours: 0, learning_hours: 0, dsa_count: 0,
      fitness_done: false, sports_done: false, content_done: false, energy: 3,
      wake_on_time: false, no_social: false, expense_logged: false, score: 0, submitted: false,
    });
    setDailyHistory((dh as DailyRecord[]) || []);
    setHourly((te as TimeEntry[]) || []);
    setHabits((h as Habit[]) || []);
    setHabitLogs((hl as HabitLog[]) || []);
    setGoals((g as Goal[]) || []);
    setWorkouts((w as Workout[]) || []);
    setExpenses((e as Expense[]) || []);
    setHoldings((inv as Holding[]) || []);
  }, [supabase, today]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      await loadAll(user.id);
      setLoading(false);
    })();
  }, [supabase, loadAll]);

  const todayScore = useMemo(() => {
    const completed = tasks.filter((t) => t.status === "completed").length;
    const total = Math.max(tasks.length, 1);
    const habitDone = habitLogs.filter((l) => l.completed).length;
    const habitTotal = Math.max(habits.length, 1);
    return Math.min(100, Math.round((completed / total) * 60 + (habitDone / habitTotal) * 40));
  }, [tasks, habits, habitLogs]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function addTask() {
    if (!userId || !form.title) return;
    const { error } = await supabase.from("tasks").insert({
      user_id: userId, title: form.title, domain: form.domain || "Personal",
      priority: form.priority || "Medium", impact: parseInt(form.impact || "3"),
      status: "planned", planned_date: today, is_priority_slot: form.priority === "High",
    });
    if (error) { flash("Error: " + error.message); return; }
    setForm({}); setModal(null); flash("Task saved · synced");
    await loadAll(userId);
  }

  async function toggleTask(task: Task) {
    if (!userId) return;
    const next = task.status === "completed" ? "planned" : task.status === "planned" ? "in_progress" : "completed";
    const { error } = await supabase.from("tasks").update({
      status: next, completed_at: next === "completed" ? new Date().toISOString() : null, updated_at: new Date().toISOString(),
    }).eq("id", task.id);
    if (error) { flash(error.message); return; }
    flash("Updated · synced");
    await loadAll(userId);
  }

  async function addHabit() {
    if (!userId || !form.name) return;
    const { error } = await supabase.from("habits").insert({ user_id: userId, name: form.name, domain: form.domain || "Personal" });
    if (error) { flash(error.message); return; }
    setForm({}); setModal(null); flash("Habit saved · synced");
    await loadAll(userId);
  }

  async function toggleHabit(habitId: string) {
    if (!userId) return;
    const existing = habitLogs.find((l) => l.habit_id === habitId);
    if (existing) {
      await supabase.from("habit_logs").update({ completed: !existing.completed }).eq("habit_id", habitId).eq("log_date", today);
    } else {
      await supabase.from("habit_logs").insert({ user_id: userId, habit_id: habitId, log_date: today, completed: true });
    }
    flash("Habit logged · synced");
    await loadAll(userId);
  }

  async function saveHourly() {
    if (!userId || !form.activity) return;
    const hour = parseInt(form.hour || "9");
    await supabase.from("time_entries").delete().eq("user_id", userId).eq("entry_date", today).eq("hour_slot", hour);
    const { error } = await supabase.from("time_entries").insert({
      user_id: userId, entry_date: today, hour_slot: hour, category: form.domain || "Other",
      title: form.activity, productivity: parseInt(form.productivity || "3"), duration_min: 60,
    });
    if (error) { flash(error.message); return; }
    setForm({}); setModal(null); flash("Hour logged · synced");
    await loadAll(userId);
  }

   async function submitDaily() {
    if (!userId || !daily) return;
    const { id: _id, ...rest } = daily as DailyRecord & { id?: string };
    const payload = {
      ...rest,
      user_id: userId,
      record_date: today,
      score: todayScore,
      submitted: true,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("daily_records").upsert(payload, { onConflict: "user_id,record_date" });
    if (error) { flash(error.message); return; }
    flash("Daily record submitted · synced to cloud");
    await loadAll(userId);
    setView("dashboard");
  }

  async function addWorkout() {
    if (!userId || !form.sport) return;
    const { error } = await supabase.from("workouts").insert({
      user_id: userId, workout_date: today, activity_type: form.sport,
      duration_min: parseInt(form.duration || "30"), notes: form.notes || null,
    });
    if (error) { flash(error.message); return; }
    setForm({}); setModal(null); flash("Workout saved · synced");
    await loadAll(userId);
  }

  async function addExpense() {
    if (!userId || !form.amount) return;
    const { error } = await supabase.from("expenses").insert({
      user_id: userId, expense_date: today, amount: parseFloat(form.amount),
      category: form.category || "Other", notes: form.notes || null,
    });
    if (error) { flash(error.message); return; }
    setForm({}); setModal(null); flash("Expense saved · synced");
    await loadAll(userId);
  }

  async function addHolding() {
    if (!userId || !form.symbol) return;
    const { error } = await supabase.from("investment_holdings").insert({
      user_id: userId, symbol: form.symbol.toUpperCase(), name: form.name || form.symbol,
      quantity: parseFloat(form.qty || "1"), avg_cost: parseFloat(form.avg || "0"),
      current_price: parseFloat(form.current || form.avg || "0"), asset_class: form.assetType || "Equity",
    });
    if (error) { flash(error.message); return; }
    setForm({}); setModal(null); flash("Holding saved · synced");
    await loadAll(userId);
  }

  async function addGoal() {
    if (!userId || !form.title) return;
    const { error } = await supabase.from("goals").insert({
      user_id: userId, title: form.title, domain: form.domain || "Career",
      target_value: parseFloat(form.target || "100"), current_value: 0, status: "not_started",
    });
    if (error) { flash(error.message); return; }
    setForm({}); setModal(null); flash("Goal saved · synced");
    await loadAll(userId);
  }

  const invested = holdings.reduce((s, h) => s + Number(h.quantity) * Number(h.avg_cost), 0);
  const currentVal = holdings.reduce((s, h) => s + Number(h.quantity) * Number(h.current_price), 0);
  const pnl = currentVal - invested;
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;

  const chartScores = dailyHistory.map((d) => ({ date: d.record_date.slice(5), score: d.score }));
  const chartHours = dailyHistory.map((d) => ({ date: d.record_date.slice(5), deep: Number(d.deep_work_hours), learn: Number(d.learning_hours) }));

  const nav = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "today", label: "Today", icon: ListTodo },
    { id: "hourly", label: "Hourly", icon: Clock },
    { id: "daily", label: "Daily Close", icon: ClipboardList },
    { id: "goals", label: "Goals", icon: Target },
    { id: "habits", label: "Habits", icon: Repeat },
    { id: "fitness", label: "Fitness", icon: Dumbbell },
    { id: "finance", label: "Finance", icon: Wallet },
    { id: "investments", label: "Investments", icon: TrendingUp },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">Loading LIFE OS…</div>;
  }

  const Empty = ({ msg }: { msg: string }) => <div className="text-center py-10 text-slate-500 text-sm">{msg}</div>;

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      <aside className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col fixed h-full z-40">
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center font-bold text-sm">LO</div>
          <div>
            <div className="font-semibold text-sm">LIFE OS 365</div>
            <div className="text-[10px] text-slate-400">Cloud synced</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2 text-sm">
          {nav.map((n) => (
            <button key={n.id} onClick={() => setView(n.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${view === n.id ? "bg-sky-500/15 text-sky-400 border-l-2 border-sky-500" : "text-slate-300 hover:bg-slate-800/60"}`}>
              <n.icon className="w-4 h-4" />{n.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800 text-xs space-y-2">
          <div className="font-medium truncate">{profile?.full_name || profile?.email || "User"}</div>
          <div className="text-slate-400">Day {dayNum} / {totalDays}</div>
          {syncMsg && <div className="text-emerald-400 text-[11px]">{syncMsg}</div>}
          <button onClick={signOut} className="flex items-center gap-1 text-slate-400 hover:text-white"><LogOut className="w-3 h-3" /> Sign out</button>
        </div>
      </aside>

      <main className="flex-1 ml-56">
        <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur border-b border-slate-800 px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{nav.find((n) => n.id === view)?.label}</h1>
            <p className="text-xs text-slate-400">{formatDisplay(today)} · Day {dayNum}/{totalDays}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] text-slate-400">Today score</div>
              <div className="text-xl font-bold text-sky-400">{todayScore}%</div>
            </div>
            <button onClick={() => setModal("task")} className="bg-sky-600 hover:bg-sky-500 text-white text-sm px-4 py-2 rounded-lg flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </header>

        <div className="p-6">
          {view === "dashboard" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Today score", value: `${todayScore}%`, sub: tasks.length ? "From your tasks" : "No tasks yet" },
                  { label: "Days submitted", value: dailyHistory.length, sub: "Cloud records" },
                  { label: "Tasks today", value: `${tasks.filter((t) => t.status === "completed").length}/${tasks.length}`, sub: "Completed" },
                  { label: "Days left", value: Math.max(0, totalDays - dayNum), sub: `${Math.round((dayNum / totalDays) * 100)}% of program` },
                ].map((c) => (
                  <div key={c.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="text-xs text-slate-400">{c.label}</div>
                    <div className="text-2xl font-bold mt-1">{c.value}</div>
                    <div className="text-[10px] text-slate-500 mt-1">{c.sub}</div>
                  </div>
                ))}
              </div>
              {dailyHistory.length === 0 && tasks.length === 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
                  <p className="font-medium mb-2">Your 365-day system is ready</p>
                  <p className="text-sm text-slate-400 mb-4">Program {formatDisplay(start)} → {formatDisplay(end)}. All metrics start at zero. Data syncs to Supabase across devices.</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button onClick={() => setView("today")} className="px-4 py-2 bg-sky-600 rounded-lg text-sm">Add tasks</button>
                    <button onClick={() => setView("daily")} className="px-4 py-2 bg-slate-800 rounded-lg text-sm">Daily close</button>
                    <button onClick={() => setView("fitness")} className="px-4 py-2 bg-slate-800 rounded-lg text-sm">Log workout</button>
                  </div>
                </div>
              )}
              {chartScores.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold mb-3">Score trend (submitted days only)</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartScores}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                        <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} />
                        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
                        <Line type="monotone" dataKey="score" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              {goals.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold mb-3">Goals</h3>
                  {goals.map((g) => {
                    const pct = Math.min(100, Math.round((Number(g.current_value) / Math.max(Number(g.target_value), 1)) * 100));
                    return (
                      <div key={g.id} className="mb-3">
                        <div className="flex justify-between text-xs mb-1"><span>{g.title}</span><span>{pct}%</span></div>
                        <div className="h-1.5 bg-slate-800 rounded-full"><div className="h-full bg-sky-500 rounded-full" style={{ width: `${pct}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {view === "today" && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex justify-between mb-3">
                  <h3 className="text-sm font-semibold">Tasks · {formatDisplay(today)}</h3>
                  <button onClick={() => setModal("task")} className="text-xs text-sky-400">+ Task</button>
                </div>
                {tasks.length === 0 ? <Empty msg="No tasks. Add your priorities for today." /> : tasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-800/50 cursor-pointer" onClick={() => toggleTask(t)}>
                    <div className={`w-5 h-5 rounded border flex items-center justify-center text-xs ${t.status === "completed" ? "bg-emerald-500 border-emerald-500" : t.status === "in_progress" ? "border-amber-500 text-amber-400" : "border-slate-600"}`}>
                      {t.status === "completed" ? "✓" : t.status === "in_progress" ? "~" : ""}
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm ${t.status === "completed" ? "line-through text-slate-500" : ""}`}>{t.title}</div>
                      <div className="text-[11px] text-slate-500">{t.domain} · {t.priority} · impact {t.impact}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <div className="flex justify-between mb-3">
                    <h3 className="text-sm font-semibold">Habits</h3>
                    <button onClick={() => setModal("habit")} className="text-xs text-sky-400">+ Habit</button>
                  </div>
                  {habits.length === 0 ? <Empty msg="No habits yet." /> : habits.map((h) => {
                    const done = habitLogs.find((l) => l.habit_id === h.id)?.completed;
                    return (
                      <div key={h.id} className="flex items-center justify-between py-2">
                        <span className="text-sm">{h.name}</span>
                        <button onClick={() => toggleHabit(h.id)} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${done ? "bg-emerald-500 border-emerald-500" : "border-slate-600"}`}>
                          {done ? <Check className="w-4 h-4" /> : ""}
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center">
                  <div className="text-3xl font-bold text-sky-400">{todayScore}%</div>
                  <div className="text-xs text-slate-400 mt-1">From live cloud data</div>
                  <button onClick={() => setView("daily")} className="mt-3 w-full py-2 text-sm bg-slate-800 rounded-lg">Daily close →</button>
                </div>
              </div>
            </div>
          )}

          {view === "hourly" && (
            <div className="space-y-4">
              <div className="flex justify-between">
                <p className="text-sm text-slate-400">Log each hour. Persisted to Supabase.</p>
                <button onClick={() => setModal("hourly")} className="bg-sky-600 text-white text-sm px-4 py-2 rounded-lg flex items-center gap-1"><Plus className="w-4 h-4" /> Log hour</button>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800/50 text-xs text-slate-400"><tr><th className="text-left p-3">Hour</th><th className="text-left p-3">Activity</th><th className="text-left p-3">Category</th><th className="text-left p-3">Focus</th></tr></thead>
                  <tbody>
                    {HOURS.map((h) => {
                      const e = hourly.find((x) => x.hour_slot === h);
                      return (
                        <tr key={h} className="border-t border-slate-800">
                          <td className="p-3 font-mono text-slate-400">{String(h).padStart(2, "0")}:00</td>
                          <td className="p-3">{e?.title || <span className="text-slate-600">—</span>}</td>
                          <td className="p-3">{e?.category || ""}</td>
                          <td className="p-3">{e?.productivity ? "★".repeat(e.productivity) : ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === "daily" && daily && (
            <div className="max-w-2xl bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <h3 className="font-semibold">End-of-day close · {formatDisplay(today)}</h3>
              <p className="text-xs text-slate-400">Submitted data is stored in Supabase and appears on all your devices.</p>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">Deep work (h)<input type="number" step="0.5" min="0" value={daily.deep_work_hours}
                  onChange={(e) => setDaily({ ...daily, deep_work_hours: +e.target.value })}
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" /></label>
                <label className="text-sm">Learning (h)<input type="number" step="0.5" min="0" value={daily.learning_hours}
                  onChange={(e) => setDaily({ ...daily, learning_hours: +e.target.value })}
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" /></label>
                <label className="text-sm">DSA problems<input type="number" min="0" value={daily.dsa_count}
                  onChange={(e) => setDaily({ ...daily, dsa_count: +e.target.value })}
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" /></label>
                <label className="text-sm">Energy 1–5<input type="range" min="1" max="5" value={daily.energy}
                  onChange={(e) => setDaily({ ...daily, energy: +e.target.value })} className="mt-2 w-full" /></label>
              </div>
              <div className="space-y-2 text-sm">
                {([
                  ["fitness_done", "Workout completed"],
                  ["sports_done", "Sports activity"],
                  ["content_done", "Content progressed"],
                  ["wake_on_time", "Woke on time"],
                  ["no_social", "No unnecessary social media"],
                  ["expense_logged", "Expenses logged"],
                ] as const).map(([k, label]) => (
                  <label key={k} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={!!daily[k]} onChange={(e) => setDaily({ ...daily, [k]: e.target.checked })} className="accent-sky-500" />
                    {label}
                  </label>
                ))}
              </div>
              <label className="text-sm block">Accomplishments
                <textarea value={daily.accomplishments || ""} onChange={(e) => setDaily({ ...daily, accomplishments: e.target.value })}
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" rows={2} /></label>
              <label className="text-sm block">Tomorrow priority
                <input value={daily.tomorrow_priority || ""} onChange={(e) => setDaily({ ...daily, tomorrow_priority: e.target.value })}
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" /></label>
              <button onClick={submitDaily} className="w-full py-3 bg-sky-600 hover:bg-sky-500 rounded-lg font-medium">
                Submit daily record · score {todayScore}%
              </button>
              {daily.submitted && <p className="text-xs text-emerald-400 text-center">Already submitted today — re-submit updates the cloud record.</p>}
            </div>
          )}

          {view === "goals" && (
            <div className="space-y-4">
              <div className="flex justify-end"><button onClick={() => setModal("goal")} className="bg-sky-600 text-sm px-4 py-2 rounded-lg flex items-center gap-1"><Plus className="w-4 h-4" /> Goal</button></div>
              {goals.length === 0 ? <Empty msg="No goals in cloud yet." /> : (
                <div className="grid md:grid-cols-2 gap-4">
                  {goals.map((g) => {
                    const pct = Math.min(100, Math.round((Number(g.current_value) / Math.max(Number(g.target_value), 1)) * 100));
                    return (
                      <div key={g.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                        <div className="font-medium">{g.title}</div>
                        <div className="text-xs text-slate-400 mt-1">{g.domain} · {g.status}</div>
                        <div className="h-2 bg-slate-800 rounded-full mt-3"><div className="h-full bg-sky-500 rounded-full" style={{ width: `${pct}%` }} /></div>
                        <div className="text-xs text-slate-500 mt-1">{pct}%</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {view === "habits" && (
            <div className="space-y-4">
              <div className="flex justify-end"><button onClick={() => setModal("habit")} className="bg-sky-600 text-sm px-4 py-2 rounded-lg flex items-center gap-1"><Plus className="w-4 h-4" /> Habit</button></div>
              {habits.length === 0 ? <Empty msg="No habits yet." /> : (
                <div className="grid md:grid-cols-3 gap-4">
                  {habits.map((h) => {
                    const done = habitLogs.find((l) => l.habit_id === h.id)?.completed;
                    return (
                      <div key={h.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex justify-between items-center">
                        <span className="text-sm font-medium">{h.name}</span>
                        <button onClick={() => toggleHabit(h.id)} className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${done ? "bg-emerald-500 border-emerald-500" : "border-slate-600"}`}>
                          {done ? "✓" : ""}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {view === "fitness" && (
            <div className="space-y-4">
              <div className="flex justify-between">
                <p className="text-sm text-slate-400">Workouts stored in Supabase.</p>
                <button onClick={() => setModal("workout")} className="bg-sky-600 text-sm px-4 py-2 rounded-lg flex items-center gap-1"><Plus className="w-4 h-4" /> Workout</button>
              </div>
              {workouts.length === 0 ? <Empty msg="No workouts logged." /> : (
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800/50 text-xs text-slate-400"><tr><th className="text-left p-3">Date</th><th className="text-left p-3">Type</th><th className="text-right p-3">Min</th><th className="text-left p-3">Notes</th></tr></thead>
                    <tbody>
                      {workouts.map((w) => (
                        <tr key={w.id} className="border-t border-slate-800">
                          <td className="p-3">{w.workout_date}</td>
                          <td className="p-3 font-medium">{w.activity_type}</td>
                          <td className="p-3 text-right">{w.duration_min ?? "—"}</td>
                          <td className="p-3 text-slate-400">{w.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {view === "finance" && (
            <div className="space-y-4">
              <div className="flex justify-between">
                <p className="text-sm text-slate-400">Expenses · private per account (RLS).</p>
                <button onClick={() => setModal("expense")} className="bg-sky-600 text-sm px-4 py-2 rounded-lg flex items-center gap-1"><Plus className="w-4 h-4" /> Expense</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs text-slate-400">Expenses (listed)</div>
                  <div className="text-xl font-bold">₹{expenses.reduce((s, e) => s + Number(e.amount), 0).toLocaleString("en-IN")}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs text-slate-400">Entries</div>
                  <div className="text-xl font-bold">{expenses.length}</div>
                </div>
              </div>
              {expenses.length === 0 ? <Empty msg="No expenses yet." /> : (
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800/50 text-xs text-slate-400"><tr><th className="text-left p-3">Date</th><th className="text-left p-3">Category</th><th className="text-right p-3">Amount</th></tr></thead>
                    <tbody>
                      {expenses.map((e) => (
                        <tr key={e.id} className="border-t border-slate-800">
                          <td className="p-3">{e.expense_date}</td>
                          <td className="p-3">{e.category}</td>
                          <td className="p-3 text-right text-rose-400">₹{Number(e.amount).toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {view === "investments" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="text-xs text-slate-400">Invested</div><div className="text-xl font-bold">₹{invested.toLocaleString("en-IN")}</div></div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="text-xs text-slate-400">Current</div><div className="text-xl font-bold">₹{currentVal.toLocaleString("en-IN")}</div></div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="text-xs text-slate-400">P&L</div><div className={`text-xl font-bold ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{holdings.length ? `${pnl >= 0 ? "+" : ""}₹${pnl.toLocaleString("en-IN")}` : "—"}</div></div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="text-xs text-slate-400">Return</div><div className={`text-xl font-bold ${pnlPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{holdings.length ? `${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}%` : "—"}</div></div>
              </div>
              <div className="flex justify-end"><button onClick={() => setModal("holding")} className="bg-sky-600 text-sm px-4 py-2 rounded-lg flex items-center gap-1"><Plus className="w-4 h-4" /> Holding</button></div>
              {holdings.length === 0 ? <Empty msg="No holdings. Add equity / MF / ETF." /> : (
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800/50 text-xs text-slate-400"><tr><th className="text-left p-3">Symbol</th><th className="text-left p-3">Name</th><th className="text-right p-3">Qty</th><th className="text-right p-3">Avg</th><th className="text-right p-3">LTP</th><th className="text-right p-3">P&L%</th></tr></thead>
                    <tbody>
                      {holdings.map((h) => {
                        const cost = Number(h.quantity) * Number(h.avg_cost);
                        const val = Number(h.quantity) * Number(h.current_price);
                        const p = cost > 0 ? ((val - cost) / cost) * 100 : 0;
                        return (
                          <tr key={h.id} className="border-t border-slate-800">
                            <td className="p-3 text-sky-400 font-medium">{h.symbol}</td>
                            <td className="p-3">{h.name}</td>
                            <td className="p-3 text-right">{h.quantity}</td>
                            <td className="p-3 text-right">₹{h.avg_cost}</td>
                            <td className="p-3 text-right">₹{h.current_price}</td>
                            <td className={`p-3 text-right ${p >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{p >= 0 ? "+" : ""}{p.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {view === "analytics" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center"><div className="text-2xl font-bold text-sky-400">{dailyHistory.length ? Math.round(dailyHistory.reduce((s, d) => s + d.score, 0) / dailyHistory.length) : 0}%</div><div className="text-xs text-slate-400">Avg score</div></div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center"><div className="text-2xl font-bold">{dailyHistory.reduce((s, d) => s + Number(d.deep_work_hours), 0).toFixed(1)}h</div><div className="text-xs text-slate-400">Deep work</div></div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center"><div className="text-2xl font-bold">{dailyHistory.reduce((s, d) => s + d.dsa_count, 0)}</div><div className="text-xs text-slate-400">DSA total</div></div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center"><div className="text-2xl font-bold">{workouts.length}</div><div className="text-xs text-slate-400">Workouts</div></div>
              </div>
              {chartScores.length > 0 ? (
                <>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <h3 className="text-sm font-semibold mb-3">Daily score (cloud)</h3>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartScores}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                          <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} />
                          <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
                          <Line type="monotone" dataKey="score" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <h3 className="text-sm font-semibold mb-3">Deep work vs learning hours</h3>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartHours}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                          <YAxis stroke="#64748b" fontSize={11} />
                          <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
                          <Bar dataKey="deep" fill="#0ea5e9" name="Deep work" />
                          <Bar dataKey="learn" fill="#8b5cf6" name="Learning" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              ) : (
                <Empty msg="Submit daily closes to build analytics charts. Charts only use real cloud data." />
              )}
              {holdings.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold mb-3">Portfolio allocation</h3>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={holdings.map((h) => ({ name: h.symbol, value: Number(h.quantity) * Number(h.current_price) }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                          {holdings.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between p-4 border-b border-slate-800">
              <h3 className="font-semibold capitalize">{modal}</h3>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-4 space-y-3">
              {modal === "task" && (
                <>
                  <input placeholder="Task title" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" autoFocus />
                  <select value={form.domain || "Personal"} onChange={(e) => setForm({ ...form, domain: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">{DOMAINS.map((d) => <option key={d}>{d}</option>)}</select>
                  <select value={form.priority || "Medium"} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"><option>High</option><option>Medium</option><option>Low</option></select>
                </>
              )}
              {modal === "habit" && <input placeholder="Habit name" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" autoFocus />}
              {modal === "goal" && (
                <>
                  <input placeholder="Goal title" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" autoFocus />
                  <select value={form.domain || "Career"} onChange={(e) => setForm({ ...form, domain: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">{DOMAINS.map((d) => <option key={d}>{d}</option>)}</select>
                </>
              )}
              {modal === "hourly" && (
                <>
                  <select value={form.hour || "9"} onChange={(e) => setForm({ ...form, hour: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">{HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}</select>
                  <input placeholder="Activity" value={form.activity || ""} onChange={(e) => setForm({ ...form, activity: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" autoFocus />
                  <select value={form.domain || "Other"} onChange={(e) => setForm({ ...form, domain: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">{DOMAINS.map((d) => <option key={d}>{d}</option>)}</select>
                </>
              )}
              {modal === "workout" && (
                <>
                  <input placeholder="Activity (CrossFit, Running…)" value={form.sport || ""} onChange={(e) => setForm({ ...form, sport: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" autoFocus />
                  <input type="number" placeholder="Duration (min)" value={form.duration || ""} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                </>
              )}
              {modal === "expense" && (
                <>
                  <input type="number" placeholder="Amount ₹" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" autoFocus />
                  <input placeholder="Category" value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                </>
              )}
              {modal === "holding" && (
                <>
                  <input placeholder="Symbol" value={form.symbol || ""} onChange={(e) => setForm({ ...form, symbol: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" autoFocus />
                  <input placeholder="Name" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" placeholder="Qty" value={form.qty || ""} onChange={(e) => setForm({ ...form, qty: e.target.value })} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                    <input type="number" placeholder="Avg" value={form.avg || ""} onChange={(e) => setForm({ ...form, avg: e.target.value })} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                    <input type="number" placeholder="LTP" value={form.current || ""} onChange={(e) => setForm({ ...form, current: e.target.value })} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </>
              )}
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-slate-300">Cancel</button>
              <button onClick={() => {
                if (modal === "task") addTask();
                else if (modal === "habit") addHabit();
                else if (modal === "goal") addGoal();
                else if (modal === "hourly") saveHourly();
                else if (modal === "workout") addWorkout();
                else if (modal === "expense") addExpense();
                else if (modal === "holding") addHolding();
              }} className="px-4 py-2 text-sm bg-sky-600 rounded-lg">Save · sync</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
