// node_modules/.pnpm/proj-wasm@0.1.0-alpha10/node_modules/proj-wasm/dist/handler-runtime.mjs
var LEVEL_RANK = { off: 0, error: 1, warn: 2, info: 3, debug: 4, trace: 5 };
var VALID_LEVELS = Object.keys(LEVEL_RANK);
var logState = { level: null, categories: null, levelRank: 0 };
var setLogConfig = (cfg) => {
  if (cfg === null || cfg === void 0) {
    logState.level = null;
    logState.categories = null;
    logState.levelRank = 0;
    return;
  }
  if (typeof cfg !== "object") {
    throw new Error("setLogConfig: cfg must be an object or null");
  }
  const hasLevel = Object.prototype.hasOwnProperty.call(cfg, "level");
  let nextLevel = null;
  let nextRank = 0;
  if (hasLevel) {
    const lvl = cfg.level;
    if (lvl === null || lvl === void 0) {
      nextLevel = null;
      nextRank = 0;
    } else if (typeof lvl === "string" && Object.prototype.hasOwnProperty.call(LEVEL_RANK, lvl)) {
      nextLevel = lvl;
      nextRank = LEVEL_RANK[lvl];
    } else {
      throw new Error("setLogConfig: level must be one of " + VALID_LEVELS.join(", ") + " or null (got " + String(lvl) + ")");
    }
  }
  const hasCategories = Object.prototype.hasOwnProperty.call(cfg, "categories");
  let nextCategories = null;
  if (hasCategories) {
    const cats = cfg.categories;
    if (cats === null || cats === void 0) {
      nextCategories = null;
    } else if (Array.isArray(cats) || cats instanceof Set) {
      const out = /* @__PURE__ */ new Set();
      for (const c of cats) out.add(String(c).toLowerCase());
      nextCategories = out;
    } else {
      throw new Error("setLogConfig: categories must be an array, Set, or null");
    }
  }
  if (hasLevel) {
    logState.level = nextLevel;
    logState.levelRank = nextRank;
  }
  if (hasCategories) logState.categories = nextCategories;
};
var getLogConfig = () => ({
  level: logState.level,
  categories: logState.categories ? Array.from(logState.categories) : null
});
var RING_SIZE = 256;
var ringBuffer = new Array(RING_SIZE);
var ringIdx = 0;
var flushHandlersRegistered = false;
var categoryOf = (tag) => {
  const dash = tag.indexOf("-");
  return (dash > 0 ? tag.slice(0, dash) : tag).toLowerCase();
};
var isEventEnabled = (tag, eventLevel) => {
  if (logState.levelRank === 0) return false;
  const evRank = LEVEL_RANK[eventLevel] ?? LEVEL_RANK.debug;
  if (evRank > logState.levelRank) return false;
  if (logState.categories === null) return true;
  return logState.categories.has(categoryOf(tag));
};
var formatEvent = (tag, fields) => {
  const ts = String(Date.now());
  let line = "[CLJ-NATIVE ts=" + ts + " " + tag + "]";
  if (fields) {
    for (const k of Object.keys(fields)) {
      const v = fields[k];
      if (v !== void 0 && v !== null) line += " " + k + "=" + v;
    }
  }
  return line;
};
var dbgEmit = (tag, fields) => {
  const line = formatEvent(tag, fields);
  ringBuffer[ringIdx % RING_SIZE] = line;
  ringIdx++;
  console.log(line);
};
var dbg = (tag, fields, level = "debug") => {
  if (!isEventEnabled(tag, level)) return;
  dbgEmit(tag, fields);
};
var isEnabled = (tag, level = "debug") => isEventEnabled(tag, level);
var dbgPaired = (enabled, tag, fields) => {
  if (!enabled) return;
  dbgEmit(tag, fields);
};
var flushDebugRing = (reason) => {
  if (logState.levelRank === 0) return;
  const tag = reason ? String(reason) : "flush";
  const total = Math.min(ringIdx, RING_SIZE);
  const start = ringIdx > RING_SIZE ? ringIdx % RING_SIZE : 0;
  console.error("=== CLJ-NATIVE ring flush (" + tag + ", last " + total + " events) ===");
  for (let i = 0; i < total; i++) {
    console.error(ringBuffer[(start + i) % RING_SIZE]);
  }
  console.error("=== end CLJ-NATIVE ring (" + tag + ") ===");
};
var registerFlushHandlers = () => {
  if (flushHandlersRegistered) return;
  if (typeof process !== "undefined" && typeof process.on === "function") {
    process.on("uncaughtException", (e) => {
      flushDebugRing("uncaughtException: " + (e && e.message ? e.message : String(e)));
    });
    process.on("unhandledRejection", (e) => {
      flushDebugRing("unhandledRejection: " + (e && e.message ? e.message : String(e)));
    });
    flushHandlersRegistered = true;
  }
};
registerFlushHandlers();
var byteCarrierLength = (v) => v !== null && typeof v === "object" && typeof v.byteLength === "number" ? v.byteLength : null;
var isWalkable = (v) => {
  if (v === null || typeof v !== "object") return false;
  if (Array.isArray(v)) return true;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};
var withoutBytes = (value, depth) => {
  if (typeof value === "bigint") return "<bigint:" + value + ">";
  const n = byteCarrierLength(value);
  if (n !== null) return "<bytes:" + n + ">";
  if (!isWalkable(value) || depth <= 0) return value;
  if (Array.isArray(value)) return value.map((v) => withoutBytes(v, depth - 1));
  const out = {};
  for (const k of Object.keys(value)) out[k] = withoutBytes(value[k], depth - 1);
  return out;
};
var FINGERPRINT_DEPTH = 4;
var defaultFingerprint = (args) => {
  try {
    return JSON.stringify(withoutBytes(args ?? null, FINGERPRINT_DEPTH) ?? null);
  } catch (e) {
    throw new Error(
      "makeHandler: init args are not fingerprintable (" + (e && e.message ? e.message : String(e)) + "). Pass an explicit `fingerprint`, for example byteLengthFingerprint([...]).",
      { cause: e }
    );
  }
};
var byteLengthFingerprint = (fields, prefix = null) => {
  if (!Array.isArray(fields) || fields.length === 0) {
    throw new Error("byteLengthFingerprint: fields must be a non-empty array of init-arg names");
  }
  return (initArgs) => {
    const args = initArgs ?? {};
    const parts = fields.map((k) => {
      const v = args[k];
      const n = byteCarrierLength(v) ?? (Array.isArray(v) ? v.length : null);
      return k + ":" + (n === null ? String(v) : n);
    });
    return prefix ? prefix + "|" + parts.join("|") : parts.join("|");
  };
};
var normalizeWasmError = (e) => {
  let kind;
  if (typeof WebAssembly !== "undefined" && WebAssembly.RuntimeError && e instanceof WebAssembly.RuntimeError) {
    kind = "wasm-runtime-error";
  } else if (e instanceof Error && typeof e.message === "string" && e.message.startsWith("Aborted")) {
    kind = "emscripten-abort";
  } else {
    return e;
  }
  const wrapped = new Error(e?.message ?? String(e));
  wrapped.wasmTrap = true;
  wrapped.kind = kind;
  if (e?.stack) wrapped.stack = e.stack;
  return wrapped;
};
function makeHandler({
  init: init2,
  fingerprint: fingerprint2,
  methods: methods3,
  busyMethods: busyMethods2 = [],
  destroyMethods: destroyMethods2 = [],
  label = null
} = {}) {
  let emscriptenModule = null;
  const inspectHeap = () => {
    const m = emscriptenModule;
    if (!m || !m.HEAPU8) return null;
    const out = { "heap-bytes": m.HEAPU8.length };
    if (typeof m._sbrk === "function") {
      try {
        out.brk = m._sbrk(0);
      } catch (_e) {
      }
    }
    return out;
  };
  const substrateCtx = {
    attachEmscriptenModule(m) {
      emscriptenModule = m;
    },
    dbg,
    isEnabled,
    dbgPaired,
    // getLogConfig is here for a diagnostic consumer that must read the
    // current logState directly. It mirrors the module-level export and obeys
    // the same module-state rules. It returns the live view, not a snapshot.
    getLogConfig
  };
  if (!methods3 || typeof methods3 !== "object" || Object.keys(methods3).length === 0) {
    throw new Error("makeHandler: `methods` is required and must be a non-empty object");
  }
  for (const name of busyMethods2) {
    if (!Object.prototype.hasOwnProperty.call(methods3, name)) {
      throw new Error(`makeHandler: busyMethod '${name}' not present in methods`);
    }
  }
  for (const name of destroyMethods2) {
    if (!Object.prototype.hasOwnProperty.call(methods3, name)) {
      throw new Error(`makeHandler: destroyMethod '${name}' not present in methods`);
    }
  }
  const fp = fingerprint2 ?? defaultFingerprint;
  const busy = new Set(busyMethods2);
  const destroy3 = new Set(destroyMethods2);
  for (const name of busy) {
    if (destroy3.has(name)) {
      throw new Error(`makeHandler: method '${name}' is in both busyMethods and destroyMethods`);
    }
  }
  let workerQueue = Promise.resolve();
  let inFlight = 0;
  let callIdCounter = 0;
  let runtimeSlot = null;
  let barrierResolvers = [];
  const releaseBarriers = () => {
    if (inFlight === 0 && barrierResolvers.length > 0) {
      const pending = barrierResolvers;
      barrierResolvers = [];
      for (const r of pending) r();
    }
  };
  const awaitDrain = () => {
    if (inFlight === 0) return Promise.resolve();
    return new Promise((resolve) => {
      barrierResolvers.push(resolve);
    });
  };
  const wrap = (name, fn) => {
    if (destroy3.has(name)) {
      return (...args) => {
        const next = workerQueue.then(async () => {
          await awaitDrain();
          const enabled = isEventEnabled("DESTROY-FIRE", "debug");
          let id;
          if (enabled) {
            id = ++callIdCounter;
            dbgPaired(true, "DESTROY-FIRE", { fn: name, label, slot: runtimeSlot, busy: inFlight, id });
          }
          try {
            return await fn(...args);
          } catch (e) {
            throw normalizeWasmError(e);
          } finally {
            if (enabled) {
              dbgPaired(true, "DESTROY-COMPLETE", { fn: name, label, slot: runtimeSlot, id });
            }
          }
        });
        workerQueue = next.catch(() => {
        });
        return next;
      };
    }
    if (busy.has(name)) {
      return (...args) => {
        const next = workerQueue.then(async () => {
          inFlight++;
          const enabled = isEventEnabled("BUSY-INC", "debug");
          let id, cFn;
          if (enabled) {
            id = ++callIdCounter;
            cFn = name === "ccall" && args.length > 0 ? args[0] : null;
            dbgPaired(true, "BUSY-INC", { fn: name, "c-fn": cFn, label, slot: runtimeSlot, counter: inFlight, id, ...inspectHeap() || {} });
          }
          try {
            return await fn(...args);
          } catch (e) {
            throw normalizeWasmError(e);
          } finally {
            inFlight--;
            if (enabled) {
              dbgPaired(true, "BUSY-DEC", { fn: name, "c-fn": cFn, label, slot: runtimeSlot, counter: inFlight, id, ...inspectHeap() || {} });
            }
            releaseBarriers();
          }
        });
        workerQueue = next.catch(() => {
        });
        return next;
      };
    }
    return (...args) => {
      const next = workerQueue.then(async () => {
        try {
          return await fn(...args);
        } catch (e) {
          throw normalizeWasmError(e);
        }
      });
      workerQueue = next.catch(() => {
      });
      return next;
    };
  };
  let cachedFingerprint = null;
  let cachedHandler = null;
  let initPromise = null;
  const factory = async (initArgs) => {
    if (initArgs && initArgs.handlerRuntime) {
      const hr = initArgs.handlerRuntime;
      setLogConfig({ level: hr.logLevel, categories: hr.logCategories });
    }
    const print = fp(initArgs);
    if (cachedHandler !== null) {
      if (print !== cachedFingerprint) {
        throw new Error(
          `makeHandler: re-init with different args (cached fingerprint ${cachedFingerprint}, got ${print})`
        );
      }
      return cachedHandler;
    }
    if (initPromise === null) {
      cachedFingerprint = print;
      initPromise = (async () => {
        try {
          if (typeof init2 === "function") await init2(initArgs, substrateCtx);
          const wrapped = {};
          for (const name of Object.keys(methods3)) {
            wrapped[name] = wrap(name, methods3[name]);
          }
          wrapped.__setLogConfig = (cfg) => setLogConfig(cfg);
          wrapped.__setWorkerSlot = (s) => {
            runtimeSlot = s;
          };
          cachedHandler = wrapped;
          return wrapped;
        } catch (e) {
          cachedFingerprint = null;
          cachedHandler = null;
          initPromise = null;
          throw e;
        }
      })();
    } else if (print !== cachedFingerprint) {
      throw new Error(
        `makeHandler: re-init with different args while init in flight (pending fingerprint ${cachedFingerprint}, got ${print})`
      );
    }
    return initPromise;
  };
  return factory;
}

// node_modules/.pnpm/proj-wasm@0.1.0-alpha10/node_modules/proj-wasm/dist/proj-handler-overrides.mjs
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var classifyEnvironment = /* @__PURE__ */ __name((globals) => {
  const g = globals ?? {};
  const proc = g.process;
  if (proc && proc.versions != null && proc.versions.node != null)
    return "node";
  const win = g.window;
  if (win && typeof win.document !== "undefined")
    return "browser";
  return "unknown";
}, "classifyEnvironment");
var detectEnvironment = /* @__PURE__ */ __name(() => classifyEnvironment(globalThis), "detectEnvironment");
var isNode = detectEnvironment() === "node";
var isBrowser = detectEnvironment() === "browser";
var ensureNode = /* @__PURE__ */ __name(() => {
  if (!isNode) {
    throw new Error("handler-paths: node-only (browser path not yet wired)");
  }
}, "ensureNode");
var resolveCandidate = /* @__PURE__ */ __name(async (here, candidate) => {
  const { resolve, isAbsolute } = await import("node:path");
  if (Array.isArray(candidate))
    return resolve(here, ...candidate);
  if (typeof candidate !== "string") {
    throw new Error("handler-paths: candidate must be a string or array of segments (got " + typeof candidate + ")");
  }
  if (isAbsolute(candidate))
    return candidate;
  return resolve(here, candidate);
}, "resolveCandidate");
var resolveAsset = /* @__PURE__ */ __name(async (importMetaUrl, name, candidates) => {
  ensureNode();
  if (typeof name !== "string" || name.length === 0) {
    throw new Error("handler-paths: name must be a non-empty string");
  }
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error("handler-paths: candidates must be a non-empty array");
  }
  const { fileURLToPath } = await import("node:url");
  const { dirname, join } = await import("node:path");
  const { existsSync } = await import("node:fs");
  const here = dirname(fileURLToPath(importMetaUrl));
  const tried = [];
  for (const c of candidates) {
    const dir = await resolveCandidate(here, c);
    tried.push(dir);
    if (existsSync(join(dir, name))) {
      return { dir, path: join(dir, name) };
    }
  }
  throw new Error("handler-paths: " + name + " not found on any candidate: " + tried.join(", "));
}, "resolveAsset");
var loadEmscriptenModule = /* @__PURE__ */ __name(async (importMetaUrl, opts) => {
  const { name, nodeName = name, browserName = name, candidates } = opts ?? {};
  if (typeof nodeName !== "string" || typeof browserName !== "string") {
    throw new Error("handler-paths: loadEmscriptenModule needs a `name` (or both `nodeName` and `browserName`)");
  }
  if (isNode) {
    const { dir } = await resolveAsset(importMetaUrl, nodeName, candidates);
    const { pathToFileURL } = await import("node:url");
    const { join } = await import("node:path");
    const imported2 = await import(pathToFileURL(join(dir, nodeName)).href);
    return { factory: imported2.default, locateFile: (n) => join(dir, n), dir };
  }
  const baseUrl = new URL("./", importMetaUrl).href;
  const imported = await import(baseUrl + browserName);
  return { factory: imported.default, locateFile: (n) => baseUrl + n, baseUrl };
}, "loadEmscriptenModule");
var EEXIST = 20;
var ensureUint8 = /* @__PURE__ */ __name((value, name) => {
  if (value instanceof Uint8Array)
    return value;
  if (value instanceof ArrayBuffer)
    return new Uint8Array(value);
  if (value && typeof value.byteLength === "number" && typeof value.buffer !== "undefined") {
    return new Uint8Array(value.buffer, value.byteOffset ?? 0, value.byteLength);
  }
  if (Array.isArray(value))
    return new Uint8Array(value);
  throw new Error("stageFiles: " + name + " is not Uint8Array or coercible (got " + typeof value + ")");
}, "ensureUint8");
var mkdirP = /* @__PURE__ */ __name((FS, dir) => {
  if (typeof FS.mkdirTree === "function") {
    FS.mkdirTree(dir);
    return;
  }
  try {
    FS.mkdir(dir);
  } catch (e) {
    if (e?.errno !== EEXIST)
      throw e;
  }
}, "mkdirP");
var stageFiles = /* @__PURE__ */ __name((module2, files, memfsDir) => {
  if (!module2 || !module2.FS) {
    throw new Error("stageFiles: module.FS not available");
  }
  if (typeof memfsDir !== "string" || memfsDir.length === 0) {
    throw new Error("stageFiles: memfsDir must be a non-empty string");
  }
  if (!files || typeof files !== "object") {
    throw new Error("stageFiles: files must be a non-empty object map of name -> bytes");
  }
  mkdirP(module2.FS, memfsDir);
  const trimmed = memfsDir.endsWith("/") ? memfsDir.slice(0, -1) : memfsDir;
  const out = {};
  for (const name of Object.keys(files)) {
    const u8 = ensureUint8(files[name], name);
    const path = trimmed + "/" + name;
    module2.FS.writeFile(path, u8);
    out[name] = path;
  }
  return out;
}, "stageFiles");
var ok = Object.freeze({ ok: true });
var POINTER_SIZE = 4;
var heapHelpers = /* @__PURE__ */ __name((getModule) => {
  const m = /* @__PURE__ */ __name(() => {
    const mod = getModule();
    if (!mod)
      throw new Error("handler-heap: getModule() returned null (called before init?)");
    return mod;
  }, "m");
  const heaps = [
    ["heap8", "HEAP8"],
    ["heapu8", "HEAPU8"],
    ["heap16", "HEAP16"],
    ["heapu16", "HEAPU16"],
    ["heap32", "HEAP32"],
    ["heapu32", "HEAPU32"],
    ["heapf32", "HEAPF32"],
    ["heapf64", "HEAPF64"]
  ];
  const out = {
    malloc: async (size) => m()._malloc(size),
    free: async (ptr) => {
      m()._free(ptr);
      return ok;
    },
    get_value: async (ptr, type) => m().getValue(ptr, type),
    set_value: async (ptr, value, type) => {
      m().setValue(ptr, value, type);
      return ok;
    },
    utf8_to_string: async (ptr) => m().UTF8ToString(ptr),
    string_to_utf8: async (str, ptr, maxLength) => {
      m().stringToUTF8(str, ptr, maxLength);
      return ok;
    },
    utf8_byte_length: async (str) => m().lengthBytesUTF8(str),
    // Walk a NUL-terminated `char* const*` into an array of strings. A null
    // list pointer gives []. Reads slots with getValue and '*', matching the
    // JVM twin at graal-wasm/string-array-pointer->strs.
    //
    // The heap-length bound is load-bearing. An out-of-range typed-array read
    // in JS gives undefined, and undefined is not 0, so an unterminated walk
    // never meets its terminator and spins the worker forever. Nothing here
    // allocates, so the heap cannot grow mid-walk and one length read holds.
    read_string_array: async (ptr) => {
      const out2 = [];
      if (!ptr)
        return out2;
      const mod = m();
      if (ptr % POINTER_SIZE !== 0) {
        throw new Error(
          `handler-heap: read_string_array pointer ${ptr} is not ${POINTER_SIZE}-byte aligned`
        );
      }
      const limit = mod.HEAPU8.length;
      for (let slot = ptr; ; slot += POINTER_SIZE) {
        if (slot + POINTER_SIZE > limit) {
          throw new Error(
            `handler-heap: read_string_array walked past the end of the heap from ${ptr}; the array is not NUL-terminated`
          );
        }
        const strPtr = mod.getValue(slot, "*");
        if (!strPtr)
          return out2;
        out2.push(mod.UTF8ToString(strPtr));
      }
    }
  };
  for (const [name, prop] of heaps) {
    out[`${name}_get`] = async (offset, length) => {
      return m()[prop].slice(offset, offset + length);
    };
    out[`${name}_set`] = async (offset, values) => {
      m()[prop].set(values, offset);
      return ok;
    };
  }
  return out;
}, "heapHelpers");
var CONTROL_BUFFER_SIZE = 12;
var META_BUFFER_SIZE = 20;
var DEFAULT_DATA_BUFFER_SIZE = 50 * 1024 * 1024;
var DEFAULT_REQUEST_TIMEOUT_MS = 35e3;
var WAIT_SLACK_MS = 5e3;
var WORKER_READY_TIMEOUT_MS = 1e4;
var OVERFLOW_FLAG = 1;
function nextGeneration(state) {
  const next = state.generation + 1 | 0;
  state.generation = next === 0 ? 1 : next;
  return state.generation;
}
__name(nextGeneration, "nextGeneration");
var workerState = null;
var refCount = 0;
function parseHeaders(str) {
  const headers = {};
  if (!str)
    return headers;
  for (const line of str.split(/\r\n|\n/)) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      headers[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
    }
  }
  return headers;
}
__name(parseHeaders, "parseHeaders");
async function ensureWorker(workerUrl, decorateUrl, opts) {
  if (workerState)
    return workerState;
  if (!workerUrl)
    throw new Error("createSyncFetch: workerUrl is required on Node");
  const { Worker } = await import("worker_threads");
  const dataBufferSize = opts.dataBufferSize ?? DEFAULT_DATA_BUFFER_SIZE;
  const requestTimeoutMs = opts.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const controlSAB = new SharedArrayBuffer(CONTROL_BUFFER_SIZE);
  const metaSAB = new SharedArrayBuffer(META_BUFFER_SIZE);
  const dataSAB = new SharedArrayBuffer(dataBufferSize);
  const worker = new Worker(workerUrl);
  worker.unref();
  await waitForWorkerReady(worker, {
    cmd: "init",
    controlBuffer: controlSAB,
    metaBuffer: metaSAB,
    dataBuffer: dataSAB,
    decorateUrl: decorateUrl ? String(decorateUrl) : null,
    requestTimeoutMs
  });
  workerState = {
    worker,
    control: new Int32Array(controlSAB),
    meta: new Int32Array(metaSAB),
    data: new Uint8Array(dataSAB),
    view: new DataView(dataSAB),
    waitTimeoutMs: requestTimeoutMs + WAIT_SLACK_MS,
    generation: 0
  };
  return workerState;
}
__name(ensureWorker, "ensureWorker");
function waitForWorkerReady(worker, initMsg) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(
      () => finishReject(new Error(
        `createSyncFetch: fetch worker did not become ready within ${WORKER_READY_TIMEOUT_MS}ms`
      )),
      WORKER_READY_TIMEOUT_MS
    );
    timer.unref?.();
    const onMessage = /* @__PURE__ */ __name((msg) => {
      if (msg?.status === "ready")
        finishResolve();
      else if (msg?.status === "error") {
        finishReject(new Error(`createSyncFetch: fetch worker failed to initialize: ${msg.error}`));
      }
    }, "onMessage");
    const onError = /* @__PURE__ */ __name((err) => finishReject(new Error(`createSyncFetch: fetch worker error during init: ${err.message}`)), "onError");
    const onExit = /* @__PURE__ */ __name((code) => {
      if (code !== 0) {
        finishReject(new Error(`createSyncFetch: fetch worker exited (code ${code}) during init`));
      }
    }, "onExit");
    function cleanup() {
      clearTimeout(timer);
      worker.off("message", onMessage);
      worker.off("error", onError);
      worker.off("exit", onExit);
    }
    __name(cleanup, "cleanup");
    function finishResolve() {
      if (settled)
        return;
      settled = true;
      cleanup();
      resolve();
    }
    __name(finishResolve, "finishResolve");
    function finishReject(err) {
      if (settled)
        return;
      settled = true;
      cleanup();
      worker.terminate();
      reject(err);
    }
    __name(finishReject, "finishReject");
    worker.on("message", onMessage);
    worker.on("error", onError);
    worker.on("exit", onExit);
    worker.postMessage(initMsg);
  });
}
__name(waitForWorkerReady, "waitForWorkerReady");
function nodeSyncFetch(state, url, reqOpts) {
  const { control, meta, data, view, waitTimeoutMs } = state;
  const request = {
    url,
    method: reqOpts.method || "GET",
    headers: reqOpts.headers || {},
    body: reqOpts.body ?? null
  };
  const jsonBytes = new TextEncoder().encode(JSON.stringify(request));
  view.setInt32(0, jsonBytes.length, true);
  data.set(jsonBytes, 4);
  const generation = nextGeneration(state);
  Atomics.store(control, 2, generation);
  Atomics.store(control, 1, 0);
  Atomics.store(control, 0, 1);
  Atomics.notify(control, 0, 1);
  const deadline = Date.now() + waitTimeoutMs;
  for (; ; ) {
    const remaining = deadline - Date.now();
    if (remaining <= 0 || Atomics.wait(control, 1, 0, remaining) === "timed-out") {
      console.error(
        `http-bridge: fetch worker did not answer within ${waitTimeoutMs}ms for ${url}. Returning a transport failure.`
      );
      return { status: 0, headers: {}, bodyBytes: new Uint8Array(0) };
    }
    if (Atomics.load(meta, 4) === generation)
      break;
    Atomics.store(control, 1, 0);
  }
  const flags = Atomics.load(meta, 3);
  const status = Atomics.load(meta, 0);
  if (flags & OVERFLOW_FLAG) {
    console.error(
      `http-bridge: the response for ${url} is larger than the ${data.length}-byte transport buffer. Upstream status ${status}. Returning a transport failure.`
    );
    return { status: 0, headers: {}, bodyBytes: new Uint8Array(0), overflow: true };
  }
  const bodyLength = Atomics.load(meta, 1);
  const headersLength = Atomics.load(meta, 2);
  const bodyBytes = data.slice(0, bodyLength);
  const headersStr = new TextDecoder().decode(data.slice(bodyLength, bodyLength + headersLength));
  return { status, headers: parseHeaders(headersStr), bodyBytes };
}
__name(nodeSyncFetch, "nodeSyncFetch");
function browserSyncFetch(decorate, url, reqOpts) {
  let request = {
    url,
    method: reqOpts.method || "GET",
    headers: reqOpts.headers || {},
    body: reqOpts.body ?? null
  };
  if (decorate)
    request = decorate(request);
  const xhr = new XMLHttpRequest();
  xhr.open(request.method, request.url, false);
  try {
    xhr.responseType = "arraybuffer";
  } catch (_) {
  }
  for (const [k, v] of Object.entries(request.headers))
    xhr.setRequestHeader(k, v);
  xhr.send(request.body);
  let bodyBytes = new Uint8Array(0);
  if (xhr.response instanceof ArrayBuffer) {
    bodyBytes = new Uint8Array(xhr.response);
  } else if (typeof xhr.responseText === "string" && xhr.responseText.length > 0) {
    bodyBytes = new TextEncoder().encode(xhr.responseText);
  }
  const all = xhr.getAllResponseHeaders ? xhr.getAllResponseHeaders() : "";
  return { status: xhr.status, headers: parseHeaders(all), bodyBytes };
}
__name(browserSyncFetch, "browserSyncFetch");
async function createSyncFetch(opts = {}) {
  const { workerUrl, decorate, decorateUrl } = opts;
  if (isNode) {
    const state = await ensureWorker(workerUrl, decorateUrl, opts);
    refCount++;
    return (url, reqOpts = {}) => nodeSyncFetch(state, url, reqOpts);
  }
  return (url, reqOpts = {}) => browserSyncFetch(decorate, url, reqOpts);
}
__name(createSyncFetch, "createSyncFetch");
function makeXhrClass(syncFetch, XHR2) {
  let xhrIdCounter = 0;
  return class XMLHttpRequest {
    static {
      __name(this, "XMLHttpRequest");
    }
    constructor() {
      this._id = ++xhrIdCounter;
      this._xhr2 = null;
      this._async = true;
      this._method = "GET";
      this._url = null;
      this._headers = {};
      this._syncResponseHeaders = null;
      this._status = 0;
      [
        "readyState",
        "status",
        "statusText",
        "response",
        "responseText",
        "responseType",
        "responseURL",
        "onreadystatechange",
        "onload",
        "onerror",
        "onprogress"
      ].forEach((prop) => {
        Object.defineProperty(this, prop, {
          get: () => this._async && this._xhr2 ? this._xhr2[prop] : this["_" + prop],
          set: (v) => {
            if (this._async && this._xhr2)
              this._xhr2[prop] = v;
            else
              this["_" + prop] = v;
          }
        });
      });
    }
    _ensureXhr2() {
      if (this._xhr2)
        return this._xhr2;
      if (!XHR2)
        throw new Error("async XMLHttpRequest requires the optional xhr2 package");
      this._xhr2 = new XHR2();
      return this._xhr2;
    }
    open(method, url, async = true) {
      this._method = method;
      this._url = url;
      this._async = async;
      if (async)
        this._ensureXhr2().open(method, url, async);
      else
        this._readyState = 1;
    }
    setRequestHeader(name, value) {
      this._headers[name] = value;
      if (this._async)
        this._ensureXhr2().setRequestHeader(name, value);
    }
    getResponseHeader(name) {
      if (this._async)
        return this._ensureXhr2().getResponseHeader(name);
      return this._syncResponseHeaders?.[name.toLowerCase()] || null;
    }
    getAllResponseHeaders() {
      if (this._async)
        return this._ensureXhr2().getAllResponseHeaders();
      if (!this._syncResponseHeaders)
        return "";
      return Object.entries(this._syncResponseHeaders).map(([k, v]) => `${k}: ${v}`).join("\r\n") + "\r\n";
    }
    send(body = null) {
      if (this._async) {
        this._ensureXhr2().send(body);
        return;
      }
      try {
        const response = syncFetch(this._url, { method: this._method, headers: this._headers, body });
        this._status = response.status;
        this._statusText = response.status >= 200 && response.status < 300 ? "OK" : "Error";
        this._responseURL = this._url;
        this._readyState = 4;
        this._syncResponseHeaders = response.headers || {};
        const arrayBuffer = new ArrayBuffer(response.bodyBytes.byteLength);
        new Uint8Array(arrayBuffer).set(response.bodyBytes);
        this._response = arrayBuffer;
        this._responseText = "";
        if (this._onreadystatechange)
          this._onreadystatechange();
        if (this._onload)
          this._onload();
      } catch (err) {
        this._status = 0;
        this._readyState = 4;
        if (this._onerror)
          this._onerror(err);
        if (this._onreadystatechange)
          this._onreadystatechange();
      }
    }
    abort() {
      if (this._async && this._xhr2)
        this._xhr2.abort();
      else
        this._readyState = 0;
    }
  };
}
__name(makeXhrClass, "makeXhrClass");
async function installXhrPolyfill(opts = {}) {
  const { syncFetch } = opts;
  if (!isNode || typeof globalThis.XMLHttpRequest !== "undefined")
    return;
  let XHR2 = null;
  try {
    const { createRequire } = await import("module");
    const require2 = createRequire(import.meta.url);
    XHR2 = require2("xhr2");
  } catch (_) {
  }
  globalThis.XMLHttpRequest = makeXhrClass(syncFetch, XHR2);
}
__name(installXhrPolyfill, "installXhrPolyfill");
async function shutdown() {
  if (!workerState) {
    refCount = 0;
    return false;
  }
  refCount = Math.max(0, refCount - 1);
  if (refCount > 0)
    return false;
  const { worker } = workerState;
  worker.postMessage({ cmd: "shutdown" });
  await worker.terminate();
  workerState = null;
  return true;
}
__name(shutdown, "shutdown");
var shutdownMethod = /* @__PURE__ */ __name(async () => {
  await shutdown();
  return { ok: true };
}, "shutdownMethod");
var moduleDestroy = /* @__PURE__ */ __name(async () => {
  await shutdown();
}, "moduleDestroy");
var NET_DBG = typeof globalThis !== "undefined" && globalThis.__PROJ_NET_DBG__ === true;
var module = null;
var contexts = /* @__PURE__ */ new Map();
var nextContextId = 1;
var logCallbackPtr = null;
var logLevel = 0;
var nextHandleId = 1;
var handles = /* @__PURE__ */ new Map();
var PJ_LOG_ERROR = 1;
var PJ_LOG_DEBUG = 2;
var PJ_LOG_TRACE = 3;
async function installNodeXhrPolyfill() {
  if (!isNode || typeof globalThis.XMLHttpRequest !== "undefined")
    return;
  const { pathToFileURL } = await import("url");
  const { join } = await import("path");
  const { dir: assetDir } = await resolveAsset(import.meta.url, "fetch_worker.mjs", [["."], ["dist"]]);
  const workerUrl = pathToFileURL(join(assetDir, "fetch_worker.mjs"));
  const syncFetch = await createSyncFetch({ workerUrl });
  await installXhrPolyfill({ syncFetch });
}
__name(installNodeXhrPolyfill, "installNodeXhrPolyfill");
async function loadProjModule() {
  const { factory } = await loadEmscriptenModule(import.meta.url, {
    name: "proj-emscripten.js",
    candidates: [["."], ["dist"]]
  });
  return factory();
}
__name(loadProjModule, "loadProjModule");
function makeRangeRequest(url, offset, sizeToRead) {
  try {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    try {
      xhr.responseType = "arraybuffer";
    } catch (_) {
    }
    if (offset != null && sizeToRead != null) {
      xhr.setRequestHeader(
        "Range",
        `bytes=${offset}-${offset + sizeToRead - 1}`
      );
    }
    xhr.send();
    let body = new Uint8Array(0);
    if (xhr.response instanceof ArrayBuffer) {
      body = new Uint8Array(xhr.response);
    } else if (xhr.response instanceof Uint8Array) {
      body = xhr.response;
    } else if (typeof xhr.responseText === "string" && xhr.responseText.length > 0) {
      body = new TextEncoder().encode(xhr.responseText);
    }
    const headers = {};
    const all = xhr.getAllResponseHeaders ? xhr.getAllResponseHeaders() : "";
    if (all) {
      for (const line of all.split(/\r\n|\n/)) {
        const idx = line.indexOf(":");
        if (idx > 0) {
          headers[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
        }
      }
    }
    return { status: xhr.status, body, headers };
  } catch (e) {
    return { status: 0, body: new Uint8Array(0), headers: {}, error: e };
  }
}
__name(makeRangeRequest, "makeRangeRequest");
function writeErrorString(errStrPtr, errMaxSize, msg) {
  if (!errStrPtr || errMaxSize <= 0)
    return;
  const bytes = new TextEncoder().encode(String(msg ?? ""));
  const n = Math.min(bytes.length, errMaxSize - 1);
  if (n > 0)
    module.HEAPU8.set(bytes.subarray(0, n), errStrPtr);
  module.HEAPU8[errStrPtr + n] = 0;
}
__name(writeErrorString, "writeErrorString");
function installProjNetCallbacks() {
  if (globalThis.__proj_net_open)
    return;
  if (NET_DBG)
    console.log("[NET-DBG] INSTALL proj-net callbacks on globalThis");
  globalThis.__proj_net_open = (ctx, urlPtr, offset, sizeToRead, bufferPtr, outSizePtr, errMaxSize, errStrPtr, _userData) => {
    try {
      const url = module.UTF8ToString(urlPtr);
      const response = makeRangeRequest(url, offset, sizeToRead);
      if (response.status !== 200 && response.status !== 206) {
        const errMsg = response.error ? `Network error: ${response.error.message ?? response.error}` : `HTTP ${response.status}`;
        if (NET_DBG)
          console.log(`[NET-DBG] OPEN-FAIL ctx=${ctx} url=${url} offset=${offset} size=${sizeToRead} status=${response.status} err=${errMsg}`);
        writeErrorString(errStrPtr, errMaxSize, errMsg);
        return 0;
      }
      const bytesRead = Math.min(response.body.length, sizeToRead);
      if (bytesRead > 0) {
        module.HEAPU8.set(response.body.subarray(0, bytesRead), bufferPtr);
      }
      if (outSizePtr)
        module.setValue(outSizePtr, bytesRead, "i32");
      const id = nextHandleId++;
      handles.set(id, { url, headers: response.headers });
      if (NET_DBG)
        console.log(`[NET-DBG] OPEN-OK ctx=${ctx} h=${id} url=${url} offset=${offset} size=${sizeToRead} bytes=${bytesRead}`);
      return id;
    } catch (e) {
      if (NET_DBG)
        console.log(`[NET-DBG] OPEN-THROW ctx=${ctx} err=${e?.message ?? e}`);
      writeErrorString(errStrPtr, errMaxSize, e?.message ?? String(e));
      return 0;
    }
  };
  globalThis.__proj_net_close = (ctx, handle, _userData) => {
    if (NET_DBG)
      console.log(`[NET-DBG] CLOSE ctx=${ctx} h=${handle}`);
    handles.delete(handle);
  };
  globalThis.__proj_net_get_header = (ctx, handle, namePtr, _userData) => {
    const entry = handles.get(handle);
    if (!entry) {
      if (NET_DBG)
        console.log(`[NET-DBG] HDR-NOENTRY ctx=${ctx} h=${handle}`);
      return 0;
    }
    const name = module.UTF8ToString(namePtr).toLowerCase();
    const value = entry.headers?.[name];
    if (!value) {
      if (NET_DBG)
        console.log(`[NET-DBG] HDR-MISS ctx=${ctx} h=${handle} name=${name}`);
      return 0;
    }
    return module.stringToNewUTF8(value);
  };
  globalThis.__proj_net_read_range = (ctx, handle, offset, sizeToRead, bufferPtr, errMaxSize, errStrPtr, _userData) => {
    try {
      const entry = handles.get(handle);
      if (!entry) {
        if (NET_DBG)
          console.log(`[NET-DBG] READ-NOENTRY ctx=${ctx} h=${handle} offset=${offset} size=${sizeToRead}`);
        writeErrorString(errStrPtr, errMaxSize, "Invalid handle");
        return 0;
      }
      const response = makeRangeRequest(entry.url, offset, sizeToRead);
      if (response.status !== 200 && response.status !== 206) {
        const errMsg = response.error ? `Network error: ${response.error.message ?? response.error}` : `HTTP ${response.status}`;
        if (NET_DBG)
          console.log(`[NET-DBG] READ-FAIL ctx=${ctx} h=${handle} url=${entry.url} offset=${offset} size=${sizeToRead} status=${response.status} err=${errMsg}`);
        writeErrorString(errStrPtr, errMaxSize, errMsg);
        return 0;
      }
      const bytesRead = Math.min(response.body.length, sizeToRead);
      if (bytesRead > 0) {
        module.HEAPU8.set(response.body.subarray(0, bytesRead), bufferPtr);
      }
      entry.headers = response.headers;
      if (NET_DBG)
        console.log(`[NET-DBG] READ-OK ctx=${ctx} h=${handle} url=${entry.url} offset=${offset} size=${sizeToRead} bytes=${bytesRead}`);
      return bytesRead;
    } catch (e) {
      if (NET_DBG)
        console.log(`[NET-DBG] READ-THROW ctx=${ctx} h=${handle} err=${e?.message ?? e}`);
      writeErrorString(errStrPtr, errMaxSize, e?.message ?? String(e));
      return 0;
    }
  };
}
__name(installProjNetCallbacks, "installProjNetCallbacks");
var netCallbackPtrs = null;
function networkCallbackPointers() {
  if (netCallbackPtrs)
    return netCallbackPtrs;
  installProjNetCallbacks();
  const openFn = globalThis.__proj_net_open;
  const readFn = globalThis.__proj_net_read_range;
  netCallbackPtrs = {
    open: module.addFunction(
      (ctx, urlPtr, offset, sizeToRead, bufferPtr, outSizePtr, errMaxSize, errStrPtr, userData) => openFn(ctx, urlPtr, Number(offset), sizeToRead, bufferPtr, outSizePtr, errMaxSize, errStrPtr, userData),
      "iiijiiiiii"
    ),
    close: module.addFunction(globalThis.__proj_net_close, "viii"),
    getHeader: module.addFunction(globalThis.__proj_net_get_header, "iiiii"),
    readRange: module.addFunction(
      (ctx, handle, offset, sizeToRead, bufferPtr, errMaxSize, errStrPtr, userData) => readFn(ctx, handle, Number(offset), sizeToRead, bufferPtr, errMaxSize, errStrPtr, userData),
      "iiijiiiii"
    )
  };
  return netCallbackPtrs;
}
__name(networkCallbackPointers, "networkCallbackPointers");
function readStringArray(mod, listPtr) {
  const strings = [];
  let offset = 0;
  while (true) {
    const strPtr = mod.getValue(listPtr + offset * 4, "*");
    if (strPtr === 0)
      break;
    strings.push(mod.UTF8ToString(strPtr));
    offset++;
  }
  return strings;
}
__name(readStringArray, "readStringArray");
function readOutParams(mod, outParamAllocs) {
  const result = {};
  for (const { ptr, size, field } of outParamAllocs) {
    switch (field.type) {
      case "double":
        result[field.key] = mod.getValue(ptr, "double");
        break;
      case "int":
        result[field.key] = mod.getValue(ptr, "i32");
        break;
      case "string": {
        const strPtr = mod.getValue(ptr, "*");
        result[field.key] = strPtr ? mod.UTF8ToString(strPtr) : null;
        break;
      }
      case "double-array": {
        const n = size / 8;
        const values = [];
        for (let j = 0; j < n; j++) {
          values.push(mod.getValue(ptr + j * 8, "double"));
        }
        result[field.key] = values;
        break;
      }
    }
  }
  return result;
}
__name(readOutParams, "readOutParams");
function freeOutParams(mod, outParamAllocs) {
  for (const { ptr } of outParamAllocs)
    mod._free(ptr);
}
__name(freeOutParams, "freeOutParams");
function readStructList(mod, listPtr, count, structFields) {
  const readStr = /* @__PURE__ */ __name((ptr) => ptr ? mod.UTF8ToString(ptr) : null, "readStr");
  const entries = [];
  for (let i = 0; i < count; i++) {
    const s = mod.getValue(listPtr + i * 4, "*");
    const entry = {};
    for (const field of structFields) {
      const { key, type, offset } = field;
      switch (type) {
        case "string":
          entry[key] = readStr(mod.getValue(s + offset, "*"));
          break;
        case "int":
          entry[key] = mod.getValue(s + offset, "i32");
          break;
        case "double":
          entry[key] = mod.getValue(s + offset, "double");
          break;
        case "boolean":
          entry[key] = mod.getValue(s + offset, "i32") !== 0;
          break;
      }
    }
    entries.push(entry);
  }
  return entries;
}
__name(readStructList, "readStructList");
function readCoordDataAndFree(mod, coordAllocations) {
  const coordData = [];
  for (const alloc of coordAllocations) {
    coordData.push(
      mod.HEAPF64.slice(alloc.heapOffset, alloc.heapOffset + alloc.numFloats)
    );
    mod._free(alloc.mallocPtr);
  }
  return coordData;
}
__name(readCoordDataAndFree, "readCoordDataAndFree");
function prepareCallArgs(mod, args, argTypes, opts) {
  const { projReturns, coordArrays, outFields, structParamsCreate } = opts;
  let coordAllocations = null;
  if (coordArrays && coordArrays.length > 0) {
    coordAllocations = [];
    for (const ca of coordArrays) {
      const mallocPtr = mod._malloc(ca.numFloats * 8);
      const heapOffset = mallocPtr / 8;
      mod.HEAPF64.set(ca.data, heapOffset);
      args[ca.argIdx] = mallocPtr;
      coordAllocations.push({ mallocPtr, heapOffset, numFloats: ca.numFloats });
    }
  }
  let outParamAllocs = null;
  if (projReturns === "out-params" && outFields) {
    outParamAllocs = [];
    for (const field of outFields) {
      const size = field.type === "double-array" ? args[field.countArgIdx] * 8 : field.type === "double" ? 8 : 4;
      const ptr = mod._malloc(size);
      outParamAllocs.push({ ptr, size, field });
      args.push(ptr);
      argTypes.push("number");
    }
  }
  let paramsPtrLocal = null;
  if (projReturns === "struct-list") {
    const countPtr = mod._malloc(4);
    mod.setValue(countPtr, 0, "i32");
    args[args.length - 1] = countPtr;
    if (structParamsCreate) {
      paramsPtrLocal = mod.ccall(structParamsCreate, "number", [], []);
      args[args.length - 2] = paramsPtrLocal;
    }
  }
  return { coordAllocations, outParamAllocs, paramsPtrLocal };
}
__name(prepareCallArgs, "prepareCallArgs");
function decodeCallResult(mod, rawResult, opts) {
  const {
    projReturns,
    args,
    outParamAllocs,
    paramsPtrLocal,
    structParamsDestroy,
    structDestroyFn,
    structFields
  } = opts;
  if (projReturns === "string-list" && rawResult !== 0) {
    return readStringArray(mod, rawResult);
  }
  if (projReturns === "struct-list") {
    const countPtr = args[args.length - 1];
    let entries = [];
    if (rawResult !== 0) {
      const count = mod.getValue(countPtr, "i32");
      entries = readStructList(mod, rawResult, count, structFields);
      mod.ccall(structDestroyFn, null, ["number"], [rawResult]);
    }
    if (paramsPtrLocal && structParamsDestroy) {
      mod.ccall(structParamsDestroy, null, ["number"], [paramsPtrLocal]);
    }
    mod._free(countPtr);
    return entries;
  }
  if (projReturns === "out-params" && outParamAllocs) {
    const fields = rawResult === 0 ? null : readOutParams(mod, outParamAllocs);
    freeOutParams(mod, outParamAllocs);
    return fields;
  }
  return rawResult;
}
__name(decodeCallResult, "decodeCallResult");
var methods = {
  context_create: async (opts) => {
    const enableNetwork = opts?.enableNetwork ?? true ? 1 : 0;
    const ptr = module.ccall("proj_context_create", "number", [], []);
    module.ccall(
      "proj_context_set_database_path",
      "number",
      ["number", "string"],
      [ptr, "/proj/proj.db"]
    );
    module.ccall(
      "proj_context_set_enable_network",
      "number",
      ["number", "number"],
      [ptr, enableNetwork]
    );
    if (enableNetwork) {
      const cb = networkCallbackPointers();
      const netRc = module.ccall(
        "proj_context_set_network_callbacks",
        "number",
        ["number", "number", "number", "number", "number", "number"],
        [ptr, cb.open, cb.close, cb.getHeader, cb.readRange, 0]
      );
      if (NET_DBG)
        console.log(`[NET-DBG] SETUP-NET ctx-ptr=${ptr} rc=${netRc}`);
    }
    if (logCallbackPtr) {
      module.ccall(
        "proj_log_func",
        null,
        ["number", "number", "number"],
        [ptr, 0, logCallbackPtr]
      );
      module.ccall(
        "proj_log_level",
        "number",
        ["number", "number"],
        [ptr, PJ_LOG_ERROR]
      );
    }
    const ctxId = nextContextId++;
    contexts.set(ctxId, ptr);
    return { ctxId, ptr };
  },
  set_log_level: async (level) => {
    logLevel = level || 0;
    return { ok: true, level: logLevel };
  },
  context_destroy: async (ctxId) => {
    const ptr = contexts.get(ctxId);
    if (ptr) {
      module.ccall("proj_context_destroy", null, ["number"], [ptr]);
      contexts.delete(ctxId);
    }
    return { ok: true };
  },
  ccall: async (fnName, returnType, argTypes, args, extra = {}) => {
    const {
      projReturns,
      coordArrays,
      outFields,
      structParamsCreate,
      structParamsDestroy,
      structDestroyFn,
      structFields
    } = extra;
    const { coordAllocations, outParamAllocs, paramsPtrLocal } = prepareCallArgs(
      module,
      args,
      argTypes,
      { projReturns, coordArrays, outFields, structParamsCreate }
    );
    const rawResult = module.ccall(fnName, returnType, argTypes, args);
    const coordData = coordAllocations ? readCoordDataAndFree(module, coordAllocations) : null;
    const value = decodeCallResult(module, rawResult, {
      projReturns,
      args,
      outParamAllocs,
      paramsPtrLocal,
      structParamsDestroy,
      structDestroyFn,
      structFields
    });
    return coordAllocations ? { result: value, coordData } : value;
  },
  // heapHelpers supplies malloc/free/heap*_get/heap*_set/get_value/
  // set_value/string_to_utf8/utf8_to_string/utf8_byte_length. heap*_get
  // returns a typed-array slice, which structured clone moves without
  // per-element boxing.
  ...heapHelpers(() => module),
  read_string_array: async (ptr, _count) => readStringArray(module, ptr),
  // Releases this handler's reference on the fetch worker that init spawned.
  shutdown: shutdownMethod
};
var destroy = moduleDestroy;
async function init(initArgs, ctx) {
  const args = initArgs ?? {};
  if (!args.dbBytes) {
    throw new Error("proj-handler.create: missing required initArgs.dbBytes");
  }
  await installNodeXhrPolyfill();
  module = await loadProjModule();
  ctx?.attachEmscriptenModule?.(module);
  installProjNetCallbacks();
  const files = { "proj.db": args.dbBytes };
  if (args.iniBytes)
    files["proj.ini"] = args.iniBytes;
  stageFiles(module, files, "/proj");
  logLevel = Number(args.logLevel ?? 0);
  logCallbackPtr = module.addFunction((_userData, level, msgPtr) => {
    const msg = module.UTF8ToString(msgPtr);
    const levelName = level === PJ_LOG_ERROR ? "ERROR" : level === PJ_LOG_DEBUG ? "DEBUG" : level === PJ_LOG_TRACE ? "TRACE" : `L${level}`;
    if (level === PJ_LOG_ERROR || logLevel >= 2) {
      console.log(`[PROJ ${levelName}] ${msg}`);
    }
  }, "viii");
}
__name(init, "init");

// node_modules/.pnpm/proj-wasm@0.1.0-alpha10/node_modules/proj-wasm/dist/proj-handler.mjs
var busyMethods = ["context_create", "set_log_level", "ccall", "malloc", "heapf64_set", "heapf64_get", "read_string_array", "heapu8_set", "heapu8_get", "string_to_utf8", "utf8_to_string"];
var destroyMethods = ["context_destroy", "free", "shutdown"];
var destroyFns = ["proj_celestial_body_list_destroy", "proj_context_destroy", "proj_crs_info_list_destroy", "proj_destroy", "proj_get_crs_list_parameters_destroy", "proj_insert_object_session_destroy", "proj_int_list_destroy", "proj_list_destroy", "proj_operation_factory_context_destroy", "proj_string_destroy", "proj_string_list_destroy", "proj_unit_list_destroy"];
var methods2 = {
  context_create: methods.context_create,
  set_log_level: methods.set_log_level,
  context_destroy: methods.context_destroy,
  ccall: methods.ccall,
  malloc: methods.malloc,
  free: methods.free,
  heapf64_set: methods.heapf64_set,
  heapf64_get: methods.heapf64_get,
  read_string_array: methods.read_string_array,
  heapu8_set: methods.heapu8_set,
  heapu8_get: methods.heapu8_get,
  string_to_utf8: methods.string_to_utf8,
  utf8_to_string: methods.utf8_to_string,
  shutdown: methods.shutdown
};
var fingerprint = byteLengthFingerprint(
  ["dbBytes", "iniBytes", "logLevel"],
  null
);
var create = makeHandler({
  init,
  methods: methods2,
  busyMethods,
  destroyMethods,
  fingerprint
});
var proj_handler_default = create;
var destroy2 = destroy;
export {
  create,
  proj_handler_default as default,
  destroy2 as destroy,
  destroyFns,
  create as handler
};
