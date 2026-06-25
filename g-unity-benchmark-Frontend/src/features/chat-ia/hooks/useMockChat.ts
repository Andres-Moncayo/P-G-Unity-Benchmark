import { useState } from 'react';
import type { ChatResponseData, SendMessageArgs, VisualData } from './useBackendChat';

const STATIC_VISUAL_VECTOR: VisualData = {
  chartType: 'bar',
  title: 'iOS IAP Growth (Q2) vs Competitor',
  labels: ['Unity Vector AI', 'AppLovin', 'Market Average'],
  values: [18.5, 14.2, 8.5],
  unit: '%',
};

const STATIC_VISUAL_UNITY6: VisualData = {
  chartType: 'bar',
  title: 'Download-to-License Conversion (Projected)',
  labels: ['Indie Studios', 'Mid-Market', 'Enterprise'],
  values: [8.5, 22.4, 45.1],
  unit: '%',
};

export function useMockChat() {
  const [loading, setLoading] = useState(false);

  const sendMessage = async ({
    query,
  }: SendMessageArgs): Promise<{ data: ChatResponseData | null; error: string | null }> => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const lowerQuery = query.toLowerCase();
    let responseData: ChatResponseData;

    if (lowerQuery.includes('vector') || lowerQuery.includes('applovin') || lowerQuery.includes('ios')) {
      responseData = {
        answer:
          'Based on Q2 comparative analysis, **Unity Vector AI** is showing a significant recovery in iOS market share versus AppLovin, driving in-app purchase (IAP) growth.',
        insights: [
          'Vector AI increased iOS installs by 15–20% over the last month.',
          'The Grow segment grew 15% sequentially, reversing the prior contraction.',
          'AppLovin still leads on raw volume, but Unity ROAS improved 12%.',
        ],
        visualData: STATIC_VISUAL_VECTOR,
        recommendations: [
          'Launch commission incentives for publishers migrating from AppLovin to Vector AI.',
          'Integrate Vector AI metrics into Enterprise subscription sales pitches.',
        ],
        sources: [
          { title: 'Unity Q2 Financial Report', url: 'https://investors.unity.com/' },
          { title: 'AppLovin Performance Analytics', url: 'https://www.applovin.com/' },
        ],
        confidence: 0.82,
        conversation_id: 'mock-conv-vector',
        assistant_message_id: `mock-assistant-${Date.now()}`,
      };
    } else if (lowerQuery.includes('unity 6') || lowerQuery.includes('downloads')) {
      responseData = {
        answer:
          '**6.6 million Unity 6 downloads** mark a technical milestone, but conversion to paid subscriptions (Pro/Enterprise) is the strategic challenge this quarter.',
        insights: [
          'Accelerated adoption: +12% quarter-over-quarter download growth.',
          '45% of downloads come from users upgrading from older LTS versions.',
          'Early retention (D30) improved thanks to integrated AI tooling.',
        ],
        visualData: STATIC_VISUAL_UNITY6,
        recommendations: [
          'Offer an aggressive first-year discount to Mid-Market studios active on Unity 6.',
          'Host a technical webinar on performance optimization for Enterprise teams.',
        ],
        sources: [{ title: 'Unity 6 Launch Notes', url: 'https://unity.com/releases/unity-6' }],
        confidence: 0.77,
        conversation_id: 'mock-conv-unity6',
        assistant_message_id: `mock-assistant-${Date.now()}`,
      };
    } else {
      responseData = {
        answer:
          'Reviewing the current competitive landscape. Market signals show strong pressure across game engine ecosystems and monetization platforms.',
        insights: [
          'Community trust (Create) is in active recovery.',
          'End-to-end tool consolidation is the standard AAA studios now expect.',
        ],
        recommendations: [
          'Review service-level agreements (SLAs) for top-tier clients.',
          'Align product strategy across Grow and Create to reduce friction.',
        ],
        sources: [],
        confidence: 0.6,
        conversation_id: 'mock-conv-generic',
        assistant_message_id: `mock-assistant-${Date.now()}`,
      };
    }

    setLoading(false);
    return { data: responseData, error: null };
  };

  return { sendMessage, loading };
}
