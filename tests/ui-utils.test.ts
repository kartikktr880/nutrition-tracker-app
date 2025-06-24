import '../scripts/utils/ui-utils.js';
const { uiUtils } = window;

describe('UIUtils', () => {
  beforeEach(() => {
    uiUtils.state.cache.clear();
    document.body.innerHTML = '';
  });

  test('should create DOM elements', () => {
    const element = uiUtils.createElement('div', {
      class: 'test-class',
      id: 'test-id'
    });

    expect(element.tagName).toBe('DIV');
    expect(element.className).toBe('test-class');
    expect(element.id).toBe('test-id');
  });

  test('should handle element attributes', () => {
    const element = uiUtils.createElement('div', {
      'data-test': 'value',
      'aria-label': 'Test Label'
    });

    expect(element.getAttribute('data-test')).toBe('value');
    expect(element.getAttribute('aria-label')).toBe('Test Label');
  });

  test('should handle element styles', () => {
    const element = uiUtils.createElement('div', {
      style: {
        color: 'red',
        fontSize: '16px'
      }
    });

    expect(element.style.color).toBe('red');
    expect(element.style.fontSize).toBe('16px');
  });

  test('should handle element events', () => {
    const clickHandler = jest.fn();
    const element = uiUtils.createElement('button', {
      events: {
        click: clickHandler
      }
    });

    element.click();
    expect(clickHandler).toHaveBeenCalled();
  });

  test('should handle element children', () => {
    const parent = uiUtils.createElement('div', {
      children: [
        uiUtils.createElement('span', { text: 'Child 1' }),
        uiUtils.createElement('span', { text: 'Child 2' })
      ]
    });

    expect(parent.children.length).toBe(2);
    expect(parent.children[0].textContent).toBe('Child 1');
    expect(parent.children[1].textContent).toBe('Child 2');
  });

  test('should handle element text content', () => {
    const element = uiUtils.createElement('div', {
      text: 'Test Text'
    });

    expect(element.textContent).toBe('Test Text');
  });

  test('should handle element class toggling', () => {
    const element = uiUtils.createElement('div', {
      class: 'test-class'
    });

    uiUtils.toggleClass(element, 'test-class');
    expect(element.classList.contains('test-class')).toBe(false);

    uiUtils.toggleClass(element, 'test-class');
    expect(element.classList.contains('test-class')).toBe(true);
  });

  test('should handle element visibility', () => {
    const element = uiUtils.createElement('div');
    uiUtils.hideElement(element);
    expect(element.style.display).toBe('none');

    uiUtils.showElement(element);
    expect(element.style.display).toBe('');
  });

  test('should handle element positioning', () => {
    const element = uiUtils.createElement('div');
    uiUtils.positionElement(element, {
      top: '10px',
      left: '20px',
      position: 'absolute'
    });

    expect(element.style.top).toBe('10px');
    expect(element.style.left).toBe('20px');
    expect(element.style.position).toBe('absolute');
  });

  test('should handle element dimensions', () => {
    const element = uiUtils.createElement('div');
    uiUtils.setElementDimensions(element, {
      width: '100px',
      height: '200px'
    });

    expect(element.style.width).toBe('100px');
    expect(element.style.height).toBe('200px');
  });

  test('should handle element animations', () => {
    const element = uiUtils.createElement('div');
    const animation = uiUtils.animateElement(element, {
      opacity: [0, 1],
      duration: 1000
    });

    expect(animation).toHaveProperty('play');
    expect(animation).toHaveProperty('pause');
    expect(animation).toHaveProperty('cancel');
  });

  test('should handle element transitions', () => {
    const element = uiUtils.createElement('div');
    uiUtils.setElementTransition(element, {
      property: 'all',
      duration: '0.3s',
      timing: 'ease-in-out'
    });

    expect(element.style.transition).toBe('all 0.3s ease-in-out');
  });

  test('should handle element focus', () => {
    const element = uiUtils.createElement('input');
    document.body.appendChild(element);
    uiUtils.focusElement(element);
    expect(document.activeElement).toBe(element);
  });

  test('should handle element scrolling', () => {
    const container = uiUtils.createElement('div', {
      style: {
        height: '100px',
        overflow: 'auto'
      }
    });

    const content = uiUtils.createElement('div', {
      style: {
        height: '200px'
      }
    });

    container.appendChild(content);
    document.body.appendChild(container);

    uiUtils.scrollToElement(content);
    expect(container.scrollTop).toBeGreaterThan(0);
  });

  test('should handle element resizing', () => {
    const element = uiUtils.createElement('div');
    const resizeHandler = jest.fn();
    uiUtils.handleElementResize(element, resizeHandler);

    // Simulate resize
    element.style.width = '200px';
    element.dispatchEvent(new Event('resize'));

    expect(resizeHandler).toHaveBeenCalled();
  });

  test('should handle element dragging', () => {
    const element = uiUtils.createElement('div');
    const dragHandler = jest.fn();
    uiUtils.makeElementDraggable(element, dragHandler);

    // Simulate drag
    element.dispatchEvent(new MouseEvent('mousedown'));
    document.dispatchEvent(new MouseEvent('mousemove'));
    document.dispatchEvent(new MouseEvent('mouseup'));

    expect(dragHandler).toHaveBeenCalled();
  });

  test('should handle element tooltips', () => {
    const element = uiUtils.createElement('div');
    uiUtils.addTooltip(element, 'Test Tooltip');

    expect(element.getAttribute('title')).toBe('Test Tooltip');
  });

  test('should handle element loading states', () => {
    const element = uiUtils.createElement('button');
    uiUtils.setLoadingState(element, true);
    expect(element.disabled).toBe(true);
    expect(element.classList.contains('loading')).toBe(true);

    uiUtils.setLoadingState(element, false);
    expect(element.disabled).toBe(false);
    expect(element.classList.contains('loading')).toBe(false);
  });
}); 