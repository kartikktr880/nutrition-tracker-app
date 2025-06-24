import '../scripts/utils/dom-utils.js';
const { domUtils } = window;

describe('DOMUtils', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('should create elements with attributes', () => {
    const element = domUtils.createElement('div', {
      class: 'test-class',
      id: 'test-id',
      'data-test': 'test-value'
    });

    expect(element.tagName).toBe('DIV');
    expect(element.className).toBe('test-class');
    expect(element.id).toBe('test-id');
    expect(element.getAttribute('data-test')).toBe('test-value');
  });

  test('should create elements with children', () => {
    const child1 = document.createElement('span');
    const child2 = document.createElement('p');
    const element = domUtils.createElement('div', {}, [child1, child2]);

    expect(element.children.length).toBe(2);
    expect(element.children[0]).toBe(child1);
    expect(element.children[1]).toBe(child2);
  });

  test('should handle element creation with text content', () => {
    const element = domUtils.createElement('p', {}, 'Hello World');
    expect(element.textContent).toBe('Hello World');
  });

  test('should handle element creation with mixed content', () => {
    const span = document.createElement('span');
    const element = domUtils.createElement('div', {}, [
      'Hello ',
      span,
      ' World'
    ]);

    expect(element.childNodes.length).toBe(3);
    expect(element.childNodes[0].textContent).toBe('Hello ');
    expect(element.childNodes[1]).toBe(span);
    expect(element.childNodes[2].textContent).toBe(' World');
  });

  test('should handle element creation with event listeners', () => {
    const clickHandler = jest.fn();
    const element = domUtils.createElement('button', {
      onclick: clickHandler
    });

    element.click();
    expect(clickHandler).toHaveBeenCalledTimes(1);
  });

  test('should handle element creation with style object', () => {
    const element = domUtils.createElement('div', {
      style: {
        color: 'red',
        backgroundColor: 'blue',
        padding: '10px'
      }
    });

    expect(element.style.color).toBe('red');
    expect(element.style.backgroundColor).toBe('blue');
    expect(element.style.padding).toBe('10px');
  });

  test('should handle element creation with dataset', () => {
    const element = domUtils.createElement('div', {
      dataset: {
        test: 'value',
        anotherTest: 'another-value'
      }
    });

    expect(element.dataset.test).toBe('value');
    expect(element.dataset.anotherTest).toBe('another-value');
  });

  test('should handle element creation with aria attributes', () => {
    const element = domUtils.createElement('button', {
      'aria-label': 'Test Button',
      'aria-expanded': 'false'
    });

    expect(element.getAttribute('aria-label')).toBe('Test Button');
    expect(element.getAttribute('aria-expanded')).toBe('false');
  });

  test('should handle element creation with custom attributes', () => {
    const element = domUtils.createElement('div', {
      'custom-attr': 'value',
      'data-custom': 'data-value'
    });

    expect(element.getAttribute('custom-attr')).toBe('value');
    expect(element.getAttribute('data-custom')).toBe('data-value');
  });

  test('should handle element creation with class array', () => {
    const element = domUtils.createElement('div', {
      class: ['class1', 'class2', 'class3']
    });

    expect(element.className).toBe('class1 class2 class3');
  });
}); 