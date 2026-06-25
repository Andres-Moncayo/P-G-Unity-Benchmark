import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MutableRefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faPaperPlane,
  faClockRotateLeft,
  faSliders,
  faChartLine,
  faPlus,
  faXmark,
  faMagnifyingGlass,
  faWandMagicSparkles,
  faArrowRotateRight,
  faMessage,
  faTrash,
  faCheck,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import { ChatAISummary } from './ChatAISummary';
import { NexusAILogo } from './NexusAILogo';
import { ChatMessage, type ChatFeedbackValue, type ChatMessageKind } from './ChatMessage';
import { useNavigationStore } from '../../../store/useNavigationStore';
import { useSettingsStore } from '../../../store/useSettingsStore';
import { cn } from '../../../utils/cn';
import { useBackendChat, type ChartType, type VisualData } from '../hooks/useBackendChat';
import { useMockChat } from '../hooks/useMockChat';
import { apiClient, ApiError } from '../../../services/apiClient';
import { isOfflineMode, subscribeOfflineMode } from '../../../config/offlineMode';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface ChatMessageItem {
  id: string;
  sender: 'ai' | 'user';
  message: string;
  time: string;
  kind?: ChatMessageKind;
  recommendations?: string[];
  insights?: string[];
  visualData?: VisualData;
  sources?: { title: string; url: string }[];
  confidence?: number;
  assistantMessageId?: string;
  feedback?: ChatFeedbackValue | null;
  feedbackBusy?: boolean;
  /** Solo true para mensajes IA recién generados (no historial, no usuario). */
  streaming?: boolean;
}

interface ProjectionPoint {
  year: number;
  projected_value: number;
}

interface SimulationRunOut {
  company_name: string;
  scenario: string;
  projections: ProjectionPoint[];
  baseline_value?: number;
  baseline_unit?: string;
  model_type?: string;
  growth_rate?: number;
  years?: number;
  persisted?: boolean;
}

interface CompanySearchResult {
  id: number;
  name: string;
  baseline_value?: number;
  baseline_unit?: string;
}

/** Fila devuelta por GET /simulation/companies */
interface SimCompanyListItem {
  id: number;
  name: string;
  slug: string;
}

const FALLBACK_SIM_COMPANY_NAMES = [
  'Unity',
  'Unity Technologies',
  'Epic Games',
  'Godot Foundation',
  'AppLovin',
  'Roblox',
] as const;

type SimCompanyPickRow =
  | { source: 'api'; id: number; name: string; slug: string }
  | { source: 'fallback'; name: string };

interface ConversationSummary {
  id: string;
  title: string;
}

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  insights?: string[];
  recommendations?: string[];
  sources?: { title: string; url: string }[];
  confidence?: number | null;
  visual_data?: {
    chart_type?: string;
    title?: string;
    labels?: string[];
    values?: number[];
    unit?: string;
  } | null;
}

interface ConversationDetail {
  id: string;
  title: string;
  messages: ConversationMessage[];
  simulation?: Record<string, unknown> | null;
}

function simulationFromSnapshot(raw: unknown): SimulationRunOut | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  const name = s.company_name;
  const scenarioS = s.scenario;
  if (typeof name !== 'string' || typeof scenarioS !== 'string') return null;
  const projs = s.projections;
  if (!Array.isArray(projs)) return null;
  const projections: ProjectionPoint[] = projs
    .map((p) => {
      if (!p || typeof p !== 'object') return null;
      const o = p as Record<string, unknown>;
      const y = o.year;
      const v = o.projected_value;
      if (typeof y !== 'number' || typeof v !== 'number') return null;
      return { year: y, projected_value: v };
    })
    .filter((x): x is ProjectionPoint => x != null);
  if (!projections.length) return null;
  return {
    company_name: name,
    scenario: scenarioS,
    projections,
    baseline_value: typeof s.baseline_value === 'number' ? s.baseline_value : undefined,
    baseline_unit: typeof s.baseline_unit === 'string' ? s.baseline_unit : undefined,
    model_type: typeof s.model_type === 'string' ? s.model_type : undefined,
    growth_rate: typeof s.growth_rate === 'number' ? s.growth_rate : undefined,
    years: typeof s.years === 'number' ? s.years : undefined,
    persisted: Boolean(s.persisted),
  };
}

const INITIAL_MESSAGES: ChatMessageItem[] = [
  {
    id: '1',
    sender: 'ai',
    message:
      'Hello, I am Nexus AI — your competitive intelligence assistant. I am connected to real-time market data. Which strategic pillar would you like to explore today? (Product, Finance, Ecosystem, Positioning, or Operations).',
    time: 'Now',
  },
];

const SUMMARY_POINTS = [
  'Strategic Tourniquet effectiveness: restructuring shows early positive signals (EPS $0.18).',
  'Create recovery: net adoption rate reflects double-digit growth thanks to Unity 6.',
  'Growth opportunity: Unity Vector AI captures iOS market share against AppLovin.',
  'Alert: Unreal Engine maintains AAA pressure; review Enterprise incentives.',
];

const QUICK_PROMPTS: { text: string; value: string }[] = [
  { text: 'Compare iOS impact: Unity Vector AI vs. AppLovin', value: 'grow_vector_vs_applovin' },
  { text: 'Strategies to accelerate conversion to Unity 6 Pro', value: 'create_unity6_conversion' },
  { text: 'Current sentiment analysis post-Runtime Fee', value: 'community_trust_recovery' },
  { text: 'Enterprise cost benchmarking: Unity vs Unreal', value: 'enterprise_pricing_unreal' },
];

const LEGACY_CONVERSATION_STORAGE_KEY = 'unity_chat_conversation_id';
const ENV_MOCK_CHAT = (import.meta.env.VITE_USE_MOCK_CHAT as string | undefined)?.trim() === 'true';
const CHART_TYPE_FALLBACK: ChartType = 'bar';

function conversationStorageKey(userId: string | undefined): string | null {
  if (!userId) return null;
  return `unity_chat_conversation_id:${userId}`;
}

function readPersistedConversationId(userId: string | undefined): string | null {
  if (typeof window === 'undefined') return null;
  const key = conversationStorageKey(userId);
  if (!key) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function persistConversationId(userId: string | undefined, value: string | null): void {
  if (typeof window === 'undefined') return;
  const key = conversationStorageKey(userId);
  if (!key) return;
  try {
    if (value) {
      window.localStorage.setItem(key, value);
    } else {
      window.localStorage.removeItem(key);
    }
    window.localStorage.removeItem(LEGACY_CONVERSATION_STORAGE_KEY);
  } catch {
    // ignorar
  }
}

function normalizeStoredChartType(value: unknown): ChartType {
  if (value === 'bar' || value === 'line' || value === 'pie' || value === 'none') return value;
  return CHART_TYPE_FALLBACK;
}

function buildVisualFromStored(raw: ConversationMessage['visual_data']): VisualData | undefined {
  if (!raw) return undefined;
  const labels = raw.labels ?? [];
  const values = raw.values ?? [];
  if (!labels.length || labels.length !== values.length) return undefined;
  const chartType = normalizeStoredChartType(raw.chart_type);
  if (chartType === 'none') return undefined;
  return {
    chartType,
    title: raw.title ?? 'Visualization',
    labels,
    values,
    unit: raw.unit ?? '%',
  };
}

export default function ChatIAContainer() {
  const backendChat = useBackendChat();
  const mockChat = useMockChat();
  const [offlineMode, setOfflineMode] = useState(isOfflineMode());
  useEffect(() => subscribeOfflineMode(() => setOfflineMode(isOfflineMode())), []);
  const useMockChatMode = ENV_MOCK_CHAT || offlineMode;
  const sendChatToApi = useMockChatMode ? mockChat.sendMessage : backendChat.sendMessage;
  const chatRequestLoading = useMockChatMode ? mockChat.loading : backendChat.loading;

  const pendingPrompt = useNavigationStore((state) => state.pendingPrompt);
  const setPendingPrompt = useNavigationStore((state) => state.setPendingPrompt);
  const userId = useSettingsStore((state) => state.user?.id);
  const authToken = useSettingsStore((state) => state.token);
  const isAuthenticated = useSettingsStore((state) => state.isAuthenticated);
  const sessionHydrated = useSettingsStore((state) => state._hasHydrated);

  const [messages, setMessages] = useState<ChatMessageItem[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [activeConversationTitle, setActiveConversationTitle] = useState<string | null>(null);
  const [deepAnalysis, setDeepAnalysis] = useState(false);
  const [comparativeMode, setComparativeMode] = useState(false);

  // Drawers / popovers
  const [showSettings, setShowSettings] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [showSimulatorDrawer, setShowSimulatorDrawer] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  // Historial
  const [history, setHistory] = useState<ConversationSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Simulador
  const [simCompanyQuery, setSimCompanyQuery] = useState('Unity');
  const [simYears, setSimYears] = useState('5');
  const [simGrowthRate, setSimGrowthRate] = useState('0.10');
  const [simulation, setSimulation] = useState<SimulationRunOut | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  const [resolvedCompany, setResolvedCompany] = useState<CompanySearchResult | null>(null);
  const [simCompanyCatalog, setSimCompanyCatalog] = useState<SimCompanyListItem[]>([]);
  const [simCompaniesLoading, setSimCompaniesLoading] = useState(false);
  const [simCompanyMenuOpen, setSimCompanyMenuOpen] = useState(false);
  const [inputBarExpanded, setInputBarExpanded] = useState(false);
  const simCompanyAnchorRef = useRef<HTMLInputElement>(null);
  const [simCompanyPickGeom, setSimCompanyPickGeom] = useState<{
    top: number;
    left: number;
    width: number;
    maxH: number;
  } | null>(null);

  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const messagesContentRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastUserQueryRef = useRef<string | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const showSettingsRef = useRef(showSettings);
  showSettingsRef.current = showSettings;
  const historyDrawerAnimatedCloseRef = useRef<(() => void) | null>(null);
  const stickToBottomRef = useRef(true);

  const hasRealMessages = messages.length > 1 || messages.some((m) => m.sender === 'user');

  const isInputExpanded = inputBarExpanded;

  const collapseInputBarIfBlurred = useCallback(() => {
    window.requestAnimationFrame(() => {
      if (showSettingsRef.current) return;
      if (settingsRef.current && !settingsRef.current.contains(document.activeElement)) {
        setInputBarExpanded(false);
      }
    });
  }, []);

  const inputShellWidthClass = isInputExpanded
    ? hasRealMessages
      ? 'max-w-3xl'
      : 'max-w-4xl xl:max-w-6xl 2xl:max-w-[80rem]'
    : hasRealMessages
      ? 'max-w-xl'
      : 'max-w-xl xl:max-w-3xl 2xl:max-w-4xl';

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = messagesScrollRef.current;
    if (!container) return;
    const top = container.scrollHeight - container.clientHeight;
    if (behavior === 'auto') {
      container.scrollTop = top;
      return;
    }
    container.scrollTo({ top, behavior });
  }, []);

  // Scroll instantáneo durante typewriter / bloques que crecen (evita acumular animaciones).
  const scrollToBottomInstant = useCallback(() => {
    if (!stickToBottomRef.current) return;
    scrollToBottom('auto');
  }, [scrollToBottom]);

  const scrollToBottomSmooth = useCallback(() => {
    if (!stickToBottomRef.current) return;
    scrollToBottom('smooth');
  }, [scrollToBottom]);

  useLayoutEffect(() => {
    stickToBottomRef.current = true;
    scrollToBottomSmooth();
  }, [messages, chatRequestLoading, scrollToBottomSmooth]);

  useEffect(() => {
    const container = messagesScrollRef.current;
    const content = messagesContentRef.current;
    if (!container || !content) return;

    const observer = new ResizeObserver(() => {
      scrollToBottomInstant();
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [scrollToBottomInstant]);

  useEffect(() => {
    const container = messagesScrollRef.current;
    if (!container) return;

    const onScroll = () => {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      stickToBottomRef.current = distanceFromBottom < 96;
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  // Cerrar opciones y contraer solo al hacer click fuera del shell del input
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (settingsRef.current?.contains(event.target as Node)) return;
      setShowSettings(false);
      setInputBarExpanded(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (pendingPrompt && !chatRequestLoading) {
      setInputValue(pendingPrompt);
      setPendingPrompt(null);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [pendingPrompt, chatRequestLoading, setPendingPrompt]);

  const loadConversations = useCallback(async () => {
    if (useMockChatMode) return;
    const token = useSettingsStore.getState().token;
    if (!token) return;
    setHistoryLoading(true);
    try {
      const rows = await apiClient<ConversationSummary[]>('/chat/conversations');
      setHistory(rows);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      const wasActive = conversationId === id;

      if (useMockChatMode) {
        setHistory((current) => current.filter((c) => c.id !== id));
        setConfirmDeleteId(null);
        if (wasActive) {
          setMessages(INITIAL_MESSAGES);
          setConversationId(null);
          persistConversationId(userId, null);
          setActiveConversationTitle(null);
        }
        return;
      }

      setDeletingId(id);
      setHistoryError(null);
      try {
        await apiClient<void>(`/chat/conversations/${id}`, { method: 'DELETE' });
        setHistory((current) => current.filter((c) => c.id !== id));
        setConfirmDeleteId(null);
        if (wasActive) {
          setMessages(INITIAL_MESSAGES);
          setConversationId(null);
          persistConversationId(userId, null);
          setActiveConversationTitle(null);
        }
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.detail || err.message
            : err instanceof Error
              ? err.message
              : 'Could not delete the conversation.';
        setHistoryError(msg);
      } finally {
        setDeletingId(null);
      }
    },
    [conversationId, userId],
  );

  const openConversation = useCallback(
    async (id: string, opts: { silentOnMissing?: boolean } = {}) => {
      try {
        const detail = await apiClient<ConversationDetail>(`/chat/conversations/${id}`);
        setConversationId(detail.id);
        persistConversationId(userId, detail.id);
        setActiveConversationTitle(detail.title);
        const mapped: ChatMessageItem[] = detail.messages.map((m) => ({
          id: m.id,
          sender: m.role === 'assistant' ? 'ai' : 'user',
          message: m.content,
          time: 'History',
          insights: m.insights ?? [],
          recommendations: m.recommendations ?? [],
          sources: m.sources ?? [],
          confidence: typeof m.confidence === 'number' ? m.confidence : undefined,
          visualData: buildVisualFromStored(m.visual_data ?? null),
          assistantMessageId: m.role === 'assistant' ? m.id : undefined,
        }));
        setMessages(mapped.length > 0 ? mapped : INITIAL_MESSAGES);
        setSimulation(simulationFromSnapshot(detail.simulation ?? null));
      } catch (error) {
        if (
          opts.silentOnMissing &&
          error instanceof ApiError &&
          (error.status === 404 || error.status === 403)
        ) {
          persistConversationId(userId, null);
          return;
        }
        setMessages((current) => [
          ...current,
          {
            id: `error-history-${Date.now()}`,
            sender: 'ai',
            kind: 'error',
            message: error instanceof Error ? error.message : 'Could not load conversation history.',
            time: 'Now',
          },
        ]);
      }
    },
    [userId],
  );

  // Resetear estado de confirmación al cerrar drawer
  useEffect(() => {
    if (!showHistoryDrawer) {
      setConfirmDeleteId(null);
      setHistoryError(null);
    }
  }, [showHistoryDrawer]);

  useEffect(() => {
    if (useMockChatMode || !sessionHydrated || !isAuthenticated || !userId || !authToken) return;

    setMessages(INITIAL_MESSAGES);
    setConversationId(null);
    setActiveConversationTitle(null);
    setSimulation(null);
    setHistory([]);
    void loadConversations();

    const stored = readPersistedConversationId(userId);
    if (stored) {
      void openConversation(stored, { silentOnMissing: true });
    }
  }, [sessionHydrated, isAuthenticated, userId, authToken, loadConversations, openConversation]);

  const performSend = useCallback(
    async (userQuery: string) => {
      if (!authToken) {
        setMessages((current) => [
          ...current,
          {
            id: `error-${Date.now()}`,
            sender: 'ai',
            kind: 'error',
            message: 'You must sign in to use the chat.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        return;
      }

      lastUserQueryRef.current = userQuery;
      stickToBottomRef.current = true;

      const userMessage: ChatMessageItem = {
        id: `user-${Date.now()}`,
        sender: 'user',
        message: userQuery,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((current) => [...current, userMessage]);

      const { data, error: sendError } = await sendChatToApi({
        query: userQuery,
        conversation_id: conversationId,
        deep_analysis: deepAnalysis,
        comparative_mode: comparativeMode,
      });

      if (data) {
        if (data.conversation_id) {
          setConversationId(data.conversation_id);
          persistConversationId(userId, data.conversation_id);
          if (data.title) {
            setActiveConversationTitle(data.title);
          }
        }
        const aiMessage: ChatMessageItem = {
          id: data.assistant_message_id ?? `ai-${Date.now()}`,
          sender: 'ai',
          message: data.answer,
          recommendations: data.recommendations,
          insights: data.insights,
          visualData: data.visualData,
          sources: data.sources,
          confidence: data.confidence,
          assistantMessageId: data.assistant_message_id,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          streaming: true,
        };
        setMessages((current) => [...current, aiMessage]);
        void loadConversations();
      } else {
        setMessages((current) => [
          ...current,
          {
            id: `error-${Date.now()}`,
            sender: 'ai',
            kind: 'error',
            message: sendError ?? 'Sorry, I had trouble processing your request.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    },
    [authToken, comparativeMode, conversationId, deepAnalysis, loadConversations, sendChatToApi, userId],
  );

  const sendMessage = async () => {
    if (!inputValue.trim() || chatRequestLoading) return;
    const userQuery = inputValue.trim();
    setInputValue('');
    await performSend(userQuery);
  };

  const retryLastQuery = useCallback(async () => {
    const lastQuery = lastUserQueryRef.current;
    if (!lastQuery || chatRequestLoading) return;
    setMessages((current) => {
      const next = [...current];
      for (let i = next.length - 1; i >= 0; i -= 1) {
        if (next[i].kind === 'error') {
          next.splice(i, 1);
          break;
        }
      }
      return next;
    });
    await performSend(lastQuery);
  }, [chatRequestLoading, performSend]);

  const submitFeedback = useCallback(
    async (messageId: string, value: ChatFeedbackValue) => {
      if (useMockChatMode) {
        setMessages((current) =>
          current.map((m) => (m.id === messageId ? { ...m, feedback: value } : m)),
        );
        return;
      }
      const target = messages.find((m) => m.id === messageId);
      if (!target?.assistantMessageId || !conversationId) return;

      setMessages((current) =>
        current.map((m) => (m.id === messageId ? { ...m, feedbackBusy: true } : m)),
      );

      try {
        await apiClient<void>('/chat/feedback/', {
          method: 'POST',
          body: JSON.stringify({
            conversation_id: conversationId,
            message_id: target.assistantMessageId,
            feedback: value,
          }),
        });
        setMessages((current) =>
          current.map((m) => (m.id === messageId ? { ...m, feedback: value, feedbackBusy: false } : m)),
        );
      } catch {
        setMessages((current) =>
          current.map((m) => (m.id === messageId ? { ...m, feedbackBusy: false } : m)),
        );
      }
    },
    [conversationId, messages],
  );

  const startNewConversation = () => {
    setInputBarExpanded(true);
    setMessages(INITIAL_MESSAGES);
    setConversationId(null);
    persistConversationId(userId, null);
    setActiveConversationTitle(null);
    setSimulation(null);
    if (showHistoryDrawer) historyDrawerAnimatedCloseRef.current?.();
    setShowSettings(false);
    lastUserQueryRef.current = null;
  };

  const handleQuickPrompt = (text: string) => {
    if (chatRequestLoading) return;
    setInputValue(text);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !chatRequestLoading) {
      event.preventDefault();
      void sendMessage();
    }
  };

  useEffect(() => {
    if (!showSimulatorDrawer) {
      setSimCompanyMenuOpen(false);
      return;
    }
    let cancelled = false;
    setSimCompaniesLoading(true);
    void apiClient<SimCompanyListItem[]>('/simulation/companies')
      .then((rows) => {
        if (!cancelled && Array.isArray(rows)) setSimCompanyCatalog(rows);
      })
      .catch(() => {
        if (!cancelled) setSimCompanyCatalog([]);
      })
      .finally(() => {
        if (!cancelled) setSimCompaniesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showSimulatorDrawer]);

  const filteredSimCompanies = useMemo((): SimCompanyPickRow[] => {
    const q = simCompanyQuery.trim().toLowerCase();
    const hay = (s: string) => !q || s.toLowerCase().includes(q);

    if (simCompanyCatalog.length > 0) {
      return simCompanyCatalog
        .filter((c) => hay(c.name) || hay(c.slug))
        .slice(0, 24)
        .map((c) => ({ source: 'api', id: c.id, name: c.name, slug: c.slug }));
    }

    return [...FALLBACK_SIM_COMPANY_NAMES]
      .filter((n) => hay(n))
      .slice(0, 12)
      .map((name) => ({ source: 'fallback', name }));
  }, [simCompanyCatalog, simCompanyQuery]);

  useLayoutEffect(() => {
    if (!simCompanyMenuOpen || !simCompanyAnchorRef.current) {
      setSimCompanyPickGeom(null);
      return;
    }
    const anchor = simCompanyAnchorRef.current;
    const reposition = () => {
      const r = anchor.getBoundingClientRect();
      const pad = 10;
      const spaceBelow = window.innerHeight - r.bottom - pad;
      const maxH = Math.min(220, Math.max(48, spaceBelow));
      setSimCompanyPickGeom({ top: r.bottom + 4, left: r.left, width: r.width, maxH });
    };
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [simCompanyMenuOpen, showSimulatorDrawer, filteredSimCompanies.length, simCompaniesLoading]);

  // -------- Simulator --------
  const resolveCompanyId = async (): Promise<number | null> => {
    const query = simCompanyQuery.trim();
    if (!query) return null;
    if (/^\d+$/.test(query)) {
      const numeric = Number(query);
      setResolvedCompany({ id: numeric, name: `Empresa ${numeric}` });
      return numeric;
    }
    try {
      const match = await apiClient<CompanySearchResult>(`/simulation/companies/search?name=${encodeURIComponent(query)}`);
      if (match?.id) {
        setResolvedCompany(match);
        return match.id;
      }
      return null;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setSimError(`No company found matching "${query}".`);
      }
      return null;
    }
  };

  const runSimulation = async () => {
    setSimError(null);
    const companyId = await resolveCompanyId();
    const years = Number(simYears);
    const growthRate = Number(simGrowthRate);
    if (!companyId || !years) {
      if (!simError) setSimError('Enter a valid company and time horizon in years.');
      return;
    }

    setSimLoading(true);
    try {
      const data = await apiClient<SimulationRunOut>('/simulation/run', {
        method: 'POST',
        body: JSON.stringify({
          company_id: companyId,
          years,
          growth_rate: growthRate,
          model_type: 'exponential',
          persist: true,
          conversation_id: conversationId ?? undefined,
        }),
      });
      setSimulation(data);
    } catch (error) {
      setSimError(error instanceof Error ? error.message : 'Could not run the simulation');
    } finally {
      setSimLoading(false);
    }
  };

  const filteredHistory = useMemo(() => {
    const term = historySearch.trim().toLowerCase();
    if (!term) return history;
    return history.filter((h) => h.title.toLowerCase().includes(term));
  }, [history, historySearch]);

  const maxProjectedValue = simulation
    ? Math.max(...simulation.projections.map((point) => point.projected_value), 1)
    : 1;
  const simulationRows = simulation
    ? simulation.projections.map((point) => ({
        year: String(point.year),
        value: Number(point.projected_value.toFixed(2)),
      }))
    : [];

  const messageCount = messages.filter((m) => m.sender === 'user').length;
  const conversationBreadcrumb = activeConversationTitle ?? (messageCount > 0 ? 'Active conversation' : 'New conversation');

  return (
    <div className="flex h-full min-h-0 flex-col bg-black">
      {/* ─── HEADER COMPACTO ────────────────────────────────────────── */}
      <header className="flex items-center gap-3 border-b border-[#2A2A2A] bg-black px-4 py-3 sm:gap-3.5 sm:px-6 sm:py-3.5">
        <NexusAILogo size="md" variant="contained" tone="light" className="flex-shrink-0" />
        <div className="min-w-0 flex-1 py-0.5">
          <h1 className="truncate text-sm font-semibold leading-snug tracking-tight text-gray-50 sm:text-[15px]">
            Nexus AI
          </h1>
          <p className="mt-0.5 truncate text-[11px] leading-snug text-gray-500 sm:text-xs">
            {conversationBreadcrumb}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <ToolbarButton
            label="New conversation"
            icon={faPlus}
            onClick={startNewConversation}
            disabled={!hasRealMessages && !conversationId}
          />
          <ToolbarButton label="History" icon={faClockRotateLeft} onClick={() => setShowHistoryDrawer(true)} />
        </div>
      </header>

      {/* ─── MAIN ───────────────────────────────────────────────────── */}
      <main className="min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full min-h-0 w-full flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-10">
          <div
            ref={messagesScrollRef}
            className="flex-1 space-y-5 overflow-y-auto overscroll-contain pb-32 pr-1 scroll-smooth sm:pb-36"
            aria-busy={chatRequestLoading}
            aria-live="polite"
          >
            <div ref={messagesContentRef} className="space-y-5">
            {!hasRealMessages && (
              <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-7 pb-4 pt-8 animate-fadeIn sm:pt-12 xl:max-w-6xl 2xl:max-w-[80rem]">
                {/* Hero */}
                <div className="flex flex-col items-center gap-3 text-center">
                  <NexusAILogo variant="hero" size="lg" tone="light" />
                  <h2 className="text-base font-semibold text-[#00ADEF] sm:text-lg">
                    How can I help you today?
                  </h2>
                  <p className="mt-1 text-[13px] text-gray-500 sm:text-[13.5px]">
                    Nexus AI · real-time competitive intelligence
                  </p>
                </div>

                {/* Strategic context */}
                <ChatAISummary
                  title="Strategic context"
                  points={SUMMARY_POINTS}
                />

                {/* Suggestions */}
                <div className="w-full">
                  <p className="mb-2 flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#00ADEF]">
                    <FontAwesomeIcon icon={faWandMagicSparkles} className="text-[10px] text-[#00ADEF]" />
                    Suggested prompts
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    {QUICK_PROMPTS.map((qp) => (
                      <button
                        key={qp.value}
                        type="button"
                        onClick={() => handleQuickPrompt(qp.text)}
                        disabled={chatRequestLoading}
                        className="group relative cursor-pointer overflow-hidden rounded-md bg-white/[0.06] px-3 py-2 text-center text-[12px] leading-snug text-gray-200 transition-all duration-300 hover:bg-[#1E293B]/50 hover:text-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="relative z-10 line-clamp-2">{qp.text}</span>
                        <div
                          className="pointer-events-none absolute inset-0 rounded-md bg-gradient-to-r from-transparent via-[#7DD3FC]/5 to-transparent -translate-x-full transition-transform duration-1000 group-hover:translate-x-full"
                          aria-hidden
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {hasRealMessages &&
              messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  sender={message.sender}
                  message={message.message}
                  time={message.time}
                  kind={message.kind}
                  recommendations={message.recommendations}
                  insights={message.insights}
                  visualData={message.visualData}
                  sources={message.sources}
                  confidence={message.confidence}
                  streaming={message.streaming}
                  onStreamProgress={scrollToBottomInstant}
                  onRetry={message.kind === 'error' ? retryLastQuery : undefined}
                  onFeedback={
                    message.sender === 'ai' && message.assistantMessageId && message.kind !== 'error'
                      ? (value) => void submitFeedback(message.id, value)
                      : undefined
                  }
                  feedback={message.feedback ?? null}
                  feedbackBusy={message.feedbackBusy}
                />
              ))}

            {chatRequestLoading && (
              <div className="flex items-center gap-2 px-1 py-2 text-[12.5px] text-[#00ADEF] animate-fadeIn">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00ADEF] animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#00ADEF] animate-bounce" style={{ animationDelay: '0.15s' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-[#00ADEF] animate-bounce" style={{ animationDelay: '0.3s' }} />
                <span className="ml-1 text-[13px] text-gray-400">Analyzing market…</span>
              </div>
            )}

            <div ref={messagesEndRef} aria-hidden />
            </div>
          </div>

        </div>
      </main>

      {/* ─── BLUR SUTIL DETRÁS DEL INPUT ──────────────────────────── */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-28 bg-gradient-to-t from-black/40 to-transparent backdrop-blur-[3px] [mask-image:linear-gradient(to_top,black_55%,transparent)] md:left-[88px]"
        aria-hidden
      />

      {/* ─── INPUT FLOTANTE (widget standalone, sigue al usuario) ─── */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 sm:bottom-6 md:left-[88px]">
        <div ref={settingsRef} className="pointer-events-auto w-full">
          <div
            className={cn(
              'mx-auto w-full min-w-0 transition-[max-width] duration-300 ease-out',
              inputShellWidthClass,
            )}
          >
          <div className="relative">
            {showSettings && (
              <div
                className="absolute bottom-[calc(100%+10px)] left-0 z-40 w-[min(100vw-2rem,18rem)] animate-popIn rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-3 shadow-xl"
                onMouseDown={() => setInputBarExpanded(true)}
              >
                <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-transparent">
                  <span className="text-[10px] font-normal uppercase tracking-widest text-gray-600">Options</span>
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    aria-label="Close"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-white/[0.05] hover:text-gray-300"
                  >
                    <FontAwesomeIcon icon={faXmark} className="text-[11px]" />
                  </button>
                </div>

                <div className="space-y-2 border-b border-[#2A2A2A] pb-3">
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-lg py-1.5 pl-0.5 pr-1 transition hover:bg-white/[0.03]">
                    <input
                      type="checkbox"
                      checked={deepAnalysis}
                      onChange={(e) => setDeepAnalysis(e.target.checked)}
                      className="mt-0.5 accent-[#00ADEF]"
                      aria-describedby="opt-deep-desc"
                    />
                    <span className="min-w-0">
                      <span className="text-[12.5px] text-gray-200">Deep analysis</span>
                      <span id="opt-deep-desc" className="mt-0.5 block text-[10.5px] leading-snug text-gray-500">
                        More sources and deeper responses.
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-lg py-1.5 pl-0.5 pr-1 transition hover:bg-white/[0.03]">
                    <input
                      type="checkbox"
                      checked={comparativeMode}
                      onChange={(e) => setComparativeMode(e.target.checked)}
                      className="mt-0.5 accent-[#00ADEF]"
                      aria-describedby="opt-comp-desc"
                    />
                    <span className="min-w-0">
                      <span className="text-[12.5px] text-gray-200">Comparative</span>
                      <span id="opt-comp-desc" className="mt-0.5 block text-[10.5px] leading-snug text-gray-500">
                        Unity vs Unreal vs Godot cuando aplique.
                      </span>
                    </span>
                  </label>
                </div>

                <div className="pt-2 space-y-0">
                  <button
                    type="button"
                    onClick={() => {
                      setInputBarExpanded(true);
                      setShowSimulatorDrawer(true);
                      setShowSettings(false);
                    }}
                    className="group flex w-full items-center gap-2.5 rounded-md py-2 pl-1.5 pr-2 text-left text-[12px] text-gray-400 transition-colors hover:bg-white/[0.03] hover:text-gray-100"
                  >
                    <FontAwesomeIcon
                      icon={faChartLine}
                      className="w-4 shrink-0 text-center text-[12px] text-gray-600 transition-colors group-hover:text-[#00ADEF]/90"
                      aria-hidden
                    />
                    <span className="min-w-0">Simulator</span>
                  </button>
                  <button
                    type="button"
                    onClick={startNewConversation}
                    className="group flex w-full items-center gap-2.5 rounded-md py-2 pl-1.5 pr-2 text-left text-[12px] text-gray-400 transition-colors hover:bg-white/[0.03] hover:text-gray-100"
                  >
                    <FontAwesomeIcon
                      icon={faMessage}
                      className="w-4 shrink-0 text-center text-[12px] text-gray-600 transition-colors group-hover:text-gray-300"
                      aria-hidden
                    />
                    <span className="min-w-0">New conversation</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] px-2 py-1.5 shadow-2xl shadow-black/60 transition-all duration-300 ease-out focus-within:border-[#00ADEF]/60 focus-within:shadow-[0_8px_32px_rgba(0,0,0,0.55),0_0_24px_rgba(0,173,239,0.12)] sm:px-3 sm:py-2">
                <button
                  type="button"
                  aria-label={showSettings ? 'Close options' : 'Open options'}
                  aria-expanded={showSettings}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onPointerDown={(e) => {
                    // Toggle en el press inicial (mouse/touch). Inmune a micro-drift
                    // entre mousedown/mouseup y al handler global de "click fuera".
                    e.stopPropagation();
                    setShowSettings((v) => {
                      const next = !v;
                      if (next) setInputBarExpanded(true);
                      return next;
                    });
                  }}
                  onClick={(e) => {
                    // Para mouse/touch, pointerdown ya lo manejó (e.detail > 0).
                    // Solo procesa clicks sintéticos de teclado (Enter/Space → e.detail === 0).
                    if (e.detail === 0) {
                      setShowSettings((v) => {
                        const next = !v;
                        if (next) setInputBarExpanded(true);
                        return next;
                      });
                    }
                  }}
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-white/[0.035] hover:text-gray-200 ${
                    showSettings
                      ? 'bg-white/[0.06] text-[#00ADEF]'
                      : deepAnalysis || comparativeMode
                        ? 'text-[#00ADEF]/90'
                        : ''
                  }`}
                >
                  <FontAwesomeIcon
                    icon={faSliders}
                    className={`text-[13px] transition-transform duration-300 ${showSettings ? 'rotate-90' : ''}`}
                  />
                </button>

                <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleEnter}
                onFocus={() => setInputBarExpanded(true)}
                onBlur={collapseInputBarIfBlurred}
                placeholder={chatRequestLoading ? 'Analyzing…' : 'Ask about Unity, engines, or the market…'}
                disabled={chatRequestLoading}
                className="min-w-0 flex-1 bg-transparent px-1 py-2 text-[15px] leading-normal text-gray-50 outline-none placeholder:text-gray-500 disabled:opacity-50"
              />

              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={chatRequestLoading || !inputValue.trim()}
                aria-label="Enviar mensaje"
                title="Enviar"
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-35 ${
                  inputValue.trim() && !chatRequestLoading
                    ? 'text-[#00ADEF] hover:bg-[#00ADEF]/10 active:bg-[#00ADEF]/15'
                    : 'text-gray-600 hover:bg-white/[0.035] hover:text-gray-400'
                }`}
              >
                <FontAwesomeIcon icon={faPaperPlane} className="text-[13px]" />
              </button>
            </div>
          </div>

          <p className="mt-2 w-full min-w-0 px-1 text-center text-[11px] text-gray-500 sm:text-[11.5px]">
            {deepAnalysis && <span className="mr-2 text-[#00ADEF]">· Deep analysis</span>}
            {comparativeMode && <span className="mr-2 text-[#00ADEF]">· Comparative</span>}
            Responses are generated with real-time search. Verify critical data before deciding.
          </p>
          </div>
        </div>
      </div>

      {/* ─── HISTORY DRAWER ────────────────────────────────────────── */}
      {showHistoryDrawer && (
        <Drawer
          title="Conversation history"
          animatedCloseRef={historyDrawerAnimatedCloseRef}
          onClose={() => setShowHistoryDrawer(false)}
          icon={faClockRotateLeft}
        >
          <div className="mb-3">
            <div className="flex items-center gap-2 rounded-xl border border-[#2A2A2A] bg-black/50 px-3 py-2">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="text-[11px] text-gray-500" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search conversations…"
                className="min-w-0 flex-1 bg-transparent text-xs text-gray-100 outline-none placeholder:text-gray-600"
              />
            </div>
          </div>

          {historyError && (
            <p className="mb-2 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-200">
              {historyError}
            </p>
          )}

          <div className="space-y-1.5">
            {historyLoading && <p className="text-xs text-gray-500">Cargando…</p>}
            {!historyLoading && filteredHistory.length === 0 && (
              <p className="text-xs text-gray-500">
                {history.length === 0 ? 'No saved conversations yet.' : 'No matches for your search.'}
              </p>
            )}
            {filteredHistory.map((conv) => {
              const isActive = conversationId === conv.id;
              const isConfirming = confirmDeleteId === conv.id;
              const isDeleting = deletingId === conv.id;

              if (isConfirming) {
                return (
                  <div
                    key={conv.id}
                    className="flex items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/[0.04] px-2.5 py-2 animate-fadeIn"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-normal text-red-200/95">Delete this conversation?</p>
                      <p className="line-clamp-1 text-[10.5px] text-gray-500">{conv.title}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void deleteConversation(conv.id)}
                      disabled={isDeleting}
                      aria-label="Confirm delete"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-red-400/90 transition-colors hover:bg-red-500/15 hover:text-red-300 disabled:pointer-events-none disabled:opacity-40"
                    >
                      <FontAwesomeIcon
                        icon={isDeleting ? faSpinner : faCheck}
                        className={`text-[12px] ${isDeleting ? 'animate-spin' : ''}`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      disabled={isDeleting}
                      aria-label="Cancel delete"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-white/[0.05] hover:text-gray-300 disabled:pointer-events-none disabled:opacity-40"
                    >
                      <FontAwesomeIcon icon={faXmark} className="text-[12px]" />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={conv.id}
                  className={`group flex items-center gap-0.5 rounded-lg transition-colors ${
                    isActive ? 'bg-[#00ADEF]/[0.08]' : 'bg-transparent hover:bg-white/[0.03]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      void openConversation(conv.id);
                      historyDrawerAnimatedCloseRef.current?.();
                    }}
                    className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] font-normal leading-snug ${
                      isActive ? 'text-[#B8EAFF]' : 'text-gray-400 group-hover:text-gray-100'
                    }`}
                  >
                    <FontAwesomeIcon icon={faMessage} className="shrink-0 text-[10px] text-gray-600" aria-hidden />
                    <span className="line-clamp-2">{conv.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(conv.id);
                    }}
                    aria-label="Delete conversation"
                    title="Delete"
                    className="mr-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-600 opacity-0 transition-colors hover:bg-red-500/10 hover:text-red-400 focus:opacity-100 group-hover:opacity-100"
                  >
                    <FontAwesomeIcon icon={faTrash} className="text-[11px]" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-4 border-t border-[#2A2A2A]/80 pt-3">
            <button
              type="button"
              onClick={startNewConversation}
              className="flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-[12px] font-normal text-gray-500 transition-colors hover:bg-white/[0.04] hover:text-[#00ADEF]"
            >
              <FontAwesomeIcon icon={faPlus} className="text-[11px] opacity-70" aria-hidden />
              New conversation
            </button>
          </div>
        </Drawer>
      )}

      {/* ─── SIMULATOR DRAWER ──────────────────────────────────────── */}
      {showSimulatorDrawer && (
        <Drawer
          title="What-if simulator"
          placement="bottom"
          onClose={() => setShowSimulatorDrawer(false)}
          icon={faChartLine}
        >
          {/* Bloque ultra compacto — descripción sólo lectores de pantalla */}
          <p className="sr-only">
            Projects baseline value with compound annual growth and shows a line chart.
          </p>

          <div className="grid min-w-0 grid-cols-3 gap-px rounded-md bg-black/25 p-0.5">
            {[
              { rate: '0.05', label: '5%', tag: 'Cons.', hint: 'Conservative' },
              { rate: '0.10', label: '10%', tag: 'Base', hint: 'Base' },
              { rate: '0.20', label: '20%', tag: 'Aggr.', hint: 'Aggressive' },
            ].map((preset) => (
              <button
                key={preset.rate}
                type="button"
                onClick={() => setSimGrowthRate(preset.rate)}
                title={preset.hint}
                className={`rounded-[5px] py-2 text-[11px] font-normal transition-colors ${
                  simGrowthRate === preset.rate
                    ? 'bg-white/[0.08] text-[#00ADEF]'
                    : 'text-gray-500 hover:bg-white/[0.05] hover:text-gray-300'
                }`}
              >
                <span className="block leading-none">{preset.label}</span>
                <span
                  className={`mt-0.5 block text-[9px] font-normal leading-none ${
                    simGrowthRate === preset.rate ? 'text-[#00ADEF]/50' : 'text-gray-600'
                  }`}
                >
                  {preset.tag}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-2 grid min-w-0 grid-cols-1 gap-1.5 sm:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-0.5 text-[10px] text-gray-500">
              Company
              <input
                ref={simCompanyAnchorRef}
                type="text"
                autoComplete="off"
                value={simCompanyQuery}
                onChange={(e) => {
                  const v = e.target.value;
                  setSimCompanyQuery(v);
                  setSimCompanyMenuOpen(true);
                  setResolvedCompany((prev) =>
                    prev && v.trim() !== prev.name.trim() ? null : prev,
                  );
                }}
                onFocus={() => setSimCompanyMenuOpen(true)}
                onBlur={() => {
                  window.setTimeout(() => setSimCompanyMenuOpen(false), 180);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setSimCompanyMenuOpen(false);
                }}
                placeholder="Search company…"
                aria-expanded={simCompanyMenuOpen}
                aria-controls="sim-company-suggestions"
                role="combobox"
                aria-autocomplete="list"
                className="min-h-[34px] min-w-0 max-w-full rounded-md border border-[#2A2A2A] bg-black/35 px-2.5 py-1 text-[12px] text-gray-100 outline-none focus:border-[#00ADEF]/50"
              />
              {simCompanyMenuOpen &&
                typeof document !== 'undefined' &&
                simCompanyPickGeom &&
                createPortal(
                  <ul
                    id="sim-company-suggestions"
                    role="listbox"
                    className="z-[260] overflow-y-auto rounded-md border border-[#2A2A2A] bg-[#101012] py-1 shadow-xl"
                    style={
                      {
                        position: 'fixed',
                        top: simCompanyPickGeom.top,
                        left: simCompanyPickGeom.left,
                        width: simCompanyPickGeom.width,
                        maxHeight: simCompanyPickGeom.maxH,
                      } satisfies CSSProperties
                    }
                  >
                    {simCompaniesLoading && (
                      <li className="px-2.5 py-2 text-[11px] text-gray-500">Loading companies…</li>
                    )}
                    {!simCompaniesLoading &&
                      filteredSimCompanies.length === 0 &&
                      !!simCompanyQuery.trim() &&
                      !!simCompanyCatalog.length && (
                        <li className="px-2.5 py-2 text-[11px] text-gray-600">No matches.</li>
                      )}
                    {!simCompaniesLoading &&
                      !simCompanyCatalog.length &&
                      filteredSimCompanies.length === 0 && (
                        <li className="px-2.5 py-2 text-[11px] text-gray-600">
                          No catalog loaded. Enter a name or numeric ID.
                        </li>
                      )}
                    {!simCompaniesLoading &&
                      filteredSimCompanies.map((row) => (
                        <li key={row.source === 'api' ? `${row.id}-${row.slug}` : `fb-${row.name}`} role="option">
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[12px] text-gray-200 transition-colors hover:bg-white/[0.06]"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              if (row.source === 'api') {
                                setSimCompanyQuery(row.name);
                                setResolvedCompany({ id: row.id, name: row.name });
                              } else {
                                setSimCompanyQuery(row.name);
                                setResolvedCompany(null);
                              }
                              setSimCompanyMenuOpen(false);
                            }}
                          >
                            <span className="min-w-0 flex-1 truncate">{row.name}</span>
                            {row.source === 'api' ? (
                              <span className="shrink-0 text-[10px] text-gray-600">{row.slug}</span>
                            ) : null}
                          </button>
                        </li>
                      ))}
                  </ul>,
                  document.body,
                )}
            </label>
            <label className="flex min-w-0 flex-col gap-0.5 text-[10px] text-gray-500">
              Years
              <input
                type="number"
                min={1}
                max={30}
                value={simYears}
                onChange={(e) => setSimYears(e.target.value)}
                className="min-h-[34px] min-w-0 max-w-full rounded-md border border-[#2A2A2A] bg-black/35 px-2.5 py-1 text-[12px] tabular-nums text-gray-100 outline-none focus:border-[#00ADEF]/50"
              />
            </label>
            <label className="flex min-w-0 flex-col gap-0.5 text-[10px] text-gray-500 sm:col-span-2">
              Growth (0.05 = 5%)
              <input
                inputMode="decimal"
                value={simGrowthRate}
                onChange={(e) => setSimGrowthRate(e.target.value)}
                placeholder="0.05"
                className="min-h-[34px] min-w-0 max-w-full rounded-md border border-[#2A2A2A] bg-black/35 px-2.5 py-1 text-[12px] tabular-nums text-gray-100 outline-none focus:border-[#00ADEF]/50"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={runSimulation}
            disabled={simLoading}
            className="mt-2.5 flex h-9 w-full items-center justify-center gap-2 rounded-md border border-[#00ADEF]/45 bg-transparent px-3 text-[12px] font-normal text-[#00ADEF] transition-colors hover:border-[#00ADEF]/65 hover:bg-[#00ADEF]/10 disabled:pointer-events-none disabled:opacity-40"
          >
            {simLoading ? (
              <>
                <FontAwesomeIcon icon={faArrowRotateRight} spin className="text-[12px]" />
                Calculando…
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faChartLine} className="text-[11px] opacity-80" aria-hidden />
                Projection
              </>
            )}
          </button>

          {simError && (
            <p className="mt-2 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] leading-snug text-red-200">
              {simError}
            </p>
          )}

          {resolvedCompany && (
            <p className="mt-2 truncate text-[10px] text-gray-600">
              <span className="text-[#00ADEF]">{resolvedCompany.name}</span>
              <span>{` · ${resolvedCompany.id}`}</span>
            </p>
          )}

          {simulation && (
            <div className="mt-3 min-w-0 rounded-md border border-[#2A2A2A] bg-black/30 p-2">
              <div className="mb-1 flex min-w-0 justify-between gap-2">
                <p className="min-w-0 truncate text-[11px] text-gray-100">{simulation.company_name}</p>
                <p className="shrink-0 text-[10px] text-gray-600">{simulation.scenario}</p>
              </div>
              <div className="-mx-1 h-[136px] min-w-0 overflow-hidden sm:h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={simulationRows} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                    <XAxis dataKey="year" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                    <YAxis
                      tick={{ fill: '#9CA3AF', fontSize: 10 }}
                      domain={[0, Math.ceil(maxProjectedValue * 1.1)]}
                    />
                    <Tooltip
                      formatter={
                        ((value: unknown): [string, string] => {
                          const num = typeof value === 'number' ? value : Number(value ?? 0);
                          return [Number.isFinite(num) ? num.toFixed(2) : String(value ?? ''), 'Valor'];
                        }) as never
                      }
                      labelFormatter={(label) => `Year ${label}`}
                      contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 6 }}
                    />
                    <Line type="monotone" dataKey="value" stroke="#00ADEF" strokeWidth={2} dot={{ r: 2.5, fill: '#00ADEF' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-1 text-[10px] sm:grid-cols-3">
                {simulationRows.map((point) => (
                  <div key={point.year} className="rounded border border-[#2A2A2A] bg-black/25 px-1.5 py-0.5">
                    <span className="text-gray-600">{point.year}</span>{' '}
                    <span className="tabular-nums text-[#00ADEF]">{point.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Drawer>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────── */
/* Helpers de presentación                                          */
/* ──────────────────────────────────────────────────────────────── */

interface ToolbarButtonProps {
  label: string;
  icon: IconDefinition;
  onClick: () => void;
  disabled?: boolean;
  badge?: number;
}

function ToolbarButton({ label, icon, onClick, disabled, badge }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-white/[0.035] hover:text-gray-100 active:bg-white/[0.05] disabled:pointer-events-none disabled:opacity-30 sm:h-9 sm:w-9"
    >
      <FontAwesomeIcon icon={icon} className="text-[13px]" />
      {typeof badge === 'number' && badge > 0 && (
        <span className="pointer-events-none absolute -right-0.5 top-1 flex min-w-[15px] items-center justify-center rounded-sm bg-[#00ADEF]/12 px-[3px] text-[9px] font-medium tabular-nums leading-none text-[#00ADEF] ring-1 ring-[#00ADEF]/25">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}

function prefersReducedDrawerMotion(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

const DRAWER_EXIT_EASE = 'cubic-bezier(0.32, 0, 0.67, 0)';
const DRAWER_SPRING_BACK_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

interface DrawerProps {
  title: string;
  icon: IconDefinition;
  onClose: () => void;
  children: React.ReactNode;
  /** Panel lateral (historial) o hoja inferior (simulador). */
  placement?: 'right' | 'bottom';
  /** Opcional: asignar `requestClose` para cerrar con la misma animación que backdrop/botón. */
  animatedCloseRef?: MutableRefObject<(() => void) | null>;
}

function Drawer({
  title,
  icon,
  onClose,
  children,
  placement = 'right',
  animatedCloseRef,
}: DrawerProps) {
  const isBottom = placement === 'bottom';
  const [closing, setClosing] = useState(false);
  const [closingExitSweep, setClosingExitSweep] = useState(false);
  const exitedRef = useRef(false);
  const asideRef = useRef<HTMLElement>(null);
  const dragStartYRef = useRef<number | null>(null);
  const [openEnterDone, setOpenEnterDone] = useState(() => prefersReducedDrawerMotion());
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);

  /** Cierra lateral o inferior con animación; movimiento opcional sólo inferior (arrastre). */
  const requestClose = useCallback(
    (options?: { keepDrag?: boolean }) => {
      const keepDrag = options?.keepDrag === true;
      setDragging(false);
      if (prefersReducedDrawerMotion()) {
        setDragY(0);
        onClose();
        return;
      }
      exitedRef.current = false;
      setClosingExitSweep(false);
      if (isBottom && !keepDrag) setDragY(0);
      setClosing((c) => (c ? c : true));
    },
    [isBottom, onClose],
  );

  useLayoutEffect(() => {
    if (!animatedCloseRef) return;
    animatedCloseRef.current = () => {
      requestClose();
    };
    return () => {
      animatedCloseRef.current = null;
    };
  }, [animatedCloseRef, requestClose]);

  /** Primer fotograma mantener translate; siguiente animar hasta fuera del viewport. */
  useLayoutEffect(() => {
    if (!closing) {
      setClosingExitSweep(false);
      return;
    }
    if (prefersReducedDrawerMotion()) return;
    let cancelled = false;
    const id = window.requestAnimationFrame(() => {
      if (!cancelled) setClosingExitSweep(true);
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(id);
    };
  }, [closing]);

  useEffect(() => {
    if (!closing || !closingExitSweep) return;
    if (exitedRef.current) return;
    const tid = window.setTimeout(() => {
      if (exitedRef.current) return;
      exitedRef.current = true;
      onClose();
    }, 500);
    return () => window.clearTimeout(tid);
  }, [closing, closingExitSweep, onClose]);

  const finalizeHandleDrag = useCallback(
    (clientY: number) => {
      const start = dragStartYRef.current;
      dragStartYRef.current = null;
      setDragging(false);

      if (start == null) return;

      const currentOffset = Math.max(0, clientY - start);
      const asideEl = asideRef.current;
      const sheetHeight = asideEl?.offsetHeight ?? 440;
      const threshold = Math.min(160, Math.max(96, sheetHeight * 0.22));

      if (currentOffset > threshold && !closing) {
        setDragY(currentOffset);
        requestClose({ keepDrag: true });
      } else {
        setDragY(0);
      }
    },
    [closing, requestClose],
  );

  const onHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isBottom || closing || !openEnterDone) return;
    if (prefersReducedDrawerMotion()) return;
    dragStartYRef.current = e.clientY;
    setDragging(true);
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* algunos navegadores */
    }
  };

  const onHandlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isBottom || dragStartYRef.current == null) return;
    const delta = e.clientY - dragStartYRef.current;
    setDragY(Math.max(0, delta));
  };

  const onHandlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isBottom || dragStartYRef.current == null) return;
    try {
      if ((e.target as HTMLElement).releasePointerCapture) {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      }
    } catch {
      /* noop */
    }
    finalizeHandleDrag(e.clientY);
  };

  const backdropClass =
    closing && closingExitSweep
      ? 'absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-none opacity-0 drawer-bottom-backdrop-exit'
      : 'absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn';

  const asideTransformStyle: CSSProperties | undefined = (() => {
    if (!closing && !openEnterDone) return undefined;

    if (isBottom) {
      if (closing) {
        return {
          transform: closingExitSweep ? 'translateY(100%)' : `translateY(${dragY}px)`,
          transition: closingExitSweep ? `transform 0.36s ${DRAWER_EXIT_EASE}` : 'none',
        };
      }
      return {
        transform: `translateY(${dragY}px)`,
        transition: dragging ? 'none' : `transform 0.24s ${DRAWER_SPRING_BACK_EASE}`,
      };
    }

    if (closing) {
      return {
        transform: closingExitSweep ? 'translateX(100%)' : 'translateX(0)',
        transition: closingExitSweep ? `transform 0.36s ${DRAWER_EXIT_EASE}` : 'none',
      };
    }

    return { transform: 'translateX(0)', transition: 'none' };
  })();

  return (
    <div className="fixed inset-0 z-50">
      <div className={backdropClass} onClick={() => requestClose()} aria-hidden />

      <aside
        ref={asideRef}
        style={asideTransformStyle}
        onTransitionEnd={(e) => {
          if (!closing || !closingExitSweep || exitedRef.current) return;
          if (e.propertyName !== 'transform') return;
          if (e.target !== e.currentTarget) return;
          exitedRef.current = true;
          onClose();
        }}
        onAnimationEnd={(e) => {
          if (closing) return;
          if (e.target !== e.currentTarget) return;
          const name = (e.animationName || '').toString();
          if (isBottom ? name.includes('slideInUp') : name.includes('slideInRight')) {
            setOpenEnterDone(true);
          }
        }}
        className={
          isBottom
            ? `${closing || openEnterDone ? '' : 'animate-slideInUp'} absolute inset-x-0 bottom-0 flex max-h-[min(92dvh,880px)] min-w-0 max-w-none flex-col overflow-x-hidden rounded-t-2xl border-t border-[#2A2A2A] bg-[#0A0A0A] shadow-2xl md:left-[88px] md:right-0`
            : `${closing || openEnterDone ? '' : 'animate-slideInRight'} absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-[#2A2A2A] bg-[#0A0A0A] shadow-2xl`
        }
      >
        {isBottom && (
          <div
            className="-mt-px flex min-h-[48px] shrink-0 cursor-grab touch-none select-none items-center justify-center pb-2 pt-3 active:cursor-grabbing"
            role="separator"
            aria-orientation="horizontal"
            aria-label="Drag down to close"
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
            onPointerCancel={(e) => {
              dragStartYRef.current = null;
              setDragging(false);
              try {
                (e.target as HTMLElement).releasePointerCapture(e.pointerId);
              } catch {
                /* noop */
              }
              setDragY(0);
            }}
          >
            <div className="pointer-events-none h-1 w-9 shrink-0 rounded-full bg-[#404040]" aria-hidden />
          </div>
        )}
        <header className={`flex shrink-0 items-center gap-2 border-b border-[#2A2A2A] px-3 sm:gap-3 sm:px-4 ${isBottom ? 'py-2' : 'py-3'}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#00ADEF]/10 text-[#00ADEF] sm:h-9 sm:w-9 sm:rounded-xl">
            <FontAwesomeIcon icon={icon} className="text-[12px] sm:text-sm" />
          </div>
          <h3 className="min-w-0 flex-1 truncate text-xs font-medium text-gray-100 sm:text-sm">{title}</h3>
          {!isBottom && (
            <button
              type="button"
              onClick={() => requestClose()}
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-white/[0.05] hover:text-gray-300"
            >
              <FontAwesomeIcon icon={faXmark} className="text-[14px]" />
            </button>
          )}
        </header>
        <div className={`min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto ${isBottom ? 'px-3 pb-4 pt-1.5 sm:px-4' : 'px-4 py-4'}`}>
          {children}
        </div>
      </aside>
    </div>
  );
}
