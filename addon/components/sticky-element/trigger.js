import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class TriggerComponent extends Component {
  @service inViewport;

  /**
   * @property type
   * @type {string}
   * @default 'top'
   * @public
   */
  get type() {
    return this.args.type || 'top';
  }

  /**
   * @property offset
   * @type {number}
   * @public
   */
  get offset() {
    return this.args.offset || 0;
  }

  /**
   * @property typeClass
   * @type string
   * @private
   */
  get typeClass() {
    return `sticky-element__trigger--${this.type}`;
  }

  /**
   * used to track the sentinel.
   *
   * @property elementRef
   * @type {Element}
   * @private
   */
  @tracked elementRef;

  get viewportConfig() {
    return {
      viewportTolerance: {
        top: this.type === 'top' ? -this.offset : 0,
        bottom: this.type === 'bottom' ? -this.offset : 0,
        left: 0,
        right: 0,
      },
    };
  }

  /**
   * Action when trigger enters viewport
   *
   * @event enter
   * @public
   */

  /**
   * Action when trigger exits viewport
   *
   * @event exit
   * @param {Boolean} top True if element left the viewport from the top
   * @public
   */

  didEnterViewport() {
    this.args.enter();
  }

  didExitViewport() {
    this.args.exit();
  }

  /**
   * Action when trigger exits viewport
   *
   * @event did-insert
   * @param {Element} element The element to use as a sentinel tracker
   * @public
   */
  @action
  setupInViewport(element) {
    this.elementRef = element;

    this.inViewport.viewportEnabled = true;
    this.inViewport.viewportSpy = true;
    this.inViewport.viewportRefreshRate = 16;

    this.args.registerElement(element);
    this.inViewport.watchElement(
      element,
      this.viewportConfig,
      this.didEnterViewport.bind(this),
      this.didExitViewport.bind(this)
    );
  }

  willDestroy() {
    super.willDestroy(...arguments);
    if (this.elementRef) {
      this.inViewport.stopWatching(this.elementRef);
    }
  }
}
