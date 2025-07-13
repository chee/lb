import {
  insert
} from "./chunk-S4YDXN25.js";
import {
  createRoot,
  createSignal
} from "./chunk-OCATCWWH.js";
import "./chunk-BUSYA2B4.js";

// node_modules/.deno/component-register@0.8.7/node_modules/component-register/dist/component-register.js
function cloneProps(props) {
  const propKeys = Object.keys(props);
  return propKeys.reduce((memo, k) => {
    const prop = props[k];
    memo[k] = Object.assign({}, prop);
    if (isObject(prop.value) && !isFunction(prop.value) && !Array.isArray(prop.value)) memo[k].value = Object.assign({}, prop.value);
    if (Array.isArray(prop.value)) memo[k].value = prop.value.slice(0);
    return memo;
  }, {});
}
function normalizePropDefs(props) {
  if (!props) return {};
  const propKeys = Object.keys(props);
  return propKeys.reduce((memo, k) => {
    const v = props[k];
    memo[k] = !(isObject(v) && "value" in v) ? {
      value: v
    } : v;
    memo[k].attribute || (memo[k].attribute = toAttribute(k));
    memo[k].parse = "parse" in memo[k] ? memo[k].parse : typeof memo[k].value !== "string";
    return memo;
  }, {});
}
function propValues(props) {
  const propKeys = Object.keys(props);
  return propKeys.reduce((memo, k) => {
    memo[k] = props[k].value;
    return memo;
  }, {});
}
function initializeProps(element, propDefinition) {
  const props = cloneProps(propDefinition), propKeys = Object.keys(propDefinition);
  propKeys.forEach((key) => {
    const prop = props[key], attr = element.getAttribute(prop.attribute), value = element[key];
    if (attr != null) prop.value = prop.parse ? parseAttributeValue(attr) : attr;
    if (value != null) prop.value = Array.isArray(value) ? value.slice(0) : value;
    prop.reflect && reflect(element, prop.attribute, prop.value, !!prop.parse);
    Object.defineProperty(element, key, {
      get() {
        return prop.value;
      },
      set(val) {
        const oldValue = prop.value;
        prop.value = val;
        prop.reflect && reflect(this, prop.attribute, prop.value, !!prop.parse);
        for (let i = 0, l = this.__propertyChangedCallbacks.length; i < l; i++) {
          this.__propertyChangedCallbacks[i](key, val, oldValue);
        }
      },
      enumerable: true,
      configurable: true
    });
  });
  return props;
}
function parseAttributeValue(value) {
  if (!value) return;
  try {
    return JSON.parse(value);
  } catch (err) {
    return value;
  }
}
function reflect(node, attribute, value, parse) {
  if (value == null || value === false) return node.removeAttribute(attribute);
  let reflect2 = parse ? JSON.stringify(value) : value;
  node.__updating[attribute] = true;
  if (reflect2 === "true") reflect2 = "";
  node.setAttribute(attribute, reflect2);
  Promise.resolve().then(() => delete node.__updating[attribute]);
}
function toAttribute(propName) {
  return propName.replace(/\.?([A-Z]+)/g, (x, y) => "-" + y.toLowerCase()).replace("_", "-").replace(/^-/, "");
}
function isObject(obj) {
  return obj != null && (typeof obj === "object" || typeof obj === "function");
}
function isFunction(val) {
  return Object.prototype.toString.call(val) === "[object Function]";
}
function isConstructor(f) {
  return typeof f === "function" && f.toString().indexOf("class") === 0;
}
function reloadElement(node) {
  let callback = null;
  while (callback = node.__releaseCallbacks.pop()) callback(node);
  delete node.__initialized;
  node.renderRoot.textContent = "";
  node.connectedCallback();
}
var currentElement;
function getCurrentElement() {
  return currentElement;
}
function noShadowDOM() {
  Object.defineProperty(currentElement, "renderRoot", {
    value: currentElement
  });
}
function createElementType(BaseElement, propDefinition) {
  const propKeys = Object.keys(propDefinition);
  return class CustomElement extends BaseElement {
    static get observedAttributes() {
      return propKeys.map((k) => propDefinition[k].attribute);
    }
    constructor() {
      super();
      this.__initialized = false;
      this.__released = false;
      this.__releaseCallbacks = [];
      this.__propertyChangedCallbacks = [];
      this.__updating = {};
      this.props = {};
    }
    connectedCallback() {
      if (this.__initialized) return;
      this.__releaseCallbacks = [];
      this.__propertyChangedCallbacks = [];
      this.__updating = {};
      this.props = initializeProps(this, propDefinition);
      const props = propValues(this.props), ComponentType = this.Component, outerElement = currentElement;
      try {
        currentElement = this;
        this.__initialized = true;
        if (isConstructor(ComponentType)) new ComponentType(props, {
          element: this
        });
        else ComponentType(props, {
          element: this
        });
      } finally {
        currentElement = outerElement;
      }
    }
    async disconnectedCallback() {
      await Promise.resolve();
      if (this.isConnected) return;
      this.__propertyChangedCallbacks.length = 0;
      let callback = null;
      while (callback = this.__releaseCallbacks.pop()) callback(this);
      delete this.__initialized;
      this.__released = true;
    }
    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.__initialized) return;
      if (this.__updating[name]) return;
      name = this.lookupProp(name);
      if (name in propDefinition) {
        if (newVal == null && !this[name]) return;
        this[name] = propDefinition[name].parse ? parseAttributeValue(newVal) : newVal;
      }
    }
    lookupProp(attrName) {
      if (!propDefinition) return;
      return propKeys.find((k) => attrName === k || attrName === propDefinition[k].attribute);
    }
    get renderRoot() {
      return this.shadowRoot || this.attachShadow({
        mode: "open"
      });
    }
    addReleaseCallback(fn) {
      this.__releaseCallbacks.push(fn);
    }
    addPropertyChangedCallback(fn) {
      this.__propertyChangedCallbacks.push(fn);
    }
  };
}
var EC = Symbol("element-context");
function walk(root, call) {
  call(root);
  if (root.shadowRoot) walk(root.shadowRoot, call);
  let child = root.firstChild;
  while (child) {
    child.nodeType === 1 && walk(child, call);
    child = child.nextSibling;
  }
}
function hot(module, tagName) {
  if (module.hot) {
    let update = function(possibleError) {
      if (possibleError && possibleError instanceof Error) {
        console.error(possibleError);
        return;
      }
      walk(document.body, (node) => node.localName === tagName && setTimeout(() => reloadElement(node), 0));
    };
    module.hot.accept(update);
    if (module.hot.status && module.hot.status() === "apply") {
      update();
    }
  }
}
function register(tag, props = {}, options = {}) {
  const {
    BaseElement = HTMLElement,
    extension,
    customElements = window.customElements
  } = options;
  return (ComponentType) => {
    if (!tag) throw new Error("tag is required to register a Component");
    let ElementType = customElements.get(tag);
    if (ElementType) {
      ElementType.prototype.Component = ComponentType;
      return ElementType;
    }
    ElementType = createElementType(BaseElement, normalizePropDefs(props));
    ElementType.prototype.Component = ComponentType;
    ElementType.prototype.registeredTag = tag;
    customElements.define(tag, ElementType, extension);
    return ElementType;
  };
}

// node_modules/.deno/solid-element@1.9.1/node_modules/solid-element/dist/index.js
function createProps(raw) {
  const keys = Object.keys(raw);
  const props = {};
  for (let i = 0; i < keys.length; i++) {
    const [get, set] = createSignal(raw[keys[i]]);
    Object.defineProperty(props, keys[i], {
      get,
      set(v) {
        set(() => v);
      }
    });
  }
  return props;
}
function lookupContext(el) {
  if (el.assignedSlot && el.assignedSlot._$owner) return el.assignedSlot._$owner;
  let next = el.parentNode;
  while (next && !next._$owner && !(next.assignedSlot && next.assignedSlot._$owner))
    next = next.parentNode;
  return next && next.assignedSlot ? next.assignedSlot._$owner : el._$owner;
}
function withSolid(ComponentType) {
  return (rawProps, options) => {
    const { element } = options;
    return createRoot((dispose) => {
      const props = createProps(rawProps);
      element.addPropertyChangedCallback((key, val) => props[key] = val);
      element.addReleaseCallback(() => {
        element.renderRoot.textContent = "";
        dispose();
      });
      const comp = ComponentType(props, options);
      return insert(element.renderRoot, comp);
    }, lookupContext(element));
  };
}
function customElement(tag, props, ComponentType) {
  if (arguments.length === 2) {
    ComponentType = props;
    props = {};
  }
  return register(tag, props)(withSolid(ComponentType));
}
export {
  customElement,
  getCurrentElement,
  hot,
  noShadowDOM,
  withSolid
};
//# sourceMappingURL=solid-element.js.map
