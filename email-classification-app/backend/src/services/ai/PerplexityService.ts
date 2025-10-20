import axios from 'axios';
import { logger } from '../../utils/logger';

export interface PerplexityResponse {
  answer: string;
  sources?: string[];
}

export class PerplexityService {
  private apiKey: string;
  private readonly baseUrl = 'https://api.perplexity.ai';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(query: string): Promise<PerplexityResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: 'Du bist ein Experte für deutsches Steuerrecht. Recherchiere tagesaktuelle Steuergesetze, Freibeträge und Urteile.'
            },
            {
              role: 'user',
              content: query
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const answer = response.data.choices?.[0]?.message?.content || '';
      const sources = response.data.citations || [];

      logger.info('Perplexity search completed', { query, sourcesCount: sources.length });

      return { answer, sources };

    } catch (error) {
      logger.error('Perplexity search failed', { error, query });
      throw error;
    }
  }
}
