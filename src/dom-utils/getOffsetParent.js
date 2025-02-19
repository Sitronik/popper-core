// @flow
import getWindow from './getWindow';
import getNodeName from './getNodeName';
import getComputedStyle from './getComputedStyle';
import { isHTMLElement } from './instanceOf';
import isTableElement from './isTableElement';
import getParentNode from './getParentNode';

function getTrueOffsetParent(element: Element): ?Element {
  if (
    !isHTMLElement(element) ||
    // https://github.com/popperjs/popper-core/issues/837
    getComputedStyle(element).position === 'fixed'
  ) {
    return null;
  }

  return element.offsetParent;
}

// `.offsetParent` reports `null` for fixed elements, while absolute elements
// return the containing block
function getContainingBlock(element: Element) {
  const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') !== -1;
  const isIE = navigator.userAgent.indexOf('Trident') !== -1;

  if (isIE && isHTMLElement(element)) {
    // In IE 9, 10 and 11 fixed elements containing block is always established by the viewport
    const elementCss = getComputedStyle(element);
    if (elementCss.position === 'fixed') {
      return null;
    }
  }

  let currentNode = getParentNode(element);

  while (
    isHTMLElement(currentNode) &&
    ['html', 'body'].indexOf(getNodeName(currentNode)) < 0
  ) {
    const css = getComputedStyle(currentNode);

    // This is non-exhaustive but covers the most common CSS properties that
    // create a containing block.
    // https://developer.mozilla.org/en-US/docs/Web/CSS/Containing_block#identifying_the_containing_block
    if (
      css.transform !== 'none' ||
      css.perspective !== 'none' ||
      css.contain === 'paint' ||
      ['transform', 'perspective'].indexOf(css.willChange) !== -1 ||
      (isFirefox && css.willChange === 'filter') ||
      (isFirefox && css.filter && css.filter !== 'none')
    ) {
      return currentNode;
    } else {
      currentNode = currentNode.parentNode;
    }
  }

  return null;
}

// Gets the closest ancestor positioned element. Handles some edge cases,
// such as table ancestors and cross browser bugs.
export default function getOffsetParent(element: Element) {
  const window = getWindow(element);

  let offsetParent = getTrueOffsetParent(element);

  // fix issue https://github.com/popperjs/popper-core/issues/1279
  if (offsetParent && (offsetParent.tagName === 'ION-CONTENT' || offsetParent.tagName === 'MAIN')) {
    const pages = document.getElementsByClassName('ion-page');
    if (pages.length) {
      const elByZIndexes = {};
      for (const el of pages) {
        const styles = window.getComputedStyle(el);
        elByZIndexes[styles['z-index']] = el.querySelector('ion-content');
      }

      const maxZIndex = Math.max(...Object.keys(elByZIndexes));
      const shadowRoot = elByZIndexes[maxZIndex].shadowRoot;
      if (shadowRoot) {
        offsetParent = shadowRoot.querySelector('main');
      }
    }
  }

  while (
    offsetParent &&
    isTableElement(offsetParent) &&
    getComputedStyle(offsetParent).position === 'static'
  ) {
    offsetParent = getTrueOffsetParent(offsetParent);
  }

  if (
    offsetParent &&
    (getNodeName(offsetParent) === 'html' ||
      (getNodeName(offsetParent) === 'body' &&
        getComputedStyle(offsetParent).position === 'static'))
  ) {
    return window;
  }

  return offsetParent || getContainingBlock(element) || window;
}
