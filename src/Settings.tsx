import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

export function Settings() {
  const settings = useQuery(api.settings.get);
  const updateSettings = useMutation(api.settings.update);
  const [submitting, setSubmitting] = useState(false);
  const [hwid, setHwid] = useState<string>("Reading hardware ID...");
  
  const [form, setForm] = useState({
    shopName: "",
    gstApplicable: false,
    gstRate: "0",
    gstNumber: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        shopName: settings.shopName || "",
        gstApplicable: settings.gstApplicable || false,
        gstRate: String(settings.gstRate || 0),
        gstNumber: settings.gstNumber || "",
      });
    }
  }, [settings]);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getHWID().then(id => setHwid(id));
    } else {
      setHwid("Web Browser Mode (Not Locked)");
    }
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateSettings({
        shopName: form.shopName,
        gstApplicable: form.gstApplicable,
        gstRate: parseFloat(form.gstRate) || 0,
        gstNumber: form.gstNumber,
      });
      toast.success("Settings saved successfully");
    } catch (err) {
      toast.error("Failed to save settings");
    }
    setSubmitting(false);
  }

  return (
    <div className="p-4 md:p-8 overflow-y-auto h-full bg-surface">
      <div className="max-w-2xl mx-auto space-y-6">
        
        <div>
          <h2 className="text-xl font-bold text-accent">Shop Settings & Billing</h2>
          <p className="text-sm text-secondary">Configure your SaaS POS details</p>
        </div>

        <form onSubmit={handleSave} className="bg-white rounded-container shadow p-6 border border-gray-200">
          <h3 className="font-semibold text-accent mb-4 border-b pb-2">Business Details</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-accent mb-1">Shop Name *</label>
              <input required value={form.shopName} onChange={e => setForm({...form, shopName: e.target.value})}
                className="w-full px-3 py-2 border rounded-secondary focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
            </div>

            <div className="flex items-center gap-3">
              <input type="checkbox" id="gstOn" checked={form.gstApplicable} 
                onChange={e => setForm({...form, gstApplicable: e.target.checked})}
                className="w-4 h-4 text-primary focus:ring-primary rounded" />
              <label htmlFor="gstOn" className="text-sm font-medium text-accent">GST Applicable (Include tax in bills)</label>
            </div>

            {form.gstApplicable && (
              <div className="grid grid-cols-2 gap-4 bg-surface p-4 rounded-secondary">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">GST Percentage (%) *</label>
                  <input required type="number" step="0.1" value={form.gstRate} onChange={e => setForm({...form, gstRate: e.target.value})}
                    className="w-full px-3 py-2 border rounded-secondary text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">GSTIN Number</label>
                  <input type="text" value={form.gstNumber} onChange={e => setForm({...form, gstNumber: e.target.value})}
                    placeholder="22AAAAA0000A1Z5" className="w-full px-3 py-2 border rounded-secondary text-sm" />
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end pt-4 border-t">
            <button type="submit" disabled={submitting} 
              className="px-6 py-2 bg-primary text-white font-medium rounded-secondary shadow hover:bg-primary-hover active:scale-95 transition-all">
              Save Settings
            </button>
          </div>
        </form>

        <div className="bg-white rounded-container shadow p-6 border border-gray-200">
          <h3 className="font-semibold text-accent mb-4 border-b pb-2">SaaS License & System</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-secondary">Account Status</p>
              <p className="text-sm font-bold text-green-700">Active Subscription</p>
            </div>
            <div>
              <p className="text-xs font-medium text-secondary">Hardware Lock ID (Bound PC)</p>
              <p className="text-sm font-mono bg-surface p-2 rounded text-accent tracking-tight">{hwid}</p>
            </div>
            <p className="text-xs text-secondary mt-2">
              Note: This POS is licensed exactly to this device. Do not distribute the .exe directly.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
