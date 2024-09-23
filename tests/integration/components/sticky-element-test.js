import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import _scrollTo from '../../helpers/scroll-to';
import { resolve } from 'rsvp';
import { htmlSafe } from '@ember/template';

const testProps = {
  size: ['xsmall', 'small', 'large'],
  scrollPosition: [
    'top',
    'down',
    'end of parent',
    'bottom',
    'into view',
    'out of view',
    'bottom:down',
  ],
  offView: [false, true],
  stickToBottom: [false, true],
};

const testCases = [];

testProps.size.forEach((size) => {
  testProps.scrollPosition.forEach((scrollPosition) => {
    testProps.offView.forEach((offView) => {
      testProps.stickToBottom.forEach((stickToBottom) => {
        let sticky = false;

        if (
          (scrollPosition === 'bottom:down' && offView === false) ||
          (scrollPosition === 'down' && offView === false) ||
          scrollPosition === 'end of parent' ||
          scrollPosition === 'out of view' ||
          (scrollPosition === 'bottom' && stickToBottom === false) ||
          (scrollPosition === 'bottom' && offView === true)
        ) {
          sticky = 'top';
        }

        if (
          (scrollPosition === 'bottom' &&
            stickToBottom === true &&
            offView === false) ||
          (scrollPosition === 'end of parent' &&
            stickToBottom === true &&
            size === 'large') ||
          (scrollPosition === 'bottom' &&
            stickToBottom === true &&
            size === 'large' &&
            offView === true)
        ) {
          sticky = 'bottom';
        }

        testCases.push({
          size,
          scrollPosition,
          offView,
          stickToBottom,
          sticky,
        });
      });
    });
  });
});

module('Integration | Component | sticky element', function (hooks) {
  setupRenderingTest(hooks);

  function scrollTo(pos, duration = 50) {
    return pos
      .split(':')
      .reduce(
        (promise, pos) => promise.then(() => singleScrollTo(pos, duration)),
        resolve()
      );
  }

  function singleScrollTo(pos, duration) {
    let top;
    let windowHeight = window.innerHeight;
    let innerHeight = document.body.scrollHeight;

    switch (pos) {
      case 'top':
        top = 0;
        break;
      case 'down':
        top = windowHeight / 10;
        break;
      case 'end of parent':
        top =
          document.querySelector('#ember-testing-container .col').offsetTop +
          document.querySelector('#ember-testing-container .col').offsetHeight -
          windowHeight +
          10;
        break;
      case 'into view':
        top = Math.max(
          document.querySelector('#ember-testing-container .col').offsetTop -
            windowHeight +
            10,
          0
        );
        break;
      case 'out of view':
        top =
          document.querySelector('#ember-testing-container .col').offsetTop +
          10;
        break;
      case 'bottom':
        top = innerHeight - windowHeight;
        break;
      default:
        throw new Error(`Unsupported scroll position: ${pos}`);
    }

    if (duration > 0) {
      return _scrollTo(document.body, top, duration).then(settled);
    } else {
      document.querySelector('#ember-testing-container').scrollTop = top;
      return settled();
    }
  }

  function output(sticky) {
    switch (sticky) {
      case 'top':
        return 'Stuck to top';
      case 'bottom':
        return 'Stuck to bottom';
      default:
        return 'Not sticky';
    }
  }

  testCases.forEach((testCase) => {
    test(`Scrolling | Size: ${testCase.size}, offView: ${
      testCase.offView
    }, stick to bottom: ${
      testCase.stickToBottom === false ? 'false' : 'true'
    }, scroll position: ${testCase.scrollPosition}`, async function (assert) {
      this.setProperties(testCase);
      this.set('bottom', testCase.stickToBottom ? 0 : null);
      await render(hbs`
          <div class="row">
            <div class="col {{this.size}} {{if this.offView "off"}}">
              <StickyElement @class="sticky" @bottom={{this.bottom}} as |sticky|>
                <p id="debug">
                  {{sticky-debug sticky}}
                </p>
              </StickyElement>
            </div>
          </div>
        `);

      let debug = output(testCase.sticky);

      await scrollTo(
        testCase.scrollPosition,
        testCase.size === 'xsmall' ? 500 : 50
      );
      // await this.pauseTest();
      assert.dom('#debug').hasText(debug, debug);
    });

    test(`Late insert | Size: ${testCase.size}, offView: ${
      testCase.offView
    }, stick to bottom: ${
      testCase.stickToBottom === false ? 'false' : 'true'
    }, scroll position: ${testCase.scrollPosition}`, async function (assert) {
      this.setProperties(testCase);
      this.set('bottom', testCase.stickToBottom ? 0 : null);
      this.set('visible', false);
      await render(hbs`
          <div class="row">
            <div class="col {{this.size}} {{if this.offView "off"}}">
              {{#if this.visible}}
                <StickyElement @class="sticky" @bottom={{this.bottom}} as |sticky|>
                  <p id="debug">
                    {{sticky-debug sticky}}
                  </p>
                </StickyElement>
              {{/if}}
            </div>
          </div>
        `);

      let debug = output(testCase.sticky);

      await scrollTo(testCase.scrollPosition);
      this.set('visible', true);
      await settled();
      assert.dom('#debug').hasText(debug, debug);
    });
  });

  test('can be disabled', async function (assert) {
    this.setProperties({
      size: 'small',
      scrollPosition: 'down',
      offView: false,
      stickToBottom: false,
      sticky: 'top',
    });
    await render(hbs`
      <div class="row">
        <div class="col {{this.size}} {{if this.offView "off"}}">
          <StickyElement @class="sticky" @enabled={{false}}  as |sticky|>
            <p id="debug">
              {{sticky-debug sticky}}
            </p>
          </StickyElement>
        </div>
      </div>
    `);

    let debug = output(false);

    await scrollTo('down');
    assert.dom('#debug').hasText(debug, debug);
    assert.dom('.sticky').doesNotHaveAttribute('style');
  });

  test('Is resizable', async function (assert) {
    let stickyElementWidth;
    this.setProperties({
      size: 'small',
      scrollPosition: 'down',
      offView: false,
      stickToBottom: false,
      sticky: 'top',
    });
    this.set('containerWidth', htmlSafe('width:500px'));
    await render(hbs`
      <div class="row">
        <div class="col {{this.size}} {{if this.offView "off"}}" style={{this.containerWidth}}>
          <StickyElement @class="sticky" @bottom="bottom" as |sticky|>
            <p id="debug">
              {{sticky-debug sticky}}
            </p>
          </StickyElement>
        </div>
      </div>
    `);
    let debug = output('top');
    await scrollTo('down');
    assert.dom('#debug').hasText(debug, debug);
    stickyElementWidth = document.querySelector('.sticky-element').clientWidth;
    assert.strictEqual(stickyElementWidth, 500);
    this.set('containerWidth', 'width:300px');
    await settled();
    window.dispatchEvent(new Event('resize'));
    await settled();
    stickyElementWidth = document.querySelector('.sticky-element').clientWidth;
    assert.strictEqual(stickyElementWidth, 300);
    assert.dom('#debug').hasText(debug, debug);
  });
});
