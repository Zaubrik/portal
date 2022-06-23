import { css, dispatchCustomEvent, html, Shadow } from "../deps.js";

/**
 * @typedef {Record<string, string | null >} Attr
 * @typedef {string|null} Attribute
 */

/** @extends Shadow */
export class SvgButton extends Shadow {
  /**@type {Attr}*/
  attr = {};
  /**@type {Attribute}*/
  src = null;
  /**@type {Attribute}*/
  clickEvent = null;
  constructor() {
    super({ mode: "open", delegatesFocus: true });
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        this.root.querySelector("div")?.click();
        event.preventDefault();
      }
    });
    if (this.clickEvent) this.addEventListener("click", this.dispatch);
  }

  disconnectedCallback() {
    if (this.clickEvent) this.removeEventListener("click", this.dispatch);
  }

  dispatch() {
    dispatchCustomEvent(/**@type {string}*/ (this.clickEvent), this);
  }

  static properties = {
    attr: {},
    src: {},
    clickEvent: {},
  };

  static observedAttributes = ["src", "click-event"];

  static styles = css`
    :host {
      display: block;
      box-sizing: border-box;
      cursor: pointer;
      outline: none;
      border-radius: 4px;
      transition: 150ms cubic-bezier(0.215, 0.61, 0.355, 1);
      transition-property: all;
    }

    *,
    *::before,
    *::after {
      box-sizing: inherit;
    }

    :host(:focus-visible) {
      box-shadow: var(--focusBoxShadow);
    }

    div {
      outline: none;
    }

    img,
    ::slotted(svg) {
      display: block;
      margin: auto;
      width: var(--svgButtonWidth, 24px);
      height: var(--svgButtonHeight, 24px);
      filter: var(--svgButtonFilter);
      transition: 150ms cubic-bezier(0.215, 0.61, 0.355, 1);
      transition-property: all;
    }
  `;

  render() {
    return this.innerHTML
      ? html`<div tabindex="0" aria-label="Click"><slot></slot></div>`
      : html`<div tabindex="0" aria-label="Click">
        ${
        this.src
          ? html`<img part="img" src="${this.src}" ...${this.attr}/>`
          : html`<img part="img" ...${this.attr}/>`
      } 
        </div>`;
  }
}

window.customElements.define("svg-button", SvgButton);
