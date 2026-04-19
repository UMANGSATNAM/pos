import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";
import { IconUser, IconPhone, IconX, IconPlus, IconDue, IconCheck } from "./icons";

interface CustomerSelectorProps {
  selectedCustomerId: Id<"customers"> | null;
  selectedCustomerName: string;
  selectedCustomerMobile: string;
  onSelect: (id: Id<"customers"> | null, name: string, mobile: string, due: number) => void;
}

export function CustomerSelector({
  selectedCustomerId,
  selectedCustomerName,
  selectedCustomerMobile,
  onSelect,
}: CustomerSelectorProps) {
  const [mobileInput, setMobileInput] = useState(selectedCustomerMobile);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [searching, setSearching] = useState(false);

  const customer = useQuery(
    api.customers.getByMobile,
    mobileInput.length >= 10 ? { mobile: mobileInput } : "skip"
  );
  const createCustomer = useMutation(api.customers.create);

  useEffect(() => {
    if (mobileInput.length >= 10 && customer !== undefined) {
      if (customer) {
        onSelect(customer._id, customer.name, customer.mobile, customer.dueBalance);
        setSearching(false);
      } else {
        setSearching(false);
      }
    }
  }, [customer, mobileInput]);

  function handleMobileChange(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 10);
    setMobileInput(digits);
    if (digits.length < 10) {
      onSelect(null, "", digits, 0);
    }
  }

  async function handleCreate() {
    if (!newName.trim() || !newMobile.trim()) {
      toast.error("Name and mobile are required");
      return;
    }
    try {
      const id = await createCustomer({
        name: newName.trim(),
        mobile: newMobile.trim(),
        email: newEmail.trim() || undefined,
      });
      onSelect(id, newName.trim(), newMobile.trim(), 0);
      setMobileInput(newMobile.trim());
      setShowCreate(false);
      toast.success("Customer created");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create customer");
    }
  }

  const isFound = mobileInput.length >= 10 && customer;
  const isNotFound = mobileInput.length >= 10 && customer === null;

  return (
    <div className="space-y-2">
      {/* Mobile number input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <IconPhone className="w-4 h-4" />
        </div>
        <input
          value={mobileInput}
          onChange={(e) => handleMobileChange(e.target.value)}
          placeholder="Mobile number (10 digits)"
          inputMode="numeric"
          className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        {isFound && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
            <IconCheck className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Found customer */}
      {isFound && customer && (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
              <IconUser className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{customer.name}</p>
              {customer.dueBalance > 0 && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <IconDue className="w-3 h-3" />
                  Due: ₹{customer.dueBalance.toFixed(2)}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => { setMobileInput(""); onSelect(null, "", "", 0); }}
            className="text-gray-400 hover:text-gray-600"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Not found — offer to create */}
      {isNotFound && !showCreate && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <p className="text-xs text-amber-700">No customer found for this number</p>
          <button
            onClick={() => { setNewMobile(mobileInput); setShowCreate(true); }}
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            <IconPlus className="w-3.5 h-3.5" />
            Add New
          </button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-gray-50 border rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-700">New Customer</p>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Full name *"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <input
            value={newMobile}
            onChange={(e) => setNewMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="Mobile *"
            inputMode="numeric"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <input
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Email (optional)"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(false)}
              className="flex-1 py-2 border rounded-lg text-xs font-medium text-gray-600">Cancel</button>
            <button onClick={handleCreate}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700">
              Save Customer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
