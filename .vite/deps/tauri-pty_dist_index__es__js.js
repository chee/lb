import "./chunk-BUSYA2B4.js";

// node_modules/.deno/@tauri-apps+api@2.3.0/node_modules/@tauri-apps/api/external/tslib/tslib.es6.js
function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}
function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}

// node_modules/.deno/@tauri-apps+api@2.3.0/node_modules/@tauri-apps/api/core.js
var _Channel_onmessage;
var _Channel_nextMessageId;
var _Channel_pendingMessages;
var _Resource_rid;
var SERIALIZE_TO_IPC_FN = "__TAURI_TO_IPC_KEY__";
function transformCallback(callback, once = false) {
  return window.__TAURI_INTERNALS__.transformCallback(callback, once);
}
var Channel = class {
  constructor() {
    this.__TAURI_CHANNEL_MARKER__ = true;
    _Channel_onmessage.set(
      this,
      () => {
      }
      // the id is used as a mechanism to preserve message order
    );
    _Channel_nextMessageId.set(this, 0);
    _Channel_pendingMessages.set(this, []);
    this.id = transformCallback(({ message, id }) => {
      if (id == __classPrivateFieldGet(this, _Channel_nextMessageId, "f")) {
        __classPrivateFieldGet(this, _Channel_onmessage, "f").call(this, message);
        __classPrivateFieldSet(this, _Channel_nextMessageId, __classPrivateFieldGet(this, _Channel_nextMessageId, "f") + 1, "f");
        while (__classPrivateFieldGet(this, _Channel_nextMessageId, "f") in __classPrivateFieldGet(this, _Channel_pendingMessages, "f")) {
          const message2 = __classPrivateFieldGet(this, _Channel_pendingMessages, "f")[__classPrivateFieldGet(this, _Channel_nextMessageId, "f")];
          __classPrivateFieldGet(this, _Channel_onmessage, "f").call(this, message2);
          delete __classPrivateFieldGet(this, _Channel_pendingMessages, "f")[__classPrivateFieldGet(this, _Channel_nextMessageId, "f")];
          __classPrivateFieldSet(this, _Channel_nextMessageId, __classPrivateFieldGet(this, _Channel_nextMessageId, "f") + 1, "f");
        }
      } else {
        __classPrivateFieldGet(this, _Channel_pendingMessages, "f")[id] = message;
      }
    });
  }
  set onmessage(handler) {
    __classPrivateFieldSet(this, _Channel_onmessage, handler, "f");
  }
  get onmessage() {
    return __classPrivateFieldGet(this, _Channel_onmessage, "f");
  }
  [(_Channel_onmessage = /* @__PURE__ */ new WeakMap(), _Channel_nextMessageId = /* @__PURE__ */ new WeakMap(), _Channel_pendingMessages = /* @__PURE__ */ new WeakMap(), SERIALIZE_TO_IPC_FN)]() {
    return `__CHANNEL__:${this.id}`;
  }
  toJSON() {
    return this[SERIALIZE_TO_IPC_FN]();
  }
};
async function invoke(cmd, args = {}, options) {
  return window.__TAURI_INTERNALS__.invoke(cmd, args, options);
}
_Resource_rid = /* @__PURE__ */ new WeakMap();

// node_modules/.deno/tauri-pty@0.1.0/node_modules/tauri-pty/dist/index.es.js
function __awaiter(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}
var EventEmitter2 = class {
  constructor() {
    this._listeners = [];
  }
  get event() {
    if (!this._event) {
      this._event = (listener) => {
        this._listeners.push(listener);
        const disposable = {
          dispose: () => {
            for (let i = 0; i < this._listeners.length; i++) {
              if (this._listeners[i] === listener) {
                this._listeners.splice(i, 1);
                return;
              }
            }
          }
        };
        return disposable;
      };
    }
    return this._event;
  }
  fire(data) {
    const queue = [];
    for (let i = 0; i < this._listeners.length; i++) {
      queue.push(this._listeners[i]);
    }
    for (let i = 0; i < queue.length; i++) {
      queue[i].call(void 0, data);
    }
  }
};
function spawn(file, args, options) {
  return new TauriPty(file, args, options);
}
var TauriPty = class {
  constructor(file, args, opt) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    this._onData = new EventEmitter2();
    this._onExit = new EventEmitter2();
    args = typeof args === "string" ? [args] : args !== null && args !== void 0 ? args : [];
    const invokeArgs = {
      file,
      args,
      termName: (_a = opt === null || opt === void 0 ? void 0 : opt.name) !== null && _a !== void 0 ? _a : "Terminal",
      cols: (_b = opt === null || opt === void 0 ? void 0 : opt.cols) !== null && _b !== void 0 ? _b : null,
      rows: (_c = opt === null || opt === void 0 ? void 0 : opt.rows) !== null && _c !== void 0 ? _c : null,
      cwd: (_d = opt === null || opt === void 0 ? void 0 : opt.cwd) !== null && _d !== void 0 ? _d : null,
      env: (_e = opt === null || opt === void 0 ? void 0 : opt.env) !== null && _e !== void 0 ? _e : {},
      encoding: (_f = opt === null || opt === void 0 ? void 0 : opt.encoding) !== null && _f !== void 0 ? _f : null,
      handleFlowControl: (_g = opt === null || opt === void 0 ? void 0 : opt.handleFlowControl) !== null && _g !== void 0 ? _g : null,
      flowControlPause: (_h = opt === null || opt === void 0 ? void 0 : opt.flowControlPause) !== null && _h !== void 0 ? _h : null,
      flowControlResume: (_j = opt === null || opt === void 0 ? void 0 : opt.flowControlResume) !== null && _j !== void 0 ? _j : null
    };
    this._exitted = false;
    this._init = invoke("plugin:pty|spawn", invokeArgs).then((pid) => {
      this.pid = pid;
      this.readData();
      this.wait();
    });
  }
  dispose() {
    throw new Error("Method not implemented.");
  }
  get onData() {
    return this._onData.event;
  }
  get onExit() {
    return this._onExit.event;
  }
  resize(columns, rows) {
    this.cols = columns;
    this.rows = rows;
    this._init.then(() => invoke("plugin:pty|resize", { pid: this.pid, cols: columns, rows }).catch((e) => {
      console.error("Resize error: ", e);
    }));
  }
  clear() {
    console.warn("clear is un implemented!");
  }
  write(data) {
    this._init.then(() => invoke("plugin:pty|write", { pid: this.pid, data }).catch((e) => {
      console.error("Writing error: ", e);
    }));
  }
  kill(signal) {
    this._init.then(() => invoke("plugin:pty|kill", { pid: this.pid }));
  }
  pause() {
    throw new Error("Method not implemented.");
  }
  resume() {
    throw new Error("Method not implemented.");
  }
  readData() {
    return __awaiter(this, void 0, void 0, function* () {
      yield this._init;
      try {
        for (; ; ) {
          const data = yield invoke("plugin:pty|read", { pid: this.pid });
          this._onData.fire(data);
        }
      } catch (e) {
        if (typeof e === "string" && e.includes("EOF")) {
          return;
        }
        console.error("Reading error: ", e);
      }
    });
  }
  wait() {
    return __awaiter(this, void 0, void 0, function* () {
      if (this._exitted) {
        return;
      }
      try {
        const exitCode = yield invoke("plugin:pty|exitstatus", { pid: this.pid });
        this._exitted = true;
        this._onExit.fire({ exitCode });
      } catch (e) {
        console.error(e);
      }
    });
  }
};
export {
  spawn
};
//# sourceMappingURL=tauri-pty_dist_index__es__js.js.map
