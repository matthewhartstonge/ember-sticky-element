import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { htmlSafe } from '@ember/string';
import { debounce } from '@ember/runloop';

function elementPosition(element, offsetTop, offsetBottom) {
  let top = element.getBoundingClientRect().top;
  if (top - offsetTop <= 0) {
    return 'top';
  }
  if (top + element.offsetHeight + offsetBottom <= window.innerHeight) {
    return 'in';
  }
  return 'bottom';
}

export default class StickyElementComponent extends Component {
  /**
   * The classes to set on the sticky-element-container. Prepends passed in
   * classes to the containing element.
   *
   * @property class
   * @type {string}
   * @default 'sticky-element-container'
   * @public
   */
  get class() {
    const className = 'sticky-element-container';
    if (this.args.class != null) {
      return `${this.args.class} ${className}`;
    }
    return className;
  }

  /**
   * The offset from the top of the viewport when to start sticking to the top
   *
   * @property top
   * @type {number}
   * @default 0
   * @public
   */
  get top() {
    return this.args.top || 0;
  }

  /**
   * The offset from the parents bottom edge when to start sticking to the bottom of the parent
   * When `null` (default) sticking to the bottom is disabled. Use 0 or any other appropriate offset to enable it.
   *
   * @property bottom
   * @type {number|null}
   * @public
   */
  get bottom() {
    if (this.args.bottom == null) {
      return 0;
    }
    return this.args.bottom;
  }

  /**
   * Set to false to disable sticky behavior
   *
   * @property enabled
   * @type {boolean}
   * @default true
   * @public
   */
  get enabled() {
    if (this.args.enabled == null) {
      return true;
    }
    return this.args.enabled;
  }

  /**
   * The class name set on the element container.
   *
   * @property containerClassName
   * @type {string|null}
   * @default 'sticky-element'
   * @public
   */
  get containerClassName() {
    return this.args.containerClassName || 'sticky-element';
  }

  /**
   * The class name set on the element container when it is stuck.
   *
   * @property containerStickyClassName
   * @type {string|null}
   * @default 'sticky-element--sticky'
   * @public
   */
  get containerStickyClassName() {
    return this.args.containerStickyClassName || 'sticky-element--sticky';
  }

  /**
   * The class name set on the element container when it is stuck to top.
   *
   * @property containerStickyTopClassName
   * @type {string|null}
   * @default 'sticky-element--sticky-top'
   * @public
   */
  get containerStickyTopClassName() {
    return (
      this.args.containerStickyTopClassName || 'sticky-element--sticky-top'
    );
  }

  /**
   * The class name set on the element container when it is stuck to bottom.
   *
   * @property containerStickyBottomClassName
   * @type {string|null}
   * @default 'sticky-element--sticky-bottom'
   * @public
   */
  get containerStickyBottomClassName() {
    return (
      this.args.containerStickyBottomClassName ||
      'sticky-element--sticky-bottom'
    );
  }

  // Computed properties
  /**
   * @property isSticky
   * @type {boolean}
   * @readOnly
   * @private
   */
  get isSticky() {
    return this.isStickyTop || this.isStickyBottom;
  }

  /**
   * @property isStickyTop
   * @type {boolean}
   * @readOnly
   * @private
   */
  get isStickyTop() {
    return this.enabled && this.parentTop === 'top' && !this.isStickyBottom;
  }

  /**
   * @property isStickyBottom
   * @type {boolean}
   * @readOnly
   * @private
   */
  get isStickyBottom() {
    return this.enabled && this.parentBottom !== 'bottom' && this.stickToBottom;
  }

  // Tracked properties
  /**
   * @property parentTop
   * @type {string}
   * @private
   */
  @tracked parentTop = 'bottom';

  /**
   * @property parentBottom
   * @type {string}
   * @private
   */
  @tracked parentBottom = 'bottom';

  /**
   * @property ownHeight
   * @type {number}
   * @private
   */
  @tracked ownHeight = 0;

  /**
   * @property ownWidth
   * @type {number}
   * @private
   */
  @tracked ownWidth = 0;

  /**
   * @property windowHeight
   * @type {number}
   * @private
   */
  @tracked windowHeight = 0;

  /**
   * used to track the height and width of the sticky container element.
   *
   * @property elementRef
   * @type {HTMLElement}
   * @private
   */
  @tracked elementRef = null;

  // Private properties
  /**
   * @property topTriggerElement
   * @type {HTMLElement}
   * @private
   */
  @tracked topTriggerElement = null;

  /**
   * @property bottomTriggerElement
   * @type {HTMLElement}
   * @private
   */
  @tracked bottomTriggerElement = null;

  /**
   * _eventListener is used to recompute bounding box dimensions and element position on scroll or window resize.
   *
   * @property _eventListener
   * @private
   */
  @tracked _eventListener = null;

  /**
   * @property stickToBottom
   * @type {boolean}
   * @readOnly
   * @private
   */
  get stickToBottom() {
    return this.args.bottom != null;
  }

  get offsetBottom() {
    return this.windowHeight - this.top - this.ownHeight - this.bottom;
  }

  /**
   * Dynamic style for the components element
   *
   * @property style
   * @type {string|null}
   * @private
   */
  get style() {
    if (this.ownHeight > 0 && this.isSticky) {
      return htmlSafe(`height: ${this.ownHeight}px;`);
    }
    return null;
  }

  /**
   * Dynamic style for the sticky container (`position: fixed`)
   *
   * @property containerStyle
   * @type {string|null}
   * @private
   */
  get containerStyle() {
    if (this.isStickyBottom) {
      return htmlSafe(
        `position: absolute; bottom: ${this.bottom}px; width: ${this.ownWidth}px`
      );
    }
    if (this.isStickyTop) {
      return htmlSafe(
        `position: fixed; top: ${this.top}px; width: ${this.ownWidth}px`
      );
    }
    return null;
  }

  /**
   * Adds listeners to update sticky element width on resize events.
   *
   * @method initResizeEventListener
   * @private
   */
  initResizeEventListener() {
    this._eventListener = () => debounce(this, this.debounceEventListener, 16);
    window.addEventListener('resize', this._eventListener, false);
    window.addEventListener('scroll', this._eventListener, false);
  }

  debounceEventListener() {
    this.updateDimension();
    this.updatePosition();
  }

  /**
   * @method removeEventListeners
   * @private
   */
  removeResizeEventListener() {
    window.removeEventListener('resize', this._eventListener, false);
    window.removeEventListener('scroll', this._eventListener, false);
  }

  /**
   * @method updateDimension
   * @private
   */
  updateDimension() {
    if (this.isDestroyed || this.isDestroying) {
      return false;
    }
    this.windowHeight = window.innerHeight;
    this.ownHeight = this.elementRef ? this.elementRef.offsetHeight : 0;
    this.ownWidth = this.elementRef ? this.elementRef.offsetWidth : 0;
  }

  /**
   * @method updatePosition
   * @private
   */
  updatePosition() {
    if (this.topTriggerElement) {
      this.parentTop = elementPosition(this.topTriggerElement, this.top, 0);
    }
    if (this.bottomTriggerElement) {
      this.parentBottom = elementPosition(
        this.bottomTriggerElement,
        0,
        this.offsetBottom
      );
    }
  }

  willDestroy() {
    super.willDestroy();
    this.removeResizeEventListener();
  }

  @action
  setupElement(element) {
    this.elementRef = element;
    this.updateDimension();
    this.updatePosition();
    this.initResizeEventListener();
  }

  @action
  parentTopEntered() {
    // console.log('parentTopEntered');
    this.parentTop = 'in';
  }

  @action
  parentTopExited() {
    // make sure we captured the right dimensions before getting sticky!
    // console.log('parentTopExited');
    this.updateDimension();
    this.updatePosition();
  }

  @action
  parentBottomEntered() {
    // console.log('parentBottomEntered');
    this.parentBottom = 'in';
    this.updatePosition();
  }

  @action
  parentBottomExited() {
    // console.log('parentBottomExited');
    this.updateDimension();
    this.updatePosition();
  }

  @action
  registerTopTrigger(element) {
    this.topTriggerElement = element;
    this.updatePosition();
  }

  @action
  registerBottomTrigger(element) {
    this.bottomTriggerElement = element;
    this.updatePosition();
  }
}
