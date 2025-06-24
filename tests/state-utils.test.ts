import '../scripts/utils/state-utils.js';
const { stateUtils } = window;

describe('StateUtils', () => {
  beforeEach(() => {
    stateUtils.state.cache.clear();
  });

  test('should initialize state', () => {
    const initialState = {
      user: null,
      foods: [],
      meals: []
    };

    stateUtils.initializeState(initialState);
    expect(stateUtils.getState()).toEqual(initialState);
  });

  test('should update state', () => {
    const initialState = {
      user: null,
      foods: [],
      meals: []
    };

    stateUtils.initializeState(initialState);
    stateUtils.updateState({ user: { id: 1, name: 'John' } });
    expect(stateUtils.getState().user).toEqual({ id: 1, name: 'John' });
  });

  test('should handle state subscriptions', () => {
    const callback = jest.fn();
    stateUtils.subscribe(callback);
    stateUtils.updateState({ test: 'value' });
    expect(callback).toHaveBeenCalled();
  });

  test('should handle state unsubscriptions', () => {
    const callback = jest.fn();
    const unsubscribe = stateUtils.subscribe(callback);
    unsubscribe();
    stateUtils.updateState({ test: 'value' });
    expect(callback).not.toHaveBeenCalled();
  });

  test('should handle state selectors', () => {
    const initialState = {
      user: { id: 1, name: 'John' },
      foods: [{ id: 1, name: 'apple' }],
      meals: [{ id: 1, name: 'breakfast' }]
    };

    stateUtils.initializeState(initialState);
    const userSelector = state => state.user;
    const foodsSelector = state => state.foods;

    expect(stateUtils.select(userSelector)).toEqual(initialState.user);
    expect(stateUtils.select(foodsSelector)).toEqual(initialState.foods);
  });

  test('should handle state middleware', () => {
    const middleware = jest.fn((state, action) => {
      return { ...state, ...action.payload };
    });

    stateUtils.useMiddleware(middleware);
    stateUtils.updateState({ test: 'value' });
    expect(middleware).toHaveBeenCalled();
  });

  test('should handle state persistence', () => {
    const initialState = {
      user: { id: 1, name: 'John' },
      foods: [{ id: 1, name: 'apple' }],
      meals: [{ id: 1, name: 'breakfast' }]
    };

    stateUtils.initializeState(initialState);
    stateUtils.persistState();
    stateUtils.clearState();
    stateUtils.restoreState();
    expect(stateUtils.getState()).toEqual(initialState);
  });

  test('should handle state validation', () => {
    const validator = jest.fn(state => {
      return state.user !== null;
    });

    stateUtils.setValidator(validator);
    stateUtils.updateState({ user: null });
    expect(validator).toHaveBeenCalled();
  });

  test('should handle state history', () => {
    stateUtils.updateState({ step: 1 });
    stateUtils.updateState({ step: 2 });
    stateUtils.updateState({ step: 3 });

    const history = stateUtils.getStateHistory();
    expect(history).toHaveLength(3);
  });

  test('should handle state time travel', () => {
    stateUtils.updateState({ step: 1 });
    stateUtils.updateState({ step: 2 });
    stateUtils.updateState({ step: 3 });

    stateUtils.timeTravel(1);
    expect(stateUtils.getState().step).toBe(2);
  });

  test('should handle state branching', () => {
    stateUtils.updateState({ step: 1 });
    const branch = stateUtils.createBranch();
    stateUtils.updateState({ step: 2 });
    stateUtils.switchToBranch(branch);
    expect(stateUtils.getState().step).toBe(1);
  });

  test('should handle state merging', () => {
    const branch1 = stateUtils.createBranch();
    stateUtils.updateState({ a: 1 });
    const branch2 = stateUtils.createBranch();
    stateUtils.updateState({ b: 2 });

    stateUtils.mergeBranches(branch1, branch2);
    expect(stateUtils.getState()).toEqual({ a: 1, b: 2 });
  });

  test('should handle state diffing', () => {
    stateUtils.updateState({ a: 1, b: 2 });
    stateUtils.updateState({ a: 1, b: 3 });
    const diff = stateUtils.getStateDiff();
    expect(diff).toEqual({ b: 3 });
  });

  test('should handle state patching', () => {
    stateUtils.updateState({ a: 1, b: 2 });
    stateUtils.patchState({ b: 3 });
    expect(stateUtils.getState()).toEqual({ a: 1, b: 3 });
  });

  test('should handle state transactions', () => {
    stateUtils.beginTransaction();
    stateUtils.updateState({ a: 1 });
    stateUtils.updateState({ b: 2 });
    stateUtils.commitTransaction();

    const history = stateUtils.getStateHistory();
    expect(history).toHaveLength(1);
  });

  test('should handle state rollback', () => {
    stateUtils.updateState({ a: 1 });
    stateUtils.beginTransaction();
    stateUtils.updateState({ b: 2 });
    stateUtils.rollbackTransaction();
    expect(stateUtils.getState()).toEqual({ a: 1 });
  });
}); 