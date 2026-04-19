import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";
import {
  IconUsers, IconUser, IconPhone, IconPlus, IconEdit, IconX, IconDue, IconCheck,
  IconSearch, IconTrendingUp, IconCalendar,
} from "./icons";

export function Customers() {
  const customers = useQuery(api.customers.list) ?? [];
  const createCustomer = useMutation(api.customers.create);
  const updateCustomer = useMutation(api.customers.update);
  const clearDueMutation = useMutation(api.customers.clearDue);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<Id<"customers"> | null>(null);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [clearDueId, setClearDueId] = useState<Id<"customers"> | null>(null);
  const [clearAmount, setClearAmount] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "due" | "top">("all");
  const [selectedCustomer, setSelectedCustomer] = useState<Id<"customers"> | null>(null);

  const customerHistory = useQuery(
    api.customers.getWithHistory,
    selectedCustomer ? { id: selectedCustomer } : "skip"
  );

  const totalDue = customers.reduce((sum, c) => sum + c.dueBalance, 0);
  const totalSpent = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const withDue = customers.filter((c) => c.dueBalance > 0);

  const filtered = customers
    .filter((c) => {
      const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.mobile.includes(search);
      const matchFilter = filter === "all" || (filter === "due" && c.dueBalance > 0) || (filter === "top" && c.totalSpent > 0);
      return matchSearch && matchFilter;
    })
    .sort((a, b) => filter === "top" ? b.totalSpent - a.totalSpent : b._creationTime - a._creationTime);

  function openCreate() {
    setEditId(null); setName(""); setMobile(""); setEmail(""); setAddress(""); setNotes("");
    setShowForm(true);
  }

  function openEdit(c: (typeof customers)[0]) {
    setEditId(c._id); setName(c.name); setMobile(c.mobile);
    setEmail(c.email ?? ""); setAddress(c.address ?? ""); setNotes(c.notes ?? "");
    setShowForm(true);
  }

  async function handleSave() {
    if (!name.trim() || !mobile.trim()) { toast.error("Name and mobile required"); return; }
    try {
      if (editId) {
        await updateCustomer({
          id: editId, name: name.trim(), mobile: mobile.trim(),
          email: email || undefined, address: address || undefined, notes: notes || undefined,
        });
        toast.success("Customer updated");
      } else {
        await createCustomer({
          name: name.trim(), mobile: mobile.trim(),
          email: email || undefined, address: address || undefined, notes: notes || undefined,
        });
        toast.success("Customer added");
      }
      setShowForm(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function handleClearDue() {
    if (!clearDueId) return;
    const amt = parseFloat(clearAmount);
    if (!amt || amt <= 0) { toast.error("Enter valid amount"); return; }
    try {
      await clearDueMutation({ id: clearDueId, amount: amt });
      toast.success("Due cleared");
      setClearDueId(null); setClearAmount("");
    } catch { toast.error("Failed to clear due"); }
  }

  const selectedCust = selectedCustomer ? customers.find((c) => c._id === selectedCustomer) : null;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50">
      {/* Stats bar */}
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-600 text-white px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-base flex items-center gap-2">
            <IconUsers className="w-5 h-5" /> Customers
            <span className="bg-white/20 text-white text-xs rounded-full px-2 py-0.5">{customers.length}</span>
          </h2>
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-50 active:scale-95 transition-all shadow-md">
            <IconPlus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/15 rounded-xl p-2 text-center">
            <p className="text-lg font-bold">{customers.length}</p>
            <p className="text-indigo-200 text-xs">Total</p>
          </div>
          <div className="bg-white/15 rounded-xl p-2 text-center">
            <p className="text-lg font-bold text-red-300">₹{totalDue.toFixed(0)}</p>
            <p className="text-indigo-200 text-xs">Total Due</p>
          </div>
          <div className="bg-white/15 rounded-xl p-2 text-center">
            <p className="text-lg font-bold text-green-300">₹{totalSpent.toFixed(0)}</p>
            <p className="text-indigo-200 text-xs">Total Sales</p>
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="bg-white border-b px-3 py-2 flex-shrink-0 shadow-sm">
        <div className="relative mb-2">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or mobile..."
            className="w-full pl-9 pr-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50" />
        </div>
        <div className="flex gap-1.5">
          {[
            { id: "all" as const, label: `All (${customers.length})` },
            { id: "due" as const, label: `Due (${withDue.length})` },
            { id: "top" as const, label: "Top Spenders" },
          ].map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filter === f.id
                  ? f.id === "due" ? "bg-red-500 text-white shadow-md" : "bg-indigo-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Customer list */}
        <div className={`overflow-y-auto p-3 space-y-2 ${selectedCustomer ? "hidden md:block md:w-1/2 lg:w-2/5" : "w-full"}`}>
          {filtered.map((c) => (
            <div key={c._id}
              onClick={() => setSelectedCustomer(selectedCustomer === c._id ? null : c._id)}
              className={`bg-white rounded-2xl border-2 shadow-sm p-3 cursor-pointer transition-all active:scale-[0.99] ${
                selectedCustomer === c._id ? "border-indigo-400 shadow-md bg-indigo-50" : "border-transparent hover:border-indigo-200 hover:shadow-md"
              }`}>
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold text-white text-base shadow-sm ${
                  c.dueBalance > 0 ? "bg-gradient-to-br from-red-400 to-red-500" : "bg-gradient-to-br from-indigo-400 to-indigo-600"
                }`}>
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-800 text-sm">{c.name}</p>
                    {c.dueBalance > 0 && (
                      <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
                        <IconDue className="w-3 h-3" />₹{c.dueBalance.toFixed(0)} due
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <IconPhone className="w-3 h-3" />{c.mobile}
                  </p>
                  <div className="flex gap-3 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-0.5">
                      <IconTrendingUp className="w-3 h-3 text-green-500" />₹{c.totalSpent.toFixed(0)}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <IconCalendar className="w-3 h-3 text-indigo-400" />{c.visitCount} visits
                    </span>
                    {c.lastVisit && (
                      <span className="text-gray-400">
                        {new Date(c.lastVisit).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  {c.dueBalance > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); setClearDueId(c._id); setClearAmount(""); }}
                      className="px-2 py-1 text-xs bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 font-medium whitespace-nowrap">
                      Clear Due
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <IconEdit className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <IconUsers className="w-14 h-14 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">No customers found</p>
              {search && <p className="text-xs mt-1">Try a different search</p>}
            </div>
          )}
        </div>

        {/* Customer Detail Panel */}
        {selectedCustomer && selectedCust && (
          <div className="flex-1 md:border-l bg-white overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between z-10 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${
                  selectedCust.dueBalance > 0 ? "bg-gradient-to-br from-red-400 to-red-500" : "bg-gradient-to-br from-indigo-400 to-indigo-600"
                }`}>
                  {selectedCust.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">{selectedCust.name}</p>
                  <p className="text-xs text-gray-400">{selectedCust.mobile}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCustomer(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-green-50 rounded-2xl p-3 text-center border border-green-100">
                  <p className="text-base font-bold text-green-700">₹{selectedCust.totalSpent.toFixed(0)}</p>
                  <p className="text-xs text-green-600 mt-0.5">Total Spent</p>
                </div>
                <div className="bg-indigo-50 rounded-2xl p-3 text-center border border-indigo-100">
                  <p className="text-base font-bold text-indigo-700">{selectedCust.visitCount}</p>
                  <p className="text-xs text-indigo-600 mt-0.5">Visits</p>
                </div>
                <div className={`rounded-2xl p-3 text-center border ${selectedCust.dueBalance > 0 ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"}`}>
                  <p className={`text-base font-bold ${selectedCust.dueBalance > 0 ? "text-red-600" : "text-gray-500"}`}>
                    ₹{selectedCust.dueBalance.toFixed(0)}
                  </p>
                  <p className={`text-xs mt-0.5 ${selectedCust.dueBalance > 0 ? "text-red-500" : "text-gray-400"}`}>Due Balance</p>
                </div>
              </div>

              {selectedCust.dueBalance > 0 && (
                <button onClick={() => { setClearDueId(selectedCust._id); setClearAmount(""); }}
                  className="w-full py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-2xl text-sm font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                  <IconDue className="w-4 h-4" /> Clear Due Balance
                </button>
              )}

              {selectedCust.email && (
                <div className="bg-gray-50 rounded-xl p-3 text-sm">
                  <span className="text-gray-400 text-xs">Email</span>
                  <p className="text-gray-700 font-medium">{selectedCust.email}</p>
                </div>
              )}
              {selectedCust.address && (
                <div className="bg-gray-50 rounded-xl p-3 text-sm">
                  <span className="text-gray-400 text-xs">Address</span>
                  <p className="text-gray-700 font-medium">{selectedCust.address}</p>
                </div>
              )}
              {selectedCust.notes && (
                <div className="bg-amber-50 rounded-xl p-3 text-sm border border-amber-100">
                  <span className="text-amber-600 text-xs font-medium">Notes</span>
                  <p className="text-gray-700 mt-0.5">{selectedCust.notes}</p>
                </div>
              )}

              {/* Purchase History */}
              <div>
                <h4 className="font-bold text-gray-700 text-sm mb-2 flex items-center gap-2">
                  <IconReceipt className="w-4 h-4 text-indigo-500" /> Purchase History
                </h4>
                {customerHistory?.sales && customerHistory.sales.length > 0 ? (
                  <div className="space-y-2">
                    {customerHistory.sales.map((sale) => (
                      <div key={sale._id} className="bg-gray-50 rounded-xl p-3 border">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs font-bold text-gray-700 font-mono">{sale.invoiceNumber}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(sale._creationTime).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-indigo-600">₹{sale.total.toFixed(2)}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              sale.status === "completed" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            }`}>{sale.status}</span>
                          </div>
                        </div>
                        {sale.items && sale.items.length > 0 && (
                          <div className="mt-2 space-y-0.5">
                            {sale.items.map((item) => (
                              <div key={item._id} className="flex justify-between text-xs text-gray-500">
                                <span className="truncate flex-1 mr-2">{item.productName} ×{item.quantity}</span>
                                <span>₹{item.total.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {sale.dueAdded && sale.dueAdded > 0 && (
                          <p className="text-xs text-red-500 mt-1 font-medium">Due added: ₹{sale.dueAdded.toFixed(2)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-300">
                    <p className="text-sm">No purchase history</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-5 w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4 sm:hidden" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 text-base">{editId ? "Edit Customer" : "New Customer"}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <IconX className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Full Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter full name"
                  className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mobile *</label>
                <input value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit mobile number" inputMode="numeric"
                  className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional"
                  className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Address</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Optional"
                  className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" rows={2}
                  className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-3 border rounded-2xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl text-sm font-bold hover:from-indigo-700 hover:to-indigo-800 active:scale-95 flex items-center justify-center gap-2 shadow-lg">
                <IconCheck className="w-4 h-4" />{editId ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Due Modal */}
      {clearDueId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <IconDue className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-bold text-gray-800 mb-1 text-center">Clear Due Balance</h3>
            <p className="text-xs text-gray-400 text-center mb-4">
              {customers.find((c) => c._id === clearDueId)?.name} — 
              Due: ₹{customers.find((c) => c._id === clearDueId)?.dueBalance.toFixed(2)}
            </p>
            <input type="text" inputMode="decimal" value={clearAmount} onChange={(e) => setClearAmount(e.target.value)}
              placeholder="Amount to clear (₹)"
              className="w-full px-3 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300 mb-4 text-center text-lg font-bold" />
            <div className="flex gap-2">
              <button onClick={() => setClearDueId(null)}
                className="flex-1 py-3 border rounded-2xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleClearDue}
                className="flex-1 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl text-sm font-bold hover:from-red-600 hover:to-red-700 active:scale-95 shadow-lg">
                Clear Due
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IconReceipt({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/>
      <path d="M8 7h8M8 11h8M8 15h4"/>
    </svg>
  );
}
