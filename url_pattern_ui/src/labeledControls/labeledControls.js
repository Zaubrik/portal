import { css, html, Shadow, style } from "../deps.js";

/**
 * @typedef {{
 *   kind: "input" | "select" | "textarea";
 *   label: string;
 *   id: string;
 *   attr?: Record<string, string | null>;
 *   options?: { data: string; attr?: Record<string, string | null> }[];
 *   isVisuallyHidden?: boolean;
 *   hasFirstSelectedDisabled?: boolean;
 *   listeners?: Record<string, EventListener>;
 * }} ItemObject
 * @typedef {ItemObject | ItemObject[]} Item
 * @typedef {HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement} AllInputs
 * @typedef {string|null} Attribute
 */

const readingMethods = new Set([
  "readAsBinaryString",
  "readAsDataURL",
  "readAsText",
]);

/**
 * Changes the color
 * @param {Event} event
 */
function changeSelectColor(event) {
  style({ color: "inherit" })(/**@type {HTMLSelectElement}*/ (event.target));
}

/**
 * Validates the mime type
 * @param {File} file
 * @param {string} fileType
 */
function validFileType(file, fileType) {
  return fileType
    .split(",")
    .map((s) => s.trim())
    .includes(file.type);
}

/** @extends Shadow */
export class LabeledControls extends Shadow {
  /** @type {Attribute} */
  inputFile = null;
  /** @type {Item[]} */
  items = [];

  static properties = {
    inputFile: {},
    items: { reflect: false, wait: true },
  };

  static styles = css`
    :host {
      display: block;
      box-sizing: border-box;
      color: var(--labeledControlsColor, var(--neutralVeryDark, #425466));
      --labeledControlsInputBackground: #f6f9fc;
      --labeledControlsPlaceholderColor: #8898aa;
      line-height: 25px;
      font-size: 17.5px;
    }
    *,
    *::before,
    *::after {
      box-sizing: inherit;
    }

    .group {
      display: flex;
      flex-direction: column;
    }
    .group ~ .group {
      margin-top: 2px;
    }
    .group:not(:last-of-type) {
      margin-bottom: 2px;
    }

    @media (max-width: 640px) {
      .group:first-of-type label {
        padding-top: 0;
      }
    }

    .multi {
      flex-direction: row;
      flex-wrap: wrap;
    }
    .multi label {
      width: 100%;
    }

    .multi input {
      max-width: 48.5%;
    }
    .multi input:last-of-type {
      margin-left: 3%;
    }

    .colorInherit {
      color: inherit !important;
    }

    label {
      display: block;
      padding-top: 8px;
      color: var(--labeledControlsLabelColor, inherit);
      font-size: var(--labeledControlsFontSize, 14px);
      font-weight: var(--labeledControlsLabelFontWeight, 500);
      text-align: start;
    }

    input,
    textarea,
    select {
      display: block;
      font: inherit;
      font-size: var(--labeledControlsFontSize, inherit);
      font-weight: var(--labeledControlsInputFontWeight, 400);
      color: var(--labeledControlsInputColor, inherit);
      padding: var(--labeledControlsInputPadding, 5px 20px 8px 13px);
      outline: none;
      box-shadow: var(--labeledControlsInputBoxShadow, none);
      border: none;
      border-radius: 6px;
      margin-left: auto;
      margin-right: 0;
      width: var(--labeledControlsInputWidthS, 100%);
      max-width: var(--labeledControlsInputMaxWidthS, 100%);
      height: var(--labeledControlsInputHeightS, auto);
      transition: background-color 0.1s ease-in, color 0.1s ease-in;
      background: var(--labeledControlsInputBackground);
      /** remove the blue background button on click  */
      -webkit-tap-highlight-color: transparent;
    }

    input:focus-visible,
    textarea:focus-visible,
    select:focus-visible {
      box-shadow: var(
        --labeledControlsFocusVisibleBoxShadow,
        0 0 0 1px #e4effa
      );
      background: var(--labeledControlsFocusVisibleBackground, transparent);
    }
    input:focus-visible,
    textarea:focus-visible {
      color: var(
        --labeledControlsFocusVisibleColor,
        var(--labeledControlsPlaceholderColor)
      );
    }

    input {
      accent-color: var(--labeledControlsInputAccentColor, var(--accentColor));
    }

    textarea {
      min-height: 90px;
    }

    option {
      padding: 0;
      margin: 0;
      width: 100%;
    }

    select {
      appearance: none;
      -webkit-appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23424770' fill-rule='evenodd' d='M573.888889,46.3409091 C573.444444,45.8863636 572.777778,45.8863636 572.333333,46.3409091 C571.888889,46.7954545 571.888889,47.4772727 572.333333,47.9318182 L575.333333,51 L572.333333,54.0681818 C571.888889,54.5227273 571.888889,55.2045455 572.333333,55.6590909 C572.555556,55.8863636 572.888889,56 573.111111,56 C573.444444,56 573.666667,55.8863636 573.888889,55.6590909 L577.666667,51.7954545 C578.111111,51.3409091 578.111111,50.6590909 577.666667,50.2045455 L573.888889,46.3409091 Z' transform='rotate(90 314 -258)'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-size: 10px 6px;
      background-position-x: calc(100% - 22px);
      background-position-y: 16px;
      color: var(--selectFirstColor, var(--labeledControlsPlaceholderColor));
    }

    input::placeholder,
    textarea::placeholder {
      color: var(--labeledControlsPlaceholderColor);
      /** https://stackoverflow.com/questions/19621306/css-placeholder-text-color-on-firefox */
      opacity: 1;
    }

    .group *:disabled {
      cursor: not-allowed;
    }

    input[type="button"] {
      cursor: pointer;
    }

    input[type="checkbox"] {
      width: 26px;
      height: 24px;
      cursor: pointer;
    }

    input[type="date"] {
      color: var(--labeledControlsPlaceholderColor);
    }

    input::-webkit-calendar-picker-indicator {
      background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="15" viewBox="0 0 24 24"><path fill="%23424770" d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/></svg>');
    }

    input[type="color"] {
      cursor: pointer;
    }
    input::-webkit-color-swatch-wrapper {
      padding: 0;
    }
    input::-webkit-color-swatch {
      border: none;
      box-shadow: 0px 0px 0px 1px #adbdcc;
      border-radius: 6px;
    }
    input::-moz-color-swatch {
      border: none;
      box-shadow: 0px 0px 0px 1px #adbdcc;
      border-radius: 6px;
    }

    input[type="file"] {
      cursor: pointer;
    }

    input::file-selector-button {
      display: none;
    }

    .visuallyHidden {
      border: 0;
      clip: rect(0 0 0 0);
      height: 1px;
      margin: -1px;
      overflow: hidden;
      padding: 0;
      position: absolute;
      width: 1px;
    }

    @media (min-width: 640px) {
      .group {
        flex-direction: row;
      }
      .group ~ .group {
        margin-top: 8px;
      }
      .multi {
        flex-wrap: nowrap;
      }
      .multi label {
        width: auto;
      }
      .multi input,
      .multi select {
        max-width: 33.8%;
      }
      .multi input:last-of-type,
      .multi select:last-of-type {
        margin-left: 1.4%;
      }
      label {
        margin-right: 16px;
        padding: var(--labeledControlsLabelPadding, 5px 0 8px);
        font-size: inherit;
      }
      input,
      textarea,
      select {
        max-width: var(--labeledControlsInputMaxWidthM, 69%);
        width: var(--labeledControlsInputWidthM, 100%);
      }
      textarea {
        min-height: 140px;
      }
    }
  `;

  /**
   * Creates constrols with labels
   * @param {ItemObject} obj
   */
  createLabeledControls({
    kind,
    id,
    label,
    attr = {},
    options = [],
    isVisuallyHidden,
    hasFirstSelectedDisabled,
  }) {
    return kind === "input"
      ? html` <label
            for="${id}"
            class="inputLabel${isVisuallyHidden ? " visuallyHidden" : ""}"
            part="label ${id + "Label"}"
            >${label}</label
          >
          <input
            id="${id}"
            @class="control"
            name="${id}"
            ...${attr}
            part="input ${id}"
          />`
      : kind === "textarea"
      ? html`<label
            for="${id}"
            class="textareaLabel${isVisuallyHidden ? " visuallyHidden" : ""}"
            part="label ${id + "Label"}"
            >${label}</label
          >
          <textarea
            id="${id}"
            name="${id}"
            @class="control"
            ...${attr}
            part="textarea ${id}"
          />`
      : kind === "select"
      ? html`<label
            for="${id}"
            class="selectLabel${isVisuallyHidden ? " visuallyHidden" : ""}"
            part="label ${id + "Label"}"
            >${label}</label
          >
          <select
            id="${id}"
            @class="control"
            name="${id}"
            ...${attr}
            part="select ${id}"
            change="${changeSelectColor}"
          >
            ${
        options.map(({ data, attr = {} }, i) =>
          hasFirstSelectedDisabled
            ? i === 0
              ? html`<option
                      ...${{
                selected: "",
                disabled: "",
                ...attr,
              }}
                      part="option"
                    >
                      ${data}
                    </option>`
              : html`<option ...${attr} part="option">${data}</option>`
            : html`<option ...${attr} part="option">${data}</option>`
        )
      }
          </select>`
      : "";
  }

  render() {
    return this.items.map((itemOrArray) =>
      Array.isArray(itemOrArray)
        ? html`<div class="group multi" part="group">
            ${itemOrArray.map(this.createLabeledControls)}
          </div>`
        : html`<div class="group" part="group">
            ${this.createLabeledControls(itemOrArray)}
          </div>`
    );
  }

  updated() {
    this.root
      .querySelectorAll('input[type="date"]')
      .forEach((el) => el.addEventListener("change", changeSelectColor));
    this.root
      .querySelectorAll('input[type="file"]')
      .forEach((el) =>
        el.addEventListener(
          "change",
          (event) => this.handleFileSelection(event),
        )
      );
    /**@type {AllInputs[]}*/ (this.dom.class["control"]).forEach(
      (control, i) => {
        const flattedItems = this.items.flat(1);
        const itemListeners = flattedItems[i].listeners;
        if (itemListeners) {
          Object.entries(itemListeners).forEach(([ev, listener]) => {
            control.addEventListener(ev, listener);
          });
        }
      },
    );
  }

  /**
   * Handels file selection
   * @param {Event} event
   * @returns {void}
   */
  handleFileSelection(event) {
    const inputElement = /**@type {HTMLInputElement}*/ (event.currentTarget);
    const files = inputElement.files;
    if (!files || !files?.length) throw Error("No file!");
    const file = /**@type {File}*/ (files.item(0));
    const fileType = inputElement.getAttribute("file-type");
    const readingMethod = inputElement.getAttribute("reading-method");
    const reader = new FileReader();
    if (typeof fileType === "string" && !validFileType(file, fileType)) {
      inputElement.setCustomValidity(`Must be ${fileType}`);
    } else {
      inputElement.setCustomValidity("");
    }
    if (typeof readingMethod === "string") {
      if (!readingMethods.has(readingMethod)) {
        throw new Error("Invalid readingMethod.");
      }
      /**@type {any}*/ (reader)[readingMethod](file);
    } else {
      reader.readAsDataURL(file);
    }
    reader.addEventListener(
      "load",
      (event) => this.inputFile = /**@type {string}*/ (reader.result),
    );
  }

  getInput() {
    return Object.fromEntries(
      /**@type {AllInputs[]}*/ (this.dom.class["control"]).map((el) => [
        el.id,
        el.getAttribute("type") === "image"
          ? el.getAttribute("src") || ""
          : el.getAttribute("type") === "file"
          ? this.inputFile || ""
          : el.value.trim(),
      ]),
    );
  }

  getFormData() {
    const form = document.createElement("form");
    /**@type {AllInputs[]}*/ (this.dom.class["control"]).forEach((c) => {
      form.append(c.cloneNode(true));
    });
    return new FormData(form);
  }

  reportValidity() {
    return /**@type {AllInputs[]}*/ (this.dom.class["control"]).every((el) =>
      el.reportValidity()
    );
  }

  reset() {
    const inputsAndTextareas =
      /**@type {AllInputs[]}*/ (this.dom.class["control"]);
    const selects = /**@type {HTMLSelectElement[]}*/ ([
      ...this.root.querySelectorAll("select"),
    ]);
    inputsAndTextareas.forEach((el) => (el.value = ""));
    selects.forEach((el) => (el.selectedIndex = 0));
  }
}

window.customElements.define("labeled-controls", LabeledControls);
