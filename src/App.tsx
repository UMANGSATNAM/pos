import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { useEffect, useState } from "react";
import { POSTerminal } from "./POSTerminal";
import { Inventory } from "./Inventory";
import { SalesHistory } from "./SalesHistory";
import { Dashboard } from "./Dashboard";
import { Customers } from "./Customers";
import { Settings } from "./Settings";
import {
  IconShoppingCart, IconDashboard, IconPackage, IconReceipt, IconUsers,
} from "./icons";
import { BRAND } from "./branding";

type Tab = "pos" | "inventory" | "sales" | "dashboard" | "customers";

function IconStoreLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l1-5h16l1 5"/>
      <path d="M3 9a2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2 2 2 0 0 0 2-2"/>
      <path d="M5 11v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8"/>
      <path d="M10 15h4v4h-4z"/>
    </svg>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Toaster richColors position="top-center" />
      <Authenticated>
        <MainApp />
      </Authenticated>
      <Unauthenticated>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
                <IconStoreLogo className="w-11 h-11 text-white" />
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">{BRAND.name}</h1>
              <p className="text-white/70 mt-1 text-sm">{BRAND.tagline}</p>
            </div>
            <div className="bg-white rounded-3xl shadow-2xl p-6">
              <SignInForm />
            </div>
          </div>
        </div>
      </Unauthenticated>
    </div>
  );
}

type TabDef = { id: Tab; label: string; desktopIcon: React.ReactNode; mobileIcon: React.ReactNode };

function MainApp() {
  const [activeTab, setActiveTab] = useState<Tab>("pos");
  const seedCategories = useMutation(api.categories.seed);
  const seedProducts = useMutation(api.products.seed);
  const user = useQuery(api.auth.loggedInUser);
  const customers = useQuery(api.customers.list) ?? [];
  const totalDue = customers.reduce((sum, c) => sum + c.dueBalance, 0);

  useEffect(() => {
    seedCategories().then(() => seedProducts());
  }, []);

  const tabs: TabDef[] = [
    {
      id: "pos", label: "POS",
      desktopIcon: <IconShoppingCart className="w-4 h-4" />,
      mobileIcon: <IconShoppingCart className="w-5 h-5" />,
    },
    {
      id: "dashboard", label: "Dashboard",
      desktopIcon: <IconDashboard className="w-4 h-4" />,
      mobileIcon: <IconDashboard className="w-5 h-5" />,
    },
    {
      id: "inventory", label: "Inventory",
      desktopIcon: <IconPackage className="w-4 h-4" />,
      mobileIcon: <IconPackage className="w-5 h-5" />,
    },
    {
      id: "sales", label: "Sales",
      desktopIcon: <IconReceipt className="w-4 h-4" />,
      mobileIcon: <IconReceipt className="w-5 h-5" />,
    },
    {
      id: "customers", label: "Customers",
      desktopIcon: <IconUsers className="w-4 h-4" />,
      mobileIcon: <IconUsers className="w-5 h-5" />,
    },
    {
      id: "settings", label: "Settings",
      desktopIcon: <span className="w-4 h-4">⚙️</span>,
      mobileIcon: <span className="w-5 h-5">⚙️</span>,
    },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-surface">
      {/* Header */}
      <header className="bg-white text-accent px-4 py-3 flex items-center justify-between shadow-sm border-b flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-primary">
            <IconStoreLogo className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight">{BRAND.name} SaaS</h1>
          </div>
        </div>
        {/* Desktop nav */}
        <nav className="hidden md:flex gap-1 bg-surface-dark p-1 rounded-secondary border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-1.5 px-4 py-1.5 rounded-secondary text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-white text-primary shadow shadow-sm border border-gray-200"
                  : "text-secondary hover:text-accent hover:bg-white/50"
              }`}
            >
              <span className={activeTab === tab.id ? "text-primary" : "text-gray-400"}>{tab.desktopIcon}</span>
              <span>{tab.label}</span>
              {tab.id === "customers" && totalDue > 0 && (
                <span className="ml-1 w-2 h-2 bg-red-400 rounded-full" />
              )}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <span className="text-xs text-secondary hidden sm:block truncate max-w-[150px] font-mono">{user?.email}</span>
          <SignOutButton />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === "pos" && <POSTerminal />}
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "inventory" && <Inventory />}
        {activeTab === "sales" && <SalesHistory />}
        {activeTab === "customers" && <Customers />}
        {activeTab === "settings" && <Settings />}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden bg-white border-t flex flex-shrink-0" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center py-2 px-1 text-xs font-medium transition-colors relative ${
              activeTab === tab.id
                ? "text-primary"
                : "text-secondary hover:text-accent"
            }`}
          >
            {activeTab === tab.id && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
            )}
            <span className={`mb-0.5 transition-transform ${activeTab === tab.id ? "scale-110" : ""}`}>
              {tab.mobileIcon}
            </span>
            <span className="text-[10px]">{tab.label}</span>
            {tab.id === "customers" && totalDue > 0 && (
              <span className="absolute top-1 right-2 w-2 h-2 bg-red-400 rounded-full" />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
