"use client";

import React, { useState, useMemo } from "react";
import { 
  Check, 
  Layers, 
  Briefcase, 
  TrendingUp, 
  Package, 
  Users, 
  Wallet, 
  Settings, 
  Search, 
  Sparkles,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  CheckSquare,
  Square
} from "lucide-react";
import { 
  PERMISSION_GROUPS, 
  PermissionGroup, 
  PermissionItem,
  getAllPermissionKeys, 
  ROLE_PRESETS 
} from "../../lib/utils/permissions";

interface GroupedPermissionSelectorProps {
  permissions: Record<string, boolean>;
  onChange: (permissions: Record<string, boolean>) => void;
  disabled?: boolean;
}

export default function GroupedPermissionSelector({
  permissions,
  onChange,
  disabled = false
}: GroupedPermissionSelectorProps) {
  const [search, setSearch] = useState("");

  const getGroupIcon = (iconName: string) => {
    switch (iconName) {
      case "Layers": return <Layers className="w-5 h-5 text-blue-600" />;
      case "Briefcase": return <Briefcase className="w-5 h-5 text-purple-600" />;
      case "TrendingUp": return <TrendingUp className="w-5 h-5 text-emerald-600" />;
      case "Package": return <Package className="w-5 h-5 text-amber-600" />;
      case "Users": return <Users className="w-5 h-5 text-indigo-600" />;
      case "Wallet": return <Wallet className="w-5 h-5 text-cyan-600" />;
      case "Settings": return <Settings className="w-5 h-5 text-slate-600" />;
      default: return <Layers className="w-5 h-5 text-blue-600" />;
    }
  };

  const handleToggleItem = (key: string) => {
    if (disabled) return;
    const current = !!permissions[key];
    const updated = {
      ...permissions,
      [key]: !current
    };
    onChange(updated);
  };

  const handleToggleGroup = (group: PermissionGroup, forceSelectAll?: boolean) => {
    if (disabled) return;
    const groupActiveCount = group.items.filter(i => !!permissions[i.key]).length;
    const shouldSelect = forceSelectAll !== undefined 
      ? forceSelectAll 
      : groupActiveCount !== group.items.length;

    const updated = { ...permissions };
    group.items.forEach(item => {
      updated[item.key] = shouldSelect;
    });

    onChange(updated);
  };

  const handleSelectAllGlobal = () => {
    if (disabled) return;
    const allKeys = getAllPermissionKeys();
    const updated: Record<string, boolean> = {};
    allKeys.forEach(k => {
      updated[k] = true;
    });
    onChange(updated);
  };

  const handleDeselectAllGlobal = () => {
    if (disabled) return;
    const allKeys = getAllPermissionKeys();
    const updated: Record<string, boolean> = {};
    allKeys.forEach(k => {
      updated[k] = false;
    });
    onChange(updated);
  };

  const handleApplyPreset = (presetKey: string) => {
    if (disabled) return;
    const allowed = ROLE_PRESETS[presetKey] || [];
    const allKeys = getAllPermissionKeys();
    const updated: Record<string, boolean> = {};
    allKeys.forEach(k => {
      updated[k] = allowed.includes(k);
    });
    onChange(updated);
  };

  // Filter groups and items based on search term
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return PERMISSION_GROUPS;

    const term = search.toLowerCase();
    return PERMISSION_GROUPS.map(group => {
      const matchGroup = group.title.toLowerCase().includes(term);
      const filteredItems = group.items.filter(item => 
        item.label.toLowerCase().includes(term) || 
        (item.route && item.route.toLowerCase().includes(term)) ||
        (item.description && item.description.toLowerCase().includes(term))
      );

      if (matchGroup) {
        return group; // show all items if group title matches
      }

      return {
        ...group,
        items: filteredItems
      };
    }).filter(group => group.items.length > 0);
  }, [search]);

  // Overall counts
  const totalItemsCount = useMemo(() => {
    return PERMISSION_GROUPS.reduce((acc, g) => acc + g.items.length, 0);
  }, []);

  const totalActiveCount = useMemo(() => {
    return Object.values(permissions).filter(Boolean).length;
  }, [permissions]);

  return (
    <div className="space-y-5 font-sans">
      {/* Quick Template Presets */}
      {!disabled && (
        <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/80 border border-blue-150 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-2.5">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-800">Template Hak Akses Instan (1-Klik):</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleApplyPreset("pos_cashier")}
              className="px-3 py-1.5 bg-white hover:bg-blue-600 hover:text-white border border-blue-200 text-blue-900 font-bold text-[11px] rounded-xl transition shadow-2xs cursor-pointer"
            >
              🏪 Kasir Toko (POS)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("warehouse")}
              className="px-3 py-1.5 bg-white hover:bg-amber-600 hover:text-white border border-amber-200 text-amber-900 font-bold text-[11px] rounded-xl transition shadow-2xs cursor-pointer"
            >
              📦 Staf Gudang & Mutasi
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("sales")}
              className="px-3 py-1.5 bg-white hover:bg-emerald-600 hover:text-white border border-emerald-200 text-emerald-900 font-bold text-[11px] rounded-xl transition shadow-2xs cursor-pointer"
            >
              📈 Tim Sales & Penjualan
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("finance")}
              className="px-3 py-1.5 bg-white hover:bg-cyan-600 hover:text-white border border-cyan-200 text-cyan-900 font-bold text-[11px] rounded-xl transition shadow-2xs cursor-pointer"
            >
              💼 Admin Keuangan & Pajak
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("hr")}
              className="px-3 py-1.5 bg-white hover:bg-indigo-600 hover:text-white border border-indigo-200 text-indigo-900 font-bold text-[11px] rounded-xl transition shadow-2xs cursor-pointer"
            >
              👥 HRD & Personalia
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("admin")}
              className="px-3 py-1.5 bg-white hover:bg-purple-600 hover:text-white border border-purple-200 text-purple-900 font-bold text-[11px] rounded-xl transition shadow-2xs cursor-pointer"
            >
              🛡️ Admin Penuh (Semua Akses)
            </button>
          </div>
        </div>
      )}

      {/* Search & Global Actions Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari submenu (misal: stok opname, laba rugi, po)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={disabled}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="text-xs font-bold text-slate-500 mr-2">
            Terpilih: <span className="text-blue-600 font-extrabold">{totalActiveCount}</span> / {totalItemsCount} Submenu
          </div>

          {!disabled && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectAllGlobal}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px] rounded-xl transition shadow-2xs cursor-pointer"
              >
                Pilih Semua
              </button>
              <button
                type="button"
                onClick={handleDeselectAllGlobal}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px] rounded-xl transition shadow-2xs cursor-pointer"
              >
                Kosongkan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Group Cards Grid */}
      <div className="space-y-4">
        {filteredGroups.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-white border border-slate-200 rounded-2xl">
            Tidak ada submenu yang cocok dengan pencarian "{search}".
          </div>
        ) : (
          filteredGroups.map(group => {
            const groupActiveCount = group.items.filter(i => !!permissions[i.key]).length;
            const isAllGroupChecked = group.items.length > 0 && groupActiveCount === group.items.length;

            return (
              <div 
                key={group.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 transition"
              >
                {/* Group Header */}
                <div className="p-4 bg-slate-50/80 border-b border-slate-150 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs">
                      {getGroupIcon(group.iconName)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">{group.title}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          groupActiveCount > 0 
                            ? "bg-blue-50 text-blue-700 border-blue-200" 
                            : "bg-slate-100 text-slate-400 border-slate-200"
                        }`}>
                          {groupActiveCount} / {group.items.length} Submenu Aktif
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{group.description}</p>
                    </div>
                  </div>

                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleToggleGroup(group, !isAllGroupChecked)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 cursor-pointer ${
                        isAllGroupChecked 
                          ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-2xs" 
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <Check className={`w-3.5 h-3.5 ${isAllGroupChecked ? "opacity-100" : "opacity-40"}`} />
                      {isAllGroupChecked ? "Semua Submenu Terpilih" : "Pilih Semua Submenu"}
                    </button>
                  )}
                </div>

                {/* Submenu Checkbox Items Grid */}
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 bg-slate-50/30">
                  {group.items.map(item => {
                    const isChecked = !!permissions[item.key];
                    return (
                      <div
                        key={item.key}
                        onClick={() => handleToggleItem(item.key)}
                        className={`p-3 rounded-xl border cursor-pointer select-none transition flex items-start gap-3 ${
                          disabled ? "opacity-75 cursor-not-allowed" : ""
                        } ${
                          isChecked 
                            ? "bg-blue-50/70 border-blue-300 shadow-2xs ring-1 ring-blue-400/20" 
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80"
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isChecked ? (
                            <div className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded border border-slate-300 bg-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1.5 mb-0.5">
                            <span className={`font-bold text-xs truncate ${isChecked ? "text-blue-950" : "text-slate-800"}`}>
                              {item.label}
                            </span>
                            {item.route && (
                              <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 bg-slate-100 text-slate-500 border border-slate-200 rounded shrink-0">
                                {item.route}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <span className="text-[11px] text-slate-500 block leading-snug">
                              {item.description}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
