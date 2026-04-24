import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { api } from "../lib/api";
import { ConversationItem, ConversationMessageItem } from "../lib/types";

type SentimentUi = {
  title: string;
  pill: string;
  tone: "positive" | "neutral" | "negative";
  guidance: string;
  score: number;
};

export function WhatsAppPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "pt-BR";
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [messages, setMessages] = useState<ConversationMessageItem[]>([]);
  const [draftMessage, setDraftMessage] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<ConversationMessageItem | null>(null);
  const [result, setResult] = useState<SentimentUi | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getWhatsappConversations().then((items) => {
      setConversations(items);
      if (items[0]) {
        setSelectedConversationId(items[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedConversationId) return;
    api.getWhatsappMessages(selectedConversationId).then(setMessages);
  }, [selectedConversationId]);

  const clientMessages = useMemo(
    () => messages.filter((message) => message.from === "cliente").length,
    [messages]
  );
  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  const onEvaluate = async (message: ConversationMessageItem) => {
    setSelectedMessage(message);
    setIsLoading(true);
    setError("");
    setResult(null);
    try {
      const sentiment = await api.analyzeSentiment(message.content);
      const tone = toTone(sentiment.label);
      setResult({
        title: t(toTitle(tone)),
        pill: t(toPill(tone)),
        tone,
        guidance: toGuidance(tone),
        score: sentiment.score
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao avaliar sentimento.");
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedConversationId || !draftMessage.trim()) return;
    await api.sendWhatsappMessage(selectedConversationId, draftMessage.trim());
    setDraftMessage("");
    setMessages(await api.getWhatsappMessages(selectedConversationId));
  };

  return (
    <div className="page whatsapp-page whatsapp-layout-page">
      <h2>{t("whatsapp.title")}</h2>
      <p className="muted whatsapp-subtitle">{t("whatsapp.subtitle")}</p>

      <section className="panel whatsapp-layout">
        <aside className="whatsapp-sidebar">
          <header className="whatsapp-sidebar-header">
            <h3>{t("whatsapp.openConversations")}</h3>
            <span className="tag">{conversations.length}</span>
          </header>

          <ul className="whatsapp-conversation-list">
            {conversations.map((conversation) => {
              const isSelected = conversation.id === selectedConversationId;
              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    className={`whatsapp-conversation-item ${isSelected ? "is-selected" : ""}`}
                    onClick={() => setSelectedConversationId(conversation.id)}
                  >
                    <strong>{conversation.clientName}</strong>
                    <small>
                      {conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toLocaleString(locale) : "-"}
                    </small>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <article className="whatsapp-main">
          <header className="whatsapp-main-header">
            <div>
              <h3>{selectedConversation?.clientName ?? t("whatsapp.activeChat")}</h3>
              <small>
                {selectedConversation?.lastMessageAt
                  ? new Date(selectedConversation.lastMessageAt).toLocaleString(locale)
                  : `${t("whatsapp.totalMessages")}: ${messages.length} | ${t("whatsapp.clientMessages")}: ${clientMessages}`}
              </small>
            </div>
          </header>

          <div className="whatsapp-messages-scroll">
            {messages.length === 0 && (
              <div className="whatsapp-empty-state">
                <p className="muted">
                  {selectedConversation ? `${t("whatsapp.totalMessages")}: 0` : t("whatsapp.openConversations")}
                </p>
              </div>
            )}
            {messages.map((message) => (
              <article
                key={message.id}
                className={message.from === "cliente" ? "chat-message from-client" : "chat-message from-lawyer"}
              >
                <div className="chat-bubble">
                  <small className="chat-sender">{message.from === "cliente" ? t("whatsapp.client") : t("whatsapp.lawyer")}</small>
                  <p>{message.content}</p>
                  <time className="chat-time">
                    {new Date(message.sentAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                  </time>
                </div>
                {message.from === "cliente" && (
                  <button type="button" className="evaluate-btn evaluate-inline-btn" onClick={() => onEvaluate(message)}>
                    {t("whatsapp.evaluate")}
                  </button>
                )}
              </article>
            ))}
          </div>

          <form className="whatsapp-composer" onSubmit={sendMessage}>
            <input
              value={draftMessage}
              onChange={(e) => setDraftMessage(e.target.value)}
              placeholder={t("whatsapp.draftPlaceholder")}
            />
            <button type="submit">{t("whatsapp.send")}</button>
          </form>
        </article>
      </section>

      {selectedMessage && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <header>
              <h3>{t("whatsapp.modalTitle")}</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setSelectedMessage(null)}
                aria-label={t("common.close")}
                title={t("common.close")}
              >
                <X size={16} />
              </button>
            </header>
            <p className="muted">{selectedMessage.content}</p>

            {isLoading && <p>{t("whatsapp.analyzing")}</p>}
            {error && <p className="error-text">{error}</p>}

            {result && (
              <article className="sentiment-visual-card">
                <header>
                  <strong>{result.title}</strong>
                  <span className={`sentiment-pill ${result.tone}`}>{result.pill}</span>
                </header>
                <div className="sentiment-meter">
                  <span className={result.tone} style={{ width: `${Math.max(10, Math.round(result.score * 100))}%` }} />
                </div>
                <p>{result.guidance}</p>
              </article>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function toTone(label: string): "positive" | "neutral" | "negative" {
  const normalized = label.toLowerCase();
  if (normalized.includes("neg")) return "negative";
  if (normalized.includes("neu")) return "neutral";
  return "positive";
}

function toTitle(tone: "positive" | "neutral" | "negative") {
  if (tone === "positive") return "whatsapp.receptiveLead";
  if (tone === "negative") return "whatsapp.resistantLead";
  return "whatsapp.leadUnderReview";
}

function toPill(tone: "positive" | "neutral" | "negative") {
  if (tone === "positive") return "whatsapp.highOpenness";
  if (tone === "negative") return "whatsapp.immediateAttention";
  return "whatsapp.neutralPosture";
}

function toGuidance(tone: "positive" | "neutral" | "negative") {
  if (tone === "positive") {
    return "Sugestao: avancar para proposta objetiva e confirmar proximo passo no mesmo atendimento.";
  }
  if (tone === "negative") {
    return "Sugestao: reduzir pressao comercial, tratar objeccoes e validar riscos com linguagem simples.";
  }
  return "Sugestao: aprofundar diagnostico com perguntas de contexto e urgencia antes de propor fechamento.";
}
