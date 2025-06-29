import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { SearchTrends } from './SearchTrends';
import { SearchService } from '@/services/searchService';

// Mock SearchService
jest.mock('@/services/searchService', () => ({
  SearchService: {
    getInstance: jest.fn(() => ({
      getSearchTrends: jest.fn(),
    })),
  },
}));

describe.skip('SearchTrends', () => {
  const mockSearchService = SearchService.getInstance();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state initially', () => {
    (mockSearchService.getSearchTrends as jest.Mock).mockImplementation(() => {
      return new Promise(resolve => setTimeout(resolve, 100));
    });

    render(<SearchTrends />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders trends data correctly', async () => {
    const mockTrends = {
      weeklyTrends: [
        { day: 'Mon', count: 10, types: { food: 5, meal: 5 } },
        { day: 'Tue', count: 15, types: { food: 10, meal: 5 } },
      ],
      monthlyTrends: [
        { week: 'Week 1', count: 50, categories: { Favorites: 30, Work: 20 } },
        { week: 'Week 2', count: 45, categories: { Favorites: 25, Work: 20 } },
      ],
      peakHours: [
        { hour: 9, count: 20 },
        { hour: 12, count: 15 },
      ],
      searchPatterns: [
        {
          pattern: 'healthy food',
          frequency: 10,
          examples: ['healthy food options', 'healthy food near me'],
        },
      ],
    };

    (mockSearchService.getSearchTrends as jest.Mock).mockReturnValue(mockTrends);

    render(<SearchTrends />);

    await waitFor(() => {
      expect(screen.getByText('Search Trends')).toBeInTheDocument();
      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('10 searches')).toBeInTheDocument();
      expect(screen.getByText('food (5)')).toBeInTheDocument();
      expect(screen.getByText('Week 1')).toBeInTheDocument();
      expect(screen.getByText('50 searches')).toBeInTheDocument();
      expect(screen.getByText('Favorites (30)')).toBeInTheDocument();
      expect(screen.getByText('09:00')).toBeInTheDocument();
      expect(screen.getByText('20 searches')).toBeInTheDocument();
      expect(screen.getByText('healthy food')).toBeInTheDocument();
      expect(screen.getByText('10 times')).toBeInTheDocument();
      expect(screen.getByText('• healthy food options')).toBeInTheDocument();
    });
  });

  it('handles error when loading trends', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    (mockSearchService.getSearchTrends as jest.Mock).mockImplementation(() => {
      throw new Error('Failed to load trends');
    });

    render(<SearchTrends />);

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        'Error loading search trends:',
        expect.any(Error)
      );
    });

    consoleError.mockRestore();
  });

  it('renders nothing when trends data is null', async () => {
    (mockSearchService.getSearchTrends as jest.Mock).mockReturnValue(null);

    const { container } = render(<SearchTrends />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
}); 