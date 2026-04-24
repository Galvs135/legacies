import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { AssistantCitation } from "../lib/types";

type Message = { id: string; question: string; answer: string; citations: AssistantCitation[]; createdAt: string };

export function AiAssistantPage() {
  const { t } = useTranslation();
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history, isLoading]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const cleanedQuestion = question.trim();
    if (!cleanedQuestion) return;
    setIsLoading(true);
    setError("");
    try {
      const response = await api.askAssistantRag(cleanedQuestion);
      setHistory((prev) => [
        {
          id: crypto.randomUUID(),
          question: cleanedQuestion,
          answer: response.answer,
          citations: response.citations ?? [],
          createdAt: new Date().toISOString()
        },
        ...prev
      ]);
      setQuestion("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha desconhecida.";
      setError(`${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const form = event.currentTarget.form;
      form?.requestSubmit();
    }
  };

  return (
    <div className="page ai-page ai-chat-page">
      <h2>{t("ai.title")}</h2>
      <p className="muted ai-chat-subtitle">{t("ai.subtitle")}</p>

      <section className="panel ai-chat-shell">
        <div className="ai-chat-messages">
          {history.length === 0 && !isLoading && (
            <div className="ai-empty-state">
              <p>{t("ai.emptyState")}</p>
            </div>
          )}

          {history.map((item) => (
            <div key={item.id} className="ai-message-group">
              <article className="ai-message ai-message-user">
                <p>{item.question}</p>
              </article>
              <article className="ai-message ai-message-assistant">
                <p>{item.answer}</p>
                {item.citations.length > 0 && (
                  <div className="ai-citations">
                    <small>{t("ai.sourcesUsed")}</small>
                    <ul>
                      {item.citations.map((citation, index) => (
                        <li key={`${item.id}-${citation.sourceId}-${index}`}>
                          <strong>{citation.title}</strong>
                          <span>{citation.snippet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            </div>
          ))}

          {isLoading && (
            <article className="ai-message ai-message-assistant ai-message-loading">
              <p>{t("ai.loadingMessage")}</p>
            </article>
          )}
          {error && <p className="error-text">{error}</p>}
          <div ref={messagesEndRef} />
        </div>

        <div className="ai-chat-composer-wrap">
          <form className="ai-chat-composer" onSubmit={onSubmit}>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t("ai.askPlaceholder")}
              rows={1}
              required
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? t("ai.asking") : t("ai.ask")}
            </button>
          </form>
          <small className="muted">{t("ai.inputHint")}</small>
        </div>
      </section>
    </div>
  );
}
