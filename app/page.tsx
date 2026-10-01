"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type ToolExecution = { tool: string; args: Record<string, string>; result: unknown };
type ChatResponse = { answer: string; usedModel: string; tools: ToolExecution[] };
type OrderContext = {
  order: { status: string; shippingStatus: string; expectedDelivery: string; lastUpdate: string };
  customer: { email: string; segment: string };
  payment: { status: string; method: string; amount: number };
};
type TicketStatus = "open" | "snoozed" | "resolved";
type MessageSender = "customer" | "agent" | "ai";
type ChatMessage = { id: string; sender: MessageSender; text: string; time: string; tools?: ToolExecution[] };
type Ticket = { id: string; name: string; initials: string; order: string; subject: string; time: string; color: string; message: string };
type Filter = "open" | "snoozed" | "resolved" | "all";
type DemoState = { statuses: Record<string, TicketStatus>; notes: Record<string, string[]>; messages: Record<string, ChatMessage[]>; autoReply: boolean };

const tickets: Ticket[] = [
  { id: "1024", name: "João Silva", initials: "JS", order: "8921", subject: "Meu pedido ainda não chegou", time: "agora", color: "blue", message: "Oi! Meu pedido ainda não chegou e o rastreio não atualiza faz um tempo. Vocês conseguem verificar pra mim?" },
  { id: "1023", name: "Mariana Costa", initials: "MC", order: "9012", subject: "Pagamento via PIX", time: "12 min", color: "violet", message: "Olá! Fiz o pagamento do meu pedido por PIX, mas ainda aparece como pendente. Podem conferir?" },
];
const filterLabels: Record<Filter, string> = { open: "Abertos", snoozed: "Adiados", resolved: "Resolvidos", all: "Todos" };
const initialMessages: Record<string, ChatMessage[]> = Object.fromEntries(tickets.map((ticket) => [ticket.id, [{ id: `in-${ticket.id}`, sender: "customer", text: ticket.message, time: "10:42" }]]));
const demoStateKey = "support-desk-state";
const emptyDemoState: DemoState = { statuses: {}, notes: {}, messages: {}, autoReply: true };
let cachedDemoState = emptyDemoState;
let cachedDemoStateJson: string | null | undefined;
const demoStateListeners = new Set<() => void>();

function getDemoState(): DemoState {
  if (typeof window === "undefined") return emptyDemoState;
  const currentJson = window.localStorage.getItem(demoStateKey);
  if (currentJson === cachedDemoStateJson) return cachedDemoState;
  cachedDemoStateJson = currentJson;
  if (!currentJson) {
    cachedDemoState = emptyDemoState;
    return cachedDemoState;
  }
  try {
    cachedDemoState = { ...emptyDemoState, ...JSON.parse(currentJson) } as DemoState;
  } catch {
    window.localStorage.removeItem(demoStateKey);
    cachedDemoStateJson = null;
    cachedDemoState = emptyDemoState;
  }
  return cachedDemoState;
}

function subscribeToDemoState(listener: () => void) {
  demoStateListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    demoStateListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function saveDemoState(update: (current: DemoState) => DemoState) {
  const nextState = update(getDemoState());
  const nextJson = JSON.stringify(nextState);
  cachedDemoState = nextState;
  cachedDemoStateJson = nextJson;
  try {
    window.localStorage.setItem(demoStateKey, nextJson);
  } catch {
    // I keep this session usable when browser storage is unavailable.
  }
  demoStateListeners.forEach((listener) => listener());
}

function useDemoState() {
  const state = useSyncExternalStore(subscribeToDemoState, getDemoState, () => emptyDemoState);
  const update = useCallback((recipe: (current: DemoState) => DemoState) => saveDemoState(recipe), []);
  return [state, update] as const;
}

const subscribeToHydration = () => () => {};
const getBrowserHydration = () => true;
const getServerHydration = () => false;

export default function Home() {
  const [active, setActive] = useState(0);
  const [filter, setFilter] = useState<Filter>("open");
  const [search, setSearch] = useState("");
  const [demoState, setDemoState] = useDemoState();
  const { statuses, notes, messages: messagesByTicket, autoReply } = demoState;
  const isHydrated = useSyncExternalStore(subscribeToHydration, getBrowserHydration, getServerHydration);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const processedMessages = useRef(new Set<string>());
  const [messageDraft, setMessageDraft] = useState("");
  const [suggestion, setSuggestion] = useState<ChatResponse | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState("");
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [incomingDraft, setIncomingDraft] = useState("");
  const [orderLookup, setOrderLookup] = useState<{ orderId: string; context?: OrderContext; error?: string } | null>(null);
  const [showDetails, setShowDetails] = useState(true);
  const [addingNote, setAddingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const ticket = tickets[active];
  const ticketStatus = statuses[ticket.id] ?? "open";
  const conversation = messagesByTicket[ticket.id] ?? initialMessages[ticket.id];
  const orderContext = orderLookup?.orderId === ticket.order ? orderLookup.context : null;
  const orderError = orderLookup?.orderId === ticket.order ? orderLookup.error : null;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/orders/${ticket.order}`, { signal: controller.signal })
      .then(async (result) => {
        const data = await result.json();
        if (!result.ok) throw new Error(data.error ?? "Não foi possível carregar o pedido.");
        return data as OrderContext;
      })
      .then((context) => setOrderLookup({ orderId: ticket.order, context }))
      .catch((loadError: unknown) => {
        if (loadError instanceof Error && loadError.name !== "AbortError") setOrderLookup({ orderId: ticket.order, error: loadError.message });
      });
    return () => controller.abort();
  }, [ticket.order]);

  const lastCustomerMessage = [...conversation].reverse().find((message) => message.sender === "customer");

  useEffect(() => {
    if (!isHydrated || !autoReply || ticketStatus !== "open" || !lastCustomerMessage || replyingTo) return;
    const lastCustomerIndex = conversation.findLastIndex((message) => message.sender === "customer");
    const alreadyAnswered = conversation.slice(lastCustomerIndex + 1).some((message) => message.sender === "agent" || message.sender === "ai");
    if (alreadyAnswered || processedMessages.current.has(lastCustomerMessage.id)) return;

    processedMessages.current.add(lastCustomerMessage.id);
    const activeTicketId = ticket.id;
    setReplyingTo(lastCustomerMessage.id);
    setError("");
    void fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: `${lastCustomerMessage.text}\n\nContexto: atendimento #${activeTicketId}, pedido #${ticket.order}. Responda diretamente ao cliente.` }),
    })
      .then(async (result) => {
        const data = await result.json();
        if (!result.ok) throw new Error(data.error ?? "A resposta automática falhou.");
        const chatResponse = data as ChatResponse;
        setDemoState((current) => ({
          ...current,
          messages: { ...current.messages, [activeTicketId]: [...(current.messages[activeTicketId] ?? initialMessages[activeTicketId]), { id: `ai-${lastCustomerMessage.id}`, sender: "ai", text: chatResponse.answer, time: "agora", tools: chatResponse.tools }] },
        }));
      })
      .catch((replyError: unknown) => {
        processedMessages.current.delete(lastCustomerMessage.id);
        setError(replyError instanceof Error ? replyError.message : "A resposta automática falhou.");
      })
      .finally(() => setReplyingTo(null));
  }, [isHydrated, autoReply, ticketStatus, ticket.id, ticket.order, conversation, lastCustomerMessage, replyingTo, setDemoState]);

  const filteredTickets = tickets.filter((item) => {
    const status = statuses[item.id] ?? "open";
    const matchesFilter = filter === "all" || status === filter;
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return matchesFilter && (!query || `${item.name} ${item.subject} ${item.order} ${item.id}`.toLocaleLowerCase("pt-BR").includes(query));
  });

  async function getSuggestion(text: string) {
    if (!text.trim() || suggesting) return;
    setSuggesting(true);
    setSuggestion(null);
    setError("");
    try {
      const result = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: `${text}\n\nContexto: atendimento #${ticket.id}, pedido #${ticket.order}. Gere uma resposta breve que o atendente possa revisar e enviar.` }) });
      const data = await result.json();
      if (!result.ok) throw new Error(data.error ?? "Não foi possível gerar uma sugestão.");
      setSuggestion(data as ChatResponse);
    } catch (suggestionError) {
      setError(suggestionError instanceof Error ? suggestionError.message : "Não foi possível gerar uma sugestão.");
    } finally {
      setSuggesting(false);
    }
  }

  function updateTicketStatus(next: TicketStatus) {
    setDemoState((current) => ({ ...current, statuses: { ...current.statuses, [ticket.id]: next } }));
  }

  function appendMessage(message: ChatMessage) {
    setDemoState((current) => ({ ...current, messages: { ...current.messages, [ticket.id]: [...(current.messages[ticket.id] ?? initialMessages[ticket.id]), message] } }));
  }

  function sendAgentText() {
    const text = messageDraft.trim();
    if (!text) return;
    appendMessage({ id: `agent-${Date.now()}`, sender: "agent", text, time: "agora" });
    setMessageDraft("");
    setSuggestion(null);
    if (ticketStatus !== "open") updateTicketStatus("open");
  }

  function sendAgentReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendAgentText();
  }

  function simulateIncoming(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = incomingDraft.trim();
    if (!text) return;
    appendMessage({ id: `customer-${Date.now()}`, sender: "customer", text, time: "agora" });
    setIncomingDraft("");
    setSimulatorOpen(false);
    updateTicketStatus("open");
  }

  function selectTicket(index: number) {
    setActive(index);
    setSuggestion(null);
    setMessageDraft("");
    setError("");
  }

  function saveNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = noteDraft.trim();
    if (!text) return;
    setDemoState((current) => ({ ...current, notes: { ...current.notes, [ticket.id]: [...(current.notes[ticket.id] ?? []), text] } }));
    setNoteDraft("");
    setAddingNote(false);
  }

  const latestTools = [...conversation].reverse().find((message) => message.sender === "ai" && message.tools)?.tools;
  const orderTool = latestTools?.find((tool) => tool.tool === "get_order")?.result as { status?: string; shippingStatus?: string; expectedDelivery?: string } | null;
  const paymentTool = latestTools?.find((tool) => tool.tool === "get_payment_status")?.result as { status?: string } | null;
  const customerTool = latestTools?.find((tool) => tool.tool === "get_customer")?.result as { email?: string; segment?: string } | null;

  return (
    <main className={`workspace ${showDetails ? "" : "details-hidden"}`}>
      <aside className="inbox">
        <div className="inbox-head"><div className="workspace-name"><span className="workspace-logo">CS</span><span>Central de suporte<small>DEMONSTRAÇÃO</small></span></div></div>
        <div className="inbox-title"><div><h1>Atendimentos</h1><p>Escolha uma conversa para começar</p></div></div>
        <label className="search-box"><span aria-hidden="true">⌕</span><input aria-label="Buscar atendimento" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nome ou pedido" /></label>
        <div className="filter-row" aria-label="Filtrar atendimentos">{(Object.keys(filterLabels) as Filter[]).map((key) => <button key={key} className={`filter ${filter === key ? "active" : ""}`} onClick={() => setFilter(key)}>{filterLabels[key]} <b>{tickets.filter((item) => key === "all" || (statuses[item.id] ?? "open") === key).length}</b></button>)}</div>
        <div className="ticket-list"><p className="list-label">CONVERSAS <span>{filteredTickets.length}</span></p>{filteredTickets.map((item) => { const index = tickets.findIndex((candidate) => candidate.id === item.id); const status = statuses[item.id] ?? "open"; return <button key={item.id} className={`ticket ${active === index ? "ticket-active" : ""}`} onClick={() => selectTicket(index)}><span className={`contact-avatar ${item.color}`}>{item.initials}</span><span className="ticket-content"><span className="ticket-top"><strong>{item.name}</strong><small>{status === "resolved" ? "resolvido" : status === "snoozed" ? "adiado" : item.time}</small></span><span className="ticket-subject">{item.subject}</span><span className="ticket-meta"><span>#{item.id}</span><span>Pedido #{item.order}</span></span></span></button>; })}{filteredTickets.length === 0 && <div className="empty-list">Nenhum atendimento neste filtro.</div>}</div>
        <div className="inbox-footer"><span className="online-dot"/> Ambiente de demonstração</div>
      </aside>

      <section className="conversation">
        <header className="conversation-head"><div className="conversation-person"><span className={`contact-avatar ${ticket.color}`}>{ticket.initials}</span><div><h2>{ticket.name}</h2><p>Atendimento #{ticket.id} <span>·</span> Pedido #{ticket.order}</p></div></div><div className="head-actions"><label className={`auto-switch ${autoReply ? "enabled" : ""}`} title="Ativa ou pausa as respostas automáticas da IA"><input type="checkbox" checked={autoReply} onChange={(event) => setDemoState((current) => ({ ...current, autoReply: event.target.checked }))} /><span className="switch-track"/><span>IA automática</span></label><span className={`ticket-state state-${ticketStatus}`}>{ticketStatus === "open" ? "Aberto" : ticketStatus === "snoozed" ? "Adiado" : "Resolvido"}</span><button className="outline-button" onClick={() => updateTicketStatus(ticketStatus === "snoozed" ? "open" : "snoozed")}>{ticketStatus === "snoozed" ? "↶ Reabrir" : "◷ Adiar"}</button><button className="outline-button" onClick={() => updateTicketStatus(ticketStatus === "resolved" ? "open" : "resolved")}>{ticketStatus === "resolved" ? "↶ Reabrir" : "✓ Resolver"}</button><button className="outline-button details-toggle" onClick={() => setShowDetails((visible) => !visible)}>{showDetails ? "Ocultar detalhes" : "Ver detalhes"}</button><button className="outline-button simulate-toggle" onClick={() => setSimulatorOpen((open) => !open)}>{simulatorOpen ? "Fechar simulação" : "+ Simular mensagem"}</button></div></header>

        {simulatorOpen && <form className="simulator-bar" onSubmit={simulateIncoming}><span>Mensagem recebida do cliente</span><input value={incomingDraft} onChange={(event) => setIncomingDraft(event.target.value)} placeholder="Digite uma mensagem para testar a resposta automática..." autoFocus/><button type="submit" disabled={!incomingDraft.trim()}>Receber mensagem</button></form>}

        <div className="thread"><div className="date-divider"><span/> CONVERSA <span/></div>{conversation.map((item) => <div className={`chat-row ${item.sender}`} key={item.id}><div className="chat-message"><div className="message-author"><strong>{item.sender === "customer" ? ticket.name : item.sender === "agent" ? "Você" : "Assistente IA"}</strong><span>{item.time}</span>{item.sender === "ai" && <span className="auto-tag">RESPOSTA AUTOMÁTICA</span>}</div><div className={`bubble bubble-${item.sender}`}>{item.text}</div>{item.sender === "ai" && item.tools && <div className="message-tools">IA consultou {item.tools.length} ferramenta(s) antes de responder</div>}</div></div>)}{replyingTo && <div className="chat-row ai"><div className="chat-message"><div className="message-author"><strong>Assistente IA</strong><span>respondendo…</span></div><div className="bubble bubble-ai loading-card"><span className="spinner"/> Consultando o pedido e preparando uma resposta...</div></div></div>}{ticketStatus === "resolved" && <div className="status-banner">Atendimento resolvido. Reabra pelos controles acima para continuar.</div>}{ticketStatus === "snoozed" && <div className="status-banner">Atendimento adiado. Reabra pelos controles acima para continuar.</div>}{error && <div className="error-message" role="alert">{error}</div>}</div>

        <div className="composer"><div className="copilot-prompt"><span>Conversa com {ticket.name}</span><button type="button" className="suggestion-trigger" disabled={suggesting || !lastCustomerMessage} onClick={() => lastCustomerMessage && void getSuggestion(lastCustomerMessage.text)}><span className="sparkle">✳</span>{suggesting ? "Preparando sugestão…" : "Sugestão da IA"}</button></div>{suggestion && <div className="suggestion-card"><div className="suggestion-title"><span className="sparkle">✳</span><strong>Sugestão para você revisar</strong><button type="button" aria-label="Descartar sugestão" onClick={() => setSuggestion(null)}>×</button></div><p>{suggestion.answer}</p><button type="button" className="use-suggestion" onClick={() => { setMessageDraft(suggestion.answer); setSuggestion(null); }}>Colocar no campo de resposta</button></div>}<form onSubmit={sendAgentReply}><textarea value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (messageDraft.trim()) sendAgentText(); } }} placeholder="Escreva sua resposta ao cliente..." rows={2}/><div className="composer-bottom"><span>Esta resposta será enviada como atendente</span><button type="submit" disabled={!messageDraft.trim()}>Enviar mensagem <span>↑</span></button></div></form></div>
      </section>

      {showDetails && <aside className="details"><div className="details-head"><h2>Cliente e pedido</h2><button className="icon-button" aria-label="Fechar detalhes do cliente" title="Fechar detalhes" onClick={() => setShowDetails(false)}>×</button></div><div className="profile-card"><span className={`profile-avatar ${ticket.color}`}>{ticket.initials}</span><h3>{ticket.name}</h3><p>{customerTool?.email ?? orderContext?.customer.email ?? "Carregando cliente…"}</p><span className="segment-tag">{customerTool?.segment ?? orderContext?.customer.segment ?? "Cliente"}</span></div><div className="detail-section"><div className="section-title">PEDIDO #{ticket.order}</div><div className="order-card"><div className="order-title"><span aria-hidden="true">▣</span><strong>{orderTool?.status ?? orderContext?.order.status ?? "Carregando…"}</strong></div><div className="detail-row"><span>Entrega prevista</span><strong>{orderTool?.expectedDelivery ?? orderContext?.order.expectedDelivery ?? "—"}</strong></div><div className="detail-row"><span>Última atualização</span><strong>{orderTool?.shippingStatus ?? orderContext?.order.shippingStatus ?? "—"}</strong></div><div className="detail-row"><span>Pagamento</span><strong>{paymentTool?.status ?? orderContext?.payment.status ?? "—"}</strong></div>{orderError && <p className="detail-error">{orderError}</p>}</div></div><div className="detail-section"><div className="section-title">NOTAS INTERNAS <button aria-label="Adicionar nota" title="Adicionar nota" onClick={() => setAddingNote((open) => !open)}>{addingNote ? "×" : "+"}</button></div>{addingNote && <form className="note-form" onSubmit={saveNote}><textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Escreva uma nota para a equipe..." rows={3} autoFocus/><button type="submit" disabled={!noteDraft.trim()}>Salvar nota</button></form>}{(notes[ticket.id] ?? []).length ? <div className="notes-list">{(notes[ticket.id] ?? []).map((note, index) => <p className="saved-note" key={`${ticket.id}-${index}`}>{note}</p>)}</div> : !addingNote && <div className="empty-note">Nenhuma nota. Clique em + para adicionar.</div>}</div><div className="detail-section activity-section"><div className="section-title">ATIVIDADE DA IA</div>{latestTools ? <><div className="activity-item"><span className="activity-icon">✳</span><div><strong>Consulta mais recente</strong><p>{latestTools.length} ferramenta(s) · agora</p></div></div>{latestTools.map((tool, index) => <div className="tool-row" key={`${tool.tool}-${index}`}><span className="tool-check">✓</span><code>{tool.tool}</code></div>)}</> : <p className="empty-activity">As consultas da IA aparecem aqui.</p>}</div><div className="privacy-note"><span>ⓘ</span> Mensagens, status e notas ficam salvos neste navegador.</div></aside>}
    </main>
  );
}
