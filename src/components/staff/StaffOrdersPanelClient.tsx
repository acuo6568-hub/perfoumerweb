"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowsClockwise, CheckCircle, CurrencyCircleDollar, MapPin, SignOut, Truck, WarningCircle } from "@phosphor-icons/react";

type StaffOrdersPanelClientProps = {
  configured: boolean;
  initialAuthenticated: boolean;
};

type StaffOrder = {
  id: string;
  user_id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  currency: string;
  items_json: unknown;
  delivery_address_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type OrderLog = {
  id: string;
  order_id: string;
  actor_role: string;
  actor_username: string;
  action: string;
  reason?: string | null;
  details?: string | null;
  created_at: string;
};

type StatusTone = "neutral" | "success" | "error";

function toneClass(tone: StatusTone) {
  if (tone === "success") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (tone === "error") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

export function StaffOrdersPanelClient({ configured, initialAuthenticated }: StaffOrdersPanelClientProps) {
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [username, setUsername] = useState("staff");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<StaffOrder | null>(null);
  const [logs, setLogs] = useState<OrderLog[]>([]);
  const [nextStatus, setNextStatus] = useState("processing");
  const [nextTotal, setNextTotal] = useState("");
  const [nextAddress, setNextAddress] = useState("");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<{ tone: StatusTone; message: string } | null>(null);

  const selectedOrderSummary = useMemo(() => {
    if (!selectedOrder) return "";
    return `${selectedOrder.order_number} • ${selectedOrder.status}`;
  }, [selectedOrder]);

  const fetchOrders = async () => {
    if (!authenticated) return;

    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);

      const response = await fetch(`/api/staff/orders?${params.toString()}`, { method: "GET" });
      const payload = (await response.json()) as { error?: string; orders?: StaffOrder[] };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to load orders.");
      }

      const nextOrders = payload.orders || [];
      setOrders(nextOrders);
      if (!selectedOrderId && nextOrders.length) {
        setSelectedOrderId(nextOrders[0].id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load orders.";
      setStatus({ tone: "error", message });
    } finally {
      setBusy(false);
    }
  };

  const fetchOrderDetail = async (orderId: string) => {
    if (!orderId) {
      setSelectedOrder(null);
      setLogs([]);
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/staff/orders/${orderId}`, { method: "GET" });
      const payload = (await response.json()) as {
        error?: string;
        order?: StaffOrder;
        logs?: OrderLog[];
      };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to load order detail.");
      }

      const order = payload.order || null;
      setSelectedOrder(order);
      setLogs(payload.logs || []);
      setNextStatus(order?.status || "processing");
      setNextTotal(order ? String(order.total_amount ?? "") : "");
      setNextAddress(order?.delivery_address_json ? JSON.stringify(order.delivery_address_json, null, 2) : "");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load order detail.";
      setStatus({ tone: "error", message });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      void fetchOrders();
    }
  }, [authenticated]);

  useEffect(() => {
    if (authenticated) {
      void fetchOrderDetail(selectedOrderId);
    }
  }, [authenticated, selectedOrderId]);

  const refreshAll = async () => {
    await fetchOrders();
    if (selectedOrderId) {
      await fetchOrderDetail(selectedOrderId);
    }
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Login failed.");
      }

      setAuthenticated(true);
      setPassword("");
      setStatus({ tone: "success", message: "Staff session started." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed.";
      setStatus({ tone: "error", message });
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    try {
      await fetch("/api/staff/logout", { method: "POST" });
      setAuthenticated(false);
      setSelectedOrderId("");
      setSelectedOrder(null);
      setLogs([]);
      setOrders([]);
      setStatus({ tone: "success", message: "Logged out." });
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (action: "status_change" | "price_change" | "address_change" | "refund" | "cancel") => {
    if (!selectedOrder) {
      return;
    }

    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        action,
        reason,
        details,
      };

      if (action === "status_change") {
        payload.status = nextStatus;
      }

      if (action === "price_change") {
        payload.total_amount = Number(nextTotal);
      }

      if (action === "address_change") {
        payload.delivery_address_json = JSON.parse(nextAddress || "{}");
      }

      const response = await fetch(`/api/staff/orders/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as {
        error?: string;
        order?: StaffOrder;
        logs?: OrderLog[];
      };

      if (!response.ok) {
        throw new Error(result.error || "Action failed.");
      }

      setSelectedOrder(result.order || null);
      setLogs(result.logs || []);
      setStatus({ tone: "success", message: "Order updated and customer notified by email." });
      await fetchOrders();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Action failed.";
      setStatus({ tone: "error", message });
    } finally {
      setBusy(false);
    }
  };

  if (!configured) {
    return (
      <section className="rounded-3xl border border-zinc-200 bg-white p-8">
        <h1 className="text-2xl font-semibold text-zinc-900">Staff portal is not configured</h1>
        <p className="mt-2 text-sm text-zinc-600">Set STAFF_PASSWORD (or ADMIN_PASSWORD) in env and redeploy.</p>
      </section>
    );
  }

  if (!authenticated) {
    return (
      <section className="mx-auto max-w-xl rounded-3xl border border-zinc-200 bg-white p-8 shadow-[0_20px_48px_rgba(17,24,39,0.08)]">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-zinc-900">Staff handoff portal</h1>
        <p className="mt-2 text-sm text-zinc-600">Manage delivery, refunds, cancellations, address changes, and pricing updates.</p>
        <form className="mt-6 space-y-4" onSubmit={handleLogin}>
          <input className="h-11 w-full rounded-2xl border border-zinc-300 px-4" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username" />
          <input type="password" className="h-11 w-full rounded-2xl border border-zinc-300 px-4" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" />
          <button type="submit" className="inline-flex h-11 items-center rounded-full bg-zinc-900 px-5 text-sm font-semibold text-white" disabled={busy}>Sign in</button>
        </form>
        {status ? <p className={`mt-4 rounded-full border px-3 py-2 text-sm ${toneClass(status.tone)}`}>{status.message}</p> : null}
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_20px_48px_rgba(17,24,39,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.04em] text-zinc-950">Staff handoff & delivery operations</h1>
            <p className="mt-1 text-sm text-zinc-600">Track customer orders, update lifecycle states, and keep a full audit trail.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="inline-flex h-10 items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700" onClick={() => void refreshAll()} disabled={busy}><ArrowsClockwise size={15} />Refresh</button>
            <button type="button" className="inline-flex h-10 items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700" onClick={handleLogout} disabled={busy}><SignOut size={15} />Logout</button>
          </div>
        </div>
      </div>

      {status ? <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${toneClass(status.tone)}`}>{status.tone === "success" ? <CheckCircle size={15} /> : <WarningCircle size={15} />}{status.message}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-zinc-200 bg-white p-4">
          <div className="flex gap-2">
            <input className="h-10 flex-1 rounded-xl border border-zinc-300 px-3 text-sm" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order or customer" />
            <select className="h-10 rounded-xl border border-zinc-300 px-2 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          <button type="button" className="mt-2 h-9 rounded-full border border-zinc-300 px-4 text-sm" onClick={() => void fetchOrders()} disabled={busy}>Apply</button>

          <div className="mt-4 h-[64vh] overflow-y-auto space-y-2 pr-1">
            {orders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => setSelectedOrderId(order.id)}
                className={`w-full rounded-2xl border p-3 text-left ${selectedOrderId === order.id ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white"}`}
              >
                <p className="text-sm font-semibold">{order.order_number}</p>
                <p className="mt-1 text-xs opacity-80">{order.status} • {order.total_amount} {order.currency}</p>
              </button>
            ))}
          </div>
        </aside>

        <div className="space-y-5">
          <div className="rounded-3xl border border-zinc-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-zinc-900">Order detail</h2>
            {selectedOrder ? (
              <>
                <p className="mt-2 text-sm text-zinc-600">{selectedOrderSummary}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="text-sm">Status
                    <select className="mt-1 h-10 w-full rounded-xl border border-zinc-300 px-3" value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>
                      <option value="pending">pending</option>
                      <option value="processing">processing</option>
                      <option value="completed">completed</option>
                      <option value="shipped">shipped</option>
                      <option value="delivered">delivered</option>
                      <option value="cancelled">cancelled</option>
                      <option value="refunded">refunded</option>
                    </select>
                  </label>
                  <label className="text-sm">Total amount
                    <input className="mt-1 h-10 w-full rounded-xl border border-zinc-300 px-3" value={nextTotal} onChange={(event) => setNextTotal(event.target.value)} />
                  </label>
                </div>

                <label className="mt-3 block text-sm">Delivery address JSON
                  <textarea className="mt-1 min-h-28 w-full rounded-2xl border border-zinc-300 px-3 py-2 font-mono text-xs" value={nextAddress} onChange={(event) => setNextAddress(event.target.value)} />
                </label>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="text-sm">Reason
                    <input className="mt-1 h-10 w-full rounded-xl border border-zinc-300 px-3" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required for cancellation/refund" />
                  </label>
                  <label className="text-sm">Details for customer email
                    <input className="mt-1 h-10 w-full rounded-xl border border-zinc-300 px-3" value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Optional context" />
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="inline-flex h-10 items-center gap-2 rounded-full border border-zinc-300 px-4 text-sm" onClick={() => void runAction("status_change")} disabled={busy}><Truck size={14} />Update status</button>
                  <button className="inline-flex h-10 items-center gap-2 rounded-full border border-zinc-300 px-4 text-sm" onClick={() => void runAction("price_change")} disabled={busy}><CurrencyCircleDollar size={14} />Update price</button>
                  <button className="inline-flex h-10 items-center gap-2 rounded-full border border-zinc-300 px-4 text-sm" onClick={() => void runAction("address_change")} disabled={busy}><MapPin size={14} />Update address</button>
                  <button className="inline-flex h-10 items-center rounded-full border border-rose-300 bg-rose-50 px-4 text-sm font-semibold text-rose-700" onClick={() => void runAction("cancel")} disabled={busy}>Cancel order</button>
                  <button className="inline-flex h-10 items-center rounded-full border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-700" onClick={() => void runAction("refund")} disabled={busy}>Refund</button>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">Select an order to manage.</p>
            )}
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-zinc-900">Activity logs</h3>
            <p className="mt-1 text-sm text-zinc-500">All operational actions are recorded for staff/admin review.</p>
            <div className="mt-3 space-y-2">
              {logs.length ? logs.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-sm font-semibold text-zinc-800">{entry.action}</p>
                  <p className="mt-1 text-xs text-zinc-500">{entry.actor_role}/{entry.actor_username} • {new Date(entry.created_at).toLocaleString()}</p>
                  {entry.reason ? <p className="mt-1 text-sm text-zinc-700">Reason: {entry.reason}</p> : null}
                  {entry.details ? <p className="mt-1 text-sm text-zinc-700">Details: {entry.details}</p> : null}
                </div>
              )) : <p className="text-sm text-zinc-500">No logs yet for this order.</p>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
