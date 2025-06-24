import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { SearchInsights } from './SearchInsights';
import { SearchService } from '@/services/searchService';

// Mock SearchService
jest.mock('@/services/searchService', () => ({
  SearchService: {
    getInstance: jest.fn(() => ({
      getSearchInsights: jest.fn(),
    })),
  },
}));

describe('SearchInsights', () => {
  const mockSearchService = SearchService.getInstance();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state initially', () => {
    (mockSearchService.getSearchInsights as jest.Mock).mockImplementation(() => {
      return new Promise(resolve => setTimeout(resolve, 100));
    });

    render(<SearchInsights />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders insights data correctly', async () => {
    const mockInsights = [
      {
        type: 'recommendation',
        title: 'Popular Tags',
        description: 'Based on your search history, you might be interested in: healthy, protein, vegan',
        confidence: 0.9,
        data: {
          tags: [['healthy', 10], ['protein', 8], ['vegan', 5]],
        },
        action: {
          label: 'Explore Tags',
          type: 'tags',
          value: 'healthy,protein,vegan',
        },
      },
      {
        type: 'pattern',
        title: 'Peak Search Time Detected',
        description: 'You tend to search most actively around 09:00. Consider setting up quick-access shortcuts for this time.',
        confidence: 0.8,
        data: {
          peakHour: 9,
          peakCount: 20,
          totalSearches: 100,
        },
        action: {
          label: 'Set Quick Access',
          type: 'shortcut',
          value: 'quick-access-9',
        },
      },
    ];

    (mockSearchService.getSearchInsights as jest.Mock).mockReturnValue(mockInsights);

    render(<SearchInsights />);

    await waitFor(() => {
      expect(screen.getByText('Search Insights')).toBeInTheDocument();
      expect(screen.getByText('Popular Tags')).toBeInTheDocument();
      expect(screen.getByText('Based on your search history, you might be interested in: healthy, protein, vegan')).toBeInTheDocument();
      expect(screen.getByText('Explore Tags')).toBeInTheDocument();
      expect(screen.getByText('Peak Search Time Detected')).toBeInTheDocument();
      expect(screen.getByText('You tend to search most actively around 09:00. Consider setting up quick-access shortcuts for this time.')).toBeInTheDocument();
      expect(screen.getByText('Set Quick Access')).toBeInTheDocument();
      expect(screen.getByText('90% confidence')).toBeInTheDocument();
      expect(screen.getByText('80% confidence')).toBeInTheDocument();
    });
  });

  it('handles error when loading insights', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    (mockSearchService.getSearchInsights as jest.Mock).mockImplementation(() => {
      throw new Error('Failed to load insights');
    });

    render(<SearchInsights />);

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        'Error loading search insights:',
        expect.any(Error)
      );
    });

    consoleError.mockRestore();
  });

  it('renders nothing when insights data is empty', async () => {
    (mockSearchService.getSearchInsights as jest.Mock).mockReturnValue([]);

    const { container } = render(<SearchInsights />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('renders nothing when insights data is null', async () => {
    (mockSearchService.getSearchInsights as jest.Mock).mockReturnValue(null);

    const { container } = render(<SearchInsights />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
}); 