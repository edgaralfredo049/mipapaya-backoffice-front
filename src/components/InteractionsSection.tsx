import React, { useState, useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import {
  MessageSquarePlus,
  Mail,
  RotateCcw,
  RotateCw,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Indent,
  Outdent,
  ChevronDown,
  Send,
  StickyNote,
  Clock,
  User,
  X,
  MessageSquare,
} from "lucide-react";
import { api, ClientInteraction } from "../api";

// ─── Toolbar ────────────────────────────────────────────────────────────────

const FONTS = ["Sans Serif", "Serif", "Monospace"];
const FONT_MAP: Record<string, string> = {
  "Sans Serif": "sans-serif",
  "Serif":      "Georgia, serif",
  "Monospace":  "monospace",
};
const SIZES = [
  { label: "Normal",  cmd: "paragraph" },
  { label: "Título 1", cmd: "h1" },
  { label: "Título 2", cmd: "h2" },
  { label: "Título 3", cmd: "h3" },
];

function ToolbarButton({
  active = false,
  disabled = false,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`p-1.5 rounded-md transition-colors ${
        active
          ? "bg-papaya-orange/10 text-papaya-orange"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="w-px h-5 bg-gray-200 mx-0.5 self-center" />;
}

function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [fontOpen, setFontOpen]   = useState(false);
  const [sizeOpen, setSizeOpen]   = useState(false);
  const [alignOpen, setAlignOpen] = useState(false);

  if (!editor) return null;

  const currentFont = FONTS.find(
    (f) => editor.isActive("textStyle", { fontFamily: FONT_MAP[f] })
  ) ?? "Sans Serif";

  const currentSize = SIZES.find((s) =>
    s.cmd === "paragraph" ? editor.isActive("paragraph") : editor.isActive("heading", { level: parseInt(s.cmd[1]) })
  ) ?? SIZES[0];

  const ALIGNS = [
    { icon: <AlignLeft size={14} />,    value: "left",    label: "Izquierda" },
    { icon: <AlignCenter size={14} />,  value: "center",  label: "Centro" },
    { icon: <AlignRight size={14} />,   value: "right",   label: "Derecha" },
    { icon: <AlignJustify size={14} />, value: "justify", label: "Justificado" },
  ];
  const currentAlign = ALIGNS.find((a) => editor.isActive({ textAlign: a.value })) ?? ALIGNS[0];

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-gray-100 bg-gray-50/60 rounded-t-lg">
      {/* Undo / Redo */}
      <ToolbarButton title="Deshacer" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
        <RotateCcw size={14} />
      </ToolbarButton>
      <ToolbarButton title="Rehacer" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
        <RotateCw size={14} />
      </ToolbarButton>

      <Divider />

      {/* Font family */}
      <div className="relative">
        <button
          type="button"
          onClick={() => { setFontOpen((v) => !v); setSizeOpen(false); setAlignOpen(false); }}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
        >
          {currentFont} <ChevronDown size={12} />
        </button>
        {fontOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[130px]">
            {FONTS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => { editor.chain().focus().setFontFamily(FONT_MAP[f]).run(); setFontOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors ${currentFont === f ? "text-papaya-orange font-medium" : "text-gray-700"}`}
                style={{ fontFamily: FONT_MAP[f] }}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Text size / heading */}
      <div className="relative">
        <button
          type="button"
          onClick={() => { setSizeOpen((v) => !v); setFontOpen(false); setAlignOpen(false); }}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
        >
          {currentSize.label} <ChevronDown size={12} />
        </button>
        {sizeOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[120px]">
            {SIZES.map((s) => (
              <button
                key={s.cmd}
                type="button"
                onClick={() => {
                  if (s.cmd === "paragraph") editor.chain().focus().setParagraph().run();
                  else editor.chain().focus().toggleHeading({ level: parseInt(s.cmd[1]) as 1|2|3 }).run();
                  setSizeOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors ${currentSize.cmd === s.cmd ? "text-papaya-orange font-medium" : "text-gray-700"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <Divider />

      {/* Bold / Italic / Underline */}
      <ToolbarButton title="Negrita" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold size={14} />
      </ToolbarButton>
      <ToolbarButton title="Cursiva" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic size={14} />
      </ToolbarButton>
      <ToolbarButton title="Subrayado" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon size={14} />
      </ToolbarButton>

      {/* Text color */}
      <div className="relative flex items-center" title="Color de texto">
        <label className="flex items-center gap-0.5 p-1.5 rounded-md cursor-pointer hover:bg-gray-100 transition-colors">
          <span className="text-xs font-bold text-gray-700 underline decoration-2" style={{ textDecorationColor: editor.getAttributes("textStyle").color ?? "#000" }}>A</span>
          <input
            type="color"
            className="sr-only"
            value={editor.getAttributes("textStyle").color ?? "#000000"}
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          />
          <ChevronDown size={10} className="text-gray-400" />
        </label>
      </div>

      <Divider />

      {/* Text alignment */}
      <div className="relative">
        <button
          type="button"
          onClick={() => { setAlignOpen((v) => !v); setFontOpen(false); setSizeOpen(false); }}
          className="flex items-center gap-0.5 p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
          title="Alineación"
        >
          {currentAlign.icon} <ChevronDown size={10} />
        </button>
        {alignOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            {ALIGNS.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => { editor.chain().focus().setTextAlign(a.value).run(); setAlignOpen(false); }}
                className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors ${editor.isActive({ textAlign: a.value }) ? "text-papaya-orange font-medium" : "text-gray-700"}`}
              >
                {a.icon} {a.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lists */}
      <ToolbarButton title="Lista ordenada" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered size={14} />
      </ToolbarButton>
      <ToolbarButton title="Lista con viñetas" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List size={14} />
      </ToolbarButton>

      {/* Indent / Outdent (work on list items) */}
      <ToolbarButton title="Aumentar sangría" onClick={() => editor.chain().focus().sinkListItem("listItem").run()} disabled={!editor.can().sinkListItem("listItem")}>
        <Indent size={14} />
      </ToolbarButton>
      <ToolbarButton title="Reducir sangría" onClick={() => editor.chain().focus().liftListItem("listItem").run()} disabled={!editor.can().liftListItem("listItem")}>
        <Outdent size={14} />
      </ToolbarButton>
    </div>
  );
}

// ─── Rich Text Editor ────────────────────────────────────────────────────────

function RichEditor({
  content,
  onChange,
  placeholder = "Escribe aquí…",
  header,
}: {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  header?: React.ReactNode;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      FontFamily,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = () => document.dispatchEvent(new Event("close-dropdowns"));
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden focus-within:border-papaya-orange focus-within:ring-2 focus-within:ring-papaya-orange/20 transition-all">
      {header}
      <EditorToolbar editor={editor} />
      <EditorContent
        editor={editor}
        className="min-h-[160px] max-h-[260px] overflow-y-auto px-4 py-3 text-sm text-gray-800 focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[140px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_h1]:text-xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h2]:text-lg [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h3]:text-base [&_.ProseMirror_h3]:font-semibold"
      />
    </div>
  );
}

// ─── Notes Tab ───────────────────────────────────────────────────────────────

function NotesTab({
  clientId,
  interactions,
  onAdded,
}: {
  clientId: number;
  interactions: ClientInteraction[];
  onAdded: (item: ClientInteraction) => void;
}) {
  const [text, setText]           = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [notePage, setNotePage]   = useState(1);
  const [viewNote, setViewNote]   = useState<ClientInteraction | null>(null);
  const NOTE_PAGE_SIZE = 5;

  const notes = interactions.filter((i) => i.type === "note");
  const noteTotalPages = Math.ceil(notes.length / NOTE_PAGE_SIZE);
  const notesSlice = notes.slice((notePage - 1) * NOTE_PAGE_SIZE, notePage * NOTE_PAGE_SIZE);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await api.addClientNote(clientId, text.trim());
      onAdded(created);
      setText("");
      setNotePage(1);
    } catch {
      setError("Error al guardar la nota.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe una nota sobre la conversación…"
          rows={2}
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:border-papaya-orange focus:ring-2 focus:ring-papaya-orange/20 transition-all"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!text.trim() || saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-papaya-orange text-white shadow-sm hover:bg-papaya-orange/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <StickyNote size={14} />
            {saving ? "Guardando…" : "Agregar nota"}
          </button>
        </div>
      </form>

      {notes.length > 0 && (
        <div className="border-t border-gray-50 pt-3 space-y-2">
          <div className="space-y-2">
            {notesSlice.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setViewNote(n)}
                className="w-full text-left bg-yellow-50/60 border border-yellow-100 rounded-lg px-3 py-2.5 space-y-1 hover:bg-yellow-100/60 hover:border-yellow-200 transition-colors"
              >
                <p className="text-sm text-gray-800 line-clamp-2">{n.content}</p>
                <div className="flex items-center gap-3 text-[11px] text-gray-400">
                  <span className="flex items-center gap-1"><User size={10} /> {n.created_by}</span>
                  <span className="flex items-center gap-1"><Clock size={10} /> {fmtDate(n.created_at)}</span>
                </div>
              </button>
            ))}
          </div>
          {noteTotalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-gray-400">{(notePage - 1) * NOTE_PAGE_SIZE + 1}–{Math.min(notePage * NOTE_PAGE_SIZE, notes.length)} de {notes.length}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setNotePage(1)} disabled={notePage === 1} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors">«</button>
                <button onClick={() => setNotePage((p) => p - 1)} disabled={notePage === 1} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors">‹</button>
                <span className="px-2 py-0.5 rounded bg-papaya-orange text-white text-[11px] font-semibold min-w-[24px] text-center">{notePage}</span>
                <button onClick={() => setNotePage((p) => p + 1)} disabled={notePage === noteTotalPages} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors">›</button>
                <button onClick={() => setNotePage(noteTotalPages)} disabled={notePage === noteTotalPages} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors">»</button>
              </div>
            </div>
          )}
        </div>
      )}

      {notes.length === 0 && (
        <div className="py-6 text-center text-sm text-gray-400">Sin notas registradas</div>
      )}

      {/* Note detail modal */}
      {viewNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setViewNote(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2 text-sm font-semibold text-heading-text">
                <StickyNote size={15} className="text-papaya-orange" /> Nota
              </div>
              <button onClick={() => setViewNote(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{viewNote.content}</p>
            </div>
            <div className="px-6 py-3 border-t border-gray-50 flex items-center gap-4 text-[11px] text-gray-400">
              <span className="flex items-center gap-1"><User size={10} /> {viewNote.created_by}</span>
              <span className="flex items-center gap-1"><Clock size={10} /> {fmtDate(viewNote.created_at)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Email Tab ───────────────────────────────────────────────────────────────

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function EmailTab({
  clientId,
  clientEmail,
  interactions,
  onAdded,
}: {
  clientId: number;
  clientEmail: string | null;
  interactions: ClientInteraction[];
  onAdded: (item: ClientInteraction) => void;
}) {
  const to = clientEmail ?? "";
  const [subject, setSubject]       = useState("");
  const [html, setHtml]             = useState("");
  const [sending, setSending]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [sent, setSent]             = useState(false);
  const [emailPage, setEmailPage]   = useState(1);
  const [viewEmail, setViewEmail]   = useState<ClientInteraction | null>(null);
  const EMAIL_PAGE_SIZE = 2;

  const emails = interactions.filter((i) => i.type === "email");
  const emailTotalPages = Math.ceil(emails.length / EMAIL_PAGE_SIZE);
  const emailsSlice = emails.slice((emailPage - 1) * EMAIL_PAGE_SIZE, emailPage * EMAIL_PAGE_SIZE);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!to.trim() || !subject.trim() || !html.trim()) return;
    setSending(true);
    setError(null);
    setSent(false);
    try {
      const created = await api.sendClientEmail(clientId, to.trim(), subject.trim(), html);
      onAdded(created);
      setSubject("");
      setHtml("");
      setSent(true);
      setEmailPage(1);
      setTimeout(() => setSent(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al enviar el correo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSend} className="space-y-2">
        <RichEditor
          content={html}
          onChange={setHtml}
          placeholder="Escribe el mensaje…"
          header={
            <>
              <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 text-sm">
                <span className="text-xs text-gray-400 w-12 shrink-0">Para</span>
                <span className="text-gray-700 truncate">{to || <span className="text-gray-400 text-xs">Sin correo registrado</span>}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-100 text-sm">
                <span className="text-xs text-gray-400 w-12 shrink-0">Asunto</span>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Escribe el asunto…"
                  className="flex-1 text-gray-800 placeholder-gray-400 focus:outline-none bg-transparent py-0.5"
                />
              </div>
            </>
          }
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex items-center justify-end gap-2">
          {sent && <span className="text-xs text-green-600 font-medium">¡Correo guardado!</span>}
          <button
            type="submit"
            disabled={!to.trim() || !subject.trim() || !html.trim() || sending}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-papaya-orange text-white shadow-sm hover:bg-papaya-orange/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={14} />
            {sending ? "Enviando…" : "Enviar correo"}
          </button>
        </div>
      </form>

      {emails.length > 0 && (
        <div className="border-t border-gray-50 pt-3 space-y-2">
          <div className="space-y-2">
            {emailsSlice.map((em) => (
              <button
                key={em.id}
                type="button"
                onClick={() => setViewEmail(em)}
                className="w-full text-left bg-blue-50/50 border border-blue-100 rounded-lg px-3 py-2.5 space-y-1 hover:bg-blue-100/50 hover:border-blue-200 transition-colors"
              >
                <p className="text-xs font-semibold text-gray-700 line-clamp-1">{em.subject}</p>
                <p className="text-sm text-gray-600 line-clamp-2">{stripHtml(em.content)}</p>
                <div className="flex items-center gap-3 text-[11px] text-gray-400">
                  <span className="flex items-center gap-1"><User size={10} /> {em.created_by}</span>
                  <span className="flex items-center gap-1"><Clock size={10} /> {fmtDate(em.created_at)}</span>
                </div>
              </button>
            ))}
          </div>
          {emailTotalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-gray-400">{(emailPage - 1) * EMAIL_PAGE_SIZE + 1}–{Math.min(emailPage * EMAIL_PAGE_SIZE, emails.length)} de {emails.length}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setEmailPage(1)} disabled={emailPage === 1} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors">«</button>
                <button onClick={() => setEmailPage((p) => p - 1)} disabled={emailPage === 1} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors">‹</button>
                <span className="px-2 py-0.5 rounded bg-papaya-orange text-white text-[11px] font-semibold min-w-[24px] text-center">{emailPage}</span>
                <button onClick={() => setEmailPage((p) => p + 1)} disabled={emailPage === emailTotalPages} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors">›</button>
                <button onClick={() => setEmailPage(emailTotalPages)} disabled={emailPage === emailTotalPages} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors">»</button>
              </div>
            </div>
          )}
        </div>
      )}

      {emails.length === 0 && (
        <div className="py-6 text-center text-sm text-gray-400">Sin correos enviados</div>
      )}

      {/* Email detail modal */}
      {viewEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setViewEmail(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden" onClick={(ev) => ev.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2 text-sm font-semibold text-heading-text">
                <Mail size={15} className="text-papaya-orange" />
                <span className="truncate max-w-[340px]">{viewEmail.subject}</span>
              </div>
              <button onClick={() => setViewEmail(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div
              className="px-6 py-5 max-h-[60vh] overflow-y-auto text-sm text-gray-800 [&_*]:max-w-full [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
              dangerouslySetInnerHTML={{ __html: viewEmail.content }}
            />
            <div className="px-6 py-3 border-t border-gray-50 flex items-center gap-4 text-[11px] text-gray-400">
              <span className="flex items-center gap-1"><User size={10} /> {viewEmail.created_by}</span>
              <span className="flex items-center gap-1"><Clock size={10} /> {fmtDate(viewEmail.created_at)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SMS Tab ─────────────────────────────────────────────────────────────────

function SmsTab({
  clientId,
  clientPhone,
  interactions,
  onAdded,
}: {
  clientId: number;
  clientPhone: string | null;
  interactions: ClientInteraction[];
  onAdded: (item: ClientInteraction) => void;
}) {
  const to = clientPhone ?? "";
  const MAX = 160;
  const [message, setMessage]     = useState("");
  const [sending, setSending]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [sent, setSent]           = useState(false);
  const [smsPage, setSmsPage]     = useState(1);
  const SMS_PAGE_SIZE = 5;

  const smsList       = interactions.filter((i) => i.type === "sms");
  const smsTotalPages = Math.ceil(smsList.length / SMS_PAGE_SIZE);
  const smsSlice      = smsList.slice((smsPage - 1) * SMS_PAGE_SIZE, smsPage * SMS_PAGE_SIZE);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!to.trim() || !message.trim()) return;
    setSending(true);
    setError(null);
    setSent(false);
    try {
      const created = await api.sendClientSms(clientId, to.trim(), message.trim());
      onAdded(created);
      setMessage("");
      setSent(true);
      setSmsPage(1);
      setTimeout(() => setSent(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al enviar el SMS.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSend} className="space-y-2">
        <div className="border border-gray-200 rounded-lg overflow-hidden focus-within:border-papaya-orange focus-within:ring-2 focus-within:ring-papaya-orange/20 transition-all">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 text-sm bg-gray-50/60">
            <span className="text-xs text-gray-400 w-12 shrink-0">Para</span>
            <span className="text-gray-700 truncate">{to || <span className="text-gray-400 text-xs">Sin teléfono registrado</span>}</span>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX))}
            placeholder="Escribe el mensaje de texto…"
            rows={4}
            className="w-full px-4 py-3 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none"
          />
          <div className="flex justify-end px-3 py-1.5 border-t border-gray-100 bg-gray-50/40">
            <span className={`text-[11px] ${message.length >= MAX ? "text-red-500 font-medium" : "text-gray-400"}`}>
              {message.length}/{MAX}
            </span>
          </div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex items-center justify-end gap-2">
          {sent && <span className="text-xs text-green-600 font-medium">¡SMS enviado!</span>}
          <button
            type="submit"
            disabled={!to.trim() || !message.trim() || sending}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-papaya-orange text-white shadow-sm hover:bg-papaya-orange/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={14} />
            {sending ? "Enviando…" : "Enviar SMS"}
          </button>
        </div>
      </form>

      {smsList.length > 0 && (
        <div className="border-t border-gray-50 pt-3 space-y-2">
          {smsSlice.map((s) => (
            <div key={s.id} className="bg-green-50/50 border border-green-100 rounded-lg px-3 py-2.5 space-y-1">
              <p className="text-sm text-gray-800">{s.content}</p>
              <div className="flex items-center gap-3 text-[11px] text-gray-400">
                <span className="flex items-center gap-1"><User size={10} /> {s.created_by}</span>
                <span className="flex items-center gap-1"><Clock size={10} /> {fmtDate(s.created_at)}</span>
              </div>
            </div>
          ))}
          {smsTotalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-gray-400">{(smsPage - 1) * SMS_PAGE_SIZE + 1}–{Math.min(smsPage * SMS_PAGE_SIZE, smsList.length)} de {smsList.length}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setSmsPage(1)} disabled={smsPage === 1} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors">«</button>
                <button onClick={() => setSmsPage((p) => p - 1)} disabled={smsPage === 1} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors">‹</button>
                <span className="px-2 py-0.5 rounded bg-papaya-orange text-white text-[11px] font-semibold min-w-[24px] text-center">{smsPage}</span>
                <button onClick={() => setSmsPage((p) => p + 1)} disabled={smsPage === smsTotalPages} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors">›</button>
                <button onClick={() => setSmsPage(smsTotalPages)} disabled={smsPage === smsTotalPages} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors">»</button>
              </div>
            </div>
          )}
        </div>
      )}

      {smsList.length === 0 && (
        <div className="py-6 text-center text-sm text-gray-400">Sin SMS enviados</div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(s: string) {
  return new Date(s.includes("T") ? s : s + "Z").toLocaleString("es", {
    timeZone: "America/New_York",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// ─── Main component ──────────────────────────────────────────────────────────

export function InteractionsSection({
  clientId,
  clientEmail,
  clientPhone,
  bare = false,
}: {
  clientId: number;
  clientEmail: string | null;
  clientPhone?: string | null;
  bare?: boolean;
}) {
  const [tab, setTab]                   = useState<"notes" | "email" | "sms">("notes");
  const [interactions, setInteractions] = useState<ClientInteraction[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    api.getClientInteractions(clientId)
      .then(setInteractions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  const handleAdded = useCallback((item: ClientInteraction) => {
    setInteractions((prev) => [item, ...prev]);
  }, []);

  const noteCount  = interactions.filter((i) => i.type === "note").length;
  const emailCount = interactions.filter((i) => i.type === "email").length;
  const smsCount   = interactions.filter((i) => i.type === "sms").length;

  const body = (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setTab("notes")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            tab === "notes" ? "bg-papaya-orange text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <StickyNote size={13} />
          Notas {noteCount > 0 && <span className="ml-0.5 text-[10px] bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5">{noteCount}</span>}
        </button>
        <button
          type="button"
          onClick={() => setTab("email")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            tab === "email" ? "bg-papaya-orange text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Mail size={13} />
          Correo {emailCount > 0 && <span className="ml-0.5 text-[10px] bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5">{emailCount}</span>}
        </button>
        <button
          type="button"
          onClick={() => setTab("sms")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            tab === "sms" ? "bg-papaya-orange text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <MessageSquare size={13} />
          SMS {smsCount > 0 && <span className="ml-0.5 text-[10px] bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5">{smsCount}</span>}
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-400 animate-pulse">Cargando…</div>
      ) : tab === "notes" ? (
        <NotesTab clientId={clientId} interactions={interactions} onAdded={handleAdded} />
      ) : tab === "sms" ? (
        <SmsTab clientId={clientId} clientPhone={clientPhone ?? null} interactions={interactions} onAdded={handleAdded} />
      ) : (
        <EmailTab clientId={clientId} clientEmail={clientEmail} interactions={interactions} onAdded={handleAdded} />
      )}
    </div>
  );

  if (bare) return body;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-50">
        <span className="text-papaya-orange"><MessageSquarePlus size={16} /></span>
        <h2 className="text-sm font-semibold text-heading-text flex-1">Interacciones</h2>
      </div>
      <div className="p-6">{body}</div>
    </div>
  );
}
