import React, { useState, useEffect, useCallback, useId } from "react";
import { useAppStore } from "../../store/useAppStore";
import {
  api,
  DeliveryFlow,
  DeliveryFlowIn,
  DeliveryFlowNode,
  DeliveryNodeType,
  DeliveryMethodType,
  CountryWallet,
  CountryAgency,
} from "../../api";
import { Plus, X, Save, Loader2, AlertCircle, GripVertical, Trash2 } from "lucide-react";

// ── Layout constants ───────────────────────────────────────────────────────────

const CARD_W      = 230;   // px – card width
const METHOD_H    = 68;    // px – method header card height
const CONN_H      = 16;    // px – connector space between cards
const WALLET_H    = 40;    // px – wallet card height
const DROP_ZONE_H = 36;    // px – drop target height

/** Approximate height per node type for layout calculations */
const NODE_H: Record<DeliveryNodeType, number> = {
  phone:          120,
  account_number: 132,
  bank_list:      220,
};

// ── Domain constants ───────────────────────────────────────────────────────────

const METHOD_META: Record<DeliveryMethodType, {
  label: string; icon: string;
  hdrOn: string; hdrOff: string;
  borderOn: string; borderOff: string;
}> = {
  cash_pickup:  {
    label: "Efectivo",              icon: "💵",
    hdrOn:  "bg-emerald-600 text-white", hdrOff: "bg-gray-100 text-gray-500",
    borderOn: "border-emerald-400",      borderOff: "border-gray-200",
  },
  mobile_wallet: {
    label: "Billetera Movil",       icon: "📱",
    hdrOn:  "bg-blue-600 text-white",    hdrOff: "bg-gray-100 text-gray-500",
    borderOn: "border-blue-400",         borderOff: "border-gray-200",
  },
  bank_deposit: {
    label: "Transferencia Bancaria", icon: "🏦",
    hdrOn:  "bg-violet-600 text-white",  hdrOff: "bg-gray-100 text-gray-500",
    borderOn: "border-violet-400",       borderOff: "border-gray-200",
  },
};

const NODE_META: Record<DeliveryNodeType, { label: string; icon: string; desc: string }> = {
  phone:          { label: "Teléfono",        icon: "📞", desc: "Número de teléfono con prefijo" },
  account_number: { label: "Número de Cuenta", icon: "🔢", desc: "Dígitos mín/máx" },
  bank_list:      { label: "Lista de Bancos",  icon: "🏛️", desc: "Bancos permitidos" },
};

const ALLOWED_NODES: Record<DeliveryMethodType, DeliveryNodeType[]> = {
  cash_pickup:   [],
  mobile_wallet: ["phone", "account_number"],
  bank_deposit:  ["phone", "account_number", "bank_list"],
};

const ALLOWED_ITEM_KIND: Record<DeliveryMethodType, "wallet" | "agency" | null> = {
  cash_pickup:   "agency",
  mobile_wallet: "wallet",
  bank_deposit:  null,
};

const ALL_METHODS: DeliveryMethodType[] = ["cash_pickup", "mobile_wallet", "bank_deposit"];

const DEFAULT_POS: Record<DeliveryMethodType, { pos_x: number; pos_y: number }> = {
  cash_pickup:   { pos_x: 16,  pos_y: 16 },
  mobile_wallet: { pos_x: 254, pos_y: 16 },
  bank_deposit:  { pos_x: 492, pos_y: 16 },
};

// ── Local types ────────────────────────────────────────────────────────────────

type CanvasItem =
  | { kind: "node";   lid: string; id?: string;  node_type: DeliveryNodeType; config: DeliveryFlowNode["config"] }
  | { kind: "wallet"; lid: string; id?: number; name: string }
  | { kind: "agency"; lid: string; id?: number; name: string };

interface CanvasFlow extends Omit<DeliveryFlow, "nodes" | "wallets"> {
  items: CanvasItem[];
}
// PaletteWallet = CountryWallet from DB, with a local lid for React keys
interface PaletteWallet extends CountryWallet { lid: string }
// PaletteAgency = CountryAgency from DB, with a local lid for React keys
interface PaletteAgency extends CountryAgency { lid: string }

type PaletteDrag =
  | { kind: "node";   nodeType: DeliveryNodeType }
  | { kind: "wallet"; walletLid: string; walletDbId: number; name: string }
  | { kind: "agency"; walletLid: string; walletDbId: number; name: string };

// ── Helpers ────────────────────────────────────────────────────────────────────

const itemH = (it: CanvasItem) => it.kind === "node" ? (NODE_H[it.node_type] ?? 140) : WALLET_H;

function stackBottom(flow: CanvasFlow): number {
  let y = flow.pos_y + METHOD_H + CONN_H;
  for (const it of flow.items) y += itemH(it) + CONN_H;
  return y;
}

function makeDefaultFlows(countryId: string): CanvasFlow[] {
  return ALL_METHODS.map((method, i) => ({
    country_id: countryId, method,
    active: false,
    pos_x: DEFAULT_POS[method].pos_x,
    pos_y: DEFAULT_POS[method].pos_y,
    sort_order: i,
    items: [],
  }));
}

function fromApi(remote: DeliveryFlow[], countryId: string): CanvasFlow[] {
  const defaults = makeDefaultFlows(countryId);
  return defaults.map(def => {
    const r = remote.find(x => x.method === def.method);
    if (!r) return def;
    // Merge nodes and wallets; sort_order encodes global slot so interleaving is preserved
    const nodeItems = r.nodes.map(n => ({
      kind: "node"   as const, lid: crypto.randomUUID(),
      id: n.id, node_type: n.node_type, config: n.config, _slot: n.sort_order,
    }));
    const walletItems = r.wallets.map(w => ({
      kind: (w.kind ?? "wallet") as "wallet" | "agency",
      lid: crypto.randomUUID(),
      id: w.id, name: w.name, _slot: w.sort_order,
    }));
    const items: CanvasItem[] = [...nodeItems, ...walletItems]
      .sort((a, b) => a._slot - b._slot)
      .map(({ _slot: _s, ...rest }) => rest as CanvasItem);
    // Always use DEFAULT_POS so stored positions don't override the current layout
    return { ...r, pos_x: def.pos_x, pos_y: def.pos_y, items };
  });
}

// ── Component ──────────────────────────────────────────────────────────────────

export const DeliveryFlowsView: React.FC = () => {
  const { countries, partnerships } = useAppStore();
  const uid = useId();

  const [country, setCountry]       = useState("");
  const [partnership, setPartnership] = useState<number | ("")>("");
  const [flows, setFlows]           = useState<CanvasFlow[]>([]);
  const [palette, setPalette]           = useState<PaletteWallet[]>([]);
  const [newWallet, setNewWallet]       = useState("");
  const [agencyPalette, setAgencyPalette] = useState<PaletteAgency[]>([]);
  const [newAgency, setNewAgency]       = useState("");
  const [questionLabel, setQuestionLabel] = useState("");
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [dirty, setDirty]           = useState(false);
  const [saveErr, setSaveErr]       = useState<string | null>(null);

  // Canvas card drag (repositioning)
  const [cardDrag, setCardDrag] = useState<{
    method: string; smx: number; smy: number; scx: number; scy: number;
  } | null>(null);

  // Palette drag (node/wallet onto canvas)
  const [palDrag, setPalDrag]       = useState<PaletteDrag | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);  // method key

  // Wallet reorder within canvas
  const [wDrag, setWDrag]   = useState<{ method: string; from: number } | null>(null);
  const [wOver, setWOver]   = useState<{ method: string; over: number } | null>(null);

  // Wallet reorder within palette
  const [pwDrag, setPwDrag] = useState<number | null>(null);   // from index
  const [pwOver, setPwOver] = useState<number | null>(null);   // over index

  // Agency reorder within palette
  const [paDrag, setPaDrag] = useState<number | null>(null);
  const [paOver, setPaOver] = useState<number | null>(null);

  // ── Auto-select defaults once store data is available ────────────────────────

  useEffect(() => {
    if (partnership !== "" || partnerships.length === 0) return;
    const preferred = partnerships.find(p => p.id === 1) ?? partnerships[0];
    setPartnership(preferred.id);
  }, [partnerships]);

  useEffect(() => {
    if (country !== "" || partnership === "") return;
    const receiveCountries = countries.filter(c => c.receive);
    if (receiveCountries.length === 0) return;
    const preferred = receiveCountries.find(c => c.id === "VE") ?? receiveCountries[0];
    setCountry(preferred.id);
  }, [partnership, countries]);

  // ── Data loading ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!country || !partnership) { setFlows([]); setPalette([]); setAgencyPalette([]); return; }
    setLoading(true); setDirty(false); setSaveErr(null);
    Promise.all([
      api.getDeliveryFlows(partnership, country).catch(() => [] as DeliveryFlow[]),
      api.getCountryWallets(partnership, country).catch(() => [] as CountryWallet[]),
      api.getCountryAgencies(partnership, country).catch(() => [] as CountryAgency[]),
    ]).then(([remote, wallets, agencies]) => {
      setFlows(fromApi(remote, country));
      setQuestionLabel(remote.find(f => f.question_label)?.question_label ?? "");
      setPalette(wallets.map(w => ({ lid: crypto.randomUUID(), ...w })));
      setAgencyPalette(agencies.map(a => ({ lid: crypto.randomUUID(), ...a })));
    }).finally(() => setLoading(false));
  }, [country, partnership]);

  // ── Canvas drag listeners ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!cardDrag) return;
    const move = (e: MouseEvent) => {
      const dx = e.clientX - cardDrag.smx, dy = e.clientY - cardDrag.smy;
      setFlows(prev => prev.map(f =>
        f.method === cardDrag.method
          ? { ...f, pos_x: Math.max(0, cardDrag.scx + dx), pos_y: Math.max(0, cardDrag.scy + dy) }
          : f
      ));
    };
    const up = () => setCardDrag(null);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [cardDrag]);

  // ── Mutation helpers ──────────────────────────────────────────────────────────

  const mark = useCallback(() => setDirty(true), []);

  const toggleActive = (method: string) => {
    setFlows(p => p.map(f => f.method === method ? { ...f, active: !f.active } : f));
    mark();
  };

  const removeItem = (method: string, lid: string) => {
    setFlows(p => p.map(f =>
      f.method !== method ? f : { ...f, items: f.items.filter(it => it.lid !== lid) }
    ));
    mark();
  };

  const patchNodeConfig = (
    method: string, lid: string,
    patch: Partial<DeliveryFlowNode["config"]>
  ) => {
    setFlows(p => p.map(f => {
      if (f.method !== method) return f;
      return {
        ...f,
        items: f.items.map(it =>
          it.kind === "node" && it.lid === lid
            ? { ...it, config: { ...it.config, ...patch } }
            : it
        ),
      };
    }));
    mark();
  };

  const moveItem = (method: string, lid: string, dir: -1 | 1) => {
    setFlows(p => p.map(f => {
      if (f.method !== method) return f;
      const its = [...f.items];
      const i = its.findIndex(it => it.lid === lid);
      if (i < 0) return f;
      const j = i + dir;
      if (j < 0 || j >= its.length) return f;
      [its[i], its[j]] = [its[j], its[i]];
      return { ...f, items: its };
    }));
    mark();
  };

  const reorderItem = (method: string, from: number, to: number) => {
    if (from === to) return;
    setFlows(p => p.map(f => {
      if (f.method !== method) return f;
      const its = [...f.items];
      const [mv] = its.splice(from, 1);
      its.splice(to, 0, mv);
      return { ...f, items: its };
    }));
    mark();
  };

  // ── Palette actions ───────────────────────────────────────────────────────────

  const addToPalette = async () => {
    const name = newWallet.trim();
    if (!name || !country) return;
    setNewWallet("");
    try {
      const saved = await api.addCountryWallet(partnership as number, country, name);
      setPalette(p => [...p, { lid: crypto.randomUUID(), ...saved }]);
    } catch {
      // silently ignore; wallet not added
    }
  };

  const removePaletteWallet = async (lid: string) => {
    const pw = palette.find(w => w.lid === lid);
    if (!pw || !country) return;
    // Optimistic remove
    setPalette(p => p.filter(w => w.lid !== lid));
    setFlows(p => p.map(f => ({ ...f, items: f.items.filter(it => it.lid !== lid) })));
    mark();
    try {
      await api.deleteCountryWallet(partnership as number, country, pw.id);
    } catch {
      // Restore on failure
      setPalette(p => [...p, pw]);
    }
  };

  const reorderPalette = async (from: number, to: number) => {
    if (from === to || !country) return;
    const next = [...palette];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setPalette(next);
    try {
      await api.reorderCountryWallets(partnership as number, country, next.map(w => w.id));
    } catch {
      // Restore on failure
      setPalette(palette);
    }
  };

  const addToAgencyPalette = async () => {
    const name = newAgency.trim();
    if (!name || !country) return;
    setNewAgency("");
    try {
      const saved = await api.addCountryAgency(partnership as number, country, name);
      setAgencyPalette(p => [...p, { lid: crypto.randomUUID(), ...saved }]);
    } catch {
      // silently ignore
    }
  };

  const removePaletteAgency = async (lid: string) => {
    const pa = agencyPalette.find(a => a.lid === lid);
    if (!pa || !country) return;
    setAgencyPalette(p => p.filter(a => a.lid !== lid));
    setFlows(p => p.map(f => ({ ...f, items: f.items.filter(it => it.lid !== lid) })));
    mark();
    try {
      await api.deleteCountryAgency(partnership as number, country, pa.id);
    } catch {
      setAgencyPalette(p => [...p, pa]);
    }
  };

  const reorderAgencyPalette = async (from: number, to: number) => {
    if (from === to || !country) return;
    const next = [...agencyPalette];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setAgencyPalette(next);
    try {
      await api.reorderCountryAgencies(partnership as number, country, next.map(a => a.id));
    } catch {
      setAgencyPalette(agencyPalette);
    }
  };

  // ── Drop onto method card ─────────────────────────────────────────────────────

  const onDropOnMethod = (method: string) => {
    setDropTarget(null);
    if (!palDrag) return;

    if (palDrag.kind === "node") {
      const allowed = ALLOWED_NODES[method as DeliveryMethodType];
      if (!allowed.includes(palDrag.nodeType)) return;
      // Reject duplicate node type on same flow
      const flow = flows.find(f => f.method === method);
      if (flow?.items.some(it => it.kind === "node" && it.node_type === palDrag.nodeType)) return;
      const newItem: CanvasItem = { kind: "node", lid: crypto.randomUUID(), node_type: palDrag.nodeType, config: {} };
      setFlows(p => p.map(f =>
        f.method !== method ? f : { ...f, items: [...f.items, newItem] }
      ));
      mark();
    } else if ((palDrag.kind === "wallet" || palDrag.kind === "agency")) {
      const allowed = ALLOWED_ITEM_KIND[method as DeliveryMethodType];
      if (allowed !== palDrag.kind) return;
      setFlows(p => p.map(f => {
        if (f.method !== method) return f;
        // Reject if same name already on the canvas (lid may differ after reload)
        if (f.items.some(it => (it.kind === "wallet" || it.kind === "agency") && it.name === palDrag.name)) return f;
        const newItem: CanvasItem = { kind: palDrag.kind, lid: palDrag.walletLid, name: palDrag.name };
        return { ...f, items: [...f.items, newItem] };
      }));
      mark();
    }
    setPalDrag(null);
  };

  // ── Save ──────────────────────────────────────────────────────────────────────

  const save = async () => {
    if (!country || !partnership || saving) return;

    // Validate node configs before saving
    const errors: string[] = [];
    for (const flow of flows) {
      const meta = METHOD_META[flow.method];
      for (const item of flow.items) {
        if (item.kind !== "node") continue;
        const nodeMeta = NODE_META[item.node_type];
        if (item.node_type === "phone" && !item.config.prefixes?.trim()) {
          errors.push(`${meta.label} › ${nodeMeta.label}: falta "Prefijos válidos"`);
        }
        if (item.node_type === "account_number" && (!item.config.min_digits || !item.config.max_digits)) {
          errors.push(`${meta.label} › ${nodeMeta.label}: faltan dígitos mín/máx`);
        }
        if (item.node_type === "bank_list" && !item.config.banks?.trim()) {
          errors.push(`${meta.label} › ${nodeMeta.label}: falta la lista de bancos`);
        }
      }
    }
    if (errors.length > 0) {
      setSaveErr(errors.join(" · "));
      return;
    }

    setSaving(true); setSaveErr(null);
    try {
      const payload: DeliveryFlowIn[] = flows.map((f, i) => ({
        country_id: f.country_id, method: f.method,
        active: f.active, pos_x: f.pos_x, pos_y: f.pos_y, sort_order: i,
        question_label: questionLabel.trim() || null,
        // sort_order = global slot index so interleaved order survives reload
        nodes: f.items
          .filter((it): it is Extract<CanvasItem, {kind:"node"}> => it.kind === "node")
          .map(n => ({ node_type: n.node_type, sort_order: f.items.indexOf(n), config: n.config })),
        wallets: f.items
          .filter((it): it is Extract<CanvasItem, {kind:"wallet"|"agency"}> => (it.kind === "wallet" || it.kind === "agency") && it.name.trim() !== "")
          .map(w => ({ name: w.name.trim(), sort_order: f.items.indexOf(w), kind: w.kind })),
      }));
      const saved = await api.replaceDeliveryFlows(partnership as number, country, payload);
      setFlows(fromApi(saved, country));
      setDirty(false);
    } catch (e: any) {
      setSaveErr(e?.detail ?? e?.message ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  // ── Canvas rendering ──────────────────────────────────────────────────────────

  const canvasH = Math.max(640, ...flows.map(f => stackBottom(f) + DROP_ZONE_H + 60));
  const canvasW = Math.max(1060, ...flows.map(f => f.pos_x + CARD_W + 80));

  /** SVG connection lines for all flows */
  const renderLines = () => (
    <svg
      style={{ position: "absolute", top: 0, left: 0, width: canvasW, height: canvasH, pointerEvents: "none" }}
    >
      <defs>
        <marker id={`${uid}-arrow`} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#9ca3af" />
        </marker>
      </defs>
      {flows.flatMap(flow => {
        const lines: React.ReactElement[] = [];
        const cx = flow.pos_x + CARD_W / 2;
        let y = flow.pos_y + METHOD_H;

        const drawConn = (fromY: number, toY: number, key: string) => {
          const mid = (fromY + toY) / 2;
          lines.push(
            <g key={key}>
              <circle cx={cx} cy={fromY} r={4} fill="#d1d5db" />
              <line
                x1={cx} y1={fromY + 4}
                x2={cx} y2={toY - 2}
                stroke="#d1d5db" strokeWidth={2} strokeDasharray="4 3"
                markerEnd={`url(#${uid}-arrow)`}
              />
            </g>
          );
        };

        flow.items.forEach((item, idx) => {
          drawConn(y, y + CONN_H, `${flow.method}-conn-${idx}`);
          y += CONN_H + itemH(item);
        });

        return lines;
      })}
    </svg>
  );

  const renderMethodCard = (flow: CanvasFlow) => {
    const meta = METHOD_META[flow.method];
    const canDrop = palDrag && (
      palDrag.kind === "node"
        ? ALLOWED_NODES[flow.method].includes(palDrag.nodeType) &&
          !flow.items.some(it => it.kind === "node" && it.node_type === palDrag.nodeType)
        : ALLOWED_ITEM_KIND[flow.method] === palDrag.kind &&
          !flow.items.some(it => (it.kind === "wallet" || it.kind === "agency") && it.name === palDrag.name)
    );

    return (
      <div
        key={`mc-${flow.method}`}
        style={{ position: "absolute", left: flow.pos_x, top: flow.pos_y, width: CARD_W, height: METHOD_H, zIndex: cardDrag?.method === flow.method ? 20 : 2 }}
        className={`rounded-xl border-2 shadow-md overflow-hidden select-none ${flow.active ? meta.borderOn : meta.borderOff}`}
      >
        {/* Drag handle header */}
        <div
          onMouseDown={e => {
            e.preventDefault();
            setCardDrag({ method: flow.method, smx: e.clientX, smy: e.clientY, scx: flow.pos_x, scy: flow.pos_y });
          }}
          className={`flex h-full items-center justify-between px-3 cursor-grab active:cursor-grabbing ${flow.active ? meta.hdrOn : meta.hdrOff}`}
        >
          <div>
            <div className="text-xs font-bold leading-tight">{meta.label}</div>
            <div className={`text-[10px] font-mono ${flow.active ? "text-white/50" : "text-gray-400"}`}>{flow.method}</div>
          </div>
          {/* Active toggle */}
          <button
            onClick={e => { e.stopPropagation(); toggleActive(flow.method); }}
            onMouseDown={e => e.stopPropagation()}
            title={flow.active ? "Desactivar" : "Activar"}
            className={`relative w-10 h-5 rounded-full overflow-hidden flex-shrink-0 transition-colors duration-200 ${
              flow.active ? "bg-white/30" : "bg-black/20"
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ${
              flow.active ? "bg-white translate-x-[18px]" : "bg-white/70 translate-x-0"
            }`} />
          </button>
        </div>
      </div>
    );
  };

  const renderNodeCard = (flow: CanvasFlow, node: Extract<CanvasItem, {kind:"node"}>, itemIdx: number, yTop: number) => {
    const meta = NODE_META[node.node_type];
    return (
      <div
        key={`node-${node.lid}`}
        style={{ position: "absolute", left: flow.pos_x, top: yTop, width: CARD_W, zIndex: 2 }}
        className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Node header */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
            {meta.icon} {node.config.label || meta.label}
          </span>
          <div className="flex items-center gap-0.5">
            <button onClick={() => moveItem(flow.method, node.lid, -1)} disabled={itemIdx === 0}
              className="text-gray-300 hover:text-gray-500 disabled:opacity-20 p-0.5 text-[10px]">▲</button>
            <button onClick={() => moveItem(flow.method, node.lid, 1)} disabled={itemIdx === flow.items.length - 1}
              className="text-gray-300 hover:text-gray-500 disabled:opacity-20 p-0.5 text-[10px]">▼</button>
            <button onClick={() => removeItem(flow.method, node.lid)}
              className="ml-1 text-red-300 hover:text-red-500">
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Config fields */}
        <div className="p-2.5 space-y-2">
          <input
            value={node.config.label ?? ""}
            onChange={e => patchNodeConfig(flow.method, node.lid, { label: e.target.value })}
            placeholder={`Etiqueta (${meta.label})`}
            className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-blue-400"
          />
          {node.node_type === "phone" && (
            <input
              value={node.config.prefixes ?? ""}
              onChange={e => patchNodeConfig(flow.method, node.lid, { prefixes: e.target.value })}
              placeholder="Prefijos válidos: +57,+58,+1"
              className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-blue-400"
            />
          )}
          {node.node_type === "account_number" && (
            <div className="flex gap-2">
              {(["min_digits", "max_digits"] as const).map(key => (
                <div key={key} className="flex-1">
                  <p className="text-[10px] text-gray-400 mb-0.5">{key === "min_digits" ? "Mín" : "Máx"} dígitos</p>
                  <input type="number" min={1} max={30}
                    value={node.config[key] ?? ""}
                    onChange={e => patchNodeConfig(flow.method, node.lid, { [key]: Number(e.target.value) || undefined })}
                    placeholder={key === "min_digits" ? "8" : "20"}
                    className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-blue-400"
                  />
                </div>
              ))}
            </div>
          )}
          {node.node_type === "bank_list" && (
            <>
              <p className="text-[10px] text-gray-400">Bancos permitidos (separados por coma)</p>
              <textarea
                value={node.config.banks ?? ""}
                onChange={e => patchNodeConfig(flow.method, node.lid, { banks: e.target.value })}
                placeholder="Bancolombia, Davivienda, BBVA, Nequi, ..."
                rows={6}
                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-400 resize-none leading-relaxed"
              />
            </>
          )}
        </div>
      </div>
    );
  };

  const renderWalletCard = (flow: CanvasFlow, wallet: Extract<CanvasItem, {kind:"wallet"|"agency"}>, itemIdx: number, yTop: number) => (
    <div
      key={`wal-${wallet.lid}`}
      draggable
      onDragStart={() => setWDrag({ method: flow.method, from: itemIdx })}
      onDragOver={e => { e.preventDefault(); setWOver({ method: flow.method, over: itemIdx }); }}
      onDrop={() => {
        if (wDrag?.method === flow.method) reorderItem(flow.method, wDrag.from, itemIdx);
        setWDrag(null); setWOver(null);
      }}
      onDragEnd={() => { setWDrag(null); setWOver(null); }}
      style={{ position: "absolute", left: flow.pos_x, top: yTop, width: CARD_W, height: WALLET_H, zIndex: 2 }}
      onMouseDown={e => e.stopPropagation()}
      className={`flex items-center gap-2 px-3 bg-white border-2 rounded-xl shadow-sm cursor-grab transition-colors ${
        wOver?.method === flow.method && wOver.over === itemIdx
          ? "border-blue-400 bg-blue-50"
          : wallet.kind === "agency" ? "border-amber-200" : "border-gray-200"
      }`}
    >
      <GripVertical size={14} className="text-gray-300 flex-shrink-0" />
      {wallet.kind === "agency" && <span className="text-[11px]">🏪</span>}
      <span className="text-xs font-medium text-gray-700 flex-1">{wallet.name}</span>
      <button
        onClick={() => removeItem(flow.method, wallet.lid)}
        onMouseDown={e => e.stopPropagation()}
        className="text-red-300 hover:text-red-500"
      >
        <X size={13} />
      </button>
    </div>
  );

  /** Drop zone rendered below each method's stack */
  const renderDropZone = (flow: CanvasFlow) => {
    if (!palDrag) return null;
    const canDrop = palDrag.kind === "node"
      ? ALLOWED_NODES[flow.method].includes(palDrag.nodeType) &&
        !flow.items.some(it => it.kind === "node" && it.node_type === palDrag.nodeType)
      : ALLOWED_ITEM_KIND[flow.method] === palDrag.kind &&
        !flow.items.some(it => (it.kind === "wallet" || it.kind === "agency") && it.name === palDrag.name);
    if (!canDrop) return null;

    const yTop = stackBottom(flow);
    const isOver = dropTarget === flow.method;

    return (
      <div
        key={`dz-${flow.method}`}
        style={{ position: "absolute", left: flow.pos_x, top: yTop, width: CARD_W, height: DROP_ZONE_H, zIndex: 5 }}
        onDragOver={e => { e.preventDefault(); setDropTarget(flow.method); }}
        onDragLeave={() => setDropTarget(null)}
        onDrop={() => onDropOnMethod(flow.method)}
        className={`flex items-center justify-center rounded-xl border-2 border-dashed text-xs font-medium transition-all ${
          isOver
            ? "border-blue-500 bg-blue-50 text-blue-600 scale-[1.02]"
            : "border-gray-300 text-gray-400"
        }`}
      >
        {isOver ? "✓ Soltar aquí" : "Arrastra aquí para conectar"}
      </div>
    );
  };

  // ── Right panel ───────────────────────────────────────────────────────────────

  const renderPalette = () => (
    <div className="w-52 flex-shrink-0 border-l border-gray-200 bg-gray-50 overflow-y-auto">
      <div className="p-3 space-y-5">

        {/* Input types */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Inputs</p>
          {(["phone", "account_number", "bank_list"] as DeliveryNodeType[]).map(type => {
            const meta = NODE_META[type];
            // Gray out if this node type already exists in every flow that allows it
            const allowedFlows = flows.filter(f => ALLOWED_NODES[f.method].includes(type));
            const usedInAll = allowedFlows.length > 0 && allowedFlows.every(
              f => f.items.some(it => it.kind === "node" && it.node_type === type)
            );
            return (
              <div
                key={type}
                draggable={!usedInAll}
                onDragStart={e => {
                  if (usedInAll) { e.preventDefault(); return; }
                  e.dataTransfer.effectAllowed = "copy";
                  setPalDrag({ kind: "node", nodeType: type });
                }}
                onDragEnd={() => { if (!dropTarget) setPalDrag(null); }}
                title={usedInAll ? "Ya está en todos los flujos permitidos" : undefined}
                className={`flex items-start gap-2.5 p-2.5 bg-white border rounded-lg shadow-sm transition-all ${
                  usedInAll
                    ? "border-gray-100 opacity-40 cursor-not-allowed"
                    : "border-gray-200 cursor-grab active:cursor-grabbing hover:border-blue-300 hover:shadow"
                }`}
              >
                <span className="text-base leading-none mt-0.5">{meta.icon}</span>
                <div>
                  <div className="text-xs font-semibold text-gray-700">{meta.label}</div>
                  <div className="text-[10px] text-gray-400 leading-tight">{meta.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Wallet palette */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Billeteras</p>
          <p className="text-[10px] text-gray-400 leading-tight">
            Arrastra a <span className="font-semibold text-blue-500">Billetera Movil</span>
          </p>

          {/* Add new wallet */}
          <div className="flex gap-1">
            <input
              value={newWallet}
              onChange={e => setNewWallet(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addToPalette()}
              placeholder="Nequi, Daviplata..."
              className="flex-1 min-w-0 text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-400 bg-white"
            />
            <button
              onClick={addToPalette}
              disabled={!newWallet.trim()}
              className="px-2 py-1.5 rounded bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-700 flex-shrink-0"
            >
              <Plus size={13} />
            </button>
          </div>

          {/* Palette wallet list */}
          {palette.length === 0 && (
            <p className="text-[10px] text-gray-300 italic text-center py-2">Sin billeteras</p>
          )}
          {palette.map((pw, pwIdx) => {
            const isConnected = flows.find(f => f.method === "mobile_wallet")
              ?.items.some(it => it.kind === "wallet" && it.name === pw.name) ?? false;
            const isDragOver = pwOver === pwIdx && pwDrag !== null && pwDrag !== pwIdx;
            return (
              <div
                key={pw.lid}
                onDragOver={e => {
                  if (pwDrag !== null) { e.preventDefault(); setPwOver(pwIdx); }
                }}
                onDrop={() => {
                  if (pwDrag !== null) { reorderPalette(pwDrag, pwIdx); setPwDrag(null); setPwOver(null); }
                }}
                className={`flex items-center gap-2 p-2 bg-white border rounded-lg transition-all ${
                  isDragOver    ? "border-blue-400 bg-blue-50 scale-[1.02]"
                  : isConnected ? "border-blue-200 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300"
                }`}
              >
                {/* Grip — drag to reorder within palette */}
                <span
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.effectAllowed = "move";
                    setPwDrag(pwIdx);
                  }}
                  onDragEnd={() => { setPwDrag(null); setPwOver(null); }}
                  className="flex-shrink-0 cursor-grab active:cursor-grabbing"
                >
                  <GripVertical size={13} className="text-gray-300" />
                </span>
                {/* Card body — drag onto canvas */}
                <span
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.effectAllowed = "copy";
                    setPalDrag({ kind: "wallet", walletLid: pw.lid, walletDbId: pw.id, name: pw.name });
                  }}
                  onDragEnd={() => { if (!dropTarget) setPalDrag(null); }}
                  className="flex-1 text-xs font-medium text-gray-700 truncate cursor-grab active:cursor-grabbing select-none"
                >
                  {pw.name}
                </span>
                {isConnected && <span className="text-[9px] text-blue-500 font-bold flex-shrink-0">✓</span>}
                <button
                  onClick={() => removePaletteWallet(pw.lid)}
                  className="text-gray-300 hover:text-red-400 flex-shrink-0"
                  onDragStart={e => e.stopPropagation()}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Agency palette */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Agencias de Pago</p>
          <p className="text-[10px] text-gray-400 leading-tight">
            Arrastra a <span className="font-semibold text-emerald-600">Efectivo</span>
          </p>

          {/* Add new agency */}
          <div className="flex gap-1">
            <input
              value={newAgency}
              onChange={e => setNewAgency(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addToAgencyPalette()}
              placeholder="Efecty, Baloto..."
              className="flex-1 min-w-0 text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-emerald-400 bg-white"
            />
            <button
              onClick={addToAgencyPalette}
              disabled={!newAgency.trim()}
              className="px-2 py-1.5 rounded bg-emerald-600 text-white disabled:opacity-40 hover:bg-emerald-700 flex-shrink-0"
            >
              <Plus size={13} />
            </button>
          </div>

          {agencyPalette.length === 0 && (
            <p className="text-[10px] text-gray-300 italic text-center py-2">Sin agencias</p>
          )}
          {agencyPalette.map((pa, paIdx) => {
            const isConnected = flows.find(f => f.method === "cash_pickup")
              ?.items.some(it => it.kind === "agency" && it.name === pa.name) ?? false;
            const isDragOver = paOver === paIdx && paDrag !== null && paDrag !== paIdx;
            return (
              <div
                key={pa.lid}
                onDragOver={e => {
                  if (paDrag !== null) { e.preventDefault(); setPaOver(paIdx); }
                }}
                onDrop={() => {
                  if (paDrag !== null) { reorderAgencyPalette(paDrag, paIdx); setPaDrag(null); setPaOver(null); }
                }}
                className={`flex items-center gap-2 p-2 bg-white border rounded-lg transition-all ${
                  isDragOver    ? "border-emerald-400 bg-emerald-50 scale-[1.02]"
                  : isConnected ? "border-emerald-200 bg-emerald-50"
                  : "border-gray-200 hover:border-emerald-300"
                }`}
              >
                <span
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.effectAllowed = "move";
                    setPaDrag(paIdx);
                  }}
                  onDragEnd={() => { setPaDrag(null); setPaOver(null); }}
                  className="flex-shrink-0 cursor-grab active:cursor-grabbing"
                >
                  <GripVertical size={13} className="text-gray-300" />
                </span>
                <span
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.effectAllowed = "copy";
                    setPalDrag({ kind: "agency", walletLid: pa.lid, walletDbId: pa.id, name: pa.name });
                  }}
                  onDragEnd={() => { if (!dropTarget) setPalDrag(null); }}
                  className="flex-1 text-xs font-medium text-gray-700 truncate cursor-grab active:cursor-grabbing select-none"
                >
                  {pa.name}
                </span>
                {isConnected && <span className="text-[9px] text-emerald-600 font-bold flex-shrink-0">✓</span>}
                <button
                  onClick={() => removePaletteAgency(pa.lid)}
                  className="text-gray-300 hover:text-red-400 flex-shrink-0"
                  onDragStart={e => e.stopPropagation()}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ── Main layout ───────────────────────────────────────────────────────────────

  const receiveCountries = countries.filter(c => c.receive);

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Flujo de Métodos de Entrega</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Arrastra inputs desde el panel derecho y conéctalos a cada método
          </p>
        </div>
        {country && partnership && (
          <div className="flex items-center gap-3">
            {dirty && (
              <span className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                <AlertCircle size={13} /> Sin guardar
              </span>
            )}
            <button
              onClick={save}
              disabled={saving || !dirty}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dirty && !saving ? "bg-papaya-orange text-white hover:bg-orange-600 shadow-sm" : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Guardar
            </button>
          </div>
        )}
      </div>

      {/* Country selector — only receive=true countries */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Alianza:</label>
        <select
          value={partnership}
          onChange={e => { setPartnership(e.target.value ? Number(e.target.value) : ""); setCountry(""); setDirty(false); setSaveErr(null); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-papaya-orange bg-white"
        >
          <option value="">Selecciona una alianza...</option>
          {partnerships.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">País destino:</label>
        <select
          value={country}
          onChange={e => { setCountry(e.target.value); setDirty(false); setSaveErr(null); }}
          disabled={!partnership}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-papaya-orange bg-white disabled:opacity-50"
        >
          <option value="">Selecciona un país...</option>
          {receiveCountries.map(c => (
            <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
          ))}
        </select>
        {loading && <Loader2 size={16} className="animate-spin text-gray-400" />}
      </div>

      {/* Question label — shared across all methods for this country+partnership */}
      {country && partnership && !loading && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Pregunta al beneficiario:
          </label>
          <input
            type="text"
            value={questionLabel}
            onChange={e => { setQuestionLabel(e.target.value); mark(); }}
            placeholder="ej. ¿Cómo deseas recibir el dinero?"
            className="flex-1 max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-papaya-orange"
          />
        </div>
      )}

      {saveErr && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <AlertCircle size={14} /> {saveErr}
        </div>
      )}

      {/* Legend */}
      {country && partnership && !loading && (
        <div className="flex items-center gap-3 text-[11px] text-gray-400 flex-wrap">
          <span>⠿ Arrastra el encabezado para mover tarjetas</span>
          <span className="text-gray-200">|</span>
          <span>⟵ Arrastra inputs del panel derecho para conectar</span>
          <span className="text-gray-200">|</span>
          <span className="text-emerald-500 font-medium">toggle = activa/desactiva método</span>
        </div>
      )}

      {/* Canvas + palette */}
      {country && partnership && !loading ? (
        <div className="flex border border-gray-200 rounded-xl overflow-hidden">

          {/* Canvas */}
          <div
            className="flex-1 overflow-hidden relative"
            style={{
              backgroundColor: "#f8fafc",
              backgroundImage: "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              cursor: cardDrag ? "grabbing" : "default",
            }}
          >
            <div style={{ position: "relative", width: canvasW, height: canvasH }}>
              {/* SVG lines */}
              {renderLines()}

              {flows.map(flow => {
                const items: React.ReactElement[] = [];
                // Method header card
                items.push(renderMethodCard(flow));

                // Items in drop order
                let y = flow.pos_y + METHOD_H + CONN_H;
                flow.items.forEach((item, idx) => {
                  if (item.kind === "node") {
                    items.push(renderNodeCard(flow, item, idx, y));
                  } else if (item.kind === "wallet" || item.kind === "agency") {
                    items.push(renderWalletCard(flow, item as Extract<CanvasItem, {kind:"wallet"|"agency"}>, idx, y));
                  }
                  y += itemH(item) + CONN_H;
                });

                // Drop zone (only when dragging from palette)
                const dz = renderDropZone(flow);
                if (dz) items.push(dz);

                return items;
              })}
            </div>
          </div>

          {/* Right palette */}
          {renderPalette()}
        </div>
      ) : !country || !partnership ? (
        <div className="flex items-center justify-center h-56 text-gray-400">
          <p className="text-sm">Selecciona un país con entrega activada para configurar sus flujos</p>
        </div>
      ) : null}
    </div>
  );
};
