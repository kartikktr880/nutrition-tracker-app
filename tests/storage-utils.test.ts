import '../scripts/utils/storage-utils.js';
const { storageUtils } = window;

describe('StorageUtils', () => {
  beforeEach(() => {
    storageUtils.state.cache.clear();
    localStorage.clear();
    sessionStorage.clear();
  });

  test('should set and get local storage items', () => {
    const key = 'test-key';
    const value = { test: 'value' };
    storageUtils.setLocalItem(key, value);
    const result = storageUtils.getLocalItem(key);
    expect(result).toEqual(value);
  });

  test('should set and get session storage items', () => {
    const key = 'test-key';
    const value = { test: 'value' };
    storageUtils.setSessionItem(key, value);
    const result = storageUtils.getSessionItem(key);
    expect(result).toEqual(value);
  });

  test('should handle non-existent keys', () => {
    const result = storageUtils.getLocalItem('non-existent');
    expect(result).toBeNull();
  });

  test('should remove items from storage', () => {
    const key = 'test-key';
    const value = { test: 'value' };
    storageUtils.setLocalItem(key, value);
    storageUtils.removeLocalItem(key);
    const result = storageUtils.getLocalItem(key);
    expect(result).toBeNull();
  });

  test('should clear all storage', () => {
    storageUtils.setLocalItem('key1', 'value1');
    storageUtils.setSessionItem('key2', 'value2');
    storageUtils.clearAll();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  test('should handle storage errors', () => {
    const mockSetItem = jest.spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('Quota exceeded');
      });

    const result = storageUtils.setLocalItem('key', 'value');
    expect(result).toBe(false);
    mockSetItem.mockRestore();
  });

  test('should handle invalid JSON data', () => {
    const mockGetItem = jest.spyOn(Storage.prototype, 'getItem')
      .mockReturnValue('invalid-json');

    const result = storageUtils.getLocalItem('key');
    expect(result).toBeNull();
    mockGetItem.mockRestore();
  });

  test('should handle storage availability', () => {
    const mockStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      length: 0
    };

    const result = storageUtils.isStorageAvailable(mockStorage);
    expect(result).toBe(true);
  });

  test('should handle large data objects', () => {
    const key = 'test-key';
    const value = { data: 'x'.repeat(1000000) };
    const result = storageUtils.setLocalItem(key, value);
    expect(result).toBe(false);
  });

  test('should handle different data types', () => {
    const testCases = [
      { value: 'string', type: 'string' },
      { value: 123, type: 'number' },
      { value: true, type: 'boolean' },
      { value: null, type: 'null' },
      { value: undefined, type: 'undefined' },
      { value: [1, 2, 3], type: 'array' },
      { value: { a: 1, b: 2 }, type: 'object' }
    ];

    testCases.forEach(({ value, type }) => {
      const key = `test-${type}`;
      storageUtils.setLocalItem(key, value);
      const result = storageUtils.getLocalItem(key);
      expect(result).toEqual(value);
    });
  });

  test('should handle storage events', () => {
    const callback = jest.fn();
    storageUtils.onStorageChange(callback);
    storageUtils.setLocalItem('key', 'value');
    expect(callback).toHaveBeenCalled();
  });

  test('should handle storage quotas', () => {
    const quota = storageUtils.getStorageQuota();
    expect(quota).toHaveProperty('used');
    expect(quota).toHaveProperty('remaining');
  });

  test('should handle storage compression', () => {
    const key = 'test-key';
    const value = { data: 'x'.repeat(1000) };
    storageUtils.setLocalItem(key, value, { compress: true });
    const result = storageUtils.getLocalItem(key);
    expect(result).toEqual(value);
  });

  test('should handle storage encryption', () => {
    const key = 'test-key';
    const value = { sensitive: 'data' };
    storageUtils.setLocalItem(key, value, { encrypt: true });
    const result = storageUtils.getLocalItem(key);
    expect(result).toEqual(value);
  });

  test('should handle storage migration', () => {
    const oldKey = 'old-key';
    const newKey = 'new-key';
    const value = { data: 'value' };
    storageUtils.setLocalItem(oldKey, value);
    storageUtils.migrateStorage(oldKey, newKey);
    const result = storageUtils.getLocalItem(newKey);
    expect(result).toEqual(value);
  });

  test('should handle storage backup', () => {
    storageUtils.setLocalItem('key1', 'value1');
    storageUtils.setLocalItem('key2', 'value2');
    const backup = storageUtils.backupStorage();
    storageUtils.clearAll();
    storageUtils.restoreStorage(backup);
    expect(storageUtils.getLocalItem('key1')).toBe('value1');
    expect(storageUtils.getLocalItem('key2')).toBe('value2');
  });
}); 