import { useState } from 'react';
import { apiClient } from '../../../services/apiClient';

export type ChartType = 'none' | 'bar' | 'line' | 'pie';

export interface VisualData {
  chartType: ChartType;
  title: string;
  labels: string[];
  values: number[];
  unit: string;
}

interface ChatSource {
  title?: string;
  url?: string;
}

interface BackendVisualData {
  chart_type?: string;
  title?: string;
  labels?: string[];
  values?: number[];
  unit?: string;
}

interface BackendChatResponse {
  conversation_id?: string;
  answer?: string;
  title?: string;
  assistant_message_id?: string;
  insights?: string[];
  recommendations?: string[];
  sources?: ChatSource[];
  visual_data?: BackendVisualData | null;
  chart_type?: string;
  chart_title?: string;
  chart_labels?: string[];
  chart_values?: number[];
  chart_unit?: string;
  confidence?: number;
}

export interface ChatResponseData {
  answer: string;
  insights: string[];
  recommendations: string[];
  visualData?: VisualData;
  sources: { title: string; url: string }[];
  conversation_id?: string;
  title?: string;
  assistant_message_id?: string;
  confidence?: number;
}

export interface SendMessageArgs {
  query: string;
  conversation_id?: string | null;
  deep_analysis?: boolean;
  comparative_mode?: boolean;
}

const VALID_CHART_TYPES: ReadonlyArray<ChartType> = ['bar', 'line', 'pie'];

function normalizeChartType(value: unknown): ChartType {
  if (typeof value === 'string' && (VALID_CHART_TYPES as readonly string[]).includes(value)) {
    return value as ChartType;
  }
  return 'none';
}

function buildVisualData(raw: BackendChatResponse): VisualData | undefined {
  const flatChartType = normalizeChartType(raw.chart_type);
  const nestedChartType = normalizeChartType(raw.visual_data?.chart_type);
  const chartType: ChartType = flatChartType !== 'none' ? flatChartType : nestedChartType;

  if (chartType === 'none') {
    return undefined;
  }

  const labels = raw.visual_data?.labels ?? raw.chart_labels ?? [];
  const values = raw.visual_data?.values ?? raw.chart_values ?? [];

  if (!labels.length || !values.length || labels.length !== values.length) {
    return undefined;
  }

  return {
    chartType,
    title: raw.visual_data?.title ?? raw.chart_title ?? 'Visualization',
    labels,
    values,
    unit: raw.visual_data?.unit ?? raw.chart_unit ?? '%',
  };
}

export function useBackendChat() {
  const [loading, setLoading] = useState(false);

  const sendMessage = async ({
    query,
    conversation_id,
    deep_analysis = false,
    comparative_mode = false,
  }: SendMessageArgs): Promise<{ data: ChatResponseData | null; error: string | null }> => {
    setLoading(true);
    try {
      const payload = {
        query,
        conversation_id: conversation_id ?? undefined,
        deep_analysis,
        comparative_mode,
        stream: false,
      };

      const raw = await apiClient<BackendChatResponse>('/chat/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const normalized: ChatResponseData = {
        answer: raw.answer ?? '',
        insights: raw.insights ?? [],
        recommendations: raw.recommendations ?? [],
        sources: (raw.sources ?? [])
          .filter((src): src is { title?: string; url: string } => Boolean(src?.url))
          .map((src) => ({
            title: src.title ?? 'Source',
            url: src.url ?? '#',
          })),
        conversation_id: raw.conversation_id,
        title: raw.title,
        assistant_message_id: raw.assistant_message_id,
        confidence: raw.confidence,
        visualData: buildVisualData(raw),
      };

      return { data: normalized, error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send message to the backend';
      return { data: null, error: message };
    } finally {
      setLoading(false);
    }
  };

  return { sendMessage, loading };
}
