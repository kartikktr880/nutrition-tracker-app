import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecentSearches } from './RecentSearches';
import { SearchService } from '@/services/searchService';

// Mock SearchService
jest.mock('@/services/searchService', () => ({
  SearchService: {
    getInstance: jest.fn(() => ({
      getRecentSearches: jest.fn(),
      clearRecentSearches: jest.fn(),
      getCategories: jest.fn(),
      getTags: jest.fn(),
      updateSearchCategory: jest.fn(),
      updateSearchTags: jest.fn(),
      exportRecentSearches: jest.fn(),
      importRecentSearches: jest.fn(),
    })),
  },
}));

describe('RecentSearches', () => {
  const mockOnSelect = jest.fn();
  const mockOnClear = jest.fn();
  const mockSearchService = SearchService.getInstance();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state initially', () => {
    (mockSearchService.getRecentSearches as jest.Mock).mockImplementation(() => {
      return new Promise(resolve => setTimeout(resolve, 100));
    });

    render(<RecentSearches onSelect={mockOnSelect} onClear={mockOnClear} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders nothing when there are no recent searches', async () => {
    (mockSearchService.getRecentSearches as jest.Mock).mockReturnValue([]);
    (mockSearchService.getCategories as jest.Mock).mockReturnValue([]);
    (mockSearchService.getTags as jest.Mock).mockReturnValue([]);

    const { container } = render(
      <RecentSearches onSelect={mockOnSelect} onClear={mockOnClear} />
    );
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('renders recent searches with categories and tags', async () => {
    const mockSearches = [
      {
        query: 'apple',
        timestamp: Date.now() - 1000 * 60 * 5,
        type: 'food',
        category: 'Favorites',
        tags: ['fruit', 'healthy'],
      },
      {
        query: 'chicken',
        timestamp: Date.now() - 1000 * 60 * 10,
        type: 'meal',
        category: 'Work',
        tags: ['protein', 'lunch'],
      },
    ];

    (mockSearchService.getRecentSearches as jest.Mock).mockReturnValue(mockSearches);
    (mockSearchService.getCategories as jest.Mock).mockReturnValue(['Favorites', 'Work', 'Personal']);
    (mockSearchService.getTags as jest.Mock).mockReturnValue(['fruit', 'healthy', 'protein', 'lunch']);

    render(<RecentSearches onSelect={mockOnSelect} onClear={mockOnClear} />);

    await waitFor(() => {
      expect(screen.getByText('Recent Searches')).toBeInTheDocument();
      expect(screen.getByText('apple')).toBeInTheDocument();
      expect(screen.getByText('chicken')).toBeInTheDocument();
      expect(screen.getByText('Favorites')).toBeInTheDocument();
      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.getByText('fruit')).toBeInTheDocument();
      expect(screen.getByText('protein')).toBeInTheDocument();
    });
  });

  it('filters searches by category', async () => {
    const mockSearches = [
      {
        query: 'apple',
        timestamp: Date.now(),
        type: 'food',
        category: 'Favorites',
      },
      {
        query: 'chicken',
        timestamp: Date.now(),
        type: 'meal',
        category: 'Work',
      },
    ];

    (mockSearchService.getRecentSearches as jest.Mock).mockReturnValue(mockSearches);
    (mockSearchService.getCategories as jest.Mock).mockReturnValue(['Favorites', 'Work', 'Personal']);
    (mockSearchService.getTags as jest.Mock).mockReturnValue([]);

    render(<RecentSearches onSelect={mockOnSelect} onClear={mockOnClear} />);

    await waitFor(() => {
      const categorySelect = screen.getByLabelText('Filter by category');
      fireEvent.change(categorySelect, { target: { value: 'Favorites' } });
    });

    expect(mockSearchService.getRecentSearches).toHaveBeenCalledWith('Favorites', []);
  });

  it('updates search category', async () => {
    const mockSearches = [
      {
        query: 'apple',
        timestamp: Date.now(),
        type: 'food',
        category: 'Favorites',
      },
    ];

    (mockSearchService.getRecentSearches as jest.Mock).mockReturnValue(mockSearches);
    (mockSearchService.getCategories as jest.Mock).mockReturnValue(['Favorites', 'Work', 'Personal']);
    (mockSearchService.getTags as jest.Mock).mockReturnValue([]);

    render(<RecentSearches onSelect={mockOnSelect} onClear={mockOnClear} />);

    await waitFor(() => {
      fireEvent.click(screen.getByText('Edit'));
    });

    const categorySelect = screen.getByLabelText('Select category');
    fireEvent.change(categorySelect, { target: { value: 'Work' } });

    expect(mockSearchService.updateSearchCategory).toHaveBeenCalledWith('apple', 'Work');
  });

  it('updates search tags', async () => {
    const mockSearches = [
      {
        query: 'apple',
        timestamp: Date.now(),
        type: 'food',
        tags: ['fruit'],
      },
    ];

    (mockSearchService.getRecentSearches as jest.Mock).mockReturnValue(mockSearches);
    (mockSearchService.getCategories as jest.Mock).mockReturnValue([]);
    (mockSearchService.getTags as jest.Mock).mockReturnValue(['fruit', 'healthy']);

    render(<RecentSearches onSelect={mockOnSelect} onClear={mockOnClear} />);

    await waitFor(() => {
      fireEvent.click(screen.getByText('Edit'));
    });

    const healthyCheckbox = screen.getByLabelText('healthy');
    fireEvent.click(healthyCheckbox);

    expect(mockSearchService.updateSearchTags).toHaveBeenCalledWith('apple', ['fruit', 'healthy']);
  });

  it('handles error when loading recent searches', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    (mockSearchService.getRecentSearches as jest.Mock).mockImplementation(() => {
      throw new Error('Failed to load searches');
    });

    render(<RecentSearches onSelect={mockOnSelect} onClear={mockOnClear} />);

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        'Error loading recent searches:',
        expect.any(Error)
      );
    });

    consoleError.mockRestore();
  });

  it('filters searches by search term', async () => {
    const mockSearches = [
      {
        query: 'apple',
        timestamp: Date.now(),
        type: 'food',
        category: 'Favorites',
        tags: ['fruit'],
      },
      {
        query: 'chicken',
        timestamp: Date.now(),
        type: 'meal',
        category: 'Work',
        tags: ['protein'],
      },
    ];

    (mockSearchService.getRecentSearches as jest.Mock).mockReturnValue(mockSearches);
    (mockSearchService.getCategories as jest.Mock).mockReturnValue(['Favorites', 'Work']);
    (mockSearchService.getTags as jest.Mock).mockReturnValue(['fruit', 'protein']);

    render(<RecentSearches onSelect={mockOnSelect} onClear={mockOnClear} />);

    await waitFor(() => {
      const searchInput = screen.getByLabelText('Search in history');
      fireEvent.change(searchInput, { target: { value: 'apple' } });
    });

    expect(mockSearchService.getRecentSearches).toHaveBeenCalledWith(
      undefined,
      [],
      'apple',
      'newest'
    );
  });

  it('sorts searches by different criteria', async () => {
    const mockSearches = [
      {
        query: 'apple',
        timestamp: Date.now() - 1000,
        type: 'food',
        category: 'Favorites',
      },
      {
        query: 'chicken',
        timestamp: Date.now(),
        type: 'meal',
        category: 'Work',
      },
    ];

    (mockSearchService.getRecentSearches as jest.Mock).mockReturnValue(mockSearches);
    (mockSearchService.getCategories as jest.Mock).mockReturnValue(['Favorites', 'Work']);
    (mockSearchService.getTags as jest.Mock).mockReturnValue([]);

    render(<RecentSearches onSelect={mockOnSelect} onClear={mockOnClear} />);

    await waitFor(() => {
      const sortSelect = screen.getByLabelText('Sort by');
      fireEvent.change(sortSelect, { target: { value: 'oldest' } });
    });

    expect(mockSearchService.getRecentSearches).toHaveBeenCalledWith(
      undefined,
      [],
      '',
      'oldest'
    );
  });

  it('clears search term when clear button is clicked', async () => {
    const mockSearches = [
      {
        query: 'apple',
        timestamp: Date.now(),
        type: 'food',
      },
    ];

    (mockSearchService.getRecentSearches as jest.Mock).mockReturnValue(mockSearches);
    (mockSearchService.getCategories as jest.Mock).mockReturnValue([]);
    (mockSearchService.getTags as jest.Mock).mockReturnValue([]);

    render(<RecentSearches onSelect={mockOnSelect} onClear={mockOnClear} />);

    await waitFor(() => {
      const searchInput = screen.getByLabelText('Search in history');
      fireEvent.change(searchInput, { target: { value: 'apple' } });
      fireEvent.focus(searchInput);
    });

    const clearButton = screen.getByLabelText('Clear search');
    fireEvent.click(clearButton);

    expect(mockSearchService.getRecentSearches).toHaveBeenCalledWith(
      undefined,
      [],
      '',
      'newest'
    );
  });

  it('combines search term with category and tag filters', async () => {
    const mockSearches = [
      {
        query: 'apple',
        timestamp: Date.now(),
        type: 'food',
        category: 'Favorites',
        tags: ['fruit'],
      },
    ];

    (mockSearchService.getRecentSearches as jest.Mock).mockReturnValue(mockSearches);
    (mockSearchService.getCategories as jest.Mock).mockReturnValue(['Favorites']);
    (mockSearchService.getTags as jest.Mock).mockReturnValue(['fruit']);

    render(<RecentSearches onSelect={mockOnSelect} onClear={mockOnClear} />);

    await waitFor(() => {
      const searchInput = screen.getByLabelText('Search in history');
      const categorySelect = screen.getByLabelText('Filter by category');
      
      fireEvent.change(searchInput, { target: { value: 'apple' } });
      fireEvent.change(categorySelect, { target: { value: 'Favorites' } });
    });

    expect(mockSearchService.getRecentSearches).toHaveBeenCalledWith(
      'Favorites',
      [],
      'apple',
      'newest'
    );
  });

  it('exports search history', async () => {
    const mockSearches = [
      {
        query: 'apple',
        timestamp: Date.now(),
        type: 'food',
        category: 'Favorites',
      },
    ];

    (mockSearchService.getRecentSearches as jest.Mock).mockReturnValue(mockSearches);
    (mockSearchService.getCategories as jest.Mock).mockReturnValue(['Favorites']);
    (mockSearchService.getTags as jest.Mock).mockReturnValue([]);
    (mockSearchService.exportRecentSearches as jest.Mock).mockReturnValue(JSON.stringify(mockSearches));

    // Mock URL.createObjectURL and document.createElement
    const mockCreateObjectURL = jest.fn();
    const mockRevokeObjectURL = jest.fn();
    const mockClick = jest.fn();
    const mockAppendChild = jest.fn();
    const mockRemoveChild = jest.fn();

    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;
    document.createElement = jest.fn(() => ({
      click: mockClick,
      href: '',
      download: '',
    }));
    document.body.appendChild = mockAppendChild;
    document.body.removeChild = mockRemoveChild;

    render(<RecentSearches onSelect={mockOnSelect} onClear={mockOnClear} />);

    await waitFor(() => {
      const exportButton = screen.getByLabelText('Export search history');
      fireEvent.click(exportButton);
    });

    expect(mockSearchService.exportRecentSearches).toHaveBeenCalled();
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(mockAppendChild).toHaveBeenCalled();
    expect(mockRemoveChild).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });

  it('imports search history', async () => {
    const mockSearches = [
      {
        query: 'apple',
        timestamp: Date.now(),
        type: 'food',
        category: 'Favorites',
      },
    ];

    const mockFile = new File([JSON.stringify(mockSearches)], 'search-history.json', {
      type: 'application/json',
    });

    (mockSearchService.getRecentSearches as jest.Mock).mockReturnValue(mockSearches);
    (mockSearchService.getCategories as jest.Mock).mockReturnValue(['Favorites']);
    (mockSearchService.getTags as jest.Mock).mockReturnValue([]);
    (mockSearchService.importRecentSearches as jest.Mock).mockImplementation(() => {
      // Simulate successful import
      (mockSearchService.getRecentSearches as jest.Mock).mockReturnValue([
        ...mockSearches,
        {
          query: 'imported',
          timestamp: Date.now(),
          type: 'food',
        },
      ]);
    });

    render(<RecentSearches onSelect={mockOnSelect} onClear={mockOnClear} />);

    await waitFor(() => {
      const importInput = screen.getByLabelText('Import search history');
      fireEvent.change(importInput, { target: { files: [mockFile] } });
    });

    expect(mockSearchService.importRecentSearches).toHaveBeenCalledWith(JSON.stringify(mockSearches));
  });

  it('shows error message when import fails', async () => {
    const mockSearches = [
      {
        query: 'apple',
        timestamp: Date.now(),
        type: 'food',
      },
    ];

    const mockFile = new File(['invalid json'], 'search-history.json', {
      type: 'application/json',
    });

    (mockSearchService.getRecentSearches as jest.Mock).mockReturnValue(mockSearches);
    (mockSearchService.getCategories as jest.Mock).mockReturnValue([]);
    (mockSearchService.getTags as jest.Mock).mockReturnValue([]);
    (mockSearchService.importRecentSearches as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid import data');
    });

    render(<RecentSearches onSelect={mockOnSelect} onClear={mockOnClear} />);

    await waitFor(() => {
      const importInput = screen.getByLabelText('Import search history');
      fireEvent.change(importInput, { target: { files: [mockFile] } });
    });

    expect(screen.getByText('Failed to import search history')).toBeInTheDocument();
  });
}); 