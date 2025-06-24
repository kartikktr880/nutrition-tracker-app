import '../scripts/utils/date-utils.js';
const { dateUtils } = window;

describe('DateUtils', () => {
  beforeEach(() => {
    dateUtils.state.cache.clear();
  });

  test('should format dates correctly', () => {
    const date = new Date('2024-01-01');
    expect(dateUtils.formatDate(date)).toBe('2024-01-01');
    expect(dateUtils.formatDate(date, 'MM/DD/YYYY')).toBe('01/01/2024');
    expect(dateUtils.formatDate(date, 'MMMM D, YYYY')).toBe('January 1, 2024');
  });

  test('should parse date strings', () => {
    expect(dateUtils.parseDate('2024-01-01')).toEqual(new Date('2024-01-01'));
    expect(dateUtils.parseDate('01/01/2024')).toEqual(new Date('2024-01-01'));
    expect(dateUtils.parseDate('January 1, 2024')).toEqual(new Date('2024-01-01'));
  });

  test('should handle invalid date strings', () => {
    expect(dateUtils.parseDate('invalid-date')).toBeNull();
    expect(dateUtils.parseDate('')).toBeNull();
    expect(dateUtils.parseDate(null)).toBeNull();
    expect(dateUtils.parseDate(undefined)).toBeNull();
  });

  test('should calculate date differences', () => {
    const date1 = new Date('2024-01-01');
    const date2 = new Date('2024-01-31');

    expect(dateUtils.getDateDifference(date1, date2, 'days')).toBe(30);
    expect(dateUtils.getDateDifference(date1, date2, 'weeks')).toBe(4);
    expect(dateUtils.getDateDifference(date1, date2, 'months')).toBe(1);
  });

  test('should add time to dates', () => {
    const date = new Date('2024-01-01');
    expect(dateUtils.addTime(date, 1, 'day')).toEqual(new Date('2024-01-02'));
    expect(dateUtils.addTime(date, 1, 'week')).toEqual(new Date('2024-01-08'));
    expect(dateUtils.addTime(date, 1, 'month')).toEqual(new Date('2024-02-01'));
  });

  test('should subtract time from dates', () => {
    const date = new Date('2024-01-31');
    expect(dateUtils.subtractTime(date, 1, 'day')).toEqual(new Date('2024-01-30'));
    expect(dateUtils.subtractTime(date, 1, 'week')).toEqual(new Date('2024-01-24'));
    expect(dateUtils.subtractTime(date, 1, 'month')).toEqual(new Date('2023-12-31'));
  });

  test('should get start of period', () => {
    const date = new Date('2024-01-15');
    expect(dateUtils.getStartOfPeriod(date, 'day')).toEqual(new Date('2024-01-15T00:00:00'));
    expect(dateUtils.getStartOfPeriod(date, 'week')).toEqual(new Date('2024-01-14T00:00:00'));
    expect(dateUtils.getStartOfPeriod(date, 'month')).toEqual(new Date('2024-01-01T00:00:00'));
  });

  test('should get end of period', () => {
    const date = new Date('2024-01-15');
    expect(dateUtils.getEndOfPeriod(date, 'day')).toEqual(new Date('2024-01-15T23:59:59.999'));
    expect(dateUtils.getEndOfPeriod(date, 'week')).toEqual(new Date('2024-01-20T23:59:59.999'));
    expect(dateUtils.getEndOfPeriod(date, 'month')).toEqual(new Date('2024-01-31T23:59:59.999'));
  });

  test('should check if date is between two dates', () => {
    const start = new Date('2024-01-01');
    const end = new Date('2024-01-31');
    const date = new Date('2024-01-15');

    expect(dateUtils.isDateBetween(date, start, end)).toBe(true);
    expect(dateUtils.isDateBetween(new Date('2024-02-01'), start, end)).toBe(false);
  });

  test('should get date range', () => {
    const start = new Date('2024-01-01');
    const end = new Date('2024-01-31');
    const range = dateUtils.getDateRange(start, end);

    expect(range).toHaveLength(31);
    expect(range[0]).toEqual(start);
    expect(range[30]).toEqual(end);
  });

  test('should get week days', () => {
    const date = new Date('2024-01-15');
    const weekDays = dateUtils.getWeekDays(date);

    expect(weekDays).toHaveLength(7);
    expect(weekDays[0]).toEqual(new Date('2024-01-14'));
    expect(weekDays[6]).toEqual(new Date('2024-01-20'));
  });

  test('should get month days', () => {
    const date = new Date('2024-01-15');
    const monthDays = dateUtils.getMonthDays(date);

    expect(monthDays).toHaveLength(31);
    expect(monthDays[0]).toEqual(new Date('2024-01-01'));
    expect(monthDays[30]).toEqual(new Date('2024-01-31'));
  });

  test('should check if date is today', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    expect(dateUtils.isToday(today)).toBe(true);
    expect(dateUtils.isToday(yesterday)).toBe(false);
  });

  test('should check if date is in the past', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    expect(dateUtils.isPast(yesterday)).toBe(true);
    expect(dateUtils.isPast(today)).toBe(false);
    expect(dateUtils.isPast(tomorrow)).toBe(false);
  });

  test('should check if date is in the future', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    expect(dateUtils.isFuture(tomorrow)).toBe(true);
    expect(dateUtils.isFuture(today)).toBe(false);
    expect(dateUtils.isFuture(yesterday)).toBe(false);
  });

  test('should get relative time string', () => {
    const now = new Date();
    const oneHourAgo = new Date(now);
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    expect(dateUtils.getRelativeTimeString(oneHourAgo)).toBe('1 hour ago');
    expect(dateUtils.getRelativeTimeString(oneDayAgo)).toBe('1 day ago');
  });
}); 