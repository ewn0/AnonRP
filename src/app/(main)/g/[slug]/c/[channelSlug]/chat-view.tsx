"use client";

import { useState, useEffect, useRef, forwardRef } from "react";
import { usePusherChannel } from "@/lib/pusher-client";
import { UserAvatar, UserNameLink } from "@/components/user-avatar";

interface Author {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  level: number;
  role: string;
  premiumTier: string | null;
}

interface ReplyTo {
  id: string;
  content: string;
  isDeleted?: boolean;
  author: { username: string; displayName: string | null };
}

interface Message {
  id: string;
  content: string;
  createdAt: string | Date;
  isEdited: boolean;
  editedAt?: string | Date | null;
  replyToId: string | null;
  isDeleted?: boolean;
  deletedReason?: string | null;
  author: Author;
  replyTo?: ReplyTo | null;
}

interface Channel {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: string;
  isSystem: boolean;
  isLocked: boolean;
  writePermission: string;
}

interface Props {
  channel: Channel;
  initialMessages: Message[];
  currentUserId: string;
  currentUserRole?: string;
  canWrite: boolean;
  isMod: boolean;
  mutedUntil: Date | null;
  groupSlug: string;
}

function addUnique(prev: Message[], msg: Message): Message[] {
  if (prev.some((m) => m.id === msg.id)) return prev;
  const next = [...prev, msg];
  next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return next;
}

export function ChatView({
  channel, initialMessages, currentUserId, currentUserRole = "MEMBER",
  canWrite, isMod, mutedUntil, groupSlug,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reward, setReward] = useState<{ coins: number; xp: number; levelUp?: number } | null>(null);
  const [reportingMessage, setReportingMessage] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isPlatformAdmin = currentUserRole === "ADMIN";
  const canModerate = isMod || isPlatformAdmin;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  useEffect(() => { if (replyingTo) inputRef.current?.focus(); }, [replyingTo]);

  usePusherChannel<Message>(
    `private-channel-${channel.id}`,
    "message:new",
    (msg) => setMessages((prev) => addUnique(prev, msg))
  );
  usePusherChannel<{ messageId: string }>(
    `private-channel-${channel.id}`,
    "message:deleted",
    ({ messageId }) => setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, isDeleted: true } : m)))
  );
  usePusherChannel<{ messageId: string; content: string; editedAt: string }>(
    `private-channel-${channel.id}`,
    "message:edited",
    ({ messageId, content, editedAt }) =>
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, content, isEdited: true, editedAt } : m)))
  );

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const content = input.trim();
    setSending(true);
    setError(null);

    try {
      const res = await fetch(`/api/channels/${channel.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, replyToId: replyingTo?.id }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Erreur d'envoi");
        return;
      }
      setMessages((prev) => addUnique(prev, body.message));
      setInput("");
      setReplyingTo(null);

      if (body.reward?.coinsEarned > 0 || body.reward?.leveledUp) {
        setReward({
          coins: body.reward.coinsEarned,
          xp: body.reward.xpGained,
          levelUp: body.reward.newLevel,
        });
        setTimeout(() => setReward(null), 3000);
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setSending(false);
    }
  }

  async function deleteMessage(message: Message) {
    if (!confirm("Supprimer ce message ?")) return;
    const isOwn = message.author.id === currentUserId;
    const reason = isOwn ? undefined : prompt("Raison (optionnel) :") ?? undefined;

    const res = await fetch(`/api/channels/${channel.id}/messages/${message.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error || "Erreur");
      return;
    }
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, isDeleted: true } : m)));
  }

  async function saveEdit(message: Message, newContent: string) {
    if (newContent.trim() === message.content.trim() || !newContent.trim()) {
      setEditingMessage(null);
      return;
    }
    const res = await fetch(`/api/channels/${channel.id}/messages/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent.trim() }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error || "Erreur");
      return;
    }
    setMessages((prev) => prev.map((m) => m.id === message.id ? { ...m, content: newContent.trim(), isEdited: true } : m));
    setEditingMessage(null);
  }

  let placeholder = `Envoyer un message dans #${channel.name}`;
  if (channel.isLocked) placeholder = "Ce channel est verrouillé";
  else if (channel.writePermission === "READ_ONLY") placeholder = "Lecture seule";
  else if (channel.writePermission === "MODS_ONLY" && !isMod) placeholder = "Réservé aux modérateurs";
  else if (mutedUntil && new Date(mutedUntil) > new Date()) placeholder = "Tu es muté";
  if (replyingTo) placeholder = `Répondre à @${replyingTo.author.username}...`;

  return (
    <>
      <header className="border-b border-border p-3 shrink-0 bg-card/30 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            {channel.isLocked ? "🔒" : channel.type === "ANNOUNCEMENT" ? "📢" : "#"}
          </span>
          <h1 className="font-bold">{channel.name}</h1>
          {channel.description && (
            <>
              <span className="text-muted-foreground/50 mx-1">·</span>
              <p className="text-sm text-muted-foreground truncate">{channel.description}</p>
            </>
          )}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Aucun message. Lance la conversation !
          </div>
        ) : (
          <ul className="space-y-0.5">
            {messages.map((msg, i) => {
              const prev = i > 0 ? messages[i - 1] : null;
              const isSameAuthor = prev && prev.author.id === msg.author.id && !msg.replyTo;
              const isSameMinute =
                prev &&
                Math.abs(new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime()) < 5 * 60 * 1000;
              const compact = isSameAuthor && isSameMinute;

              const canDeleteThis =
                !msg.isDeleted &&
                (msg.author.id === currentUserId || isPlatformAdmin || (canModerate && msg.author.role !== "ADMIN"));
              const canReportThis = !msg.isDeleted && msg.author.id !== currentUserId;
              const canEditThis =
                !msg.isDeleted &&
                msg.author.id === currentUserId &&
                Date.now() - new Date(msg.createdAt).getTime() < 15 * 60 * 1000;

              if (msg.isDeleted && !canModerate) {
                return <DeletedMessageLine key={msg.id} author={msg.author} />;
              }

              return (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  compact={compact ?? false}
                  isForMod={canModerate && msg.isDeleted === true}
                  canDelete={canDeleteThis}
                  canReport={canReportThis}
                  canEdit={canEditThis}
                  canReply={!msg.isDeleted}
                  isEditing={editingMessage?.id === msg.id}
                  onDelete={() => deleteMessage(msg)}
                  onReport={() => setReportingMessage(msg)}
                  onReply={() => setReplyingTo(msg)}
                  onStartEdit={() => setEditingMessage(msg)}
                  onCancelEdit={() => setEditingMessage(null)}
                  onSaveEdit={(c) => saveEdit(msg, c)}
                />
              );
            })}
          </ul>
        )}
      </div>

      {reward && (
        <div className="absolute bottom-20 right-64 bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg shadow-lg text-sm z-20">
          +{reward.xp} XP
          {reward.coins > 0 && <> · +{reward.coins} 💰</>}
          {reward.levelUp && <> · 🎉 Niveau {reward.levelUp} !</>}
        </div>
      )}

      <div className="border-t border-border shrink-0">
        {replyingTo && (
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border/50 text-xs">
            <span className="text-muted-foreground">↪ Réponse à</span>
            <span className="font-semibold">@{replyingTo.author.username}</span>
            <span className="text-muted-foreground truncate flex-1">{replyingTo.content.slice(0, 80)}</span>
            <button type="button" onClick={() => setReplyingTo(null)} className="text-muted-foreground hover:text-foreground" title="Annuler la réponse">
              ✕
            </button>
          </div>
        )}

        <form onSubmit={sendMessage} className="p-3">
          <MessageInput
            ref={inputRef}
            value={input}
            onChange={setInput}
            disabled={!canWrite || sending}
            placeholder={placeholder}
            groupSlug={groupSlug}
          />
          {error && <p className="text-xs text-destructive mt-2">{error}</p>}
        </form>
      </div>

      {reportingMessage && <ReportDialog message={reportingMessage} onClose={() => setReportingMessage(null)} />}
    </>
  );
}

function DeletedMessageLine({ author }: { author: Author }) {
  return (
    <li className="flex items-center gap-2 py-1 px-2 -mx-2 text-xs text-muted-foreground italic">
      <span className="opacity-60">@{author.username}</span>
      <span className="opacity-40">:</span>
      <span>Message supprimé</span>
    </li>
  );
}

function MessageItem({
  message, compact, isForMod, canDelete, canReport, canEdit, canReply, isEditing,
  onDelete, onReport, onReply, onStartEdit, onCancelEdit, onSaveEdit,
}: {
  message: Message;
  compact: boolean;
  isForMod: boolean;
  canDelete: boolean;
  canReport: boolean;
  canEdit: boolean;
  canReply: boolean;
  isEditing: boolean;
  onDelete: () => void;
  onReport: () => void;
  onReply: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (c: string) => void;
}) {
  const date = new Date(message.createdAt);
  const timeStr = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const dimmedForMod = isForMod ? "opacity-50" : "";

  const actionsButtons = (canDelete || canReport || canEdit || canReply) && !isEditing ? (
    <div className="absolute right-2 top-1 flex items-center gap-1 bg-card border border-border rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10">
      {canReply && <button onClick={onReply} title="Répondre" type="button" className="px-2 py-1 hover:bg-accent rounded-l-md text-sm">↪</button>}
      {canEdit && <button onClick={onStartEdit} title="Modifier" type="button" className="px-2 py-1 hover:bg-accent text-sm">🖊️</button>}
      {canReport && <button onClick={onReport} title="Signaler" type="button" className="px-2 py-1 hover:bg-accent text-base">🚩</button>}
      {canDelete && <button onClick={onDelete} title="Supprimer" type="button" className="px-2 py-1 hover:bg-destructive/20 rounded-r-md text-base">🗑️</button>}
    </div>
  ) : null;

  const contentBlock = isEditing ? (
    <InlineEditor initialValue={message.content} onCancel={onCancelEdit} onSave={onSaveEdit} />
  ) : (
    <p className="text-sm whitespace-pre-wrap break-words">
      {renderContentWithMentions(message.content)}
      {message.isEdited && <span className="text-xs text-muted-foreground"> (modifié)</span>}
      {isForMod && (
        <span className="text-xs text-destructive ml-1">
          (supprimé{message.deletedReason ? ` — "${message.deletedReason}"` : ""})
        </span>
      )}
    </p>
  );

  if (compact) {
    return (
      <li className={`group relative flex gap-3 hover:bg-accent/30 -mx-2 px-2 py-0.5 rounded ${dimmedForMod}`}>
        <span className="w-10 shrink-0 text-right text-[10px] text-muted-foreground/0 group-hover:text-muted-foreground pt-1">
          {timeStr}
        </span>
        <div className="flex-1 min-w-0">{contentBlock}</div>
        {actionsButtons}
      </li>
    );
  }

  return (
    <li className={`group relative flex gap-3 mt-3 hover:bg-accent/30 -mx-2 px-2 py-1 rounded ${dimmedForMod}`}>
      <UserAvatar user={message.author} size="md" showStatus={false} />
      <div className="flex-1 min-w-0">
        {message.replyTo && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1 pl-2 border-l-2 border-primary/40">
            <span>↪ @{message.replyTo.author.username} :</span>
            <span className="truncate italic opacity-80">
              {message.replyTo.isDeleted ? "[message supprimé]" : message.replyTo.content.slice(0, 100)}
            </span>
          </div>
        )}
        <div className="flex items-baseline gap-2 flex-wrap">
          <UserNameLink user={message.author} />
          <span className="text-xs text-muted-foreground">{timeStr}</span>
        </div>
        {contentBlock}
      </div>
      {actionsButtons}
    </li>
  );
}

function InlineEditor({ initialValue, onCancel, onSave }: { initialValue: string; onCancel: () => void; onSave: (v: string) => void; }) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSave(value);
    }
  }

  return (
    <div className="space-y-1">
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKey}
        rows={2}
        className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm resize-none"
      />
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <button type="button" onClick={() => onSave(value)} className="text-primary hover:underline">
          Enregistrer (Entrée)
        </button>
        <span>·</span>
        <button type="button" onClick={onCancel} className="hover:underline">
          Annuler (Échap)
        </button>
      </div>
    </div>
  );
}

function renderContentWithMentions(content: string) {
  const parts = content.split(/(@[a-zA-Z0-9_-]{3,20})/g);
  return parts.map((part, i) => {
    if (/^@[a-zA-Z0-9_-]{3,20}$/.test(part)) {
      return (
        <span key={i} className="px-1 rounded bg-primary/20 text-primary font-medium">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

interface Suggestion {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface MessageInputProps {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  placeholder: string;
  groupSlug: string;
}

const MessageInput = forwardRef<HTMLInputElement, MessageInputProps>(function MessageInputComp(
  { value, onChange, disabled, placeholder, groupSlug },
  ref
) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [mentionQuery, setMentionQuery] = useState<{ query: string; atPos: number } | null>(null);

  const localRef = useRef<HTMLInputElement>(null);
  const inputRef = (ref as React.MutableRefObject<HTMLInputElement> | null) ?? localRef;

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const caretPos = el.selectionStart ?? value.length;
    const before = value.slice(0, caretPos);
    const m = before.match(/@([a-zA-Z0-9_-]{0,20})$/);
    if (m) {
      setMentionQuery({ query: m[1], atPos: caretPos - m[0].length });
    } else {
      setMentionQuery(null);
      setSuggestions([]);
    }
  }, [value, inputRef]);

  useEffect(() => {
    if (!mentionQuery || mentionQuery.query.length < 1) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/groups/${groupSlug}/search-members?q=${encodeURIComponent(mentionQuery.query)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setSuggestions(data.users.slice(0, 6));
          setSelectedIdx(0);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [mentionQuery?.query, groupSlug]);

  function applySuggestion(sug: Suggestion) {
    if (!mentionQuery) return;
    const caretPos = inputRef.current?.selectionStart ?? value.length;
    const before = value.slice(0, mentionQuery.atPos);
    const after = value.slice(caretPos);
    onChange(`${before}@${sug.username} ${after}`);
    setMentionQuery(null);
    setSuggestions([]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Tab" || e.key === "Enter") {
      const sug = suggestions[selectedIdx];
      if (sug) {
        e.preventDefault();
        applySuggestion(sug);
      }
    } else if (e.key === "Escape") {
      setSuggestions([]);
    }
  }

  return (
    <div className="relative">
      {suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 mb-1 w-full max-w-xs bg-card border border-border rounded-md shadow-lg overflow-hidden z-20">
          {suggestions.map((sug, i) => {
            const initials = (sug.displayName || sug.username).substring(0, 2).toUpperCase();
            return (
              <button
                key={sug.id}
                type="button"
                onClick={() => applySuggestion(sug)}
                onMouseEnter={() => setSelectedIdx(i)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left ${i === selectedIdx ? "bg-accent" : ""}`}
              >
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold overflow-hidden shrink-0">
                  {sug.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sug.avatarUrl} alt={sug.username} className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <span className="truncate">
                  <span className="font-semibold">{sug.displayName || sug.username}</span>
                  <span className="text-muted-foreground ml-1">@{sug.username}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          maxLength={4000}
          placeholder={placeholder}
          className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || value.trim().length === 0}
          className="px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90"
        >
          Envoyer
        </button>
      </div>
    </div>
  );
});

function ReportDialog({ message, onClose }: { message: Message; onClose: () => void; }) {
  const [reason, setReason] = useState<string>("HARASSMENT");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reasons = [
    { value: "HARASSMENT", label: "Harcèlement / insultes" },
    { value: "SPAM", label: "Spam" },
    { value: "HATE_SPEECH", label: "Propos haineux" },
    { value: "SEXUAL_CONTENT", label: "Contenu sexuel non consenti" },
    { value: "MINOR_SAFETY", label: "Protection des mineurs" },
    { value: "VIOLENCE", label: "Violence" },
    { value: "ILLEGAL_CONTENT", label: "Contenu illégal" },
    { value: "IMPERSONATION", label: "Usurpation d'identité" },
    { value: "OTHER", label: "Autre" },
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: message.id, reason, description: description || undefined }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Erreur");
        return;
      }
      setSuccess(true);
      setTimeout(onClose, 2000);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-1">🚩 Signaler un message</h2>
        <p className="text-xs text-muted-foreground mb-4">De @{message.author.username}</p>
        <div className="p-2 rounded bg-muted/30 text-sm mb-4 max-h-24 overflow-y-auto">
          "{message.content.slice(0, 200)}{message.content.length > 200 ? "..." : ""}"
        </div>
        {success ? (
          <div className="p-3 rounded bg-green-600/20 text-green-400 text-sm">
            ✓ Signalement envoyé. L'équipe va l'examiner.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Motif</label>
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full mt-1 h-10 rounded-md border border-input bg-background px-2 text-sm">
                {reasons.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Détails (optionnel)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={3}
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Contexte utile..." />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-accent">Annuler</button>
              <button type="submit" disabled={submitting} className="px-4 py-2 text-sm rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50">
                {submitting ? "Envoi..." : "Signaler"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
