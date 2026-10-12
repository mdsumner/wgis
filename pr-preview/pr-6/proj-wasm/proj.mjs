// node_modules/.pnpm/squint-cljs@0.14.208/node_modules/squint-cljs/src/squint/core.js
function __toFn(x) {
  if (x == null || typeof x === "function") return x;
  if (typeof x === "string") return (coll, d) => get(coll, x, d);
  switch (typeConst(x)) {
    case MAP_TYPE:
    case ARRAY_TYPE:
    case OBJECT_TYPE:
    case SET_TYPE:
      return (k, d) => get(x, k, d);
    case INSTANCE_TYPE:
      if (x[ILookup__lookup] !== void 0) return (k, d) => get(x, k, d);
  }
  return x;
}
var has = Object.prototype.hasOwnProperty;
function findKey(iter, tar, key) {
  for (key of iter.keys()) {
    if (dequal(key, tar)) return key;
  }
}
function isSortedMap(m) {
  return m != null && m[SORTED_TAG] === true && m[TYPE_TAG] === MAP_TYPE;
}
function isSetLike(s) {
  return s != null && (s instanceof Set || s[TYPE_TAG] === SET_TYPE);
}
function isMapLike(m) {
  return m != null && typeof m === "object" && (m.constructor === Object || m instanceof Map || m[TYPE_TAG] === MAP_TYPE);
}
function mapHas(m, k) {
  return m instanceof Map || m[TYPE_TAG] === MAP_TYPE ? m.has(k) : has.call(m, k);
}
function mapGet(m, k) {
  return m instanceof Map || m[TYPE_TAG] === MAP_TYPE ? m.get(k) : m[k];
}
function mapCount(m) {
  return m instanceof Map || m[TYPE_TAG] === MAP_TYPE ? m.size : Object.keys(m).length;
}
function dequalSameCtor(foo, bar, ctor) {
  var len;
  if (ctor === Array) {
    if ((len = foo.length) === bar.length) {
      while (len-- && dequal(foo[len], bar[len])) ;
    }
    return len === -1;
  }
  len = 0;
  for (const k in foo) {
    if (has.call(foo, k) && ++len && !has.call(bar, k)) return false;
    if (!(k in bar) || !dequal(foo[k], bar[k])) return false;
  }
  return Object.keys(bar).length === len;
}
function dequal(foo, bar) {
  if (foo === bar) return true;
  if (foo == null) return bar == null;
  if (bar == null) return false;
  if (typeof foo !== "object" || typeof bar !== "object") return false;
  var ctor = foo.constructor, tmp;
  if (ctor === bar.constructor && (ctor === Object || ctor === Array)) {
    return dequalSameCtor(foo, bar, ctor);
  }
  if (typeof foo === "object" && foo[IEquiv__equiv] !== void 0) return !!foo[IEquiv__equiv](foo, bar);
  if (typeof bar === "object" && bar[IEquiv__equiv] !== void 0) return !!bar[IEquiv__equiv](bar, foo);
  const fooSorted = isSortedMap(foo);
  if (fooSorted || isSortedMap(bar)) {
    const sm = fooSorted ? foo : bar;
    const other = sm === foo ? bar : foo;
    if (!isMapLike(other) || mapCount(sm) !== mapCount(other)) return false;
    for (const k of sm.keys()) {
      if (!mapHas(other, k) || !dequal(sm.get(k), mapGet(other, k))) return false;
    }
    return true;
  }
  if (isMapLike(foo) && isMapLike(bar) && foo.constructor !== bar.constructor) {
    if (mapCount(foo) !== mapCount(bar)) return false;
    for (const k of foo instanceof Map ? foo.keys() : Object.keys(foo)) {
      if (!mapHas(bar, k) || !dequal(mapGet(foo, k), mapGet(bar, k))) return false;
    }
    return true;
  }
  if (isSetLike(foo) || isSetLike(bar)) {
    if (!isSetLike(foo) || !isSetLike(bar) || foo.size !== bar.size) return false;
    for (let e of foo) {
      if (e && typeof e === "object") {
        e = findKey(bar, e);
        if (!e) return false;
      }
      if (!bar.has(e)) return false;
    }
    return true;
  }
  if (foo && bar && ctor === bar.constructor) {
    if (ctor === Date) return foo.getTime() === bar.getTime();
    if (ctor === RegExp) return false;
    if (ctor === Map) {
      if (foo.size !== bar.size) {
        return false;
      }
      for (const kv of foo) {
        tmp = kv[0];
        if (tmp && typeof tmp === "object") {
          tmp = findKey(bar, tmp);
          if (!tmp) return false;
        }
        if (!dequal(kv[1], bar.get(tmp))) {
          return false;
        }
      }
      return true;
    }
    if ((!ctor || typeof foo === "object") && foo[TYPE_TAG] !== LAZY_ITERABLE_TYPE) {
      return dequalSameCtor(foo, bar, Object);
    }
  }
  if (foo && bar && (Array.isArray(foo) || foo[TYPE_TAG] === LAZY_ITERABLE_TYPE) && (Array.isArray(bar) || bar[TYPE_TAG] === LAZY_ITERABLE_TYPE)) {
    const fi = foo[Symbol.iterator]();
    const bi = bar[Symbol.iterator]();
    for (; ; ) {
      const a = fi.next();
      const b = bi.next();
      if (a.done || b.done) return !!(a.done && b.done);
      if (!dequal(a.value, b.value)) return false;
    }
  }
  return false;
}
function walkArray(arr, comp2) {
  return arr.every(function(x, i) {
    return i === 0 || comp2(arr[i - 1], x);
  });
}
function _EQ_(...xs) {
  return walkArray(xs, (x, y) => dequal(x, y));
}
function mapAssocMut(m, k, v) {
  m.set(k, v);
  return m;
}
function objAssocMut(m, k, v) {
  m[k] = v;
  return m;
}
function getAssocMut(m) {
  switch (typeConst(m)) {
    case MAP_TYPE:
      return mapAssocMut;
    case ARRAY_TYPE:
    case OBJECT_TYPE:
    case INSTANCE_TYPE:
      return objAssocMut;
  }
}
function validateArrayKeys(o, k, kvs) {
  let len = o.length;
  for (let i = 0; i < kvs.length + 2; i += 2) {
    const key = i === 0 ? k : kvs[i - 2];
    if (!Number.isInteger(key)) {
      throw new Error("Vector's key for assoc must be a number.");
    }
    if (key < 0 || key > len) {
      throw new Error(`Index ${key} out of bounds [0,${len}]`);
    }
    if (key === len) len++;
  }
}
function assoc_BANG_(m, k, v, ...kvs) {
  if (arguments.length < 3 || kvs.length % 2 !== 0) {
    throw new Error("Illegal argument: assoc expects an odd number of arguments.");
  }
  switch (typeConst(m)) {
    case MAP_TYPE:
      m.set(k, v);
      for (let i = 0; i < kvs.length; i += 2) {
        m.set(kvs[i], kvs[i + 1]);
      }
      break;
    case ARRAY_TYPE:
      validateArrayKeys(m, k, kvs);
      m[k] = v;
      for (let i = 0; i < kvs.length; i += 2) {
        m[kvs[i]] = kvs[i + 1];
      }
      break;
    case INSTANCE_TYPE:
      if (m[ITransientAssociative__assoc_BANG_] !== void 0) {
        let ret = m[ITransientAssociative__assoc_BANG_](m, k, v);
        for (let i = 0; i < kvs.length; i += 2) {
          ret = ret[ITransientAssociative__assoc_BANG_](ret, kvs[i], kvs[i + 1]);
        }
        return ret;
      }
    // fall through: an instance without -assoc! keeps the object behavior
    case OBJECT_TYPE:
      m[k] = v;
      for (let i = 0; i < kvs.length; i += 2) {
        m[kvs[i]] = kvs[i + 1];
      }
      break;
    default:
      throw new Error(
        `Illegal argument: assoc! expects a Map, Array, or Object as the first argument, but got ${typeof m}.`
      );
  }
  return m;
}
function copyMeta(from, to) {
  const f = from?.[IMeta__meta];
  if (f !== void 0) {
    to[IMeta__meta] = f;
    to[IWithMeta__with_meta] = from[IWithMeta__with_meta];
  }
  return to;
}
function copy(o) {
  switch (typeConst(o)) {
    case MAP_TYPE:
      return copyMeta(o, new o.constructor(o));
    case SET_TYPE:
      return copyMeta(o, new o.constructor(o));
    case ARRAY_TYPE:
      return copyMeta(o, [...o]);
    case INSTANCE_TYPE:
    case OBJECT_TYPE:
      return copyMeta(o, { ...o });
    case LIST_TYPE:
      return copyMeta(o, new List(...o));
    default:
      throw new Error(`Don't know how to copy object of type ${typeof o}.`);
  }
}
function assoc(o, k, v, ...kvs) {
  if (arguments.length < 3 || kvs.length % 2 !== 0) {
    throw new Error("Illegal argument: assoc expects an odd number of arguments.");
  }
  if (o == null) {
    o = {};
  }
  if (!isObj(o) && !Array.isArray(o) && o[IAssociative__assoc] !== void 0) {
    let ret2 = o[IAssociative__assoc](o, k, v);
    for (let i = 0; i < kvs.length; i += 2) {
      ret2 = ret2[IAssociative__assoc](ret2, kvs[i], kvs[i + 1]);
    }
    return ret2;
  }
  const ret = copy(o);
  assoc_BANG_(ret, k, v, ...kvs);
  return ret;
}
function seq_to_map_for_destructuring(s) {
  const arr = Array.isArray(s) ? s : [...iterable(s)];
  const n = arr.length;
  if (n < 2) return n ? arr[0] : {};
  const m = {};
  for (let i = 0; i < n; i += 2) {
    if (i === n - 1) for (const [k, v] of iterable(arr[i])) m[k] = v;
    else m[arr[i]] = arr[i + 1];
  }
  return m;
}
var MAP_TYPE = 1;
var ARRAY_TYPE = 2;
var OBJECT_TYPE = 3;
var LIST_TYPE = 4;
var SET_TYPE = 5;
var LAZY_ITERABLE_TYPE = 6;
var INSTANCE_TYPE = 7;
var TYPE_TAG = /* @__PURE__ */ Symbol.for("squint.core/type");
var SORTED_TAG = /* @__PURE__ */ Symbol.for("squint.core/sorted");
// @__NO_SIDE_EFFECTS__
function defclass(c) {
  return c;
}
function emptyOfType(type2) {
  switch (type2) {
    case MAP_TYPE:
      return /* @__PURE__ */ new Map();
    case ARRAY_TYPE:
      return [];
    case OBJECT_TYPE:
      return {};
    // Object.create?
    case LIST_TYPE:
      return new List();
    case SET_TYPE:
      return /* @__PURE__ */ new Set();
    case LAZY_ITERABLE_TYPE:
      return lazy(function* () {
        return;
      });
  }
  return void 0;
}
function isObj(coll) {
  return coll.constructor === Object;
}
function isVectorArray(x) {
  return Array.isArray(x) && x[TYPE_TAG] !== LIST_TYPE;
}
function object_QMARK_(coll) {
  return coll != null && isObj(coll);
}
function typeConst(obj) {
  if (obj == null) {
    return void 0;
  }
  if (isObj(obj)) {
    return OBJECT_TYPE;
  }
  if (obj instanceof Map) return MAP_TYPE;
  if (obj instanceof Set) return SET_TYPE;
  const tag = obj[TYPE_TAG];
  if (tag !== void 0) return tag;
  if (isVectorArray(obj)) return ARRAY_TYPE;
  if (typeof obj === "object") return INSTANCE_TYPE;
  return void 0;
}
function assoc_in_with(f, fname, o, keys, value) {
  keys = vec(keys);
  o = o || {};
  const baseType = typeConst(o);
  if (baseType !== MAP_TYPE && baseType !== ARRAY_TYPE && baseType !== OBJECT_TYPE && baseType !== INSTANCE_TYPE)
    throw new Error(
      `Illegal argument: ${fname} expects the first argument to be a Map, Array, or Object.`
    );
  const chain = [o];
  let lastInChain = o;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const k = keys[i];
    let chainValue;
    if (lastInChain instanceof Map) chainValue = lastInChain.get(k);
    else if (lastInChain != null && lastInChain[ILookup__lookup] !== void 0) {
      chainValue = lastInChain[ILookup__lookup](lastInChain, k, void 0);
    } else chainValue = lastInChain[k];
    if (!chainValue) {
      chainValue = emptyOfType(baseType) ?? {};
    }
    chain.push(chainValue);
    lastInChain = chainValue;
  }
  chain.push(value);
  for (let i = chain.length - 2; i >= 0; i -= 1) {
    chain[i] = f(chain[i], keys[i], chain[i + 1]);
  }
  return chain[0];
}
function assoc_in(o, keys, value) {
  return assoc_in_with(assoc, "assoc-in", o, keys, value);
}
function conj_BANG_set(o, rest2) {
  for (const x of rest2) {
    o.add(x);
  }
  return o;
}
function conj_BANG_(...xs) {
  const n = xs.length;
  if (n === 0) {
    return vector();
  }
  if (n === 1) {
    return xs[0];
  }
  let o = xs[0];
  if (o === null || o === void 0) {
    o = [];
  }
  if (n === 2) {
    switch (typeConst(o)) {
      case ARRAY_TYPE:
        o.push(xs[1]);
        return o;
      case SET_TYPE:
        o.add(xs[1]);
        return o;
    }
  }
  const rest2 = xs.slice(1);
  switch (typeConst(o)) {
    case SET_TYPE:
      conj_BANG_set(o, rest2);
      break;
    case LIST_TYPE:
      o.unshift(...rest2.reverse());
      break;
    case ARRAY_TYPE:
      o.push(...rest2);
      break;
    case MAP_TYPE:
      for (const x of rest2) {
        if (isVectorArray(x)) {
          asMapEntry(x);
          o.set(x[0], x[1]);
        } else for (const kv of mapEntriesOf(x)) o.set(kv[0], kv[1]);
      }
      break;
    case INSTANCE_TYPE:
      if (o[ITransientCollection__conj_BANG_] !== void 0) {
        let acc = o[ITransientCollection__conj_BANG_](o, rest2[0]);
        for (let i = 1; i < rest2.length; i++) acc = conj_BANG_(acc, rest2[i]);
        return acc;
      }
    // fall through: an instance without -conj! keeps the object behavior
    case OBJECT_TYPE:
      for (const x of rest2) {
        if (isVectorArray(x)) {
          asMapEntry(x);
          o[x[0]] = x[1];
        } else for (const kv of mapEntriesOf(x)) o[kv[0]] = kv[1];
      }
      break;
    default:
      throw new Error(
        "Illegal argument: conj! expects a Set, Array, List, Map, or Object as the first argument."
      );
  }
  return o;
}
function* mapEntriesOf(x) {
  if (isMapLike(x)) {
    yield* iterable(x);
    return;
  }
  for (const kv of iterable(x)) {
    if (!isVectorArray(kv)) {
      throw new Error("conj on a map takes map entries or seqables of map entries");
    }
    yield kv;
  }
}
function asMapEntry(x) {
  if (x.length < 2) {
    throw new Error("Vector arg to map conj must be a pair");
  }
  return x;
}
function conj(...xs) {
  if (xs.length === 0) {
    return vector();
  }
  const [_o, ...rest2] = xs;
  if (rest2.length === 0) return _o;
  let o = _o;
  if (o === null || o === void 0) {
    o = list();
  }
  let m, o2;
  switch (typeConst(o)) {
    case SET_TYPE:
      if (o[SORTED_TAG]) {
        return copyMeta(o, conj_BANG_set(new o.constructor(o), rest2));
      } else {
        return copyMeta(o, new o.constructor([...o, ...rest2]));
      }
    case LIST_TYPE:
      return copyMeta(o, new List(...rest2.reverse(), ...o));
    case ARRAY_TYPE:
      return copyMeta(o, [...o, ...rest2]);
    case MAP_TYPE:
      m = new Map(o);
      for (const x of rest2) {
        if (isVectorArray(x)) {
          asMapEntry(x);
          m.set(x[0], x[1]);
        } else for (const kv of mapEntriesOf(x)) m.set(kv[0], kv[1]);
      }
      return copyMeta(o, m);
    case LAZY_ITERABLE_TYPE:
      return lazy(function* () {
        yield* rest2;
        yield* o;
      });
    case INSTANCE_TYPE:
      if (o[ICollection__conj] !== void 0) {
        o2 = o[ICollection__conj](o, rest2[0]);
        for (let i = 1; i < rest2.length; i++) o2 = conj(o2, rest2[i]);
        return o2;
      }
    // fall through: an instance without -conj keeps the object behavior
    case OBJECT_TYPE:
      o2 = { ...o };
      for (const x of rest2) {
        if (isVectorArray(x)) {
          asMapEntry(x);
          o2[x[0]] = x[1];
        } else for (const kv of mapEntriesOf(x)) o2[kv[0]] = kv[1];
      }
      return copyMeta(o, o2);
    default:
      throw new Error(
        "Illegal argument: conj expects a Set, Array, List, Map, or Object as the first argument."
      );
  }
}
function disj_BANG_(s, ...xs) {
  if (s != null && s[ITransientSet__disjoin_BANG_] !== void 0) {
    let ret = s;
    for (const x of xs) {
      ret = ret != null && ret[ITransientSet__disjoin_BANG_] !== void 0 ? ret[ITransientSet__disjoin_BANG_](ret, x) : disj_BANG_(ret, x);
    }
    return ret;
  }
  for (const x of xs) {
    s.delete(x);
  }
  return s;
}
function disj(s, ...xs) {
  if (s == null) return s;
  if (xs.length === 0) return s;
  if (s[ISet__disjoin] !== void 0) {
    let ret = s[ISet__disjoin](s, xs[0]);
    for (let i = 1; i < xs.length; i++) ret = disj(ret, xs[i]);
    return ret;
  }
  const s1 = new s.constructor(s);
  return copyMeta(s, disj_BANG_(s1, ...xs));
}
function contains_QMARK_(coll, v) {
  if (typeof coll === "string") {
    return int_QMARK_(v) && v >= 0 && v < coll.length;
  }
  switch (typeConst(coll)) {
    case SET_TYPE:
    case MAP_TYPE:
      return coll.has(v);
    case void 0:
      return false;
    case INSTANCE_TYPE:
      if (coll[IAssociative__contains_key_QMARK_] !== void 0) {
        return coll[IAssociative__contains_key_QMARK_](coll, v);
      }
    // fall through
    default:
      return v in coll;
  }
}
function dissoc(m, ...ks) {
  if (!m) return;
  if (ks.length === 0) return m;
  const tc = typeConst(m);
  if (tc !== MAP_TYPE && tc !== OBJECT_TYPE && tc !== INSTANCE_TYPE) {
    throw new Error("dissoc expects a map, got: " + typeof m);
  }
  if (tc === INSTANCE_TYPE && m[IMap__dissoc] !== void 0) {
    let ret = m;
    for (const k of ks) {
      if (ret == null) return ret;
      ret = ret[IMap__dissoc] !== void 0 ? ret[IMap__dissoc](ret, k) : dissoc(ret, k);
    }
    return ret;
  }
  if (tc === MAP_TYPE) {
    let present2 = false;
    for (const k of ks) if (m.has(k)) {
      present2 = true;
      break;
    }
    if (!present2) return m;
    const m22 = copy(m);
    for (const k of ks) m22.delete(k);
    return m22;
  }
  let present = false;
  for (const k of ks) if (k in m) {
    present = true;
    break;
  }
  if (!present) return m;
  const m2 = copy(m);
  for (const k of ks) delete m2[k];
  return m2;
}
function inc(n) {
  return n + 1;
}
function nth(coll, idx, orElse) {
  if (typeof idx !== "number") {
    throw new Error("Index argument to nth must be a number");
  }
  const hasDefault = arguments.length > 2;
  if (coll == null) return hasDefault ? orElse : null;
  if (Array.isArray(coll)) {
    if (idx >= 0 && idx < coll.length) {
      return coll[idx];
    }
  } else if (coll[IIndexed__nth] !== void 0) {
    return hasDefault ? coll[IIndexed__nth](coll, idx, orElse) : coll[IIndexed__nth](coll, idx);
  } else if (idx >= 0) {
    const next2 = chunkCursor(coll);
    let base = 0;
    let ch;
    while ((ch = next2()) !== null) {
      if (idx < base + ch.length) return ch[idx - base];
      base += ch.length;
    }
  }
  if (hasDefault) return orElse;
  throw new Error("Index out of bounds: " + idx);
}
function get(coll, key, otherwise = void 0) {
  if (coll == null) {
    return otherwise;
  }
  let v;
  if (isObj(coll)) {
    v = coll[key];
    if (v === void 0) {
      return otherwise;
    } else {
      return v;
    }
  }
  let g;
  switch (typeConst(coll)) {
    case SET_TYPE:
      if (coll.has(key)) v = key;
      break;
    case MAP_TYPE:
      v = coll.get(key);
      break;
    case ARRAY_TYPE:
      v = coll[key];
      break;
    default:
      if (coll[ILookup__lookup] !== void 0) {
        v = coll[ILookup__lookup](coll, key, otherwise);
        return v === void 0 ? otherwise : v;
      }
      g = coll["get"];
      if (typeof g === "function") {
        try {
          v = coll.get(key);
          break;
        } catch (e) {
        }
      }
      v = coll[key];
      break;
  }
  return v !== void 0 ? v : otherwise;
}
function sequential_QMARK_(x) {
  return Array.isArray(x) || x?.[TYPE_TAG] === LAZY_ITERABLE_TYPE || x != null && x[IVector.__sym] !== void 0;
}
function seqable_QMARK_(x) {
  return x === null || x === void 0 || // plain objects (squint maps) are seqable via Object.entries in `iterable`,
  // even though they lack Symbol.iterator.
  object_QMARK_(x) || // we used to check instanceof Object but this returns false for TC39 Records
  // also we used to write `Symbol.iterator in` but this does not work for strings and some other types
  !!x[Symbol.iterator] || !!x[ISEQABLE_SYM];
}
var MAP_ENTRY = /* @__PURE__ */ Symbol.for("squint.core/map-entry");
function tagMapEntry(e) {
  e[MAP_ENTRY] = true;
  return e;
}
function iterable(x) {
  if (x === null || x === void 0) {
    return [];
  }
  if (x[Symbol.iterator]) {
    return x;
  }
  if (x[ISeqable__seq] !== void 0) return iterable(x[ISeqable__seq](x));
  if (isObj(x)) return Object.entries(x).map(tagMapEntry);
  throw new TypeError(`${x} is not iterable`);
}
var IIterable = /* @__PURE__ */ Symbol.for("squint.core/IIterable");
function _iterator(coll) {
  return coll[Symbol.iterator]();
}
var es6_iterator = _iterator;
function seq(x) {
  if (x == null) return x;
  if (!seqable_QMARK_(x)) throw new TypeError(x + " is not ISeqable");
  if (typeof x === "string") return x.length ? [...x] : null;
  const iter = iterable(x);
  if (iter.length === 0 || iter.size === 0) {
    return null;
  }
  if (iter instanceof Set || iter[TYPE_TAG] === SET_TYPE) {
    return [...iter];
  }
  if (iter instanceof Map || iter[TYPE_TAG] === MAP_TYPE) {
    return [...iter].map(tagMapEntry);
  }
  if (iter[IMap__dissoc] !== void 0) {
    const entries = [...iter].map(tagMapEntry);
    return entries.length === 0 ? null : entries;
  }
  const _i = iter[Symbol.iterator]();
  if (_i.next().done) return null;
  return iter;
}
function first(coll) {
  if (coll == null) return void 0;
  if (Array.isArray(coll)) return coll[0];
  if (coll instanceof LazyIterable) {
    coll.force();
    return coll.chunk === null ? void 0 : coll.chunk[0];
  }
  const [first2] = iterable(coll);
  return first2;
}
function rest(coll) {
  const cell = chunkCells(coll);
  cell.force();
  const ch = cell.chunk;
  if (ch === null) return cell;
  if (ch.length > 1) {
    const c = new LazyIterable(null);
    c.realized = true;
    c.chunk = ch.slice(1);
    c._rest = cell._rest;
    return c;
  }
  return cell._rest;
}
var REDUCED_DEREF = (self) => self.value;
var Reduced = class {
  value;
  constructor(x) {
    this.value = x;
    this[IDeref__deref] = REDUCED_DEREF;
  }
};
function reduced(x) {
  return new Reduced(x);
}
function reduced_QMARK_(x) {
  return x instanceof Reduced;
}
function reduce(f, arg1, arg2) {
  f = __toFn(f);
  const hasInit = arguments.length !== 2;
  const coll = hasInit ? arg2 : arg1;
  let val2 = hasInit ? arg1 : void 0;
  if (Array.isArray(coll)) {
    let i2 = 0;
    if (!hasInit) {
      if (coll.length === 0) return f();
      val2 = coll[0];
      i2 = 1;
    }
    if (val2 instanceof Reduced) return val2.value;
    for (; i2 < coll.length; i2++) {
      val2 = f(val2, coll[i2]);
      if (val2 instanceof Reduced) return val2.value;
    }
    return val2;
  }
  const next2 = chunkCursor(coll);
  let ch = next2();
  let i = 0;
  if (!hasInit) {
    if (ch === null) return f();
    val2 = ch[0];
    i = 1;
  }
  if (val2 instanceof Reduced) return val2.value;
  while (ch !== null) {
    for (; i < ch.length; i++) {
      val2 = f(val2, ch[i]);
      if (val2 instanceof Reduced) return val2.value;
    }
    ch = next2();
    i = 0;
  }
  return val2;
}
var CHUNK_SIZE = 32;
var LazyIterable = /* @__PURE__ */ defclass(
  class LazyIterable2 {
    constructor(step) {
      this[TYPE_TAG] = LAZY_ITERABLE_TYPE;
      this[IIterable] = true;
      this.step = step;
      this.realized = false;
      this.chunk = null;
      this._rest = null;
    }
    force() {
      if (!this.realized) {
        this.realized = true;
        const r = this.step();
        this.step = null;
        if (r !== null && r !== void 0) {
          this.chunk = r[0];
          this._rest = new LazyIterable2(r[1]);
        }
      }
      return this;
    }
    [Symbol.iterator]() {
      let cell = this;
      let i = 0;
      return {
        next() {
          for (; ; ) {
            cell.force();
            const ch = cell.chunk;
            if (ch === null) return { value: void 0, done: true };
            if (i < ch.length) return { value: ch[i++], done: false };
            cell = cell._rest;
            i = 0;
          }
        },
        [Symbol.iterator]() {
          return this;
        }
      };
    }
    // Mirrors Array.prototype.indexOf so lazy seqs support (.indexOf coll x):
    // reference equality, returns -1 when absent. Unlike cljs.core, not by value.
    indexOf(x, fromIndex = 0) {
      let i = 0;
      for (const v of this) {
        if (i >= fromIndex && v === x) return i;
        i++;
      }
      return -1;
    }
  }
);
function unchunkedSteps(iter) {
  const step = () => {
    const r = iter.next();
    return r.done ? null : [[r.value], step];
  };
  return step;
}
function lazy(f) {
  return new LazyIterable(unchunkedSteps(f()));
}
function lazyIter(coll, gen) {
  const it = es6_iterator(iterable(coll));
  return lazy(() => gen(it));
}
function chunkCells(coll) {
  if (coll instanceof LazyIterable) return coll;
  if (Array.isArray(coll)) {
    const step = (pos) => () => {
      if (pos >= coll.length) return null;
      const end = Math.min(pos + CHUNK_SIZE, coll.length);
      return [coll.slice(pos, end), step(end)];
    };
    return new LazyIterable(step(0));
  }
  return new LazyIterable(unchunkedSteps(es6_iterator(iterable(coll))));
}
function chunkCursor(coll) {
  if (coll instanceof LazyIterable) {
    let cell = coll;
    return () => {
      if (cell === null) return null;
      cell.force();
      const ch = cell.chunk;
      cell = ch === null ? null : cell._rest;
      return ch;
    };
  }
  const it = es6_iterator(iterable(coll));
  return () => {
    const b = [];
    for (let i = 0; i < CHUNK_SIZE; i++) {
      const r = it.next();
      if (r.done) break;
      b.push(r.value);
    }
    return b.length === 0 ? null : b;
  };
}
function mapChunks(coll, xf) {
  const src = chunkCells(coll);
  const step = (cell, base) => () => {
    let c = cell;
    let b = base;
    for (; ; ) {
      c.force();
      const ch = c.chunk;
      if (ch === null) return null;
      const out = xf(ch, b);
      const rest2 = c._rest;
      b += ch.length;
      if (out.length !== 0) return [out, step(rest2, b)];
      c = rest2;
    }
  };
  return new LazyIterable(step(src, 0));
}
var Cons = /* @__PURE__ */ defclass(
  class Cons2 {
    constructor(x, coll) {
      this[TYPE_TAG] = LAZY_ITERABLE_TYPE;
      this.x = x;
      this.coll = coll;
    }
    [Symbol.iterator]() {
      const x = this.x;
      let coll = this.coll;
      let started = false;
      let it = null;
      return {
        next() {
          if (!started) {
            started = true;
            return { value: x, done: false };
          }
          if (!it) {
            it = es6_iterator(iterable(coll));
            coll = null;
          }
          return it.next();
        },
        [Symbol.iterator]() {
          return this;
        }
      };
    }
  }
);
function cons(x, coll) {
  if (!seqable_QMARK_(coll)) throw new TypeError(coll + " is not ISeqable");
  return new Cons(x, coll);
}
function map(f, ...colls) {
  f = __toFn(f);
  switch (colls.length) {
    case 0:
      return (rf) => {
        return (...args) => {
          switch (args.length) {
            case 0: {
              return rf();
            }
            case 1: {
              return rf(args[0]);
            }
            case 2: {
              return rf(args[0], f(args[1]));
            }
            default: {
              return rf(args[0], f(...args.slice(1)));
            }
          }
        };
      };
    case 1:
      return mapChunks(colls[0], (ch) => {
        const out = new Array(ch.length);
        for (let i = 0; i < ch.length; i++) out[i] = f(ch[i]);
        return out;
      });
    default: {
      const iters = colls.map((coll) => es6_iterator(iterable(coll)));
      return lazy(function* () {
        while (true) {
          const args = [];
          for (const i of iters) {
            const nextVal = i.next();
            if (nextVal.done) {
              return;
            }
            args.push(nextVal.value);
          }
          yield f(...args);
        }
      });
    }
  }
}
function transducer(step) {
  return (rf) => {
    const s = step(rf);
    return (...args) => args.length === 0 ? rf() : args.length === 1 ? rf(args[0]) : s(args[0], args[1]);
  };
}
function filter1(pred) {
  return transducer((rf) => (r, x) => truth_(pred(x)) ? rf(r, x) : r);
}
function filter(pred, coll) {
  if (arguments.length === 1) {
    return filter1(pred);
  }
  pred = __toFn(pred);
  return mapChunks(coll, (ch) => {
    const out = [];
    for (let i = 0; i < ch.length; i++) {
      const x = ch[i];
      if (truth_(pred(x))) out.push(x);
    }
    return out;
  });
}
function filterv(pred, coll) {
  return pushAll([], filter(pred, coll));
}
function remove(pred, coll) {
  if (arguments.length === 1) {
    return filter1(complement(pred));
  }
  return filter(complement(pred), coll);
}
function keep_indexed2(f, coll) {
  f = __toFn(f);
  return mapChunks(coll, (ch, base) => {
    const out = [];
    for (let i = 0; i < ch.length; i++) {
      const v = f(base + i, ch[i]);
      if (truth_(v)) out.push(v);
    }
    return out;
  });
}
function keep_indexed1(f) {
  return transducer((rf) => {
    let ia = -1;
    return (r, x) => {
      const v = f(++ia, x);
      return v == null ? r : rf(r, v);
    };
  });
}
function keep_indexed(f, coll) {
  if (arguments.length === 1) {
    return keep_indexed1(f);
  } else {
    return keep_indexed2(f, coll);
  }
}
function str(...xs) {
  return xs.join("");
}
function name(x) {
  if (typeof x === "string") {
    const i = x.indexOf("/");
    return i >= 1 ? x.slice(i + 1) : x;
  }
  throw new Error("Doesn't support name: " + typeof x);
}
function not(expr) {
  return !truth_(expr);
}
var IATOM_SYM = /* @__PURE__ */ Symbol.for("squint.core/IAtom");
var IDEREF_SYM = /* @__PURE__ */ Symbol.for("squint.core/IDeref");
var ISEQABLE_SYM = /* @__PURE__ */ Symbol.for("squint.core/ISeqable");
var IDeref__deref = /* @__PURE__ */ Symbol.for("squint.core/-deref");
function _deref(o) {
  if (o != null && o[IDeref__deref] !== void 0) return o[IDeref__deref](o);
  return nilImpl(_deref, "IDeref.-deref", o)(o);
}
var ISeqable__seq = /* @__PURE__ */ Symbol.for("squint.core/-seq");
var ILookup__lookup = /* @__PURE__ */ Symbol.for("squint.core/-lookup");
var IAssociative__assoc = /* @__PURE__ */ Symbol.for("squint.core/-assoc");
var IAssociative__contains_key_QMARK_ = /* @__PURE__ */ Symbol.for("squint.core/-contains-key?");
var IMap = { __sym: /* @__PURE__ */ Symbol.for("squint.core/IMap") };
var IMap__dissoc = /* @__PURE__ */ Symbol.for("squint.core/-dissoc");
var ICounted__count = /* @__PURE__ */ Symbol.for("squint.core/-count");
var IKVReduce__kv_reduce = /* @__PURE__ */ Symbol.for("squint.core/-kv-reduce");
var ICollection__conj = /* @__PURE__ */ Symbol.for("squint.core/-conj");
var IEmptyableCollection__empty = /* @__PURE__ */ Symbol.for("squint.core/-empty");
var IEquiv__equiv = /* @__PURE__ */ Symbol.for("squint.core/-equiv");
var ISet__disjoin = /* @__PURE__ */ Symbol.for("squint.core/-disjoin");
var ITransientCollection__conj_BANG_ = /* @__PURE__ */ Symbol.for("squint.core/-conj!");
var ITransientAssociative__assoc_BANG_ = /* @__PURE__ */ Symbol.for("squint.core/-assoc!");
var ITransientSet__disjoin_BANG_ = /* @__PURE__ */ Symbol.for("squint.core/-disjoin!");
var IMeta__meta = /* @__PURE__ */ Symbol.for("squint.core/-meta");
var IWithMeta__with_meta = /* @__PURE__ */ Symbol.for("squint.core/-with-meta");
var M3_C1 = 3432918353 | 0;
var M3_C2 = 461845907 | 0;
var IIndexed__nth = /* @__PURE__ */ Symbol.for("squint.core/-nth");
var IVector = { __sym: /* @__PURE__ */ Symbol.for("squint.core/IVector") };
var IEncodeJS__clj__GT_js = /* @__PURE__ */ Symbol.for("squint.core/-clj->js");
function nilImpl(dispatchFn, protoMethod, o) {
  const f = dispatchFn[null];
  if (f === void 0) throw missing_protocol(protoMethod, o);
  return f;
}
var IReset = { __sym: /* @__PURE__ */ Symbol.for("squint.core/IReset") };
var IReset__reset_BANG_ = /* @__PURE__ */ Symbol.for("squint.core/-reset!");
function _reset_BANG_(o, v) {
  if (o != null && o[IReset__reset_BANG_] !== void 0) return o[IReset__reset_BANG_](o, v);
  return nilImpl(_reset_BANG_, "IReset.-reset!", o)(o, v);
}
var ISwap = { __sym: /* @__PURE__ */ Symbol.for("squint.core/ISwap") };
var ISwap__swap_BANG_ = /* @__PURE__ */ Symbol.for("squint.core/-swap!");
var IWatchable = { __sym: /* @__PURE__ */ Symbol.for("squint.core/IWatchable") };
var IWatchable__add_watch = /* @__PURE__ */ Symbol.for("squint.core/-add-watch");
var IWatchable__remove_watch = /* @__PURE__ */ Symbol.for("squint.core/-remove-watch");
var IWatchable__notify_watches = /* @__PURE__ */ Symbol.for("squint.core/-notify-watches");
var ATOM_DEREF = (self) => self.val;
var ATOM_RESET = (self, x) => {
  if (self._validator && !truth_(self._validator(x))) {
    throw new Error("Validator rejected reference state");
  }
  const old_val = self.val;
  self.val = x;
  if (self._hasWatches) {
    for (const [k, f] of Object.entries(self._watches)) f(k, self, old_val, x);
  }
  return x;
};
var ATOM_SWAP = function(self, f, a, b, xs) {
  switch (arguments.length) {
    case 2:
      return ATOM_RESET(self, f(self.val));
    case 3:
      return ATOM_RESET(self, f(self.val, a));
    case 4:
      return ATOM_RESET(self, f(self.val, a, b));
    default:
      return ATOM_RESET(self, f(self.val, a, b, ...xs));
  }
};
var ATOM_ADD_WATCH = (self, k, f) => {
  self._watches[k] = f;
  self._hasWatches = true;
};
var ATOM_REMOVE_WATCH = (self, k) => {
  delete self._watches[k];
};
var ATOM_NOTIFY = (self, oldv, newv) => {
  for (const [k, f] of Object.entries(self._watches)) f(k, self, oldv, newv);
};
var Atom = class {
  constructor(init2) {
    this.val = init2;
    this._watches = {};
    this._hasWatches = false;
    this[IATOM_SYM] = true;
    this[IDEREF_SYM] = true;
    this[IDeref__deref] = ATOM_DEREF;
    this[IReset.__sym] = true;
    this[IReset__reset_BANG_] = ATOM_RESET;
    this[ISwap.__sym] = true;
    this[ISwap__swap_BANG_] = ATOM_SWAP;
    this[IWatchable.__sym] = true;
    this[IWatchable__add_watch] = ATOM_ADD_WATCH;
    this[IWatchable__remove_watch] = ATOM_REMOVE_WATCH;
    this[IWatchable__notify_watches] = ATOM_NOTIFY;
  }
};
function atom(init2, ...opts) {
  const a = new Atom(init2);
  for (let i = 0; i < opts.length; i += 2) {
    if (opts[i] === "meta") {
      const mv = opts[i + 1];
      a[IMeta__meta] = () => mv;
    } else if (opts[i] === "validator") a._validator = opts[i + 1];
  }
  return a;
}
function missing_protocol(proto, obj) {
  let ty;
  if (obj === null) ty = "null";
  else if (obj === void 0) ty = "undefined";
  else if (Array.isArray(obj)) ty = "array";
  else if (typeof obj === "object" && obj.constructor && obj.constructor !== Object) {
    ty = obj.constructor.name;
  } else ty = typeof obj;
  return new Error(
    `No protocol method ${proto} defined for type ${ty}: ${obj ?? ""}`
  );
}
function deref(ref) {
  if (ref?.[IDeref__deref] !== void 0) return ref[IDeref__deref](ref);
  return nilImpl(_deref, "IDeref.-deref", ref)(ref);
}
function reset_BANG_(atm, v) {
  if (atm?.[IReset__reset_BANG_] !== void 0) return atm[IReset__reset_BANG_](atm, v);
  return nilImpl(_reset_BANG_, "IReset.-reset!", atm)(atm, v);
}
function swap_BANG_(atm, f, ...args) {
  f = __toFn(f);
  if (atm?.[ISwap__swap_BANG_] !== void 0) {
    switch (args.length) {
      case 0:
        return atm[ISwap__swap_BANG_](atm, f);
      case 1:
        return atm[ISwap__swap_BANG_](atm, f, args[0]);
      case 2:
        return atm[ISwap__swap_BANG_](atm, f, args[0], args[1]);
      default:
        return atm[ISwap__swap_BANG_](atm, f, args[0], args[1], args.slice(2));
    }
  }
  const v = f(deref(atm), ...args);
  reset_BANG_(atm, v);
  return v;
}
function compare_and_set_BANG_(atm, oldv, newv) {
  if (deref(atm) === oldv) {
    reset_BANG_(atm, newv);
    return true;
  } else {
    return false;
  }
}
function vector(...args) {
  return args;
}
var array = vector;
function vector_QMARK_(x) {
  if (x == null) return false;
  return isVectorArray(x) || x[IVector.__sym] !== void 0;
}
function mapv(...args) {
  if (args.length === 2) {
    const [_f, coll] = args;
    const f = __toFn(_f);
    const iter = iterable(coll);
    if (Array.isArray(iter)) {
      const ret = new Array(iter.length);
      for (var i = 0; i < iter.length; i++) {
        ret[i] = f(iter[i]);
      }
      return ret;
    } else {
      const ret = [];
      const next2 = chunkCursor(iter);
      let ch;
      while ((ch = next2()) !== null) {
        for (let i2 = 0; i2 < ch.length; i2++) ret.push(f(ch[i2]));
      }
      return ret;
    }
  }
  return [...map(...args)];
}
function pushAll(out, from) {
  if (from instanceof LazyIterable) {
    let cell = from;
    for (; ; ) {
      cell.force();
      const ch = cell.chunk;
      if (ch === null) return out;
      Array.prototype.push.apply(out, ch);
      cell = cell._rest;
    }
  }
  for (const x of iterable(from)) out.push(x);
  return out;
}
function toArray(coll) {
  if (coll instanceof LazyIterable) return pushAll([], coll);
  return [...iterable(coll)];
}
function vec(x) {
  if (isVectorArray(x)) return x;
  if (x != null && x[IVector.__sym] !== void 0) return x;
  return pushAll([], x);
}
function apply(f, ...args) {
  f = __toFn(f);
  const xs = args.slice(0, args.length - 1);
  const last = args[args.length - 1];
  const v = f.squint$lang$variadic;
  if (v) {
    const maxfa = v.length - 1;
    const fixed = [];
    let i = 0, rest2;
    for (; i < maxfa && i < xs.length; i++) fixed.push(xs[i]);
    if (i < maxfa) {
      let s = seq(last);
      for (; i < maxfa && s != null; i++) {
        fixed.push(first(s));
        s = next(s);
      }
      rest2 = s;
    } else {
      rest2 = i < xs.length ? concat1([xs.slice(i), last]) : last;
    }
    rest2 = rest2 == null ? null : seq(rest2);
    if (rest2 == null) return f(...fixed);
    return v(...fixed, rest2);
  }
  return f(...xs, ...iterable(last));
}
function complement(f) {
  f = __toFn(f);
  return (...args) => not(f(...args));
}
var List = class extends Array {
  constructor(...args) {
    super();
    this[TYPE_TAG] = LIST_TYPE;
    this.push(...args);
  }
};
function list(...args) {
  return new List(...args);
}
function array_QMARK_(x) {
  return Array.isArray(x);
}
var CONCAT_DONE = {};
function concat1(colls) {
  const isArr = Array.isArray(colls);
  const arr = isArr ? colls.slice() : null;
  const collIter = isArr ? null : es6_iterator(iterable(colls));
  let idx = 0;
  const nextColl = () => {
    if (isArr) {
      if (idx >= arr.length) return CONCAT_DONE;
      const c = arr[idx];
      arr[idx] = null;
      idx++;
      return c;
    }
    const r = collIter.next();
    return r.done ? CONCAT_DONE : r.value;
  };
  const step = (src) => () => {
    for (; ; ) {
      if (src !== null) {
        if (src instanceof LazyIterable) {
          src.force();
          if (src.chunk !== null) return [src.chunk, step(src._rest)];
          src = null;
        } else {
          const a = src.a;
          const pos = src.pos;
          if (pos < a.length) {
            const end = Math.min(pos + CHUNK_SIZE, a.length);
            return [a.slice(pos, end), step({ a, pos: end })];
          }
          src = null;
        }
      }
      const nc = nextColl();
      if (nc === CONCAT_DONE) return null;
      src = nc instanceof LazyIterable ? nc : Array.isArray(nc) ? { a: nc, pos: 0 } : chunkCells(nc);
    }
  };
  return new LazyIterable(step(null));
}
function identity(x) {
  return x;
}
function empty(coll) {
  const type2 = typeConst(coll);
  if (type2 != null) {
    if (type2 === INSTANCE_TYPE) {
      if (coll[IEmptyableCollection__empty] !== void 0) return coll[IEmptyableCollection__empty](coll);
      return coll.constructor === void 0 ? copyMeta(coll, {}) : null;
    }
    return copyMeta(coll, emptyOfType(type2));
  }
  return null;
}
function merge(...args) {
  if (!args.some(truth_)) return null;
  const firstArg = args[0];
  let obj;
  if (firstArg === null || firstArg === void 0) {
    obj = {};
  } else if (typeConst(firstArg) === void 0) {
    obj = firstArg;
  } else if (firstArg[ICollection__conj] !== void 0) {
    obj = firstArg;
  } else {
    obj = into(empty(firstArg), firstArg);
  }
  if (obj != null && obj[ICollection__conj] !== void 0) {
    for (let i = 1; i < args.length; i++) {
      obj = obj != null && obj[ICollection__conj] !== void 0 ? obj[ICollection__conj](obj, args[i]) : conj_BANG_(obj, args[i]);
    }
    return obj;
  }
  return conj_BANG_(obj, ...args.slice(1));
}
function val(entry) {
  return entry[1];
}
function into(...args) {
  let to, xform, from, c, rf;
  switch (args.length) {
    case 0:
      return [];
    case 1:
      return args[0];
    case 2:
      to = args[0] ?? [];
      if (isVectorArray(to)) {
        return pushAll(copy(to), args[1]);
      }
      if (to[ICollection__conj] !== void 0) {
        return reduce(
          (acc, x) => acc != null && acc[ICollection__conj] !== void 0 ? acc[ICollection__conj](acc, x) : conj_BANG_(acc, x),
          to,
          args[1]
        );
      }
      return reduce(conj_BANG_, copy(to), args[1]);
    case 3:
      to = args[0];
      xform = args[1];
      from = args[2];
      c = to != null && to[ICollection__conj] !== void 0 ? to : copy(to);
      rf = (coll, v) => {
        if (v === void 0) {
          return coll;
        }
        return coll != null && coll[ICollection__conj] !== void 0 ? coll[ICollection__conj](coll, v) : conj_BANG_(coll, v);
      };
      return transduce(xform, rf, c, from);
    default:
      throw TypeError(`Invalid arity call of into: ${args.length}`);
  }
}
function repeat(...args) {
  if (args.length == 0 || args.length > 2) {
    throw new Error(`Invalid arity: ${args.length}`);
  }
  if (args.length == 1) {
    const x2 = args[0];
    return lazy(function* () {
      while (true) yield x2;
    });
  }
  const [n, x] = args;
  return lazy(function* () {
    for (var i = 0; i < n; i++) yield x;
  });
}
function ensure_reduced(x) {
  if (reduced_QMARK_(x)) {
    return x;
  } else {
    return reduced(x);
  }
}
function take1(n) {
  return transducer((rf) => {
    let na = n;
    return (r, x) => {
      const nn = --na + 1;
      if (nn > 0) r = rf(r, x);
      return nn > 1 ? r : ensure_reduced(r);
    };
  });
}
function assertNumber(n) {
  if (typeof n !== "number") {
    throw new Error("Assert failed: (number? n)");
  }
  return n;
}
function take(n, coll) {
  assertNumber(n);
  if (arguments.length === 1) {
    return take1(n);
  }
  return lazyIter(coll, function* (it) {
    let i = n - 1;
    for (const x of it) {
      if (i-- >= 0) {
        yield x;
      }
      if (i < 0) {
        return;
      }
    }
  });
}
function update(coll, k, f, ...args) {
  f = __toFn(f);
  return assoc(coll, k, f(get(coll, k), ...args));
}
function get_in(coll, path, orElse) {
  let entry = coll;
  for (const item of iterable(path)) {
    entry = get(entry, item);
  }
  if (entry === void 0) return orElse;
  return entry;
}
function update_in(coll, path, f, ...args) {
  f = __toFn(f);
  return assoc_in(coll, path, f(get_in(coll, path), ...args));
}
function every_QMARK_(pred, coll) {
  pred = __toFn(pred);
  if (Array.isArray(coll)) {
    for (let i = 0; i < coll.length; i++) if (!pred(coll[i])) return false;
    return true;
  }
  const next2 = chunkCursor(coll);
  let ch;
  while ((ch = next2()) !== null) {
    for (let i = 0; i < ch.length; i++) if (!pred(ch[i])) return false;
  }
  return true;
}
function keep1(pred) {
  return transducer((rf) => (r, x) => {
    const v = pred(x);
    return v == null ? r : rf(r, v);
  });
}
function keep(pred, coll) {
  pred = __toFn(pred);
  if (arguments.length === 1) return keep1(pred);
  return mapChunks(coll, (ch) => {
    const out = [];
    for (let i = 0; i < ch.length; i++) {
      const res = pred(ch[i]);
      if (truth_(res)) out.push(res);
    }
    return out;
  });
}
function reverse(coll) {
  return toArray(coll).reverse();
}
function some(pred, coll) {
  pred = __toFn(pred);
  if (Array.isArray(coll)) {
    for (let i = 0; i < coll.length; i++) {
      const res = pred(coll[i]);
      if (truth_(res)) return res;
    }
    return void 0;
  }
  const next2 = chunkCursor(coll);
  let ch;
  while ((ch = next2()) !== null) {
    for (let i = 0; i < ch.length; i++) {
      const res = pred(ch[i]);
      if (truth_(res)) return res;
    }
  }
  return void 0;
}
function count(coll) {
  if (!coll) return 0;
  const len = coll.length || coll.size;
  if (typeof len === "number") {
    return len;
  }
  if (coll[ICounted__count] !== void 0) return coll[ICounted__count](coll);
  const next2 = chunkCursor(coll);
  let ret = 0;
  let ch;
  while ((ch = next2()) !== null) ret += ch.length;
  return ret;
}
function boolean$(x) {
  return truth_(x);
}
function js_obj(...args) {
  let ctr = 0;
  const ret = {};
  for (; ; ) {
    if (ctr >= args.length) {
      break;
    }
    ret[args[ctr]] = args[ctr + 1];
    ctr = ctr + 2;
  }
  return ret;
}
function reduce_kv(f, init2, m) {
  if (!m) {
    return init2;
  }
  if (m[IKVReduce__kv_reduce] !== void 0) return m[IKVReduce__kv_reduce](m, f, init2);
  var ret = init2;
  for (const o of iterable(m)) {
    ret = f(ret, o[0], o[1]);
  }
  return ret;
}
function max(x, ...more) {
  let m = x;
  for (const y of more) m = isNaN(m) ? m : isNaN(y) ? y : m > y ? m : y;
  return m;
}
function map_QMARK_(coll) {
  if (coll == null) return false;
  if (isObj(coll)) return true;
  if (coll instanceof Map) return true;
  if (coll[TYPE_TAG] === MAP_TYPE) return true;
  if (coll[IMap.__sym] !== void 0) return true;
  return false;
}
function into_array(type2, aseq) {
  const theSeq = aseq || type2;
  return vec(theSeq);
}
function next(x) {
  if (Array.isArray(x)) {
    const ret = x.slice(1);
    if (ret.length > 0) {
      return ret;
    } else {
      return null;
    }
  } else {
    return seq(rest(x));
  }
}
function truth_(x) {
  return x != null && x !== false;
}
function subs(s, start, end) {
  return s.substring(start, end);
}
function fn_QMARK_(x) {
  return "function" === typeof x;
}
function number_QMARK_(x) {
  return typeof x == "number";
}
function string_QMARK_(s) {
  return typeof s === "string";
}
var ExceptionInfo = class extends Error {
  constructor(message, data, cause) {
    super(message);
    this._data = data;
    this._cause = cause;
  }
};
function ex_data(e) {
  if (e instanceof ExceptionInfo) return e._data;
  else return null;
}
function ex_info(message, data, cause) {
  return new ExceptionInfo(message, data, cause);
}
function int_QMARK_(x) {
  return Number.isInteger(x);
}
function boolean_QMARK_(x) {
  return x === true || x === false;
}
function min_key(k, x, ...more) {
  k = __toFn(k);
  let min = x;
  for (const y of more) {
    if (!(k(min) < k(y))) min = y;
  }
  return min;
}
function transduce(xform, ...args) {
  switch (args.length) {
    case 2: {
      const f = args[0];
      const coll = args[1];
      return transduce(xform, f, f(), coll);
    }
    default: {
      let f = args[0];
      const init2 = args[1];
      const coll = args[2];
      f = xform(f);
      const ret = reduce(f, init2, coll);
      return f(ret);
    }
  }
}
function tree_seq(isBranch, children, root) {
  const walk = function* (node) {
    yield node;
    if (truth_(isBranch(node))) {
      for (const c of iterable(children(node))) {
        yield* walk(c);
      }
    }
  };
  return lazy(function* () {
    yield* walk(root);
  });
}
function flatten(x) {
  return filter(complement(sequential_QMARK_), rest(tree_seq(sequential_QMARK_, seq, x)));
}
function type(x) {
  return x != null && x.constructor;
}
function update_vals(m, f) {
  const m2 = empty(m);
  if (m2 != null && m2[IAssociative__assoc] !== void 0) {
    return reduce_kv((acc, k, v) => acc[IAssociative__assoc](acc, k, f(v)), m2, m);
  }
  const assocFn = getAssocMut(m) || assoc_BANG_;
  reduce_kv(
    (acc, k, v) => {
      return assocFn(acc, k, f(v));
    },
    m2,
    m
  );
  return m2;
}
function clj__GT_js_(x, seen) {
  if (seen.has(x)) return x;
  seen.add(x);
  if (x != null && x[IEncodeJS__clj__GT_js] !== void 0) {
    return x[IEncodeJS__clj__GT_js](x, (v) => clj__GT_js_(v, seen));
  }
  if (map_QMARK_(x)) {
    return update_vals(x, (x2) => clj__GT_js_(x2, seen));
  }
  const tc = typeConst(x);
  if (tc && tc != OBJECT_TYPE && tc != INSTANCE_TYPE) {
    return mapv((x2) => clj__GT_js_(x2, seen), x);
  }
  return x;
}
function clj__GT_js(x) {
  return clj__GT_js_(x, /* @__PURE__ */ new Set());
}
var VOLATILE_DEREF = (self) => self.v;
var Volatile = class {
  constructor(v) {
    this.v = v;
    this[IDeref__deref] = VOLATILE_DEREF;
  }
};
function volatile_BANG_(x) {
  return new Volatile(x);
}
function vreset_BANG_(vol, v) {
  vol.v = v;
  return v;
}

// node_modules/.pnpm/comlink@4.4.2/node_modules/comlink/dist/esm/comlink.mjs
var proxyMarker = /* @__PURE__ */ Symbol("Comlink.proxy");
var createEndpoint = /* @__PURE__ */ Symbol("Comlink.endpoint");
var releaseProxy = /* @__PURE__ */ Symbol("Comlink.releaseProxy");
var finalizer = /* @__PURE__ */ Symbol("Comlink.finalizer");
var throwMarker = /* @__PURE__ */ Symbol("Comlink.thrown");
var isObject = (val2) => typeof val2 === "object" && val2 !== null || typeof val2 === "function";
var proxyTransferHandler = {
  canHandle: (val2) => isObject(val2) && val2[proxyMarker],
  serialize(obj) {
    const { port1, port2 } = new MessageChannel();
    expose(obj, port1);
    return [port2, [port2]];
  },
  deserialize(port) {
    port.start();
    return wrap(port);
  }
};
var throwTransferHandler = {
  canHandle: (value) => isObject(value) && throwMarker in value,
  serialize({ value }) {
    let serialized;
    if (value instanceof Error) {
      serialized = {
        isError: true,
        value: {
          message: value.message,
          name: value.name,
          stack: value.stack
        }
      };
    } else {
      serialized = { isError: false, value };
    }
    return [serialized, []];
  },
  deserialize(serialized) {
    if (serialized.isError) {
      throw Object.assign(new Error(serialized.value.message), serialized.value);
    }
    throw serialized.value;
  }
};
var transferHandlers = /* @__PURE__ */ new Map([
  ["proxy", proxyTransferHandler],
  ["throw", throwTransferHandler]
]);
function isAllowedOrigin(allowedOrigins, origin) {
  for (const allowedOrigin of allowedOrigins) {
    if (origin === allowedOrigin || allowedOrigin === "*") {
      return true;
    }
    if (allowedOrigin instanceof RegExp && allowedOrigin.test(origin)) {
      return true;
    }
  }
  return false;
}
function expose(obj, ep = globalThis, allowedOrigins = ["*"]) {
  ep.addEventListener("message", function callback(ev) {
    if (!ev || !ev.data) {
      return;
    }
    if (!isAllowedOrigin(allowedOrigins, ev.origin)) {
      console.warn(`Invalid origin '${ev.origin}' for comlink proxy`);
      return;
    }
    const { id, type: type2, path } = Object.assign({ path: [] }, ev.data);
    const argumentList = (ev.data.argumentList || []).map(fromWireValue);
    let returnValue;
    try {
      const parent = path.slice(0, -1).reduce((obj2, prop) => obj2[prop], obj);
      const rawValue = path.reduce((obj2, prop) => obj2[prop], obj);
      switch (type2) {
        case "GET":
          {
            returnValue = rawValue;
          }
          break;
        case "SET":
          {
            parent[path.slice(-1)[0]] = fromWireValue(ev.data.value);
            returnValue = true;
          }
          break;
        case "APPLY":
          {
            returnValue = rawValue.apply(parent, argumentList);
          }
          break;
        case "CONSTRUCT":
          {
            const value = new rawValue(...argumentList);
            returnValue = proxy(value);
          }
          break;
        case "ENDPOINT":
          {
            const { port1, port2 } = new MessageChannel();
            expose(obj, port2);
            returnValue = transfer(port1, [port1]);
          }
          break;
        case "RELEASE":
          {
            returnValue = void 0;
          }
          break;
        default:
          return;
      }
    } catch (value) {
      returnValue = { value, [throwMarker]: 0 };
    }
    Promise.resolve(returnValue).catch((value) => {
      return { value, [throwMarker]: 0 };
    }).then((returnValue2) => {
      const [wireValue, transferables] = toWireValue(returnValue2);
      ep.postMessage(Object.assign(Object.assign({}, wireValue), { id }), transferables);
      if (type2 === "RELEASE") {
        ep.removeEventListener("message", callback);
        closeEndPoint(ep);
        if (finalizer in obj && typeof obj[finalizer] === "function") {
          obj[finalizer]();
        }
      }
    }).catch((error) => {
      const [wireValue, transferables] = toWireValue({
        value: new TypeError("Unserializable return value"),
        [throwMarker]: 0
      });
      ep.postMessage(Object.assign(Object.assign({}, wireValue), { id }), transferables);
    });
  });
  if (ep.start) {
    ep.start();
  }
}
function isMessagePort(endpoint) {
  return endpoint.constructor.name === "MessagePort";
}
function closeEndPoint(endpoint) {
  if (isMessagePort(endpoint))
    endpoint.close();
}
function wrap(ep, target) {
  const pendingListeners = /* @__PURE__ */ new Map();
  ep.addEventListener("message", function handleMessage(ev) {
    const { data } = ev;
    if (!data || !data.id) {
      return;
    }
    const resolver = pendingListeners.get(data.id);
    if (!resolver) {
      return;
    }
    try {
      resolver(data);
    } finally {
      pendingListeners.delete(data.id);
    }
  });
  return createProxy(ep, pendingListeners, [], target);
}
function throwIfProxyReleased(isReleased) {
  if (isReleased) {
    throw new Error("Proxy has been released and is not useable");
  }
}
function releaseEndpoint(ep) {
  return requestResponseMessage(ep, /* @__PURE__ */ new Map(), {
    type: "RELEASE"
  }).then(() => {
    closeEndPoint(ep);
  });
}
var proxyCounter = /* @__PURE__ */ new WeakMap();
var proxyFinalizers = "FinalizationRegistry" in globalThis && new FinalizationRegistry((ep) => {
  const newCount = (proxyCounter.get(ep) || 0) - 1;
  proxyCounter.set(ep, newCount);
  if (newCount === 0) {
    releaseEndpoint(ep);
  }
});
function registerProxy(proxy2, ep) {
  const newCount = (proxyCounter.get(ep) || 0) + 1;
  proxyCounter.set(ep, newCount);
  if (proxyFinalizers) {
    proxyFinalizers.register(proxy2, ep, proxy2);
  }
}
function unregisterProxy(proxy2) {
  if (proxyFinalizers) {
    proxyFinalizers.unregister(proxy2);
  }
}
function createProxy(ep, pendingListeners, path = [], target = function() {
}) {
  let isProxyReleased = false;
  const proxy2 = new Proxy(target, {
    get(_target, prop) {
      throwIfProxyReleased(isProxyReleased);
      if (prop === releaseProxy) {
        return () => {
          unregisterProxy(proxy2);
          releaseEndpoint(ep);
          pendingListeners.clear();
          isProxyReleased = true;
        };
      }
      if (prop === "then") {
        if (path.length === 0) {
          return { then: () => proxy2 };
        }
        const r = requestResponseMessage(ep, pendingListeners, {
          type: "GET",
          path: path.map((p3) => p3.toString())
        }).then(fromWireValue);
        return r.then.bind(r);
      }
      return createProxy(ep, pendingListeners, [...path, prop]);
    },
    set(_target, prop, rawValue) {
      throwIfProxyReleased(isProxyReleased);
      const [value, transferables] = toWireValue(rawValue);
      return requestResponseMessage(ep, pendingListeners, {
        type: "SET",
        path: [...path, prop].map((p3) => p3.toString()),
        value
      }, transferables).then(fromWireValue);
    },
    apply(_target, _thisArg, rawArgumentList) {
      throwIfProxyReleased(isProxyReleased);
      const last = path[path.length - 1];
      if (last === createEndpoint) {
        return requestResponseMessage(ep, pendingListeners, {
          type: "ENDPOINT"
        }).then(fromWireValue);
      }
      if (last === "bind") {
        return createProxy(ep, pendingListeners, path.slice(0, -1));
      }
      const [argumentList, transferables] = processArguments(rawArgumentList);
      return requestResponseMessage(ep, pendingListeners, {
        type: "APPLY",
        path: path.map((p3) => p3.toString()),
        argumentList
      }, transferables).then(fromWireValue);
    },
    construct(_target, rawArgumentList) {
      throwIfProxyReleased(isProxyReleased);
      const [argumentList, transferables] = processArguments(rawArgumentList);
      return requestResponseMessage(ep, pendingListeners, {
        type: "CONSTRUCT",
        path: path.map((p3) => p3.toString()),
        argumentList
      }, transferables).then(fromWireValue);
    }
  });
  registerProxy(proxy2, ep);
  return proxy2;
}
function myFlat(arr) {
  return Array.prototype.concat.apply([], arr);
}
function processArguments(argumentList) {
  const processed = argumentList.map(toWireValue);
  return [processed.map((v) => v[0]), myFlat(processed.map((v) => v[1]))];
}
var transferCache = /* @__PURE__ */ new WeakMap();
function transfer(obj, transfers) {
  transferCache.set(obj, transfers);
  return obj;
}
function proxy(obj) {
  return Object.assign(obj, { [proxyMarker]: true });
}
function toWireValue(value) {
  for (const [name2, handler] of transferHandlers) {
    if (handler.canHandle(value)) {
      const [serializedValue, transferables] = handler.serialize(value);
      return [
        {
          type: "HANDLER",
          name: name2,
          value: serializedValue
        },
        transferables
      ];
    }
  }
  return [
    {
      type: "RAW",
      value
    },
    transferCache.get(value) || []
  ];
}
function fromWireValue(value) {
  switch (value.type) {
    case "HANDLER":
      return transferHandlers.get(value.name).deserialize(value.value);
    case "RAW":
      return value.value;
  }
}
function requestResponseMessage(ep, pendingListeners, msg, transfers) {
  return new Promise((resolve) => {
    const id = generateUUID();
    pendingListeners.set(id, resolve);
    if (ep.start) {
      ep.start();
    }
    ep.postMessage(Object.assign({ id }, msg), transfers);
  });
}
function generateUUID() {
  return new Array(4).fill(0).map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)).join("-");
}

// node_modules/.pnpm/@wcohen+worker-router@0.0.2/node_modules/@wcohen/worker-router/dist/index.mjs
var DEFAULT_SIZE_FALLBACK = 4;
var DEFAULT_BOOTSTRAP_TIMEOUT_MS = 3e5;
var DEFAULT_SHUTDOWN_TIMEOUT_MS = 5e3;
var WORKER_ROUTER_COORDINATOR_KEY = "__worker_router__";
var PROBE_KEYS = /* @__PURE__ */ new Set(["then", "toJSON", "valueOf", "toString", "constructor"]);
var detect_runtime = function() {
  const mp_1 = globalThis.process;
  if (truth_((() => {
    const and__23694__auto___2 = mp_1;
    if (truth_(and__23694__auto___2)) {
      const and__23694__auto___3 = mp_1.versions;
      if (truth_(and__23694__auto___3)) {
        return string_QMARK_(mp_1.versions.node);
      } else {
        return and__23694__auto___3;
      }
      ;
    } else {
      return and__23694__auto___2;
    }
    ;
  })())) {
    return "node";
  } else {
    return "browser";
  }
  ;
};
var resolve_size = function(size) {
  if (size === "auto") {
    const hc_1 = (() => {
      const G__1_2 = globalThis;
      const G__1_3 = G__1_2 == null ? null : G__1_2.navigator;
      if (G__1_3 == null) {
        return null;
      } else {
        return G__1_3.hardwareConcurrency;
      }
      ;
    })();
    if (truth_((() => {
      const and__23694__auto___4 = number_QMARK_(hc_1);
      if (truth_(and__23694__auto___4)) {
        return hc_1 > 0;
      } else {
        return and__23694__auto___4;
      }
      ;
    })())) {
      return hc_1;
    } else {
      return DEFAULT_SIZE_FALLBACK;
    }
    ;
  } else {
    return size;
  }
  ;
};
var browser_worker_url = function(bootstrap_url) {
  const u_1 = new URL(bootstrap_url, location.href);
  if (_EQ_(u_1.origin, location.origin)) {
    return { "url": bootstrap_url, "blob": false };
  } else {
    return { "url": URL.createObjectURL(new Blob([`${"import "}${JSON.stringify(u_1.href) ?? ""}${";"}`], { "type": "text/javascript" })), "blob": true };
  }
  ;
};
var spawn = async function(bootstrap_url) {
  if (detect_runtime() === "node") {
    const wt_1 = await import("node:worker_threads");
    const NW_2 = wt_1.Worker;
    const ne_mod_3 = await import("comlink/dist/esm/node-adapter.mjs");
    const ne_4 = ne_mod_3.default;
    const raw_5 = new NW_2(new URL(bootstrap_url));
    const endpoint_6 = ne_4(raw_5);
    return { "raw": raw_5, "endpoint": endpoint_6, "terminate": (function() {
      return raw_5.terminate();
    }) };
  } else {
    const shim_7 = browser_worker_url(bootstrap_url);
    const raw_8 = new Worker(shim_7.url, { "type": "module" });
    return { "raw": raw_8, "endpoint": raw_8, "terminate": (async function terminate() {
      raw_8.terminate();
      if (truth_(shim_7.blob)) {
        URL.revokeObjectURL(shim_7.url);
      }
      ;
      return null;
    }) };
  }
  ;
};
var await_ready = async function(handle, timeout_ms) {
  const raw_1 = handle.raw;
  const timeout_id_2 = volatile_BANG_(null);
  const cleanup_3 = volatile_BANG_((function() {
    return null;
  }));
  const timer_4 = new Promise((function(_, reject) {
    const tid_5 = setTimeout((function() {
      return reject(new Error("worker-router: bootstrap timeout"));
    }), timeout_ms);
    vreset_BANG_(timeout_id_2, tid_5);
    if (truth_((() => {
      const and__23694__auto___6 = tid_5;
      if (truth_(and__23694__auto___6)) {
        return tid_5.unref;
      } else {
        return and__23694__auto___6;
      }
      ;
    })())) {
      return tid_5.unref();
    }
    ;
  }));
  const ready_7 = new Promise((function(resolve, reject) {
    const on_msg_8 = (function(t, message) {
      if (t === "worker-router/ready") {
        return resolve();
      } else {
        if (t === "worker-router/error") {
          return reject(new Error(`${"worker-router: worker bootstrap failed: "}${message ?? ""}`));
        } else {
          return null;
        }
      }
      ;
    });
    if (truth_((() => {
      const and__23694__auto___9 = raw_1.on;
      if (truth_(and__23694__auto___9)) {
        return raw_1.removeListener;
      } else {
        return and__23694__auto___9;
      }
      ;
    })())) {
      const msg_listener_10 = (function(m) {
        return on_msg_8((() => {
          const G__2_11 = m;
          if (G__2_11 == null) {
            return null;
          } else {
            return G__2_11.type;
          }
          ;
        })(), (() => {
          const G__3_12 = m;
          if (G__3_12 == null) {
            return null;
          } else {
            return G__3_12.message;
          }
          ;
        })());
      });
      const err_listener_13 = (function(err) {
        return reject(err);
      });
      const exit_listener_14 = (function(code) {
        return reject(new Error(`${"worker-router: worker exited during bootstrap (code "}${code ?? ""}${")"}`));
      });
      vreset_BANG_(cleanup_3, (function() {
        raw_1.removeListener("message", msg_listener_10);
        raw_1.removeListener("error", err_listener_13);
        return raw_1.removeListener("exit", exit_listener_14);
      }));
      raw_1.on("message", msg_listener_10);
      raw_1.on("error", err_listener_13);
      return raw_1.on("exit", exit_listener_14);
    } else {
      if (truth_(raw_1.addEventListener)) {
        const msg_listener_15 = (function(ev) {
          return on_msg_8((() => {
            const G__4_16 = ev;
            const G__4_17 = G__4_16 == null ? null : G__4_16.data;
            if (G__4_17 == null) {
              return null;
            } else {
              return G__4_17.type;
            }
            ;
          })(), (() => {
            const G__5_18 = ev;
            const G__5_19 = G__5_18 == null ? null : G__5_18.data;
            if (G__5_19 == null) {
              return null;
            } else {
              return G__5_19.message;
            }
            ;
          })());
        });
        const err_listener_20 = (function(ev) {
          return reject(new Error(`${"worker-router: worker error during bootstrap: "}${(() => {
            const or__23663__auto___21 = ev.message;
            if (truth_(or__23663__auto___21)) {
              return or__23663__auto___21;
            } else {
              return "unknown";
            }
            ;
          })() ?? ""}`));
        });
        vreset_BANG_(cleanup_3, (function() {
          raw_1.removeEventListener("message", msg_listener_15);
          return raw_1.removeEventListener("error", err_listener_20);
        }));
        raw_1.addEventListener("message", msg_listener_15);
        return raw_1.addEventListener("error", err_listener_20);
      } else {
        return null;
      }
    }
    ;
  }));
  try {
    return await Promise.race([ready_7, timer_4]);
  } finally {
    deref(cleanup_3)();
    const temp__23298__auto___22 = deref(timeout_id_2);
    if (truth_(temp__23298__auto___22)) {
      const tid_23 = temp__23298__auto___22;
      clearTimeout(tid_23);
    }
  }
  ;
};
var count_call = function(worker, invoke) {
  if (truth_(worker.terminated)) {
    return Promise.reject(new Error("worker-router: pool terminated"));
  } else {
    if (truth_(worker.dead)) {
      return Promise.reject(new Error(`${"worker-router: worker "}${worker.index ?? ""}${" is dead"}`));
    } else {
      if ("else") {
        worker.pending = worker.pending + 1;
        const p_1 = (() => {
          try {
            return Promise.resolve(invoke());
          } catch (e_2) {
            return Promise.reject(e_2);
          }
        })();
        const raced_3 = Promise.race([p_1, worker.signal]);
        raced_3.finally((function() {
          return worker.pending = worker.pending - 1;
        })).catch((function(_) {
          return null;
        }));
        return raced_3;
      } else {
        return null;
      }
    }
  }
  ;
};
var wrap_for_counting = function(worker, inner) {
  if (inner == null) {
    return inner;
  } else {
    if (truth_((() => {
      const or__23663__auto___1 = fn_QMARK_(inner);
      if (truth_(or__23663__auto___1)) {
        return or__23663__auto___1;
      } else {
        return not(number_QMARK_(inner)) && (not(string_QMARK_(inner)) && not(boolean_QMARK_(inner)));
      }
      ;
    })())) {
      return new Proxy(inner, { "get": (function(target, prop, receiver) {
        if (truth_(string_QMARK_(prop))) {
          return wrap_for_counting(worker, Reflect.get(target, prop, receiver));
        } else {
          return Reflect.get(target, prop, receiver);
        }
        ;
      }), "apply": (function(target, this_arg, args) {
        return count_call(worker, (function() {
          return Reflect.apply(target, this_arg, args);
        }));
      }) });
    } else {
      if ("else") {
        return inner;
      } else {
        return null;
      }
    }
  }
  ;
};
var pick_least_loaded = function(all_records) {
  const alive_1 = all_records.filter((function(r) {
    return not(r.dead);
  }));
  const records_arr_2 = alive_1.length > 0 ? alive_1 : all_records;
  const n_3 = records_arr_2.length;
  const w0_4 = records_arr_2[0];
  let i_5 = 1;
  let best_6 = w0_4;
  let best_load_7 = w0_4.pending + w0_4.claims;
  while (true) {
    if (i_5 < n_3) {
      const w_8 = records_arr_2[i_5];
      const load_9 = w_8.pending + w_8.claims;
      if (load_9 < best_load_7) {
        let G__10 = i_5 + 1;
        let G__11 = w_8;
        let G__12 = load_9;
        i_5 = G__10;
        best_6 = G__11;
        best_load_7 = G__12;
        continue;
      } else {
        let G__13 = i_5 + 1;
        let G__14 = best_6;
        let G__15 = best_load_7;
        i_5 = G__13;
        best_6 = G__14;
        best_load_7 = G__15;
        continue;
      }
      ;
    } else {
      return best_6;
    }
    ;
    ;
    break;
  }
  ;
};
var dispatching_proxy = function(worker, registered_modules) {
  return new Proxy({}, { "get": (function(target, key, receiver) {
    if (not(string_QMARK_(key))) {
      return void 0;
    } else {
      if (truth_(PROBE_KEYS.has(key))) {
        return Reflect.get(target, key, receiver);
      } else {
        if (not(registered_modules.has(key))) {
          throw new Error(`${'worker-router: unknown module key "'}${key ?? ""}${'"'}`);
        } else {
          if ("else") {
            const inner_1 = worker.proxy[key];
            return wrap_for_counting(worker, inner_1);
          } else {
            return null;
          }
        }
      }
    }
    ;
  }) });
};
var any_proxy = function(records_arr, registered_modules, path) {
  return new Proxy((function() {
    return null;
  }), { "get": (function(target, key, receiver) {
    if (not(string_QMARK_(key))) {
      return void 0;
    } else {
      if (truth_(PROBE_KEYS.has(key))) {
        return Reflect.get(target, key, receiver);
      } else {
        if ("else") {
          if (truth_(path.length === 0 && not(registered_modules.has(key)))) {
            throw new Error(`${'worker-router: unknown module key "'}${key ?? ""}${'"'}`);
          }
          ;
          return any_proxy(records_arr, registered_modules, path.concat([key]));
        } else {
          return null;
        }
      }
    }
    ;
  }), "apply": (function(_target, _this, args) {
    if (path.length === 0) {
      throw new Error("worker-router: any() proxy invoked before selecting a module method");
    }
    ;
    const worker_1 = pick_least_loaded(records_arr);
    const last_idx_2 = path.length - 1;
    const parent_3 = path.slice(0, last_idx_2).reduce((function(o, k) {
      return o[k];
    }), worker_1.proxy);
    const f_4 = parent_3[path[last_idx_2]];
    return count_call(worker_1, (function() {
      return Reflect.apply(f_4, parent_3, args);
    }));
  }) });
};
var resolve_within = function(p3, ms) {
  return new Promise((function(resolve, reject) {
    const tid_1 = setTimeout((function() {
      return resolve(void 0);
    }), ms);
    if (truth_((() => {
      const and__23694__auto___2 = tid_1;
      if (truth_(and__23694__auto___2)) {
        return tid_1.unref;
      } else {
        return and__23694__auto___2;
      }
      ;
    })())) {
      tid_1.unref();
    }
    ;
    return Promise.resolve(p3).then((function(v) {
      clearTimeout(tid_1);
      return resolve(v);
    }), (function(e) {
      clearTimeout(tid_1);
      return reject(e);
    }));
  }));
};
var watch_liveness = function(record) {
  const raw_1 = record.handle.raw;
  const mark_2 = (function() {
    record.dead = true;
    return record.signalReject(new Error(`${"worker-router: worker "}${record.index ?? ""}${" died"}`));
  });
  if (truth_((() => {
    const and__23694__auto___3 = raw_1.on;
    if (truth_(and__23694__auto___3)) {
      return raw_1.removeListener;
    } else {
      return and__23694__auto___3;
    }
    ;
  })())) {
    raw_1.on("error", (function(err) {
      mark_2();
      return console.error("worker-router: worker", record.index, "error:", err);
    }));
    return raw_1.on("exit", (function(code) {
      mark_2();
      if (truth_(not(record.terminated) && (() => {
        const and__23694__auto___4 = number_QMARK_(code);
        if (truth_(and__23694__auto___4)) {
          return !(code === 0);
        } else {
          return and__23694__auto___4;
        }
        ;
      })())) {
        return console.error("worker-router: worker", record.index, "exited unexpectedly (code", code, ")");
      }
      ;
    }));
  } else {
    if (truth_(raw_1.addEventListener)) {
      return raw_1.addEventListener("error", (function(ev) {
        mark_2();
        return console.error("worker-router: worker", record.index, "error:", (() => {
          const or__23663__auto___5 = ev.message;
          if (truth_(or__23663__auto___5)) {
            return or__23663__auto___5;
          } else {
            return ev;
          }
          ;
        })());
      }));
    } else {
      return null;
    }
  }
  ;
};
var create_pool = async function(opts) {
  const handlers_1 = opts.handlers;
  const keys_arr_2 = Object.keys(handlers_1);
  const size_3 = resolve_size(opts.size);
  if (keys_arr_2.length === 0) {
    throw new Error("worker-router: at least one handler must be registered");
  }
  ;
  if (opts.size == null) {
    throw new Error("worker-router: size is required");
  }
  ;
  if (truth_(await (async () => {
    const or__23663__auto___4 = not(Number.isInteger(size_3));
    if (or__23663__auto___4) {
      return or__23663__auto___4;
    } else {
      return size_3 < 1;
    }
    ;
  })())) {
    throw new Error(`${"worker-router: size must be a positive integer, got "}${size_3 ?? ""}`);
  }
  ;
  const runtime_5 = detect_runtime();
  const bootstrap_6 = opts.bootstrap;
  const bootstrap_timeout_7 = await (async () => {
    const or__23663__auto___8 = opts.bootstrapTimeoutMs;
    if (truth_(or__23663__auto___8)) {
      return or__23663__auto___8;
    } else {
      return DEFAULT_BOOTSTRAP_TIMEOUT_MS;
    }
    ;
  })();
  const shutdown_timeout_9 = await (async () => {
    const or__23663__auto___10 = opts.shutdownTimeoutMs;
    if (truth_(or__23663__auto___10)) {
      return or__23663__auto___10;
    } else {
      return DEFAULT_SHUTDOWN_TIMEOUT_MS;
    }
    ;
  })();
  const comlink_url_11 = await (async () => {
    const or__23663__auto___12 = opts.comlinkUrl;
    if (truth_(or__23663__auto___12)) {
      return or__23663__auto___12;
    } else {
      return new URL("./comlink.mjs", import.meta.url).href;
    }
    ;
  })();
  const bootstrap_msg_13 = { "type": "worker-router/bootstrap", "handlers": handlers_1, "comlinkUrl": comlink_url_11 };
  const spawn_promises_14 = Array.from({ "length": size_3 }, (function(_, _i) {
    return spawn(bootstrap_6);
  }));
  const spawn_settled_15 = await Promise.allSettled(spawn_promises_14);
  const rejected_16 = spawn_settled_15.filter((function(s) {
    return s.status === "rejected";
  }));
  const handles_17 = spawn_settled_15.filter((function(s) {
    return s.status === "fulfilled";
  })).map((function(s) {
    return s.value;
  }));
  if (rejected_16.length > 0) {
    await Promise.allSettled(handles_17.map((function(h) {
      return h.terminate();
    })));
    throw rejected_16[0].reason;
  }
  ;
  const records_arr_18 = handles_17.map((function(handle, idx) {
    const reject_box_19 = volatile_BANG_(null);
    const signal_20 = new Promise((function(_, reject) {
      return vreset_BANG_(reject_box_19, reject);
    }));
    signal_20.catch((function(_) {
      return null;
    }));
    return { "dead": false, "index": idx, "pending": 0, "claims": 0, "proxy": wrap(handle.endpoint), "terminated": false, "handle": handle, "signal": signal_20, "signalReject": deref(reject_box_19) };
  }));
  records_arr_18.forEach((function(r) {
    return watch_liveness(r);
  }));
  try {
    for (let G__21 of iterable(handles_17)) {
      const h_22 = G__21;
      h_22.raw.postMessage(bootstrap_msg_13);
    }
    ;
    await Promise.all(handles_17.map((function(h) {
      return await_ready(h, bootstrap_timeout_7);
    })));
  } catch (err_23) {
    await Promise.allSettled(handles_17.map((function(h) {
      return h.terminate();
    })));
    throw err_23;
  }
  ;
  const registered_modules_24 = new Set(keys_arr_2);
  const terminate_promise_25 = volatile_BANG_(null);
  const assert_live_26 = (function() {
    if (truth_(deref(terminate_promise_25))) {
      throw new Error("worker-router: pool terminated");
    }
    ;
  });
  return { "size": size_3, "runtime": runtime_5, "registeredModules": registered_modules_24, "worker": (function(index) {
    assert_live_26();
    if (truth_((() => {
      const or__23663__auto___27 = not(Number.isInteger(index));
      if (or__23663__auto___27) {
        return or__23663__auto___27;
      } else {
        const or__23663__auto___28 = index < 0;
        if (or__23663__auto___28) {
          return or__23663__auto___28;
        } else {
          return index >= size_3;
        }
        ;
      }
      ;
    })())) {
      throw new RangeError(`${"worker-router: worker index "}${index ?? ""}${" out of range [0, "}${size_3 ?? ""}${")"}`);
    }
    ;
    return dispatching_proxy(records_arr_18[index], registered_modules_24);
  }), "any": (function() {
    assert_live_26();
    return any_proxy(records_arr_18, registered_modules_24, []);
  }), "claim": (function() {
    assert_live_26();
    const worker_29 = pick_least_loaded(records_arr_18);
    worker_29.claims = worker_29.claims + 1;
    const released_30 = volatile_BANG_(false);
    const release_31 = (function() {
      if (truth_(deref(released_30))) {
        return null;
      } else {
        vreset_BANG_(released_30, true);
        return worker_29.claims = worker_29.claims - 1;
      }
      ;
    });
    return { "index": worker_29.index, "release": release_31 };
  }), "terminate": (function() {
    if (deref(terminate_promise_25) == null) {
      records_arr_18.forEach((function(r) {
        r.terminated = true;
        return r.signalReject(new Error("worker-router: pool terminated"));
      }));
      vreset_BANG_(terminate_promise_25, Promise.allSettled(records_arr_18.map((function(r) {
        if (truth_(r.dead)) {
          return Promise.resolve();
        } else {
          const coord_32 = r.proxy[WORKER_ROUTER_COORDINATOR_KEY];
          if (truth_((() => {
            const and__23694__auto___33 = coord_32;
            if (truth_(and__23694__auto___33)) {
              return fn_QMARK_(coord_32.shutdown);
            } else {
              return and__23694__auto___33;
            }
            ;
          })())) {
            return resolve_within(coord_32.shutdown(), shutdown_timeout_9);
          } else {
            return Promise.resolve();
          }
          ;
        }
        ;
      }))).then((function(_) {
        return Promise.allSettled(records_arr_18.map((function(r) {
          return r.handle.terminate();
        })));
      })).then((function(_) {
        return void 0;
      })));
    }
    ;
    return deref(terminate_promise_25);
  }) };
};
var WorkerPool = { "create": create_pool };

// node_modules/.pnpm/squint-cljs@0.14.208/node_modules/squint-cljs/src/squint/string.js
function join(sep, coll) {
  if (coll === void 0) {
    coll = sep;
    sep = "";
  }
  if (coll instanceof Array) {
    return coll.join(sep);
  }
  let ret = "";
  let addSep = false;
  for (const o of iterable(coll)) {
    if (addSep) ret += sep;
    ret += o;
    addSep = true;
  }
  return ret;
}
var escapeRegex = function(s) {
  return s.replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, "\\$1").replace(/\x08/g, "\\x08");
};
var replaceAll = function(s, re, replacement) {
  var flags = "g";
  if (re.ignoreCase) {
    flags += "i";
  }
  if (re.multiline) {
    flags += "m";
  }
  if (re.unicode) {
    flags += "u";
  }
  const r = new RegExp(re.source, flags);
  return s.replace(r, replacement);
};
var replaceWith = function(f) {
  return (...args) => {
    const [matches, _, __] = args;
    if (matches.length == 1) {
      return f(matches[0]);
    } else {
      return f(matches);
    }
  };
};
function replace(s, match, replacement) {
  if (string_QMARK_(match)) {
    return s.replace(new RegExp(escapeRegex(match), "g"), replacement);
  }
  if (match instanceof RegExp) {
    if (string_QMARK_(replacement)) {
      return replaceAll(s, match, replacement);
    } else {
      return replaceAll(s, match, replaceWith(replacement));
    }
  }
  throw `Invalid match arg: $match`;
}

// node_modules/.pnpm/resource-tracker@0.0.1/node_modules/resource-tracker/resource.mjs
var _STAR_resource_context_STAR_ = { val: atom(list()) };
var _STAR_bound_resource_context_QMARK__STAR_ = { val: false };
var _STAR_resource_debug_double_free_STAR_ = { val: null };
var stack_do_release = function(item) {
  if (truth_(item)) {
    return (() => {
      try {
        if (truth_(fn_QMARK_(item))) {
          return item();
        } else {
          if (truth_(fn_QMARK_(item[Symbol.dispose]))) {
            return item[Symbol.dispose].call(item);
          } else {
            if (truth_(fn_QMARK_(item[Symbol.asyncDispose]))) {
              return item[Symbol.asyncDispose].call(item);
            } else {
              if (truth_(fn_QMARK_(item.close))) {
                return item.close();
              } else {
                if ("else") {
                  throw new Error(`${"item is not a function or disposable: "}${type(item) ?? ""}`);
                } else {
                  return null;
                }
              }
            }
          }
        }
        ;
      } catch (e1) {
        return console.warn(join(" ", [e1, "Failed to release", item]));
      }
    })();
  }
  ;
};
var stack_track = /* @__PURE__ */ (() => {
  const impl41 = (function(item, dispose_fn) {
    if (truth_((() => {
      const and__23608__auto__2 = _STAR_resource_debug_double_free_STAR_.val;
      if (truth_(and__23608__auto__2)) {
        return some((function(_PERCENT_1) {
          return item === first(_PERCENT_1);
        }), deref(_STAR_resource_context_STAR_.val));
      } else {
        return and__23608__auto__2;
      }
      ;
    })())) {
      throw ex_info("Duplicate track detected; this will result in a double free", { "item": item });
    }
    ;
    if (truth_(_STAR_bound_resource_context_QMARK__STAR_.val)) {
    } else {
      console.log("Stack resource tracking used but no resource context bound.\nThis is probably a memory leak.");
    }
    ;
    swap_BANG_(_STAR_resource_context_STAR_.val, conj, [item, dispose_fn]);
    return item;
  });
  const impl53 = (function(item) {
    return stack_track(item, item);
  });
  const f1 = (function(...args2) {
    const self64 = this;
    const G__75 = args2.length;
    switch (G__75) {
      case 2:
        return impl41.call(self64, args2[0], args2[1]);
        break;
      case 1:
        return impl53.call(self64, args2[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args2.length ?? ""}`);
    }
    ;
  });
  return f1;
})();
var gc_finalization_registry = new FinalizationRegistry(stack_do_release);
var gc_track_gc_only = function(item, dispose_fn) {
  gc_finalization_registry.register(item, dispose_fn);
  return item;
};
var gc_track = function(item, dispose_fn) {
  const token1 = {};
  const fired_QMARK_2 = atom(false);
  const wrapped3 = (function() {
    if (truth_(compare_and_set_BANG_(fired_QMARK_2, false, true))) {
      gc_finalization_registry.unregister(token1);
      return dispose_fn();
    }
    ;
  });
  gc_finalization_registry.register(item, wrapped3, token1);
  stack_track(wrapped3, wrapped3);
  return item;
};
var track_impl = function(item, dispose_fn, track_type) {
  const G__211 = track_type;
  switch (G__211) {
    case "gc":
      return gc_track_gc_only(item, dispose_fn);
      break;
    case "stack":
      return stack_track(item, dispose_fn);
      break;
    case "gc_and_stack":
      return gc_track(item, dispose_fn);
      break;
    default:
      throw new Error(`${"No matching clause: "}${G__211 ?? ""}`);
  }
  ;
};
var in_stack_resource_context_QMARK_ = function() {
  return _STAR_bound_resource_context_QMARK__STAR_.val;
};
var normalize_track_type = function(track_type) {
  const track_type1 = (() => {
    const or__23576__auto__2 = track_type;
    if (truth_(or__23576__auto__2)) {
      return or__23576__auto__2;
    } else {
      return "auto";
    }
    ;
  })();
  if (track_type1 === "auto") {
    if (truth_(in_stack_resource_context_QMARK_())) {
      return "stack";
    } else {
      return "gc";
    }
  } else {
    if (truth_(string_QMARK_(track_type1))) {
      return track_type1;
    } else {
      if (truth_((() => {
        const or__23576__auto__3 = array_QMARK_(track_type1);
        if (truth_(or__23576__auto__3)) {
          return or__23576__auto__3;
        } else {
          const c__23538__auto__4 = Set;
          const x__23539__auto__5 = track_type1;
          const ret__23540__auto__6 = x__23539__auto__5 instanceof c__23538__auto__4;
          return ret__23540__auto__6;
        }
        ;
      })())) {
        const s7 = new Set(track_type1);
        if (truth_((() => {
          const and__23608__auto__8 = s7.has("gc");
          if (truth_(and__23608__auto__8)) {
            return s7.has("stack");
          } else {
            return and__23608__auto__8;
          }
          ;
        })())) {
          return "gc_and_stack";
        } else {
          if (truth_(s7.has("gc"))) {
            return "gc";
          } else {
            if (truth_(s7.has("stack"))) {
              return "stack";
            } else {
              if ("else") {
                return track_type1;
              } else {
                return null;
              }
            }
          }
        }
        ;
      } else {
        if ("else") {
          return track_type1;
        } else {
          return null;
        }
      }
    }
  }
  ;
};
var track = /* @__PURE__ */ (() => {
  const impl251 = (function(item, keymap) {
    const keymap2 = (() => {
      const or__23576__auto__3 = keymap;
      if (truth_(or__23576__auto__3)) {
        return or__23576__auto__3;
      } else {
        return {};
      }
      ;
    })();
    const track_type4 = keymap2.tracktype;
    const dispose_fn5 = keymap2.disposefn;
    const track_type6 = normalize_track_type(track_type4);
    if (truth_((() => {
      const and__23608__auto__8 = (() => {
        const or__23576__auto__7 = track_type6 === "gc";
        if (or__23576__auto__7) {
          return or__23576__auto__7;
        } else {
          return track_type6 === "gc_and_stack";
        }
        ;
      })();
      if (truth_(and__23608__auto__8)) {
        return not(dispose_fn5);
      } else {
        return and__23608__auto__8;
      }
      ;
    })())) {
      throw ex_info("gc track types must have a dispose function that does *not*\nreference item.", { "item": item, "track-type": track_type6 });
    }
    ;
    const dispose_fn9 = (() => {
      const or__23576__auto__10 = dispose_fn5;
      if (truth_(or__23576__auto__10)) {
        return or__23576__auto__10;
      } else {
        return item;
      }
      ;
    })();
    if (truth_(fn_QMARK_(dispose_fn9))) {
    } else {
      throw ex_info("The dispose method must be a clojurescript function.", { "dispose-fn": dispose_fn9 });
    }
    ;
    return track_impl(item, dispose_fn9, track_type6);
  });
  const impl2611 = (function(item) {
    return track(item, null);
  });
  const f22 = (function(...args23) {
    const self2712 = this;
    const G__2813 = args23.length;
    switch (G__2813) {
      case 2:
        return impl251.call(self2712, args23[0], args23[1]);
        break;
      case 1:
        return impl2611.call(self2712, args23[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args23.length ?? ""}`);
    }
    ;
  });
  return f22;
})();

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

// node_modules/.pnpm/proj-wasm@0.1.0-alpha10/node_modules/proj-wasm/dist/proj.mjs
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var PROJ_VERSION_MAJOR;
var PROJ_VERSION_MINOR;
var PROJ_VERSION_PATCH;
var PJ_CATEGORY_ELLIPSOID;
var PJ_CATEGORY_PRIME_MERIDIAN;
var PJ_CATEGORY_DATUM;
var PJ_CATEGORY_CRS;
var PJ_CATEGORY_COORDINATE_OPERATION;
var PJ_CATEGORY_DATUM_ENSEMBLE;
var PJ_FWD;
var PJ_IDENT;
var PJ_INV;
var PJ_LOG_NONE;
var PJ_LOG_ERROR;
var PJ_LOG_DEBUG;
var PJ_LOG_TRACE;
var PJ_LOG_TELL;
var PJ_LOG_DEBUG_MAJOR;
var PJ_LOG_DEBUG_MINOR;
var PROJ_ERR_INVALID_OP;
var PROJ_ERR_INVALID_OP_WRONG_SYNTAX;
var PROJ_ERR_INVALID_OP_MISSING_ARG;
var PROJ_ERR_INVALID_OP_ILLEGAL_ARG_VALUE;
var PROJ_ERR_INVALID_OP_MUTUALLY_EXCLUSIVE_ARGS;
var PROJ_ERR_INVALID_OP_FILE_NOT_FOUND_OR_INVALID;
var PROJ_ERR_COORD_TRANSFM;
var PROJ_ERR_COORD_TRANSFM_INVALID_COORD;
var PROJ_ERR_COORD_TRANSFM_OUTSIDE_PROJECTION_DOMAIN;
var PROJ_ERR_COORD_TRANSFM_NO_OPERATION;
var PROJ_ERR_COORD_TRANSFM_OUTSIDE_GRID;
var PROJ_ERR_COORD_TRANSFM_GRID_AT_NODATA;
var PROJ_ERR_COORD_TRANSFM_NO_CONVERGENCE;
var PROJ_ERR_COORD_TRANSFM_MISSING_TIME;
var PROJ_ERR_OTHER;
var PROJ_ERR_OTHER_API_MISUSE;
var PROJ_ERR_OTHER_NO_INVERSE_OP;
var PROJ_ERR_OTHER_NETWORK_ERROR;
var PJ_GUESSED_WKT2_2019;
var PJ_GUESSED_WKT2_2018;
var PJ_GUESSED_WKT2_2015;
var PJ_GUESSED_WKT1_GDAL;
var PJ_GUESSED_WKT1_ESRI;
var PJ_GUESSED_NOT_WKT;
var PJ_TYPE_UNKNOWN;
var PJ_TYPE_ELLIPSOID;
var PJ_TYPE_PRIME_MERIDIAN;
var PJ_TYPE_GEODETIC_REFERENCE_FRAME;
var PJ_TYPE_DYNAMIC_GEODETIC_REFERENCE_FRAME;
var PJ_TYPE_VERTICAL_REFERENCE_FRAME;
var PJ_TYPE_DYNAMIC_VERTICAL_REFERENCE_FRAME;
var PJ_TYPE_DATUM_ENSEMBLE;
var PJ_TYPE_CRS;
var PJ_TYPE_GEODETIC_CRS;
var PJ_TYPE_GEOCENTRIC_CRS;
var PJ_TYPE_GEOGRAPHIC_CRS;
var PJ_TYPE_GEOGRAPHIC_2D_CRS;
var PJ_TYPE_GEOGRAPHIC_3D_CRS;
var PJ_TYPE_VERTICAL_CRS;
var PJ_TYPE_PROJECTED_CRS;
var PJ_TYPE_COMPOUND_CRS;
var PJ_TYPE_TEMPORAL_CRS;
var PJ_TYPE_ENGINEERING_CRS;
var PJ_TYPE_BOUND_CRS;
var PJ_TYPE_OTHER_CRS;
var PJ_TYPE_CONVERSION;
var PJ_TYPE_TRANSFORMATION;
var PJ_TYPE_CONCATENATED_OPERATION;
var PJ_TYPE_OTHER_COORDINATE_OPERATION;
var PJ_TYPE_TEMPORAL_DATUM;
var PJ_TYPE_ENGINEERING_DATUM;
var PJ_TYPE_PARAMETRIC_DATUM;
var PJ_TYPE_DERIVED_PROJECTED_CRS;
var PJ_TYPE_COORDINATE_METADATA;
var PJ_COMP_STRICT;
var PJ_COMP_EQUIVALENT;
var PJ_COMP_EQUIVALENT_EXCEPT_AXIS_ORDER_GEOGCRS;
var PJ_WKT2_2015;
var PJ_WKT2_2015_SIMPLIFIED;
var PJ_WKT2_2019;
var PJ_WKT2_2018;
var PJ_WKT2_2019_SIMPLIFIED;
var PJ_WKT2_2018_SIMPLIFIED;
var PJ_WKT1_GDAL;
var PJ_WKT1_ESRI;
var PJ_CRS_EXTENT_NONE;
var PJ_CRS_EXTENT_BOTH;
var PJ_CRS_EXTENT_INTERSECTION;
var PJ_CRS_EXTENT_SMALLEST;
var PROJ_GRID_AVAILABILITY_USED_FOR_SORTING;
var PROJ_GRID_AVAILABILITY_DISCARD_OPERATION_IF_MISSING_GRID;
var PROJ_GRID_AVAILABILITY_IGNORED;
var PROJ_GRID_AVAILABILITY_KNOWN_AVAILABLE;
var PJ_PROJ_5;
var PJ_PROJ_4;
var PROJ_SPATIAL_CRITERION_STRICT_CONTAINMENT;
var PROJ_SPATIAL_CRITERION_PARTIAL_INTERSECTION;
var PROJ_INTERMEDIATE_CRS_USE_ALWAYS;
var PROJ_INTERMEDIATE_CRS_USE_IF_NO_DIRECT_TRANSFORMATION;
var PROJ_INTERMEDIATE_CRS_USE_NEVER;
var PJ_CS_TYPE_UNKNOWN;
var PJ_CS_TYPE_CARTESIAN;
var PJ_CS_TYPE_ELLIPSOIDAL;
var PJ_CS_TYPE_VERTICAL;
var PJ_CS_TYPE_SPHERICAL;
var PJ_CS_TYPE_ORDINAL;
var PJ_CS_TYPE_PARAMETRIC;
var PJ_CS_TYPE_DATETIMETEMPORAL;
var PJ_CS_TYPE_TEMPORALCOUNT;
var PJ_CS_TYPE_TEMPORALMEASURE;
var PJ_UT_ANGULAR;
var PJ_UT_LINEAR;
var PJ_UT_SCALE;
var PJ_UT_TIME;
var PJ_UT_PARAMETRIC;
var PJ_CART2D_EASTING_NORTHING;
var PJ_CART2D_NORTHING_EASTING;
var PJ_CART2D_NORTH_POLE_EASTING_SOUTH_NORTHING_SOUTH;
var PJ_CART2D_SOUTH_POLE_EASTING_NORTH_NORTHING_NORTH;
var PJ_CART2D_WESTING_SOUTHING;
var PJ_ELLPS2D_LONGITUDE_LATITUDE;
var PJ_ELLPS2D_LATITUDE_LONGITUDE;
var PJ_ELLPS3D_LONGITUDE_LATITUDE_HEIGHT;
var PJ_ELLPS3D_LATITUDE_LONGITUDE_HEIGHT;
var fndefs;
var init_fndefs = __esm({
  "fndefs.mjs"() {
    init_esbuild_shims();
    PROJ_VERSION_MAJOR = 9;
    PROJ_VERSION_MINOR = 9;
    PROJ_VERSION_PATCH = 0;
    PJ_CATEGORY_ELLIPSOID = 0;
    PJ_CATEGORY_PRIME_MERIDIAN = 1;
    PJ_CATEGORY_DATUM = 2;
    PJ_CATEGORY_CRS = 3;
    PJ_CATEGORY_COORDINATE_OPERATION = 4;
    PJ_CATEGORY_DATUM_ENSEMBLE = 5;
    PJ_FWD = 1;
    PJ_IDENT = 0;
    PJ_INV = -1;
    PJ_LOG_NONE = 0;
    PJ_LOG_ERROR = 1;
    PJ_LOG_DEBUG = 2;
    PJ_LOG_TRACE = 3;
    PJ_LOG_TELL = 4;
    PJ_LOG_DEBUG_MAJOR = 2;
    PJ_LOG_DEBUG_MINOR = 3;
    PROJ_ERR_INVALID_OP = 1024;
    PROJ_ERR_INVALID_OP_WRONG_SYNTAX = 1025;
    PROJ_ERR_INVALID_OP_MISSING_ARG = 1026;
    PROJ_ERR_INVALID_OP_ILLEGAL_ARG_VALUE = 1027;
    PROJ_ERR_INVALID_OP_MUTUALLY_EXCLUSIVE_ARGS = 1028;
    PROJ_ERR_INVALID_OP_FILE_NOT_FOUND_OR_INVALID = 1029;
    PROJ_ERR_COORD_TRANSFM = 2048;
    PROJ_ERR_COORD_TRANSFM_INVALID_COORD = 2049;
    PROJ_ERR_COORD_TRANSFM_OUTSIDE_PROJECTION_DOMAIN = 2050;
    PROJ_ERR_COORD_TRANSFM_NO_OPERATION = 2051;
    PROJ_ERR_COORD_TRANSFM_OUTSIDE_GRID = 2052;
    PROJ_ERR_COORD_TRANSFM_GRID_AT_NODATA = 2053;
    PROJ_ERR_COORD_TRANSFM_NO_CONVERGENCE = 2054;
    PROJ_ERR_COORD_TRANSFM_MISSING_TIME = 2055;
    PROJ_ERR_OTHER = 4096;
    PROJ_ERR_OTHER_API_MISUSE = 4097;
    PROJ_ERR_OTHER_NO_INVERSE_OP = 4098;
    PROJ_ERR_OTHER_NETWORK_ERROR = 4099;
    PJ_GUESSED_WKT2_2019 = 0;
    PJ_GUESSED_WKT2_2018 = 0;
    PJ_GUESSED_WKT2_2015 = 1;
    PJ_GUESSED_WKT1_GDAL = 2;
    PJ_GUESSED_WKT1_ESRI = 3;
    PJ_GUESSED_NOT_WKT = 4;
    PJ_TYPE_UNKNOWN = 0;
    PJ_TYPE_ELLIPSOID = 1;
    PJ_TYPE_PRIME_MERIDIAN = 2;
    PJ_TYPE_GEODETIC_REFERENCE_FRAME = 3;
    PJ_TYPE_DYNAMIC_GEODETIC_REFERENCE_FRAME = 4;
    PJ_TYPE_VERTICAL_REFERENCE_FRAME = 5;
    PJ_TYPE_DYNAMIC_VERTICAL_REFERENCE_FRAME = 6;
    PJ_TYPE_DATUM_ENSEMBLE = 7;
    PJ_TYPE_CRS = 8;
    PJ_TYPE_GEODETIC_CRS = 9;
    PJ_TYPE_GEOCENTRIC_CRS = 10;
    PJ_TYPE_GEOGRAPHIC_CRS = 11;
    PJ_TYPE_GEOGRAPHIC_2D_CRS = 12;
    PJ_TYPE_GEOGRAPHIC_3D_CRS = 13;
    PJ_TYPE_VERTICAL_CRS = 14;
    PJ_TYPE_PROJECTED_CRS = 15;
    PJ_TYPE_COMPOUND_CRS = 16;
    PJ_TYPE_TEMPORAL_CRS = 17;
    PJ_TYPE_ENGINEERING_CRS = 18;
    PJ_TYPE_BOUND_CRS = 19;
    PJ_TYPE_OTHER_CRS = 20;
    PJ_TYPE_CONVERSION = 21;
    PJ_TYPE_TRANSFORMATION = 22;
    PJ_TYPE_CONCATENATED_OPERATION = 23;
    PJ_TYPE_OTHER_COORDINATE_OPERATION = 24;
    PJ_TYPE_TEMPORAL_DATUM = 25;
    PJ_TYPE_ENGINEERING_DATUM = 26;
    PJ_TYPE_PARAMETRIC_DATUM = 27;
    PJ_TYPE_DERIVED_PROJECTED_CRS = 28;
    PJ_TYPE_COORDINATE_METADATA = 29;
    PJ_COMP_STRICT = 0;
    PJ_COMP_EQUIVALENT = 1;
    PJ_COMP_EQUIVALENT_EXCEPT_AXIS_ORDER_GEOGCRS = 2;
    PJ_WKT2_2015 = 0;
    PJ_WKT2_2015_SIMPLIFIED = 1;
    PJ_WKT2_2019 = 2;
    PJ_WKT2_2018 = 2;
    PJ_WKT2_2019_SIMPLIFIED = 3;
    PJ_WKT2_2018_SIMPLIFIED = 3;
    PJ_WKT1_GDAL = 4;
    PJ_WKT1_ESRI = 5;
    PJ_CRS_EXTENT_NONE = 0;
    PJ_CRS_EXTENT_BOTH = 1;
    PJ_CRS_EXTENT_INTERSECTION = 2;
    PJ_CRS_EXTENT_SMALLEST = 3;
    PROJ_GRID_AVAILABILITY_USED_FOR_SORTING = 0;
    PROJ_GRID_AVAILABILITY_DISCARD_OPERATION_IF_MISSING_GRID = 1;
    PROJ_GRID_AVAILABILITY_IGNORED = 2;
    PROJ_GRID_AVAILABILITY_KNOWN_AVAILABLE = 3;
    PJ_PROJ_5 = 0;
    PJ_PROJ_4 = 1;
    PROJ_SPATIAL_CRITERION_STRICT_CONTAINMENT = 0;
    PROJ_SPATIAL_CRITERION_PARTIAL_INTERSECTION = 1;
    PROJ_INTERMEDIATE_CRS_USE_ALWAYS = 0;
    PROJ_INTERMEDIATE_CRS_USE_IF_NO_DIRECT_TRANSFORMATION = 1;
    PROJ_INTERMEDIATE_CRS_USE_NEVER = 2;
    PJ_CS_TYPE_UNKNOWN = 0;
    PJ_CS_TYPE_CARTESIAN = 1;
    PJ_CS_TYPE_ELLIPSOIDAL = 2;
    PJ_CS_TYPE_VERTICAL = 3;
    PJ_CS_TYPE_SPHERICAL = 4;
    PJ_CS_TYPE_ORDINAL = 5;
    PJ_CS_TYPE_PARAMETRIC = 6;
    PJ_CS_TYPE_DATETIMETEMPORAL = 7;
    PJ_CS_TYPE_TEMPORALCOUNT = 8;
    PJ_CS_TYPE_TEMPORALMEASURE = 9;
    PJ_UT_ANGULAR = 0;
    PJ_UT_LINEAR = 1;
    PJ_UT_SCALE = 2;
    PJ_UT_TIME = 3;
    PJ_UT_PARAMETRIC = 4;
    PJ_CART2D_EASTING_NORTHING = 0;
    PJ_CART2D_NORTHING_EASTING = 1;
    PJ_CART2D_NORTH_POLE_EASTING_SOUTH_NORTHING_SOUTH = 2;
    PJ_CART2D_SOUTH_POLE_EASTING_NORTH_NORTHING_NORTH = 3;
    PJ_CART2D_WESTING_SOUTHING = 4;
    PJ_ELLPS2D_LONGITUDE_LATITUDE = 0;
    PJ_ELLPS2D_LATITUDE_LONGITUDE = 1;
    PJ_ELLPS3D_LONGITUDE_LATITUDE_HEIGHT = 0;
    PJ_ELLPS3D_LATITUDE_LONGITUDE_HEIGHT = 1;
    fndefs = { "proj_crs_create_bound_crs": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["base_crs", "pointer"], ["hub_crs", "pointer"], ["transformation", "pointer"]], "proj-returns": "pj" }, "proj_context_create": { "rettype": "pointer", "argtypes": [], "proj-returns": "pj-context", "is-context-fn": false }, "proj_get_crs_list_parameters_create": { "rettype": "pointer", "argtypes": [], "proj-returns": "pj-crs-list-parameters" }, "proj_is_deprecated": { "rettype": "int32", "argtypes": [["obj", "pointer"]] }, "proj_create_from_name": { "rettype": "pointer", "argtypes": [["context", "pointer"], ["auth_name", "string"], ["searchedName", "string"], ["types", "pointer"], ["typesCount", "size-t"], ["approximateMatch", "int32"], ["limitResultCount", "size-t"], ["options", "pointer"]], "proj-returns": "pj-list" }, "proj_prime_meridian_get_parameters": { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["longitude", "double"], ["unit-conv-factor", "double"], ["unit-name", "string"]], "argtypes": [["ctx", "pointer"], ["prime_meridian", "pointer"], ["out_longitude", "pointer"], ["out_unit_conv_factor", "pointer"], ["out_unit_name", "pointer"]] }, "proj_string_destroy": { "rettype": "void", "argtypes": [["str", "string"]] }, "proj_log_func": { "rettype": "void", "argtypes": [["context", "pointer"], ["app_data", "pointer?"], ["logf", "pointer"]] }, "proj_create_geocentric_crs": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_name", "string"], ["datum_name", "string"], ["ellps_name", "string"], ["semi_major_metre", "float64"], ["inv_flattening", "float64"], ["prime_meridian_name", "string"], ["prime_meridian_offset", "float64"], ["angular_units", "string"], ["angular_units_conv", "float64"], ["linear_units", "string"], ["linear_units_conv", "float64"]], "proj-returns": "pj" }, "proj_unit_list_destroy": { "rettype": "void", "argtypes": [["list", "pointer"]] }, "proj_crs_create_projected_3D_crs_from_2D": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_name", "string"], ["projected_2D_crs", "pointer"], ["geog_3D_crs", "pointer"]], "proj-returns": "pj" }, "proj_get_suggested_operation": { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["operations", "pointer"], ["direction", "int32"], ["coord", "pointer"]] }, "proj_operation_factory_context_set_area_of_interest_name": { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["area_name", "string"]] }, "proj_get_ellipsoid": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["obj", "pointer"]], "proj-returns": "pj" }, "proj_coordoperation_get_grid_used": { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["short-name", "string"], ["full-name", "string"], ["package-name", "string"], ["url", "string"], ["direct-download", "int"], ["open-license", "int"], ["available", "int"]], "argtypes": [["ctx", "pointer"], ["coordoperation", "pointer"], ["index", "int32"], ["out_short_name", "pointer"], ["out_full_name", "pointer"], ["out_package_name", "pointer"], ["out_url", "pointer"], ["out_direct_download", "pointer"], ["out_open_license", "pointer"], ["out_available", "pointer"]] }, "proj_crs_is_derived": { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]] }, "proj_int_list_destroy": { "rettype": "void", "argtypes": [["list", "pointer"]] }, "proj_crs_get_coordinate_system": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]], "proj-returns": "pj" }, "proj_context_set_database_path": { "rettype": "int32", "argtypes": [["context", "pointer"], ["db-path", "string"], ["aux-db-paths", "pointer?"], ["options", "pointer?"]] }, "proj_get_crs_info_list_from_database": { "proj-returns": "struct-list", "struct-fields": [["auth-name", "string", 0], ["code", "string", 4], ["name", "string", 8], ["type", "int", 12], ["deprecated", "boolean", 16], ["bbox-valid", "boolean", 20], ["west-lon-degree", "double", 24], ["south-lat-degree", "double", 32], ["east-lon-degree", "double", 40], ["north-lat-degree", "double", 48], ["area-name", "string", 56], ["projection-method-name", "string", 60], ["celestial-body-name", "string", 64]], "struct-def": "proj-crs-info", "struct-params-create": "proj_get_crs_list_parameters_create", "struct-destroy-fn": "proj_crs_info_list_destroy", "argtypes": [["context", "pointer"], ["auth_name", "string"], ["params", "pointer"], ["out_result_count", "pointer"]], "count-arg-name": "out_result_count", "struct-params-destroy": "proj_get_crs_list_parameters_destroy", "rettype": "pointer" }, "proj_is_equivalent_to": { "rettype": "int32", "argtypes": [["obj", "pointer"], ["other", "pointer"], ["criterion", "int32"]] }, "proj_context_set_enable_network": { "rettype": "int32", "argtypes": [["context", "pointer"], ["enabled", "int32"]] }, "proj_crs_create_bound_vertical_crs": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["vert_crs", "pointer"], ["hub_geographic_3D_crs", "pointer"], ["grid_name", "string"]], "proj-returns": "pj" }, "proj_operation_factory_context_set_crs_extent_use": { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["use", "int32"]] }, "proj_create_geographic_crs": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_name", "string"], ["datum_name", "string"], ["ellps_name", "string"], ["semi_major_metre", "float64"], ["inv_flattening", "float64"], ["prime_meridian_name", "string"], ["prime_meridian_offset", "float64"], ["pm_angular_units", "string"], ["pm_units_conv", "float64"], ["ellipsoidal_cs", "pointer"]], "proj-returns": "pj" }, "proj_coordoperation_get_grid_used_count": { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["coordoperation", "pointer"]] }, "proj_list_get_count": { "rettype": "int32", "argtypes": [["result", "pointer"]] }, "proj_create_transformation": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["name", "string"], ["auth_name", "string"], ["code", "string"], ["source_crs", "pointer"], ["target_crs", "pointer"], ["interpolation_crs", "pointer"], ["method_name", "string"], ["method_auth_name", "string"], ["method_code", "string"], ["param_count", "int32"], ["params", "pointer"], ["accuracy", "float64"]], "proj-returns": "pj" }, "proj_coordoperation_get_accuracy": { "rettype": "float64", "argtypes": [["ctx", "pointer"], ["obj", "pointer"]] }, "proj_coordoperation_get_param": { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["name", "string"], ["auth-name", "string"], ["code", "string"], ["value", "double"], ["value-string", "string"], ["unit-conv-factor", "double"], ["unit-name", "string"], ["unit-auth-name", "string"], ["unit-code", "string"], ["unit-category", "string"]], "argtypes": [["ctx", "pointer"], ["coordoperation", "pointer"], ["index", "int32"], ["out_name", "pointer"], ["out_auth_name", "pointer"], ["out_code", "pointer"], ["out_value", "pointer"], ["out_value_string", "pointer"], ["out_unit_conv_factor", "pointer"], ["out_unit_name", "pointer"], ["out_unit_auth_name", "pointer"], ["out_unit_code", "pointer"], ["out_unit_category", "pointer"]] }, "proj_create": { "rettype": "pointer", "argtypes": [["context", "pointer"], ["definition", "string"]], "proj-returns": "pj" }, "proj_create_conversion": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["name", "string"], ["auth_name", "string"], ["code", "string"], ["method_name", "string"], ["method_auth_name", "string"], ["method_code", "string"], ["param_count", "int32"], ["params", "pointer"]], "proj-returns": "pj" }, "proj_get_type": { "rettype": "int32", "argtypes": [["obj", "pointer"]] }, "proj_context_get_database_metadata": { "rettype": "string", "argtypes": [["context", "pointer"], ["key", "string"]] }, "proj_crs_alter_geodetic_crs": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["obj", "pointer"], ["new_geod_crs", "pointer"]], "proj-returns": "pj" }, "proj_concatoperation_get_step_count": { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["concatoperation", "pointer"]] }, "proj_operation_factory_context_set_discard_superseded": { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["discard", "int32"]] }, "proj_is_derived_crs": { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]] }, "proj_get_units_from_database": { "rettype": "pointer", "argtypes": [["context", "pointer"], ["auth_name", "string"], ["category", "string"], ["allow_deprecated", "int32"], ["out_result_count", "pointer"]], "proj-returns": "struct-list", "struct-def": "proj-unit-info", "struct-fields": [["auth-name", "string", 0], ["code", "string", 4], ["name", "string", 8], ["category", "string", 12], ["conv-factor", "double", 16], ["proj-short-name", "string", 24], ["deprecated", "boolean", 28]], "struct-destroy-fn": "proj_unit_list_destroy", "count-arg-name": "out_result_count" }, "proj_crs_get_coordoperation": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]], "proj-returns": "pj" }, "proj_coordoperation_has_ballpark_transformation": { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["coordoperation", "pointer"]] }, "proj_get_area_of_use": { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["west-lon-degree", "double"], ["south-lat-degree", "double"], ["east-lon-degree", "double"], ["north-lat-degree", "double"], ["area-name", "string"]], "argtypes": [["context", "pointer"], ["obj", "pointer"], ["out_west_lon_degree", "pointer"], ["out_south_lat_degree", "pointer"], ["out_east_lon_degree", "pointer"], ["out_north_lat_degree", "pointer"], ["out_area_name", "pointer"]] }, "proj_coord": { "rettype": "pointer", "argtypes": [["x", "float64"], ["y", "float64"], ["z", "float64"], ["t", "float64"]] }, "proj_context_errno_string": { "rettype": "string", "argtypes": [["err", "int32"]] }, "proj_get_insert_statements": { "rettype": "pointer", "argtypes": [["context", "pointer"], ["session", "pointer"], ["object", "pointer"], ["authority", "string"], ["code", "string"], ["numeric_codes", "int32"], ["allowed_authorities", "pointer"], ["options", "pointer"]], "proj-returns": "string-list" }, "proj_string_list_destroy": { "rettype": "void", "argtypes": [["list", "pointer"]] }, "proj_trans_array": { "rettype": "int32", "argtypes": [["p", "pointer"], ["direction", "int32"], ["n", "size-t"], ["coord", "pointer"]], "argsemantics": [["coord", "coord-array"], ["n", "coord-count"]] }, "proj_context_clone": { "rettype": "pointer", "argtypes": [["ctx", "pointer"]], "proj-returns": "pj-context", "is-context-fn": false }, "proj_is_equivalent_to_with_ctx": { "rettype": "int32", "argtypes": [["context", "pointer"], ["obj", "pointer"], ["other", "pointer"], ["criterion", "int32"]] }, "proj_operation_factory_context_set_allow_use_intermediate_crs": { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["use", "int32"]] }, "proj_coordoperation_get_param_index": { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["coordoperation", "pointer"], ["name", "string"]] }, "proj_context_get_database_structure": { "rettype": "pointer", "argtypes": [["context", "pointer"], ["options", "pointer"]], "proj-returns": "string-list" }, "proj_operation_factory_context_destroy": { "rettype": "void", "argtypes": [["ctx", "pointer"]], "is-context-fn": false }, "proj_get_celestial_body_list_from_database": { "rettype": "pointer", "argtypes": [["context", "pointer"], ["auth_name", "string"], ["out_result_count", "pointer"]], "proj-returns": "struct-list", "struct-def": "proj-celestial-body-info", "struct-fields": [["auth-name", "string", 0], ["name", "string", 4]], "struct-destroy-fn": "proj_celestial_body_list_destroy", "count-arg-name": "out_result_count" }, "proj_celestial_body_list_destroy": { "rettype": "void", "argtypes": [["list", "pointer"]] }, "proj_create_compound_crs": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_name", "string"], ["horiz_crs", "pointer"], ["vert_crs", "pointer"]], "proj-returns": "pj" }, "proj_coordoperation_get_towgs84_values": { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["values", "double-array", "count-arg", "value_count"]], "argtypes": [["ctx", "pointer"], ["coordoperation", "pointer"], ["out_values", "pointer"], ["value_count", "int32"], ["emit_error_if_incompatible", "int32"]] }, "proj_get_remarks": { "rettype": "string", "argtypes": [["obj", "pointer"]] }, "proj_get_geoid_models_from_database": { "rettype": "pointer", "argtypes": [["context", "pointer"], ["auth_name", "string"], ["code", "string"], ["options", "pointer"]], "proj-returns": "string-list" }, "proj_crs_alter_cs_linear_unit": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["obj", "pointer"], ["linear_units", "string"], ["linear_units_conv", "float64"], ["unit_auth_name", "string"], ["unit_code", "string"]], "proj-returns": "pj" }, "proj_uom_get_info_from_database": { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["name", "string"], ["conv-factor", "double"], ["category", "string"]], "argtypes": [["context", "pointer"], ["auth_name", "string"], ["code", "string"], ["out_name", "pointer"], ["out_conv_factor", "pointer"], ["out_category", "pointer"]] }, "proj_normalize_for_visualization": { "rettype": "pointer", "argtypes": [["context", "pointer"], ["obj", "pointer"]], "proj-returns": "pj" }, "proj_crs_get_datum_ensemble": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]], "proj-returns": "pj" }, "proj_create_crs_to_crs": { "rettype": "pointer", "argtypes": [["context", "pointer"], ["source_crs", "string"], ["target_crs", "string"], ["area", "pointer?"]], "argsemantics": [["area", "pj-area", "default", 0]], "proj-returns": "pj", "isolate-context?": true }, "proj_alter_name": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["obj", "pointer"], ["name", "string"]], "proj-returns": "pj" }, "proj_coordinate_metadata_get_epoch": { "rettype": "float64", "argtypes": [["ctx", "pointer"], ["obj", "pointer"]] }, "proj_context_errno": { "rettype": "int32", "argtypes": [["context", "pointer"]] }, "proj_trans_generic": { "rettype": "size-t", "argtypes": [["p", "pointer"], ["direction", "int32"], ["x", "pointer"], ["sx", "size-t"], ["nx", "size-t"], ["y", "pointer"], ["sy", "size-t"], ["ny", "size-t"], ["z", "pointer?"], ["sz", "size-t"], ["nz", "size-t"], ["t", "pointer?"], ["st", "size-t"], ["nt", "size-t"]] }, "proj_clone": { "rettype": "pointer", "argtypes": [["context", "pointer"], ["p", "pointer"]], "proj-returns": "pj" }, "proj_coordoperation_create_inverse": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["obj", "pointer"]], "proj-returns": "pj" }, "proj_crs_demote_to_2D": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_2D_name", "string"], ["crs_3D", "pointer"]], "proj-returns": "pj" }, "proj_create_cartesian_2D_cs": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["type", "int32"], ["unit_name", "string"], ["unit_conv_factor", "float64"]], "proj-returns": "pj" }, "proj_context_is_network_enabled": { "rettype": "int32", "argtypes": [["context", "pointer"]] }, "proj_get_scope": { "rettype": "string", "argtypes": [["obj", "pointer"]] }, "proj_destroy": { "rettype": "pointer", "argtypes": [["pj", "pointer"]] }, "proj_operation_factory_context_set_allow_ballpark_transformations": { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["allow", "int32"]] }, "proj_crs_get_datum": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]], "proj-returns": "pj" }, "proj_operation_factory_context_set_area_of_interest": { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["west_lon_degree", "float64"], ["south_lat_degree", "float64"], ["east_lon_degree", "float64"], ["north_lat_degree", "float64"]] }, "proj_create_cs": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["type", "int32"], ["axis_count", "int32"], ["axis", "pointer"]], "proj-returns": "pj" }, "proj_create_projected_crs": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_name", "string"], ["geodetic_crs", "pointer"], ["conversion", "pointer"], ["coordinate_system", "pointer"]], "proj-returns": "pj" }, "proj_as_proj_string": { "rettype": "string", "argtypes": [["context", "pointer"], ["pj", "pointer"], ["type", "int32"], ["options", "pointer?"]], "argsemantics": [["options", "string-array?", "default", null]] }, "proj_operation_factory_context_set_grid_availability_use": { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["use", "int32"]] }, "proj_create_derived_geographic_crs": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_name", "string"], ["base_geographic_crs", "pointer"], ["conversion", "pointer"], ["ellipsoidal_cs", "pointer"]], "proj-returns": "pj" }, "proj_create_crs_to_crs_from_pj": { "rettype": "pointer", "argtypes": [["context", "pointer"], ["source_crs", "pointer"], ["target_crs", "pointer"], ["area", "pointer?"], ["options", "pointer?"]], "argsemantics": [["area", "pj-area", "default", 0], ["options", "string-array?", "default", null]], "proj-returns": "pj" }, "proj_coordoperation_get_method_info": { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["method-name", "string"], ["method-auth-name", "string"], ["method-code", "string"]], "argtypes": [["ctx", "pointer"], ["coordoperation", "pointer"], ["out_method_name", "pointer"], ["out_method_auth_name", "pointer"], ["out_method_code", "pointer"]] }, "proj_get_source_crs": { "rettype": "pointer", "argtypes": [["context", "pointer"], ["pj", "pointer"]], "proj-returns": "pj" }, "proj_ellipsoid_get_parameters": { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["semi-major-metre", "double"], ["semi-minor-metre", "double"], ["is-semi-minor-computed", "int"], ["inv-flattening", "double"]], "argtypes": [["ctx", "pointer"], ["ellipsoid", "pointer"], ["out_semi_major_metre", "pointer"], ["out_semi_minor_metre", "pointer"], ["out_is_semi_minor_computed", "pointer"], ["out_inv_flattening", "pointer"]] }, "proj_context_destroy": { "rettype": "void", "argtypes": [["context", "pointer"]], "is-context-fn": false }, "proj_cs_get_axis_info": { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["name", "string"], ["abbreviation", "string"], ["direction", "string"], ["unit-conv-factor", "double"], ["unit-name", "string"], ["unit-auth-name", "string"], ["unit-code", "string"]], "argtypes": [["ctx", "pointer"], ["cs", "pointer"], ["index", "int32"], ["out_name", "pointer"], ["out_abbrev", "pointer"], ["out_direction", "pointer"], ["out_unit_conv_factor", "pointer"], ["out_unit_name", "pointer"], ["out_unit_auth_name", "pointer"], ["out_unit_code", "pointer"]] }, "proj_query_geodetic_crs_from_datum": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_auth_name", "string"], ["datum_auth_name", "string"], ["datum_code", "string"], ["crs_type", "string"]], "proj-returns": "pj-list" }, "proj_coordoperation_requires_per_coordinate_input_time": { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["coordoperation", "pointer"]] }, "proj_create_ellipsoidal_2D_cs": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["type", "int32"], ["unit_name", "string"], ["unit_conv_factor", "float64"]], "proj-returns": "pj" }, "proj_create_from_database": { "rettype": "pointer", "argtypes": [["context", "pointer"], ["auth_name", "string"], ["code", "string"], ["category", "int32"], ["use-proj-alternative-grid-names", "int32"], ["options", "pointer?"]], "argsemantics": [["category", "int32", "default", PJ_CATEGORY_CRS], ["use-proj-alternative-grid-names", "boolean", "default", false], ["options", "string-array?", "default", null]], "proj-returns": "pj" }, "proj_alter_id": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["obj", "pointer"], ["auth_name", "string"], ["code", "string"]], "proj-returns": "pj" }, "proj_crs_has_point_motion_operation": { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]] }, "proj_operation_factory_context_set_allowed_intermediate_crs": { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["list_of_auth_name_codes", "pointer"]] }, "proj_crs_promote_to_3D": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_3D_name", "string"], ["crs_2D", "pointer"]], "proj-returns": "pj" }, "proj_get_prime_meridian": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["obj", "pointer"]], "proj-returns": "pj" }, "proj_datum_ensemble_get_accuracy": { "rettype": "float64", "argtypes": [["ctx", "pointer"], ["datum_ensemble", "pointer"]] }, "proj_get_authorities_from_database": { "rettype": "pointer", "argtypes": [["context", "pointer"]], "proj-returns": "string-list" }, "proj_get_scope_ex": { "rettype": "string", "argtypes": [["obj", "pointer"], ["domainIdx", "int32"]] }, "proj_get_target_crs": { "rettype": "pointer", "argtypes": [["context", "pointer"], ["pj", "pointer"]], "proj-returns": "pj" }, "proj_get_area_of_use_ex": { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["west-lon-degree", "double"], ["south-lat-degree", "double"], ["east-lon-degree", "double"], ["north-lat-degree", "double"], ["area-name", "string"]], "argtypes": [["context", "pointer"], ["obj", "pointer"], ["domainIdx", "int32"], ["out_west_lon_degree", "pointer"], ["out_south_lat_degree", "pointer"], ["out_east_lon_degree", "pointer"], ["out_north_lat_degree", "pointer"], ["out_area_name", "pointer"]] }, "proj_get_id_auth_name": { "rettype": "string", "argtypes": [["obj", "pointer"], ["index", "int32"]] }, "proj_coordinate_metadata_create": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs", "pointer"], ["epoch", "float64"]], "proj-returns": "pj" }, "proj_create_geocentric_crs_from_datum": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_name", "string"], ["datum_or_datum_ensemble", "pointer"], ["linear_units", "string"], ["linear_units_conv", "float64"]], "proj-returns": "pj" }, "proj_crs_info_list_destroy": { "rettype": "void", "argtypes": [["list", "pointer"]] }, "proj_operation_factory_context_set_use_proj_alternative_grid_names": { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["usePROJNames", "int32"]] }, "proj_context_get_database_path": { "rettype": "string", "argtypes": [["context", "pointer"]] }, "proj_context_set_network_callbacks": { "rettype": "int32", "argtypes": [["context", "pointer"], ["open_cbk", "pointer"], ["close_cbk", "pointer"], ["get_header_cbk", "pointer"], ["read_range_cbk", "pointer"], ["user_data", "pointer?"]] }, "proj_is_crs": { "rettype": "int32", "argtypes": [["obj", "pointer"]] }, "proj_get_crs_list_parameters_destroy": { "rettype": "void", "argtypes": [["params", "pointer"]] }, "proj_xy_dist": { "rettype": "float64", "argtypes": [["a", "pointer"], ["b", "pointer"]] }, "proj_context_guess_wkt_dialect": { "rettype": "int32", "argtypes": [["context", "pointer"], ["wkt", "string"]] }, "proj_create_operation_factory_context": { "rettype": "pointer", "argtypes": [["context", "pointer"], ["authority", "string"]], "proj-returns": "pj-operation-factory-context" }, "proj_list_destroy": { "rettype": "void", "argtypes": [["result", "pointer"]] }, "proj_cs_get_type": { "rettype": "int32", "argtypes": [["context", "pointer"], ["cs", "pointer"]] }, "proj_as_wkt": { "rettype": "string", "argtypes": [["context", "pointer"], ["pj", "pointer"], ["type", "int32"], ["options", "pointer?"]], "argsemantics": [["options", "string-array?", "default", null], ["type", "int32", "default", PJ_WKT2_2019]] }, "proj_insert_object_session_create": { "rettype": "pointer", "argtypes": [["context", "pointer"]], "proj-returns": "pj-insert-session" }, "proj_convert_conversion_to_other_method": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["conversion", "pointer"], ["new_method_epsg_code", "int32"], ["new_method_name", "string"]], "proj-returns": "pj" }, "proj_operation_factory_context_set_desired_accuracy": { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["accuracy", "float64"]] }, "proj_list_get": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["result", "pointer"], ["index", "int32"]], "proj-returns": "pj" }, "proj_create_geographic_crs_from_datum": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_name", "string"], ["datum_or_datum_ensemble", "pointer"], ["ellipsoidal_cs", "pointer"]], "proj-returns": "pj" }, "proj_get_name": { "rettype": "string", "argtypes": [["obj", "pointer"]] }, "proj_crs_alter_parameters_linear_unit": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["obj", "pointer"], ["linear_units", "string"], ["linear_units_conv", "float64"], ["unit_auth_name", "string"], ["unit_code", "string"], ["convert_to_new_unit", "int32"]], "proj-returns": "pj" }, "proj_coordoperation_is_instantiable": { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["coordoperation", "pointer"]] }, "proj_crs_alter_cs_angular_unit": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["obj", "pointer"], ["angular_units", "string"], ["angular_units_conv", "float64"], ["unit_auth_name", "string"], ["unit_code", "string"]], "proj-returns": "pj" }, "proj_datum_ensemble_get_member_count": { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["datum_ensemble", "pointer"]] }, "proj_create_vertical_crs": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_name", "string"], ["datum_name", "string"], ["linear_units", "string"], ["linear_units_conv", "float64"]], "proj-returns": "pj" }, "proj_get_domain_count": { "rettype": "int32", "argtypes": [["obj", "pointer"]] }, "proj_get_id_code": { "rettype": "string", "argtypes": [["obj", "pointer"], ["index", "int32"]] }, "proj_operation_factory_context_set_spatial_criterion": { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["criterion", "int32"]] }, "proj_create_ellipsoidal_3D_cs": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["type", "int32"], ["horizontal_angular_unit_name", "string"], ["horizontal_angular_unit_conv_factor", "float64"], ["vertical_linear_unit_name", "string"], ["vertical_linear_unit_conv_factor", "float64"]], "proj-returns": "pj" }, "proj_create_operations": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["source_crs", "pointer"], ["target_crs", "pointer"], ["operationContext", "pointer"]], "proj-returns": "pj-list" }, "proj_grid_get_info_from_database": { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["full-name", "string"], ["package-name", "string"], ["url", "string"], ["direct-download", "int"], ["open-license", "int"], ["available", "int"]], "argtypes": [["context", "pointer"], ["grid_name", "string"], ["out_full_name", "pointer"], ["out_package_name", "pointer"], ["out_url", "pointer"], ["out_direct_download", "pointer"], ["out_open_license", "pointer"], ["out_available", "pointer"]] }, "proj_dynamic_datum_get_frame_reference_epoch": { "rettype": "float64", "argtypes": [["ctx", "pointer"], ["datum", "pointer"]] }, "proj_log_level": { "rettype": "int32", "argtypes": [["context", "pointer"], ["level", "int32"]] }, "proj_context_set_autoclose_database": { "rettype": "void", "argtypes": [["context", "pointer"], ["autoclose", "int32"]] }, "proj_create_vertical_crs_ex": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_name", "string"], ["datum_name", "string"], ["datum_auth_name", "string"], ["datum_code", "string"], ["linear_units", "string"], ["linear_units_conv", "float64"], ["geoid_model_name", "string"], ["geoid_model_auth_name", "string"], ["geoid_model_code", "string"], ["geoid_geog_crs", "pointer"], ["options", "pointer"]], "proj-returns": "pj" }, "proj_cs_get_axis_count": { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["cs", "pointer"]] }, "proj_identify": { "rettype": "pointer", "argtypes": [["context", "pointer"], ["obj", "pointer"], ["auth_name", "string"], ["options", "pointer"], ["out_confidence", "pointer"]], "proj-returns": "pj-list" }, "proj_suggests_code_for": { "rettype": "string", "argtypes": [["context", "pointer"], ["object", "pointer"], ["authority", "string"], ["numeric_code", "int32"], ["options", "pointer"]] }, "proj_concatoperation_get_step": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["concatoperation", "pointer"], ["i_step", "int32"]], "proj-returns": "pj" }, "proj_datum_ensemble_get_member": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["datum_ensemble", "pointer"], ["member_index", "int32"]], "proj-returns": "pj" }, "proj_crs_get_datum_forced": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]], "proj-returns": "pj" }, "proj_crs_create_bound_crs_to_WGS84": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs", "pointer"], ["options", "pointer"]], "proj-returns": "pj" }, "proj_crs_get_sub_crs": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs", "pointer"], ["index", "int32"]], "proj-returns": "pj" }, "proj_get_celestial_body_name": { "rettype": "string", "argtypes": [["ctx", "pointer"], ["obj", "pointer"]] }, "proj_insert_object_session_destroy": { "rettype": "void", "argtypes": [["context", "pointer"], ["session", "pointer"]] }, "proj_create_engineering_crs": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crsName", "string"]], "proj-returns": "pj" }, "proj_crs_get_geodetic_crs": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]], "proj-returns": "pj" }, "proj_create_from_wkt": { "rettype": "pointer", "argtypes": [["context", "pointer"], ["wkt", "string"], ["options", "pointer?"], ["out_warnings", "pointer?"], ["out_grammar_errors", "pointer?"]], "proj-returns": "pj" }, "proj_crs_is_dynamic": { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]] }, "proj_crs_get_horizontal_datum": { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]], "proj-returns": "pj" }, "proj_get_codes_from_database": { "rettype": "pointer", "argtypes": [["context", "pointer"], ["auth_name", "string"], ["type", "int32", "default", PJ_TYPE_CRS], ["allow_deprecated", "int32", "default", 1]], "proj-returns": "string-list" }, "proj_as_projjson": { "rettype": "string", "argtypes": [["context", "pointer"], ["pj", "pointer"], ["options", "pointer?"]], "argsemantics": [["options", "string-array?", "default", null]] }, "proj_get_non_deprecated": { "rettype": "pointer", "argtypes": [["context", "pointer"], ["obj", "pointer"]], "proj-returns": "pj-list" }, "proj_coordoperation_get_param_count": { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["coordoperation", "pointer"]] } };
  }
});
var handler_spec__GT_js;
var handlers__GT_js;
var coerce_size;
var opts_get;
var coerce_cat;
var broadcast_to_handlers_BANG_;
var init_pool_BANG_;
var dispatch_id_counter;
var sanitize_reason;
var worker_call;
var terminate_pool_BANG_;
var pool_size;
var set_log_config_BANG_;
var cmd_args_registry;
var register_cmd_args_BANG_;
var ccall_args;
var cmd_args;
var claim;
var DEFAULT_MIN_AGE_MS;
var now_ms;
var pending_disposes;
var pending_disposes_by_parent;
var in_flight_by_parent;
var gate_promises_by_parent;
var ensure_gate_promise_BANG_;
var resolve_gate_promise_BANG_;
var await_parent_drain_BANG_;
var capture_pending_dispose_BANG_;
var drain_pending_disposes_for_parent_BANG_;
var flush_pending_disposes_BANG_;
var fire_and_capture_dispose_BANG_;
var library_contexts;
var ensure_library_BANG_;
var register_library_context_BANG_;
var default_worker_idx_extractor;
var worker_idx_from_args;
var assign_worker_for_context_BANG_;
var track_context_BANG_;
var untrack_context_BANG_;
var reset_library_context_BANG_;
var register_handle_BANG_;
var dispose_handle_BANG_;
var in_flight_count_for_parent;
var ref_handle_BANG_;
var unref_handle_BANG_;
var entry_age_ms;
var entry_busy_QMARK_;
var entry_evictable_QMARK_;
var find_oldest_evictable;
var evicted_owner_marker;
var invalidate_evicted_BANG_;
var evicted_QMARK_;
var bounded_create_handle_BANG_;
var get_pool_detail;
var init_pool = __esm({
  "node_modules/ffi-wasm/src/cljc/net/willcohen/native/pool.mjs"() {
    init_esbuild_shims();
    handler_spec__GT_js = /* @__PURE__ */ __name(function(spec2) {
      const obj1 = js_obj();
      const temp__23263__auto__2 = get(spec2, "module");
      if (truth_(temp__23263__auto__2)) {
        const m3 = temp__23263__auto__2;
        obj1["module"] = m3;
      }
      ;
      if (truth_(contains_QMARK_(spec2, "init"))) {
        obj1["init"] = get(spec2, "init");
      }
      ;
      return obj1;
    }, "handler_spec__GT_js");
    handlers__GT_js = /* @__PURE__ */ __name(function(handlers) {
      const obj1 = js_obj();
      const put_BANG_2 = /* @__PURE__ */ __name(function(k, v) {
        return obj1[`${k ?? ""}`] = handler_spec__GT_js(v);
      }, "put_BANG_2");
      for (let G__3 of iterable(handlers)) {
        const vec__47 = G__3;
        const k8 = nth(vec__47, 0, null);
        const v9 = nth(vec__47, 1, null);
        put_BANG_2(k8, v9);
      }
      ;
      return obj1;
    }, "handlers__GT_js");
    coerce_size = /* @__PURE__ */ __name(function(size) {
      if (truth_((() => {
        const or__23674__auto__1 = size == null;
        if (or__23674__auto__1) {
          return or__23674__auto__1;
        } else {
          return "auto" === size;
        }
        ;
      })())) {
        return "auto";
      } else {
        return size;
      }
      ;
    }, "coerce_size");
    opts_get = /* @__PURE__ */ __name(function(opts, k) {
      if (opts == null) {
        return null;
      } else {
        if (truth_(object_QMARK_(opts))) {
          const n1 = `${k ?? ""}`;
          const js_key2 = replace(n1, "-", "_");
          const v3 = opts[js_key2];
          if (void 0 === v3) {
            return opts[n1];
          } else {
            return v3;
          }
          ;
        } else {
          if (truth_(map_QMARK_(opts))) {
            return get(opts, k);
          } else {
            if ("else") {
              return null;
            } else {
              return null;
            }
          }
        }
      }
      ;
    }, "opts_get");
    coerce_cat = /* @__PURE__ */ __name(function(x) {
      if (truth_(string_QMARK_(x))) {
        return x;
      } else {
        return name(x);
      }
      ;
    }, "coerce_cat");
    broadcast_to_handlers_BANG_ = /* @__PURE__ */ __name(async function(pool, handler_keys, method_name, args_fn) {
      const n11 = pool.size;
      let w2 = 0;
      for (; w2 < n11; w2++) {
        await (async () => {
          const target3 = pool.worker(w2);
          for (let G__4 of iterable(handler_keys)) {
            const k5 = G__4;
            try {
              const handler_proxy6 = target3[k5];
              const method_fn7 = handler_proxy6[method_name];
              await method_fn7.apply(null, args_fn(w2));
            } catch (_e8) {
            }
          }
          return null;
        })();
      }
      ;
      return null;
    }, "broadcast_to_handlers_BANG_");
    init_pool_BANG_ = /* @__PURE__ */ __name(async function(opts) {
      const caller_pool1 = opts_get(opts, "pool");
      if (!(caller_pool1 == null)) {
        return { "pool": caller_pool1, "owned": false };
      } else {
        const handlers2 = opts_get(opts, "handlers");
        const _3 = handlers2 == null ? await (async () => {
          throw ex_info("init-pool! requires :handlers when :pool is absent", { "opts": opts });
        })() : null;
        const size4 = coerce_size(opts_get(opts, "size"));
        const bootstrap5 = await (async () => {
          const or__23674__auto__6 = opts_get(opts, "bootstrap");
          if (truth_(or__23674__auto__6)) {
            return or__23674__auto__6;
          } else {
            return new URL("./worker-bootstrap.mjs", import.meta.url).href;
          }
          ;
        })();
        const cp_opts7 = js_obj("size", size4, "bootstrap", bootstrap5, "handlers", handlers__GT_js(handlers2));
        const pool8 = await WorkerPool.create(cp_opts7);
        const hr9 = opts_get(opts, "handler-runtime");
        const handler_keys10 = vec(Object.keys(handlers2));
        if (!(hr9 == null)) {
          const level11 = opts_get(hr9, "level");
          const cats12 = opts_get(hr9, "categories");
          const cfg13 = js_obj();
          if (!(level11 == null)) {
            cfg13["level"] = coerce_cat(level11);
          }
          ;
          if (!(cats12 == null)) {
            const arr14 = array();
            for (let G__15 of iterable(cats12)) {
              const x16 = G__15;
              arr14.push(coerce_cat(x16));
            }
            ;
            cfg13["categories"] = arr14;
          }
          ;
          await broadcast_to_handlers_BANG_(pool8, handler_keys10, "__setLogConfig", /* @__PURE__ */ __name(function log_config_args(_w) {
            return [cfg13];
          }, "log_config_args"));
        }
        ;
        await broadcast_to_handlers_BANG_(pool8, handler_keys10, "__setWorkerSlot", /* @__PURE__ */ __name(function worker_slot_args(w) {
          return [w];
        }, "worker_slot_args"));
        return { "pool": pool8, "owned": true };
      }
      ;
    }, "init_pool_BANG_");
    dispatch_id_counter = atom(0);
    sanitize_reason = /* @__PURE__ */ __name(function(msg) {
      const s1 = truth_(string_QMARK_(msg)) ? msg : `${msg ?? ""}`;
      const one_line2 = replace(s1, /[\s=]+/, "_");
      if (count(one_line2) > 200) {
        return subs(one_line2, 0, 200);
      } else {
        return one_line2;
      }
      ;
    }, "sanitize_reason");
    worker_call = /* @__PURE__ */ __name(async function(pool, handler_key, method_name, args, worker_idx) {
      const target1 = !(worker_idx == null) ? pool.worker(worker_idx) : pool.any();
      const handler_name2 = `${handler_key ?? ""}`;
      const handler_proxy3 = target1[handler_name2];
      const method_fn4 = handler_proxy3[method_name];
      const call_args5 = await (async () => {
        const or__23674__auto__6 = args;
        if (truth_(or__23674__auto__6)) {
          return or__23674__auto__6;
        } else {
          return [];
        }
        ;
      })();
      const worker_tag7 = !(worker_idx == null) ? worker_idx : "auto";
      const c_fn8 = method_name === "ccall" ? call_args5[0] : null;
      const queue_enabled_QMARK_9 = isEnabled("QUEUE-DISPATCH", "debug");
      const rpc_enabled_QMARK_10 = isEnabled("RPC-POST", "debug");
      const disp_id11 = truth_(await (async () => {
        const or__23674__auto__12 = queue_enabled_QMARK_9;
        if (truth_(or__23674__auto__12)) {
          return or__23674__auto__12;
        } else {
          return rpc_enabled_QMARK_10;
        }
        ;
      })()) ? swap_BANG_(dispatch_id_counter, inc) : null;
      dbgPaired(queue_enabled_QMARK_9, "QUEUE-DISPATCH", { "lib": handler_name2, "fn": method_name, "c-fn": c_fn8, "worker": worker_tag7, "disp-id": disp_id11 });
      dbgPaired(rpc_enabled_QMARK_10, "RPC-POST", { "lib": handler_name2, "fn": method_name, "c-fn": c_fn8, "worker": worker_tag7, "disp-id": disp_id11 });
      return await (async () => {
        try {
          const result13 = await method_fn4.apply(null, call_args5);
          dbgPaired(rpc_enabled_QMARK_10, "RPC-REPLY", { "lib": handler_name2, "fn": method_name, "c-fn": c_fn8, "worker": worker_tag7, "disp-id": disp_id11 });
          dbgPaired(queue_enabled_QMARK_9, "QUEUE-COMPLETE", { "lib": handler_name2, "fn": method_name, "c-fn": c_fn8, "worker": worker_tag7, "disp-id": disp_id11 });
          return result13;
        } catch (e14) {
          const reason15 = sanitize_reason(await (async () => {
            const or__23674__auto__16 = await (async () => {
              const G__217 = e14;
              if (G__217 == null) {
                return null;
              } else {
                return G__217.message;
              }
              ;
            })();
            if (truth_(or__23674__auto__16)) {
              return or__23674__auto__16;
            } else {
              return `${e14 ?? ""}`;
            }
            ;
          })());
          dbgPaired(rpc_enabled_QMARK_10, "RPC-REPLY", { "lib": handler_name2, "fn": method_name, "c-fn": c_fn8, "worker": worker_tag7, "disp-id": disp_id11, "failed": "true", "reason": reason15 });
          dbgPaired(queue_enabled_QMARK_9, "QUEUE-COMPLETE", { "lib": handler_name2, "fn": method_name, "c-fn": c_fn8, "worker": worker_tag7, "disp-id": disp_id11, "failed": "true", "reason": reason15 });
          throw e14;
        }
      })();
    }, "worker_call");
    terminate_pool_BANG_ = /* @__PURE__ */ __name(async function(pool) {
      return await pool.terminate();
    }, "terminate_pool_BANG_");
    pool_size = /* @__PURE__ */ __name(function(pool) {
      return pool.size;
    }, "pool_size");
    set_log_config_BANG_ = /* @__PURE__ */ __name(function(opts) {
      if (opts == null) {
        return setLogConfig(null);
      } else {
        const cfg1 = js_obj();
        if (truth_(contains_QMARK_(opts, "level"))) {
          const l2 = get(opts, "level");
          cfg1["level"] = l2 == null ? null : truth_(string_QMARK_(l2)) ? l2 : "else" ? name(l2) : null;
        }
        ;
        if (truth_(contains_QMARK_(opts, "categories"))) {
          const c3 = get(opts, "categories");
          cfg1["categories"] = c3 == null ? null : "else" ? (() => {
            const arr4 = array();
            for (let G__5 of iterable(c3)) {
              const x6 = G__5;
              arr4.push(coerce_cat(x6));
            }
            ;
            return arr4;
          })() : null;
        }
        ;
        return setLogConfig(cfg1);
      }
      ;
    }, "set_log_config_BANG_");
    cmd_args_registry = atom({});
    register_cmd_args_BANG_ = /* @__PURE__ */ __name(function(op_name, f) {
      return swap_BANG_(cmd_args_registry, assoc, op_name, f);
    }, "register_cmd_args_BANG_");
    ccall_args = /* @__PURE__ */ __name(function(cmd) {
      const extra1 = js_obj();
      const std_keys2 = /* @__PURE__ */ new Set(["cmd", "fn", "returnType", "argTypes", "args"]);
      for (let G__3 of iterable(cmd)) {
        const vec__47 = G__3;
        const k8 = nth(vec__47, 0, null);
        const v9 = nth(vec__47, 1, null);
        if (truth_(!(v9 == null) && not(contains_QMARK_(std_keys2, k8)))) {
          extra1[`${k8 ?? ""}`] = v9;
        }
      }
      ;
      return [get(cmd, "fn"), get(cmd, "returnType"), get(cmd, "argTypes"), get(cmd, "args"), extra1];
    }, "ccall_args");
    cmd_args = /* @__PURE__ */ __name(function(cmd) {
      const op1 = get(cmd, "cmd");
      if (op1 === "ccall") {
        return ccall_args(cmd);
      } else {
        if ("else") {
          const temp__23182__auto__2 = get(deref(cmd_args_registry), op1);
          if (truth_(temp__23182__auto__2)) {
            const f3 = temp__23182__auto__2;
            return f3(cmd);
          } else {
            return [];
          }
          ;
        } else {
          return null;
        }
      }
      ;
    }, "cmd_args");
    claim = /* @__PURE__ */ __name(function(pool) {
      return pool.claim();
    }, "claim");
    DEFAULT_MIN_AGE_MS = 100;
    now_ms = /* @__PURE__ */ __name(function() {
      return Date.now();
    }, "now_ms");
    pending_disposes = atom([]);
    pending_disposes_by_parent = atom({});
    in_flight_by_parent = atom({});
    gate_promises_by_parent = atom({});
    ensure_gate_promise_BANG_ = /* @__PURE__ */ __name(function(parent) {
      if (truth_(contains_QMARK_(deref(gate_promises_by_parent), parent))) {
      } else {
        const resolve_fn1 = atom(null);
        const promise2 = new Promise(function(resolve, _reject) {
          return reset_BANG_(resolve_fn1, resolve);
        });
        swap_BANG_(gate_promises_by_parent, function(m) {
          if (truth_(contains_QMARK_(m, parent))) {
            return m;
          } else {
            return assoc(m, parent, { "promise": promise2, "resolve": deref(resolve_fn1) });
          }
          ;
        });
      }
      ;
      return get(deref(gate_promises_by_parent), parent);
    }, "ensure_gate_promise_BANG_");
    resolve_gate_promise_BANG_ = /* @__PURE__ */ __name(function(parent) {
      const temp__23263__auto__1 = get(deref(gate_promises_by_parent), parent);
      if (truth_(temp__23263__auto__1)) {
        const entry2 = temp__23263__auto__1;
        swap_BANG_(gate_promises_by_parent, dissoc, parent);
        return get(entry2, "resolve")(null);
      }
      ;
    }, "resolve_gate_promise_BANG_");
    await_parent_drain_BANG_ = /* @__PURE__ */ __name(function(parent) {
      if (get(deref(in_flight_by_parent), parent, 0) === 0) {
        return Promise.resolve(null);
      } else {
        return get(ensure_gate_promise_BANG_(parent), "promise");
      }
      ;
    }, "await_parent_drain_BANG_");
    capture_pending_dispose_BANG_ = /* @__PURE__ */ (() => {
      const impl61 = /* @__PURE__ */ __name(function(result) {
        return capture_pending_dispose_BANG_(result, null);
      }, "impl61");
      const impl72 = /* @__PURE__ */ __name(function(result, parent_ctx_id) {
        if (truth_((() => {
          const c__23588__auto__3 = Promise;
          const x__23589__auto__4 = result;
          const ret__23590__auto__5 = x__23589__auto__4 instanceof c__23588__auto__3;
          return ret__23590__auto__5;
        })())) {
          deref(pending_disposes).push(result);
          if (!(parent_ctx_id == null)) {
            const bucket6 = (() => {
              const or__23674__auto__7 = get(deref(pending_disposes_by_parent), parent_ctx_id);
              if (truth_(or__23674__auto__7)) {
                return or__23674__auto__7;
              } else {
                const b8 = [];
                swap_BANG_(pending_disposes_by_parent, assoc, parent_ctx_id, b8);
                return b8;
              }
              ;
            })();
            bucket6.push(result);
          }
        }
        ;
        return result;
      }, "impl72");
      const f3 = /* @__PURE__ */ __name(function(...args4) {
        const self89 = this;
        const G__910 = args4.length;
        switch (G__910) {
          case 1:
            return impl61.call(self89, args4[0]);
            break;
          case 2:
            return impl72.call(self89, args4[0], args4[1]);
            break;
          default:
            throw new Error(`${"Invalid arity: "}${args4.length ?? ""}`);
        }
        ;
      }, "f3");
      return f3;
    })();
    drain_pending_disposes_for_parent_BANG_ = /* @__PURE__ */ __name(function(parent_ctx_id) {
      const bucket1 = get(deref(pending_disposes_by_parent), parent_ctx_id);
      if (truth_((() => {
        const or__23674__auto__2 = bucket1 == null;
        if (or__23674__auto__2) {
          return or__23674__auto__2;
        } else {
          return bucket1.length === 0;
        }
        ;
      })())) {
        return Promise.resolve();
      } else {
        swap_BANG_(pending_disposes_by_parent, dissoc, parent_ctx_id);
        return Promise.allSettled(bucket1);
      }
      ;
    }, "drain_pending_disposes_for_parent_BANG_");
    flush_pending_disposes_BANG_ = /* @__PURE__ */ __name(function() {
      const pending1 = deref(pending_disposes);
      reset_BANG_(pending_disposes, []);
      return Promise.allSettled(pending1);
    }, "flush_pending_disposes_BANG_");
    fire_and_capture_dispose_BANG_ = /* @__PURE__ */ (() => {
      const impl131 = /* @__PURE__ */ __name(function(disposer_fn) {
        return fire_and_capture_dispose_BANG_(disposer_fn, null);
      }, "impl131");
      const impl142 = /* @__PURE__ */ __name(function(disposer_fn, context_info) {
        dbg("EXPLICIT-DISPOSE", (() => {
          const or__23674__auto__3 = context_info;
          if (truth_(or__23674__auto__3)) {
            return or__23674__auto__3;
          } else {
            return {};
          }
          ;
        })());
        return capture_pending_dispose_BANG_(disposer_fn());
      }, "impl142");
      const f10 = /* @__PURE__ */ __name(function(...args11) {
        const self154 = this;
        const G__165 = args11.length;
        switch (G__165) {
          case 1:
            return impl131.call(self154, args11[0]);
            break;
          case 2:
            return impl142.call(self154, args11[0], args11[1]);
            break;
          default:
            throw new Error(`${"Invalid arity: "}${args11.length ?? ""}`);
        }
        ;
      }, "f10");
      return f10;
    })();
    library_contexts = atom({});
    ensure_library_BANG_ = /* @__PURE__ */ (() => {
      const impl201 = /* @__PURE__ */ __name(function(library_key) {
        return ensure_library_BANG_(library_key, null);
      }, "impl201");
      const impl212 = /* @__PURE__ */ __name(function(library_key, opts) {
        if (truth_(contains_QMARK_(deref(library_contexts), library_key))) {
        } else {
          swap_BANG_(library_contexts, assoc, library_key, { "ctx-workers": atom({}), "live-handles": atom({}), "max-live-ctxs": null, "min-age-ms": DEFAULT_MIN_AGE_MS, "evicted": atom(/* @__PURE__ */ new Set([])), "stats": atom({ "evictions": 0, "blocks": 0 }) });
        }
        ;
        if (!(opts == null)) {
          const max_live_ctxs3 = opts_get(opts, "max-live-ctxs");
          const min_age_ms4 = opts_get(opts, "min-age-ms");
          if (!(max_live_ctxs3 == null)) {
            swap_BANG_(library_contexts, assoc_in, [library_key, "max-live-ctxs"], max_live_ctxs3);
          }
          ;
          if (!(min_age_ms4 == null)) {
            return swap_BANG_(library_contexts, assoc_in, [library_key, "min-age-ms"], min_age_ms4);
          }
          ;
        }
        ;
      }, "impl212");
      const f17 = /* @__PURE__ */ __name(function(...args18) {
        const self225 = this;
        const G__236 = args18.length;
        switch (G__236) {
          case 1:
            return impl201.call(self225, args18[0]);
            break;
          case 2:
            return impl212.call(self225, args18[0], args18[1]);
            break;
          default:
            throw new Error(`${"Invalid arity: "}${args18.length ?? ""}`);
        }
        ;
      }, "f17");
      return f17;
    })();
    register_library_context_BANG_ = /* @__PURE__ */ (() => {
      const impl271 = /* @__PURE__ */ __name(function(library_key) {
        return ensure_library_BANG_(library_key);
      }, "impl271");
      const impl282 = /* @__PURE__ */ __name(function(library_key, opts) {
        return ensure_library_BANG_(library_key, opts);
      }, "impl282");
      const f24 = /* @__PURE__ */ __name(function(...args25) {
        const self293 = this;
        const G__304 = args25.length;
        switch (G__304) {
          case 1:
            return impl271.call(self293, args25[0]);
            break;
          case 2:
            return impl282.call(self293, args25[0], args25[1]);
            break;
          default:
            throw new Error(`${"Invalid arity: "}${args25.length ?? ""}`);
        }
        ;
      }, "f24");
      return f24;
    })();
    default_worker_idx_extractor = /* @__PURE__ */ __name(function(arg) {
      if (truth_((() => {
        const and__23718__auto__1 = object_QMARK_(arg);
        if (truth_(and__23718__auto__1)) {
          return !(arg.worker_idx == null);
        } else {
          return and__23718__auto__1;
        }
        ;
      })())) {
        return arg.worker_idx;
      } else {
        if (truth_((() => {
          const and__23718__auto__2 = map_QMARK_(arg);
          if (truth_(and__23718__auto__2)) {
            return get(arg, "worker-idx");
          } else {
            return and__23718__auto__2;
          }
          ;
        })())) {
          return get(arg, "worker-idx");
        } else {
          if ("else") {
            return null;
          } else {
            return null;
          }
        }
      }
      ;
    }, "default_worker_idx_extractor");
    worker_idx_from_args = /* @__PURE__ */ __name(function(library_key, args) {
      const entry1 = get(deref(library_contexts), library_key);
      const extract2 = (() => {
        const or__23674__auto__3 = get(entry1, "worker-idx-extractor");
        if (truth_(or__23674__auto__3)) {
          return or__23674__auto__3;
        } else {
          return default_worker_idx_extractor;
        }
        ;
      })();
      const or__23674__auto__4 = some(extract2, args);
      if (truth_(or__23674__auto__4)) {
        return or__23674__auto__4;
      } else {
        return 0;
      }
      ;
    }, "worker_idx_from_args");
    assign_worker_for_context_BANG_ = /* @__PURE__ */ __name(function(pool, library_key, opts) {
      ensure_library_BANG_(library_key);
      const temp__23182__auto__1 = get(opts, "worker");
      if (truth_(temp__23182__auto__1)) {
        const explicit2 = temp__23182__auto__1;
        const worker_count3 = pool_size(pool);
        if (explicit2 >= worker_count3) {
          throw new Error(`${"Worker index "}${explicit2 ?? ""}${" out of range (max "}${worker_count3 - 1}${")"}`);
        }
        ;
        return { "idx": explicit2, "release": function() {
          return null;
        } };
      } else {
        const c4 = claim(pool);
        return { "idx": c4.index, "release": c4.release };
      }
      ;
    }, "assign_worker_for_context_BANG_");
    track_context_BANG_ = /* @__PURE__ */ __name(function(library_key, ctx_id, worker_idx, release_fn, owner) {
      ensure_library_BANG_(library_key);
      const ctx_workers1 = get(get(deref(library_contexts), library_key), "ctx-workers");
      const fired_QMARK_2 = atom(false);
      const wrapped3 = /* @__PURE__ */ __name(function() {
        if (truth_(compare_and_set_BANG_(fired_QMARK_2, false, true))) {
          dbg("FR-CALLBACK", { "lib": `${library_key ?? ""}`, "ctx-id": ctx_id, "kind": "ctx", "worker": worker_idx });
          swap_BANG_(ctx_workers1, dissoc, ctx_id);
          return capture_pending_dispose_BANG_(release_fn());
        } else {
          return dbg("FR-CALLBACK-SUPPRESSED", { "lib": `${library_key ?? ""}`, "ctx-id": ctx_id, "kind": "ctx" });
        }
        ;
      }, "wrapped3");
      track(owner, { "tracktype": "gc", "disposefn": wrapped3 });
      dbg("FR-TRACK", { "lib": `${library_key ?? ""}`, "ctx-id": ctx_id, "kind": "ctx", "worker": worker_idx });
      return swap_BANG_(ctx_workers1, assoc, ctx_id, { "idx": worker_idx, "release": wrapped3 });
    }, "track_context_BANG_");
    untrack_context_BANG_ = /* @__PURE__ */ __name(function(library_key, ctx_id) {
      const temp__23263__auto__1 = get(deref(library_contexts), library_key);
      if (truth_(temp__23263__auto__1)) {
        const entry2 = temp__23263__auto__1;
        const ctx_workers3 = get(entry2, "ctx-workers");
        const stored4 = get(deref(ctx_workers3), ctx_id);
        const temp__23263__auto__5 = get(stored4, "release");
        if (truth_(temp__23263__auto__5)) {
          const release6 = temp__23263__auto__5;
          return release6();
        }
        ;
      }
      ;
    }, "untrack_context_BANG_");
    reset_library_context_BANG_ = /* @__PURE__ */ __name(function(library_key) {
      const temp__23263__auto__1 = get(deref(library_contexts), library_key);
      if (truth_(temp__23263__auto__1)) {
        const entry2 = temp__23263__auto__1;
        const ctx_workers3 = get(entry2, "ctx-workers");
        const live_handles4 = get(entry2, "live-handles");
        for (let G__5 of iterable(deref(ctx_workers3))) {
          const vec__69 = G__5;
          const _10 = nth(vec__69, 0, null);
          const stored11 = nth(vec__69, 1, null);
          const temp__23263__auto__12 = get(stored11, "release");
          if (truth_(temp__23263__auto__12)) {
            const release13 = temp__23263__auto__12;
            release13();
          }
        }
        ;
        reset_BANG_(ctx_workers3, {});
        if (truth_(live_handles4)) {
          for (let G__14 of iterable(deref(live_handles4))) {
            const vec__1518 = G__14;
            const _19 = nth(vec__1518, 0, null);
            const stored20 = nth(vec__1518, 1, null);
            const temp__23263__auto__21 = get(stored20, "release");
            if (truth_(temp__23263__auto__21)) {
              const release22 = temp__23263__auto__21;
              release22();
            }
          }
          ;
          reset_BANG_(live_handles4, {});
        }
        ;
        const temp__23263__auto__23 = get(entry2, "evicted");
        if (truth_(temp__23263__auto__23)) {
          const ev24 = temp__23263__auto__23;
          return reset_BANG_(ev24, /* @__PURE__ */ new Set([]));
        }
        ;
      }
      ;
    }, "reset_library_context_BANG_");
    register_handle_BANG_ = /* @__PURE__ */ (() => {
      const impl341 = /* @__PURE__ */ __name(function(library_key, ctx_id, exec_unit_idx, release_fn, owner) {
        return register_handle_BANG_(library_key, ctx_id, exec_unit_idx, release_fn, owner, null);
      }, "impl341");
      const impl352 = /* @__PURE__ */ __name(function(library_key, ctx_id, exec_unit_idx, release_fn, owner, parent_ctx_id) {
        ensure_library_BANG_(library_key);
        const lib3 = get(deref(library_contexts), library_key);
        const live4 = get(lib3, "live-handles");
        const fired_QMARK_5 = atom(false);
        const decrement_BANG_6 = /* @__PURE__ */ __name(function() {
          if (!(parent_ctx_id == null)) {
            const m7 = swap_BANG_(in_flight_by_parent, function(m) {
              const c8 = get(m, parent_ctx_id, 0);
              if (c8 <= 1) {
                return dissoc(m, parent_ctx_id);
              } else {
                return assoc(m, parent_ctx_id, c8 - 1);
              }
              ;
            });
            if (get(m7, parent_ctx_id, 0) === 0) {
              return resolve_gate_promise_BANG_(parent_ctx_id);
            }
            ;
          }
          ;
        }, "decrement_BANG_6");
        const wrapped9 = /* @__PURE__ */ __name(function() {
          if (truth_(compare_and_set_BANG_(fired_QMARK_5, false, true))) {
            dbg("FR-CALLBACK", { "lib": `${library_key ?? ""}`, "ctx-id": ctx_id, "kind": "handle", "worker": exec_unit_idx });
            swap_BANG_(live4, dissoc, ctx_id);
            const p10 = release_fn();
            const p_STAR_11 = truth_((() => {
              const c__23588__auto__12 = Promise;
              const x__23589__auto__13 = p10;
              const ret__23590__auto__14 = x__23589__auto__13 instanceof c__23588__auto__12;
              return ret__23590__auto__14;
            })()) ? p10.finally(decrement_BANG_6) : (() => {
              decrement_BANG_6();
              return p10;
            })();
            return capture_pending_dispose_BANG_(p_STAR_11, parent_ctx_id);
          } else {
            return dbg("FR-CALLBACK-SUPPRESSED", { "lib": `${library_key ?? ""}`, "ctx-id": ctx_id, "kind": "handle" });
          }
          ;
        }, "wrapped9");
        track(owner, { "tracktype": "gc", "disposefn": wrapped9 });
        dbg("FR-TRACK", { "lib": `${library_key ?? ""}`, "ctx-id": ctx_id, "kind": "handle", "worker": exec_unit_idx });
        swap_BANG_(live4, assoc, ctx_id, { "owner": new WeakRef(owner), "release": wrapped9, "exec-unit": exec_unit_idx, "parent-ctx-id": parent_ctx_id, "created-at": now_ms(), "touched-at": now_ms(), "refcount": 0 });
        swap_BANG_(get(lib3, "evicted"), disj, ctx_id);
        if (!(parent_ctx_id == null)) {
          swap_BANG_(in_flight_by_parent, function(m) {
            return assoc(m, parent_ctx_id, get(m, parent_ctx_id, 0) + 1);
          });
        }
        ;
        return ctx_id;
      }, "impl352");
      const f31 = /* @__PURE__ */ __name(function(...args32) {
        const self3615 = this;
        const G__3716 = args32.length;
        switch (G__3716) {
          case 5:
            return impl341.call(self3615, args32[0], args32[1], args32[2], args32[3], args32[4]);
            break;
          case 6:
            return impl352.call(self3615, args32[0], args32[1], args32[2], args32[3], args32[4], args32[5]);
            break;
          default:
            throw new Error(`${"Invalid arity: "}${args32.length ?? ""}`);
        }
        ;
      }, "f31");
      return f31;
    })();
    dispose_handle_BANG_ = /* @__PURE__ */ __name(function(library_key, ctx_id) {
      const temp__23263__auto__1 = get(deref(library_contexts), library_key);
      if (truth_(temp__23263__auto__1)) {
        const lib2 = temp__23263__auto__1;
        const temp__23263__auto__3 = get(deref(get(lib2, "live-handles")), ctx_id);
        if (truth_(temp__23263__auto__3)) {
          const stored4 = temp__23263__auto__3;
          const temp__23263__auto__5 = get(stored4, "release");
          if (truth_(temp__23263__auto__5)) {
            const release6 = temp__23263__auto__5;
            return release6();
          }
          ;
        }
        ;
      }
      ;
    }, "dispose_handle_BANG_");
    in_flight_count_for_parent = /* @__PURE__ */ __name(function(parent) {
      return get(deref(in_flight_by_parent), parent, 0);
    }, "in_flight_count_for_parent");
    ref_handle_BANG_ = /* @__PURE__ */ __name(function(library_key, ctx_id) {
      const temp__23263__auto__1 = get(deref(library_contexts), library_key);
      if (truth_(temp__23263__auto__1)) {
        const lib2 = temp__23263__auto__1;
        return swap_BANG_(get(lib2, "live-handles"), function(m) {
          if (truth_(contains_QMARK_(m, ctx_id))) {
            return assoc_in(update_in(m, [ctx_id, "refcount"], inc), [ctx_id, "touched-at"], now_ms());
          } else {
            return m;
          }
          ;
        });
      }
      ;
    }, "ref_handle_BANG_");
    unref_handle_BANG_ = /* @__PURE__ */ __name(function(library_key, ctx_id) {
      const temp__23263__auto__1 = get(deref(library_contexts), library_key);
      if (truth_(temp__23263__auto__1)) {
        const lib2 = temp__23263__auto__1;
        return swap_BANG_(get(lib2, "live-handles"), function(m) {
          if (truth_(contains_QMARK_(m, ctx_id))) {
            return update_in(m, [ctx_id, "refcount"], function(rc) {
              return max(0, rc - 1);
            });
          } else {
            return m;
          }
          ;
        });
      }
      ;
    }, "unref_handle_BANG_");
    entry_age_ms = /* @__PURE__ */ __name(function(e, now) {
      return now - (() => {
        const or__23674__auto__1 = get(e, "created-at");
        if (truth_(or__23674__auto__1)) {
          return or__23674__auto__1;
        } else {
          return get(e, "touched-at");
        }
        ;
      })();
    }, "entry_age_ms");
    entry_busy_QMARK_ = /* @__PURE__ */ __name(function(e) {
      return get(e, "refcount") > 0;
    }, "entry_busy_QMARK_");
    entry_evictable_QMARK_ = /* @__PURE__ */ __name(function(e, now, min_age_ms) {
      return not(entry_busy_QMARK_(e)) && entry_age_ms(e, now) >= min_age_ms;
    }, "entry_evictable_QMARK_");
    find_oldest_evictable = /* @__PURE__ */ __name(function(live, min_age_ms) {
      const now1 = now_ms();
      const evictable2 = filter(function(kv) {
        return entry_evictable_QMARK_(val(kv), now1, min_age_ms);
      }, live);
      if (truth_(seq(evictable2))) {
        return apply(min_key, function(kv) {
          return get(val(kv), "touched-at");
        }, evictable2);
      }
      ;
    }, "find_oldest_evictable");
    evicted_owner_marker = "__cljNativeEvicted";
    invalidate_evicted_BANG_ = /* @__PURE__ */ __name(function(lib2, ctx_id, entry) {
      const temp__23263__auto__1 = (() => {
        const G__382 = get(entry, "owner");
        if (G__382 == null) {
          return null;
        } else {
          return G__382.deref();
        }
        ;
      })();
      if (truth_(temp__23263__auto__1)) {
        const owner3 = temp__23263__auto__1;
        owner3[evicted_owner_marker] = true;
      }
      ;
      return swap_BANG_(get(lib2, "evicted"), conj, ctx_id);
    }, "invalidate_evicted_BANG_");
    evicted_QMARK_ = /* @__PURE__ */ __name(function(library_key, ctx_id) {
      return boolean$((() => {
        const temp__23263__auto__1 = get(deref(library_contexts), library_key);
        if (truth_(temp__23263__auto__1)) {
          const lib2 = temp__23263__auto__1;
          const G__393 = get(lib2, "evicted");
          const G__394 = G__393 == null ? null : deref(G__393);
          if (G__394 == null) {
            return null;
          } else {
            return contains_QMARK_(G__394, ctx_id);
          }
          ;
        }
        ;
      })());
    }, "evicted_QMARK_");
    bounded_create_handle_BANG_ = /* @__PURE__ */ __name(function(library_key, create_fn) {
      ensure_library_BANG_(library_key);
      const lib1 = get(deref(library_contexts), library_key);
      const bound2 = get(lib1, "max-live-ctxs");
      if (truth_((() => {
        const and__23718__auto__3 = bound2;
        if (truth_(and__23718__auto__3)) {
          return count(deref(get(lib1, "live-handles"))) >= bound2;
        } else {
          return and__23718__auto__3;
        }
        ;
      })())) {
        const live4 = deref(get(lib1, "live-handles"));
        const min_age5 = (() => {
          const or__23674__auto__6 = get(lib1, "min-age-ms");
          if (truth_(or__23674__auto__6)) {
            return or__23674__auto__6;
          } else {
            return DEFAULT_MIN_AGE_MS;
          }
          ;
        })();
        const temp__23182__auto__7 = find_oldest_evictable(live4, min_age5);
        if (truth_(temp__23182__auto__7)) {
          const vec__811 = temp__23182__auto__7;
          const ctx_id12 = nth(vec__811, 0, null);
          const entry13 = nth(vec__811, 1, null);
          invalidate_evicted_BANG_(lib1, ctx_id12, entry13);
          get(entry13, "release")();
          swap_BANG_(get(lib1, "stats"), update, "evictions", inc);
        } else {
          swap_BANG_(get(lib1, "stats"), update, "blocks", inc);
          throw ex_info("live-handles at bound, no evictable entry", { "library": library_key, "live": count(live4), "max": bound2, "blocked": "bounded-blocked" });
        }
      }
      ;
      return create_fn();
    }, "bounded_create_handle_BANG_");
    get_pool_detail = /* @__PURE__ */ __name(function(library_key) {
      const temp__23263__auto__1 = get(deref(library_contexts), library_key);
      if (truth_(temp__23263__auto__1)) {
        const lib2 = temp__23263__auto__1;
        const live3 = deref(get(lib2, "live-handles"));
        const min_age4 = (() => {
          const or__23674__auto__5 = get(lib2, "min-age-ms");
          if (truth_(or__23674__auto__5)) {
            return or__23674__auto__5;
          } else {
            return DEFAULT_MIN_AGE_MS;
          }
          ;
        })();
        const now6 = now_ms();
        const classify7 = /* @__PURE__ */ __name(function(p__40) {
          const vec__811 = p__40;
          const id12 = nth(vec__811, 0, null);
          const e13 = nth(vec__811, 1, null);
          const owner14 = get(e13, "owner");
          return { "id": id12, "refcount": get(e13, "refcount"), "owner-alive": boolean$((() => {
            const and__23718__auto__15 = owner14;
            if (truth_(and__23718__auto__15)) {
              return owner14.deref();
            } else {
              return and__23718__auto__15;
            }
            ;
          })()), "age-ms": entry_age_ms(e13, now6), "age-gated": entry_age_ms(e13, now6) < min_age4, "busy": entry_busy_QMARK_(e13), "evictable": entry_evictable_QMARK_(e13, now6, min_age4) };
        }, "classify7");
        const classified16 = mapv(classify7, live3);
        const evictable17 = filterv("evictable", classified16);
        const blocked18 = filterv(complement("evictable"), classified16);
        const blk_ref19 = filterv("busy", blocked18);
        const blk_age20 = filterv(function(_PERCENT_1) {
          return not(get(_PERCENT_1, "busy")) && get(_PERCENT_1, "age-gated");
        }, blocked18);
        const blk_weak21 = filterv(function(_PERCENT_1) {
          return not(get(_PERCENT_1, "busy")) && (not(get(_PERCENT_1, "age-gated")) && get(_PERCENT_1, "owner-alive"));
        }, blocked18);
        const __GT_js22 = /* @__PURE__ */ __name(function(m) {
          return { "ctx_id": `${get(m, "id") ?? ""}`, "refcount": get(m, "refcount"), "owner_alive": get(m, "owner-alive"), "age_ms": get(m, "age-ms"), "age_gated": get(m, "age-gated") };
        }, "__GT_js22");
        return { "total": count(classified16), "evictable": count(evictable17), "blocked_refcount": count(blk_ref19), "blocked_age_gate": count(blk_age20), "blocked_weakref": count(blk_weak21), "sample": mapv(__GT_js22, take(8, blocked18)) };
      }
      ;
    }, "get_pool_detail");
  }
});
var init_workload_pool_BANG_;
var register_handler_BANG_;
var spawn_joint_pool_BANG_;
var ensure_pool_BANG_;
var adopt_pool_BANG_;
var current_pool;
var run_pre_terminate_hooks_BANG_;
var shutdown_pool_BANG_;
var make_wiring_BANG_;
var run_wiring_BANG_;
var ensure_wired_BANG_;
var wiring_pool;
var live_pool_QMARK_;
var shutdown_wiring_BANG_;
var init_workload_pool = __esm({
  "node_modules/ffi-wasm/src/cljc/net/willcohen/native/workload_pool.mjs"() {
    init_esbuild_shims();
    init_pool();
    init_workload_pool_BANG_ = /* @__PURE__ */ __name(function(opts) {
      return { "pool": atom(null), "owned?": atom(false), "latch": atom(null), "generation": atom(0), "handlers": atom([]), "opts": opts, "runtime": "cljs", "terminated?": atom(false) };
    }, "init_workload_pool_BANG_");
    register_handler_BANG_ = /* @__PURE__ */ __name(function(registry, workload, lib_key, spec2) {
      const entry1 = assoc(spec2, "lib-key", lib_key);
      if (truth_((() => {
        const or__23674__auto__2 = get(entry1, "module");
        if (truth_(or__23674__auto__2)) {
          return or__23674__auto__2;
        } else {
          return get(entry1, "pre-terminate");
        }
        ;
      })())) {
      } else {
        throw ex_info(`${"workload-pool: a CLJS handler spec needs "}${":module or :pre-terminate (lib-key "}${lib_key ?? ""}${")"}`, { "lib-key": lib_key });
      }
      ;
      if (truth_((() => {
        const and__23718__auto__3 = get(entry1, "module");
        if (truth_(and__23718__auto__3)) {
          return !(deref(get(registry, "latch")) == null);
        } else {
          return and__23718__auto__3;
        }
        ;
      })())) {
        throw ex_info(`${"workload-pool: the joint pool already "}${"exists; a spec with a :module must register "}${"before ensure-pool!/adopt-pool! (lib-key "}${lib_key ?? ""}${")"}`, { "lib-key": lib_key });
      }
      ;
      swap_BANG_(get(registry, "handlers"), function(entries) {
        if (truth_(some(function(e) {
          return _EQ_(get(e, "lib-key"), lib_key);
        }, entries))) {
          return mapv(function(e) {
            if (_EQ_(get(e, "lib-key"), lib_key)) {
              return entry1;
            } else {
              return e;
            }
            ;
          }, entries);
        } else {
          return conj(entries, entry1);
        }
        ;
      });
      return registry;
    }, "register_handler_BANG_");
    spawn_joint_pool_BANG_ = /* @__PURE__ */ __name(async function(registry) {
      const entries1 = deref(get(registry, "handlers"));
      const modular2 = filterv(function(e) {
        return !(get(e, "module") == null);
      }, entries1);
      if (count(modular2) === 0) {
        throw ex_info(`${"workload-pool: no registered handler spec "}${"carries a :module; register-handler! before "}${"ensure-pool!"}`, { "registered": mapv(function(e) {
          return get(e, "lib-key");
        }, entries1) });
      }
      ;
      const handlers3 = reduce(function(m, e) {
        return assoc(m, get(e, "lib-key"), { "module": get(e, "module"), "init": get(e, "args") });
      }, {}, modular2);
      const opts4 = get(registry, "opts");
      const result5 = await init_pool_BANG_({ "handlers": handlers3, "size": get(opts4, "size"), "handler-runtime": get(opts4, "handler-runtime") });
      const p6 = result5.pool;
      reset_BANG_(get(registry, "pool"), p6);
      reset_BANG_(get(registry, "owned?"), result5.owned);
      reset_BANG_(get(registry, "terminated?"), false);
      return p6;
    }, "spawn_joint_pool_BANG_");
    ensure_pool_BANG_ = /* @__PURE__ */ __name(function(registry) {
      const or__23674__auto__1 = deref(get(registry, "latch"));
      if (truth_(or__23674__auto__1)) {
        return or__23674__auto__1;
      } else {
        const promise2 = spawn_joint_pool_BANG_(registry).catch(function(err) {
          reset_BANG_(get(registry, "latch"), null);
          throw err;
        });
        reset_BANG_(get(registry, "latch"), promise2);
        return promise2;
      }
      ;
    }, "ensure_pool_BANG_");
    adopt_pool_BANG_ = /* @__PURE__ */ __name(function(registry, p3) {
      if (!(deref(get(registry, "latch")) == null)) {
        throw ex_info(`${"workload-pool: a pool is already present or "}${"initializing; shutdown-pool! before "}${"adopt-pool!"}`, { "owned?": deref(get(registry, "owned?")) });
      }
      ;
      reset_BANG_(get(registry, "pool"), p3);
      reset_BANG_(get(registry, "owned?"), false);
      reset_BANG_(get(registry, "terminated?"), false);
      reset_BANG_(get(registry, "latch"), Promise.resolve(p3));
      return registry;
    }, "adopt_pool_BANG_");
    current_pool = /* @__PURE__ */ __name(function(registry) {
      return deref(get(registry, "pool"));
    }, "current_pool");
    run_pre_terminate_hooks_BANG_ = /* @__PURE__ */ __name(async function(entries) {
      for (let G__1 of iterable(entries)) {
        const entry2 = G__1;
        const hook3 = get(entry2, "pre-terminate");
        if (truth_(hook3)) {
          try {
            await hook3();
          } catch (e4) {
            console.warn("workload-pool: pre-terminate failed for", `${get(entry2, "lib-key") ?? ""}`, e4);
          }
        }
      }
      return null;
    }, "run_pre_terminate_hooks_BANG_");
    shutdown_pool_BANG_ = /* @__PURE__ */ __name(async function(registry) {
      if (truth_(deref(get(registry, "terminated?")))) {
        return null;
      } else {
        reset_BANG_(get(registry, "terminated?"), true);
        const p1 = deref(get(registry, "pool"));
        const owned_QMARK_2 = deref(get(registry, "owned?"));
        const entries3 = vec(reverse(deref(get(registry, "handlers"))));
        await run_pre_terminate_hooks_BANG_(entries3);
        if (truth_(!(p1 == null) && owned_QMARK_2)) {
          try {
            await terminate_pool_BANG_(p1);
          } catch (e4) {
            console.warn("workload-pool: pool terminate rejected", e4);
          }
        }
        ;
        reset_BANG_(get(registry, "pool"), null);
        reset_BANG_(get(registry, "owned?"), false);
        reset_BANG_(get(registry, "latch"), null);
        swap_BANG_(get(registry, "generation"), inc);
        return registry;
      }
      ;
    }, "shutdown_pool_BANG_");
    make_wiring_BANG_ = /* @__PURE__ */ __name(function() {
      return { "registry": atom(null), "latch": atom(null) };
    }, "make_wiring_BANG_");
    run_wiring_BANG_ = /* @__PURE__ */ __name(async function(wiring, opts) {
      const reg1 = init_workload_pool_BANG_(await (async () => {
        const or__23674__auto__2 = get(opts, "registry-opts");
        if (truth_(or__23674__auto__2)) {
          return or__23674__auto__2;
        } else {
          return {};
        }
        ;
      })());
      const register_BANG_3 = get(opts, "register!");
      const caller_pool4 = get(opts, "pool");
      reset_BANG_(get(wiring, "registry"), reg1);
      if (truth_(register_BANG_3)) {
        await register_BANG_3(reg1);
      }
      ;
      if (!(caller_pool4 == null)) {
        adopt_pool_BANG_(reg1, caller_pool4);
        return caller_pool4;
      } else {
        return await ensure_pool_BANG_(reg1);
      }
      ;
    }, "run_wiring_BANG_");
    ensure_wired_BANG_ = /* @__PURE__ */ __name(function(wiring, opts) {
      const or__23674__auto__1 = deref(get(wiring, "latch"));
      if (truth_(or__23674__auto__1)) {
        return or__23674__auto__1;
      } else {
        const promise2 = run_wiring_BANG_(wiring, opts).catch(function(err) {
          reset_BANG_(get(wiring, "registry"), null);
          reset_BANG_(get(wiring, "latch"), null);
          throw err;
        });
        reset_BANG_(get(wiring, "latch"), promise2);
        return promise2;
      }
      ;
    }, "ensure_wired_BANG_");
    wiring_pool = /* @__PURE__ */ __name(function(wiring) {
      const temp__23182__auto__1 = deref(get(wiring, "registry"));
      if (truth_(temp__23182__auto__1)) {
        const reg2 = temp__23182__auto__1;
        return current_pool(reg2);
      } else {
        return null;
      }
      ;
    }, "wiring_pool");
    live_pool_QMARK_ = /* @__PURE__ */ __name(function(wiring, p3) {
      return !(p3 == null) && p3 === wiring_pool(wiring);
    }, "live_pool_QMARK_");
    shutdown_wiring_BANG_ = /* @__PURE__ */ __name(async function(wiring) {
      const temp__23182__auto__1 = deref(get(wiring, "registry"));
      if (truth_(temp__23182__auto__1)) {
        const reg2 = temp__23182__auto__1;
        await shutdown_pool_BANG_(reg2);
        reset_BANG_(get(wiring, "registry"), null);
        reset_BANG_(get(wiring, "latch"), null);
        return reg2;
      } else {
        return null;
      }
      ;
    }, "shutdown_wiring_BANG_");
  }
});
var argtype__GT_ccall_type;
var supported_types;
var supported_types_msg;
var validate_fn_def_BANG_;
var normalize_null_pointer;
var fn_record;
var library;
var check_result;
var convert_arg_cljs;
var cljs_leg;
var call_BANG_;
var init_dispatch = __esm({
  "node_modules/ffi-wasm/src/cljc/net/willcohen/native/dispatch.mjs"() {
    init_esbuild_shims();
    init_pool();
    argtype__GT_ccall_type = /* @__PURE__ */ __name(function(t) {
      const G__11 = t;
      switch (G__11) {
        case "pointer":
          return "number";
          break;
        case "pointer?":
          return "number";
          break;
        case "string-array":
          return "number";
          break;
        case "string-array?":
          return "number";
          break;
        case "int32":
          return "number";
          break;
        case "int64":
          return "number";
          break;
        case "float64":
          return "number";
          break;
        case "size-t":
          return "number";
          break;
        case "void":
          return "number";
          break;
        case "string":
          return "string";
          break;
        default:
          return "number";
      }
      ;
    }, "argtype__GT_ccall_type");
    supported_types = /* @__PURE__ */ new Set(["int32", "float64", "size-t", "string-array", "string", "void", "pointer", "string-array?", "pointer?"]);
    supported_types_msg = `${":pointer :pointer? :string-array :string-array? :int32 :float64 "}${":size-t :void :string, plus :int64 in argument position only"}`;
    validate_fn_def_BANG_ = /* @__PURE__ */ __name(function(fn_key, fn_def) {
      const rettype1 = get(fn_def, "rettype");
      if (truth_(contains_QMARK_(supported_types, rettype1))) {
      } else {
        throw ex_info(`${"Unsupported :rettype "}${rettype1 ?? ""}${" in fn-def "}${fn_key ?? ""}${". Supported: "}${supported_types_msg ?? ""}`, { "fn-key": fn_key, "rettype": rettype1 });
      }
      ;
      for (let G__2 of iterable(get(fn_def, "argtypes"))) {
        const vec__36 = G__2;
        const arg_name7 = nth(vec__36, 0, null);
        const t8 = nth(vec__36, 1, null);
        if (truth_((() => {
          const or__23674__auto__9 = contains_QMARK_(supported_types, t8);
          if (truth_(or__23674__auto__9)) {
            return or__23674__auto__9;
          } else {
            return "int64" === t8;
          }
          ;
        })())) {
        } else {
          throw ex_info(`${"Unsupported argtype "}${t8 ?? ""}${" for arg "}${arg_name7 ?? ""}${" in fn-def "}${fn_key ?? ""}${". Supported: "}${supported_types_msg ?? ""}`, { "fn-key": fn_key, "arg": arg_name7, "argtype": t8 });
        }
      }
      return null;
    }, "validate_fn_def_BANG_");
    normalize_null_pointer = /* @__PURE__ */ __name(function(rettype, result) {
      if (truth_((() => {
        const and__23718__auto__2 = (() => {
          const or__23674__auto__1 = rettype === "pointer";
          if (or__23674__auto__1) {
            return or__23674__auto__1;
          } else {
            return rettype === "pointer?";
          }
          ;
        })();
        if (truth_(and__23718__auto__2)) {
          return 0 === result;
        } else {
          return and__23718__auto__2;
        }
        ;
      })())) {
        return null;
      } else {
        return result;
      }
      ;
    }, "normalize_null_pointer");
    fn_record = /* @__PURE__ */ __name(function(fn_key, fn_def) {
      return { "fn-key": fn_key, "c-name": `${fn_key ?? ""}`, "fn-def": fn_def, "rettype": get(fn_def, "rettype"), "ccall-rettype": argtype__GT_ccall_type(get(fn_def, "rettype")), "ccall-argtypes": mapv(function(p__2) {
        const vec__14 = p__2;
        const _5 = nth(vec__14, 0, null);
        const t6 = nth(vec__14, 1, null);
        return argtype__GT_ccall_type(t6);
      }, get(fn_def, "argtypes")) };
    }, "fn_record");
    library = /* @__PURE__ */ __name(function(p__3) {
      const map__12 = p__3;
      const key3 = get(map__12, "key");
      const fndefs4 = get(map__12, "fndefs");
      const impl_atom5 = get(map__12, "impl-atom");
      const ffi_impl_ns6 = get(map__12, "ffi-impl-ns");
      const hooks7 = get(map__12, "hooks");
      return { "key": key3, "impl-atom": impl_atom5, "ffi-impl-ns": ffi_impl_ns6, "hooks": (() => {
        const or__23674__auto__8 = hooks7;
        if (truth_(or__23674__auto__8)) {
          return or__23674__auto__8;
        } else {
          return {};
        }
        ;
      })(), "fns": reduce_kv(function(m, k, v) {
        validate_fn_def_BANG_(k, v);
        return assoc(m, k, fn_record(k, v));
      }, {}, fndefs4) };
    }, "library");
    check_result = /* @__PURE__ */ __name(async function(lib2, fn_key, fn_def, opts, result) {
      const temp__23182__auto__1 = get(get(lib2, "hooks"), "result-check");
      if (truth_(temp__23182__auto__1)) {
        const f2 = temp__23182__auto__1;
        return await f2(lib2, fn_key, fn_def, opts, result);
      } else {
        return result;
      }
      ;
    }, "check_result");
    convert_arg_cljs = /* @__PURE__ */ __name(function(arg) {
      if (truth_((() => {
        const and__23718__auto__1 = map_QMARK_(arg);
        if (truth_(and__23718__auto__1)) {
          return get(arg, "ptr");
        } else {
          return and__23718__auto__1;
        }
        ;
      })())) {
        return get(arg, "ptr");
      } else {
        if (arg == null) {
          return 0;
        } else {
          if ("else") {
            return arg;
          } else {
            return null;
          }
        }
      }
      ;
    }, "convert_arg_cljs");
    cljs_leg = /* @__PURE__ */ __name(async function(lib2, rec, args, opts) {
      const library_key2 = get(lib2, "key");
      const hooks3 = get(lib2, "hooks");
      const fn_key4 = get(rec, "fn-key");
      const c_fn_name5 = get(rec, "c-name");
      const fn_def6 = get(rec, "fn-def");
      const rettype7 = get(rec, "rettype");
      const ccall_rettype8 = get(rec, "ccall-rettype");
      const ccall_argtypes9 = get(rec, "ccall-argtypes");
      const result_wrapper10 = get(hooks3, "result-wrapper");
      const extras_builder11 = get(hooks3, "extras-builder");
      const pool_ref12 = get(opts, "pool");
      const force_idx13 = get(opts, "force-worker-idx");
      const worker_idx14 = !(force_idx13 == null) ? force_idx13 : worker_idx_from_args(library_key2, args);
      const _dispatch_resolve15 = dbg("DISPATCH-RESOLVE", { "lib": `${library_key2 ?? ""}`, "c-fn": `${fn_key4 ?? ""}`, "force-idx": force_idx13, "worker-idx": worker_idx14, "primary-handle": get(opts, "primary-handle") });
      const ctx_ids16 = vec(keep(function(a) {
        if (truth_((() => {
          const and__23718__auto__17 = object_QMARK_(a);
          if (truth_(and__23718__auto__17)) {
            return !(a.ctx_id == null);
          } else {
            return and__23718__auto__17;
          }
          ;
        })())) {
          return a.ctx_id;
        }
        ;
      }, args));
      const map__118 = truth_(extras_builder11) ? extras_builder11(fn_def6, args) : { "args": args, "extras": null, "on-result": null };
      const builder_args19 = get(map__118, "args");
      const extras20 = get(map__118, "extras");
      const on_result21 = get(map__118, "on-result");
      const on_result22 = await (async () => {
        const or__23674__auto__23 = on_result21;
        if (truth_(or__23674__auto__23)) {
          return or__23674__auto__23;
        } else {
          return identity;
        }
        ;
      })();
      const isolator_result24 = truth_(get(fn_def6, "isolate-context?")) ? await (async () => {
        const temp__23263__auto__25 = get(hooks3, "context-isolator");
        if (truth_(temp__23263__auto__25)) {
          const iso26 = temp__23263__auto__25;
          dbg("ISOLATE-FIRE", { "lib": `${library_key2 ?? ""}`, "c-fn": `${fn_key4 ?? ""}`, "worker": worker_idx14 });
          return await iso26({ "fn-key": fn_key4, "fn-def": fn_def6, "args": await (async () => {
            const or__23674__auto__27 = builder_args19;
            if (truth_(or__23674__auto__27)) {
              return or__23674__auto__27;
            } else {
              return args;
            }
            ;
          })(), "worker-idx": worker_idx14, "library-key": library_key2, "library": lib2, "pool": pool_ref12 });
        }
        ;
      })() : null;
      const isolator_args28 = get(isolator_result24, "args", await (async () => {
        const or__23674__auto__29 = builder_args19;
        if (truth_(or__23674__auto__29)) {
          return or__23674__auto__29;
        } else {
          return args;
        }
        ;
      })());
      const converted30 = mapv(convert_arg_cljs, isolator_args28);
      const ccall_cmd31 = await (async () => {
        const G__432 = { "cmd": "ccall", "fn": c_fn_name5, "returnType": `${ccall_rettype8 ?? ""}`, "argTypes": mapv(str, ccall_argtypes9), "args": converted30 };
        if (truth_(seq(extras20))) {
          return merge(G__432, extras20);
        } else {
          return G__432;
        }
        ;
      })();
      for (let G__33 of iterable(ctx_ids16)) {
        const cid34 = G__33;
        if (truth_(evicted_QMARK_(library_key2, cid34))) {
          throw ex_info(`${"context "}${cid34 ?? ""}${" was evicted (LRU); recreate it"}`, { "library-key": library_key2, "ctx-id": cid34, "evicted": true });
        }
      }
      ;
      for (let G__35 of iterable(ctx_ids16)) {
        const cid36 = G__35;
        ref_handle_BANG_(library_key2, cid36);
      }
      ;
      return await (async () => {
        try {
          const raw37 = await worker_call(pool_ref12, library_key2, get(ccall_cmd31, "cmd"), cmd_args(ccall_cmd31), worker_idx14);
          const postprocessed38 = normalize_null_pointer(rettype7, on_result22(raw37));
          const wrapped39 = truth_(result_wrapper10) ? result_wrapper10({ "rettype": rettype7, "result": postprocessed38, "fn-def": fn_def6, "args": args, "worker-idx": worker_idx14, "platform": "cljs", "isolator-result": isolator_result24 }) : postprocessed38;
          return wrapped39;
        } catch (e40) {
          throw normalizeWasmError(e40);
        } finally {
          for (let G__41 of iterable(ctx_ids16)) {
            const cid42 = G__41;
            unref_handle_BANG_(library_key2, cid42);
          }
        }
      })();
    }, "cljs_leg");
    call_BANG_ = /* @__PURE__ */ (() => {
      const impl101 = /* @__PURE__ */ __name(async function(lib2, fn_key, args, p__11) {
        const vec__25 = p__11;
        const opts6 = nth(vec__25, 0, null);
        const rec7 = get_in(lib2, ["fns", fn_key]);
        if (truth_(rec7)) {
        } else {
          throw ex_info("Unknown fn-key for library", { "fn-key": fn_key, "library": get(lib2, "key") });
        }
        ;
        return await cljs_leg(lib2, rec7, args, opts6);
      }, "impl101");
      const f5 = /* @__PURE__ */ __name(function(arg6, arg7, arg8, ...rest9) {
        const self__23384__auto__8 = this;
        return impl101.call(self__23384__auto__8, arg6, arg7, arg8, rest9.length === 0 ? null : rest9);
      }, "f5");
      f5["squint$lang$variadic"] = impl101;
      return f5;
    })();
  }
});
function detectEnvironment() {
  if (typeof process !== "undefined" && process.versions != null && process.versions.node != null) {
    return "node";
  }
  if (typeof window !== "undefined" && typeof window.document !== "undefined") {
    return "browser";
  }
  return "unknown";
}
async function loadProjResources() {
  const env = detectEnvironment();
  if (env === "node") {
    const fs = await import("fs");
    const path = await import("path");
    const { fileURLToPath } = await import("url");
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    return {
      projDb: fs.readFileSync(path.join(__dirname, "proj.db")),
      projIni: fs.readFileSync(path.join(__dirname, "proj.ini"))
    };
  } else {
    const baseUrl = new URL("./", import.meta.url).href;
    const [dbResp, iniResp] = await Promise.all([
      fetch(baseUrl + "proj.db"),
      fetch(baseUrl + "proj.ini")
    ]);
    return {
      projDb: new Uint8Array(await dbResp.arrayBuffer()),
      projIni: new Uint8Array(await iniResp.arrayBuffer())
    };
  }
}
var init_proj_loader = __esm({
  "proj-loader.mjs"() {
    init_esbuild_shims();
    __name(detectEnvironment, "detectEnvironment");
    __name(loadProjResources, "loadProjResources");
  }
});
var default_init_args;
var pre_terminate_BANG_;
var spec;
var init_handler = __esm({
  "handler.mjs"() {
    init_esbuild_shims();
    init_proj_loader();
    init_pool();
    default_init_args = /* @__PURE__ */ __name(async function(opts) {
      const resources_1 = await loadProjResources();
      return js_obj("dbBytes", resources_1.projDb, "iniBytes", resources_1.projIni, "logLevel", await (async () => {
        const or__23663__auto___2 = get(opts, "log-level");
        if (truth_(or__23663__auto___2)) {
          return or__23663__auto___2;
        } else {
          return 0;
        }
        ;
      })());
    }, "default_init_args");
    pre_terminate_BANG_ = /* @__PURE__ */ __name(async function() {
      await flush_pending_disposes_BANG_();
      reset_library_context_BANG_("net.willcohen.proj");
      return null;
    }, "pre_terminate_BANG_");
    spec = /* @__PURE__ */ (() => {
      const impl4_1 = /* @__PURE__ */ __name(function() {
        return spec(null);
      }, "impl4_1");
      const impl5_2 = /* @__PURE__ */ __name(function(args) {
        return { "module": new URL("./proj-handler.mjs", import.meta.url).href, "args": args, "pre-terminate": pre_terminate_BANG_ };
      }, "impl5_2");
      const f1 = /* @__PURE__ */ __name(function(...args2) {
        const self6_3 = this;
        const G__7_4 = args2.length;
        switch (G__7_4) {
          case 0:
            return impl4_1.call(self6_3);
            break;
          case 1:
            return impl5_2.call(self6_3, args2[0]);
            break;
          default:
            throw new Error(`${"Invalid arity: "}${args2.length ?? ""}`);
        }
        ;
      }, "f1");
      return f1;
    })();
  }
});
var p;
var pool_wiring;
var pj_gen_counter;
var current_pool2;
var init_workers_BANG_;
var worker_call2;
var DESTROY_GATE_MAX_ITERS;
var destroy_context_BANG_;
var live_pool_QMARK_2;
var ignore_pool_terminated;
var get_worker_count;
var shutdown_BANG_;
var create_context_on_worker;
var track_context_BANG_2;
var untrack_context_BANG_2;
var init_proj;
var ensure_proj_initialized_BANG_;
var coord_array_arg_QMARK_;
var kebab__GT_snake;
var struct_list_extras;
var out_params_extras;
var coord_writeback_fn;
var proj_extras_builder;
var proj_result_wrapper;
var proj_context_isolator;
var string_list_to_native_array;
var init_wasm = __esm({
  "wasm.mjs"() {
    init_esbuild_shims();
    init_pool();
    init_workload_pool();
    init_dispatch();
    init_handler();
    p = atom(null);
    pool_wiring = make_wiring_BANG_();
    pj_gen_counter = atom(0);
    current_pool2 = /* @__PURE__ */ __name(function() {
      return wiring_pool(pool_wiring);
    }, "current_pool");
    register_cmd_args_BANG_("context_create", function(cmd) {
      return [(() => {
        const or__23663__auto___1 = get(cmd, "opts");
        if (truth_(or__23663__auto___1)) {
          return or__23663__auto___1;
        } else {
          return {};
        }
        ;
      })()];
    });
    register_cmd_args_BANG_("context_destroy", function(cmd) {
      return [get(cmd, "ctxId")];
    });
    register_cmd_args_BANG_("set_log_level", function(cmd) {
      return [get(cmd, "level")];
    });
    register_library_context_BANG_("net.willcohen.proj", { "max-live-ctxs": 128, "min-age-ms": 100 });
    init_workers_BANG_ = /* @__PURE__ */ __name(async function(opts) {
      return await await (async () => {
        const opts_1 = await (async () => {
          const or__23663__auto___2 = opts;
          if (truth_(or__23663__auto___2)) {
            return or__23663__auto___2;
          } else {
            return {};
          }
          ;
        })();
        const caller_pool_3 = get(opts_1, "pool");
        const size_4 = await (async () => {
          const or__23663__auto___5 = get(opts_1, "workers");
          if (truth_(or__23663__auto___5)) {
            return or__23663__auto___5;
          } else {
            return "auto";
          }
          ;
        })();
        const log_level_6 = await (async () => {
          const or__23663__auto___7 = get(opts_1, "log-level");
          if (truth_(or__23663__auto___7)) {
            return or__23663__auto___7;
          } else {
            return 0;
          }
          ;
        })();
        const max_live_ctxs_8 = get(opts_1, "max-live-ctxs");
        const min_age_ms_9 = get(opts_1, "min-age-ms");
        const debug_level_10 = get(opts_1, "debug-level");
        const debug_categories_11 = get(opts_1, "debug-categories");
        const handler_rt_opt_12 = !(debug_level_10 == null) ? { "level": debug_level_10, "categories": debug_categories_11 } : null;
        const register_BANG__13 = /* @__PURE__ */ __name(async function register_proj_BANG_(reg) {
          if (!(debug_level_10 == null)) {
            set_log_config_BANG_({ "level": debug_level_10, "categories": debug_categories_11 });
          }
          ;
          if (truth_(await (async () => {
            const or__23663__auto___14 = !(max_live_ctxs_8 == null);
            if (or__23663__auto___14) {
              return or__23663__auto___14;
            } else {
              return !(min_age_ms_9 == null);
            }
            ;
          })())) {
            register_library_context_BANG_("net.willcohen.proj", await (async () => {
              const G__1_15 = {};
              const G__1_16 = !(max_live_ctxs_8 == null) ? { ...G__1_15, ["max-live-ctxs"]: max_live_ctxs_8 } : G__1_15;
              if (!(min_age_ms_9 == null)) {
                return assoc(G__1_16, "min-age-ms", min_age_ms_9);
              } else {
                return G__1_16;
              }
              ;
            })());
          }
          ;
          if (!(caller_pool_3 == null)) {
            return register_handler_BANG_(reg, "compute", "net.willcohen.proj", { "pre-terminate": pre_terminate_BANG_ });
          } else {
            const init_args_17 = await default_init_args({ "log-level": log_level_6 });
            if (truth_(handler_rt_opt_12)) {
              init_args_17["handlerRuntime"] = js_obj("logLevel", debug_level_10, "logCategories", clj__GT_js(debug_categories_11));
            }
            ;
            return register_handler_BANG_(reg, "compute", "net.willcohen.proj", spec(init_args_17));
          }
          ;
        }, "register_proj_BANG_");
        return ensure_wired_BANG_(pool_wiring, !(caller_pool_3 == null) ? { "pool": caller_pool_3, "register!": register_BANG__13 } : { "registry-opts": await (async () => {
          const G__2_18 = { "size": size_4 };
          if (truth_(handler_rt_opt_12)) {
            return { ...G__2_18, ["handler-runtime"]: handler_rt_opt_12 };
          } else {
            return G__2_18;
          }
          ;
        })(), "register!": register_BANG__13 });
      })();
    }, "init_workers_BANG_");
    worker_call2 = /* @__PURE__ */ __name(async function(worker_idx, cmd) {
      return await worker_call(current_pool2(), "net.willcohen.proj", get(cmd, "cmd"), cmd_args(cmd), worker_idx);
    }, "worker_call");
    DESTROY_GATE_MAX_ITERS = 16;
    destroy_context_BANG_ = /* @__PURE__ */ __name(async function(p3, worker_idx, ctx_id) {
      const parent_key_1 = `${worker_idx ?? ""}${":"}${ctx_id ?? ""}`;
      await drain_pending_disposes_for_parent_BANG_(parent_key_1);
      let iters_2 = 0;
      while (true) {
        const remaining_3 = in_flight_count_for_parent(parent_key_1);
        if (truth_(remaining_3 > 0 && iters_2 < DESTROY_GATE_MAX_ITERS)) {
          await await_parent_drain_BANG_(parent_key_1);
          let G__4 = iters_2 + 1;
          iters_2 = G__4;
          continue;
        }
        ;
        break;
      }
      ;
      return await worker_call(p3, "net.willcohen.proj", "context_destroy", cmd_args({ "cmd": "context_destroy", "ctxId": ctx_id }), worker_idx);
    }, "destroy_context_BANG_");
    live_pool_QMARK_2 = /* @__PURE__ */ __name(function(p3) {
      return live_pool_QMARK_(pool_wiring, p3);
    }, "live_pool_QMARK_");
    ignore_pool_terminated = /* @__PURE__ */ __name(function(err) {
      if (truth_(`${(() => {
        const and__23694__auto___1 = err;
        if (truth_(and__23694__auto___1)) {
          return err.message;
        } else {
          return and__23694__auto___1;
        }
        ;
      })() ?? ""}`.includes("pool terminated"))) {
        return null;
      } else {
        throw err;
      }
      ;
    }, "ignore_pool_terminated");
    get_worker_count = /* @__PURE__ */ __name(function() {
      const temp__23298__auto___1 = current_pool2();
      if (truth_(temp__23298__auto___1)) {
        const p_2 = temp__23298__auto___1;
        return pool_size(p_2);
      }
      ;
    }, "get_worker_count");
    shutdown_BANG_ = /* @__PURE__ */ __name(async function() {
      return await shutdown_wiring_BANG_(pool_wiring).then(function(reg) {
        if (truth_(reg)) {
          return null;
        } else {
          return flush_pending_disposes_BANG_().then(function(_) {
            return null;
          });
        }
        ;
      });
    }, "shutdown_BANG_");
    create_context_on_worker = /* @__PURE__ */ __name(function(opts) {
      const map___1_3 = assign_worker_for_context_BANG_(current_pool2(), "net.willcohen.proj", opts);
      const map___1_4 = truth_(sequential_QMARK_(map___1_3)) ? truth_(vector_QMARK_(map___1_3)) ? map___1_3 : seq_to_map_for_destructuring(map___1_3) : map___1_3;
      const idx_5 = get(map___1_4, "idx");
      const release_6 = get(map___1_4, "release");
      return worker_call2(idx_5, { "cmd": "context_create" }).then(function(result) {
        return { "ctx-id": result.ctxId, "ptr": result.ptr, "worker-idx": idx_5, "release": release_6 };
      }).catch(function(err) {
        release_6();
        throw err;
      });
    }, "create_context_on_worker");
    track_context_BANG_2 = /* @__PURE__ */ __name(function(ctx_id, worker_idx, release_fn, owner) {
      return track_context_BANG_("net.willcohen.proj", ctx_id, worker_idx, release_fn, owner);
    }, "track_context_BANG_");
    untrack_context_BANG_2 = /* @__PURE__ */ __name(function(ctx_id) {
      return untrack_context_BANG_("net.willcohen.proj", ctx_id);
    }, "untrack_context_BANG_");
    init_proj = /* @__PURE__ */ (() => {
      const impl6_1 = /* @__PURE__ */ __name(function() {
        return init_proj({});
      }, "impl6_1");
      const impl7_2 = /* @__PURE__ */ __name(function(opts) {
        return init_workers_BANG_(opts).catch(function(error) {
          console.error("PROJ worker init failed:", error);
          throw error;
        });
      }, "impl7_2");
      const f3 = /* @__PURE__ */ __name(function(...args4) {
        const self8_3 = this;
        const G__9_4 = args4.length;
        switch (G__9_4) {
          case 0:
            return impl6_1.call(self8_3);
            break;
          case 1:
            return impl7_2.call(self8_3, args4[0]);
            break;
          default:
            throw new Error(`${"Invalid arity: "}${args4.length ?? ""}`);
        }
        ;
      }, "f3");
      return f3;
    })();
    ensure_proj_initialized_BANG_ = /* @__PURE__ */ __name(function() {
      if (current_pool2() == null) {
        return init_proj();
      }
      ;
    }, "ensure_proj_initialized_BANG_");
    coord_array_arg_QMARK_ = /* @__PURE__ */ __name(function(arg) {
      const and__23694__auto___1 = object_QMARK_(arg);
      if (truth_(and__23694__auto___1)) {
        return arg.type === "coord-array";
      } else {
        return and__23694__auto___1;
      }
      ;
    }, "coord_array_arg_QMARK_");
    kebab__GT_snake = /* @__PURE__ */ __name(function(x) {
      return `${x ?? ""}`.replace(new RegExp("-", "g"), "_");
    }, "kebab__GT_snake");
    struct_list_extras = /* @__PURE__ */ __name(function(fn_def) {
      return { "structFields": mapv(function(p__10) {
        const vec___1_4 = p__10;
        const kw_5 = nth(vec___1_4, 0, null);
        const ftype_6 = nth(vec___1_4, 1, null);
        const wasm_offset_7 = nth(vec___1_4, 2, null);
        return { "key": kebab__GT_snake(kw_5), "type": `${ftype_6 ?? ""}`, "offset": wasm_offset_7 };
      }, get(fn_def, "struct-fields")), "structDestroyFn": get(fn_def, "struct-destroy-fn"), "structParamsCreate": get(fn_def, "struct-params-create"), "structParamsDestroy": get(fn_def, "struct-params-destroy") };
    }, "struct_list_extras");
    out_params_extras = /* @__PURE__ */ __name(function(fn_def) {
      return { "outFields": mapv(function(field_spec) {
        const vec___1_4 = field_spec;
        const field_name_5 = nth(vec___1_4, 0, null);
        const field_type_6 = nth(vec___1_4, 1, null);
        const G__11_7 = { "key": kebab__GT_snake(field_name_5), "type": `${field_type_6 ?? ""}` };
        if (field_type_6 === "double-array") {
          return { ...G__11_7, ["countArgIdx"]: (() => {
            const arg_names_8 = mapv(function(_PERCENT_1) {
              return `${first(_PERCENT_1) ?? ""}`;
            }, get(fn_def, "argtypes"));
            return arg_names_8.indexOf(`${nth(field_spec, 3) ?? ""}`);
          })() };
        } else {
          return G__11_7;
        }
        ;
      }, get(fn_def, "out-fields")) };
    }, "out_params_extras");
    coord_writeback_fn = /* @__PURE__ */ __name(function(coord_arrays, args) {
      return function(result) {
        const returned_data_1 = result.coordData;
        const n12_2 = count(coord_arrays);
        let i_3 = 0;
        for (; i_3 < n12_2; i_3++) {
          (() => {
            const ca_info_4 = nth(coord_arrays, i_3);
            const original_arg_5 = nth(args, get(ca_info_4, "argIdx"));
            const new_data_6 = returned_data_1[i_3];
            return original_arg_5.buffer.set(new_data_6);
          })();
        }
        ;
        return result.result;
      };
    }, "coord_writeback_fn");
    proj_extras_builder = /* @__PURE__ */ __name(function(fn_def, args) {
      const proj_returns_1 = get(fn_def, "proj-returns");
      const coord_arrays_2 = into([], keep_indexed(function(idx, arg) {
        if (truth_(coord_array_arg_QMARK_(arg))) {
          return { "argIdx": idx, "data": arg.buffer, "numFloats": arg.floatsNeeded };
        }
        ;
      }, args));
      const extras_3 = (() => {
        const G__13_4 = {};
        const G__13_5 = truth_(proj_returns_1) ? { ...G__13_4, ["projReturns"]: `${proj_returns_1 ?? ""}` } : G__13_4;
        const G__13_6 = proj_returns_1 === "struct-list" ? merge(G__13_5, struct_list_extras(fn_def)) : G__13_5;
        const G__13_7 = proj_returns_1 === "out-params" ? merge(G__13_6, out_params_extras(fn_def)) : G__13_6;
        if (truth_(seq(coord_arrays_2))) {
          return assoc(G__13_7, "coordArrays", mapv(function(ca) {
            return { "argIdx": get(ca, "argIdx"), "data": (() => {
              const data_8 = get(ca, "data");
              const n_9 = get(ca, "numFloats");
              if (_EQ_(data_8.length, n_9)) {
                return data_8;
              } else {
                return data_8.slice(0, n_9);
              }
              ;
            })(), "numFloats": get(ca, "numFloats") };
          }, coord_arrays_2));
        } else {
          return G__13_7;
        }
        ;
      })();
      return { "args": truth_(seq(coord_arrays_2)) ? mapv(function(arg) {
        if (truth_(coord_array_arg_QMARK_(arg))) {
          return 0;
        } else {
          return arg;
        }
        ;
      }, args) : args, "extras": extras_3, "on-result": truth_(seq(coord_arrays_2)) ? coord_writeback_fn(coord_arrays_2, args) : null };
    }, "proj_extras_builder");
    proj_result_wrapper = /* @__PURE__ */ __name(function(p__14) {
      const map___1_3 = p__14;
      const map___1_4 = truth_(sequential_QMARK_(map___1_3)) ? truth_(vector_QMARK_(map___1_3)) ? map___1_3 : seq_to_map_for_destructuring(map___1_3) : map___1_3;
      const result_5 = get(map___1_4, "result");
      const fn_def_6 = get(map___1_4, "fn-def");
      const worker_idx_7 = get(map___1_4, "worker-idx");
      const platform_8 = get(map___1_4, "platform");
      const args_9 = get(map___1_4, "args");
      const isolator_result_10 = get(map___1_4, "isolator-result");
      const proj_returns_11 = get(fn_def_6, "proj-returns");
      const wrapped_12 = truth_(platform_8 === "cljs" && (proj_returns_11 === "pj" && (!(result_5 == null) && !(result_5 === 0)))) ? (() => {
        const gen_13 = swap_BANG_(pj_gen_counter, inc);
        const ctx_id_14 = `pj-${result_5 ?? ""}-g${gen_13 ?? ""}`;
        const first_arg_15 = first(args_9);
        const parent_ctx_id_16 = truth_((() => {
          const and__23694__auto___17 = object_QMARK_(first_arg_15);
          if (truth_(and__23694__auto___17)) {
            return !(first_arg_15.ctx_id == null) && not(`${first_arg_15.ctx_id ?? ""}`.startsWith("pj-"));
          } else {
            return and__23694__auto___17;
          }
          ;
        })()) ? first_arg_15.ctx_id : null;
        return { "ptr": result_5, "worker_idx": worker_idx_7, "type": "pj", "ctx_id": ctx_id_14, "parent_ctx_id": parent_ctx_id_16 };
      })() : truth_(platform_8 === "cljs" && (() => {
        const and__23694__auto___19 = (() => {
          const or__23663__auto___18 = proj_returns_11 === "pj-list";
          if (or__23663__auto___18) {
            return or__23663__auto___18;
          } else {
            return proj_returns_11 === "pj-operation-factory-context";
          }
          ;
        })();
        if (truth_(and__23694__auto___19)) {
          return !(result_5 == null) && !(result_5 === 0);
        } else {
          return and__23694__auto___19;
        }
        ;
      })()) ? { "ptr": result_5, "worker_idx": worker_idx_7, "type": `${proj_returns_11 ?? ""}` } : "else" ? result_5 : null;
      const ephemeral_ctx_ptr_20 = get(isolator_result_10, "ephemeral-ctx-ptr");
      if (truth_((() => {
        const and__23694__auto___21 = ephemeral_ctx_ptr_20;
        if (truth_(and__23694__auto___21)) {
          return object_QMARK_(wrapped_12);
        } else {
          return and__23694__auto___21;
        }
        ;
      })())) {
        wrapped_12["_ephemeral_context_ptr"] = ephemeral_ctx_ptr_20;
        wrapped_12["_ephemeral_context_worker_idx"] = worker_idx_7;
      }
      ;
      return wrapped_12;
    }, "proj_result_wrapper");
    proj_context_isolator = /* @__PURE__ */ __name(async function(p__15) {
      const map___1_3 = p__15;
      const map___1_4 = truth_(sequential_QMARK_(map___1_3)) ? truth_(vector_QMARK_(map___1_3)) ? map___1_3 : seq_to_map_for_destructuring(map___1_3) : map___1_3;
      const args_5 = get(map___1_4, "args");
      const worker_idx_6 = get(map___1_4, "worker-idx");
      const pool_7 = get(map___1_4, "pool");
      const library_8 = get(map___1_4, "library");
      const consumer_ctx_9 = first(args_5);
      const clone_ptr_10 = await call_BANG_(library_8, "proj_context_clone", [consumer_ctx_9], { "pool": pool_7, "force-worker-idx": worker_idx_6 });
      return { "args": assoc(vec(args_5), 0, clone_ptr_10), "ephemeral-ctx-ptr": clone_ptr_10 };
    }, "proj_context_isolator");
    string_list_to_native_array = /* @__PURE__ */ __name(function(s_list) {
      return vec(s_list);
    }, "string_list_to_native_array");
  }
});
var init_esbuild_shims = __esm({
  "esbuild-shims.mjs"() {
    init_fndefs();
    init_wasm();
  }
});
init_esbuild_shims();
init_esbuild_shims();
init_esbuild_shims();
var ffi_QMARK_ = /* @__PURE__ */ __name(function(impl_atom) {
  return "ffi" === deref(impl_atom);
}, "ffi_QMARK_");
var graal_QMARK_ = /* @__PURE__ */ __name(function(impl_atom) {
  return "graal" === deref(impl_atom);
}, "graal_QMARK_");
var node_QMARK_ = /* @__PURE__ */ __name(function(impl_atom) {
  return "node" === deref(impl_atom);
}, "node_QMARK_");
var force_graal_BANG_ = /* @__PURE__ */ __name(function(impl_atom, force_atom) {
  reset_BANG_(force_atom, true);
  return reset_BANG_(impl_atom, null);
}, "force_graal_BANG_");
var force_ffi_BANG_ = /* @__PURE__ */ __name(function(impl_atom, force_atom) {
  reset_BANG_(force_atom, false);
  return reset_BANG_(impl_atom, null);
}, "force_ffi_BANG_");
var toggle_graal_BANG_ = /* @__PURE__ */ __name(function(impl_atom, force_atom) {
  swap_BANG_(force_atom, not);
  return reset_BANG_(impl_atom, null);
}, "toggle_graal_BANG_");
init_pool();
init_dispatch();
init_wasm();
init_fndefs();
init_fndefs();
init_esbuild_shims();
init_fndefs();
init_fndefs();
init_esbuild_shims();
init_handler();
var implementation = atom(null);
var force_graal = atom(false);
var toggle_graal_BANG_2 = /* @__PURE__ */ __name(function() {
  return toggle_graal_BANG_(implementation, force_graal);
}, "toggle_graal_BANG_");
var force_graal_BANG_2 = /* @__PURE__ */ __name(function() {
  return force_graal_BANG_(implementation, force_graal);
}, "force_graal_BANG_");
var force_ffi_BANG_2 = /* @__PURE__ */ __name(function() {
  return force_ffi_BANG_(implementation, force_graal);
}, "force_ffi_BANG_");
var ffi_QMARK_2 = /* @__PURE__ */ __name(function() {
  return ffi_QMARK_(implementation);
}, "ffi_QMARK_");
var graal_QMARK_2 = /* @__PURE__ */ __name(function() {
  return graal_QMARK_(implementation);
}, "graal_QMARK_");
var node_QMARK_2 = /* @__PURE__ */ __name(function() {
  return node_QMARK_(implementation);
}, "node_QMARK_");
var p2 = p;
var alloc_coord_array = /* @__PURE__ */ __name(function(num_coords, _worker_idx) {
  const floats_needed_1 = num_coords * 4;
  return { "buffer": new Float64Array(floats_needed_1), "numCoords": num_coords, "floatsNeeded": floats_needed_1, "type": "coord-array" };
}, "alloc_coord_array");
var set_coord_array = /* @__PURE__ */ __name(function(coord_array2, allocated) {
  const buf_1 = allocated.buffer;
  if (truth_((() => {
    const and__23694__auto___2 = array_QMARK_(coord_array2);
    if (truth_(and__23694__auto___2)) {
      return every_QMARK_(number_QMARK_, coord_array2);
    } else {
      return and__23694__auto___2;
    }
    ;
  })())) {
    buf_1.set(coord_array2, 0);
  } else {
    if (truth_((() => {
      const and__23694__auto___3 = array_QMARK_(coord_array2);
      if (truth_(and__23694__auto___3)) {
        return array_QMARK_(coord_array2[0]);
      } else {
        return and__23694__auto___3;
      }
      ;
    })())) {
      let i_4 = 0;
      let off_5 = 0;
      while (true) {
        if (i_4 < coord_array2.length) {
          const inner_6 = coord_array2[i_4];
          const len_7 = inner_6.length;
          if (off_5 + len_7 > buf_1.length) {
            throw new RangeError("coords exceed coord-array capacity");
          }
          ;
          const n712_8 = len_7;
          let j_9 = 0;
          for (; j_9 < n712_8; j_9++) {
            buf_1[off_5 + j_9] = inner_6[j_9];
          }
          ;
          let G__10 = i_4 + 1;
          let G__11 = off_5 + len_7;
          i_4 = G__10;
          off_5 = G__11;
          continue;
        }
        ;
        break;
      }
    } else {
      if ("else") {
        buf_1.set(into_array(flatten(coord_array2)), 0);
      } else {
      }
    }
  }
  ;
  return allocated;
}, "set_coord_array");
var get_coord_array = /* @__PURE__ */ __name(function(allocated, idx) {
  const buf_1 = allocated.buffer;
  const offset_2 = idx * 4;
  return [buf_1[offset_2], buf_1[offset_2 + 1], buf_1[offset_2 + 2], buf_1[offset_2 + 3]];
}, "get_coord_array");
var init_BANG_ = /* @__PURE__ */ (() => {
  const impl881_1 = /* @__PURE__ */ __name(function() {
    return init_BANG_(null);
  }, "impl881_1");
  const impl882_2 = /* @__PURE__ */ __name(function(opts) {
    const log_level_3 = get(opts, "log-level");
    if (truth_(log_level_3)) {
      console.log("Attempting to initialize PROJ library for ClojureScript...");
    }
    ;
    const runtime_4 = truth_(typeof process !== "undefined" && (typeof process !== "undefined" && typeof process.versions !== "undefined" && typeof process !== "undefined" && typeof process.versions !== "undefined" && typeof process.versions.node !== "undefined")) ? "node" : typeof window !== "undefined" ? "browser" : "else" ? "unknown" : null;
    if (truth_(log_level_3)) {
      console.log(`${"Detected runtime: "}${runtime_4 ?? ""}`);
    }
    ;
    const init_promise_5 = init_proj(opts);
    init_promise_5.then(function(proj_module) {
      reset_BANG_(implementation, runtime_4);
      if (truth_(log_level_3)) {
        console.log(`${"PROJ initialized with "}${runtime_4 ?? ""}${" implementation"}`);
      }
      ;
      return proj_module;
    });
    return init_promise_5;
  }, "impl882_2");
  const f878 = /* @__PURE__ */ __name(function(...args879) {
    const self883_6 = this;
    const G__1159_7 = args879.length;
    switch (G__1159_7) {
      case 0:
        return impl881_1.call(self883_6);
        break;
      case 1:
        return impl882_2.call(self883_6, args879[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args879.length ?? ""}`);
    }
    ;
  }, "f878");
  return f878;
})();
var shutdown_BANG_2 = /* @__PURE__ */ __name(function() {
  return shutdown_BANG_();
}, "shutdown_BANG_");
var flush_pending_disposes_BANG_2 = /* @__PURE__ */ __name(function() {
  return flush_pending_disposes_BANG_();
}, "flush_pending_disposes_BANG_");
var get_pool_detail2 = /* @__PURE__ */ __name(function() {
  return get_pool_detail("net.willcohen.proj");
}, "get_pool_detail");
var get_worker_count2 = /* @__PURE__ */ __name(function() {
  return get_worker_count();
}, "get_worker_count");
var pad_coords = /* @__PURE__ */ __name(function(width, coords) {
  if (truth_((() => {
    const and__23694__auto___1 = sequential_QMARK_(coords);
    if (truth_(and__23694__auto___1)) {
      return every_QMARK_(sequential_QMARK_, coords);
    } else {
      return and__23694__auto___1;
    }
    ;
  })())) {
    return mapv(function(coord) {
      const n_2 = count(coord);
      if (n_2 < width) {
        return into(vec(coord), repeat(width - n_2, 0));
      } else {
        return coord;
      }
      ;
    }, coords);
  } else {
    return coords;
  }
  ;
}, "pad_coords");
var set_coords_BANG_ = /* @__PURE__ */ __name(async function(ca, coords) {
  return await set_coord_array(pad_coords(4, coords), ca);
}, "set_coords_BANG_");
var get_coords = /* @__PURE__ */ __name(function(ca, idx) {
  return get_coord_array(ca, idx);
}, "get_coords");
var cs = /* @__PURE__ */ __name(function(context, f, args) {
  const ptr_1 = context_ptr(context);
  if (truth_(ptr_1)) {
  } else {
    throw new Error("Pointer in context is nil");
  }
  ;
  return apply(f, cons(context, args));
}, "cs");
var proj_type__GT_destroy_fn = { "pj": "proj_destroy", "pj-list": "proj_list_destroy", "string-list": "proj_string_list_destroy", "pj-context": "proj_context_destroy", "pj-crs-list-parameters": "proj_get_crs_list_parameters_destroy", "pj-insert-session": "proj_insert_object_session_destroy", "pj-operation-factory-context": "proj_operation_factory_context_destroy" };
var proj_error_codes = (() => {
  const G__1555_1 = {};
  G__1555_1[0] = "Success (no error)";
  G__1555_1[1024] = "PROJ_ERR_INVALID_OP - Invalid coordinate operation";
  G__1555_1[2048] = "PROJ_ERR_COORD_TRANSFM - Coordinate transformation error";
  G__1555_1[4096] = "PROJ_ERR_OTHER - Other error";
  G__1555_1[1025] = "PROJ_ERR_INVALID_OP_WRONG_SYNTAX - Invalid pipeline structure or missing +proj";
  G__1555_1[2049] = "PROJ_ERR_COORD_TRANSFM_INVALID_COORD - Invalid coordinate (for example, lat > 90\xB0)";
  G__1555_1[4097] = "PROJ_ERR_OTHER_API_MISUSE - API misuse";
  G__1555_1[1026] = "PROJ_ERR_INVALID_OP_MISSING_ARG - Missing required operation parameter";
  G__1555_1[2050] = "PROJ_ERR_COORD_TRANSFM_OUTSIDE_PROJECTION_DOMAIN - Outside projection domain";
  G__1555_1[4098] = "PROJ_ERR_OTHER_NO_INVERSE_OP - No inverse operation available";
  G__1555_1[1027] = "PROJ_ERR_INVALID_OP_ILLEGAL_ARG_VALUE - Illegal parameter value";
  G__1555_1[2051] = "PROJ_ERR_COORD_TRANSFM_NO_OPERATION - No operation found";
  G__1555_1[4099] = "PROJ_ERR_OTHER_NETWORK_ERROR - Network resource access failure";
  G__1555_1[1028] = "PROJ_ERR_INVALID_OP_MUTUALLY_EXCLUSIVE_ARGS - Mutually exclusive arguments";
  G__1555_1[2052] = "PROJ_ERR_COORD_TRANSFM_OUTSIDE_GRID - Point outside grid";
  G__1555_1[1029] = "PROJ_ERR_INVALID_OP_FILE_NOT_FOUND_OR_INVALID - File not found or invalid";
  G__1555_1[2053] = "PROJ_ERR_COORD_TRANSFM_GRID_AT_NODATA - Grid cell is nodata";
  G__1555_1[2054] = "PROJ_ERR_COORD_TRANSFM_NO_CONVERGENCE - Iterative convergence failed";
  G__1555_1[2055] = "PROJ_ERR_COORD_TRANSFM_MISSING_TIME - Operation requires time";
  return G__1555_1;
})();
var error_code__GT_string = /* @__PURE__ */ __name(function(code) {
  return get(proj_error_codes, code, `${"Unknown error code: "}${code ?? ""}`);
}, "error_code__GT_string");
var build_ctx_destroy_fn = /* @__PURE__ */ __name(function(ctx_pool, worker_idx, ctx_id) {
  const fired_QMARK__1 = atom(false);
  return /* @__PURE__ */ __name(function dispose_ctx_BANG_() {
    if (truth_((() => {
      const and__23694__auto___2 = live_pool_QMARK_2(ctx_pool);
      if (truth_(and__23694__auto___2)) {
        return compare_and_set_BANG_(fired_QMARK__1, false, true);
      } else {
        return and__23694__auto___2;
      }
      ;
    })())) {
      const p_3 = destroy_context_BANG_(ctx_pool, worker_idx, ctx_id).catch(ignore_pool_terminated);
      untrack_context_BANG_2(ctx_id);
      return p_3;
    }
    ;
  }, "dispose_ctx_BANG_");
}, "build_ctx_destroy_fn");
var attach_ctx_symbol_dispose_BANG_ = /* @__PURE__ */ __name(function(ctx_obj, destroy_fn, ctx_id, worker_idx) {
  return ctx_obj[Symbol.dispose] = function() {
    return fire_and_capture_dispose_BANG_(destroy_fn, { "lib": "net.willcohen.proj", "kind": "ctx", "ctx-id": ctx_id, "worker": worker_idx });
  };
}, "attach_ctx_symbol_dispose_BANG_");
var context_create_cljs = /* @__PURE__ */ __name(async function(opts) {
  ensure_initialized_BANG_();
  const ctx_pool_1 = current_pool2();
  const ctx_result_2 = await create_context_on_worker(opts);
  const ctx_id_3 = get(ctx_result_2, "ctx-id");
  const worker_idx_4 = get(ctx_result_2, "worker-idx");
  const destroy_fn_5 = build_ctx_destroy_fn(ctx_pool_1, worker_idx_4, ctx_id_3);
  const ctx_obj_6 = { "ptr": get(ctx_result_2, "ptr"), "ctx_id": ctx_id_3, "worker_idx": worker_idx_4, "type": "proj-context" };
  track_context_BANG_2(ctx_id_3, worker_idx_4, get(ctx_result_2, "release"), ctx_obj_6);
  track(ctx_obj_6, { "disposefn": destroy_fn_5, "tracktype": "auto" });
  attach_ctx_symbol_dispose_BANG_(ctx_obj_6, destroy_fn_5, ctx_id_3, worker_idx_4);
  return ctx_obj_6;
}, "context_create_cljs");
var context_create = /* @__PURE__ */ (() => {
  const impl1938_1 = /* @__PURE__ */ __name(async function(args) {
    const opts_2 = truth_(seq(args)) ? first(args) : {};
    const opts_3 = truth_(map_QMARK_(opts_2)) ? opts_2 : {};
    return await context_create_cljs(opts_3);
  }, "impl1938_1");
  const f1936 = /* @__PURE__ */ __name(function(...rest1937) {
    const self__23423__auto___4 = this;
    return impl1938_1.call(self__23423__auto___4, rest1937.length === 0 ? null : rest1937);
  }, "f1936");
  f1936["squint$lang$variadic"] = impl1938_1;
  return f1936;
})();
var context_ptr = /* @__PURE__ */ __name(function(context) {
  return context.ptr;
}, "context_ptr");
var context_database_path = /* @__PURE__ */ __name(function(context) {
  return context.database_path;
}, "context_database_path");
var is_context_QMARK_ = /* @__PURE__ */ __name(function(x) {
  const and__23694__auto___1 = x;
  if (truth_(and__23694__auto___1)) {
    const and__23694__auto___2 = x.ptr;
    if (truth_(and__23694__auto___2)) {
      return x.type === "proj-context";
    } else {
      return and__23694__auto___2;
    }
    ;
  } else {
    return and__23694__auto___1;
  }
  ;
}, "is_context_QMARK_");
var context_set_database_path = /* @__PURE__ */ (() => {
  const impl2252_1 = /* @__PURE__ */ __name(function(context) {
    return context_set_database_path(context, "/proj/proj.db");
  }, "impl2252_1");
  const impl2253_2 = /* @__PURE__ */ __name(function(context, db_path) {
    return context_set_database_path(context, db_path, null, null);
  }, "impl2253_2");
  const impl2254_3 = /* @__PURE__ */ __name(function(context, db_path, aux_db_paths, options) {
    const ctx_ptr_4 = context_ptr(context);
    return proj_context_set_database_path({ "context": ctx_ptr_4, "db-path": db_path, "aux-db-paths": aux_db_paths, "options": options });
  }, "impl2254_3");
  const f2249 = /* @__PURE__ */ __name(function(...args2250) {
    const self2255_5 = this;
    const G__2336_6 = args2250.length;
    switch (G__2336_6) {
      case 1:
        return impl2252_1.call(self2255_5, args2250[0]);
        break;
      case 2:
        return impl2253_2.call(self2255_5, args2250[0], args2250[1]);
        break;
      case 4:
        return impl2254_3.call(self2255_5, args2250[0], args2250[1], args2250[2], args2250[3]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args2250.length ?? ""}`);
    }
    ;
  }, "f2249");
  return f2249;
})();
var context_set_enable_network = /* @__PURE__ */ __name(function(context, enabled) {
  return proj_context_set_enable_network({ "context": context_ptr(context), "enabled": truth_(enabled) ? 1 : 0 });
}, "context_set_enable_network");
var coord_array = /* @__PURE__ */ (() => {
  const impl2485_1 = /* @__PURE__ */ __name(function(n) {
    return coord_array(n, 4);
  }, "impl2485_1");
  const impl2486_2 = /* @__PURE__ */ __name(function(n, dims) {
    return coord_array(n, dims, {});
  }, "impl2486_2");
  const impl2487_3 = /* @__PURE__ */ __name(function(n, _dims, _opts) {
    if (deref(implementation) == null) {
      init_BANG_();
    }
    ;
    return alloc_coord_array(n, 0);
  }, "impl2487_3");
  const f2482 = /* @__PURE__ */ __name(function(...args2483) {
    const self2488_4 = this;
    const G__2579_5 = args2483.length;
    switch (G__2579_5) {
      case 1:
        return impl2485_1.call(self2488_4, args2483[0]);
        break;
      case 2:
        return impl2486_2.call(self2488_4, args2483[0], args2483[1]);
        break;
      case 3:
        return impl2487_3.call(self2488_4, args2483[0], args2483[1], args2483[2]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args2483.length ?? ""}`);
    }
    ;
  }, "f2482");
  return f2482;
})();
var coord__GT_coord_array = /* @__PURE__ */ __name(function(coord) {
  const G__2695_1 = deref(implementation);
  switch (G__2695_1) {
    case "node":
      return set_coord_array(coord, coord_array(1));
      break;
    case "browser":
      return set_coord_array(coord, coord_array(1));
      break;
    default:
      throw new Error(`${"No matching clause: "}${G__2695_1 ?? ""}`);
  }
  ;
}, "coord__GT_coord_array");
var is_c_context_fn_QMARK_ = /* @__PURE__ */ __name(function(fn_key, fn_def) {
  const arg_specs_1 = get(fn_def, "argtypes");
  if (truth_(contains_QMARK_(fn_def, "is-context-fn"))) {
    return get(fn_def, "is-context-fn");
  } else {
    if (truth_(get(/* @__PURE__ */ new Set(["proj_context_destroy", "proj_operation_factory_context_destroy"]), fn_key))) {
      return false;
    } else {
      if ("else") {
        return boolean$((() => {
          const and__23694__auto___2 = sequential_QMARK_(arg_specs_1);
          if (truth_(and__23694__auto___2)) {
            const and__23694__auto___3 = seq(arg_specs_1);
            if (truth_(and__23694__auto___3)) {
              const first_arg_4 = first(arg_specs_1);
              const and__23694__auto___5 = sequential_QMARK_(first_arg_4);
              if (truth_(and__23694__auto___5)) {
                const and__23694__auto___6 = seq(first_arg_4);
                if (truth_(and__23694__auto___6)) {
                  return get(/* @__PURE__ */ new Set(["context", "ctx"]), first(first_arg_4));
                } else {
                  return and__23694__auto___6;
                }
                ;
              } else {
                return and__23694__auto___5;
              }
              ;
            } else {
              return and__23694__auto___3;
            }
            ;
          } else {
            return and__23694__auto___2;
          }
          ;
        })());
      } else {
        return null;
      }
    }
  }
  ;
}, "is_c_context_fn_QMARK_");
var call_native = /* @__PURE__ */ (() => {
  const impl2999_1 = /* @__PURE__ */ __name(function(fn_key, args) {
    return call_native(fn_key, null, args, null);
  }, "impl2999_1");
  const impl3000_2 = /* @__PURE__ */ __name(function(fn_key, fn_def, args) {
    return call_native(fn_key, fn_def, args, null);
  }, "impl3000_2");
  const impl3001_3 = /* @__PURE__ */ __name(function(fn_key, _fn_def, args, force_worker_idx) {
    ensure_proj_initialized_BANG_();
    const pj_arg_4 = first(filter(function(a) {
      const and__23694__auto___5 = object_QMARK_(a);
      if (truth_(and__23694__auto___5)) {
        return "pj" === a.type;
      } else {
        return and__23694__auto___5;
      }
      ;
    }, args));
    const primary_handle_6 = truth_(pj_arg_4) ? pj_arg_4.ctx_id : null;
    return call_BANG_(lib, fn_key, args, { "pool": current_pool2(), "primary-handle": primary_handle_6, "force-worker-idx": force_worker_idx });
  }, "impl3001_3");
  const f2996 = /* @__PURE__ */ __name(function(...args2997) {
    const self3002_7 = this;
    const G__3213_8 = args2997.length;
    switch (G__3213_8) {
      case 2:
        return impl2999_1.call(self3002_7, args2997[0], args2997[1]);
        break;
      case 3:
        return impl3000_2.call(self3002_7, args2997[0], args2997[1], args2997[2]);
        break;
      case 4:
        return impl3001_3.call(self3002_7, args2997[0], args2997[1], args2997[2], args2997[3]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args2997.length ?? ""}`);
    }
    ;
  }, "f2996");
  return f2996;
})();
var ensure_initialized_BANG_ = /* @__PURE__ */ __name(function() {
  if (deref(implementation) == null) {
    return console.warn("PROJ may not be initialized - ensure proj/init! was called");
  }
  ;
}, "ensure_initialized_BANG_");
var lookup_arg_val = /* @__PURE__ */ __name(function(opts, arg_name) {
  const underscore_1 = arg_name;
  const hyphenated_2 = `${arg_name ?? ""}`.replace(new RegExp("_", "g"), "-");
  const context_alias_3 = (() => {
    const G__3414_4 = arg_name;
    switch (G__3414_4) {
      case "ctx":
        return "context";
        break;
      case "context":
        return "ctx";
        break;
    }
    ;
  })();
  const or__23663__auto___6 = get(opts, underscore_1);
  if (truth_(or__23663__auto___6)) {
    return or__23663__auto___6;
  } else {
    const or__23663__auto___7 = get(opts, hyphenated_2);
    if (truth_(or__23663__auto___7)) {
      return or__23663__auto___7;
    } else {
      if (truth_(context_alias_3)) {
        return get(opts, context_alias_3);
      }
    }
    ;
  }
  ;
}, "lookup_arg_val");
var resolve_default = /* @__PURE__ */ __name(function(default_val, arg_type) {
  if (truth_(arg_type === "int32" && boolean_QMARK_(default_val))) {
    if (truth_(default_val)) {
      return 1;
    } else {
      return 0;
    }
  } else {
    if ("else") {
      return default_val;
    } else {
      return null;
    }
  }
  ;
}, "resolve_default");
var coerce_arg = /* @__PURE__ */ __name(function(provided_val, arg_type, semantics_for_arg) {
  if (truth_(arg_type === "pointer" && (() => {
    const and__23694__auto___1 = object_QMARK_(provided_val);
    if (truth_(and__23694__auto___1)) {
      return provided_val.type === "coord-array";
    } else {
      return and__23694__auto___1;
    }
    ;
  })())) {
    return provided_val;
  } else {
    if (truth_(arg_type === "pointer" && (() => {
      const and__23694__auto___2 = map_QMARK_(provided_val);
      if (truth_(and__23694__auto___2)) {
        return contains_QMARK_(provided_val, "malloc");
      } else {
        return and__23694__auto___2;
      }
      ;
    })())) {
      return get(provided_val, "malloc");
    } else {
      if (truth_(!(provided_val == null) && (() => {
        const and__23694__auto___3 = sequential_QMARK_(provided_val);
        if (truth_(and__23694__auto___3)) {
          return "string-array?" === get(semantics_for_arg, "semantic-type");
        } else {
          return and__23694__auto___3;
        }
        ;
      })())) {
        return string_list_to_native_array(provided_val);
      } else {
        if (truth_(provided_val == null && get(/* @__PURE__ */ new Set(["pointer", "pointer?"]), arg_type))) {
          return 0;
        } else {
          if (truth_(provided_val == null && arg_type === "string")) {
            return 0;
          } else {
            if ("else") {
              return provided_val;
            } else {
              return null;
            }
          }
        }
      }
    }
  }
  ;
}, "coerce_arg");
var extract_args = /* @__PURE__ */ (() => {
  const impl3988_1 = /* @__PURE__ */ __name(function(fn_def, opts) {
    return extract_args(fn_def, opts, {});
  }, "impl3988_1");
  const impl3989_2 = /* @__PURE__ */ __name(function(fn_def, opts, p__4026) {
    const map___3_5 = p__4026;
    const map___3_6 = truth_(sequential_QMARK_(map___3_5)) ? truth_(vector_QMARK_(map___3_5)) ? map___3_5 : seq_to_map_for_destructuring(map___3_5) : map___3_5;
    const skip_first_QMARK__7 = get(map___3_6, "skip-first?", false);
    const argtypes_8 = truth_(skip_first_QMARK__7) ? rest(get(fn_def, "argtypes")) : get(fn_def, "argtypes");
    const argsemantics_map_9 = into({}, map(function(p__4147) {
      const vec___10_13 = p__4147;
      const seq___11_14 = seq(vec___10_13);
      const first___12_15 = first(seq___11_14);
      const seq___11_16 = next(seq___11_14);
      const arg_name_17 = first___12_15;
      const first___12_18 = first(seq___11_16);
      const seq___11_19 = next(seq___11_16);
      const semantic_type_20 = first___12_18;
      const rest_semantics_21 = seq___11_19;
      return [arg_name_17, merge({ "semantic-type": semantic_type_20 }, truth_(seq(rest_semantics_21)) ? apply(assoc, {}, rest_semantics_21) : {})];
    }, get(fn_def, "argsemantics")));
    return mapv(function(arg_spec) {
      const vec___22_25 = arg_spec;
      const seq___23_26 = seq(vec___22_25);
      const first___24_27 = first(seq___23_26);
      const seq___23_28 = next(seq___23_26);
      const arg_name_29 = first___24_27;
      const first___24_30 = first(seq___23_28);
      const seq___23_31 = next(seq___23_28);
      const arg_type_32 = first___24_30;
      const rest_spec_33 = seq___23_31;
      const arg_map_34 = truth_(seq(rest_spec_33)) ? apply(assoc, {}, rest_spec_33) : null;
      const semantics_for_arg_35 = get(argsemantics_map_9, arg_name_29);
      const default_val_36 = truth_(contains_QMARK_(arg_map_34, "default")) ? get(arg_map_34, "default") : get(semantics_for_arg_35, "default");
      const has_default_QMARK__37 = (() => {
        const or__23663__auto___38 = contains_QMARK_(arg_map_34, "default");
        if (truth_(or__23663__auto___38)) {
          return or__23663__auto___38;
        } else {
          return contains_QMARK_(semantics_for_arg_35, "default");
        }
        ;
      })();
      const is_context_arg_39 = contains_QMARK_(/* @__PURE__ */ new Set(["ctx", "context"]), arg_name_29);
      const provided_val_40 = lookup_arg_val(opts, arg_name_29);
      if (truth_((() => {
        const and__23694__auto___41 = is_context_arg_39;
        if (truth_(and__23694__auto___41)) {
          return !(provided_val_40 == null) && is_context_QMARK_(provided_val_40);
        } else {
          return and__23694__auto___41;
        }
        ;
      })())) {
        return provided_val_40;
      } else {
        if (truth_((() => {
          const and__23694__auto___42 = is_context_arg_39;
          if (truth_(and__23694__auto___42)) {
            return provided_val_40 == null && not(has_default_QMARK__37);
          } else {
            return and__23694__auto___42;
          }
          ;
        })())) {
          return 0;
        } else {
          if (truth_(provided_val_40 == null && has_default_QMARK__37)) {
            return resolve_default(default_val_36, arg_type_32);
          } else {
            if ("else") {
              return coerce_arg(provided_val_40, arg_type_32, semantics_for_arg_35);
            } else {
              return null;
            }
          }
        }
      }
      ;
    }, argtypes_8);
  }, "impl3989_2");
  const f3985 = /* @__PURE__ */ __name(function(...args3986) {
    const self3990_43 = this;
    const G__4568_44 = args3986.length;
    switch (G__4568_44) {
      case 2:
        return impl3988_1.call(self3990_43, args3986[0], args3986[1]);
        break;
      case 3:
        return impl3989_2.call(self3990_43, args3986[0], args3986[1], args3986[2]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args3986.length ?? ""}`);
    }
    ;
  }, "f3985");
  return f3985;
})();
var build_pj_destroy_fn = /* @__PURE__ */ __name(function(pj_pool, worker_idx, ptr, destroy_fn_name, ephemeral_ctx_ptr, ephemeral_ctx_worker_idx) {
  const fired_QMARK__1 = atom(false);
  return /* @__PURE__ */ __name(async function dispose_BANG_() {
    if (truth_(await (async () => {
      const and__23694__auto___2 = live_pool_QMARK_2(pj_pool);
      if (truth_(and__23694__auto___2)) {
        return compare_and_set_BANG_(fired_QMARK__1, false, true);
      } else {
        return and__23694__auto___2;
      }
      ;
    })())) {
      const routing_3 = { "worker_idx": worker_idx, "ptr": ptr };
      await call_BANG_(lib, destroy_fn_name, [routing_3], { "pool": pj_pool, "force-worker-idx": worker_idx }).catch(ignore_pool_terminated);
      if (truth_(ephemeral_ctx_ptr)) {
        const ctx_routing_4 = { "worker_idx": ephemeral_ctx_worker_idx, "ptr": ephemeral_ctx_ptr };
        return await call_BANG_(lib, "proj_context_destroy", [ctx_routing_4], { "pool": pj_pool, "force-worker-idx": ephemeral_ctx_worker_idx }).catch(ignore_pool_terminated);
      }
      ;
    }
    ;
  }, "dispose_BANG_");
}, "build_pj_destroy_fn");
var attach_pj_symbol_dispose_BANG_ = /* @__PURE__ */ __name(function(target, destroy_fn, pj_ctx_id, worker_idx) {
  return target[Symbol.dispose] = function() {
    const or__23663__auto___1 = dispose_handle_BANG_("net.willcohen.proj", pj_ctx_id);
    if (truth_(or__23663__auto___1)) {
      return or__23663__auto___1;
    } else {
      return fire_and_capture_dispose_BANG_(destroy_fn, { "lib": "net.willcohen.proj", "kind": "pj", "ctx-id": pj_ctx_id, "worker": worker_idx });
    }
    ;
  };
}, "attach_pj_symbol_dispose_BANG_");
var register_pj_handle_BANG_ = /* @__PURE__ */ __name(function(result, destroy_fn, pj_ctx_id, worker_idx, parent_ctx_id) {
  try {
    return bounded_create_handle_BANG_("net.willcohen.proj", function() {
      const parent_key_1 = truth_(parent_ctx_id) ? `${worker_idx ?? ""}${":"}${parent_ctx_id ?? ""}` : null;
      return register_handle_BANG_("net.willcohen.proj", pj_ctx_id, worker_idx, destroy_fn, result, parent_key_1);
    });
  } catch (e_2) {
    if ("bounded-blocked" === (() => {
      const G__4984_3 = e_2;
      const G__4984_4 = G__4984_3 == null ? null : ex_data(G__4984_3);
      if (G__4984_4 == null) {
        return null;
      } else {
        return get(G__4984_4, "blocked");
      }
      ;
    })()) {
      try {
        fire_and_capture_dispose_BANG_(destroy_fn, { "lib": "net.willcohen.proj", "kind": "pj", "ctx-id": pj_ctx_id, "worker": worker_idx, "path": "bounded-blocked-cleanup" });
      } catch (__5) {
      }
    }
    ;
    throw e_2;
  }
  ;
}, "register_pj_handle_BANG_");
var track_pj_result_BANG_ = /* @__PURE__ */ __name(function(result, destroy_fn_name) {
  const worker_idx_1 = result.worker_idx;
  const ptr_2 = result.ptr;
  const pj_ctx_id_3 = result.ctx_id;
  const parent_ctx_id_4 = result.parent_ctx_id;
  const ephemeral_ctx_ptr_5 = result._ephemeral_context_ptr;
  const ephemeral_ctx_worker_idx_6 = result._ephemeral_context_worker_idx;
  const destroy_fn_7 = build_pj_destroy_fn(current_pool2(), worker_idx_1, ptr_2, destroy_fn_name, ephemeral_ctx_ptr_5, ephemeral_ctx_worker_idx_6);
  register_pj_handle_BANG_(result, destroy_fn_7, pj_ctx_id_3, worker_idx_1, parent_ctx_id_4);
  attach_pj_symbol_dispose_BANG_(result, destroy_fn_7, pj_ctx_id_3, worker_idx_1);
  return result;
}, "track_pj_result_BANG_");
var process_return_value_with_tracking = /* @__PURE__ */ __name(function(result, fn_def) {
  const proj_returns_1 = get(fn_def, "proj-returns");
  if ("string-list" === proj_returns_1) {
    return result;
  } else {
    const destroy_fn_name_2 = get(proj_type__GT_destroy_fn, proj_returns_1);
    if (truth_((() => {
      const and__23694__auto___3 = destroy_fn_name_2;
      if (truth_(and__23694__auto___3)) {
        return result;
      } else {
        return and__23694__auto___3;
      }
      ;
    })())) {
      if (truth_((() => {
        const and__23694__auto___4 = object_QMARK_(result);
        if (truth_(and__23694__auto___4)) {
          return result.ctx_id;
        } else {
          return and__23694__auto___4;
        }
        ;
      })())) {
        return track_pj_result_BANG_(result, destroy_fn_name_2);
      } else {
        return result;
      }
    } else {
      return result;
    }
    ;
  }
  ;
}, "process_return_value_with_tracking");
var dispatch_context_fn = /* @__PURE__ */ __name(function(fn_key, fn_def, context_atom, remaining_args) {
  return cs(context_atom, /* @__PURE__ */ (() => {
    const impl5343_1 = /* @__PURE__ */ __name(function(ctx, args) {
      const full_args_2 = vec(cons(ctx, args));
      return call_native(fn_key, fn_def, full_args_2);
    }, "impl5343_1");
    const f5340 = /* @__PURE__ */ __name(function(arg5341, ...rest5342) {
      const self__23423__auto___3 = this;
      return impl5343_1.call(self__23423__auto___3, arg5341, rest5342.length === 0 ? null : rest5342);
    }, "f5340");
    f5340["squint$lang$variadic"] = impl5343_1;
    return f5340;
  })(), remaining_args);
}, "dispatch_context_fn");
var resolve_context_val = /* @__PURE__ */ __name(function(opts, first_arg_name) {
  const or__23663__auto___1 = get(opts, first_arg_name);
  if (truth_(or__23663__auto___1)) {
    return or__23663__auto___1;
  } else {
    if (truth_(get(/* @__PURE__ */ new Set(["ctx", "context"]), first_arg_name))) {
      return get(opts, first_arg_name === "ctx" ? "context" : "ctx");
    }
  }
  ;
}, "resolve_context_val");
var first_arg_kw = /* @__PURE__ */ __name(function(fn_def) {
  if (truth_(seq(get(fn_def, "argtypes")))) {
    const v_1 = first(first(get(fn_def, "argtypes")));
    return v_1;
  }
  ;
}, "first_arg_kw");
var should_use_context_dispatch_QMARK_ = /* @__PURE__ */ __name(function(fn_key, fn_def, opts) {
  const is_context_fn_1 = is_c_context_fn_QMARK_(fn_key, fn_def);
  const first_arg_val_2 = resolve_context_val(opts, first_arg_kw(fn_def));
  const and__23694__auto___3 = is_context_fn_1;
  if (truth_(and__23694__auto___3)) {
    return is_context_QMARK_(first_arg_val_2);
  } else {
    return and__23694__auto___3;
  }
  ;
}, "should_use_context_dispatch_QMARK_");
var get_context_atom = /* @__PURE__ */ __name(function(opts, fn_def) {
  return resolve_context_val(opts, first_arg_kw(fn_def));
}, "get_context_atom");
var get_remaining_args = /* @__PURE__ */ __name(function(opts, fn_def) {
  const first_arg_name_1 = first_arg_kw(fn_def);
  return extract_args(fn_def, dissoc(dissoc(opts, first_arg_name_1), first_arg_name_1 === "ctx" ? "context" : "ctx"), { "skip-first?": true });
}, "get_remaining_args");
var needs_auto_context_QMARK_ = /* @__PURE__ */ __name(function(fn_key, fn_def, opts) {
  const and__23694__auto___1 = is_c_context_fn_QMARK_(fn_key, fn_def);
  if (truth_(and__23694__auto___1)) {
    return resolve_context_val(opts, first_arg_kw(fn_def)) == null;
  } else {
    return and__23694__auto___1;
  }
  ;
}, "needs_auto_context_QMARK_");
var context_from_pj_args = /* @__PURE__ */ __name(function(fn_def, opts) {
  return some(function(p__5814) {
    const vec___1_4 = p__5814;
    const arg_spec_5 = nth(vec___1_4, 0, null);
    const __6 = nth(vec___1_4, 1, null);
    const v_7 = get(opts, arg_spec_5);
    if (truth_((() => {
      const and__23694__auto___8 = object_QMARK_(v_7);
      if (truth_(and__23694__auto___8)) {
        return !(v_7._proj_context == null);
      } else {
        return and__23694__auto___8;
      }
      ;
    })())) {
      return v_7._proj_context;
    }
    ;
  }, rest(get(fn_def, "argtypes")));
}, "context_from_pj_args");
var attach_context_to_result = /* @__PURE__ */ __name(function(result, ctx) {
  if (truth_(result)) {
    if (truth_(object_QMARK_(result))) {
      result["_proj_context"] = ctx;
    }
    ;
    return result;
  }
  ;
}, "attach_context_to_result");
var reconcile_cross_worker_args_BANG_ = /* @__PURE__ */ __name(async function(fn_def, opts) {
  const worker_count_1 = get_worker_count();
  if (truth_(await (async () => {
    const or__23663__auto___2 = worker_count_1 == null;
    if (or__23663__auto___2) {
      return or__23663__auto___2;
    } else {
      return worker_count_1 <= 1;
    }
    ;
  })())) {
    return opts;
  } else {
    const pj_args_3 = into([], keep(function(p__6125) {
      const vec___4_7 = p__6125;
      const arg_spec_8 = nth(vec___4_7, 0, null);
      const __9 = nth(vec___4_7, 1, null);
      const arg_name_10 = `${arg_spec_8 ?? ""}`;
      const v_11 = truth_(object_QMARK_(opts)) ? opts[arg_name_10] : get(opts, arg_spec_8);
      if (truth_((() => {
        const and__23694__auto___12 = object_QMARK_(v_11);
        if (truth_(and__23694__auto___12)) {
          const or__23663__auto___13 = v_11.type === "pj";
          if (or__23663__auto___13) {
            return or__23663__auto___13;
          } else {
            return v_11.type === "proj-context";
          }
          ;
        } else {
          return and__23694__auto___12;
        }
        ;
      })())) {
        return { "arg-name": arg_name_10, "value": v_11, "worker-idx": v_11.worker_idx, "type": v_11.type };
      }
      ;
    }), get(fn_def, "argtypes"));
    const worker_indices_14 = into(/* @__PURE__ */ new Set([]), map("worker-idx"), pj_args_3);
    if (count(worker_indices_14) <= 1) {
      return opts;
    } else {
      const target_worker_15 = get(first(filter(function(_PERCENT_1) {
        return get(_PERCENT_1, "type") === "pj";
      }, pj_args_3)), "value").worker_idx;
      const desc_16 = `${"proj-wasm: PJ args are on different workers ("}${join(", ", map(function(_PERCENT_1) {
        return `${get(_PERCENT_1, "arg-name") ?? ""}${" on worker "}${get(_PERCENT_1, "worker-idx") ?? ""}`;
      }, pj_args_3)) ?? ""}${"). Recreating on worker "}${target_worker_15 ?? ""}${". For better performance, use an explicit context."}`;
      console.warn(desc_16);
      const target_ctx_17 = await (async () => {
        const or__23663__auto___18 = some(function(p__6496) {
          const map___19_21 = p__6496;
          const map___19_22 = truth_(sequential_QMARK_(map___19_21)) ? truth_(vector_QMARK_(map___19_21)) ? map___19_21 : seq_to_map_for_destructuring(map___19_21) : map___19_21;
          const value_23 = get(map___19_22, "value");
          const worker_idx_24 = get(map___19_22, "worker-idx");
          const type_25 = get(map___19_22, "type");
          if (truth_(_EQ_(worker_idx_24, target_worker_15) && type_25 === "pj")) {
            return value_23._proj_context;
          }
          ;
        }, pj_args_3);
        if (truth_(or__23663__auto___18)) {
          return or__23663__auto___18;
        } else {
          return await context_create({ "worker": target_worker_15 });
        }
        ;
      })();
      for (let G__26 of iterable(pj_args_3)) {
        const map___27_29 = G__26;
        const map___27_30 = truth_(sequential_QMARK_(map___27_29)) ? truth_(vector_QMARK_(map___27_29)) ? map___27_29 : seq_to_map_for_destructuring(map___27_29) : map___27_29;
        const arg_name_31 = get(map___27_30, "arg-name");
        const value_32 = get(map___27_30, "value");
        const worker_idx_33 = get(map___27_30, "worker-idx");
        const type_34 = get(map___27_30, "type");
        if (truth_(!_EQ_(worker_idx_33, target_worker_15) && type_34 === "pj")) {
          const src_ctx_35 = await (async () => {
            const or__23663__auto___36 = value_32._proj_context;
            if (truth_(or__23663__auto___36)) {
              return or__23663__auto___36;
            } else {
              return await context_create({ "worker": worker_idx_33 });
            }
            ;
          })();
          const projjson_37 = await call_native("proj_as_projjson", [src_ctx_35, value_32, 0]);
          if (truth_(await (async () => {
            const or__23663__auto___38 = projjson_37 == null;
            if (or__23663__auto___38) {
              return or__23663__auto___38;
            } else {
              return _EQ_(projjson_37, "");
            }
            ;
          })())) {
            throw new Error(`${"Cannot reconcile "}${arg_name_31 ?? ""}${" across workers: PROJJSON export failed. Use an explicit context."}`);
          }
          ;
          const identity_op_39 = await call_native("proj_create_crs_to_crs", null, [target_ctx_17, projjson_37, projjson_37, 0], target_worker_15);
          const new_pj_40 = await call_native("proj_get_source_crs", null, [target_ctx_17, identity_op_39], target_worker_15);
          new_pj_40["_proj_context"] = target_ctx_17;
          opts[arg_name_31] = new_pj_40;
        }
        ;
        if (truth_(!_EQ_(worker_idx_33, target_worker_15) && type_34 === "proj-context")) {
          opts[arg_name_31] = target_ctx_17;
        }
      }
      ;
      return opts;
    }
    ;
  }
  ;
}, "reconcile_cross_worker_args_BANG_");
var out_param_arg_QMARK_ = /* @__PURE__ */ __name(function(p__7092) {
  const vec___1_4 = p__7092;
  const arg_name_5 = nth(vec___1_4, 0, null);
  const _arg_type_6 = nth(vec___1_4, 1, null);
  const s_7 = `${arg_name_5 ?? ""}`;
  return count(s_7) >= 4 && "out_" === subs(s_7, 0, 4);
}, "out_param_arg_QMARK_");
var snake__GT_camel = /* @__PURE__ */ __name(function(s) {
  const parts_1 = s.split("_");
  return apply(str, first(parts_1), map(function(p3) {
    return `${p3.substring(0, 1).toUpperCase() ?? ""}${p3.substring(1) ?? ""}`;
  }, rest(parts_1)));
}, "snake__GT_camel");
var convert_js_result_keys = /* @__PURE__ */ __name(function(result, key_casing) {
  if (!(key_casing === "camel")) {
    return result;
  } else {
    if (truth_(array_QMARK_(result))) {
      return result.map(function(obj) {
        const out_1 = {};
        Object.keys(obj).forEach(function(k) {
          return out_1[snake__GT_camel(k)] = obj[k];
        });
        return out_1;
      });
    } else {
      if (truth_(result)) {
        const out_2 = {};
        Object.keys(result).forEach(function(k) {
          return out_2[snake__GT_camel(k)] = result[k];
        });
        return out_2;
      }
    }
  }
  ;
}, "convert_js_result_keys");
var dispatch_struct_list = /* @__PURE__ */ __name(async function(fn_key, fn_def, opts, key_casing) {
  const args_1 = extract_args(fn_def, opts);
  return convert_js_result_keys(await call_native(fn_key, fn_def, args_1), key_casing);
}, "dispatch_struct_list");
var dispatch_out_params = /* @__PURE__ */ __name(async function(fn_key, fn_def, opts, key_casing) {
  const input_fn_def_1 = assoc(fn_def, "argtypes", vec(remove(out_param_arg_QMARK_, get(fn_def, "argtypes"))));
  const args_2 = extract_args(input_fn_def_1, opts);
  return convert_js_result_keys(await call_native(fn_key, fn_def, args_2), key_casing);
}, "dispatch_out_params");
var dispatch_default = /* @__PURE__ */ __name(async function(fn_key, fn_def, opts, ctx_for_result) {
  const result_1 = truth_(should_use_context_dispatch_QMARK_(fn_key, fn_def, opts)) ? await (async () => {
    const context_atom_2 = get_context_atom(opts, fn_def);
    const remaining_args_3 = get_remaining_args(opts, fn_def);
    return await dispatch_context_fn(fn_key, fn_def, context_atom_2, remaining_args_3);
  })() : await (async () => {
    const args_4 = extract_args(fn_def, opts);
    return await call_native(fn_key, fn_def, args_4);
  })();
  const result_5 = process_return_value_with_tracking(result_1, fn_def);
  if (truth_(ctx_for_result)) {
    return attach_context_to_result(result_5, ctx_for_result);
  } else {
    return result_5;
  }
  ;
}, "dispatch_default");
var errno_failure_signal_QMARK_ = /* @__PURE__ */ __name(function(result, fn_def) {
  const rettype_1 = get(fn_def, "rettype");
  if (rettype_1 === "pointer") {
    return result == null;
  } else {
    if (rettype_1 === "string") {
      const or__23663__auto___2 = result == null;
      if (or__23663__auto___2) {
        return or__23663__auto___2;
      } else {
        return _EQ_("", result);
      }
      ;
    } else {
      if ("else") {
        return false;
      } else {
        return null;
      }
    }
  }
  ;
}, "errno_failure_signal_QMARK_");
var resolve_ctx_from_opts = /* @__PURE__ */ __name(function(fn_def, opts) {
  const fa_1 = first_arg_kw(fn_def);
  if (truth_(get(/* @__PURE__ */ new Set(["ctx", "context"]), fa_1))) {
    return resolve_context_val(opts, fa_1);
  }
  ;
}, "resolve_ctx_from_opts");
var dispatch_proj_fn = /* @__PURE__ */ (() => {
  const impl7788_1 = /* @__PURE__ */ __name(async function(fn_key, fn_def, opts, p__7814) {
    const vec___2_5 = p__7814;
    const key_casing_6 = nth(vec___2_5, 0, null);
    ensure_initialized_BANG_();
    const opts_7 = truth_(needs_auto_context_QMARK_(fn_key, fn_def, opts)) ? await (async () => {
      const ctx_8 = await (async () => {
        const or__23663__auto___9 = context_from_pj_args(fn_def, opts);
        if (truth_(or__23663__auto___9)) {
          return or__23663__auto___9;
        } else {
          return await context_create({});
        }
        ;
      })();
      if (truth_(object_QMARK_(opts))) {
        opts["context"] = ctx_8;
        return opts;
      } else {
        return assoc(opts, "context", ctx_8);
      }
      ;
    })() : opts;
    const opts_10 = await reconcile_cross_worker_args_BANG_(fn_def, opts_7);
    const proj_returns_11 = get(fn_def, "proj-returns");
    const result_12 = await (async () => {
      const G__7950_13 = proj_returns_11;
      switch (G__7950_13) {
        case "struct-list":
          return await dispatch_struct_list(fn_key, fn_def, opts_10, key_casing_6);
          break;
        case "out-params":
          return await dispatch_out_params(fn_key, fn_def, opts_10, key_casing_6);
          break;
        default:
          const ctx_for_result_15 = "pj" === proj_returns_11 ? resolve_ctx_from_opts(fn_def, opts_10) : null;
          return await dispatch_default(fn_key, fn_def, opts_10, ctx_for_result_15);
      }
      ;
    })();
    return await check_result(lib, fn_key, fn_def, opts_10, result_12);
  }, "impl7788_1");
  const f7783 = /* @__PURE__ */ __name(function(arg7784, arg7785, arg7786, ...rest7787) {
    const self__23423__auto___16 = this;
    return impl7788_1.call(self__23423__auto___16, arg7784, arg7785, arg7786, rest7787.length === 0 ? null : rest7787);
  }, "f7783");
  f7783["squint$lang$variadic"] = impl7788_1;
  return f7783;
})();
var proj_errno_result_check = /* @__PURE__ */ __name(async function(_library, fn_key, fn_def, opts, result) {
  if (truth_(not(get(/* @__PURE__ */ new Set(["proj_context_errno", "proj_context_errno_string"]), fn_key)) && errno_failure_signal_QMARK_(result, fn_def))) {
    const temp__23298__auto___1 = resolve_ctx_from_opts(fn_def, opts);
    if (truth_(temp__23298__auto___1)) {
      const ctx_for_errno_2 = temp__23298__auto___1;
      const errno_def_3 = get(fndefs, "proj_context_errno");
      const errno_opts_4 = await (async () => {
        const o_5 = {};
        o_5["context"] = ctx_for_errno_2;
        return o_5;
      })();
      const errno_result_6 = await dispatch_proj_fn("proj_context_errno", errno_def_3, errno_opts_4);
      if (truth_(await (async () => {
        const and__23694__auto___7 = number_QMARK_(errno_result_6);
        if (truth_(and__23694__auto___7)) {
          return !(errno_result_6 === 0);
        } else {
          return and__23694__auto___7;
        }
        ;
      })())) {
        const fn_name_8 = `${fn_key ?? ""}`;
        const msg_9 = `${"PROJ error "}${errno_result_6 ?? ""}${" in "}${fn_name_8}${": "}${error_code__GT_string(errno_result_6) ?? ""}`;
        throw new Error(msg_9);
      }
    }
  }
  ;
  return result;
}, "proj_errno_result_check");
var lib = library({ "key": "net.willcohen.proj", "fndefs": fndefs, "impl-atom": implementation, "ffi-impl-ns": "net.willcohen.proj.impl.native", "hooks": { "extras-builder": proj_extras_builder, "result-wrapper": proj_result_wrapper, "context-isolator": proj_context_isolator, "result-check": proj_errno_result_check } });
var proj_crs_create_bound_crs = /* @__PURE__ */ (() => {
  const impl8369_1 = /* @__PURE__ */ __name(function() {
    return proj_crs_create_bound_crs({});
  }, "impl8369_1");
  const impl8370_2 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_crs_create_bound_crs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["base_crs", "pointer"], ["hub_crs", "pointer"], ["transformation", "pointer"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl8370_2");
  const f8366 = /* @__PURE__ */ __name(function(...args8367) {
    const self8371_3 = this;
    const G__8437_4 = args8367.length;
    switch (G__8437_4) {
      case 0:
        return impl8369_1.call(self8371_3);
        break;
      case 1:
        return impl8370_2.call(self8371_3, args8367[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args8367.length ?? ""}`);
    }
    ;
  }, "f8366");
  return f8366;
})();
var proj_context_create = /* @__PURE__ */ (() => {
  const impl8521_6 = /* @__PURE__ */ __name(function() {
    return proj_context_create({});
  }, "impl8521_6");
  const impl8522_7 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_context_create", { "rettype": "pointer", "argtypes": [], "proj-returns": "pj-context", "is-context-fn": false }, opts__224__auto__);
  }, "impl8522_7");
  const f8518 = /* @__PURE__ */ __name(function(...args8519) {
    const self8523_8 = this;
    const G__8589_9 = args8519.length;
    switch (G__8589_9) {
      case 0:
        return impl8521_6.call(self8523_8);
        break;
      case 1:
        return impl8522_7.call(self8523_8, args8519[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args8519.length ?? ""}`);
    }
    ;
  }, "f8518");
  return f8518;
})();
var proj_get_crs_list_parameters_create = /* @__PURE__ */ (() => {
  const impl8673_11 = /* @__PURE__ */ __name(function() {
    return proj_get_crs_list_parameters_create({});
  }, "impl8673_11");
  const impl8674_12 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_get_crs_list_parameters_create", { "rettype": "pointer", "argtypes": [], "proj-returns": "pj-crs-list-parameters" }, opts__224__auto__);
  }, "impl8674_12");
  const f8670 = /* @__PURE__ */ __name(function(...args8671) {
    const self8675_13 = this;
    const G__8741_14 = args8671.length;
    switch (G__8741_14) {
      case 0:
        return impl8673_11.call(self8675_13);
        break;
      case 1:
        return impl8674_12.call(self8675_13, args8671[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args8671.length ?? ""}`);
    }
    ;
  }, "f8670");
  return f8670;
})();
var proj_is_deprecated = /* @__PURE__ */ (() => {
  const impl8825_16 = /* @__PURE__ */ __name(function() {
    return proj_is_deprecated({});
  }, "impl8825_16");
  const impl8826_17 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_is_deprecated", { "rettype": "int32", "argtypes": [["obj", "pointer"]] }, opts__224__auto__);
  }, "impl8826_17");
  const f8822 = /* @__PURE__ */ __name(function(...args8823) {
    const self8827_18 = this;
    const G__8893_19 = args8823.length;
    switch (G__8893_19) {
      case 0:
        return impl8825_16.call(self8827_18);
        break;
      case 1:
        return impl8826_17.call(self8827_18, args8823[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args8823.length ?? ""}`);
    }
    ;
  }, "f8822");
  return f8822;
})();
var proj_create_from_name = /* @__PURE__ */ (() => {
  const impl8977_21 = /* @__PURE__ */ __name(function() {
    return proj_create_from_name({});
  }, "impl8977_21");
  const impl8978_22 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_create_from_name", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["auth_name", "string"], ["searchedName", "string"], ["types", "pointer"], ["typesCount", "size-t"], ["approximateMatch", "int32"], ["limitResultCount", "size-t"], ["options", "pointer"]], "proj-returns": "pj-list" }, opts__224__auto__);
  }, "impl8978_22");
  const f8974 = /* @__PURE__ */ __name(function(...args8975) {
    const self8979_23 = this;
    const G__9045_24 = args8975.length;
    switch (G__9045_24) {
      case 0:
        return impl8977_21.call(self8979_23);
        break;
      case 1:
        return impl8978_22.call(self8979_23, args8975[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args8975.length ?? ""}`);
    }
    ;
  }, "f8974");
  return f8974;
})();
var proj_prime_meridian_get_parameters = /* @__PURE__ */ (() => {
  const impl9129_26 = /* @__PURE__ */ __name(function() {
    return proj_prime_meridian_get_parameters({});
  }, "impl9129_26");
  const impl9130_27 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_prime_meridian_get_parameters", { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["longitude", "double"], ["unit-conv-factor", "double"], ["unit-name", "string"]], "argtypes": [["ctx", "pointer"], ["prime_meridian", "pointer"], ["out_longitude", "pointer"], ["out_unit_conv_factor", "pointer"], ["out_unit_name", "pointer"]] }, opts__224__auto__);
  }, "impl9130_27");
  const f9126 = /* @__PURE__ */ __name(function(...args9127) {
    const self9131_28 = this;
    const G__9197_29 = args9127.length;
    switch (G__9197_29) {
      case 0:
        return impl9129_26.call(self9131_28);
        break;
      case 1:
        return impl9130_27.call(self9131_28, args9127[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args9127.length ?? ""}`);
    }
    ;
  }, "f9126");
  return f9126;
})();
var proj_string_destroy = /* @__PURE__ */ (() => {
  const impl9281_31 = /* @__PURE__ */ __name(function() {
    return proj_string_destroy({});
  }, "impl9281_31");
  const impl9282_32 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_string_destroy", { "rettype": "void", "argtypes": [["str", "string"]] }, opts__224__auto__);
  }, "impl9282_32");
  const f9278 = /* @__PURE__ */ __name(function(...args9279) {
    const self9283_33 = this;
    const G__9349_34 = args9279.length;
    switch (G__9349_34) {
      case 0:
        return impl9281_31.call(self9283_33);
        break;
      case 1:
        return impl9282_32.call(self9283_33, args9279[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args9279.length ?? ""}`);
    }
    ;
  }, "f9278");
  return f9278;
})();
var proj_log_func = /* @__PURE__ */ (() => {
  const impl9433_36 = /* @__PURE__ */ __name(function() {
    return proj_log_func({});
  }, "impl9433_36");
  const impl9434_37 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_log_func", { "rettype": "void", "argtypes": [["context", "pointer"], ["app_data", "pointer?"], ["logf", "pointer"]] }, opts__224__auto__);
  }, "impl9434_37");
  const f9430 = /* @__PURE__ */ __name(function(...args9431) {
    const self9435_38 = this;
    const G__9501_39 = args9431.length;
    switch (G__9501_39) {
      case 0:
        return impl9433_36.call(self9435_38);
        break;
      case 1:
        return impl9434_37.call(self9435_38, args9431[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args9431.length ?? ""}`);
    }
    ;
  }, "f9430");
  return f9430;
})();
var proj_create_geocentric_crs = /* @__PURE__ */ (() => {
  const impl9585_41 = /* @__PURE__ */ __name(function() {
    return proj_create_geocentric_crs({});
  }, "impl9585_41");
  const impl9586_42 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_create_geocentric_crs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_name", "string"], ["datum_name", "string"], ["ellps_name", "string"], ["semi_major_metre", "float64"], ["inv_flattening", "float64"], ["prime_meridian_name", "string"], ["prime_meridian_offset", "float64"], ["angular_units", "string"], ["angular_units_conv", "float64"], ["linear_units", "string"], ["linear_units_conv", "float64"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl9586_42");
  const f9582 = /* @__PURE__ */ __name(function(...args9583) {
    const self9587_43 = this;
    const G__9653_44 = args9583.length;
    switch (G__9653_44) {
      case 0:
        return impl9585_41.call(self9587_43);
        break;
      case 1:
        return impl9586_42.call(self9587_43, args9583[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args9583.length ?? ""}`);
    }
    ;
  }, "f9582");
  return f9582;
})();
var proj_unit_list_destroy = /* @__PURE__ */ (() => {
  const impl9737_46 = /* @__PURE__ */ __name(function() {
    return proj_unit_list_destroy({});
  }, "impl9737_46");
  const impl9738_47 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_unit_list_destroy", { "rettype": "void", "argtypes": [["list", "pointer"]] }, opts__224__auto__);
  }, "impl9738_47");
  const f9734 = /* @__PURE__ */ __name(function(...args9735) {
    const self9739_48 = this;
    const G__9805_49 = args9735.length;
    switch (G__9805_49) {
      case 0:
        return impl9737_46.call(self9739_48);
        break;
      case 1:
        return impl9738_47.call(self9739_48, args9735[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args9735.length ?? ""}`);
    }
    ;
  }, "f9734");
  return f9734;
})();
var proj_crs_create_projected_3D_crs_from_2D = /* @__PURE__ */ (() => {
  const impl9889_51 = /* @__PURE__ */ __name(function() {
    return proj_crs_create_projected_3D_crs_from_2D({});
  }, "impl9889_51");
  const impl9890_52 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_crs_create_projected_3D_crs_from_2D", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_name", "string"], ["projected_2D_crs", "pointer"], ["geog_3D_crs", "pointer"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl9890_52");
  const f9886 = /* @__PURE__ */ __name(function(...args9887) {
    const self9891_53 = this;
    const G__9957_54 = args9887.length;
    switch (G__9957_54) {
      case 0:
        return impl9889_51.call(self9891_53);
        break;
      case 1:
        return impl9890_52.call(self9891_53, args9887[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args9887.length ?? ""}`);
    }
    ;
  }, "f9886");
  return f9886;
})();
var proj_get_suggested_operation = /* @__PURE__ */ (() => {
  const impl10041_56 = /* @__PURE__ */ __name(function() {
    return proj_get_suggested_operation({});
  }, "impl10041_56");
  const impl10042_57 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_get_suggested_operation", { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["operations", "pointer"], ["direction", "int32"], ["coord", "pointer"]] }, opts__224__auto__);
  }, "impl10042_57");
  const f10038 = /* @__PURE__ */ __name(function(...args10039) {
    const self10043_58 = this;
    const G__10109_59 = args10039.length;
    switch (G__10109_59) {
      case 0:
        return impl10041_56.call(self10043_58);
        break;
      case 1:
        return impl10042_57.call(self10043_58, args10039[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args10039.length ?? ""}`);
    }
    ;
  }, "f10038");
  return f10038;
})();
var proj_operation_factory_context_set_area_of_interest_name = /* @__PURE__ */ (() => {
  const impl10193_61 = /* @__PURE__ */ __name(function() {
    return proj_operation_factory_context_set_area_of_interest_name({});
  }, "impl10193_61");
  const impl10194_62 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_operation_factory_context_set_area_of_interest_name", { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["area_name", "string"]] }, opts__224__auto__);
  }, "impl10194_62");
  const f10190 = /* @__PURE__ */ __name(function(...args10191) {
    const self10195_63 = this;
    const G__10261_64 = args10191.length;
    switch (G__10261_64) {
      case 0:
        return impl10193_61.call(self10195_63);
        break;
      case 1:
        return impl10194_62.call(self10195_63, args10191[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args10191.length ?? ""}`);
    }
    ;
  }, "f10190");
  return f10190;
})();
var proj_get_ellipsoid = /* @__PURE__ */ (() => {
  const impl10345_66 = /* @__PURE__ */ __name(function() {
    return proj_get_ellipsoid({});
  }, "impl10345_66");
  const impl10346_67 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_get_ellipsoid", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["obj", "pointer"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl10346_67");
  const f10342 = /* @__PURE__ */ __name(function(...args10343) {
    const self10347_68 = this;
    const G__10413_69 = args10343.length;
    switch (G__10413_69) {
      case 0:
        return impl10345_66.call(self10347_68);
        break;
      case 1:
        return impl10346_67.call(self10347_68, args10343[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args10343.length ?? ""}`);
    }
    ;
  }, "f10342");
  return f10342;
})();
var proj_coordoperation_get_grid_used = /* @__PURE__ */ (() => {
  const impl10497_71 = /* @__PURE__ */ __name(function() {
    return proj_coordoperation_get_grid_used({});
  }, "impl10497_71");
  const impl10498_72 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_coordoperation_get_grid_used", { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["short-name", "string"], ["full-name", "string"], ["package-name", "string"], ["url", "string"], ["direct-download", "int"], ["open-license", "int"], ["available", "int"]], "argtypes": [["ctx", "pointer"], ["coordoperation", "pointer"], ["index", "int32"], ["out_short_name", "pointer"], ["out_full_name", "pointer"], ["out_package_name", "pointer"], ["out_url", "pointer"], ["out_direct_download", "pointer"], ["out_open_license", "pointer"], ["out_available", "pointer"]] }, opts__224__auto__);
  }, "impl10498_72");
  const f10494 = /* @__PURE__ */ __name(function(...args10495) {
    const self10499_73 = this;
    const G__10565_74 = args10495.length;
    switch (G__10565_74) {
      case 0:
        return impl10497_71.call(self10499_73);
        break;
      case 1:
        return impl10498_72.call(self10499_73, args10495[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args10495.length ?? ""}`);
    }
    ;
  }, "f10494");
  return f10494;
})();
var proj_crs_is_derived = /* @__PURE__ */ (() => {
  const impl10649_76 = /* @__PURE__ */ __name(function() {
    return proj_crs_is_derived({});
  }, "impl10649_76");
  const impl10650_77 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_crs_is_derived", { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]] }, opts__224__auto__);
  }, "impl10650_77");
  const f10646 = /* @__PURE__ */ __name(function(...args10647) {
    const self10651_78 = this;
    const G__10717_79 = args10647.length;
    switch (G__10717_79) {
      case 0:
        return impl10649_76.call(self10651_78);
        break;
      case 1:
        return impl10650_77.call(self10651_78, args10647[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args10647.length ?? ""}`);
    }
    ;
  }, "f10646");
  return f10646;
})();
var proj_int_list_destroy = /* @__PURE__ */ (() => {
  const impl10801_81 = /* @__PURE__ */ __name(function() {
    return proj_int_list_destroy({});
  }, "impl10801_81");
  const impl10802_82 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_int_list_destroy", { "rettype": "void", "argtypes": [["list", "pointer"]] }, opts__224__auto__);
  }, "impl10802_82");
  const f10798 = /* @__PURE__ */ __name(function(...args10799) {
    const self10803_83 = this;
    const G__10869_84 = args10799.length;
    switch (G__10869_84) {
      case 0:
        return impl10801_81.call(self10803_83);
        break;
      case 1:
        return impl10802_82.call(self10803_83, args10799[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args10799.length ?? ""}`);
    }
    ;
  }, "f10798");
  return f10798;
})();
var proj_crs_get_coordinate_system = /* @__PURE__ */ (() => {
  const impl10953_86 = /* @__PURE__ */ __name(function() {
    return proj_crs_get_coordinate_system({});
  }, "impl10953_86");
  const impl10954_87 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_crs_get_coordinate_system", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl10954_87");
  const f10950 = /* @__PURE__ */ __name(function(...args10951) {
    const self10955_88 = this;
    const G__11021_89 = args10951.length;
    switch (G__11021_89) {
      case 0:
        return impl10953_86.call(self10955_88);
        break;
      case 1:
        return impl10954_87.call(self10955_88, args10951[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args10951.length ?? ""}`);
    }
    ;
  }, "f10950");
  return f10950;
})();
var proj_context_set_database_path = /* @__PURE__ */ (() => {
  const impl11105_91 = /* @__PURE__ */ __name(function() {
    return proj_context_set_database_path({});
  }, "impl11105_91");
  const impl11106_92 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_context_set_database_path", { "rettype": "int32", "argtypes": [["context", "pointer"], ["db-path", "string"], ["aux-db-paths", "pointer?"], ["options", "pointer?"]] }, opts__224__auto__);
  }, "impl11106_92");
  const f11102 = /* @__PURE__ */ __name(function(...args11103) {
    const self11107_93 = this;
    const G__11173_94 = args11103.length;
    switch (G__11173_94) {
      case 0:
        return impl11105_91.call(self11107_93);
        break;
      case 1:
        return impl11106_92.call(self11107_93, args11103[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args11103.length ?? ""}`);
    }
    ;
  }, "f11102");
  return f11102;
})();
var proj_get_crs_info_list_from_database = /* @__PURE__ */ (() => {
  const impl11257_96 = /* @__PURE__ */ __name(function() {
    return proj_get_crs_info_list_from_database({});
  }, "impl11257_96");
  const impl11258_97 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_get_crs_info_list_from_database", { "proj-returns": "struct-list", "struct-fields": [["auth-name", "string", 0], ["code", "string", 4], ["name", "string", 8], ["type", "int", 12], ["deprecated", "boolean", 16], ["bbox-valid", "boolean", 20], ["west-lon-degree", "double", 24], ["south-lat-degree", "double", 32], ["east-lon-degree", "double", 40], ["north-lat-degree", "double", 48], ["area-name", "string", 56], ["projection-method-name", "string", 60], ["celestial-body-name", "string", 64]], "struct-def": "proj-crs-info", "struct-params-create": "proj_get_crs_list_parameters_create", "struct-destroy-fn": "proj_crs_info_list_destroy", "argtypes": [["context", "pointer"], ["auth_name", "string"], ["params", "pointer"], ["out_result_count", "pointer"]], "count-arg-name": "out_result_count", "struct-params-destroy": "proj_get_crs_list_parameters_destroy", "rettype": "pointer" }, opts__224__auto__);
  }, "impl11258_97");
  const f11254 = /* @__PURE__ */ __name(function(...args11255) {
    const self11259_98 = this;
    const G__11325_99 = args11255.length;
    switch (G__11325_99) {
      case 0:
        return impl11257_96.call(self11259_98);
        break;
      case 1:
        return impl11258_97.call(self11259_98, args11255[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args11255.length ?? ""}`);
    }
    ;
  }, "f11254");
  return f11254;
})();
var proj_is_equivalent_to = /* @__PURE__ */ (() => {
  const impl11409_101 = /* @__PURE__ */ __name(function() {
    return proj_is_equivalent_to({});
  }, "impl11409_101");
  const impl11410_102 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_is_equivalent_to", { "rettype": "int32", "argtypes": [["obj", "pointer"], ["other", "pointer"], ["criterion", "int32"]] }, opts__224__auto__);
  }, "impl11410_102");
  const f11406 = /* @__PURE__ */ __name(function(...args11407) {
    const self11411_103 = this;
    const G__11477_104 = args11407.length;
    switch (G__11477_104) {
      case 0:
        return impl11409_101.call(self11411_103);
        break;
      case 1:
        return impl11410_102.call(self11411_103, args11407[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args11407.length ?? ""}`);
    }
    ;
  }, "f11406");
  return f11406;
})();
var proj_context_set_enable_network = /* @__PURE__ */ (() => {
  const impl11561_106 = /* @__PURE__ */ __name(function() {
    return proj_context_set_enable_network({});
  }, "impl11561_106");
  const impl11562_107 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_context_set_enable_network", { "rettype": "int32", "argtypes": [["context", "pointer"], ["enabled", "int32"]] }, opts__224__auto__);
  }, "impl11562_107");
  const f11558 = /* @__PURE__ */ __name(function(...args11559) {
    const self11563_108 = this;
    const G__11629_109 = args11559.length;
    switch (G__11629_109) {
      case 0:
        return impl11561_106.call(self11563_108);
        break;
      case 1:
        return impl11562_107.call(self11563_108, args11559[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args11559.length ?? ""}`);
    }
    ;
  }, "f11558");
  return f11558;
})();
var proj_crs_create_bound_vertical_crs = /* @__PURE__ */ (() => {
  const impl11713_111 = /* @__PURE__ */ __name(function() {
    return proj_crs_create_bound_vertical_crs({});
  }, "impl11713_111");
  const impl11714_112 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_crs_create_bound_vertical_crs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["vert_crs", "pointer"], ["hub_geographic_3D_crs", "pointer"], ["grid_name", "string"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl11714_112");
  const f11710 = /* @__PURE__ */ __name(function(...args11711) {
    const self11715_113 = this;
    const G__11781_114 = args11711.length;
    switch (G__11781_114) {
      case 0:
        return impl11713_111.call(self11715_113);
        break;
      case 1:
        return impl11714_112.call(self11715_113, args11711[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args11711.length ?? ""}`);
    }
    ;
  }, "f11710");
  return f11710;
})();
var proj_operation_factory_context_set_crs_extent_use = /* @__PURE__ */ (() => {
  const impl11865_116 = /* @__PURE__ */ __name(function() {
    return proj_operation_factory_context_set_crs_extent_use({});
  }, "impl11865_116");
  const impl11866_117 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_operation_factory_context_set_crs_extent_use", { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["use", "int32"]] }, opts__224__auto__);
  }, "impl11866_117");
  const f11862 = /* @__PURE__ */ __name(function(...args11863) {
    const self11867_118 = this;
    const G__11933_119 = args11863.length;
    switch (G__11933_119) {
      case 0:
        return impl11865_116.call(self11867_118);
        break;
      case 1:
        return impl11866_117.call(self11867_118, args11863[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args11863.length ?? ""}`);
    }
    ;
  }, "f11862");
  return f11862;
})();
var proj_create_geographic_crs = /* @__PURE__ */ (() => {
  const impl12017_121 = /* @__PURE__ */ __name(function() {
    return proj_create_geographic_crs({});
  }, "impl12017_121");
  const impl12018_122 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_create_geographic_crs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_name", "string"], ["datum_name", "string"], ["ellps_name", "string"], ["semi_major_metre", "float64"], ["inv_flattening", "float64"], ["prime_meridian_name", "string"], ["prime_meridian_offset", "float64"], ["pm_angular_units", "string"], ["pm_units_conv", "float64"], ["ellipsoidal_cs", "pointer"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl12018_122");
  const f12014 = /* @__PURE__ */ __name(function(...args12015) {
    const self12019_123 = this;
    const G__12085_124 = args12015.length;
    switch (G__12085_124) {
      case 0:
        return impl12017_121.call(self12019_123);
        break;
      case 1:
        return impl12018_122.call(self12019_123, args12015[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args12015.length ?? ""}`);
    }
    ;
  }, "f12014");
  return f12014;
})();
var proj_coordoperation_get_grid_used_count = /* @__PURE__ */ (() => {
  const impl12169_126 = /* @__PURE__ */ __name(function() {
    return proj_coordoperation_get_grid_used_count({});
  }, "impl12169_126");
  const impl12170_127 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_coordoperation_get_grid_used_count", { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["coordoperation", "pointer"]] }, opts__224__auto__);
  }, "impl12170_127");
  const f12166 = /* @__PURE__ */ __name(function(...args12167) {
    const self12171_128 = this;
    const G__12237_129 = args12167.length;
    switch (G__12237_129) {
      case 0:
        return impl12169_126.call(self12171_128);
        break;
      case 1:
        return impl12170_127.call(self12171_128, args12167[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args12167.length ?? ""}`);
    }
    ;
  }, "f12166");
  return f12166;
})();
var proj_list_get_count = /* @__PURE__ */ (() => {
  const impl12321_131 = /* @__PURE__ */ __name(function() {
    return proj_list_get_count({});
  }, "impl12321_131");
  const impl12322_132 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_list_get_count", { "rettype": "int32", "argtypes": [["result", "pointer"]] }, opts__224__auto__);
  }, "impl12322_132");
  const f12318 = /* @__PURE__ */ __name(function(...args12319) {
    const self12323_133 = this;
    const G__12389_134 = args12319.length;
    switch (G__12389_134) {
      case 0:
        return impl12321_131.call(self12323_133);
        break;
      case 1:
        return impl12322_132.call(self12323_133, args12319[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args12319.length ?? ""}`);
    }
    ;
  }, "f12318");
  return f12318;
})();
var proj_create_transformation = /* @__PURE__ */ (() => {
  const impl12473_136 = /* @__PURE__ */ __name(function() {
    return proj_create_transformation({});
  }, "impl12473_136");
  const impl12474_137 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_create_transformation", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["name", "string"], ["auth_name", "string"], ["code", "string"], ["source_crs", "pointer"], ["target_crs", "pointer"], ["interpolation_crs", "pointer"], ["method_name", "string"], ["method_auth_name", "string"], ["method_code", "string"], ["param_count", "int32"], ["params", "pointer"], ["accuracy", "float64"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl12474_137");
  const f12470 = /* @__PURE__ */ __name(function(...args12471) {
    const self12475_138 = this;
    const G__12541_139 = args12471.length;
    switch (G__12541_139) {
      case 0:
        return impl12473_136.call(self12475_138);
        break;
      case 1:
        return impl12474_137.call(self12475_138, args12471[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args12471.length ?? ""}`);
    }
    ;
  }, "f12470");
  return f12470;
})();
var proj_coordoperation_get_accuracy = /* @__PURE__ */ (() => {
  const impl12625_141 = /* @__PURE__ */ __name(function() {
    return proj_coordoperation_get_accuracy({});
  }, "impl12625_141");
  const impl12626_142 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_coordoperation_get_accuracy", { "rettype": "float64", "argtypes": [["ctx", "pointer"], ["obj", "pointer"]] }, opts__224__auto__);
  }, "impl12626_142");
  const f12622 = /* @__PURE__ */ __name(function(...args12623) {
    const self12627_143 = this;
    const G__12693_144 = args12623.length;
    switch (G__12693_144) {
      case 0:
        return impl12625_141.call(self12627_143);
        break;
      case 1:
        return impl12626_142.call(self12627_143, args12623[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args12623.length ?? ""}`);
    }
    ;
  }, "f12622");
  return f12622;
})();
var proj_coordoperation_get_param = /* @__PURE__ */ (() => {
  const impl12777_146 = /* @__PURE__ */ __name(function() {
    return proj_coordoperation_get_param({});
  }, "impl12777_146");
  const impl12778_147 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_coordoperation_get_param", { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["name", "string"], ["auth-name", "string"], ["code", "string"], ["value", "double"], ["value-string", "string"], ["unit-conv-factor", "double"], ["unit-name", "string"], ["unit-auth-name", "string"], ["unit-code", "string"], ["unit-category", "string"]], "argtypes": [["ctx", "pointer"], ["coordoperation", "pointer"], ["index", "int32"], ["out_name", "pointer"], ["out_auth_name", "pointer"], ["out_code", "pointer"], ["out_value", "pointer"], ["out_value_string", "pointer"], ["out_unit_conv_factor", "pointer"], ["out_unit_name", "pointer"], ["out_unit_auth_name", "pointer"], ["out_unit_code", "pointer"], ["out_unit_category", "pointer"]] }, opts__224__auto__);
  }, "impl12778_147");
  const f12774 = /* @__PURE__ */ __name(function(...args12775) {
    const self12779_148 = this;
    const G__12845_149 = args12775.length;
    switch (G__12845_149) {
      case 0:
        return impl12777_146.call(self12779_148);
        break;
      case 1:
        return impl12778_147.call(self12779_148, args12775[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args12775.length ?? ""}`);
    }
    ;
  }, "f12774");
  return f12774;
})();
var proj_create = /* @__PURE__ */ (() => {
  const impl12929_151 = /* @__PURE__ */ __name(function() {
    return proj_create({});
  }, "impl12929_151");
  const impl12930_152 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_create", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["definition", "string"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl12930_152");
  const f12926 = /* @__PURE__ */ __name(function(...args12927) {
    const self12931_153 = this;
    const G__12997_154 = args12927.length;
    switch (G__12997_154) {
      case 0:
        return impl12929_151.call(self12931_153);
        break;
      case 1:
        return impl12930_152.call(self12931_153, args12927[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args12927.length ?? ""}`);
    }
    ;
  }, "f12926");
  return f12926;
})();
var proj_create_conversion = /* @__PURE__ */ (() => {
  const impl13081_156 = /* @__PURE__ */ __name(function() {
    return proj_create_conversion({});
  }, "impl13081_156");
  const impl13082_157 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_create_conversion", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["name", "string"], ["auth_name", "string"], ["code", "string"], ["method_name", "string"], ["method_auth_name", "string"], ["method_code", "string"], ["param_count", "int32"], ["params", "pointer"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl13082_157");
  const f13078 = /* @__PURE__ */ __name(function(...args13079) {
    const self13083_158 = this;
    const G__13149_159 = args13079.length;
    switch (G__13149_159) {
      case 0:
        return impl13081_156.call(self13083_158);
        break;
      case 1:
        return impl13082_157.call(self13083_158, args13079[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args13079.length ?? ""}`);
    }
    ;
  }, "f13078");
  return f13078;
})();
var proj_get_type = /* @__PURE__ */ (() => {
  const impl13233_161 = /* @__PURE__ */ __name(function() {
    return proj_get_type({});
  }, "impl13233_161");
  const impl13234_162 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_get_type", { "rettype": "int32", "argtypes": [["obj", "pointer"]] }, opts__224__auto__);
  }, "impl13234_162");
  const f13230 = /* @__PURE__ */ __name(function(...args13231) {
    const self13235_163 = this;
    const G__13301_164 = args13231.length;
    switch (G__13301_164) {
      case 0:
        return impl13233_161.call(self13235_163);
        break;
      case 1:
        return impl13234_162.call(self13235_163, args13231[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args13231.length ?? ""}`);
    }
    ;
  }, "f13230");
  return f13230;
})();
var proj_context_get_database_metadata = /* @__PURE__ */ (() => {
  const impl13385_166 = /* @__PURE__ */ __name(function() {
    return proj_context_get_database_metadata({});
  }, "impl13385_166");
  const impl13386_167 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_context_get_database_metadata", { "rettype": "string", "argtypes": [["context", "pointer"], ["key", "string"]] }, opts__224__auto__);
  }, "impl13386_167");
  const f13382 = /* @__PURE__ */ __name(function(...args13383) {
    const self13387_168 = this;
    const G__13453_169 = args13383.length;
    switch (G__13453_169) {
      case 0:
        return impl13385_166.call(self13387_168);
        break;
      case 1:
        return impl13386_167.call(self13387_168, args13383[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args13383.length ?? ""}`);
    }
    ;
  }, "f13382");
  return f13382;
})();
var proj_crs_alter_geodetic_crs = /* @__PURE__ */ (() => {
  const impl13537_171 = /* @__PURE__ */ __name(function() {
    return proj_crs_alter_geodetic_crs({});
  }, "impl13537_171");
  const impl13538_172 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_crs_alter_geodetic_crs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["obj", "pointer"], ["new_geod_crs", "pointer"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl13538_172");
  const f13534 = /* @__PURE__ */ __name(function(...args13535) {
    const self13539_173 = this;
    const G__13605_174 = args13535.length;
    switch (G__13605_174) {
      case 0:
        return impl13537_171.call(self13539_173);
        break;
      case 1:
        return impl13538_172.call(self13539_173, args13535[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args13535.length ?? ""}`);
    }
    ;
  }, "f13534");
  return f13534;
})();
var proj_concatoperation_get_step_count = /* @__PURE__ */ (() => {
  const impl13689_176 = /* @__PURE__ */ __name(function() {
    return proj_concatoperation_get_step_count({});
  }, "impl13689_176");
  const impl13690_177 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_concatoperation_get_step_count", { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["concatoperation", "pointer"]] }, opts__224__auto__);
  }, "impl13690_177");
  const f13686 = /* @__PURE__ */ __name(function(...args13687) {
    const self13691_178 = this;
    const G__13757_179 = args13687.length;
    switch (G__13757_179) {
      case 0:
        return impl13689_176.call(self13691_178);
        break;
      case 1:
        return impl13690_177.call(self13691_178, args13687[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args13687.length ?? ""}`);
    }
    ;
  }, "f13686");
  return f13686;
})();
var proj_operation_factory_context_set_discard_superseded = /* @__PURE__ */ (() => {
  const impl13841_181 = /* @__PURE__ */ __name(function() {
    return proj_operation_factory_context_set_discard_superseded({});
  }, "impl13841_181");
  const impl13842_182 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_operation_factory_context_set_discard_superseded", { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["discard", "int32"]] }, opts__224__auto__);
  }, "impl13842_182");
  const f13838 = /* @__PURE__ */ __name(function(...args13839) {
    const self13843_183 = this;
    const G__13909_184 = args13839.length;
    switch (G__13909_184) {
      case 0:
        return impl13841_181.call(self13843_183);
        break;
      case 1:
        return impl13842_182.call(self13843_183, args13839[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args13839.length ?? ""}`);
    }
    ;
  }, "f13838");
  return f13838;
})();
var proj_is_derived_crs = /* @__PURE__ */ (() => {
  const impl13993_186 = /* @__PURE__ */ __name(function() {
    return proj_is_derived_crs({});
  }, "impl13993_186");
  const impl13994_187 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_is_derived_crs", { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]] }, opts__224__auto__);
  }, "impl13994_187");
  const f13990 = /* @__PURE__ */ __name(function(...args13991) {
    const self13995_188 = this;
    const G__14061_189 = args13991.length;
    switch (G__14061_189) {
      case 0:
        return impl13993_186.call(self13995_188);
        break;
      case 1:
        return impl13994_187.call(self13995_188, args13991[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args13991.length ?? ""}`);
    }
    ;
  }, "f13990");
  return f13990;
})();
var proj_get_units_from_database = /* @__PURE__ */ (() => {
  const impl14145_191 = /* @__PURE__ */ __name(function() {
    return proj_get_units_from_database({});
  }, "impl14145_191");
  const impl14146_192 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_get_units_from_database", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["auth_name", "string"], ["category", "string"], ["allow_deprecated", "int32"], ["out_result_count", "pointer"]], "proj-returns": "struct-list", "struct-def": "proj-unit-info", "struct-fields": [["auth-name", "string", 0], ["code", "string", 4], ["name", "string", 8], ["category", "string", 12], ["conv-factor", "double", 16], ["proj-short-name", "string", 24], ["deprecated", "boolean", 28]], "struct-destroy-fn": "proj_unit_list_destroy", "count-arg-name": "out_result_count" }, opts__224__auto__);
  }, "impl14146_192");
  const f14142 = /* @__PURE__ */ __name(function(...args14143) {
    const self14147_193 = this;
    const G__14213_194 = args14143.length;
    switch (G__14213_194) {
      case 0:
        return impl14145_191.call(self14147_193);
        break;
      case 1:
        return impl14146_192.call(self14147_193, args14143[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args14143.length ?? ""}`);
    }
    ;
  }, "f14142");
  return f14142;
})();
var proj_crs_get_coordoperation = /* @__PURE__ */ (() => {
  const impl14297_196 = /* @__PURE__ */ __name(function() {
    return proj_crs_get_coordoperation({});
  }, "impl14297_196");
  const impl14298_197 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_crs_get_coordoperation", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl14298_197");
  const f14294 = /* @__PURE__ */ __name(function(...args14295) {
    const self14299_198 = this;
    const G__14365_199 = args14295.length;
    switch (G__14365_199) {
      case 0:
        return impl14297_196.call(self14299_198);
        break;
      case 1:
        return impl14298_197.call(self14299_198, args14295[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args14295.length ?? ""}`);
    }
    ;
  }, "f14294");
  return f14294;
})();
var proj_coordoperation_has_ballpark_transformation = /* @__PURE__ */ (() => {
  const impl14449_201 = /* @__PURE__ */ __name(function() {
    return proj_coordoperation_has_ballpark_transformation({});
  }, "impl14449_201");
  const impl14450_202 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_coordoperation_has_ballpark_transformation", { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["coordoperation", "pointer"]] }, opts__224__auto__);
  }, "impl14450_202");
  const f14446 = /* @__PURE__ */ __name(function(...args14447) {
    const self14451_203 = this;
    const G__14517_204 = args14447.length;
    switch (G__14517_204) {
      case 0:
        return impl14449_201.call(self14451_203);
        break;
      case 1:
        return impl14450_202.call(self14451_203, args14447[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args14447.length ?? ""}`);
    }
    ;
  }, "f14446");
  return f14446;
})();
var proj_get_area_of_use = /* @__PURE__ */ (() => {
  const impl14601_206 = /* @__PURE__ */ __name(function() {
    return proj_get_area_of_use({});
  }, "impl14601_206");
  const impl14602_207 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_get_area_of_use", { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["west-lon-degree", "double"], ["south-lat-degree", "double"], ["east-lon-degree", "double"], ["north-lat-degree", "double"], ["area-name", "string"]], "argtypes": [["context", "pointer"], ["obj", "pointer"], ["out_west_lon_degree", "pointer"], ["out_south_lat_degree", "pointer"], ["out_east_lon_degree", "pointer"], ["out_north_lat_degree", "pointer"], ["out_area_name", "pointer"]] }, opts__224__auto__);
  }, "impl14602_207");
  const f14598 = /* @__PURE__ */ __name(function(...args14599) {
    const self14603_208 = this;
    const G__14669_209 = args14599.length;
    switch (G__14669_209) {
      case 0:
        return impl14601_206.call(self14603_208);
        break;
      case 1:
        return impl14602_207.call(self14603_208, args14599[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args14599.length ?? ""}`);
    }
    ;
  }, "f14598");
  return f14598;
})();
var proj_coord = /* @__PURE__ */ (() => {
  const impl14753_211 = /* @__PURE__ */ __name(function() {
    return proj_coord({});
  }, "impl14753_211");
  const impl14754_212 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_coord", { "rettype": "pointer", "argtypes": [["x", "float64"], ["y", "float64"], ["z", "float64"], ["t", "float64"]] }, opts__224__auto__);
  }, "impl14754_212");
  const f14750 = /* @__PURE__ */ __name(function(...args14751) {
    const self14755_213 = this;
    const G__14821_214 = args14751.length;
    switch (G__14821_214) {
      case 0:
        return impl14753_211.call(self14755_213);
        break;
      case 1:
        return impl14754_212.call(self14755_213, args14751[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args14751.length ?? ""}`);
    }
    ;
  }, "f14750");
  return f14750;
})();
var proj_context_errno_string = /* @__PURE__ */ (() => {
  const impl14905_216 = /* @__PURE__ */ __name(function() {
    return proj_context_errno_string({});
  }, "impl14905_216");
  const impl14906_217 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_context_errno_string", { "rettype": "string", "argtypes": [["err", "int32"]] }, opts__224__auto__);
  }, "impl14906_217");
  const f14902 = /* @__PURE__ */ __name(function(...args14903) {
    const self14907_218 = this;
    const G__14973_219 = args14903.length;
    switch (G__14973_219) {
      case 0:
        return impl14905_216.call(self14907_218);
        break;
      case 1:
        return impl14906_217.call(self14907_218, args14903[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args14903.length ?? ""}`);
    }
    ;
  }, "f14902");
  return f14902;
})();
var proj_get_insert_statements = /* @__PURE__ */ (() => {
  const impl15057_221 = /* @__PURE__ */ __name(function() {
    return proj_get_insert_statements({});
  }, "impl15057_221");
  const impl15058_222 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_get_insert_statements", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["session", "pointer"], ["object", "pointer"], ["authority", "string"], ["code", "string"], ["numeric_codes", "int32"], ["allowed_authorities", "pointer"], ["options", "pointer"]], "proj-returns": "string-list" }, opts__224__auto__);
  }, "impl15058_222");
  const f15054 = /* @__PURE__ */ __name(function(...args15055) {
    const self15059_223 = this;
    const G__15125_224 = args15055.length;
    switch (G__15125_224) {
      case 0:
        return impl15057_221.call(self15059_223);
        break;
      case 1:
        return impl15058_222.call(self15059_223, args15055[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args15055.length ?? ""}`);
    }
    ;
  }, "f15054");
  return f15054;
})();
var proj_string_list_destroy = /* @__PURE__ */ (() => {
  const impl15209_226 = /* @__PURE__ */ __name(function() {
    return proj_string_list_destroy({});
  }, "impl15209_226");
  const impl15210_227 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_string_list_destroy", { "rettype": "void", "argtypes": [["list", "pointer"]] }, opts__224__auto__);
  }, "impl15210_227");
  const f15206 = /* @__PURE__ */ __name(function(...args15207) {
    const self15211_228 = this;
    const G__15277_229 = args15207.length;
    switch (G__15277_229) {
      case 0:
        return impl15209_226.call(self15211_228);
        break;
      case 1:
        return impl15210_227.call(self15211_228, args15207[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args15207.length ?? ""}`);
    }
    ;
  }, "f15206");
  return f15206;
})();
var proj_trans_array = /* @__PURE__ */ (() => {
  const impl15361_231 = /* @__PURE__ */ __name(function() {
    return proj_trans_array({});
  }, "impl15361_231");
  const impl15362_232 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_trans_array", { "rettype": "int32", "argtypes": [["p", "pointer"], ["direction", "int32"], ["n", "size-t"], ["coord", "pointer"]], "argsemantics": [["coord", "coord-array"], ["n", "coord-count"]] }, opts__224__auto__);
  }, "impl15362_232");
  const f15358 = /* @__PURE__ */ __name(function(...args15359) {
    const self15363_233 = this;
    const G__15429_234 = args15359.length;
    switch (G__15429_234) {
      case 0:
        return impl15361_231.call(self15363_233);
        break;
      case 1:
        return impl15362_232.call(self15363_233, args15359[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args15359.length ?? ""}`);
    }
    ;
  }, "f15358");
  return f15358;
})();
var proj_context_clone = /* @__PURE__ */ (() => {
  const impl15513_236 = /* @__PURE__ */ __name(function() {
    return proj_context_clone({});
  }, "impl15513_236");
  const impl15514_237 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_context_clone", { "rettype": "pointer", "argtypes": [["ctx", "pointer"]], "proj-returns": "pj-context", "is-context-fn": false }, opts__224__auto__);
  }, "impl15514_237");
  const f15510 = /* @__PURE__ */ __name(function(...args15511) {
    const self15515_238 = this;
    const G__15581_239 = args15511.length;
    switch (G__15581_239) {
      case 0:
        return impl15513_236.call(self15515_238);
        break;
      case 1:
        return impl15514_237.call(self15515_238, args15511[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args15511.length ?? ""}`);
    }
    ;
  }, "f15510");
  return f15510;
})();
var proj_is_equivalent_to_with_ctx = /* @__PURE__ */ (() => {
  const impl15665_241 = /* @__PURE__ */ __name(function() {
    return proj_is_equivalent_to_with_ctx({});
  }, "impl15665_241");
  const impl15666_242 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_is_equivalent_to_with_ctx", { "rettype": "int32", "argtypes": [["context", "pointer"], ["obj", "pointer"], ["other", "pointer"], ["criterion", "int32"]] }, opts__224__auto__);
  }, "impl15666_242");
  const f15662 = /* @__PURE__ */ __name(function(...args15663) {
    const self15667_243 = this;
    const G__15733_244 = args15663.length;
    switch (G__15733_244) {
      case 0:
        return impl15665_241.call(self15667_243);
        break;
      case 1:
        return impl15666_242.call(self15667_243, args15663[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args15663.length ?? ""}`);
    }
    ;
  }, "f15662");
  return f15662;
})();
var proj_operation_factory_context_set_allow_use_intermediate_crs = /* @__PURE__ */ (() => {
  const impl15817_246 = /* @__PURE__ */ __name(function() {
    return proj_operation_factory_context_set_allow_use_intermediate_crs({});
  }, "impl15817_246");
  const impl15818_247 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_operation_factory_context_set_allow_use_intermediate_crs", { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["use", "int32"]] }, opts__224__auto__);
  }, "impl15818_247");
  const f15814 = /* @__PURE__ */ __name(function(...args15815) {
    const self15819_248 = this;
    const G__15885_249 = args15815.length;
    switch (G__15885_249) {
      case 0:
        return impl15817_246.call(self15819_248);
        break;
      case 1:
        return impl15818_247.call(self15819_248, args15815[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args15815.length ?? ""}`);
    }
    ;
  }, "f15814");
  return f15814;
})();
var proj_coordoperation_get_param_index = /* @__PURE__ */ (() => {
  const impl15969_251 = /* @__PURE__ */ __name(function() {
    return proj_coordoperation_get_param_index({});
  }, "impl15969_251");
  const impl15970_252 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_coordoperation_get_param_index", { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["coordoperation", "pointer"], ["name", "string"]] }, opts__224__auto__);
  }, "impl15970_252");
  const f15966 = /* @__PURE__ */ __name(function(...args15967) {
    const self15971_253 = this;
    const G__16037_254 = args15967.length;
    switch (G__16037_254) {
      case 0:
        return impl15969_251.call(self15971_253);
        break;
      case 1:
        return impl15970_252.call(self15971_253, args15967[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args15967.length ?? ""}`);
    }
    ;
  }, "f15966");
  return f15966;
})();
var proj_context_get_database_structure = /* @__PURE__ */ (() => {
  const impl16121_256 = /* @__PURE__ */ __name(function() {
    return proj_context_get_database_structure({});
  }, "impl16121_256");
  const impl16122_257 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_context_get_database_structure", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["options", "pointer"]], "proj-returns": "string-list" }, opts__224__auto__);
  }, "impl16122_257");
  const f16118 = /* @__PURE__ */ __name(function(...args16119) {
    const self16123_258 = this;
    const G__16189_259 = args16119.length;
    switch (G__16189_259) {
      case 0:
        return impl16121_256.call(self16123_258);
        break;
      case 1:
        return impl16122_257.call(self16123_258, args16119[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args16119.length ?? ""}`);
    }
    ;
  }, "f16118");
  return f16118;
})();
var proj_operation_factory_context_destroy = /* @__PURE__ */ (() => {
  const impl16273_261 = /* @__PURE__ */ __name(function() {
    return proj_operation_factory_context_destroy({});
  }, "impl16273_261");
  const impl16274_262 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_operation_factory_context_destroy", { "rettype": "void", "argtypes": [["ctx", "pointer"]], "is-context-fn": false }, opts__224__auto__);
  }, "impl16274_262");
  const f16270 = /* @__PURE__ */ __name(function(...args16271) {
    const self16275_263 = this;
    const G__16341_264 = args16271.length;
    switch (G__16341_264) {
      case 0:
        return impl16273_261.call(self16275_263);
        break;
      case 1:
        return impl16274_262.call(self16275_263, args16271[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args16271.length ?? ""}`);
    }
    ;
  }, "f16270");
  return f16270;
})();
var proj_get_celestial_body_list_from_database = /* @__PURE__ */ (() => {
  const impl16425_266 = /* @__PURE__ */ __name(function() {
    return proj_get_celestial_body_list_from_database({});
  }, "impl16425_266");
  const impl16426_267 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_get_celestial_body_list_from_database", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["auth_name", "string"], ["out_result_count", "pointer"]], "proj-returns": "struct-list", "struct-def": "proj-celestial-body-info", "struct-fields": [["auth-name", "string", 0], ["name", "string", 4]], "struct-destroy-fn": "proj_celestial_body_list_destroy", "count-arg-name": "out_result_count" }, opts__224__auto__);
  }, "impl16426_267");
  const f16422 = /* @__PURE__ */ __name(function(...args16423) {
    const self16427_268 = this;
    const G__16493_269 = args16423.length;
    switch (G__16493_269) {
      case 0:
        return impl16425_266.call(self16427_268);
        break;
      case 1:
        return impl16426_267.call(self16427_268, args16423[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args16423.length ?? ""}`);
    }
    ;
  }, "f16422");
  return f16422;
})();
var proj_celestial_body_list_destroy = /* @__PURE__ */ (() => {
  const impl16577_271 = /* @__PURE__ */ __name(function() {
    return proj_celestial_body_list_destroy({});
  }, "impl16577_271");
  const impl16578_272 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_celestial_body_list_destroy", { "rettype": "void", "argtypes": [["list", "pointer"]] }, opts__224__auto__);
  }, "impl16578_272");
  const f16574 = /* @__PURE__ */ __name(function(...args16575) {
    const self16579_273 = this;
    const G__16645_274 = args16575.length;
    switch (G__16645_274) {
      case 0:
        return impl16577_271.call(self16579_273);
        break;
      case 1:
        return impl16578_272.call(self16579_273, args16575[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args16575.length ?? ""}`);
    }
    ;
  }, "f16574");
  return f16574;
})();
var proj_create_compound_crs = /* @__PURE__ */ (() => {
  const impl16729_276 = /* @__PURE__ */ __name(function() {
    return proj_create_compound_crs({});
  }, "impl16729_276");
  const impl16730_277 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_create_compound_crs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_name", "string"], ["horiz_crs", "pointer"], ["vert_crs", "pointer"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl16730_277");
  const f16726 = /* @__PURE__ */ __name(function(...args16727) {
    const self16731_278 = this;
    const G__16797_279 = args16727.length;
    switch (G__16797_279) {
      case 0:
        return impl16729_276.call(self16731_278);
        break;
      case 1:
        return impl16730_277.call(self16731_278, args16727[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args16727.length ?? ""}`);
    }
    ;
  }, "f16726");
  return f16726;
})();
var proj_coordoperation_get_towgs84_values = /* @__PURE__ */ (() => {
  const impl16881_281 = /* @__PURE__ */ __name(function() {
    return proj_coordoperation_get_towgs84_values({});
  }, "impl16881_281");
  const impl16882_282 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_coordoperation_get_towgs84_values", { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["values", "double-array", "count-arg", "value_count"]], "argtypes": [["ctx", "pointer"], ["coordoperation", "pointer"], ["out_values", "pointer"], ["value_count", "int32"], ["emit_error_if_incompatible", "int32"]] }, opts__224__auto__);
  }, "impl16882_282");
  const f16878 = /* @__PURE__ */ __name(function(...args16879) {
    const self16883_283 = this;
    const G__16949_284 = args16879.length;
    switch (G__16949_284) {
      case 0:
        return impl16881_281.call(self16883_283);
        break;
      case 1:
        return impl16882_282.call(self16883_283, args16879[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args16879.length ?? ""}`);
    }
    ;
  }, "f16878");
  return f16878;
})();
var proj_get_remarks = /* @__PURE__ */ (() => {
  const impl17033_286 = /* @__PURE__ */ __name(function() {
    return proj_get_remarks({});
  }, "impl17033_286");
  const impl17034_287 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_get_remarks", { "rettype": "string", "argtypes": [["obj", "pointer"]] }, opts__224__auto__);
  }, "impl17034_287");
  const f17030 = /* @__PURE__ */ __name(function(...args17031) {
    const self17035_288 = this;
    const G__17101_289 = args17031.length;
    switch (G__17101_289) {
      case 0:
        return impl17033_286.call(self17035_288);
        break;
      case 1:
        return impl17034_287.call(self17035_288, args17031[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args17031.length ?? ""}`);
    }
    ;
  }, "f17030");
  return f17030;
})();
var proj_get_geoid_models_from_database = /* @__PURE__ */ (() => {
  const impl17185_291 = /* @__PURE__ */ __name(function() {
    return proj_get_geoid_models_from_database({});
  }, "impl17185_291");
  const impl17186_292 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_get_geoid_models_from_database", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["auth_name", "string"], ["code", "string"], ["options", "pointer"]], "proj-returns": "string-list" }, opts__224__auto__);
  }, "impl17186_292");
  const f17182 = /* @__PURE__ */ __name(function(...args17183) {
    const self17187_293 = this;
    const G__17253_294 = args17183.length;
    switch (G__17253_294) {
      case 0:
        return impl17185_291.call(self17187_293);
        break;
      case 1:
        return impl17186_292.call(self17187_293, args17183[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args17183.length ?? ""}`);
    }
    ;
  }, "f17182");
  return f17182;
})();
var proj_crs_alter_cs_linear_unit = /* @__PURE__ */ (() => {
  const impl17337_296 = /* @__PURE__ */ __name(function() {
    return proj_crs_alter_cs_linear_unit({});
  }, "impl17337_296");
  const impl17338_297 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_crs_alter_cs_linear_unit", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["obj", "pointer"], ["linear_units", "string"], ["linear_units_conv", "float64"], ["unit_auth_name", "string"], ["unit_code", "string"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl17338_297");
  const f17334 = /* @__PURE__ */ __name(function(...args17335) {
    const self17339_298 = this;
    const G__17405_299 = args17335.length;
    switch (G__17405_299) {
      case 0:
        return impl17337_296.call(self17339_298);
        break;
      case 1:
        return impl17338_297.call(self17339_298, args17335[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args17335.length ?? ""}`);
    }
    ;
  }, "f17334");
  return f17334;
})();
var proj_uom_get_info_from_database = /* @__PURE__ */ (() => {
  const impl17489_301 = /* @__PURE__ */ __name(function() {
    return proj_uom_get_info_from_database({});
  }, "impl17489_301");
  const impl17490_302 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_uom_get_info_from_database", { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["name", "string"], ["conv-factor", "double"], ["category", "string"]], "argtypes": [["context", "pointer"], ["auth_name", "string"], ["code", "string"], ["out_name", "pointer"], ["out_conv_factor", "pointer"], ["out_category", "pointer"]] }, opts__224__auto__);
  }, "impl17490_302");
  const f17486 = /* @__PURE__ */ __name(function(...args17487) {
    const self17491_303 = this;
    const G__17557_304 = args17487.length;
    switch (G__17557_304) {
      case 0:
        return impl17489_301.call(self17491_303);
        break;
      case 1:
        return impl17490_302.call(self17491_303, args17487[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args17487.length ?? ""}`);
    }
    ;
  }, "f17486");
  return f17486;
})();
var proj_normalize_for_visualization = /* @__PURE__ */ (() => {
  const impl17641_306 = /* @__PURE__ */ __name(function() {
    return proj_normalize_for_visualization({});
  }, "impl17641_306");
  const impl17642_307 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_normalize_for_visualization", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["obj", "pointer"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl17642_307");
  const f17638 = /* @__PURE__ */ __name(function(...args17639) {
    const self17643_308 = this;
    const G__17709_309 = args17639.length;
    switch (G__17709_309) {
      case 0:
        return impl17641_306.call(self17643_308);
        break;
      case 1:
        return impl17642_307.call(self17643_308, args17639[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args17639.length ?? ""}`);
    }
    ;
  }, "f17638");
  return f17638;
})();
var proj_crs_get_datum_ensemble = /* @__PURE__ */ (() => {
  const impl17793_311 = /* @__PURE__ */ __name(function() {
    return proj_crs_get_datum_ensemble({});
  }, "impl17793_311");
  const impl17794_312 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_crs_get_datum_ensemble", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl17794_312");
  const f17790 = /* @__PURE__ */ __name(function(...args17791) {
    const self17795_313 = this;
    const G__17861_314 = args17791.length;
    switch (G__17861_314) {
      case 0:
        return impl17793_311.call(self17795_313);
        break;
      case 1:
        return impl17794_312.call(self17795_313, args17791[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args17791.length ?? ""}`);
    }
    ;
  }, "f17790");
  return f17790;
})();
var proj_create_crs_to_crs = /* @__PURE__ */ (() => {
  const impl17945_316 = /* @__PURE__ */ __name(function() {
    return proj_create_crs_to_crs({});
  }, "impl17945_316");
  const impl17946_317 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_create_crs_to_crs", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["source_crs", "string"], ["target_crs", "string"], ["area", "pointer?"]], "argsemantics": [["area", "pj-area", "default", 0]], "proj-returns": "pj", "isolate-context?": true }, opts__224__auto__);
  }, "impl17946_317");
  const f17942 = /* @__PURE__ */ __name(function(...args17943) {
    const self17947_318 = this;
    const G__18013_319 = args17943.length;
    switch (G__18013_319) {
      case 0:
        return impl17945_316.call(self17947_318);
        break;
      case 1:
        return impl17946_317.call(self17947_318, args17943[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args17943.length ?? ""}`);
    }
    ;
  }, "f17942");
  return f17942;
})();
var proj_alter_name = /* @__PURE__ */ (() => {
  const impl18097_321 = /* @__PURE__ */ __name(function() {
    return proj_alter_name({});
  }, "impl18097_321");
  const impl18098_322 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_alter_name", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["obj", "pointer"], ["name", "string"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl18098_322");
  const f18094 = /* @__PURE__ */ __name(function(...args18095) {
    const self18099_323 = this;
    const G__18165_324 = args18095.length;
    switch (G__18165_324) {
      case 0:
        return impl18097_321.call(self18099_323);
        break;
      case 1:
        return impl18098_322.call(self18099_323, args18095[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args18095.length ?? ""}`);
    }
    ;
  }, "f18094");
  return f18094;
})();
var proj_coordinate_metadata_get_epoch = /* @__PURE__ */ (() => {
  const impl18249_326 = /* @__PURE__ */ __name(function() {
    return proj_coordinate_metadata_get_epoch({});
  }, "impl18249_326");
  const impl18250_327 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_coordinate_metadata_get_epoch", { "rettype": "float64", "argtypes": [["ctx", "pointer"], ["obj", "pointer"]] }, opts__224__auto__);
  }, "impl18250_327");
  const f18246 = /* @__PURE__ */ __name(function(...args18247) {
    const self18251_328 = this;
    const G__18317_329 = args18247.length;
    switch (G__18317_329) {
      case 0:
        return impl18249_326.call(self18251_328);
        break;
      case 1:
        return impl18250_327.call(self18251_328, args18247[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args18247.length ?? ""}`);
    }
    ;
  }, "f18246");
  return f18246;
})();
var proj_context_errno = /* @__PURE__ */ (() => {
  const impl18401_331 = /* @__PURE__ */ __name(function() {
    return proj_context_errno({});
  }, "impl18401_331");
  const impl18402_332 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_context_errno", { "rettype": "int32", "argtypes": [["context", "pointer"]] }, opts__224__auto__);
  }, "impl18402_332");
  const f18398 = /* @__PURE__ */ __name(function(...args18399) {
    const self18403_333 = this;
    const G__18469_334 = args18399.length;
    switch (G__18469_334) {
      case 0:
        return impl18401_331.call(self18403_333);
        break;
      case 1:
        return impl18402_332.call(self18403_333, args18399[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args18399.length ?? ""}`);
    }
    ;
  }, "f18398");
  return f18398;
})();
var proj_trans_generic = /* @__PURE__ */ (() => {
  const impl18553_336 = /* @__PURE__ */ __name(function() {
    return proj_trans_generic({});
  }, "impl18553_336");
  const impl18554_337 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_trans_generic", { "rettype": "size-t", "argtypes": [["p", "pointer"], ["direction", "int32"], ["x", "pointer"], ["sx", "size-t"], ["nx", "size-t"], ["y", "pointer"], ["sy", "size-t"], ["ny", "size-t"], ["z", "pointer?"], ["sz", "size-t"], ["nz", "size-t"], ["t", "pointer?"], ["st", "size-t"], ["nt", "size-t"]] }, opts__224__auto__);
  }, "impl18554_337");
  const f18550 = /* @__PURE__ */ __name(function(...args18551) {
    const self18555_338 = this;
    const G__18621_339 = args18551.length;
    switch (G__18621_339) {
      case 0:
        return impl18553_336.call(self18555_338);
        break;
      case 1:
        return impl18554_337.call(self18555_338, args18551[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args18551.length ?? ""}`);
    }
    ;
  }, "f18550");
  return f18550;
})();
var proj_clone = /* @__PURE__ */ (() => {
  const impl18705_341 = /* @__PURE__ */ __name(function() {
    return proj_clone({});
  }, "impl18705_341");
  const impl18706_342 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_clone", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["p", "pointer"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl18706_342");
  const f18702 = /* @__PURE__ */ __name(function(...args18703) {
    const self18707_343 = this;
    const G__18773_344 = args18703.length;
    switch (G__18773_344) {
      case 0:
        return impl18705_341.call(self18707_343);
        break;
      case 1:
        return impl18706_342.call(self18707_343, args18703[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args18703.length ?? ""}`);
    }
    ;
  }, "f18702");
  return f18702;
})();
var proj_coordoperation_create_inverse = /* @__PURE__ */ (() => {
  const impl18857_346 = /* @__PURE__ */ __name(function() {
    return proj_coordoperation_create_inverse({});
  }, "impl18857_346");
  const impl18858_347 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_coordoperation_create_inverse", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["obj", "pointer"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl18858_347");
  const f18854 = /* @__PURE__ */ __name(function(...args18855) {
    const self18859_348 = this;
    const G__18925_349 = args18855.length;
    switch (G__18925_349) {
      case 0:
        return impl18857_346.call(self18859_348);
        break;
      case 1:
        return impl18858_347.call(self18859_348, args18855[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args18855.length ?? ""}`);
    }
    ;
  }, "f18854");
  return f18854;
})();
var proj_crs_demote_to_2D = /* @__PURE__ */ (() => {
  const impl19009_351 = /* @__PURE__ */ __name(function() {
    return proj_crs_demote_to_2D({});
  }, "impl19009_351");
  const impl19010_352 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_crs_demote_to_2D", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_2D_name", "string"], ["crs_3D", "pointer"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl19010_352");
  const f19006 = /* @__PURE__ */ __name(function(...args19007) {
    const self19011_353 = this;
    const G__19077_354 = args19007.length;
    switch (G__19077_354) {
      case 0:
        return impl19009_351.call(self19011_353);
        break;
      case 1:
        return impl19010_352.call(self19011_353, args19007[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args19007.length ?? ""}`);
    }
    ;
  }, "f19006");
  return f19006;
})();
var proj_create_cartesian_2D_cs = /* @__PURE__ */ (() => {
  const impl19161_356 = /* @__PURE__ */ __name(function() {
    return proj_create_cartesian_2D_cs({});
  }, "impl19161_356");
  const impl19162_357 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_create_cartesian_2D_cs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["type", "int32"], ["unit_name", "string"], ["unit_conv_factor", "float64"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl19162_357");
  const f19158 = /* @__PURE__ */ __name(function(...args19159) {
    const self19163_358 = this;
    const G__19229_359 = args19159.length;
    switch (G__19229_359) {
      case 0:
        return impl19161_356.call(self19163_358);
        break;
      case 1:
        return impl19162_357.call(self19163_358, args19159[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args19159.length ?? ""}`);
    }
    ;
  }, "f19158");
  return f19158;
})();
var proj_context_is_network_enabled = /* @__PURE__ */ (() => {
  const impl19313_361 = /* @__PURE__ */ __name(function() {
    return proj_context_is_network_enabled({});
  }, "impl19313_361");
  const impl19314_362 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_context_is_network_enabled", { "rettype": "int32", "argtypes": [["context", "pointer"]] }, opts__224__auto__);
  }, "impl19314_362");
  const f19310 = /* @__PURE__ */ __name(function(...args19311) {
    const self19315_363 = this;
    const G__19381_364 = args19311.length;
    switch (G__19381_364) {
      case 0:
        return impl19313_361.call(self19315_363);
        break;
      case 1:
        return impl19314_362.call(self19315_363, args19311[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args19311.length ?? ""}`);
    }
    ;
  }, "f19310");
  return f19310;
})();
var proj_get_scope = /* @__PURE__ */ (() => {
  const impl19465_366 = /* @__PURE__ */ __name(function() {
    return proj_get_scope({});
  }, "impl19465_366");
  const impl19466_367 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_get_scope", { "rettype": "string", "argtypes": [["obj", "pointer"]] }, opts__224__auto__);
  }, "impl19466_367");
  const f19462 = /* @__PURE__ */ __name(function(...args19463) {
    const self19467_368 = this;
    const G__19533_369 = args19463.length;
    switch (G__19533_369) {
      case 0:
        return impl19465_366.call(self19467_368);
        break;
      case 1:
        return impl19466_367.call(self19467_368, args19463[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args19463.length ?? ""}`);
    }
    ;
  }, "f19462");
  return f19462;
})();
var proj_destroy = /* @__PURE__ */ (() => {
  const impl19617_371 = /* @__PURE__ */ __name(function() {
    return proj_destroy({});
  }, "impl19617_371");
  const impl19618_372 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_destroy", { "rettype": "pointer", "argtypes": [["pj", "pointer"]] }, opts__224__auto__);
  }, "impl19618_372");
  const f19614 = /* @__PURE__ */ __name(function(...args19615) {
    const self19619_373 = this;
    const G__19685_374 = args19615.length;
    switch (G__19685_374) {
      case 0:
        return impl19617_371.call(self19619_373);
        break;
      case 1:
        return impl19618_372.call(self19619_373, args19615[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args19615.length ?? ""}`);
    }
    ;
  }, "f19614");
  return f19614;
})();
var proj_operation_factory_context_set_allow_ballpark_transformations = /* @__PURE__ */ (() => {
  const impl19769_376 = /* @__PURE__ */ __name(function() {
    return proj_operation_factory_context_set_allow_ballpark_transformations({});
  }, "impl19769_376");
  const impl19770_377 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_operation_factory_context_set_allow_ballpark_transformations", { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["allow", "int32"]] }, opts__224__auto__);
  }, "impl19770_377");
  const f19766 = /* @__PURE__ */ __name(function(...args19767) {
    const self19771_378 = this;
    const G__19837_379 = args19767.length;
    switch (G__19837_379) {
      case 0:
        return impl19769_376.call(self19771_378);
        break;
      case 1:
        return impl19770_377.call(self19771_378, args19767[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args19767.length ?? ""}`);
    }
    ;
  }, "f19766");
  return f19766;
})();
var proj_crs_get_datum = /* @__PURE__ */ (() => {
  const impl19921_381 = /* @__PURE__ */ __name(function() {
    return proj_crs_get_datum({});
  }, "impl19921_381");
  const impl19922_382 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_crs_get_datum", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl19922_382");
  const f19918 = /* @__PURE__ */ __name(function(...args19919) {
    const self19923_383 = this;
    const G__19989_384 = args19919.length;
    switch (G__19989_384) {
      case 0:
        return impl19921_381.call(self19923_383);
        break;
      case 1:
        return impl19922_382.call(self19923_383, args19919[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args19919.length ?? ""}`);
    }
    ;
  }, "f19918");
  return f19918;
})();
var proj_operation_factory_context_set_area_of_interest = /* @__PURE__ */ (() => {
  const impl20073_386 = /* @__PURE__ */ __name(function() {
    return proj_operation_factory_context_set_area_of_interest({});
  }, "impl20073_386");
  const impl20074_387 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_operation_factory_context_set_area_of_interest", { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["west_lon_degree", "float64"], ["south_lat_degree", "float64"], ["east_lon_degree", "float64"], ["north_lat_degree", "float64"]] }, opts__224__auto__);
  }, "impl20074_387");
  const f20070 = /* @__PURE__ */ __name(function(...args20071) {
    const self20075_388 = this;
    const G__20141_389 = args20071.length;
    switch (G__20141_389) {
      case 0:
        return impl20073_386.call(self20075_388);
        break;
      case 1:
        return impl20074_387.call(self20075_388, args20071[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args20071.length ?? ""}`);
    }
    ;
  }, "f20070");
  return f20070;
})();
var proj_create_cs = /* @__PURE__ */ (() => {
  const impl20225_391 = /* @__PURE__ */ __name(function() {
    return proj_create_cs({});
  }, "impl20225_391");
  const impl20226_392 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_create_cs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["type", "int32"], ["axis_count", "int32"], ["axis", "pointer"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl20226_392");
  const f20222 = /* @__PURE__ */ __name(function(...args20223) {
    const self20227_393 = this;
    const G__20293_394 = args20223.length;
    switch (G__20293_394) {
      case 0:
        return impl20225_391.call(self20227_393);
        break;
      case 1:
        return impl20226_392.call(self20227_393, args20223[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args20223.length ?? ""}`);
    }
    ;
  }, "f20222");
  return f20222;
})();
var proj_create_projected_crs = /* @__PURE__ */ (() => {
  const impl20377_396 = /* @__PURE__ */ __name(function() {
    return proj_create_projected_crs({});
  }, "impl20377_396");
  const impl20378_397 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_create_projected_crs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_name", "string"], ["geodetic_crs", "pointer"], ["conversion", "pointer"], ["coordinate_system", "pointer"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl20378_397");
  const f20374 = /* @__PURE__ */ __name(function(...args20375) {
    const self20379_398 = this;
    const G__20445_399 = args20375.length;
    switch (G__20445_399) {
      case 0:
        return impl20377_396.call(self20379_398);
        break;
      case 1:
        return impl20378_397.call(self20379_398, args20375[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args20375.length ?? ""}`);
    }
    ;
  }, "f20374");
  return f20374;
})();
var proj_as_proj_string = /* @__PURE__ */ (() => {
  const impl20529_401 = /* @__PURE__ */ __name(function() {
    return proj_as_proj_string({});
  }, "impl20529_401");
  const impl20530_402 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_as_proj_string", { "rettype": "string", "argtypes": [["context", "pointer"], ["pj", "pointer"], ["type", "int32"], ["options", "pointer?"]], "argsemantics": [["options", "string-array?", "default", null]] }, opts__224__auto__);
  }, "impl20530_402");
  const f20526 = /* @__PURE__ */ __name(function(...args20527) {
    const self20531_403 = this;
    const G__20597_404 = args20527.length;
    switch (G__20597_404) {
      case 0:
        return impl20529_401.call(self20531_403);
        break;
      case 1:
        return impl20530_402.call(self20531_403, args20527[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args20527.length ?? ""}`);
    }
    ;
  }, "f20526");
  return f20526;
})();
var proj_operation_factory_context_set_grid_availability_use = /* @__PURE__ */ (() => {
  const impl20681_406 = /* @__PURE__ */ __name(function() {
    return proj_operation_factory_context_set_grid_availability_use({});
  }, "impl20681_406");
  const impl20682_407 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_operation_factory_context_set_grid_availability_use", { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["use", "int32"]] }, opts__224__auto__);
  }, "impl20682_407");
  const f20678 = /* @__PURE__ */ __name(function(...args20679) {
    const self20683_408 = this;
    const G__20749_409 = args20679.length;
    switch (G__20749_409) {
      case 0:
        return impl20681_406.call(self20683_408);
        break;
      case 1:
        return impl20682_407.call(self20683_408, args20679[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args20679.length ?? ""}`);
    }
    ;
  }, "f20678");
  return f20678;
})();
var proj_create_derived_geographic_crs = /* @__PURE__ */ (() => {
  const impl20833_411 = /* @__PURE__ */ __name(function() {
    return proj_create_derived_geographic_crs({});
  }, "impl20833_411");
  const impl20834_412 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_create_derived_geographic_crs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_name", "string"], ["base_geographic_crs", "pointer"], ["conversion", "pointer"], ["ellipsoidal_cs", "pointer"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl20834_412");
  const f20830 = /* @__PURE__ */ __name(function(...args20831) {
    const self20835_413 = this;
    const G__20901_414 = args20831.length;
    switch (G__20901_414) {
      case 0:
        return impl20833_411.call(self20835_413);
        break;
      case 1:
        return impl20834_412.call(self20835_413, args20831[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args20831.length ?? ""}`);
    }
    ;
  }, "f20830");
  return f20830;
})();
var proj_create_crs_to_crs_from_pj = /* @__PURE__ */ (() => {
  const impl20985_416 = /* @__PURE__ */ __name(function() {
    return proj_create_crs_to_crs_from_pj({});
  }, "impl20985_416");
  const impl20986_417 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_create_crs_to_crs_from_pj", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["source_crs", "pointer"], ["target_crs", "pointer"], ["area", "pointer?"], ["options", "pointer?"]], "argsemantics": [["area", "pj-area", "default", 0], ["options", "string-array?", "default", null]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl20986_417");
  const f20982 = /* @__PURE__ */ __name(function(...args20983) {
    const self20987_418 = this;
    const G__21053_419 = args20983.length;
    switch (G__21053_419) {
      case 0:
        return impl20985_416.call(self20987_418);
        break;
      case 1:
        return impl20986_417.call(self20987_418, args20983[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args20983.length ?? ""}`);
    }
    ;
  }, "f20982");
  return f20982;
})();
var proj_coordoperation_get_method_info = /* @__PURE__ */ (() => {
  const impl21137_421 = /* @__PURE__ */ __name(function() {
    return proj_coordoperation_get_method_info({});
  }, "impl21137_421");
  const impl21138_422 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_coordoperation_get_method_info", { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["method-name", "string"], ["method-auth-name", "string"], ["method-code", "string"]], "argtypes": [["ctx", "pointer"], ["coordoperation", "pointer"], ["out_method_name", "pointer"], ["out_method_auth_name", "pointer"], ["out_method_code", "pointer"]] }, opts__224__auto__);
  }, "impl21138_422");
  const f21134 = /* @__PURE__ */ __name(function(...args21135) {
    const self21139_423 = this;
    const G__21205_424 = args21135.length;
    switch (G__21205_424) {
      case 0:
        return impl21137_421.call(self21139_423);
        break;
      case 1:
        return impl21138_422.call(self21139_423, args21135[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args21135.length ?? ""}`);
    }
    ;
  }, "f21134");
  return f21134;
})();
var proj_get_source_crs = /* @__PURE__ */ (() => {
  const impl21289_426 = /* @__PURE__ */ __name(function() {
    return proj_get_source_crs({});
  }, "impl21289_426");
  const impl21290_427 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_get_source_crs", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["pj", "pointer"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl21290_427");
  const f21286 = /* @__PURE__ */ __name(function(...args21287) {
    const self21291_428 = this;
    const G__21357_429 = args21287.length;
    switch (G__21357_429) {
      case 0:
        return impl21289_426.call(self21291_428);
        break;
      case 1:
        return impl21290_427.call(self21291_428, args21287[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args21287.length ?? ""}`);
    }
    ;
  }, "f21286");
  return f21286;
})();
var proj_ellipsoid_get_parameters = /* @__PURE__ */ (() => {
  const impl21441_431 = /* @__PURE__ */ __name(function() {
    return proj_ellipsoid_get_parameters({});
  }, "impl21441_431");
  const impl21442_432 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_ellipsoid_get_parameters", { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["semi-major-metre", "double"], ["semi-minor-metre", "double"], ["is-semi-minor-computed", "int"], ["inv-flattening", "double"]], "argtypes": [["ctx", "pointer"], ["ellipsoid", "pointer"], ["out_semi_major_metre", "pointer"], ["out_semi_minor_metre", "pointer"], ["out_is_semi_minor_computed", "pointer"], ["out_inv_flattening", "pointer"]] }, opts__224__auto__);
  }, "impl21442_432");
  const f21438 = /* @__PURE__ */ __name(function(...args21439) {
    const self21443_433 = this;
    const G__21509_434 = args21439.length;
    switch (G__21509_434) {
      case 0:
        return impl21441_431.call(self21443_433);
        break;
      case 1:
        return impl21442_432.call(self21443_433, args21439[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args21439.length ?? ""}`);
    }
    ;
  }, "f21438");
  return f21438;
})();
var proj_context_destroy = /* @__PURE__ */ (() => {
  const impl21593_436 = /* @__PURE__ */ __name(function() {
    return proj_context_destroy({});
  }, "impl21593_436");
  const impl21594_437 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_context_destroy", { "rettype": "void", "argtypes": [["context", "pointer"]], "is-context-fn": false }, opts__224__auto__);
  }, "impl21594_437");
  const f21590 = /* @__PURE__ */ __name(function(...args21591) {
    const self21595_438 = this;
    const G__21661_439 = args21591.length;
    switch (G__21661_439) {
      case 0:
        return impl21593_436.call(self21595_438);
        break;
      case 1:
        return impl21594_437.call(self21595_438, args21591[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args21591.length ?? ""}`);
    }
    ;
  }, "f21590");
  return f21590;
})();
var proj_cs_get_axis_info = /* @__PURE__ */ (() => {
  const impl21745_441 = /* @__PURE__ */ __name(function() {
    return proj_cs_get_axis_info({});
  }, "impl21745_441");
  const impl21746_442 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_cs_get_axis_info", { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["name", "string"], ["abbreviation", "string"], ["direction", "string"], ["unit-conv-factor", "double"], ["unit-name", "string"], ["unit-auth-name", "string"], ["unit-code", "string"]], "argtypes": [["ctx", "pointer"], ["cs", "pointer"], ["index", "int32"], ["out_name", "pointer"], ["out_abbrev", "pointer"], ["out_direction", "pointer"], ["out_unit_conv_factor", "pointer"], ["out_unit_name", "pointer"], ["out_unit_auth_name", "pointer"], ["out_unit_code", "pointer"]] }, opts__224__auto__);
  }, "impl21746_442");
  const f21742 = /* @__PURE__ */ __name(function(...args21743) {
    const self21747_443 = this;
    const G__21813_444 = args21743.length;
    switch (G__21813_444) {
      case 0:
        return impl21745_441.call(self21747_443);
        break;
      case 1:
        return impl21746_442.call(self21747_443, args21743[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args21743.length ?? ""}`);
    }
    ;
  }, "f21742");
  return f21742;
})();
var proj_query_geodetic_crs_from_datum = /* @__PURE__ */ (() => {
  const impl21897_446 = /* @__PURE__ */ __name(function() {
    return proj_query_geodetic_crs_from_datum({});
  }, "impl21897_446");
  const impl21898_447 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_query_geodetic_crs_from_datum", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_auth_name", "string"], ["datum_auth_name", "string"], ["datum_code", "string"], ["crs_type", "string"]], "proj-returns": "pj-list" }, opts__224__auto__);
  }, "impl21898_447");
  const f21894 = /* @__PURE__ */ __name(function(...args21895) {
    const self21899_448 = this;
    const G__21965_449 = args21895.length;
    switch (G__21965_449) {
      case 0:
        return impl21897_446.call(self21899_448);
        break;
      case 1:
        return impl21898_447.call(self21899_448, args21895[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args21895.length ?? ""}`);
    }
    ;
  }, "f21894");
  return f21894;
})();
var proj_coordoperation_requires_per_coordinate_input_time = /* @__PURE__ */ (() => {
  const impl22049_451 = /* @__PURE__ */ __name(function() {
    return proj_coordoperation_requires_per_coordinate_input_time({});
  }, "impl22049_451");
  const impl22050_452 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_coordoperation_requires_per_coordinate_input_time", { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["coordoperation", "pointer"]] }, opts__224__auto__);
  }, "impl22050_452");
  const f22046 = /* @__PURE__ */ __name(function(...args22047) {
    const self22051_453 = this;
    const G__22117_454 = args22047.length;
    switch (G__22117_454) {
      case 0:
        return impl22049_451.call(self22051_453);
        break;
      case 1:
        return impl22050_452.call(self22051_453, args22047[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args22047.length ?? ""}`);
    }
    ;
  }, "f22046");
  return f22046;
})();
var proj_create_ellipsoidal_2D_cs = /* @__PURE__ */ (() => {
  const impl22201_456 = /* @__PURE__ */ __name(function() {
    return proj_create_ellipsoidal_2D_cs({});
  }, "impl22201_456");
  const impl22202_457 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_create_ellipsoidal_2D_cs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["type", "int32"], ["unit_name", "string"], ["unit_conv_factor", "float64"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl22202_457");
  const f22198 = /* @__PURE__ */ __name(function(...args22199) {
    const self22203_458 = this;
    const G__22269_459 = args22199.length;
    switch (G__22269_459) {
      case 0:
        return impl22201_456.call(self22203_458);
        break;
      case 1:
        return impl22202_457.call(self22203_458, args22199[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args22199.length ?? ""}`);
    }
    ;
  }, "f22198");
  return f22198;
})();
var proj_create_from_database = /* @__PURE__ */ (() => {
  const impl22353_461 = /* @__PURE__ */ __name(function() {
    return proj_create_from_database({});
  }, "impl22353_461");
  const impl22354_462 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_create_from_database", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["auth_name", "string"], ["code", "string"], ["category", "int32"], ["use-proj-alternative-grid-names", "int32"], ["options", "pointer?"]], "argsemantics": [["category", "int32", "default", 3], ["use-proj-alternative-grid-names", "boolean", "default", false], ["options", "string-array?", "default", null]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl22354_462");
  const f22350 = /* @__PURE__ */ __name(function(...args22351) {
    const self22355_463 = this;
    const G__22421_464 = args22351.length;
    switch (G__22421_464) {
      case 0:
        return impl22353_461.call(self22355_463);
        break;
      case 1:
        return impl22354_462.call(self22355_463, args22351[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args22351.length ?? ""}`);
    }
    ;
  }, "f22350");
  return f22350;
})();
var proj_alter_id = /* @__PURE__ */ (() => {
  const impl22505_466 = /* @__PURE__ */ __name(function() {
    return proj_alter_id({});
  }, "impl22505_466");
  const impl22506_467 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_alter_id", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["obj", "pointer"], ["auth_name", "string"], ["code", "string"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl22506_467");
  const f22502 = /* @__PURE__ */ __name(function(...args22503) {
    const self22507_468 = this;
    const G__22573_469 = args22503.length;
    switch (G__22573_469) {
      case 0:
        return impl22505_466.call(self22507_468);
        break;
      case 1:
        return impl22506_467.call(self22507_468, args22503[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args22503.length ?? ""}`);
    }
    ;
  }, "f22502");
  return f22502;
})();
var proj_crs_has_point_motion_operation = /* @__PURE__ */ (() => {
  const impl22657_471 = /* @__PURE__ */ __name(function() {
    return proj_crs_has_point_motion_operation({});
  }, "impl22657_471");
  const impl22658_472 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_crs_has_point_motion_operation", { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]] }, opts__224__auto__);
  }, "impl22658_472");
  const f22654 = /* @__PURE__ */ __name(function(...args22655) {
    const self22659_473 = this;
    const G__22725_474 = args22655.length;
    switch (G__22725_474) {
      case 0:
        return impl22657_471.call(self22659_473);
        break;
      case 1:
        return impl22658_472.call(self22659_473, args22655[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args22655.length ?? ""}`);
    }
    ;
  }, "f22654");
  return f22654;
})();
var proj_operation_factory_context_set_allowed_intermediate_crs = /* @__PURE__ */ (() => {
  const impl22809_476 = /* @__PURE__ */ __name(function() {
    return proj_operation_factory_context_set_allowed_intermediate_crs({});
  }, "impl22809_476");
  const impl22810_477 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_operation_factory_context_set_allowed_intermediate_crs", { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["list_of_auth_name_codes", "pointer"]] }, opts__224__auto__);
  }, "impl22810_477");
  const f22806 = /* @__PURE__ */ __name(function(...args22807) {
    const self22811_478 = this;
    const G__22877_479 = args22807.length;
    switch (G__22877_479) {
      case 0:
        return impl22809_476.call(self22811_478);
        break;
      case 1:
        return impl22810_477.call(self22811_478, args22807[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args22807.length ?? ""}`);
    }
    ;
  }, "f22806");
  return f22806;
})();
var proj_crs_promote_to_3D = /* @__PURE__ */ (() => {
  const impl22961_481 = /* @__PURE__ */ __name(function() {
    return proj_crs_promote_to_3D({});
  }, "impl22961_481");
  const impl22962_482 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_crs_promote_to_3D", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_3D_name", "string"], ["crs_2D", "pointer"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl22962_482");
  const f22958 = /* @__PURE__ */ __name(function(...args22959) {
    const self22963_483 = this;
    const G__23029_484 = args22959.length;
    switch (G__23029_484) {
      case 0:
        return impl22961_481.call(self22963_483);
        break;
      case 1:
        return impl22962_482.call(self22963_483, args22959[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args22959.length ?? ""}`);
    }
    ;
  }, "f22958");
  return f22958;
})();
var proj_get_prime_meridian = /* @__PURE__ */ (() => {
  const impl23113_486 = /* @__PURE__ */ __name(function() {
    return proj_get_prime_meridian({});
  }, "impl23113_486");
  const impl23114_487 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_get_prime_meridian", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["obj", "pointer"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl23114_487");
  const f23110 = /* @__PURE__ */ __name(function(...args23111) {
    const self23115_488 = this;
    const G__23181_489 = args23111.length;
    switch (G__23181_489) {
      case 0:
        return impl23113_486.call(self23115_488);
        break;
      case 1:
        return impl23114_487.call(self23115_488, args23111[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args23111.length ?? ""}`);
    }
    ;
  }, "f23110");
  return f23110;
})();
var proj_datum_ensemble_get_accuracy = /* @__PURE__ */ (() => {
  const impl23265_491 = /* @__PURE__ */ __name(function() {
    return proj_datum_ensemble_get_accuracy({});
  }, "impl23265_491");
  const impl23266_492 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_datum_ensemble_get_accuracy", { "rettype": "float64", "argtypes": [["ctx", "pointer"], ["datum_ensemble", "pointer"]] }, opts__224__auto__);
  }, "impl23266_492");
  const f23262 = /* @__PURE__ */ __name(function(...args23263) {
    const self23267_493 = this;
    const G__23333_494 = args23263.length;
    switch (G__23333_494) {
      case 0:
        return impl23265_491.call(self23267_493);
        break;
      case 1:
        return impl23266_492.call(self23267_493, args23263[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args23263.length ?? ""}`);
    }
    ;
  }, "f23262");
  return f23262;
})();
var proj_get_authorities_from_database = /* @__PURE__ */ (() => {
  const impl23417_496 = /* @__PURE__ */ __name(function() {
    return proj_get_authorities_from_database({});
  }, "impl23417_496");
  const impl23418_497 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_get_authorities_from_database", { "rettype": "pointer", "argtypes": [["context", "pointer"]], "proj-returns": "string-list" }, opts__224__auto__);
  }, "impl23418_497");
  const f23414 = /* @__PURE__ */ __name(function(...args23415) {
    const self23419_498 = this;
    const G__23485_499 = args23415.length;
    switch (G__23485_499) {
      case 0:
        return impl23417_496.call(self23419_498);
        break;
      case 1:
        return impl23418_497.call(self23419_498, args23415[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args23415.length ?? ""}`);
    }
    ;
  }, "f23414");
  return f23414;
})();
var proj_get_scope_ex = /* @__PURE__ */ (() => {
  const impl23569_501 = /* @__PURE__ */ __name(function() {
    return proj_get_scope_ex({});
  }, "impl23569_501");
  const impl23570_502 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_get_scope_ex", { "rettype": "string", "argtypes": [["obj", "pointer"], ["domainIdx", "int32"]] }, opts__224__auto__);
  }, "impl23570_502");
  const f23566 = /* @__PURE__ */ __name(function(...args23567) {
    const self23571_503 = this;
    const G__23637_504 = args23567.length;
    switch (G__23637_504) {
      case 0:
        return impl23569_501.call(self23571_503);
        break;
      case 1:
        return impl23570_502.call(self23571_503, args23567[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args23567.length ?? ""}`);
    }
    ;
  }, "f23566");
  return f23566;
})();
var proj_get_target_crs = /* @__PURE__ */ (() => {
  const impl23721_506 = /* @__PURE__ */ __name(function() {
    return proj_get_target_crs({});
  }, "impl23721_506");
  const impl23722_507 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_get_target_crs", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["pj", "pointer"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl23722_507");
  const f23718 = /* @__PURE__ */ __name(function(...args23719) {
    const self23723_508 = this;
    const G__23789_509 = args23719.length;
    switch (G__23789_509) {
      case 0:
        return impl23721_506.call(self23723_508);
        break;
      case 1:
        return impl23722_507.call(self23723_508, args23719[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args23719.length ?? ""}`);
    }
    ;
  }, "f23718");
  return f23718;
})();
var proj_get_area_of_use_ex = /* @__PURE__ */ (() => {
  const impl23873_511 = /* @__PURE__ */ __name(function() {
    return proj_get_area_of_use_ex({});
  }, "impl23873_511");
  const impl23874_512 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_get_area_of_use_ex", { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["west-lon-degree", "double"], ["south-lat-degree", "double"], ["east-lon-degree", "double"], ["north-lat-degree", "double"], ["area-name", "string"]], "argtypes": [["context", "pointer"], ["obj", "pointer"], ["domainIdx", "int32"], ["out_west_lon_degree", "pointer"], ["out_south_lat_degree", "pointer"], ["out_east_lon_degree", "pointer"], ["out_north_lat_degree", "pointer"], ["out_area_name", "pointer"]] }, opts__224__auto__);
  }, "impl23874_512");
  const f23870 = /* @__PURE__ */ __name(function(...args23871) {
    const self23875_513 = this;
    const G__23941_514 = args23871.length;
    switch (G__23941_514) {
      case 0:
        return impl23873_511.call(self23875_513);
        break;
      case 1:
        return impl23874_512.call(self23875_513, args23871[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args23871.length ?? ""}`);
    }
    ;
  }, "f23870");
  return f23870;
})();
var proj_get_id_auth_name = /* @__PURE__ */ (() => {
  const impl24025_516 = /* @__PURE__ */ __name(function() {
    return proj_get_id_auth_name({});
  }, "impl24025_516");
  const impl24026_517 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_get_id_auth_name", { "rettype": "string", "argtypes": [["obj", "pointer"], ["index", "int32"]] }, opts__224__auto__);
  }, "impl24026_517");
  const f24022 = /* @__PURE__ */ __name(function(...args24023) {
    const self24027_518 = this;
    const G__24093_519 = args24023.length;
    switch (G__24093_519) {
      case 0:
        return impl24025_516.call(self24027_518);
        break;
      case 1:
        return impl24026_517.call(self24027_518, args24023[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args24023.length ?? ""}`);
    }
    ;
  }, "f24022");
  return f24022;
})();
var proj_coordinate_metadata_create = /* @__PURE__ */ (() => {
  const impl24177_521 = /* @__PURE__ */ __name(function() {
    return proj_coordinate_metadata_create({});
  }, "impl24177_521");
  const impl24178_522 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_coordinate_metadata_create", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs", "pointer"], ["epoch", "float64"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl24178_522");
  const f24174 = /* @__PURE__ */ __name(function(...args24175) {
    const self24179_523 = this;
    const G__24245_524 = args24175.length;
    switch (G__24245_524) {
      case 0:
        return impl24177_521.call(self24179_523);
        break;
      case 1:
        return impl24178_522.call(self24179_523, args24175[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args24175.length ?? ""}`);
    }
    ;
  }, "f24174");
  return f24174;
})();
var proj_create_geocentric_crs_from_datum = /* @__PURE__ */ (() => {
  const impl24329_526 = /* @__PURE__ */ __name(function() {
    return proj_create_geocentric_crs_from_datum({});
  }, "impl24329_526");
  const impl24330_527 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_create_geocentric_crs_from_datum", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_name", "string"], ["datum_or_datum_ensemble", "pointer"], ["linear_units", "string"], ["linear_units_conv", "float64"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl24330_527");
  const f24326 = /* @__PURE__ */ __name(function(...args24327) {
    const self24331_528 = this;
    const G__24397_529 = args24327.length;
    switch (G__24397_529) {
      case 0:
        return impl24329_526.call(self24331_528);
        break;
      case 1:
        return impl24330_527.call(self24331_528, args24327[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args24327.length ?? ""}`);
    }
    ;
  }, "f24326");
  return f24326;
})();
var proj_crs_info_list_destroy = /* @__PURE__ */ (() => {
  const impl24481_531 = /* @__PURE__ */ __name(function() {
    return proj_crs_info_list_destroy({});
  }, "impl24481_531");
  const impl24482_532 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_crs_info_list_destroy", { "rettype": "void", "argtypes": [["list", "pointer"]] }, opts__224__auto__);
  }, "impl24482_532");
  const f24478 = /* @__PURE__ */ __name(function(...args24479) {
    const self24483_533 = this;
    const G__24549_534 = args24479.length;
    switch (G__24549_534) {
      case 0:
        return impl24481_531.call(self24483_533);
        break;
      case 1:
        return impl24482_532.call(self24483_533, args24479[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args24479.length ?? ""}`);
    }
    ;
  }, "f24478");
  return f24478;
})();
var proj_operation_factory_context_set_use_proj_alternative_grid_names = /* @__PURE__ */ (() => {
  const impl24633_536 = /* @__PURE__ */ __name(function() {
    return proj_operation_factory_context_set_use_proj_alternative_grid_names({});
  }, "impl24633_536");
  const impl24634_537 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_operation_factory_context_set_use_proj_alternative_grid_names", { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["usePROJNames", "int32"]] }, opts__224__auto__);
  }, "impl24634_537");
  const f24630 = /* @__PURE__ */ __name(function(...args24631) {
    const self24635_538 = this;
    const G__24701_539 = args24631.length;
    switch (G__24701_539) {
      case 0:
        return impl24633_536.call(self24635_538);
        break;
      case 1:
        return impl24634_537.call(self24635_538, args24631[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args24631.length ?? ""}`);
    }
    ;
  }, "f24630");
  return f24630;
})();
var proj_context_get_database_path = /* @__PURE__ */ (() => {
  const impl24785_541 = /* @__PURE__ */ __name(function() {
    return proj_context_get_database_path({});
  }, "impl24785_541");
  const impl24786_542 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_context_get_database_path", { "rettype": "string", "argtypes": [["context", "pointer"]] }, opts__224__auto__);
  }, "impl24786_542");
  const f24782 = /* @__PURE__ */ __name(function(...args24783) {
    const self24787_543 = this;
    const G__24853_544 = args24783.length;
    switch (G__24853_544) {
      case 0:
        return impl24785_541.call(self24787_543);
        break;
      case 1:
        return impl24786_542.call(self24787_543, args24783[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args24783.length ?? ""}`);
    }
    ;
  }, "f24782");
  return f24782;
})();
var proj_context_set_network_callbacks = /* @__PURE__ */ (() => {
  const impl24937_546 = /* @__PURE__ */ __name(function() {
    return proj_context_set_network_callbacks({});
  }, "impl24937_546");
  const impl24938_547 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_context_set_network_callbacks", { "rettype": "int32", "argtypes": [["context", "pointer"], ["open_cbk", "pointer"], ["close_cbk", "pointer"], ["get_header_cbk", "pointer"], ["read_range_cbk", "pointer"], ["user_data", "pointer?"]] }, opts__224__auto__);
  }, "impl24938_547");
  const f24934 = /* @__PURE__ */ __name(function(...args24935) {
    const self24939_548 = this;
    const G__25005_549 = args24935.length;
    switch (G__25005_549) {
      case 0:
        return impl24937_546.call(self24939_548);
        break;
      case 1:
        return impl24938_547.call(self24939_548, args24935[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args24935.length ?? ""}`);
    }
    ;
  }, "f24934");
  return f24934;
})();
var proj_is_crs = /* @__PURE__ */ (() => {
  const impl25089_551 = /* @__PURE__ */ __name(function() {
    return proj_is_crs({});
  }, "impl25089_551");
  const impl25090_552 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_is_crs", { "rettype": "int32", "argtypes": [["obj", "pointer"]] }, opts__224__auto__);
  }, "impl25090_552");
  const f25086 = /* @__PURE__ */ __name(function(...args25087) {
    const self25091_553 = this;
    const G__25157_554 = args25087.length;
    switch (G__25157_554) {
      case 0:
        return impl25089_551.call(self25091_553);
        break;
      case 1:
        return impl25090_552.call(self25091_553, args25087[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args25087.length ?? ""}`);
    }
    ;
  }, "f25086");
  return f25086;
})();
var proj_get_crs_list_parameters_destroy = /* @__PURE__ */ (() => {
  const impl25241_556 = /* @__PURE__ */ __name(function() {
    return proj_get_crs_list_parameters_destroy({});
  }, "impl25241_556");
  const impl25242_557 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_get_crs_list_parameters_destroy", { "rettype": "void", "argtypes": [["params", "pointer"]] }, opts__224__auto__);
  }, "impl25242_557");
  const f25238 = /* @__PURE__ */ __name(function(...args25239) {
    const self25243_558 = this;
    const G__25309_559 = args25239.length;
    switch (G__25309_559) {
      case 0:
        return impl25241_556.call(self25243_558);
        break;
      case 1:
        return impl25242_557.call(self25243_558, args25239[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args25239.length ?? ""}`);
    }
    ;
  }, "f25238");
  return f25238;
})();
var proj_xy_dist = /* @__PURE__ */ (() => {
  const impl25393_561 = /* @__PURE__ */ __name(function() {
    return proj_xy_dist({});
  }, "impl25393_561");
  const impl25394_562 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_xy_dist", { "rettype": "float64", "argtypes": [["a", "pointer"], ["b", "pointer"]] }, opts__224__auto__);
  }, "impl25394_562");
  const f25390 = /* @__PURE__ */ __name(function(...args25391) {
    const self25395_563 = this;
    const G__25461_564 = args25391.length;
    switch (G__25461_564) {
      case 0:
        return impl25393_561.call(self25395_563);
        break;
      case 1:
        return impl25394_562.call(self25395_563, args25391[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args25391.length ?? ""}`);
    }
    ;
  }, "f25390");
  return f25390;
})();
var proj_context_guess_wkt_dialect = /* @__PURE__ */ (() => {
  const impl25545_566 = /* @__PURE__ */ __name(function() {
    return proj_context_guess_wkt_dialect({});
  }, "impl25545_566");
  const impl25546_567 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_context_guess_wkt_dialect", { "rettype": "int32", "argtypes": [["context", "pointer"], ["wkt", "string"]] }, opts__224__auto__);
  }, "impl25546_567");
  const f25542 = /* @__PURE__ */ __name(function(...args25543) {
    const self25547_568 = this;
    const G__25613_569 = args25543.length;
    switch (G__25613_569) {
      case 0:
        return impl25545_566.call(self25547_568);
        break;
      case 1:
        return impl25546_567.call(self25547_568, args25543[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args25543.length ?? ""}`);
    }
    ;
  }, "f25542");
  return f25542;
})();
var proj_create_operation_factory_context = /* @__PURE__ */ (() => {
  const impl25697_571 = /* @__PURE__ */ __name(function() {
    return proj_create_operation_factory_context({});
  }, "impl25697_571");
  const impl25698_572 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_create_operation_factory_context", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["authority", "string"]], "proj-returns": "pj-operation-factory-context" }, opts__224__auto__);
  }, "impl25698_572");
  const f25694 = /* @__PURE__ */ __name(function(...args25695) {
    const self25699_573 = this;
    const G__25765_574 = args25695.length;
    switch (G__25765_574) {
      case 0:
        return impl25697_571.call(self25699_573);
        break;
      case 1:
        return impl25698_572.call(self25699_573, args25695[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args25695.length ?? ""}`);
    }
    ;
  }, "f25694");
  return f25694;
})();
var proj_list_destroy = /* @__PURE__ */ (() => {
  const impl25849_576 = /* @__PURE__ */ __name(function() {
    return proj_list_destroy({});
  }, "impl25849_576");
  const impl25850_577 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_list_destroy", { "rettype": "void", "argtypes": [["result", "pointer"]] }, opts__224__auto__);
  }, "impl25850_577");
  const f25846 = /* @__PURE__ */ __name(function(...args25847) {
    const self25851_578 = this;
    const G__25917_579 = args25847.length;
    switch (G__25917_579) {
      case 0:
        return impl25849_576.call(self25851_578);
        break;
      case 1:
        return impl25850_577.call(self25851_578, args25847[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args25847.length ?? ""}`);
    }
    ;
  }, "f25846");
  return f25846;
})();
var proj_cs_get_type = /* @__PURE__ */ (() => {
  const impl26001_581 = /* @__PURE__ */ __name(function() {
    return proj_cs_get_type({});
  }, "impl26001_581");
  const impl26002_582 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_cs_get_type", { "rettype": "int32", "argtypes": [["context", "pointer"], ["cs", "pointer"]] }, opts__224__auto__);
  }, "impl26002_582");
  const f25998 = /* @__PURE__ */ __name(function(...args25999) {
    const self26003_583 = this;
    const G__26069_584 = args25999.length;
    switch (G__26069_584) {
      case 0:
        return impl26001_581.call(self26003_583);
        break;
      case 1:
        return impl26002_582.call(self26003_583, args25999[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args25999.length ?? ""}`);
    }
    ;
  }, "f25998");
  return f25998;
})();
var proj_as_wkt = /* @__PURE__ */ (() => {
  const impl26153_586 = /* @__PURE__ */ __name(function() {
    return proj_as_wkt({});
  }, "impl26153_586");
  const impl26154_587 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_as_wkt", { "rettype": "string", "argtypes": [["context", "pointer"], ["pj", "pointer"], ["type", "int32"], ["options", "pointer?"]], "argsemantics": [["options", "string-array?", "default", null], ["type", "int32", "default", 2]] }, opts__224__auto__);
  }, "impl26154_587");
  const f26150 = /* @__PURE__ */ __name(function(...args26151) {
    const self26155_588 = this;
    const G__26221_589 = args26151.length;
    switch (G__26221_589) {
      case 0:
        return impl26153_586.call(self26155_588);
        break;
      case 1:
        return impl26154_587.call(self26155_588, args26151[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args26151.length ?? ""}`);
    }
    ;
  }, "f26150");
  return f26150;
})();
var proj_insert_object_session_create = /* @__PURE__ */ (() => {
  const impl26305_591 = /* @__PURE__ */ __name(function() {
    return proj_insert_object_session_create({});
  }, "impl26305_591");
  const impl26306_592 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_insert_object_session_create", { "rettype": "pointer", "argtypes": [["context", "pointer"]], "proj-returns": "pj-insert-session" }, opts__224__auto__);
  }, "impl26306_592");
  const f26302 = /* @__PURE__ */ __name(function(...args26303) {
    const self26307_593 = this;
    const G__26373_594 = args26303.length;
    switch (G__26373_594) {
      case 0:
        return impl26305_591.call(self26307_593);
        break;
      case 1:
        return impl26306_592.call(self26307_593, args26303[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args26303.length ?? ""}`);
    }
    ;
  }, "f26302");
  return f26302;
})();
var proj_convert_conversion_to_other_method = /* @__PURE__ */ (() => {
  const impl26457_596 = /* @__PURE__ */ __name(function() {
    return proj_convert_conversion_to_other_method({});
  }, "impl26457_596");
  const impl26458_597 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_convert_conversion_to_other_method", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["conversion", "pointer"], ["new_method_epsg_code", "int32"], ["new_method_name", "string"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl26458_597");
  const f26454 = /* @__PURE__ */ __name(function(...args26455) {
    const self26459_598 = this;
    const G__26525_599 = args26455.length;
    switch (G__26525_599) {
      case 0:
        return impl26457_596.call(self26459_598);
        break;
      case 1:
        return impl26458_597.call(self26459_598, args26455[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args26455.length ?? ""}`);
    }
    ;
  }, "f26454");
  return f26454;
})();
var proj_operation_factory_context_set_desired_accuracy = /* @__PURE__ */ (() => {
  const impl26609_601 = /* @__PURE__ */ __name(function() {
    return proj_operation_factory_context_set_desired_accuracy({});
  }, "impl26609_601");
  const impl26610_602 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_operation_factory_context_set_desired_accuracy", { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["accuracy", "float64"]] }, opts__224__auto__);
  }, "impl26610_602");
  const f26606 = /* @__PURE__ */ __name(function(...args26607) {
    const self26611_603 = this;
    const G__26677_604 = args26607.length;
    switch (G__26677_604) {
      case 0:
        return impl26609_601.call(self26611_603);
        break;
      case 1:
        return impl26610_602.call(self26611_603, args26607[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args26607.length ?? ""}`);
    }
    ;
  }, "f26606");
  return f26606;
})();
var proj_list_get = /* @__PURE__ */ (() => {
  const impl26761_606 = /* @__PURE__ */ __name(function() {
    return proj_list_get({});
  }, "impl26761_606");
  const impl26762_607 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_list_get", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["result", "pointer"], ["index", "int32"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl26762_607");
  const f26758 = /* @__PURE__ */ __name(function(...args26759) {
    const self26763_608 = this;
    const G__26829_609 = args26759.length;
    switch (G__26829_609) {
      case 0:
        return impl26761_606.call(self26763_608);
        break;
      case 1:
        return impl26762_607.call(self26763_608, args26759[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args26759.length ?? ""}`);
    }
    ;
  }, "f26758");
  return f26758;
})();
var proj_create_geographic_crs_from_datum = /* @__PURE__ */ (() => {
  const impl26913_611 = /* @__PURE__ */ __name(function() {
    return proj_create_geographic_crs_from_datum({});
  }, "impl26913_611");
  const impl26914_612 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_create_geographic_crs_from_datum", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_name", "string"], ["datum_or_datum_ensemble", "pointer"], ["ellipsoidal_cs", "pointer"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl26914_612");
  const f26910 = /* @__PURE__ */ __name(function(...args26911) {
    const self26915_613 = this;
    const G__26981_614 = args26911.length;
    switch (G__26981_614) {
      case 0:
        return impl26913_611.call(self26915_613);
        break;
      case 1:
        return impl26914_612.call(self26915_613, args26911[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args26911.length ?? ""}`);
    }
    ;
  }, "f26910");
  return f26910;
})();
var proj_get_name = /* @__PURE__ */ (() => {
  const impl27065_616 = /* @__PURE__ */ __name(function() {
    return proj_get_name({});
  }, "impl27065_616");
  const impl27066_617 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_get_name", { "rettype": "string", "argtypes": [["obj", "pointer"]] }, opts__224__auto__);
  }, "impl27066_617");
  const f27062 = /* @__PURE__ */ __name(function(...args27063) {
    const self27067_618 = this;
    const G__27133_619 = args27063.length;
    switch (G__27133_619) {
      case 0:
        return impl27065_616.call(self27067_618);
        break;
      case 1:
        return impl27066_617.call(self27067_618, args27063[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args27063.length ?? ""}`);
    }
    ;
  }, "f27062");
  return f27062;
})();
var proj_crs_alter_parameters_linear_unit = /* @__PURE__ */ (() => {
  const impl27217_621 = /* @__PURE__ */ __name(function() {
    return proj_crs_alter_parameters_linear_unit({});
  }, "impl27217_621");
  const impl27218_622 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_crs_alter_parameters_linear_unit", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["obj", "pointer"], ["linear_units", "string"], ["linear_units_conv", "float64"], ["unit_auth_name", "string"], ["unit_code", "string"], ["convert_to_new_unit", "int32"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl27218_622");
  const f27214 = /* @__PURE__ */ __name(function(...args27215) {
    const self27219_623 = this;
    const G__27285_624 = args27215.length;
    switch (G__27285_624) {
      case 0:
        return impl27217_621.call(self27219_623);
        break;
      case 1:
        return impl27218_622.call(self27219_623, args27215[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args27215.length ?? ""}`);
    }
    ;
  }, "f27214");
  return f27214;
})();
var proj_coordoperation_is_instantiable = /* @__PURE__ */ (() => {
  const impl27369_626 = /* @__PURE__ */ __name(function() {
    return proj_coordoperation_is_instantiable({});
  }, "impl27369_626");
  const impl27370_627 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_coordoperation_is_instantiable", { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["coordoperation", "pointer"]] }, opts__224__auto__);
  }, "impl27370_627");
  const f27366 = /* @__PURE__ */ __name(function(...args27367) {
    const self27371_628 = this;
    const G__27437_629 = args27367.length;
    switch (G__27437_629) {
      case 0:
        return impl27369_626.call(self27371_628);
        break;
      case 1:
        return impl27370_627.call(self27371_628, args27367[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args27367.length ?? ""}`);
    }
    ;
  }, "f27366");
  return f27366;
})();
var proj_crs_alter_cs_angular_unit = /* @__PURE__ */ (() => {
  const impl27521_631 = /* @__PURE__ */ __name(function() {
    return proj_crs_alter_cs_angular_unit({});
  }, "impl27521_631");
  const impl27522_632 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_crs_alter_cs_angular_unit", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["obj", "pointer"], ["angular_units", "string"], ["angular_units_conv", "float64"], ["unit_auth_name", "string"], ["unit_code", "string"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl27522_632");
  const f27518 = /* @__PURE__ */ __name(function(...args27519) {
    const self27523_633 = this;
    const G__27589_634 = args27519.length;
    switch (G__27589_634) {
      case 0:
        return impl27521_631.call(self27523_633);
        break;
      case 1:
        return impl27522_632.call(self27523_633, args27519[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args27519.length ?? ""}`);
    }
    ;
  }, "f27518");
  return f27518;
})();
var proj_datum_ensemble_get_member_count = /* @__PURE__ */ (() => {
  const impl27673_636 = /* @__PURE__ */ __name(function() {
    return proj_datum_ensemble_get_member_count({});
  }, "impl27673_636");
  const impl27674_637 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_datum_ensemble_get_member_count", { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["datum_ensemble", "pointer"]] }, opts__224__auto__);
  }, "impl27674_637");
  const f27670 = /* @__PURE__ */ __name(function(...args27671) {
    const self27675_638 = this;
    const G__27741_639 = args27671.length;
    switch (G__27741_639) {
      case 0:
        return impl27673_636.call(self27675_638);
        break;
      case 1:
        return impl27674_637.call(self27675_638, args27671[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args27671.length ?? ""}`);
    }
    ;
  }, "f27670");
  return f27670;
})();
var proj_create_vertical_crs = /* @__PURE__ */ (() => {
  const impl27825_641 = /* @__PURE__ */ __name(function() {
    return proj_create_vertical_crs({});
  }, "impl27825_641");
  const impl27826_642 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_create_vertical_crs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_name", "string"], ["datum_name", "string"], ["linear_units", "string"], ["linear_units_conv", "float64"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl27826_642");
  const f27822 = /* @__PURE__ */ __name(function(...args27823) {
    const self27827_643 = this;
    const G__27893_644 = args27823.length;
    switch (G__27893_644) {
      case 0:
        return impl27825_641.call(self27827_643);
        break;
      case 1:
        return impl27826_642.call(self27827_643, args27823[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args27823.length ?? ""}`);
    }
    ;
  }, "f27822");
  return f27822;
})();
var proj_get_domain_count = /* @__PURE__ */ (() => {
  const impl27977_646 = /* @__PURE__ */ __name(function() {
    return proj_get_domain_count({});
  }, "impl27977_646");
  const impl27978_647 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_get_domain_count", { "rettype": "int32", "argtypes": [["obj", "pointer"]] }, opts__224__auto__);
  }, "impl27978_647");
  const f27974 = /* @__PURE__ */ __name(function(...args27975) {
    const self27979_648 = this;
    const G__28045_649 = args27975.length;
    switch (G__28045_649) {
      case 0:
        return impl27977_646.call(self27979_648);
        break;
      case 1:
        return impl27978_647.call(self27979_648, args27975[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args27975.length ?? ""}`);
    }
    ;
  }, "f27974");
  return f27974;
})();
var proj_get_id_code = /* @__PURE__ */ (() => {
  const impl28129_651 = /* @__PURE__ */ __name(function() {
    return proj_get_id_code({});
  }, "impl28129_651");
  const impl28130_652 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_get_id_code", { "rettype": "string", "argtypes": [["obj", "pointer"], ["index", "int32"]] }, opts__224__auto__);
  }, "impl28130_652");
  const f28126 = /* @__PURE__ */ __name(function(...args28127) {
    const self28131_653 = this;
    const G__28197_654 = args28127.length;
    switch (G__28197_654) {
      case 0:
        return impl28129_651.call(self28131_653);
        break;
      case 1:
        return impl28130_652.call(self28131_653, args28127[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args28127.length ?? ""}`);
    }
    ;
  }, "f28126");
  return f28126;
})();
var proj_operation_factory_context_set_spatial_criterion = /* @__PURE__ */ (() => {
  const impl28281_656 = /* @__PURE__ */ __name(function() {
    return proj_operation_factory_context_set_spatial_criterion({});
  }, "impl28281_656");
  const impl28282_657 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_operation_factory_context_set_spatial_criterion", { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["criterion", "int32"]] }, opts__224__auto__);
  }, "impl28282_657");
  const f28278 = /* @__PURE__ */ __name(function(...args28279) {
    const self28283_658 = this;
    const G__28349_659 = args28279.length;
    switch (G__28349_659) {
      case 0:
        return impl28281_656.call(self28283_658);
        break;
      case 1:
        return impl28282_657.call(self28283_658, args28279[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args28279.length ?? ""}`);
    }
    ;
  }, "f28278");
  return f28278;
})();
var proj_create_ellipsoidal_3D_cs = /* @__PURE__ */ (() => {
  const impl28433_661 = /* @__PURE__ */ __name(function() {
    return proj_create_ellipsoidal_3D_cs({});
  }, "impl28433_661");
  const impl28434_662 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_create_ellipsoidal_3D_cs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["type", "int32"], ["horizontal_angular_unit_name", "string"], ["horizontal_angular_unit_conv_factor", "float64"], ["vertical_linear_unit_name", "string"], ["vertical_linear_unit_conv_factor", "float64"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl28434_662");
  const f28430 = /* @__PURE__ */ __name(function(...args28431) {
    const self28435_663 = this;
    const G__28501_664 = args28431.length;
    switch (G__28501_664) {
      case 0:
        return impl28433_661.call(self28435_663);
        break;
      case 1:
        return impl28434_662.call(self28435_663, args28431[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args28431.length ?? ""}`);
    }
    ;
  }, "f28430");
  return f28430;
})();
var proj_create_operations = /* @__PURE__ */ (() => {
  const impl28585_666 = /* @__PURE__ */ __name(function() {
    return proj_create_operations({});
  }, "impl28585_666");
  const impl28586_667 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_create_operations", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["source_crs", "pointer"], ["target_crs", "pointer"], ["operationContext", "pointer"]], "proj-returns": "pj-list" }, opts__224__auto__);
  }, "impl28586_667");
  const f28582 = /* @__PURE__ */ __name(function(...args28583) {
    const self28587_668 = this;
    const G__28653_669 = args28583.length;
    switch (G__28653_669) {
      case 0:
        return impl28585_666.call(self28587_668);
        break;
      case 1:
        return impl28586_667.call(self28587_668, args28583[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args28583.length ?? ""}`);
    }
    ;
  }, "f28582");
  return f28582;
})();
var proj_grid_get_info_from_database = /* @__PURE__ */ (() => {
  const impl28737_671 = /* @__PURE__ */ __name(function() {
    return proj_grid_get_info_from_database({});
  }, "impl28737_671");
  const impl28738_672 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_grid_get_info_from_database", { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["full-name", "string"], ["package-name", "string"], ["url", "string"], ["direct-download", "int"], ["open-license", "int"], ["available", "int"]], "argtypes": [["context", "pointer"], ["grid_name", "string"], ["out_full_name", "pointer"], ["out_package_name", "pointer"], ["out_url", "pointer"], ["out_direct_download", "pointer"], ["out_open_license", "pointer"], ["out_available", "pointer"]] }, opts__224__auto__);
  }, "impl28738_672");
  const f28734 = /* @__PURE__ */ __name(function(...args28735) {
    const self28739_673 = this;
    const G__28805_674 = args28735.length;
    switch (G__28805_674) {
      case 0:
        return impl28737_671.call(self28739_673);
        break;
      case 1:
        return impl28738_672.call(self28739_673, args28735[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args28735.length ?? ""}`);
    }
    ;
  }, "f28734");
  return f28734;
})();
var proj_dynamic_datum_get_frame_reference_epoch = /* @__PURE__ */ (() => {
  const impl28889_676 = /* @__PURE__ */ __name(function() {
    return proj_dynamic_datum_get_frame_reference_epoch({});
  }, "impl28889_676");
  const impl28890_677 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_dynamic_datum_get_frame_reference_epoch", { "rettype": "float64", "argtypes": [["ctx", "pointer"], ["datum", "pointer"]] }, opts__224__auto__);
  }, "impl28890_677");
  const f28886 = /* @__PURE__ */ __name(function(...args28887) {
    const self28891_678 = this;
    const G__28957_679 = args28887.length;
    switch (G__28957_679) {
      case 0:
        return impl28889_676.call(self28891_678);
        break;
      case 1:
        return impl28890_677.call(self28891_678, args28887[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args28887.length ?? ""}`);
    }
    ;
  }, "f28886");
  return f28886;
})();
var proj_log_level = /* @__PURE__ */ (() => {
  const impl29041_681 = /* @__PURE__ */ __name(function() {
    return proj_log_level({});
  }, "impl29041_681");
  const impl29042_682 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_log_level", { "rettype": "int32", "argtypes": [["context", "pointer"], ["level", "int32"]] }, opts__224__auto__);
  }, "impl29042_682");
  const f29038 = /* @__PURE__ */ __name(function(...args29039) {
    const self29043_683 = this;
    const G__29109_684 = args29039.length;
    switch (G__29109_684) {
      case 0:
        return impl29041_681.call(self29043_683);
        break;
      case 1:
        return impl29042_682.call(self29043_683, args29039[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args29039.length ?? ""}`);
    }
    ;
  }, "f29038");
  return f29038;
})();
var proj_context_set_autoclose_database = /* @__PURE__ */ (() => {
  const impl29193_686 = /* @__PURE__ */ __name(function() {
    return proj_context_set_autoclose_database({});
  }, "impl29193_686");
  const impl29194_687 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_context_set_autoclose_database", { "rettype": "void", "argtypes": [["context", "pointer"], ["autoclose", "int32"]] }, opts__224__auto__);
  }, "impl29194_687");
  const f29190 = /* @__PURE__ */ __name(function(...args29191) {
    const self29195_688 = this;
    const G__29261_689 = args29191.length;
    switch (G__29261_689) {
      case 0:
        return impl29193_686.call(self29195_688);
        break;
      case 1:
        return impl29194_687.call(self29195_688, args29191[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args29191.length ?? ""}`);
    }
    ;
  }, "f29190");
  return f29190;
})();
var proj_create_vertical_crs_ex = /* @__PURE__ */ (() => {
  const impl29345_691 = /* @__PURE__ */ __name(function() {
    return proj_create_vertical_crs_ex({});
  }, "impl29345_691");
  const impl29346_692 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_create_vertical_crs_ex", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_name", "string"], ["datum_name", "string"], ["datum_auth_name", "string"], ["datum_code", "string"], ["linear_units", "string"], ["linear_units_conv", "float64"], ["geoid_model_name", "string"], ["geoid_model_auth_name", "string"], ["geoid_model_code", "string"], ["geoid_geog_crs", "pointer"], ["options", "pointer"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl29346_692");
  const f29342 = /* @__PURE__ */ __name(function(...args29343) {
    const self29347_693 = this;
    const G__29413_694 = args29343.length;
    switch (G__29413_694) {
      case 0:
        return impl29345_691.call(self29347_693);
        break;
      case 1:
        return impl29346_692.call(self29347_693, args29343[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args29343.length ?? ""}`);
    }
    ;
  }, "f29342");
  return f29342;
})();
var proj_cs_get_axis_count = /* @__PURE__ */ (() => {
  const impl29497_696 = /* @__PURE__ */ __name(function() {
    return proj_cs_get_axis_count({});
  }, "impl29497_696");
  const impl29498_697 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_cs_get_axis_count", { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["cs", "pointer"]] }, opts__224__auto__);
  }, "impl29498_697");
  const f29494 = /* @__PURE__ */ __name(function(...args29495) {
    const self29499_698 = this;
    const G__29565_699 = args29495.length;
    switch (G__29565_699) {
      case 0:
        return impl29497_696.call(self29499_698);
        break;
      case 1:
        return impl29498_697.call(self29499_698, args29495[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args29495.length ?? ""}`);
    }
    ;
  }, "f29494");
  return f29494;
})();
var proj_identify = /* @__PURE__ */ (() => {
  const impl29649_701 = /* @__PURE__ */ __name(function() {
    return proj_identify({});
  }, "impl29649_701");
  const impl29650_702 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_identify", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["obj", "pointer"], ["auth_name", "string"], ["options", "pointer"], ["out_confidence", "pointer"]], "proj-returns": "pj-list" }, opts__224__auto__);
  }, "impl29650_702");
  const f29646 = /* @__PURE__ */ __name(function(...args29647) {
    const self29651_703 = this;
    const G__29717_704 = args29647.length;
    switch (G__29717_704) {
      case 0:
        return impl29649_701.call(self29651_703);
        break;
      case 1:
        return impl29650_702.call(self29651_703, args29647[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args29647.length ?? ""}`);
    }
    ;
  }, "f29646");
  return f29646;
})();
var proj_suggests_code_for = /* @__PURE__ */ (() => {
  const impl29801_706 = /* @__PURE__ */ __name(function() {
    return proj_suggests_code_for({});
  }, "impl29801_706");
  const impl29802_707 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_suggests_code_for", { "rettype": "string", "argtypes": [["context", "pointer"], ["object", "pointer"], ["authority", "string"], ["numeric_code", "int32"], ["options", "pointer"]] }, opts__224__auto__);
  }, "impl29802_707");
  const f29798 = /* @__PURE__ */ __name(function(...args29799) {
    const self29803_708 = this;
    const G__29869_709 = args29799.length;
    switch (G__29869_709) {
      case 0:
        return impl29801_706.call(self29803_708);
        break;
      case 1:
        return impl29802_707.call(self29803_708, args29799[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args29799.length ?? ""}`);
    }
    ;
  }, "f29798");
  return f29798;
})();
var proj_concatoperation_get_step = /* @__PURE__ */ (() => {
  const impl29953_711 = /* @__PURE__ */ __name(function() {
    return proj_concatoperation_get_step({});
  }, "impl29953_711");
  const impl29954_712 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_concatoperation_get_step", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["concatoperation", "pointer"], ["i_step", "int32"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl29954_712");
  const f29950 = /* @__PURE__ */ __name(function(...args29951) {
    const self29955_713 = this;
    const G__30021_714 = args29951.length;
    switch (G__30021_714) {
      case 0:
        return impl29953_711.call(self29955_713);
        break;
      case 1:
        return impl29954_712.call(self29955_713, args29951[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args29951.length ?? ""}`);
    }
    ;
  }, "f29950");
  return f29950;
})();
var proj_datum_ensemble_get_member = /* @__PURE__ */ (() => {
  const impl30105_716 = /* @__PURE__ */ __name(function() {
    return proj_datum_ensemble_get_member({});
  }, "impl30105_716");
  const impl30106_717 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_datum_ensemble_get_member", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["datum_ensemble", "pointer"], ["member_index", "int32"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl30106_717");
  const f30102 = /* @__PURE__ */ __name(function(...args30103) {
    const self30107_718 = this;
    const G__30173_719 = args30103.length;
    switch (G__30173_719) {
      case 0:
        return impl30105_716.call(self30107_718);
        break;
      case 1:
        return impl30106_717.call(self30107_718, args30103[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args30103.length ?? ""}`);
    }
    ;
  }, "f30102");
  return f30102;
})();
var proj_crs_get_datum_forced = /* @__PURE__ */ (() => {
  const impl30257_721 = /* @__PURE__ */ __name(function() {
    return proj_crs_get_datum_forced({});
  }, "impl30257_721");
  const impl30258_722 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_crs_get_datum_forced", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl30258_722");
  const f30254 = /* @__PURE__ */ __name(function(...args30255) {
    const self30259_723 = this;
    const G__30325_724 = args30255.length;
    switch (G__30325_724) {
      case 0:
        return impl30257_721.call(self30259_723);
        break;
      case 1:
        return impl30258_722.call(self30259_723, args30255[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args30255.length ?? ""}`);
    }
    ;
  }, "f30254");
  return f30254;
})();
var proj_crs_create_bound_crs_to_WGS84 = /* @__PURE__ */ (() => {
  const impl30409_726 = /* @__PURE__ */ __name(function() {
    return proj_crs_create_bound_crs_to_WGS84({});
  }, "impl30409_726");
  const impl30410_727 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_crs_create_bound_crs_to_WGS84", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs", "pointer"], ["options", "pointer"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl30410_727");
  const f30406 = /* @__PURE__ */ __name(function(...args30407) {
    const self30411_728 = this;
    const G__30477_729 = args30407.length;
    switch (G__30477_729) {
      case 0:
        return impl30409_726.call(self30411_728);
        break;
      case 1:
        return impl30410_727.call(self30411_728, args30407[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args30407.length ?? ""}`);
    }
    ;
  }, "f30406");
  return f30406;
})();
var proj_crs_get_sub_crs = /* @__PURE__ */ (() => {
  const impl30561_731 = /* @__PURE__ */ __name(function() {
    return proj_crs_get_sub_crs({});
  }, "impl30561_731");
  const impl30562_732 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_crs_get_sub_crs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs", "pointer"], ["index", "int32"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl30562_732");
  const f30558 = /* @__PURE__ */ __name(function(...args30559) {
    const self30563_733 = this;
    const G__30629_734 = args30559.length;
    switch (G__30629_734) {
      case 0:
        return impl30561_731.call(self30563_733);
        break;
      case 1:
        return impl30562_732.call(self30563_733, args30559[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args30559.length ?? ""}`);
    }
    ;
  }, "f30558");
  return f30558;
})();
var proj_get_celestial_body_name = /* @__PURE__ */ (() => {
  const impl30713_736 = /* @__PURE__ */ __name(function() {
    return proj_get_celestial_body_name({});
  }, "impl30713_736");
  const impl30714_737 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_get_celestial_body_name", { "rettype": "string", "argtypes": [["ctx", "pointer"], ["obj", "pointer"]] }, opts__224__auto__);
  }, "impl30714_737");
  const f30710 = /* @__PURE__ */ __name(function(...args30711) {
    const self30715_738 = this;
    const G__30781_739 = args30711.length;
    switch (G__30781_739) {
      case 0:
        return impl30713_736.call(self30715_738);
        break;
      case 1:
        return impl30714_737.call(self30715_738, args30711[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args30711.length ?? ""}`);
    }
    ;
  }, "f30710");
  return f30710;
})();
var proj_insert_object_session_destroy = /* @__PURE__ */ (() => {
  const impl30865_741 = /* @__PURE__ */ __name(function() {
    return proj_insert_object_session_destroy({});
  }, "impl30865_741");
  const impl30866_742 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_insert_object_session_destroy", { "rettype": "void", "argtypes": [["context", "pointer"], ["session", "pointer"]] }, opts__224__auto__);
  }, "impl30866_742");
  const f30862 = /* @__PURE__ */ __name(function(...args30863) {
    const self30867_743 = this;
    const G__30933_744 = args30863.length;
    switch (G__30933_744) {
      case 0:
        return impl30865_741.call(self30867_743);
        break;
      case 1:
        return impl30866_742.call(self30867_743, args30863[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args30863.length ?? ""}`);
    }
    ;
  }, "f30862");
  return f30862;
})();
var proj_create_engineering_crs = /* @__PURE__ */ (() => {
  const impl31017_746 = /* @__PURE__ */ __name(function() {
    return proj_create_engineering_crs({});
  }, "impl31017_746");
  const impl31018_747 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_create_engineering_crs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crsName", "string"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl31018_747");
  const f31014 = /* @__PURE__ */ __name(function(...args31015) {
    const self31019_748 = this;
    const G__31085_749 = args31015.length;
    switch (G__31085_749) {
      case 0:
        return impl31017_746.call(self31019_748);
        break;
      case 1:
        return impl31018_747.call(self31019_748, args31015[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args31015.length ?? ""}`);
    }
    ;
  }, "f31014");
  return f31014;
})();
var proj_crs_get_geodetic_crs = /* @__PURE__ */ (() => {
  const impl31169_751 = /* @__PURE__ */ __name(function() {
    return proj_crs_get_geodetic_crs({});
  }, "impl31169_751");
  const impl31170_752 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_crs_get_geodetic_crs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl31170_752");
  const f31166 = /* @__PURE__ */ __name(function(...args31167) {
    const self31171_753 = this;
    const G__31237_754 = args31167.length;
    switch (G__31237_754) {
      case 0:
        return impl31169_751.call(self31171_753);
        break;
      case 1:
        return impl31170_752.call(self31171_753, args31167[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args31167.length ?? ""}`);
    }
    ;
  }, "f31166");
  return f31166;
})();
var proj_create_from_wkt = /* @__PURE__ */ (() => {
  const impl31321_756 = /* @__PURE__ */ __name(function() {
    return proj_create_from_wkt({});
  }, "impl31321_756");
  const impl31322_757 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_create_from_wkt", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["wkt", "string"], ["options", "pointer?"], ["out_warnings", "pointer?"], ["out_grammar_errors", "pointer?"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl31322_757");
  const f31318 = /* @__PURE__ */ __name(function(...args31319) {
    const self31323_758 = this;
    const G__31389_759 = args31319.length;
    switch (G__31389_759) {
      case 0:
        return impl31321_756.call(self31323_758);
        break;
      case 1:
        return impl31322_757.call(self31323_758, args31319[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args31319.length ?? ""}`);
    }
    ;
  }, "f31318");
  return f31318;
})();
var proj_crs_is_dynamic = /* @__PURE__ */ (() => {
  const impl31473_761 = /* @__PURE__ */ __name(function() {
    return proj_crs_is_dynamic({});
  }, "impl31473_761");
  const impl31474_762 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_crs_is_dynamic", { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]] }, opts__224__auto__);
  }, "impl31474_762");
  const f31470 = /* @__PURE__ */ __name(function(...args31471) {
    const self31475_763 = this;
    const G__31541_764 = args31471.length;
    switch (G__31541_764) {
      case 0:
        return impl31473_761.call(self31475_763);
        break;
      case 1:
        return impl31474_762.call(self31475_763, args31471[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args31471.length ?? ""}`);
    }
    ;
  }, "f31470");
  return f31470;
})();
var proj_crs_get_horizontal_datum = /* @__PURE__ */ (() => {
  const impl31625_766 = /* @__PURE__ */ __name(function() {
    return proj_crs_get_horizontal_datum({});
  }, "impl31625_766");
  const impl31626_767 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_crs_get_horizontal_datum", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]], "proj-returns": "pj" }, opts__224__auto__);
  }, "impl31626_767");
  const f31622 = /* @__PURE__ */ __name(function(...args31623) {
    const self31627_768 = this;
    const G__31693_769 = args31623.length;
    switch (G__31693_769) {
      case 0:
        return impl31625_766.call(self31627_768);
        break;
      case 1:
        return impl31626_767.call(self31627_768, args31623[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args31623.length ?? ""}`);
    }
    ;
  }, "f31622");
  return f31622;
})();
var proj_get_codes_from_database = /* @__PURE__ */ (() => {
  const impl31777_771 = /* @__PURE__ */ __name(function() {
    return proj_get_codes_from_database({});
  }, "impl31777_771");
  const impl31778_772 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_get_codes_from_database", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["auth_name", "string"], ["type", "int32", "default", 8], ["allow_deprecated", "int32", "default", 1]], "proj-returns": "string-list" }, opts__224__auto__);
  }, "impl31778_772");
  const f31774 = /* @__PURE__ */ __name(function(...args31775) {
    const self31779_773 = this;
    const G__31845_774 = args31775.length;
    switch (G__31845_774) {
      case 0:
        return impl31777_771.call(self31779_773);
        break;
      case 1:
        return impl31778_772.call(self31779_773, args31775[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args31775.length ?? ""}`);
    }
    ;
  }, "f31774");
  return f31774;
})();
var proj_as_projjson = /* @__PURE__ */ (() => {
  const impl31929_776 = /* @__PURE__ */ __name(function() {
    return proj_as_projjson({});
  }, "impl31929_776");
  const impl31930_777 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_as_projjson", { "rettype": "string", "argtypes": [["context", "pointer"], ["pj", "pointer"], ["options", "pointer?"]], "argsemantics": [["options", "string-array?", "default", null]] }, opts__224__auto__);
  }, "impl31930_777");
  const f31926 = /* @__PURE__ */ __name(function(...args31927) {
    const self31931_778 = this;
    const G__31997_779 = args31927.length;
    switch (G__31997_779) {
      case 0:
        return impl31929_776.call(self31931_778);
        break;
      case 1:
        return impl31930_777.call(self31931_778, args31927[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args31927.length ?? ""}`);
    }
    ;
  }, "f31926");
  return f31926;
})();
var proj_get_non_deprecated = /* @__PURE__ */ (() => {
  const impl32081_781 = /* @__PURE__ */ __name(function() {
    return proj_get_non_deprecated({});
  }, "impl32081_781");
  const impl32082_782 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_get_non_deprecated", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["obj", "pointer"]], "proj-returns": "pj-list" }, opts__224__auto__);
  }, "impl32082_782");
  const f32078 = /* @__PURE__ */ __name(function(...args32079) {
    const self32083_783 = this;
    const G__32149_784 = args32079.length;
    switch (G__32149_784) {
      case 0:
        return impl32081_781.call(self32083_783);
        break;
      case 1:
        return impl32082_782.call(self32083_783, args32079[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args32079.length ?? ""}`);
    }
    ;
  }, "f32078");
  return f32078;
})();
var proj_coordoperation_get_param_count = /* @__PURE__ */ (() => {
  const impl32233_786 = /* @__PURE__ */ __name(function() {
    return proj_coordoperation_get_param_count({});
  }, "impl32233_786");
  const impl32234_787 = /* @__PURE__ */ __name(function(opts__224__auto__) {
    return dispatch_proj_fn("proj_coordoperation_get_param_count", { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["coordoperation", "pointer"]] }, opts__224__auto__);
  }, "impl32234_787");
  const f32230 = /* @__PURE__ */ __name(function(...args32231) {
    const self32235_788 = this;
    const G__32301_789 = args32231.length;
    switch (G__32301_789) {
      case 0:
        return impl32233_786.call(self32235_788);
        break;
      case 1:
        return impl32234_787.call(self32235_788, args32231[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args32231.length ?? ""}`);
    }
    ;
  }, "f32230");
  return f32230;
})();
var projCrsCreateBoundCrs = /* @__PURE__ */ (() => {
  const impl32385_791 = /* @__PURE__ */ __name(async function() {
    return projCrsCreateBoundCrs({});
  }, "impl32385_791");
  const impl32386_792 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_crs_create_bound_crs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["base_crs", "pointer"], ["hub_crs", "pointer"], ["transformation", "pointer"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl32386_792");
  const f32382 = /* @__PURE__ */ __name(function(...args32383) {
    const self32387_793 = this;
    const G__32453_794 = args32383.length;
    switch (G__32453_794) {
      case 0:
        return impl32385_791.call(self32387_793);
        break;
      case 1:
        return impl32386_792.call(self32387_793, args32383[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args32383.length ?? ""}`);
    }
    ;
  }, "f32382");
  return f32382;
})();
var projContextCreate = /* @__PURE__ */ (() => {
  const impl32537_796 = /* @__PURE__ */ __name(async function() {
    return projContextCreate({});
  }, "impl32537_796");
  const impl32538_797 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_context_create", { "rettype": "pointer", "argtypes": [], "proj-returns": "pj-context", "is-context-fn": false }, opts__225__auto__, "camel");
  }, "impl32538_797");
  const f32534 = /* @__PURE__ */ __name(function(...args32535) {
    const self32539_798 = this;
    const G__32605_799 = args32535.length;
    switch (G__32605_799) {
      case 0:
        return impl32537_796.call(self32539_798);
        break;
      case 1:
        return impl32538_797.call(self32539_798, args32535[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args32535.length ?? ""}`);
    }
    ;
  }, "f32534");
  return f32534;
})();
var projGetCrsListParametersCreate = /* @__PURE__ */ (() => {
  const impl32689_801 = /* @__PURE__ */ __name(async function() {
    return projGetCrsListParametersCreate({});
  }, "impl32689_801");
  const impl32690_802 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_get_crs_list_parameters_create", { "rettype": "pointer", "argtypes": [], "proj-returns": "pj-crs-list-parameters" }, opts__225__auto__, "camel");
  }, "impl32690_802");
  const f32686 = /* @__PURE__ */ __name(function(...args32687) {
    const self32691_803 = this;
    const G__32757_804 = args32687.length;
    switch (G__32757_804) {
      case 0:
        return impl32689_801.call(self32691_803);
        break;
      case 1:
        return impl32690_802.call(self32691_803, args32687[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args32687.length ?? ""}`);
    }
    ;
  }, "f32686");
  return f32686;
})();
var projIsDeprecated = /* @__PURE__ */ (() => {
  const impl32841_806 = /* @__PURE__ */ __name(async function() {
    return projIsDeprecated({});
  }, "impl32841_806");
  const impl32842_807 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_is_deprecated", { "rettype": "int32", "argtypes": [["obj", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl32842_807");
  const f32838 = /* @__PURE__ */ __name(function(...args32839) {
    const self32843_808 = this;
    const G__32909_809 = args32839.length;
    switch (G__32909_809) {
      case 0:
        return impl32841_806.call(self32843_808);
        break;
      case 1:
        return impl32842_807.call(self32843_808, args32839[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args32839.length ?? ""}`);
    }
    ;
  }, "f32838");
  return f32838;
})();
var projCreateFromName = /* @__PURE__ */ (() => {
  const impl32993_811 = /* @__PURE__ */ __name(async function() {
    return projCreateFromName({});
  }, "impl32993_811");
  const impl32994_812 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_create_from_name", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["auth_name", "string"], ["searchedName", "string"], ["types", "pointer"], ["typesCount", "size-t"], ["approximateMatch", "int32"], ["limitResultCount", "size-t"], ["options", "pointer"]], "proj-returns": "pj-list" }, opts__225__auto__, "camel");
  }, "impl32994_812");
  const f32990 = /* @__PURE__ */ __name(function(...args32991) {
    const self32995_813 = this;
    const G__33061_814 = args32991.length;
    switch (G__33061_814) {
      case 0:
        return impl32993_811.call(self32995_813);
        break;
      case 1:
        return impl32994_812.call(self32995_813, args32991[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args32991.length ?? ""}`);
    }
    ;
  }, "f32990");
  return f32990;
})();
var projPrimeMeridianGetParameters = /* @__PURE__ */ (() => {
  const impl33145_816 = /* @__PURE__ */ __name(async function() {
    return projPrimeMeridianGetParameters({});
  }, "impl33145_816");
  const impl33146_817 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_prime_meridian_get_parameters", { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["longitude", "double"], ["unit-conv-factor", "double"], ["unit-name", "string"]], "argtypes": [["ctx", "pointer"], ["prime_meridian", "pointer"], ["out_longitude", "pointer"], ["out_unit_conv_factor", "pointer"], ["out_unit_name", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl33146_817");
  const f33142 = /* @__PURE__ */ __name(function(...args33143) {
    const self33147_818 = this;
    const G__33213_819 = args33143.length;
    switch (G__33213_819) {
      case 0:
        return impl33145_816.call(self33147_818);
        break;
      case 1:
        return impl33146_817.call(self33147_818, args33143[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args33143.length ?? ""}`);
    }
    ;
  }, "f33142");
  return f33142;
})();
var projStringDestroy = /* @__PURE__ */ (() => {
  const impl33297_821 = /* @__PURE__ */ __name(async function() {
    return projStringDestroy({});
  }, "impl33297_821");
  const impl33298_822 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_string_destroy", { "rettype": "void", "argtypes": [["str", "string"]] }, opts__225__auto__, "camel");
  }, "impl33298_822");
  const f33294 = /* @__PURE__ */ __name(function(...args33295) {
    const self33299_823 = this;
    const G__33365_824 = args33295.length;
    switch (G__33365_824) {
      case 0:
        return impl33297_821.call(self33299_823);
        break;
      case 1:
        return impl33298_822.call(self33299_823, args33295[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args33295.length ?? ""}`);
    }
    ;
  }, "f33294");
  return f33294;
})();
var projLogFunc = /* @__PURE__ */ (() => {
  const impl33449_826 = /* @__PURE__ */ __name(async function() {
    return projLogFunc({});
  }, "impl33449_826");
  const impl33450_827 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_log_func", { "rettype": "void", "argtypes": [["context", "pointer"], ["app_data", "pointer?"], ["logf", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl33450_827");
  const f33446 = /* @__PURE__ */ __name(function(...args33447) {
    const self33451_828 = this;
    const G__33517_829 = args33447.length;
    switch (G__33517_829) {
      case 0:
        return impl33449_826.call(self33451_828);
        break;
      case 1:
        return impl33450_827.call(self33451_828, args33447[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args33447.length ?? ""}`);
    }
    ;
  }, "f33446");
  return f33446;
})();
var projCreateGeocentricCrs = /* @__PURE__ */ (() => {
  const impl33601_831 = /* @__PURE__ */ __name(async function() {
    return projCreateGeocentricCrs({});
  }, "impl33601_831");
  const impl33602_832 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_create_geocentric_crs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_name", "string"], ["datum_name", "string"], ["ellps_name", "string"], ["semi_major_metre", "float64"], ["inv_flattening", "float64"], ["prime_meridian_name", "string"], ["prime_meridian_offset", "float64"], ["angular_units", "string"], ["angular_units_conv", "float64"], ["linear_units", "string"], ["linear_units_conv", "float64"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl33602_832");
  const f33598 = /* @__PURE__ */ __name(function(...args33599) {
    const self33603_833 = this;
    const G__33669_834 = args33599.length;
    switch (G__33669_834) {
      case 0:
        return impl33601_831.call(self33603_833);
        break;
      case 1:
        return impl33602_832.call(self33603_833, args33599[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args33599.length ?? ""}`);
    }
    ;
  }, "f33598");
  return f33598;
})();
var projUnitListDestroy = /* @__PURE__ */ (() => {
  const impl33753_836 = /* @__PURE__ */ __name(async function() {
    return projUnitListDestroy({});
  }, "impl33753_836");
  const impl33754_837 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_unit_list_destroy", { "rettype": "void", "argtypes": [["list", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl33754_837");
  const f33750 = /* @__PURE__ */ __name(function(...args33751) {
    const self33755_838 = this;
    const G__33821_839 = args33751.length;
    switch (G__33821_839) {
      case 0:
        return impl33753_836.call(self33755_838);
        break;
      case 1:
        return impl33754_837.call(self33755_838, args33751[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args33751.length ?? ""}`);
    }
    ;
  }, "f33750");
  return f33750;
})();
var projCrsCreateProjected3DCrsFrom2D = /* @__PURE__ */ (() => {
  const impl33905_841 = /* @__PURE__ */ __name(async function() {
    return projCrsCreateProjected3DCrsFrom2D({});
  }, "impl33905_841");
  const impl33906_842 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_crs_create_projected_3D_crs_from_2D", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_name", "string"], ["projected_2D_crs", "pointer"], ["geog_3D_crs", "pointer"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl33906_842");
  const f33902 = /* @__PURE__ */ __name(function(...args33903) {
    const self33907_843 = this;
    const G__33973_844 = args33903.length;
    switch (G__33973_844) {
      case 0:
        return impl33905_841.call(self33907_843);
        break;
      case 1:
        return impl33906_842.call(self33907_843, args33903[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args33903.length ?? ""}`);
    }
    ;
  }, "f33902");
  return f33902;
})();
var projGetSuggestedOperation = /* @__PURE__ */ (() => {
  const impl34057_846 = /* @__PURE__ */ __name(async function() {
    return projGetSuggestedOperation({});
  }, "impl34057_846");
  const impl34058_847 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_get_suggested_operation", { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["operations", "pointer"], ["direction", "int32"], ["coord", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl34058_847");
  const f34054 = /* @__PURE__ */ __name(function(...args34055) {
    const self34059_848 = this;
    const G__34125_849 = args34055.length;
    switch (G__34125_849) {
      case 0:
        return impl34057_846.call(self34059_848);
        break;
      case 1:
        return impl34058_847.call(self34059_848, args34055[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args34055.length ?? ""}`);
    }
    ;
  }, "f34054");
  return f34054;
})();
var projOperationFactoryContextSetAreaOfInterestName = /* @__PURE__ */ (() => {
  const impl34209_851 = /* @__PURE__ */ __name(async function() {
    return projOperationFactoryContextSetAreaOfInterestName({});
  }, "impl34209_851");
  const impl34210_852 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_operation_factory_context_set_area_of_interest_name", { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["area_name", "string"]] }, opts__225__auto__, "camel");
  }, "impl34210_852");
  const f34206 = /* @__PURE__ */ __name(function(...args34207) {
    const self34211_853 = this;
    const G__34277_854 = args34207.length;
    switch (G__34277_854) {
      case 0:
        return impl34209_851.call(self34211_853);
        break;
      case 1:
        return impl34210_852.call(self34211_853, args34207[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args34207.length ?? ""}`);
    }
    ;
  }, "f34206");
  return f34206;
})();
var projGetEllipsoid = /* @__PURE__ */ (() => {
  const impl34361_856 = /* @__PURE__ */ __name(async function() {
    return projGetEllipsoid({});
  }, "impl34361_856");
  const impl34362_857 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_get_ellipsoid", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["obj", "pointer"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl34362_857");
  const f34358 = /* @__PURE__ */ __name(function(...args34359) {
    const self34363_858 = this;
    const G__34429_859 = args34359.length;
    switch (G__34429_859) {
      case 0:
        return impl34361_856.call(self34363_858);
        break;
      case 1:
        return impl34362_857.call(self34363_858, args34359[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args34359.length ?? ""}`);
    }
    ;
  }, "f34358");
  return f34358;
})();
var projCoordoperationGetGridUsed = /* @__PURE__ */ (() => {
  const impl34513_861 = /* @__PURE__ */ __name(async function() {
    return projCoordoperationGetGridUsed({});
  }, "impl34513_861");
  const impl34514_862 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_coordoperation_get_grid_used", { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["short-name", "string"], ["full-name", "string"], ["package-name", "string"], ["url", "string"], ["direct-download", "int"], ["open-license", "int"], ["available", "int"]], "argtypes": [["ctx", "pointer"], ["coordoperation", "pointer"], ["index", "int32"], ["out_short_name", "pointer"], ["out_full_name", "pointer"], ["out_package_name", "pointer"], ["out_url", "pointer"], ["out_direct_download", "pointer"], ["out_open_license", "pointer"], ["out_available", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl34514_862");
  const f34510 = /* @__PURE__ */ __name(function(...args34511) {
    const self34515_863 = this;
    const G__34581_864 = args34511.length;
    switch (G__34581_864) {
      case 0:
        return impl34513_861.call(self34515_863);
        break;
      case 1:
        return impl34514_862.call(self34515_863, args34511[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args34511.length ?? ""}`);
    }
    ;
  }, "f34510");
  return f34510;
})();
var projCrsIsDerived = /* @__PURE__ */ (() => {
  const impl34665_866 = /* @__PURE__ */ __name(async function() {
    return projCrsIsDerived({});
  }, "impl34665_866");
  const impl34666_867 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_crs_is_derived", { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl34666_867");
  const f34662 = /* @__PURE__ */ __name(function(...args34663) {
    const self34667_868 = this;
    const G__34733_869 = args34663.length;
    switch (G__34733_869) {
      case 0:
        return impl34665_866.call(self34667_868);
        break;
      case 1:
        return impl34666_867.call(self34667_868, args34663[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args34663.length ?? ""}`);
    }
    ;
  }, "f34662");
  return f34662;
})();
var projIntListDestroy = /* @__PURE__ */ (() => {
  const impl34817_871 = /* @__PURE__ */ __name(async function() {
    return projIntListDestroy({});
  }, "impl34817_871");
  const impl34818_872 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_int_list_destroy", { "rettype": "void", "argtypes": [["list", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl34818_872");
  const f34814 = /* @__PURE__ */ __name(function(...args34815) {
    const self34819_873 = this;
    const G__34885_874 = args34815.length;
    switch (G__34885_874) {
      case 0:
        return impl34817_871.call(self34819_873);
        break;
      case 1:
        return impl34818_872.call(self34819_873, args34815[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args34815.length ?? ""}`);
    }
    ;
  }, "f34814");
  return f34814;
})();
var projCrsGetCoordinateSystem = /* @__PURE__ */ (() => {
  const impl34969_876 = /* @__PURE__ */ __name(async function() {
    return projCrsGetCoordinateSystem({});
  }, "impl34969_876");
  const impl34970_877 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_crs_get_coordinate_system", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl34970_877");
  const f34966 = /* @__PURE__ */ __name(function(...args34967) {
    const self34971_878 = this;
    const G__35037_879 = args34967.length;
    switch (G__35037_879) {
      case 0:
        return impl34969_876.call(self34971_878);
        break;
      case 1:
        return impl34970_877.call(self34971_878, args34967[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args34967.length ?? ""}`);
    }
    ;
  }, "f34966");
  return f34966;
})();
var projContextSetDatabasePath = /* @__PURE__ */ (() => {
  const impl35121_881 = /* @__PURE__ */ __name(async function() {
    return projContextSetDatabasePath({});
  }, "impl35121_881");
  const impl35122_882 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_context_set_database_path", { "rettype": "int32", "argtypes": [["context", "pointer"], ["db-path", "string"], ["aux-db-paths", "pointer?"], ["options", "pointer?"]] }, opts__225__auto__, "camel");
  }, "impl35122_882");
  const f35118 = /* @__PURE__ */ __name(function(...args35119) {
    const self35123_883 = this;
    const G__35189_884 = args35119.length;
    switch (G__35189_884) {
      case 0:
        return impl35121_881.call(self35123_883);
        break;
      case 1:
        return impl35122_882.call(self35123_883, args35119[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args35119.length ?? ""}`);
    }
    ;
  }, "f35118");
  return f35118;
})();
var projGetCrsInfoListFromDatabase = /* @__PURE__ */ (() => {
  const impl35273_886 = /* @__PURE__ */ __name(async function() {
    return projGetCrsInfoListFromDatabase({});
  }, "impl35273_886");
  const impl35274_887 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_get_crs_info_list_from_database", { "proj-returns": "struct-list", "struct-fields": [["auth-name", "string", 0], ["code", "string", 4], ["name", "string", 8], ["type", "int", 12], ["deprecated", "boolean", 16], ["bbox-valid", "boolean", 20], ["west-lon-degree", "double", 24], ["south-lat-degree", "double", 32], ["east-lon-degree", "double", 40], ["north-lat-degree", "double", 48], ["area-name", "string", 56], ["projection-method-name", "string", 60], ["celestial-body-name", "string", 64]], "struct-def": "proj-crs-info", "struct-params-create": "proj_get_crs_list_parameters_create", "struct-destroy-fn": "proj_crs_info_list_destroy", "argtypes": [["context", "pointer"], ["auth_name", "string"], ["params", "pointer"], ["out_result_count", "pointer"]], "count-arg-name": "out_result_count", "struct-params-destroy": "proj_get_crs_list_parameters_destroy", "rettype": "pointer" }, opts__225__auto__, "camel");
  }, "impl35274_887");
  const f35270 = /* @__PURE__ */ __name(function(...args35271) {
    const self35275_888 = this;
    const G__35341_889 = args35271.length;
    switch (G__35341_889) {
      case 0:
        return impl35273_886.call(self35275_888);
        break;
      case 1:
        return impl35274_887.call(self35275_888, args35271[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args35271.length ?? ""}`);
    }
    ;
  }, "f35270");
  return f35270;
})();
var projIsEquivalentTo = /* @__PURE__ */ (() => {
  const impl35425_891 = /* @__PURE__ */ __name(async function() {
    return projIsEquivalentTo({});
  }, "impl35425_891");
  const impl35426_892 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_is_equivalent_to", { "rettype": "int32", "argtypes": [["obj", "pointer"], ["other", "pointer"], ["criterion", "int32"]] }, opts__225__auto__, "camel");
  }, "impl35426_892");
  const f35422 = /* @__PURE__ */ __name(function(...args35423) {
    const self35427_893 = this;
    const G__35493_894 = args35423.length;
    switch (G__35493_894) {
      case 0:
        return impl35425_891.call(self35427_893);
        break;
      case 1:
        return impl35426_892.call(self35427_893, args35423[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args35423.length ?? ""}`);
    }
    ;
  }, "f35422");
  return f35422;
})();
var projContextSetEnableNetwork = /* @__PURE__ */ (() => {
  const impl35577_896 = /* @__PURE__ */ __name(async function() {
    return projContextSetEnableNetwork({});
  }, "impl35577_896");
  const impl35578_897 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_context_set_enable_network", { "rettype": "int32", "argtypes": [["context", "pointer"], ["enabled", "int32"]] }, opts__225__auto__, "camel");
  }, "impl35578_897");
  const f35574 = /* @__PURE__ */ __name(function(...args35575) {
    const self35579_898 = this;
    const G__35645_899 = args35575.length;
    switch (G__35645_899) {
      case 0:
        return impl35577_896.call(self35579_898);
        break;
      case 1:
        return impl35578_897.call(self35579_898, args35575[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args35575.length ?? ""}`);
    }
    ;
  }, "f35574");
  return f35574;
})();
var projCrsCreateBoundVerticalCrs = /* @__PURE__ */ (() => {
  const impl35729_901 = /* @__PURE__ */ __name(async function() {
    return projCrsCreateBoundVerticalCrs({});
  }, "impl35729_901");
  const impl35730_902 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_crs_create_bound_vertical_crs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["vert_crs", "pointer"], ["hub_geographic_3D_crs", "pointer"], ["grid_name", "string"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl35730_902");
  const f35726 = /* @__PURE__ */ __name(function(...args35727) {
    const self35731_903 = this;
    const G__35797_904 = args35727.length;
    switch (G__35797_904) {
      case 0:
        return impl35729_901.call(self35731_903);
        break;
      case 1:
        return impl35730_902.call(self35731_903, args35727[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args35727.length ?? ""}`);
    }
    ;
  }, "f35726");
  return f35726;
})();
var projOperationFactoryContextSetCrsExtentUse = /* @__PURE__ */ (() => {
  const impl35881_906 = /* @__PURE__ */ __name(async function() {
    return projOperationFactoryContextSetCrsExtentUse({});
  }, "impl35881_906");
  const impl35882_907 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_operation_factory_context_set_crs_extent_use", { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["use", "int32"]] }, opts__225__auto__, "camel");
  }, "impl35882_907");
  const f35878 = /* @__PURE__ */ __name(function(...args35879) {
    const self35883_908 = this;
    const G__35949_909 = args35879.length;
    switch (G__35949_909) {
      case 0:
        return impl35881_906.call(self35883_908);
        break;
      case 1:
        return impl35882_907.call(self35883_908, args35879[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args35879.length ?? ""}`);
    }
    ;
  }, "f35878");
  return f35878;
})();
var projCreateGeographicCrs = /* @__PURE__ */ (() => {
  const impl36033_911 = /* @__PURE__ */ __name(async function() {
    return projCreateGeographicCrs({});
  }, "impl36033_911");
  const impl36034_912 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_create_geographic_crs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_name", "string"], ["datum_name", "string"], ["ellps_name", "string"], ["semi_major_metre", "float64"], ["inv_flattening", "float64"], ["prime_meridian_name", "string"], ["prime_meridian_offset", "float64"], ["pm_angular_units", "string"], ["pm_units_conv", "float64"], ["ellipsoidal_cs", "pointer"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl36034_912");
  const f36030 = /* @__PURE__ */ __name(function(...args36031) {
    const self36035_913 = this;
    const G__36101_914 = args36031.length;
    switch (G__36101_914) {
      case 0:
        return impl36033_911.call(self36035_913);
        break;
      case 1:
        return impl36034_912.call(self36035_913, args36031[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args36031.length ?? ""}`);
    }
    ;
  }, "f36030");
  return f36030;
})();
var projCoordoperationGetGridUsedCount = /* @__PURE__ */ (() => {
  const impl36185_916 = /* @__PURE__ */ __name(async function() {
    return projCoordoperationGetGridUsedCount({});
  }, "impl36185_916");
  const impl36186_917 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_coordoperation_get_grid_used_count", { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["coordoperation", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl36186_917");
  const f36182 = /* @__PURE__ */ __name(function(...args36183) {
    const self36187_918 = this;
    const G__36253_919 = args36183.length;
    switch (G__36253_919) {
      case 0:
        return impl36185_916.call(self36187_918);
        break;
      case 1:
        return impl36186_917.call(self36187_918, args36183[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args36183.length ?? ""}`);
    }
    ;
  }, "f36182");
  return f36182;
})();
var projListGetCount = /* @__PURE__ */ (() => {
  const impl36337_921 = /* @__PURE__ */ __name(async function() {
    return projListGetCount({});
  }, "impl36337_921");
  const impl36338_922 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_list_get_count", { "rettype": "int32", "argtypes": [["result", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl36338_922");
  const f36334 = /* @__PURE__ */ __name(function(...args36335) {
    const self36339_923 = this;
    const G__36405_924 = args36335.length;
    switch (G__36405_924) {
      case 0:
        return impl36337_921.call(self36339_923);
        break;
      case 1:
        return impl36338_922.call(self36339_923, args36335[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args36335.length ?? ""}`);
    }
    ;
  }, "f36334");
  return f36334;
})();
var projCreateTransformation = /* @__PURE__ */ (() => {
  const impl36489_926 = /* @__PURE__ */ __name(async function() {
    return projCreateTransformation({});
  }, "impl36489_926");
  const impl36490_927 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_create_transformation", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["name", "string"], ["auth_name", "string"], ["code", "string"], ["source_crs", "pointer"], ["target_crs", "pointer"], ["interpolation_crs", "pointer"], ["method_name", "string"], ["method_auth_name", "string"], ["method_code", "string"], ["param_count", "int32"], ["params", "pointer"], ["accuracy", "float64"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl36490_927");
  const f36486 = /* @__PURE__ */ __name(function(...args36487) {
    const self36491_928 = this;
    const G__36557_929 = args36487.length;
    switch (G__36557_929) {
      case 0:
        return impl36489_926.call(self36491_928);
        break;
      case 1:
        return impl36490_927.call(self36491_928, args36487[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args36487.length ?? ""}`);
    }
    ;
  }, "f36486");
  return f36486;
})();
var projCoordoperationGetAccuracy = /* @__PURE__ */ (() => {
  const impl36641_931 = /* @__PURE__ */ __name(async function() {
    return projCoordoperationGetAccuracy({});
  }, "impl36641_931");
  const impl36642_932 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_coordoperation_get_accuracy", { "rettype": "float64", "argtypes": [["ctx", "pointer"], ["obj", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl36642_932");
  const f36638 = /* @__PURE__ */ __name(function(...args36639) {
    const self36643_933 = this;
    const G__36709_934 = args36639.length;
    switch (G__36709_934) {
      case 0:
        return impl36641_931.call(self36643_933);
        break;
      case 1:
        return impl36642_932.call(self36643_933, args36639[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args36639.length ?? ""}`);
    }
    ;
  }, "f36638");
  return f36638;
})();
var projCoordoperationGetParam = /* @__PURE__ */ (() => {
  const impl36793_936 = /* @__PURE__ */ __name(async function() {
    return projCoordoperationGetParam({});
  }, "impl36793_936");
  const impl36794_937 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_coordoperation_get_param", { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["name", "string"], ["auth-name", "string"], ["code", "string"], ["value", "double"], ["value-string", "string"], ["unit-conv-factor", "double"], ["unit-name", "string"], ["unit-auth-name", "string"], ["unit-code", "string"], ["unit-category", "string"]], "argtypes": [["ctx", "pointer"], ["coordoperation", "pointer"], ["index", "int32"], ["out_name", "pointer"], ["out_auth_name", "pointer"], ["out_code", "pointer"], ["out_value", "pointer"], ["out_value_string", "pointer"], ["out_unit_conv_factor", "pointer"], ["out_unit_name", "pointer"], ["out_unit_auth_name", "pointer"], ["out_unit_code", "pointer"], ["out_unit_category", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl36794_937");
  const f36790 = /* @__PURE__ */ __name(function(...args36791) {
    const self36795_938 = this;
    const G__36861_939 = args36791.length;
    switch (G__36861_939) {
      case 0:
        return impl36793_936.call(self36795_938);
        break;
      case 1:
        return impl36794_937.call(self36795_938, args36791[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args36791.length ?? ""}`);
    }
    ;
  }, "f36790");
  return f36790;
})();
var projCreate = /* @__PURE__ */ (() => {
  const impl36945_941 = /* @__PURE__ */ __name(async function() {
    return projCreate({});
  }, "impl36945_941");
  const impl36946_942 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_create", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["definition", "string"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl36946_942");
  const f36942 = /* @__PURE__ */ __name(function(...args36943) {
    const self36947_943 = this;
    const G__37013_944 = args36943.length;
    switch (G__37013_944) {
      case 0:
        return impl36945_941.call(self36947_943);
        break;
      case 1:
        return impl36946_942.call(self36947_943, args36943[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args36943.length ?? ""}`);
    }
    ;
  }, "f36942");
  return f36942;
})();
var projCreateConversion = /* @__PURE__ */ (() => {
  const impl37097_946 = /* @__PURE__ */ __name(async function() {
    return projCreateConversion({});
  }, "impl37097_946");
  const impl37098_947 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_create_conversion", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["name", "string"], ["auth_name", "string"], ["code", "string"], ["method_name", "string"], ["method_auth_name", "string"], ["method_code", "string"], ["param_count", "int32"], ["params", "pointer"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl37098_947");
  const f37094 = /* @__PURE__ */ __name(function(...args37095) {
    const self37099_948 = this;
    const G__37165_949 = args37095.length;
    switch (G__37165_949) {
      case 0:
        return impl37097_946.call(self37099_948);
        break;
      case 1:
        return impl37098_947.call(self37099_948, args37095[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args37095.length ?? ""}`);
    }
    ;
  }, "f37094");
  return f37094;
})();
var projGetType = /* @__PURE__ */ (() => {
  const impl37249_951 = /* @__PURE__ */ __name(async function() {
    return projGetType({});
  }, "impl37249_951");
  const impl37250_952 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_get_type", { "rettype": "int32", "argtypes": [["obj", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl37250_952");
  const f37246 = /* @__PURE__ */ __name(function(...args37247) {
    const self37251_953 = this;
    const G__37317_954 = args37247.length;
    switch (G__37317_954) {
      case 0:
        return impl37249_951.call(self37251_953);
        break;
      case 1:
        return impl37250_952.call(self37251_953, args37247[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args37247.length ?? ""}`);
    }
    ;
  }, "f37246");
  return f37246;
})();
var projContextGetDatabaseMetadata = /* @__PURE__ */ (() => {
  const impl37401_956 = /* @__PURE__ */ __name(async function() {
    return projContextGetDatabaseMetadata({});
  }, "impl37401_956");
  const impl37402_957 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_context_get_database_metadata", { "rettype": "string", "argtypes": [["context", "pointer"], ["key", "string"]] }, opts__225__auto__, "camel");
  }, "impl37402_957");
  const f37398 = /* @__PURE__ */ __name(function(...args37399) {
    const self37403_958 = this;
    const G__37469_959 = args37399.length;
    switch (G__37469_959) {
      case 0:
        return impl37401_956.call(self37403_958);
        break;
      case 1:
        return impl37402_957.call(self37403_958, args37399[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args37399.length ?? ""}`);
    }
    ;
  }, "f37398");
  return f37398;
})();
var projCrsAlterGeodeticCrs = /* @__PURE__ */ (() => {
  const impl37553_961 = /* @__PURE__ */ __name(async function() {
    return projCrsAlterGeodeticCrs({});
  }, "impl37553_961");
  const impl37554_962 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_crs_alter_geodetic_crs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["obj", "pointer"], ["new_geod_crs", "pointer"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl37554_962");
  const f37550 = /* @__PURE__ */ __name(function(...args37551) {
    const self37555_963 = this;
    const G__37621_964 = args37551.length;
    switch (G__37621_964) {
      case 0:
        return impl37553_961.call(self37555_963);
        break;
      case 1:
        return impl37554_962.call(self37555_963, args37551[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args37551.length ?? ""}`);
    }
    ;
  }, "f37550");
  return f37550;
})();
var projConcatoperationGetStepCount = /* @__PURE__ */ (() => {
  const impl37705_966 = /* @__PURE__ */ __name(async function() {
    return projConcatoperationGetStepCount({});
  }, "impl37705_966");
  const impl37706_967 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_concatoperation_get_step_count", { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["concatoperation", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl37706_967");
  const f37702 = /* @__PURE__ */ __name(function(...args37703) {
    const self37707_968 = this;
    const G__37773_969 = args37703.length;
    switch (G__37773_969) {
      case 0:
        return impl37705_966.call(self37707_968);
        break;
      case 1:
        return impl37706_967.call(self37707_968, args37703[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args37703.length ?? ""}`);
    }
    ;
  }, "f37702");
  return f37702;
})();
var projOperationFactoryContextSetDiscardSuperseded = /* @__PURE__ */ (() => {
  const impl37857_971 = /* @__PURE__ */ __name(async function() {
    return projOperationFactoryContextSetDiscardSuperseded({});
  }, "impl37857_971");
  const impl37858_972 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_operation_factory_context_set_discard_superseded", { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["discard", "int32"]] }, opts__225__auto__, "camel");
  }, "impl37858_972");
  const f37854 = /* @__PURE__ */ __name(function(...args37855) {
    const self37859_973 = this;
    const G__37925_974 = args37855.length;
    switch (G__37925_974) {
      case 0:
        return impl37857_971.call(self37859_973);
        break;
      case 1:
        return impl37858_972.call(self37859_973, args37855[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args37855.length ?? ""}`);
    }
    ;
  }, "f37854");
  return f37854;
})();
var projIsDerivedCrs = /* @__PURE__ */ (() => {
  const impl38009_976 = /* @__PURE__ */ __name(async function() {
    return projIsDerivedCrs({});
  }, "impl38009_976");
  const impl38010_977 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_is_derived_crs", { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl38010_977");
  const f38006 = /* @__PURE__ */ __name(function(...args38007) {
    const self38011_978 = this;
    const G__38077_979 = args38007.length;
    switch (G__38077_979) {
      case 0:
        return impl38009_976.call(self38011_978);
        break;
      case 1:
        return impl38010_977.call(self38011_978, args38007[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args38007.length ?? ""}`);
    }
    ;
  }, "f38006");
  return f38006;
})();
var projGetUnitsFromDatabase = /* @__PURE__ */ (() => {
  const impl38161_981 = /* @__PURE__ */ __name(async function() {
    return projGetUnitsFromDatabase({});
  }, "impl38161_981");
  const impl38162_982 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_get_units_from_database", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["auth_name", "string"], ["category", "string"], ["allow_deprecated", "int32"], ["out_result_count", "pointer"]], "proj-returns": "struct-list", "struct-def": "proj-unit-info", "struct-fields": [["auth-name", "string", 0], ["code", "string", 4], ["name", "string", 8], ["category", "string", 12], ["conv-factor", "double", 16], ["proj-short-name", "string", 24], ["deprecated", "boolean", 28]], "struct-destroy-fn": "proj_unit_list_destroy", "count-arg-name": "out_result_count" }, opts__225__auto__, "camel");
  }, "impl38162_982");
  const f38158 = /* @__PURE__ */ __name(function(...args38159) {
    const self38163_983 = this;
    const G__38229_984 = args38159.length;
    switch (G__38229_984) {
      case 0:
        return impl38161_981.call(self38163_983);
        break;
      case 1:
        return impl38162_982.call(self38163_983, args38159[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args38159.length ?? ""}`);
    }
    ;
  }, "f38158");
  return f38158;
})();
var projCrsGetCoordoperation = /* @__PURE__ */ (() => {
  const impl38313_986 = /* @__PURE__ */ __name(async function() {
    return projCrsGetCoordoperation({});
  }, "impl38313_986");
  const impl38314_987 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_crs_get_coordoperation", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl38314_987");
  const f38310 = /* @__PURE__ */ __name(function(...args38311) {
    const self38315_988 = this;
    const G__38381_989 = args38311.length;
    switch (G__38381_989) {
      case 0:
        return impl38313_986.call(self38315_988);
        break;
      case 1:
        return impl38314_987.call(self38315_988, args38311[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args38311.length ?? ""}`);
    }
    ;
  }, "f38310");
  return f38310;
})();
var projCoordoperationHasBallparkTransformation = /* @__PURE__ */ (() => {
  const impl38465_991 = /* @__PURE__ */ __name(async function() {
    return projCoordoperationHasBallparkTransformation({});
  }, "impl38465_991");
  const impl38466_992 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_coordoperation_has_ballpark_transformation", { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["coordoperation", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl38466_992");
  const f38462 = /* @__PURE__ */ __name(function(...args38463) {
    const self38467_993 = this;
    const G__38533_994 = args38463.length;
    switch (G__38533_994) {
      case 0:
        return impl38465_991.call(self38467_993);
        break;
      case 1:
        return impl38466_992.call(self38467_993, args38463[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args38463.length ?? ""}`);
    }
    ;
  }, "f38462");
  return f38462;
})();
var projGetAreaOfUse = /* @__PURE__ */ (() => {
  const impl38617_996 = /* @__PURE__ */ __name(async function() {
    return projGetAreaOfUse({});
  }, "impl38617_996");
  const impl38618_997 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_get_area_of_use", { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["west-lon-degree", "double"], ["south-lat-degree", "double"], ["east-lon-degree", "double"], ["north-lat-degree", "double"], ["area-name", "string"]], "argtypes": [["context", "pointer"], ["obj", "pointer"], ["out_west_lon_degree", "pointer"], ["out_south_lat_degree", "pointer"], ["out_east_lon_degree", "pointer"], ["out_north_lat_degree", "pointer"], ["out_area_name", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl38618_997");
  const f38614 = /* @__PURE__ */ __name(function(...args38615) {
    const self38619_998 = this;
    const G__38685_999 = args38615.length;
    switch (G__38685_999) {
      case 0:
        return impl38617_996.call(self38619_998);
        break;
      case 1:
        return impl38618_997.call(self38619_998, args38615[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args38615.length ?? ""}`);
    }
    ;
  }, "f38614");
  return f38614;
})();
var projCoord = /* @__PURE__ */ (() => {
  const impl38769_1001 = /* @__PURE__ */ __name(async function() {
    return projCoord({});
  }, "impl38769_1001");
  const impl38770_1002 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_coord", { "rettype": "pointer", "argtypes": [["x", "float64"], ["y", "float64"], ["z", "float64"], ["t", "float64"]] }, opts__225__auto__, "camel");
  }, "impl38770_1002");
  const f38766 = /* @__PURE__ */ __name(function(...args38767) {
    const self38771_1003 = this;
    const G__38837_1004 = args38767.length;
    switch (G__38837_1004) {
      case 0:
        return impl38769_1001.call(self38771_1003);
        break;
      case 1:
        return impl38770_1002.call(self38771_1003, args38767[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args38767.length ?? ""}`);
    }
    ;
  }, "f38766");
  return f38766;
})();
var projContextErrnoString = /* @__PURE__ */ (() => {
  const impl38921_1006 = /* @__PURE__ */ __name(async function() {
    return projContextErrnoString({});
  }, "impl38921_1006");
  const impl38922_1007 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_context_errno_string", { "rettype": "string", "argtypes": [["err", "int32"]] }, opts__225__auto__, "camel");
  }, "impl38922_1007");
  const f38918 = /* @__PURE__ */ __name(function(...args38919) {
    const self38923_1008 = this;
    const G__38989_1009 = args38919.length;
    switch (G__38989_1009) {
      case 0:
        return impl38921_1006.call(self38923_1008);
        break;
      case 1:
        return impl38922_1007.call(self38923_1008, args38919[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args38919.length ?? ""}`);
    }
    ;
  }, "f38918");
  return f38918;
})();
var projGetInsertStatements = /* @__PURE__ */ (() => {
  const impl39073_1011 = /* @__PURE__ */ __name(async function() {
    return projGetInsertStatements({});
  }, "impl39073_1011");
  const impl39074_1012 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_get_insert_statements", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["session", "pointer"], ["object", "pointer"], ["authority", "string"], ["code", "string"], ["numeric_codes", "int32"], ["allowed_authorities", "pointer"], ["options", "pointer"]], "proj-returns": "string-list" }, opts__225__auto__, "camel");
  }, "impl39074_1012");
  const f39070 = /* @__PURE__ */ __name(function(...args39071) {
    const self39075_1013 = this;
    const G__39141_1014 = args39071.length;
    switch (G__39141_1014) {
      case 0:
        return impl39073_1011.call(self39075_1013);
        break;
      case 1:
        return impl39074_1012.call(self39075_1013, args39071[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args39071.length ?? ""}`);
    }
    ;
  }, "f39070");
  return f39070;
})();
var projStringListDestroy = /* @__PURE__ */ (() => {
  const impl39225_1016 = /* @__PURE__ */ __name(async function() {
    return projStringListDestroy({});
  }, "impl39225_1016");
  const impl39226_1017 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_string_list_destroy", { "rettype": "void", "argtypes": [["list", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl39226_1017");
  const f39222 = /* @__PURE__ */ __name(function(...args39223) {
    const self39227_1018 = this;
    const G__39293_1019 = args39223.length;
    switch (G__39293_1019) {
      case 0:
        return impl39225_1016.call(self39227_1018);
        break;
      case 1:
        return impl39226_1017.call(self39227_1018, args39223[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args39223.length ?? ""}`);
    }
    ;
  }, "f39222");
  return f39222;
})();
var projTransArray = /* @__PURE__ */ (() => {
  const impl39377_1021 = /* @__PURE__ */ __name(async function() {
    return projTransArray({});
  }, "impl39377_1021");
  const impl39378_1022 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_trans_array", { "rettype": "int32", "argtypes": [["p", "pointer"], ["direction", "int32"], ["n", "size-t"], ["coord", "pointer"]], "argsemantics": [["coord", "coord-array"], ["n", "coord-count"]] }, opts__225__auto__, "camel");
  }, "impl39378_1022");
  const f39374 = /* @__PURE__ */ __name(function(...args39375) {
    const self39379_1023 = this;
    const G__39445_1024 = args39375.length;
    switch (G__39445_1024) {
      case 0:
        return impl39377_1021.call(self39379_1023);
        break;
      case 1:
        return impl39378_1022.call(self39379_1023, args39375[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args39375.length ?? ""}`);
    }
    ;
  }, "f39374");
  return f39374;
})();
var projContextClone = /* @__PURE__ */ (() => {
  const impl39529_1026 = /* @__PURE__ */ __name(async function() {
    return projContextClone({});
  }, "impl39529_1026");
  const impl39530_1027 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_context_clone", { "rettype": "pointer", "argtypes": [["ctx", "pointer"]], "proj-returns": "pj-context", "is-context-fn": false }, opts__225__auto__, "camel");
  }, "impl39530_1027");
  const f39526 = /* @__PURE__ */ __name(function(...args39527) {
    const self39531_1028 = this;
    const G__39597_1029 = args39527.length;
    switch (G__39597_1029) {
      case 0:
        return impl39529_1026.call(self39531_1028);
        break;
      case 1:
        return impl39530_1027.call(self39531_1028, args39527[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args39527.length ?? ""}`);
    }
    ;
  }, "f39526");
  return f39526;
})();
var projIsEquivalentToWithCtx = /* @__PURE__ */ (() => {
  const impl39681_1031 = /* @__PURE__ */ __name(async function() {
    return projIsEquivalentToWithCtx({});
  }, "impl39681_1031");
  const impl39682_1032 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_is_equivalent_to_with_ctx", { "rettype": "int32", "argtypes": [["context", "pointer"], ["obj", "pointer"], ["other", "pointer"], ["criterion", "int32"]] }, opts__225__auto__, "camel");
  }, "impl39682_1032");
  const f39678 = /* @__PURE__ */ __name(function(...args39679) {
    const self39683_1033 = this;
    const G__39749_1034 = args39679.length;
    switch (G__39749_1034) {
      case 0:
        return impl39681_1031.call(self39683_1033);
        break;
      case 1:
        return impl39682_1032.call(self39683_1033, args39679[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args39679.length ?? ""}`);
    }
    ;
  }, "f39678");
  return f39678;
})();
var projOperationFactoryContextSetAllowUseIntermediateCrs = /* @__PURE__ */ (() => {
  const impl39833_1036 = /* @__PURE__ */ __name(async function() {
    return projOperationFactoryContextSetAllowUseIntermediateCrs({});
  }, "impl39833_1036");
  const impl39834_1037 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_operation_factory_context_set_allow_use_intermediate_crs", { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["use", "int32"]] }, opts__225__auto__, "camel");
  }, "impl39834_1037");
  const f39830 = /* @__PURE__ */ __name(function(...args39831) {
    const self39835_1038 = this;
    const G__39901_1039 = args39831.length;
    switch (G__39901_1039) {
      case 0:
        return impl39833_1036.call(self39835_1038);
        break;
      case 1:
        return impl39834_1037.call(self39835_1038, args39831[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args39831.length ?? ""}`);
    }
    ;
  }, "f39830");
  return f39830;
})();
var projCoordoperationGetParamIndex = /* @__PURE__ */ (() => {
  const impl39985_1041 = /* @__PURE__ */ __name(async function() {
    return projCoordoperationGetParamIndex({});
  }, "impl39985_1041");
  const impl39986_1042 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_coordoperation_get_param_index", { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["coordoperation", "pointer"], ["name", "string"]] }, opts__225__auto__, "camel");
  }, "impl39986_1042");
  const f39982 = /* @__PURE__ */ __name(function(...args39983) {
    const self39987_1043 = this;
    const G__40053_1044 = args39983.length;
    switch (G__40053_1044) {
      case 0:
        return impl39985_1041.call(self39987_1043);
        break;
      case 1:
        return impl39986_1042.call(self39987_1043, args39983[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args39983.length ?? ""}`);
    }
    ;
  }, "f39982");
  return f39982;
})();
var projContextGetDatabaseStructure = /* @__PURE__ */ (() => {
  const impl40137_1046 = /* @__PURE__ */ __name(async function() {
    return projContextGetDatabaseStructure({});
  }, "impl40137_1046");
  const impl40138_1047 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_context_get_database_structure", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["options", "pointer"]], "proj-returns": "string-list" }, opts__225__auto__, "camel");
  }, "impl40138_1047");
  const f40134 = /* @__PURE__ */ __name(function(...args40135) {
    const self40139_1048 = this;
    const G__40205_1049 = args40135.length;
    switch (G__40205_1049) {
      case 0:
        return impl40137_1046.call(self40139_1048);
        break;
      case 1:
        return impl40138_1047.call(self40139_1048, args40135[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args40135.length ?? ""}`);
    }
    ;
  }, "f40134");
  return f40134;
})();
var projOperationFactoryContextDestroy = /* @__PURE__ */ (() => {
  const impl40289_1051 = /* @__PURE__ */ __name(async function() {
    return projOperationFactoryContextDestroy({});
  }, "impl40289_1051");
  const impl40290_1052 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_operation_factory_context_destroy", { "rettype": "void", "argtypes": [["ctx", "pointer"]], "is-context-fn": false }, opts__225__auto__, "camel");
  }, "impl40290_1052");
  const f40286 = /* @__PURE__ */ __name(function(...args40287) {
    const self40291_1053 = this;
    const G__40357_1054 = args40287.length;
    switch (G__40357_1054) {
      case 0:
        return impl40289_1051.call(self40291_1053);
        break;
      case 1:
        return impl40290_1052.call(self40291_1053, args40287[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args40287.length ?? ""}`);
    }
    ;
  }, "f40286");
  return f40286;
})();
var projGetCelestialBodyListFromDatabase = /* @__PURE__ */ (() => {
  const impl40441_1056 = /* @__PURE__ */ __name(async function() {
    return projGetCelestialBodyListFromDatabase({});
  }, "impl40441_1056");
  const impl40442_1057 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_get_celestial_body_list_from_database", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["auth_name", "string"], ["out_result_count", "pointer"]], "proj-returns": "struct-list", "struct-def": "proj-celestial-body-info", "struct-fields": [["auth-name", "string", 0], ["name", "string", 4]], "struct-destroy-fn": "proj_celestial_body_list_destroy", "count-arg-name": "out_result_count" }, opts__225__auto__, "camel");
  }, "impl40442_1057");
  const f40438 = /* @__PURE__ */ __name(function(...args40439) {
    const self40443_1058 = this;
    const G__40509_1059 = args40439.length;
    switch (G__40509_1059) {
      case 0:
        return impl40441_1056.call(self40443_1058);
        break;
      case 1:
        return impl40442_1057.call(self40443_1058, args40439[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args40439.length ?? ""}`);
    }
    ;
  }, "f40438");
  return f40438;
})();
var projCelestialBodyListDestroy = /* @__PURE__ */ (() => {
  const impl40593_1061 = /* @__PURE__ */ __name(async function() {
    return projCelestialBodyListDestroy({});
  }, "impl40593_1061");
  const impl40594_1062 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_celestial_body_list_destroy", { "rettype": "void", "argtypes": [["list", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl40594_1062");
  const f40590 = /* @__PURE__ */ __name(function(...args40591) {
    const self40595_1063 = this;
    const G__40661_1064 = args40591.length;
    switch (G__40661_1064) {
      case 0:
        return impl40593_1061.call(self40595_1063);
        break;
      case 1:
        return impl40594_1062.call(self40595_1063, args40591[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args40591.length ?? ""}`);
    }
    ;
  }, "f40590");
  return f40590;
})();
var projCreateCompoundCrs = /* @__PURE__ */ (() => {
  const impl40745_1066 = /* @__PURE__ */ __name(async function() {
    return projCreateCompoundCrs({});
  }, "impl40745_1066");
  const impl40746_1067 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_create_compound_crs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_name", "string"], ["horiz_crs", "pointer"], ["vert_crs", "pointer"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl40746_1067");
  const f40742 = /* @__PURE__ */ __name(function(...args40743) {
    const self40747_1068 = this;
    const G__40813_1069 = args40743.length;
    switch (G__40813_1069) {
      case 0:
        return impl40745_1066.call(self40747_1068);
        break;
      case 1:
        return impl40746_1067.call(self40747_1068, args40743[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args40743.length ?? ""}`);
    }
    ;
  }, "f40742");
  return f40742;
})();
var projCoordoperationGetTowgs84Values = /* @__PURE__ */ (() => {
  const impl40897_1071 = /* @__PURE__ */ __name(async function() {
    return projCoordoperationGetTowgs84Values({});
  }, "impl40897_1071");
  const impl40898_1072 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_coordoperation_get_towgs84_values", { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["values", "double-array", "count-arg", "value_count"]], "argtypes": [["ctx", "pointer"], ["coordoperation", "pointer"], ["out_values", "pointer"], ["value_count", "int32"], ["emit_error_if_incompatible", "int32"]] }, opts__225__auto__, "camel");
  }, "impl40898_1072");
  const f40894 = /* @__PURE__ */ __name(function(...args40895) {
    const self40899_1073 = this;
    const G__40965_1074 = args40895.length;
    switch (G__40965_1074) {
      case 0:
        return impl40897_1071.call(self40899_1073);
        break;
      case 1:
        return impl40898_1072.call(self40899_1073, args40895[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args40895.length ?? ""}`);
    }
    ;
  }, "f40894");
  return f40894;
})();
var projGetRemarks = /* @__PURE__ */ (() => {
  const impl41049_1076 = /* @__PURE__ */ __name(async function() {
    return projGetRemarks({});
  }, "impl41049_1076");
  const impl41050_1077 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_get_remarks", { "rettype": "string", "argtypes": [["obj", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl41050_1077");
  const f41046 = /* @__PURE__ */ __name(function(...args41047) {
    const self41051_1078 = this;
    const G__41117_1079 = args41047.length;
    switch (G__41117_1079) {
      case 0:
        return impl41049_1076.call(self41051_1078);
        break;
      case 1:
        return impl41050_1077.call(self41051_1078, args41047[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args41047.length ?? ""}`);
    }
    ;
  }, "f41046");
  return f41046;
})();
var projGetGeoidModelsFromDatabase = /* @__PURE__ */ (() => {
  const impl41201_1081 = /* @__PURE__ */ __name(async function() {
    return projGetGeoidModelsFromDatabase({});
  }, "impl41201_1081");
  const impl41202_1082 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_get_geoid_models_from_database", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["auth_name", "string"], ["code", "string"], ["options", "pointer"]], "proj-returns": "string-list" }, opts__225__auto__, "camel");
  }, "impl41202_1082");
  const f41198 = /* @__PURE__ */ __name(function(...args41199) {
    const self41203_1083 = this;
    const G__41269_1084 = args41199.length;
    switch (G__41269_1084) {
      case 0:
        return impl41201_1081.call(self41203_1083);
        break;
      case 1:
        return impl41202_1082.call(self41203_1083, args41199[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args41199.length ?? ""}`);
    }
    ;
  }, "f41198");
  return f41198;
})();
var projCrsAlterCsLinearUnit = /* @__PURE__ */ (() => {
  const impl41353_1086 = /* @__PURE__ */ __name(async function() {
    return projCrsAlterCsLinearUnit({});
  }, "impl41353_1086");
  const impl41354_1087 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_crs_alter_cs_linear_unit", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["obj", "pointer"], ["linear_units", "string"], ["linear_units_conv", "float64"], ["unit_auth_name", "string"], ["unit_code", "string"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl41354_1087");
  const f41350 = /* @__PURE__ */ __name(function(...args41351) {
    const self41355_1088 = this;
    const G__41421_1089 = args41351.length;
    switch (G__41421_1089) {
      case 0:
        return impl41353_1086.call(self41355_1088);
        break;
      case 1:
        return impl41354_1087.call(self41355_1088, args41351[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args41351.length ?? ""}`);
    }
    ;
  }, "f41350");
  return f41350;
})();
var projUomGetInfoFromDatabase = /* @__PURE__ */ (() => {
  const impl41505_1091 = /* @__PURE__ */ __name(async function() {
    return projUomGetInfoFromDatabase({});
  }, "impl41505_1091");
  const impl41506_1092 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_uom_get_info_from_database", { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["name", "string"], ["conv-factor", "double"], ["category", "string"]], "argtypes": [["context", "pointer"], ["auth_name", "string"], ["code", "string"], ["out_name", "pointer"], ["out_conv_factor", "pointer"], ["out_category", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl41506_1092");
  const f41502 = /* @__PURE__ */ __name(function(...args41503) {
    const self41507_1093 = this;
    const G__41573_1094 = args41503.length;
    switch (G__41573_1094) {
      case 0:
        return impl41505_1091.call(self41507_1093);
        break;
      case 1:
        return impl41506_1092.call(self41507_1093, args41503[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args41503.length ?? ""}`);
    }
    ;
  }, "f41502");
  return f41502;
})();
var projNormalizeForVisualization = /* @__PURE__ */ (() => {
  const impl41657_1096 = /* @__PURE__ */ __name(async function() {
    return projNormalizeForVisualization({});
  }, "impl41657_1096");
  const impl41658_1097 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_normalize_for_visualization", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["obj", "pointer"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl41658_1097");
  const f41654 = /* @__PURE__ */ __name(function(...args41655) {
    const self41659_1098 = this;
    const G__41725_1099 = args41655.length;
    switch (G__41725_1099) {
      case 0:
        return impl41657_1096.call(self41659_1098);
        break;
      case 1:
        return impl41658_1097.call(self41659_1098, args41655[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args41655.length ?? ""}`);
    }
    ;
  }, "f41654");
  return f41654;
})();
var projCrsGetDatumEnsemble = /* @__PURE__ */ (() => {
  const impl41809_1101 = /* @__PURE__ */ __name(async function() {
    return projCrsGetDatumEnsemble({});
  }, "impl41809_1101");
  const impl41810_1102 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_crs_get_datum_ensemble", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl41810_1102");
  const f41806 = /* @__PURE__ */ __name(function(...args41807) {
    const self41811_1103 = this;
    const G__41877_1104 = args41807.length;
    switch (G__41877_1104) {
      case 0:
        return impl41809_1101.call(self41811_1103);
        break;
      case 1:
        return impl41810_1102.call(self41811_1103, args41807[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args41807.length ?? ""}`);
    }
    ;
  }, "f41806");
  return f41806;
})();
var projCreateCrsToCrs = /* @__PURE__ */ (() => {
  const impl41961_1106 = /* @__PURE__ */ __name(async function() {
    return projCreateCrsToCrs({});
  }, "impl41961_1106");
  const impl41962_1107 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_create_crs_to_crs", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["source_crs", "string"], ["target_crs", "string"], ["area", "pointer?"]], "argsemantics": [["area", "pj-area", "default", 0]], "proj-returns": "pj", "isolate-context?": true }, opts__225__auto__, "camel");
  }, "impl41962_1107");
  const f41958 = /* @__PURE__ */ __name(function(...args41959) {
    const self41963_1108 = this;
    const G__42029_1109 = args41959.length;
    switch (G__42029_1109) {
      case 0:
        return impl41961_1106.call(self41963_1108);
        break;
      case 1:
        return impl41962_1107.call(self41963_1108, args41959[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args41959.length ?? ""}`);
    }
    ;
  }, "f41958");
  return f41958;
})();
var projAlterName = /* @__PURE__ */ (() => {
  const impl42113_1111 = /* @__PURE__ */ __name(async function() {
    return projAlterName({});
  }, "impl42113_1111");
  const impl42114_1112 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_alter_name", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["obj", "pointer"], ["name", "string"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl42114_1112");
  const f42110 = /* @__PURE__ */ __name(function(...args42111) {
    const self42115_1113 = this;
    const G__42181_1114 = args42111.length;
    switch (G__42181_1114) {
      case 0:
        return impl42113_1111.call(self42115_1113);
        break;
      case 1:
        return impl42114_1112.call(self42115_1113, args42111[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args42111.length ?? ""}`);
    }
    ;
  }, "f42110");
  return f42110;
})();
var projCoordinateMetadataGetEpoch = /* @__PURE__ */ (() => {
  const impl42265_1116 = /* @__PURE__ */ __name(async function() {
    return projCoordinateMetadataGetEpoch({});
  }, "impl42265_1116");
  const impl42266_1117 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_coordinate_metadata_get_epoch", { "rettype": "float64", "argtypes": [["ctx", "pointer"], ["obj", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl42266_1117");
  const f42262 = /* @__PURE__ */ __name(function(...args42263) {
    const self42267_1118 = this;
    const G__42333_1119 = args42263.length;
    switch (G__42333_1119) {
      case 0:
        return impl42265_1116.call(self42267_1118);
        break;
      case 1:
        return impl42266_1117.call(self42267_1118, args42263[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args42263.length ?? ""}`);
    }
    ;
  }, "f42262");
  return f42262;
})();
var projContextErrno = /* @__PURE__ */ (() => {
  const impl42417_1121 = /* @__PURE__ */ __name(async function() {
    return projContextErrno({});
  }, "impl42417_1121");
  const impl42418_1122 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_context_errno", { "rettype": "int32", "argtypes": [["context", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl42418_1122");
  const f42414 = /* @__PURE__ */ __name(function(...args42415) {
    const self42419_1123 = this;
    const G__42485_1124 = args42415.length;
    switch (G__42485_1124) {
      case 0:
        return impl42417_1121.call(self42419_1123);
        break;
      case 1:
        return impl42418_1122.call(self42419_1123, args42415[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args42415.length ?? ""}`);
    }
    ;
  }, "f42414");
  return f42414;
})();
var projTransGeneric = /* @__PURE__ */ (() => {
  const impl42569_1126 = /* @__PURE__ */ __name(async function() {
    return projTransGeneric({});
  }, "impl42569_1126");
  const impl42570_1127 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_trans_generic", { "rettype": "size-t", "argtypes": [["p", "pointer"], ["direction", "int32"], ["x", "pointer"], ["sx", "size-t"], ["nx", "size-t"], ["y", "pointer"], ["sy", "size-t"], ["ny", "size-t"], ["z", "pointer?"], ["sz", "size-t"], ["nz", "size-t"], ["t", "pointer?"], ["st", "size-t"], ["nt", "size-t"]] }, opts__225__auto__, "camel");
  }, "impl42570_1127");
  const f42566 = /* @__PURE__ */ __name(function(...args42567) {
    const self42571_1128 = this;
    const G__42637_1129 = args42567.length;
    switch (G__42637_1129) {
      case 0:
        return impl42569_1126.call(self42571_1128);
        break;
      case 1:
        return impl42570_1127.call(self42571_1128, args42567[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args42567.length ?? ""}`);
    }
    ;
  }, "f42566");
  return f42566;
})();
var projClone = /* @__PURE__ */ (() => {
  const impl42721_1131 = /* @__PURE__ */ __name(async function() {
    return projClone({});
  }, "impl42721_1131");
  const impl42722_1132 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_clone", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["p", "pointer"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl42722_1132");
  const f42718 = /* @__PURE__ */ __name(function(...args42719) {
    const self42723_1133 = this;
    const G__42789_1134 = args42719.length;
    switch (G__42789_1134) {
      case 0:
        return impl42721_1131.call(self42723_1133);
        break;
      case 1:
        return impl42722_1132.call(self42723_1133, args42719[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args42719.length ?? ""}`);
    }
    ;
  }, "f42718");
  return f42718;
})();
var projCoordoperationCreateInverse = /* @__PURE__ */ (() => {
  const impl42873_1136 = /* @__PURE__ */ __name(async function() {
    return projCoordoperationCreateInverse({});
  }, "impl42873_1136");
  const impl42874_1137 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_coordoperation_create_inverse", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["obj", "pointer"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl42874_1137");
  const f42870 = /* @__PURE__ */ __name(function(...args42871) {
    const self42875_1138 = this;
    const G__42941_1139 = args42871.length;
    switch (G__42941_1139) {
      case 0:
        return impl42873_1136.call(self42875_1138);
        break;
      case 1:
        return impl42874_1137.call(self42875_1138, args42871[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args42871.length ?? ""}`);
    }
    ;
  }, "f42870");
  return f42870;
})();
var projCrsDemoteTo2D = /* @__PURE__ */ (() => {
  const impl43025_1141 = /* @__PURE__ */ __name(async function() {
    return projCrsDemoteTo2D({});
  }, "impl43025_1141");
  const impl43026_1142 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_crs_demote_to_2D", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_2D_name", "string"], ["crs_3D", "pointer"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl43026_1142");
  const f43022 = /* @__PURE__ */ __name(function(...args43023) {
    const self43027_1143 = this;
    const G__43093_1144 = args43023.length;
    switch (G__43093_1144) {
      case 0:
        return impl43025_1141.call(self43027_1143);
        break;
      case 1:
        return impl43026_1142.call(self43027_1143, args43023[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args43023.length ?? ""}`);
    }
    ;
  }, "f43022");
  return f43022;
})();
var projCreateCartesian2DCs = /* @__PURE__ */ (() => {
  const impl43177_1146 = /* @__PURE__ */ __name(async function() {
    return projCreateCartesian2DCs({});
  }, "impl43177_1146");
  const impl43178_1147 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_create_cartesian_2D_cs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["type", "int32"], ["unit_name", "string"], ["unit_conv_factor", "float64"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl43178_1147");
  const f43174 = /* @__PURE__ */ __name(function(...args43175) {
    const self43179_1148 = this;
    const G__43245_1149 = args43175.length;
    switch (G__43245_1149) {
      case 0:
        return impl43177_1146.call(self43179_1148);
        break;
      case 1:
        return impl43178_1147.call(self43179_1148, args43175[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args43175.length ?? ""}`);
    }
    ;
  }, "f43174");
  return f43174;
})();
var projContextIsNetworkEnabled = /* @__PURE__ */ (() => {
  const impl43329_1151 = /* @__PURE__ */ __name(async function() {
    return projContextIsNetworkEnabled({});
  }, "impl43329_1151");
  const impl43330_1152 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_context_is_network_enabled", { "rettype": "int32", "argtypes": [["context", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl43330_1152");
  const f43326 = /* @__PURE__ */ __name(function(...args43327) {
    const self43331_1153 = this;
    const G__43397_1154 = args43327.length;
    switch (G__43397_1154) {
      case 0:
        return impl43329_1151.call(self43331_1153);
        break;
      case 1:
        return impl43330_1152.call(self43331_1153, args43327[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args43327.length ?? ""}`);
    }
    ;
  }, "f43326");
  return f43326;
})();
var projGetScope = /* @__PURE__ */ (() => {
  const impl43481_1156 = /* @__PURE__ */ __name(async function() {
    return projGetScope({});
  }, "impl43481_1156");
  const impl43482_1157 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_get_scope", { "rettype": "string", "argtypes": [["obj", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl43482_1157");
  const f43478 = /* @__PURE__ */ __name(function(...args43479) {
    const self43483_1158 = this;
    const G__43549_1159 = args43479.length;
    switch (G__43549_1159) {
      case 0:
        return impl43481_1156.call(self43483_1158);
        break;
      case 1:
        return impl43482_1157.call(self43483_1158, args43479[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args43479.length ?? ""}`);
    }
    ;
  }, "f43478");
  return f43478;
})();
var projDestroy = /* @__PURE__ */ (() => {
  const impl43633_1161 = /* @__PURE__ */ __name(async function() {
    return projDestroy({});
  }, "impl43633_1161");
  const impl43634_1162 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_destroy", { "rettype": "pointer", "argtypes": [["pj", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl43634_1162");
  const f43630 = /* @__PURE__ */ __name(function(...args43631) {
    const self43635_1163 = this;
    const G__43701_1164 = args43631.length;
    switch (G__43701_1164) {
      case 0:
        return impl43633_1161.call(self43635_1163);
        break;
      case 1:
        return impl43634_1162.call(self43635_1163, args43631[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args43631.length ?? ""}`);
    }
    ;
  }, "f43630");
  return f43630;
})();
var projOperationFactoryContextSetAllowBallparkTransformations = /* @__PURE__ */ (() => {
  const impl43785_1166 = /* @__PURE__ */ __name(async function() {
    return projOperationFactoryContextSetAllowBallparkTransformations({});
  }, "impl43785_1166");
  const impl43786_1167 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_operation_factory_context_set_allow_ballpark_transformations", { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["allow", "int32"]] }, opts__225__auto__, "camel");
  }, "impl43786_1167");
  const f43782 = /* @__PURE__ */ __name(function(...args43783) {
    const self43787_1168 = this;
    const G__43853_1169 = args43783.length;
    switch (G__43853_1169) {
      case 0:
        return impl43785_1166.call(self43787_1168);
        break;
      case 1:
        return impl43786_1167.call(self43787_1168, args43783[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args43783.length ?? ""}`);
    }
    ;
  }, "f43782");
  return f43782;
})();
var projCrsGetDatum = /* @__PURE__ */ (() => {
  const impl43937_1171 = /* @__PURE__ */ __name(async function() {
    return projCrsGetDatum({});
  }, "impl43937_1171");
  const impl43938_1172 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_crs_get_datum", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl43938_1172");
  const f43934 = /* @__PURE__ */ __name(function(...args43935) {
    const self43939_1173 = this;
    const G__44005_1174 = args43935.length;
    switch (G__44005_1174) {
      case 0:
        return impl43937_1171.call(self43939_1173);
        break;
      case 1:
        return impl43938_1172.call(self43939_1173, args43935[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args43935.length ?? ""}`);
    }
    ;
  }, "f43934");
  return f43934;
})();
var projOperationFactoryContextSetAreaOfInterest = /* @__PURE__ */ (() => {
  const impl44089_1176 = /* @__PURE__ */ __name(async function() {
    return projOperationFactoryContextSetAreaOfInterest({});
  }, "impl44089_1176");
  const impl44090_1177 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_operation_factory_context_set_area_of_interest", { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["west_lon_degree", "float64"], ["south_lat_degree", "float64"], ["east_lon_degree", "float64"], ["north_lat_degree", "float64"]] }, opts__225__auto__, "camel");
  }, "impl44090_1177");
  const f44086 = /* @__PURE__ */ __name(function(...args44087) {
    const self44091_1178 = this;
    const G__44157_1179 = args44087.length;
    switch (G__44157_1179) {
      case 0:
        return impl44089_1176.call(self44091_1178);
        break;
      case 1:
        return impl44090_1177.call(self44091_1178, args44087[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args44087.length ?? ""}`);
    }
    ;
  }, "f44086");
  return f44086;
})();
var projCreateCs = /* @__PURE__ */ (() => {
  const impl44241_1181 = /* @__PURE__ */ __name(async function() {
    return projCreateCs({});
  }, "impl44241_1181");
  const impl44242_1182 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_create_cs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["type", "int32"], ["axis_count", "int32"], ["axis", "pointer"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl44242_1182");
  const f44238 = /* @__PURE__ */ __name(function(...args44239) {
    const self44243_1183 = this;
    const G__44309_1184 = args44239.length;
    switch (G__44309_1184) {
      case 0:
        return impl44241_1181.call(self44243_1183);
        break;
      case 1:
        return impl44242_1182.call(self44243_1183, args44239[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args44239.length ?? ""}`);
    }
    ;
  }, "f44238");
  return f44238;
})();
var projCreateProjectedCrs = /* @__PURE__ */ (() => {
  const impl44393_1186 = /* @__PURE__ */ __name(async function() {
    return projCreateProjectedCrs({});
  }, "impl44393_1186");
  const impl44394_1187 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_create_projected_crs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_name", "string"], ["geodetic_crs", "pointer"], ["conversion", "pointer"], ["coordinate_system", "pointer"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl44394_1187");
  const f44390 = /* @__PURE__ */ __name(function(...args44391) {
    const self44395_1188 = this;
    const G__44461_1189 = args44391.length;
    switch (G__44461_1189) {
      case 0:
        return impl44393_1186.call(self44395_1188);
        break;
      case 1:
        return impl44394_1187.call(self44395_1188, args44391[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args44391.length ?? ""}`);
    }
    ;
  }, "f44390");
  return f44390;
})();
var projAsProjString = /* @__PURE__ */ (() => {
  const impl44545_1191 = /* @__PURE__ */ __name(async function() {
    return projAsProjString({});
  }, "impl44545_1191");
  const impl44546_1192 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_as_proj_string", { "rettype": "string", "argtypes": [["context", "pointer"], ["pj", "pointer"], ["type", "int32"], ["options", "pointer?"]], "argsemantics": [["options", "string-array?", "default", null]] }, opts__225__auto__, "camel");
  }, "impl44546_1192");
  const f44542 = /* @__PURE__ */ __name(function(...args44543) {
    const self44547_1193 = this;
    const G__44613_1194 = args44543.length;
    switch (G__44613_1194) {
      case 0:
        return impl44545_1191.call(self44547_1193);
        break;
      case 1:
        return impl44546_1192.call(self44547_1193, args44543[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args44543.length ?? ""}`);
    }
    ;
  }, "f44542");
  return f44542;
})();
var projOperationFactoryContextSetGridAvailabilityUse = /* @__PURE__ */ (() => {
  const impl44697_1196 = /* @__PURE__ */ __name(async function() {
    return projOperationFactoryContextSetGridAvailabilityUse({});
  }, "impl44697_1196");
  const impl44698_1197 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_operation_factory_context_set_grid_availability_use", { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["use", "int32"]] }, opts__225__auto__, "camel");
  }, "impl44698_1197");
  const f44694 = /* @__PURE__ */ __name(function(...args44695) {
    const self44699_1198 = this;
    const G__44765_1199 = args44695.length;
    switch (G__44765_1199) {
      case 0:
        return impl44697_1196.call(self44699_1198);
        break;
      case 1:
        return impl44698_1197.call(self44699_1198, args44695[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args44695.length ?? ""}`);
    }
    ;
  }, "f44694");
  return f44694;
})();
var projCreateDerivedGeographicCrs = /* @__PURE__ */ (() => {
  const impl44849_1201 = /* @__PURE__ */ __name(async function() {
    return projCreateDerivedGeographicCrs({});
  }, "impl44849_1201");
  const impl44850_1202 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_create_derived_geographic_crs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_name", "string"], ["base_geographic_crs", "pointer"], ["conversion", "pointer"], ["ellipsoidal_cs", "pointer"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl44850_1202");
  const f44846 = /* @__PURE__ */ __name(function(...args44847) {
    const self44851_1203 = this;
    const G__44917_1204 = args44847.length;
    switch (G__44917_1204) {
      case 0:
        return impl44849_1201.call(self44851_1203);
        break;
      case 1:
        return impl44850_1202.call(self44851_1203, args44847[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args44847.length ?? ""}`);
    }
    ;
  }, "f44846");
  return f44846;
})();
var projCreateCrsToCrsFromPj = /* @__PURE__ */ (() => {
  const impl45001_1206 = /* @__PURE__ */ __name(async function() {
    return projCreateCrsToCrsFromPj({});
  }, "impl45001_1206");
  const impl45002_1207 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_create_crs_to_crs_from_pj", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["source_crs", "pointer"], ["target_crs", "pointer"], ["area", "pointer?"], ["options", "pointer?"]], "argsemantics": [["area", "pj-area", "default", 0], ["options", "string-array?", "default", null]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl45002_1207");
  const f44998 = /* @__PURE__ */ __name(function(...args44999) {
    const self45003_1208 = this;
    const G__45069_1209 = args44999.length;
    switch (G__45069_1209) {
      case 0:
        return impl45001_1206.call(self45003_1208);
        break;
      case 1:
        return impl45002_1207.call(self45003_1208, args44999[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args44999.length ?? ""}`);
    }
    ;
  }, "f44998");
  return f44998;
})();
var projCoordoperationGetMethodInfo = /* @__PURE__ */ (() => {
  const impl45153_1211 = /* @__PURE__ */ __name(async function() {
    return projCoordoperationGetMethodInfo({});
  }, "impl45153_1211");
  const impl45154_1212 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_coordoperation_get_method_info", { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["method-name", "string"], ["method-auth-name", "string"], ["method-code", "string"]], "argtypes": [["ctx", "pointer"], ["coordoperation", "pointer"], ["out_method_name", "pointer"], ["out_method_auth_name", "pointer"], ["out_method_code", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl45154_1212");
  const f45150 = /* @__PURE__ */ __name(function(...args45151) {
    const self45155_1213 = this;
    const G__45221_1214 = args45151.length;
    switch (G__45221_1214) {
      case 0:
        return impl45153_1211.call(self45155_1213);
        break;
      case 1:
        return impl45154_1212.call(self45155_1213, args45151[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args45151.length ?? ""}`);
    }
    ;
  }, "f45150");
  return f45150;
})();
var projGetSourceCrs = /* @__PURE__ */ (() => {
  const impl45305_1216 = /* @__PURE__ */ __name(async function() {
    return projGetSourceCrs({});
  }, "impl45305_1216");
  const impl45306_1217 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_get_source_crs", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["pj", "pointer"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl45306_1217");
  const f45302 = /* @__PURE__ */ __name(function(...args45303) {
    const self45307_1218 = this;
    const G__45373_1219 = args45303.length;
    switch (G__45373_1219) {
      case 0:
        return impl45305_1216.call(self45307_1218);
        break;
      case 1:
        return impl45306_1217.call(self45307_1218, args45303[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args45303.length ?? ""}`);
    }
    ;
  }, "f45302");
  return f45302;
})();
var projEllipsoidGetParameters = /* @__PURE__ */ (() => {
  const impl45457_1221 = /* @__PURE__ */ __name(async function() {
    return projEllipsoidGetParameters({});
  }, "impl45457_1221");
  const impl45458_1222 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_ellipsoid_get_parameters", { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["semi-major-metre", "double"], ["semi-minor-metre", "double"], ["is-semi-minor-computed", "int"], ["inv-flattening", "double"]], "argtypes": [["ctx", "pointer"], ["ellipsoid", "pointer"], ["out_semi_major_metre", "pointer"], ["out_semi_minor_metre", "pointer"], ["out_is_semi_minor_computed", "pointer"], ["out_inv_flattening", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl45458_1222");
  const f45454 = /* @__PURE__ */ __name(function(...args45455) {
    const self45459_1223 = this;
    const G__45525_1224 = args45455.length;
    switch (G__45525_1224) {
      case 0:
        return impl45457_1221.call(self45459_1223);
        break;
      case 1:
        return impl45458_1222.call(self45459_1223, args45455[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args45455.length ?? ""}`);
    }
    ;
  }, "f45454");
  return f45454;
})();
var projContextDestroy = /* @__PURE__ */ (() => {
  const impl45609_1226 = /* @__PURE__ */ __name(async function() {
    return projContextDestroy({});
  }, "impl45609_1226");
  const impl45610_1227 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_context_destroy", { "rettype": "void", "argtypes": [["context", "pointer"]], "is-context-fn": false }, opts__225__auto__, "camel");
  }, "impl45610_1227");
  const f45606 = /* @__PURE__ */ __name(function(...args45607) {
    const self45611_1228 = this;
    const G__45677_1229 = args45607.length;
    switch (G__45677_1229) {
      case 0:
        return impl45609_1226.call(self45611_1228);
        break;
      case 1:
        return impl45610_1227.call(self45611_1228, args45607[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args45607.length ?? ""}`);
    }
    ;
  }, "f45606");
  return f45606;
})();
var projCsGetAxisInfo = /* @__PURE__ */ (() => {
  const impl45761_1231 = /* @__PURE__ */ __name(async function() {
    return projCsGetAxisInfo({});
  }, "impl45761_1231");
  const impl45762_1232 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_cs_get_axis_info", { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["name", "string"], ["abbreviation", "string"], ["direction", "string"], ["unit-conv-factor", "double"], ["unit-name", "string"], ["unit-auth-name", "string"], ["unit-code", "string"]], "argtypes": [["ctx", "pointer"], ["cs", "pointer"], ["index", "int32"], ["out_name", "pointer"], ["out_abbrev", "pointer"], ["out_direction", "pointer"], ["out_unit_conv_factor", "pointer"], ["out_unit_name", "pointer"], ["out_unit_auth_name", "pointer"], ["out_unit_code", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl45762_1232");
  const f45758 = /* @__PURE__ */ __name(function(...args45759) {
    const self45763_1233 = this;
    const G__45829_1234 = args45759.length;
    switch (G__45829_1234) {
      case 0:
        return impl45761_1231.call(self45763_1233);
        break;
      case 1:
        return impl45762_1232.call(self45763_1233, args45759[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args45759.length ?? ""}`);
    }
    ;
  }, "f45758");
  return f45758;
})();
var projQueryGeodeticCrsFromDatum = /* @__PURE__ */ (() => {
  const impl45913_1236 = /* @__PURE__ */ __name(async function() {
    return projQueryGeodeticCrsFromDatum({});
  }, "impl45913_1236");
  const impl45914_1237 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_query_geodetic_crs_from_datum", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_auth_name", "string"], ["datum_auth_name", "string"], ["datum_code", "string"], ["crs_type", "string"]], "proj-returns": "pj-list" }, opts__225__auto__, "camel");
  }, "impl45914_1237");
  const f45910 = /* @__PURE__ */ __name(function(...args45911) {
    const self45915_1238 = this;
    const G__45981_1239 = args45911.length;
    switch (G__45981_1239) {
      case 0:
        return impl45913_1236.call(self45915_1238);
        break;
      case 1:
        return impl45914_1237.call(self45915_1238, args45911[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args45911.length ?? ""}`);
    }
    ;
  }, "f45910");
  return f45910;
})();
var projCoordoperationRequiresPerCoordinateInputTime = /* @__PURE__ */ (() => {
  const impl46065_1241 = /* @__PURE__ */ __name(async function() {
    return projCoordoperationRequiresPerCoordinateInputTime({});
  }, "impl46065_1241");
  const impl46066_1242 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_coordoperation_requires_per_coordinate_input_time", { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["coordoperation", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl46066_1242");
  const f46062 = /* @__PURE__ */ __name(function(...args46063) {
    const self46067_1243 = this;
    const G__46133_1244 = args46063.length;
    switch (G__46133_1244) {
      case 0:
        return impl46065_1241.call(self46067_1243);
        break;
      case 1:
        return impl46066_1242.call(self46067_1243, args46063[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args46063.length ?? ""}`);
    }
    ;
  }, "f46062");
  return f46062;
})();
var projCreateEllipsoidal2DCs = /* @__PURE__ */ (() => {
  const impl46217_1246 = /* @__PURE__ */ __name(async function() {
    return projCreateEllipsoidal2DCs({});
  }, "impl46217_1246");
  const impl46218_1247 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_create_ellipsoidal_2D_cs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["type", "int32"], ["unit_name", "string"], ["unit_conv_factor", "float64"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl46218_1247");
  const f46214 = /* @__PURE__ */ __name(function(...args46215) {
    const self46219_1248 = this;
    const G__46285_1249 = args46215.length;
    switch (G__46285_1249) {
      case 0:
        return impl46217_1246.call(self46219_1248);
        break;
      case 1:
        return impl46218_1247.call(self46219_1248, args46215[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args46215.length ?? ""}`);
    }
    ;
  }, "f46214");
  return f46214;
})();
var projCreateFromDatabase = /* @__PURE__ */ (() => {
  const impl46369_1251 = /* @__PURE__ */ __name(async function() {
    return projCreateFromDatabase({});
  }, "impl46369_1251");
  const impl46370_1252 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_create_from_database", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["auth_name", "string"], ["code", "string"], ["category", "int32"], ["use-proj-alternative-grid-names", "int32"], ["options", "pointer?"]], "argsemantics": [["category", "int32", "default", 3], ["use-proj-alternative-grid-names", "boolean", "default", false], ["options", "string-array?", "default", null]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl46370_1252");
  const f46366 = /* @__PURE__ */ __name(function(...args46367) {
    const self46371_1253 = this;
    const G__46437_1254 = args46367.length;
    switch (G__46437_1254) {
      case 0:
        return impl46369_1251.call(self46371_1253);
        break;
      case 1:
        return impl46370_1252.call(self46371_1253, args46367[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args46367.length ?? ""}`);
    }
    ;
  }, "f46366");
  return f46366;
})();
var projAlterId = /* @__PURE__ */ (() => {
  const impl46521_1256 = /* @__PURE__ */ __name(async function() {
    return projAlterId({});
  }, "impl46521_1256");
  const impl46522_1257 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_alter_id", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["obj", "pointer"], ["auth_name", "string"], ["code", "string"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl46522_1257");
  const f46518 = /* @__PURE__ */ __name(function(...args46519) {
    const self46523_1258 = this;
    const G__46589_1259 = args46519.length;
    switch (G__46589_1259) {
      case 0:
        return impl46521_1256.call(self46523_1258);
        break;
      case 1:
        return impl46522_1257.call(self46523_1258, args46519[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args46519.length ?? ""}`);
    }
    ;
  }, "f46518");
  return f46518;
})();
var projCrsHasPointMotionOperation = /* @__PURE__ */ (() => {
  const impl46673_1261 = /* @__PURE__ */ __name(async function() {
    return projCrsHasPointMotionOperation({});
  }, "impl46673_1261");
  const impl46674_1262 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_crs_has_point_motion_operation", { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl46674_1262");
  const f46670 = /* @__PURE__ */ __name(function(...args46671) {
    const self46675_1263 = this;
    const G__46741_1264 = args46671.length;
    switch (G__46741_1264) {
      case 0:
        return impl46673_1261.call(self46675_1263);
        break;
      case 1:
        return impl46674_1262.call(self46675_1263, args46671[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args46671.length ?? ""}`);
    }
    ;
  }, "f46670");
  return f46670;
})();
var projOperationFactoryContextSetAllowedIntermediateCrs = /* @__PURE__ */ (() => {
  const impl46825_1266 = /* @__PURE__ */ __name(async function() {
    return projOperationFactoryContextSetAllowedIntermediateCrs({});
  }, "impl46825_1266");
  const impl46826_1267 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_operation_factory_context_set_allowed_intermediate_crs", { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["list_of_auth_name_codes", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl46826_1267");
  const f46822 = /* @__PURE__ */ __name(function(...args46823) {
    const self46827_1268 = this;
    const G__46893_1269 = args46823.length;
    switch (G__46893_1269) {
      case 0:
        return impl46825_1266.call(self46827_1268);
        break;
      case 1:
        return impl46826_1267.call(self46827_1268, args46823[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args46823.length ?? ""}`);
    }
    ;
  }, "f46822");
  return f46822;
})();
var projCrsPromoteTo3D = /* @__PURE__ */ (() => {
  const impl46977_1271 = /* @__PURE__ */ __name(async function() {
    return projCrsPromoteTo3D({});
  }, "impl46977_1271");
  const impl46978_1272 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_crs_promote_to_3D", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_3D_name", "string"], ["crs_2D", "pointer"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl46978_1272");
  const f46974 = /* @__PURE__ */ __name(function(...args46975) {
    const self46979_1273 = this;
    const G__47045_1274 = args46975.length;
    switch (G__47045_1274) {
      case 0:
        return impl46977_1271.call(self46979_1273);
        break;
      case 1:
        return impl46978_1272.call(self46979_1273, args46975[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args46975.length ?? ""}`);
    }
    ;
  }, "f46974");
  return f46974;
})();
var projGetPrimeMeridian = /* @__PURE__ */ (() => {
  const impl47129_1276 = /* @__PURE__ */ __name(async function() {
    return projGetPrimeMeridian({});
  }, "impl47129_1276");
  const impl47130_1277 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_get_prime_meridian", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["obj", "pointer"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl47130_1277");
  const f47126 = /* @__PURE__ */ __name(function(...args47127) {
    const self47131_1278 = this;
    const G__47197_1279 = args47127.length;
    switch (G__47197_1279) {
      case 0:
        return impl47129_1276.call(self47131_1278);
        break;
      case 1:
        return impl47130_1277.call(self47131_1278, args47127[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args47127.length ?? ""}`);
    }
    ;
  }, "f47126");
  return f47126;
})();
var projDatumEnsembleGetAccuracy = /* @__PURE__ */ (() => {
  const impl47281_1281 = /* @__PURE__ */ __name(async function() {
    return projDatumEnsembleGetAccuracy({});
  }, "impl47281_1281");
  const impl47282_1282 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_datum_ensemble_get_accuracy", { "rettype": "float64", "argtypes": [["ctx", "pointer"], ["datum_ensemble", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl47282_1282");
  const f47278 = /* @__PURE__ */ __name(function(...args47279) {
    const self47283_1283 = this;
    const G__47349_1284 = args47279.length;
    switch (G__47349_1284) {
      case 0:
        return impl47281_1281.call(self47283_1283);
        break;
      case 1:
        return impl47282_1282.call(self47283_1283, args47279[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args47279.length ?? ""}`);
    }
    ;
  }, "f47278");
  return f47278;
})();
var projGetAuthoritiesFromDatabase = /* @__PURE__ */ (() => {
  const impl47433_1286 = /* @__PURE__ */ __name(async function() {
    return projGetAuthoritiesFromDatabase({});
  }, "impl47433_1286");
  const impl47434_1287 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_get_authorities_from_database", { "rettype": "pointer", "argtypes": [["context", "pointer"]], "proj-returns": "string-list" }, opts__225__auto__, "camel");
  }, "impl47434_1287");
  const f47430 = /* @__PURE__ */ __name(function(...args47431) {
    const self47435_1288 = this;
    const G__47501_1289 = args47431.length;
    switch (G__47501_1289) {
      case 0:
        return impl47433_1286.call(self47435_1288);
        break;
      case 1:
        return impl47434_1287.call(self47435_1288, args47431[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args47431.length ?? ""}`);
    }
    ;
  }, "f47430");
  return f47430;
})();
var projGetScopeEx = /* @__PURE__ */ (() => {
  const impl47585_1291 = /* @__PURE__ */ __name(async function() {
    return projGetScopeEx({});
  }, "impl47585_1291");
  const impl47586_1292 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_get_scope_ex", { "rettype": "string", "argtypes": [["obj", "pointer"], ["domainIdx", "int32"]] }, opts__225__auto__, "camel");
  }, "impl47586_1292");
  const f47582 = /* @__PURE__ */ __name(function(...args47583) {
    const self47587_1293 = this;
    const G__47653_1294 = args47583.length;
    switch (G__47653_1294) {
      case 0:
        return impl47585_1291.call(self47587_1293);
        break;
      case 1:
        return impl47586_1292.call(self47587_1293, args47583[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args47583.length ?? ""}`);
    }
    ;
  }, "f47582");
  return f47582;
})();
var projGetTargetCrs = /* @__PURE__ */ (() => {
  const impl47737_1296 = /* @__PURE__ */ __name(async function() {
    return projGetTargetCrs({});
  }, "impl47737_1296");
  const impl47738_1297 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_get_target_crs", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["pj", "pointer"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl47738_1297");
  const f47734 = /* @__PURE__ */ __name(function(...args47735) {
    const self47739_1298 = this;
    const G__47805_1299 = args47735.length;
    switch (G__47805_1299) {
      case 0:
        return impl47737_1296.call(self47739_1298);
        break;
      case 1:
        return impl47738_1297.call(self47739_1298, args47735[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args47735.length ?? ""}`);
    }
    ;
  }, "f47734");
  return f47734;
})();
var projGetAreaOfUseEx = /* @__PURE__ */ (() => {
  const impl47889_1301 = /* @__PURE__ */ __name(async function() {
    return projGetAreaOfUseEx({});
  }, "impl47889_1301");
  const impl47890_1302 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_get_area_of_use_ex", { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["west-lon-degree", "double"], ["south-lat-degree", "double"], ["east-lon-degree", "double"], ["north-lat-degree", "double"], ["area-name", "string"]], "argtypes": [["context", "pointer"], ["obj", "pointer"], ["domainIdx", "int32"], ["out_west_lon_degree", "pointer"], ["out_south_lat_degree", "pointer"], ["out_east_lon_degree", "pointer"], ["out_north_lat_degree", "pointer"], ["out_area_name", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl47890_1302");
  const f47886 = /* @__PURE__ */ __name(function(...args47887) {
    const self47891_1303 = this;
    const G__47957_1304 = args47887.length;
    switch (G__47957_1304) {
      case 0:
        return impl47889_1301.call(self47891_1303);
        break;
      case 1:
        return impl47890_1302.call(self47891_1303, args47887[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args47887.length ?? ""}`);
    }
    ;
  }, "f47886");
  return f47886;
})();
var projGetIdAuthName = /* @__PURE__ */ (() => {
  const impl48041_1306 = /* @__PURE__ */ __name(async function() {
    return projGetIdAuthName({});
  }, "impl48041_1306");
  const impl48042_1307 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_get_id_auth_name", { "rettype": "string", "argtypes": [["obj", "pointer"], ["index", "int32"]] }, opts__225__auto__, "camel");
  }, "impl48042_1307");
  const f48038 = /* @__PURE__ */ __name(function(...args48039) {
    const self48043_1308 = this;
    const G__48109_1309 = args48039.length;
    switch (G__48109_1309) {
      case 0:
        return impl48041_1306.call(self48043_1308);
        break;
      case 1:
        return impl48042_1307.call(self48043_1308, args48039[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args48039.length ?? ""}`);
    }
    ;
  }, "f48038");
  return f48038;
})();
var projCoordinateMetadataCreate = /* @__PURE__ */ (() => {
  const impl48193_1311 = /* @__PURE__ */ __name(async function() {
    return projCoordinateMetadataCreate({});
  }, "impl48193_1311");
  const impl48194_1312 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_coordinate_metadata_create", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs", "pointer"], ["epoch", "float64"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl48194_1312");
  const f48190 = /* @__PURE__ */ __name(function(...args48191) {
    const self48195_1313 = this;
    const G__48261_1314 = args48191.length;
    switch (G__48261_1314) {
      case 0:
        return impl48193_1311.call(self48195_1313);
        break;
      case 1:
        return impl48194_1312.call(self48195_1313, args48191[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args48191.length ?? ""}`);
    }
    ;
  }, "f48190");
  return f48190;
})();
var projCreateGeocentricCrsFromDatum = /* @__PURE__ */ (() => {
  const impl48345_1316 = /* @__PURE__ */ __name(async function() {
    return projCreateGeocentricCrsFromDatum({});
  }, "impl48345_1316");
  const impl48346_1317 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_create_geocentric_crs_from_datum", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_name", "string"], ["datum_or_datum_ensemble", "pointer"], ["linear_units", "string"], ["linear_units_conv", "float64"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl48346_1317");
  const f48342 = /* @__PURE__ */ __name(function(...args48343) {
    const self48347_1318 = this;
    const G__48413_1319 = args48343.length;
    switch (G__48413_1319) {
      case 0:
        return impl48345_1316.call(self48347_1318);
        break;
      case 1:
        return impl48346_1317.call(self48347_1318, args48343[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args48343.length ?? ""}`);
    }
    ;
  }, "f48342");
  return f48342;
})();
var projCrsInfoListDestroy = /* @__PURE__ */ (() => {
  const impl48497_1321 = /* @__PURE__ */ __name(async function() {
    return projCrsInfoListDestroy({});
  }, "impl48497_1321");
  const impl48498_1322 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_crs_info_list_destroy", { "rettype": "void", "argtypes": [["list", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl48498_1322");
  const f48494 = /* @__PURE__ */ __name(function(...args48495) {
    const self48499_1323 = this;
    const G__48565_1324 = args48495.length;
    switch (G__48565_1324) {
      case 0:
        return impl48497_1321.call(self48499_1323);
        break;
      case 1:
        return impl48498_1322.call(self48499_1323, args48495[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args48495.length ?? ""}`);
    }
    ;
  }, "f48494");
  return f48494;
})();
var projOperationFactoryContextSetUseProjAlternativeGridNames = /* @__PURE__ */ (() => {
  const impl48649_1326 = /* @__PURE__ */ __name(async function() {
    return projOperationFactoryContextSetUseProjAlternativeGridNames({});
  }, "impl48649_1326");
  const impl48650_1327 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_operation_factory_context_set_use_proj_alternative_grid_names", { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["usePROJNames", "int32"]] }, opts__225__auto__, "camel");
  }, "impl48650_1327");
  const f48646 = /* @__PURE__ */ __name(function(...args48647) {
    const self48651_1328 = this;
    const G__48717_1329 = args48647.length;
    switch (G__48717_1329) {
      case 0:
        return impl48649_1326.call(self48651_1328);
        break;
      case 1:
        return impl48650_1327.call(self48651_1328, args48647[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args48647.length ?? ""}`);
    }
    ;
  }, "f48646");
  return f48646;
})();
var projContextGetDatabasePath = /* @__PURE__ */ (() => {
  const impl48801_1331 = /* @__PURE__ */ __name(async function() {
    return projContextGetDatabasePath({});
  }, "impl48801_1331");
  const impl48802_1332 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_context_get_database_path", { "rettype": "string", "argtypes": [["context", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl48802_1332");
  const f48798 = /* @__PURE__ */ __name(function(...args48799) {
    const self48803_1333 = this;
    const G__48869_1334 = args48799.length;
    switch (G__48869_1334) {
      case 0:
        return impl48801_1331.call(self48803_1333);
        break;
      case 1:
        return impl48802_1332.call(self48803_1333, args48799[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args48799.length ?? ""}`);
    }
    ;
  }, "f48798");
  return f48798;
})();
var projContextSetNetworkCallbacks = /* @__PURE__ */ (() => {
  const impl48953_1336 = /* @__PURE__ */ __name(async function() {
    return projContextSetNetworkCallbacks({});
  }, "impl48953_1336");
  const impl48954_1337 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_context_set_network_callbacks", { "rettype": "int32", "argtypes": [["context", "pointer"], ["open_cbk", "pointer"], ["close_cbk", "pointer"], ["get_header_cbk", "pointer"], ["read_range_cbk", "pointer"], ["user_data", "pointer?"]] }, opts__225__auto__, "camel");
  }, "impl48954_1337");
  const f48950 = /* @__PURE__ */ __name(function(...args48951) {
    const self48955_1338 = this;
    const G__49021_1339 = args48951.length;
    switch (G__49021_1339) {
      case 0:
        return impl48953_1336.call(self48955_1338);
        break;
      case 1:
        return impl48954_1337.call(self48955_1338, args48951[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args48951.length ?? ""}`);
    }
    ;
  }, "f48950");
  return f48950;
})();
var projIsCrs = /* @__PURE__ */ (() => {
  const impl49105_1341 = /* @__PURE__ */ __name(async function() {
    return projIsCrs({});
  }, "impl49105_1341");
  const impl49106_1342 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_is_crs", { "rettype": "int32", "argtypes": [["obj", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl49106_1342");
  const f49102 = /* @__PURE__ */ __name(function(...args49103) {
    const self49107_1343 = this;
    const G__49173_1344 = args49103.length;
    switch (G__49173_1344) {
      case 0:
        return impl49105_1341.call(self49107_1343);
        break;
      case 1:
        return impl49106_1342.call(self49107_1343, args49103[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args49103.length ?? ""}`);
    }
    ;
  }, "f49102");
  return f49102;
})();
var projGetCrsListParametersDestroy = /* @__PURE__ */ (() => {
  const impl49257_1346 = /* @__PURE__ */ __name(async function() {
    return projGetCrsListParametersDestroy({});
  }, "impl49257_1346");
  const impl49258_1347 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_get_crs_list_parameters_destroy", { "rettype": "void", "argtypes": [["params", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl49258_1347");
  const f49254 = /* @__PURE__ */ __name(function(...args49255) {
    const self49259_1348 = this;
    const G__49325_1349 = args49255.length;
    switch (G__49325_1349) {
      case 0:
        return impl49257_1346.call(self49259_1348);
        break;
      case 1:
        return impl49258_1347.call(self49259_1348, args49255[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args49255.length ?? ""}`);
    }
    ;
  }, "f49254");
  return f49254;
})();
var projXyDist = /* @__PURE__ */ (() => {
  const impl49409_1351 = /* @__PURE__ */ __name(async function() {
    return projXyDist({});
  }, "impl49409_1351");
  const impl49410_1352 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_xy_dist", { "rettype": "float64", "argtypes": [["a", "pointer"], ["b", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl49410_1352");
  const f49406 = /* @__PURE__ */ __name(function(...args49407) {
    const self49411_1353 = this;
    const G__49477_1354 = args49407.length;
    switch (G__49477_1354) {
      case 0:
        return impl49409_1351.call(self49411_1353);
        break;
      case 1:
        return impl49410_1352.call(self49411_1353, args49407[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args49407.length ?? ""}`);
    }
    ;
  }, "f49406");
  return f49406;
})();
var projContextGuessWktDialect = /* @__PURE__ */ (() => {
  const impl49561_1356 = /* @__PURE__ */ __name(async function() {
    return projContextGuessWktDialect({});
  }, "impl49561_1356");
  const impl49562_1357 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_context_guess_wkt_dialect", { "rettype": "int32", "argtypes": [["context", "pointer"], ["wkt", "string"]] }, opts__225__auto__, "camel");
  }, "impl49562_1357");
  const f49558 = /* @__PURE__ */ __name(function(...args49559) {
    const self49563_1358 = this;
    const G__49629_1359 = args49559.length;
    switch (G__49629_1359) {
      case 0:
        return impl49561_1356.call(self49563_1358);
        break;
      case 1:
        return impl49562_1357.call(self49563_1358, args49559[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args49559.length ?? ""}`);
    }
    ;
  }, "f49558");
  return f49558;
})();
var projCreateOperationFactoryContext = /* @__PURE__ */ (() => {
  const impl49713_1361 = /* @__PURE__ */ __name(async function() {
    return projCreateOperationFactoryContext({});
  }, "impl49713_1361");
  const impl49714_1362 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_create_operation_factory_context", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["authority", "string"]], "proj-returns": "pj-operation-factory-context" }, opts__225__auto__, "camel");
  }, "impl49714_1362");
  const f49710 = /* @__PURE__ */ __name(function(...args49711) {
    const self49715_1363 = this;
    const G__49781_1364 = args49711.length;
    switch (G__49781_1364) {
      case 0:
        return impl49713_1361.call(self49715_1363);
        break;
      case 1:
        return impl49714_1362.call(self49715_1363, args49711[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args49711.length ?? ""}`);
    }
    ;
  }, "f49710");
  return f49710;
})();
var projListDestroy = /* @__PURE__ */ (() => {
  const impl49865_1366 = /* @__PURE__ */ __name(async function() {
    return projListDestroy({});
  }, "impl49865_1366");
  const impl49866_1367 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_list_destroy", { "rettype": "void", "argtypes": [["result", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl49866_1367");
  const f49862 = /* @__PURE__ */ __name(function(...args49863) {
    const self49867_1368 = this;
    const G__49933_1369 = args49863.length;
    switch (G__49933_1369) {
      case 0:
        return impl49865_1366.call(self49867_1368);
        break;
      case 1:
        return impl49866_1367.call(self49867_1368, args49863[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args49863.length ?? ""}`);
    }
    ;
  }, "f49862");
  return f49862;
})();
var projCsGetType = /* @__PURE__ */ (() => {
  const impl50017_1371 = /* @__PURE__ */ __name(async function() {
    return projCsGetType({});
  }, "impl50017_1371");
  const impl50018_1372 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_cs_get_type", { "rettype": "int32", "argtypes": [["context", "pointer"], ["cs", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl50018_1372");
  const f50014 = /* @__PURE__ */ __name(function(...args50015) {
    const self50019_1373 = this;
    const G__50085_1374 = args50015.length;
    switch (G__50085_1374) {
      case 0:
        return impl50017_1371.call(self50019_1373);
        break;
      case 1:
        return impl50018_1372.call(self50019_1373, args50015[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args50015.length ?? ""}`);
    }
    ;
  }, "f50014");
  return f50014;
})();
var projAsWkt = /* @__PURE__ */ (() => {
  const impl50169_1376 = /* @__PURE__ */ __name(async function() {
    return projAsWkt({});
  }, "impl50169_1376");
  const impl50170_1377 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_as_wkt", { "rettype": "string", "argtypes": [["context", "pointer"], ["pj", "pointer"], ["type", "int32"], ["options", "pointer?"]], "argsemantics": [["options", "string-array?", "default", null], ["type", "int32", "default", 2]] }, opts__225__auto__, "camel");
  }, "impl50170_1377");
  const f50166 = /* @__PURE__ */ __name(function(...args50167) {
    const self50171_1378 = this;
    const G__50237_1379 = args50167.length;
    switch (G__50237_1379) {
      case 0:
        return impl50169_1376.call(self50171_1378);
        break;
      case 1:
        return impl50170_1377.call(self50171_1378, args50167[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args50167.length ?? ""}`);
    }
    ;
  }, "f50166");
  return f50166;
})();
var projInsertObjectSessionCreate = /* @__PURE__ */ (() => {
  const impl50321_1381 = /* @__PURE__ */ __name(async function() {
    return projInsertObjectSessionCreate({});
  }, "impl50321_1381");
  const impl50322_1382 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_insert_object_session_create", { "rettype": "pointer", "argtypes": [["context", "pointer"]], "proj-returns": "pj-insert-session" }, opts__225__auto__, "camel");
  }, "impl50322_1382");
  const f50318 = /* @__PURE__ */ __name(function(...args50319) {
    const self50323_1383 = this;
    const G__50389_1384 = args50319.length;
    switch (G__50389_1384) {
      case 0:
        return impl50321_1381.call(self50323_1383);
        break;
      case 1:
        return impl50322_1382.call(self50323_1383, args50319[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args50319.length ?? ""}`);
    }
    ;
  }, "f50318");
  return f50318;
})();
var projConvertConversionToOtherMethod = /* @__PURE__ */ (() => {
  const impl50473_1386 = /* @__PURE__ */ __name(async function() {
    return projConvertConversionToOtherMethod({});
  }, "impl50473_1386");
  const impl50474_1387 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_convert_conversion_to_other_method", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["conversion", "pointer"], ["new_method_epsg_code", "int32"], ["new_method_name", "string"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl50474_1387");
  const f50470 = /* @__PURE__ */ __name(function(...args50471) {
    const self50475_1388 = this;
    const G__50541_1389 = args50471.length;
    switch (G__50541_1389) {
      case 0:
        return impl50473_1386.call(self50475_1388);
        break;
      case 1:
        return impl50474_1387.call(self50475_1388, args50471[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args50471.length ?? ""}`);
    }
    ;
  }, "f50470");
  return f50470;
})();
var projOperationFactoryContextSetDesiredAccuracy = /* @__PURE__ */ (() => {
  const impl50625_1391 = /* @__PURE__ */ __name(async function() {
    return projOperationFactoryContextSetDesiredAccuracy({});
  }, "impl50625_1391");
  const impl50626_1392 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_operation_factory_context_set_desired_accuracy", { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["accuracy", "float64"]] }, opts__225__auto__, "camel");
  }, "impl50626_1392");
  const f50622 = /* @__PURE__ */ __name(function(...args50623) {
    const self50627_1393 = this;
    const G__50693_1394 = args50623.length;
    switch (G__50693_1394) {
      case 0:
        return impl50625_1391.call(self50627_1393);
        break;
      case 1:
        return impl50626_1392.call(self50627_1393, args50623[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args50623.length ?? ""}`);
    }
    ;
  }, "f50622");
  return f50622;
})();
var projListGet = /* @__PURE__ */ (() => {
  const impl50777_1396 = /* @__PURE__ */ __name(async function() {
    return projListGet({});
  }, "impl50777_1396");
  const impl50778_1397 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_list_get", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["result", "pointer"], ["index", "int32"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl50778_1397");
  const f50774 = /* @__PURE__ */ __name(function(...args50775) {
    const self50779_1398 = this;
    const G__50845_1399 = args50775.length;
    switch (G__50845_1399) {
      case 0:
        return impl50777_1396.call(self50779_1398);
        break;
      case 1:
        return impl50778_1397.call(self50779_1398, args50775[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args50775.length ?? ""}`);
    }
    ;
  }, "f50774");
  return f50774;
})();
var projCreateGeographicCrsFromDatum = /* @__PURE__ */ (() => {
  const impl50929_1401 = /* @__PURE__ */ __name(async function() {
    return projCreateGeographicCrsFromDatum({});
  }, "impl50929_1401");
  const impl50930_1402 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_create_geographic_crs_from_datum", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_name", "string"], ["datum_or_datum_ensemble", "pointer"], ["ellipsoidal_cs", "pointer"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl50930_1402");
  const f50926 = /* @__PURE__ */ __name(function(...args50927) {
    const self50931_1403 = this;
    const G__50997_1404 = args50927.length;
    switch (G__50997_1404) {
      case 0:
        return impl50929_1401.call(self50931_1403);
        break;
      case 1:
        return impl50930_1402.call(self50931_1403, args50927[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args50927.length ?? ""}`);
    }
    ;
  }, "f50926");
  return f50926;
})();
var projGetName = /* @__PURE__ */ (() => {
  const impl51081_1406 = /* @__PURE__ */ __name(async function() {
    return projGetName({});
  }, "impl51081_1406");
  const impl51082_1407 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_get_name", { "rettype": "string", "argtypes": [["obj", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl51082_1407");
  const f51078 = /* @__PURE__ */ __name(function(...args51079) {
    const self51083_1408 = this;
    const G__51149_1409 = args51079.length;
    switch (G__51149_1409) {
      case 0:
        return impl51081_1406.call(self51083_1408);
        break;
      case 1:
        return impl51082_1407.call(self51083_1408, args51079[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args51079.length ?? ""}`);
    }
    ;
  }, "f51078");
  return f51078;
})();
var projCrsAlterParametersLinearUnit = /* @__PURE__ */ (() => {
  const impl51233_1411 = /* @__PURE__ */ __name(async function() {
    return projCrsAlterParametersLinearUnit({});
  }, "impl51233_1411");
  const impl51234_1412 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_crs_alter_parameters_linear_unit", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["obj", "pointer"], ["linear_units", "string"], ["linear_units_conv", "float64"], ["unit_auth_name", "string"], ["unit_code", "string"], ["convert_to_new_unit", "int32"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl51234_1412");
  const f51230 = /* @__PURE__ */ __name(function(...args51231) {
    const self51235_1413 = this;
    const G__51301_1414 = args51231.length;
    switch (G__51301_1414) {
      case 0:
        return impl51233_1411.call(self51235_1413);
        break;
      case 1:
        return impl51234_1412.call(self51235_1413, args51231[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args51231.length ?? ""}`);
    }
    ;
  }, "f51230");
  return f51230;
})();
var projCoordoperationIsInstantiable = /* @__PURE__ */ (() => {
  const impl51385_1416 = /* @__PURE__ */ __name(async function() {
    return projCoordoperationIsInstantiable({});
  }, "impl51385_1416");
  const impl51386_1417 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_coordoperation_is_instantiable", { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["coordoperation", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl51386_1417");
  const f51382 = /* @__PURE__ */ __name(function(...args51383) {
    const self51387_1418 = this;
    const G__51453_1419 = args51383.length;
    switch (G__51453_1419) {
      case 0:
        return impl51385_1416.call(self51387_1418);
        break;
      case 1:
        return impl51386_1417.call(self51387_1418, args51383[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args51383.length ?? ""}`);
    }
    ;
  }, "f51382");
  return f51382;
})();
var projCrsAlterCsAngularUnit = /* @__PURE__ */ (() => {
  const impl51537_1421 = /* @__PURE__ */ __name(async function() {
    return projCrsAlterCsAngularUnit({});
  }, "impl51537_1421");
  const impl51538_1422 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_crs_alter_cs_angular_unit", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["obj", "pointer"], ["angular_units", "string"], ["angular_units_conv", "float64"], ["unit_auth_name", "string"], ["unit_code", "string"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl51538_1422");
  const f51534 = /* @__PURE__ */ __name(function(...args51535) {
    const self51539_1423 = this;
    const G__51605_1424 = args51535.length;
    switch (G__51605_1424) {
      case 0:
        return impl51537_1421.call(self51539_1423);
        break;
      case 1:
        return impl51538_1422.call(self51539_1423, args51535[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args51535.length ?? ""}`);
    }
    ;
  }, "f51534");
  return f51534;
})();
var projDatumEnsembleGetMemberCount = /* @__PURE__ */ (() => {
  const impl51689_1426 = /* @__PURE__ */ __name(async function() {
    return projDatumEnsembleGetMemberCount({});
  }, "impl51689_1426");
  const impl51690_1427 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_datum_ensemble_get_member_count", { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["datum_ensemble", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl51690_1427");
  const f51686 = /* @__PURE__ */ __name(function(...args51687) {
    const self51691_1428 = this;
    const G__51757_1429 = args51687.length;
    switch (G__51757_1429) {
      case 0:
        return impl51689_1426.call(self51691_1428);
        break;
      case 1:
        return impl51690_1427.call(self51691_1428, args51687[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args51687.length ?? ""}`);
    }
    ;
  }, "f51686");
  return f51686;
})();
var projCreateVerticalCrs = /* @__PURE__ */ (() => {
  const impl51841_1431 = /* @__PURE__ */ __name(async function() {
    return projCreateVerticalCrs({});
  }, "impl51841_1431");
  const impl51842_1432 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_create_vertical_crs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_name", "string"], ["datum_name", "string"], ["linear_units", "string"], ["linear_units_conv", "float64"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl51842_1432");
  const f51838 = /* @__PURE__ */ __name(function(...args51839) {
    const self51843_1433 = this;
    const G__51909_1434 = args51839.length;
    switch (G__51909_1434) {
      case 0:
        return impl51841_1431.call(self51843_1433);
        break;
      case 1:
        return impl51842_1432.call(self51843_1433, args51839[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args51839.length ?? ""}`);
    }
    ;
  }, "f51838");
  return f51838;
})();
var projGetDomainCount = /* @__PURE__ */ (() => {
  const impl51993_1436 = /* @__PURE__ */ __name(async function() {
    return projGetDomainCount({});
  }, "impl51993_1436");
  const impl51994_1437 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_get_domain_count", { "rettype": "int32", "argtypes": [["obj", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl51994_1437");
  const f51990 = /* @__PURE__ */ __name(function(...args51991) {
    const self51995_1438 = this;
    const G__52061_1439 = args51991.length;
    switch (G__52061_1439) {
      case 0:
        return impl51993_1436.call(self51995_1438);
        break;
      case 1:
        return impl51994_1437.call(self51995_1438, args51991[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args51991.length ?? ""}`);
    }
    ;
  }, "f51990");
  return f51990;
})();
var projGetIdCode = /* @__PURE__ */ (() => {
  const impl52145_1441 = /* @__PURE__ */ __name(async function() {
    return projGetIdCode({});
  }, "impl52145_1441");
  const impl52146_1442 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_get_id_code", { "rettype": "string", "argtypes": [["obj", "pointer"], ["index", "int32"]] }, opts__225__auto__, "camel");
  }, "impl52146_1442");
  const f52142 = /* @__PURE__ */ __name(function(...args52143) {
    const self52147_1443 = this;
    const G__52213_1444 = args52143.length;
    switch (G__52213_1444) {
      case 0:
        return impl52145_1441.call(self52147_1443);
        break;
      case 1:
        return impl52146_1442.call(self52147_1443, args52143[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args52143.length ?? ""}`);
    }
    ;
  }, "f52142");
  return f52142;
})();
var projOperationFactoryContextSetSpatialCriterion = /* @__PURE__ */ (() => {
  const impl52297_1446 = /* @__PURE__ */ __name(async function() {
    return projOperationFactoryContextSetSpatialCriterion({});
  }, "impl52297_1446");
  const impl52298_1447 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_operation_factory_context_set_spatial_criterion", { "rettype": "void", "argtypes": [["ctx", "pointer"], ["factory_ctx", "pointer"], ["criterion", "int32"]] }, opts__225__auto__, "camel");
  }, "impl52298_1447");
  const f52294 = /* @__PURE__ */ __name(function(...args52295) {
    const self52299_1448 = this;
    const G__52365_1449 = args52295.length;
    switch (G__52365_1449) {
      case 0:
        return impl52297_1446.call(self52299_1448);
        break;
      case 1:
        return impl52298_1447.call(self52299_1448, args52295[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args52295.length ?? ""}`);
    }
    ;
  }, "f52294");
  return f52294;
})();
var projCreateEllipsoidal3DCs = /* @__PURE__ */ (() => {
  const impl52449_1451 = /* @__PURE__ */ __name(async function() {
    return projCreateEllipsoidal3DCs({});
  }, "impl52449_1451");
  const impl52450_1452 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_create_ellipsoidal_3D_cs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["type", "int32"], ["horizontal_angular_unit_name", "string"], ["horizontal_angular_unit_conv_factor", "float64"], ["vertical_linear_unit_name", "string"], ["vertical_linear_unit_conv_factor", "float64"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl52450_1452");
  const f52446 = /* @__PURE__ */ __name(function(...args52447) {
    const self52451_1453 = this;
    const G__52517_1454 = args52447.length;
    switch (G__52517_1454) {
      case 0:
        return impl52449_1451.call(self52451_1453);
        break;
      case 1:
        return impl52450_1452.call(self52451_1453, args52447[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args52447.length ?? ""}`);
    }
    ;
  }, "f52446");
  return f52446;
})();
var projCreateOperations = /* @__PURE__ */ (() => {
  const impl52601_1456 = /* @__PURE__ */ __name(async function() {
    return projCreateOperations({});
  }, "impl52601_1456");
  const impl52602_1457 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_create_operations", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["source_crs", "pointer"], ["target_crs", "pointer"], ["operationContext", "pointer"]], "proj-returns": "pj-list" }, opts__225__auto__, "camel");
  }, "impl52602_1457");
  const f52598 = /* @__PURE__ */ __name(function(...args52599) {
    const self52603_1458 = this;
    const G__52669_1459 = args52599.length;
    switch (G__52669_1459) {
      case 0:
        return impl52601_1456.call(self52603_1458);
        break;
      case 1:
        return impl52602_1457.call(self52603_1458, args52599[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args52599.length ?? ""}`);
    }
    ;
  }, "f52598");
  return f52598;
})();
var projGridGetInfoFromDatabase = /* @__PURE__ */ (() => {
  const impl52753_1461 = /* @__PURE__ */ __name(async function() {
    return projGridGetInfoFromDatabase({});
  }, "impl52753_1461");
  const impl52754_1462 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_grid_get_info_from_database", { "rettype": "int32", "proj-returns": "out-params", "out-fields": [["full-name", "string"], ["package-name", "string"], ["url", "string"], ["direct-download", "int"], ["open-license", "int"], ["available", "int"]], "argtypes": [["context", "pointer"], ["grid_name", "string"], ["out_full_name", "pointer"], ["out_package_name", "pointer"], ["out_url", "pointer"], ["out_direct_download", "pointer"], ["out_open_license", "pointer"], ["out_available", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl52754_1462");
  const f52750 = /* @__PURE__ */ __name(function(...args52751) {
    const self52755_1463 = this;
    const G__52821_1464 = args52751.length;
    switch (G__52821_1464) {
      case 0:
        return impl52753_1461.call(self52755_1463);
        break;
      case 1:
        return impl52754_1462.call(self52755_1463, args52751[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args52751.length ?? ""}`);
    }
    ;
  }, "f52750");
  return f52750;
})();
var projDynamicDatumGetFrameReferenceEpoch = /* @__PURE__ */ (() => {
  const impl52905_1466 = /* @__PURE__ */ __name(async function() {
    return projDynamicDatumGetFrameReferenceEpoch({});
  }, "impl52905_1466");
  const impl52906_1467 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_dynamic_datum_get_frame_reference_epoch", { "rettype": "float64", "argtypes": [["ctx", "pointer"], ["datum", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl52906_1467");
  const f52902 = /* @__PURE__ */ __name(function(...args52903) {
    const self52907_1468 = this;
    const G__52973_1469 = args52903.length;
    switch (G__52973_1469) {
      case 0:
        return impl52905_1466.call(self52907_1468);
        break;
      case 1:
        return impl52906_1467.call(self52907_1468, args52903[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args52903.length ?? ""}`);
    }
    ;
  }, "f52902");
  return f52902;
})();
var projLogLevel = /* @__PURE__ */ (() => {
  const impl53057_1471 = /* @__PURE__ */ __name(async function() {
    return projLogLevel({});
  }, "impl53057_1471");
  const impl53058_1472 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_log_level", { "rettype": "int32", "argtypes": [["context", "pointer"], ["level", "int32"]] }, opts__225__auto__, "camel");
  }, "impl53058_1472");
  const f53054 = /* @__PURE__ */ __name(function(...args53055) {
    const self53059_1473 = this;
    const G__53125_1474 = args53055.length;
    switch (G__53125_1474) {
      case 0:
        return impl53057_1471.call(self53059_1473);
        break;
      case 1:
        return impl53058_1472.call(self53059_1473, args53055[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args53055.length ?? ""}`);
    }
    ;
  }, "f53054");
  return f53054;
})();
var projContextSetAutocloseDatabase = /* @__PURE__ */ (() => {
  const impl53209_1476 = /* @__PURE__ */ __name(async function() {
    return projContextSetAutocloseDatabase({});
  }, "impl53209_1476");
  const impl53210_1477 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_context_set_autoclose_database", { "rettype": "void", "argtypes": [["context", "pointer"], ["autoclose", "int32"]] }, opts__225__auto__, "camel");
  }, "impl53210_1477");
  const f53206 = /* @__PURE__ */ __name(function(...args53207) {
    const self53211_1478 = this;
    const G__53277_1479 = args53207.length;
    switch (G__53277_1479) {
      case 0:
        return impl53209_1476.call(self53211_1478);
        break;
      case 1:
        return impl53210_1477.call(self53211_1478, args53207[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args53207.length ?? ""}`);
    }
    ;
  }, "f53206");
  return f53206;
})();
var projCreateVerticalCrsEx = /* @__PURE__ */ (() => {
  const impl53361_1481 = /* @__PURE__ */ __name(async function() {
    return projCreateVerticalCrsEx({});
  }, "impl53361_1481");
  const impl53362_1482 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_create_vertical_crs_ex", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs_name", "string"], ["datum_name", "string"], ["datum_auth_name", "string"], ["datum_code", "string"], ["linear_units", "string"], ["linear_units_conv", "float64"], ["geoid_model_name", "string"], ["geoid_model_auth_name", "string"], ["geoid_model_code", "string"], ["geoid_geog_crs", "pointer"], ["options", "pointer"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl53362_1482");
  const f53358 = /* @__PURE__ */ __name(function(...args53359) {
    const self53363_1483 = this;
    const G__53429_1484 = args53359.length;
    switch (G__53429_1484) {
      case 0:
        return impl53361_1481.call(self53363_1483);
        break;
      case 1:
        return impl53362_1482.call(self53363_1483, args53359[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args53359.length ?? ""}`);
    }
    ;
  }, "f53358");
  return f53358;
})();
var projCsGetAxisCount = /* @__PURE__ */ (() => {
  const impl53513_1486 = /* @__PURE__ */ __name(async function() {
    return projCsGetAxisCount({});
  }, "impl53513_1486");
  const impl53514_1487 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_cs_get_axis_count", { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["cs", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl53514_1487");
  const f53510 = /* @__PURE__ */ __name(function(...args53511) {
    const self53515_1488 = this;
    const G__53581_1489 = args53511.length;
    switch (G__53581_1489) {
      case 0:
        return impl53513_1486.call(self53515_1488);
        break;
      case 1:
        return impl53514_1487.call(self53515_1488, args53511[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args53511.length ?? ""}`);
    }
    ;
  }, "f53510");
  return f53510;
})();
var projIdentify = /* @__PURE__ */ (() => {
  const impl53665_1491 = /* @__PURE__ */ __name(async function() {
    return projIdentify({});
  }, "impl53665_1491");
  const impl53666_1492 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_identify", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["obj", "pointer"], ["auth_name", "string"], ["options", "pointer"], ["out_confidence", "pointer"]], "proj-returns": "pj-list" }, opts__225__auto__, "camel");
  }, "impl53666_1492");
  const f53662 = /* @__PURE__ */ __name(function(...args53663) {
    const self53667_1493 = this;
    const G__53733_1494 = args53663.length;
    switch (G__53733_1494) {
      case 0:
        return impl53665_1491.call(self53667_1493);
        break;
      case 1:
        return impl53666_1492.call(self53667_1493, args53663[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args53663.length ?? ""}`);
    }
    ;
  }, "f53662");
  return f53662;
})();
var projSuggestsCodeFor = /* @__PURE__ */ (() => {
  const impl53817_1496 = /* @__PURE__ */ __name(async function() {
    return projSuggestsCodeFor({});
  }, "impl53817_1496");
  const impl53818_1497 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_suggests_code_for", { "rettype": "string", "argtypes": [["context", "pointer"], ["object", "pointer"], ["authority", "string"], ["numeric_code", "int32"], ["options", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl53818_1497");
  const f53814 = /* @__PURE__ */ __name(function(...args53815) {
    const self53819_1498 = this;
    const G__53885_1499 = args53815.length;
    switch (G__53885_1499) {
      case 0:
        return impl53817_1496.call(self53819_1498);
        break;
      case 1:
        return impl53818_1497.call(self53819_1498, args53815[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args53815.length ?? ""}`);
    }
    ;
  }, "f53814");
  return f53814;
})();
var projConcatoperationGetStep = /* @__PURE__ */ (() => {
  const impl53969_1501 = /* @__PURE__ */ __name(async function() {
    return projConcatoperationGetStep({});
  }, "impl53969_1501");
  const impl53970_1502 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_concatoperation_get_step", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["concatoperation", "pointer"], ["i_step", "int32"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl53970_1502");
  const f53966 = /* @__PURE__ */ __name(function(...args53967) {
    const self53971_1503 = this;
    const G__54037_1504 = args53967.length;
    switch (G__54037_1504) {
      case 0:
        return impl53969_1501.call(self53971_1503);
        break;
      case 1:
        return impl53970_1502.call(self53971_1503, args53967[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args53967.length ?? ""}`);
    }
    ;
  }, "f53966");
  return f53966;
})();
var projDatumEnsembleGetMember = /* @__PURE__ */ (() => {
  const impl54121_1506 = /* @__PURE__ */ __name(async function() {
    return projDatumEnsembleGetMember({});
  }, "impl54121_1506");
  const impl54122_1507 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_datum_ensemble_get_member", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["datum_ensemble", "pointer"], ["member_index", "int32"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl54122_1507");
  const f54118 = /* @__PURE__ */ __name(function(...args54119) {
    const self54123_1508 = this;
    const G__54189_1509 = args54119.length;
    switch (G__54189_1509) {
      case 0:
        return impl54121_1506.call(self54123_1508);
        break;
      case 1:
        return impl54122_1507.call(self54123_1508, args54119[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args54119.length ?? ""}`);
    }
    ;
  }, "f54118");
  return f54118;
})();
var projCrsGetDatumForced = /* @__PURE__ */ (() => {
  const impl54273_1511 = /* @__PURE__ */ __name(async function() {
    return projCrsGetDatumForced({});
  }, "impl54273_1511");
  const impl54274_1512 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_crs_get_datum_forced", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl54274_1512");
  const f54270 = /* @__PURE__ */ __name(function(...args54271) {
    const self54275_1513 = this;
    const G__54341_1514 = args54271.length;
    switch (G__54341_1514) {
      case 0:
        return impl54273_1511.call(self54275_1513);
        break;
      case 1:
        return impl54274_1512.call(self54275_1513, args54271[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args54271.length ?? ""}`);
    }
    ;
  }, "f54270");
  return f54270;
})();
var projCrsCreateBoundCrsToWGS84 = /* @__PURE__ */ (() => {
  const impl54425_1516 = /* @__PURE__ */ __name(async function() {
    return projCrsCreateBoundCrsToWGS84({});
  }, "impl54425_1516");
  const impl54426_1517 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_crs_create_bound_crs_to_WGS84", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs", "pointer"], ["options", "pointer"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl54426_1517");
  const f54422 = /* @__PURE__ */ __name(function(...args54423) {
    const self54427_1518 = this;
    const G__54493_1519 = args54423.length;
    switch (G__54493_1519) {
      case 0:
        return impl54425_1516.call(self54427_1518);
        break;
      case 1:
        return impl54426_1517.call(self54427_1518, args54423[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args54423.length ?? ""}`);
    }
    ;
  }, "f54422");
  return f54422;
})();
var projCrsGetSubCrs = /* @__PURE__ */ (() => {
  const impl54577_1521 = /* @__PURE__ */ __name(async function() {
    return projCrsGetSubCrs({});
  }, "impl54577_1521");
  const impl54578_1522 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_crs_get_sub_crs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs", "pointer"], ["index", "int32"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl54578_1522");
  const f54574 = /* @__PURE__ */ __name(function(...args54575) {
    const self54579_1523 = this;
    const G__54645_1524 = args54575.length;
    switch (G__54645_1524) {
      case 0:
        return impl54577_1521.call(self54579_1523);
        break;
      case 1:
        return impl54578_1522.call(self54579_1523, args54575[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args54575.length ?? ""}`);
    }
    ;
  }, "f54574");
  return f54574;
})();
var projGetCelestialBodyName = /* @__PURE__ */ (() => {
  const impl54729_1526 = /* @__PURE__ */ __name(async function() {
    return projGetCelestialBodyName({});
  }, "impl54729_1526");
  const impl54730_1527 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_get_celestial_body_name", { "rettype": "string", "argtypes": [["ctx", "pointer"], ["obj", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl54730_1527");
  const f54726 = /* @__PURE__ */ __name(function(...args54727) {
    const self54731_1528 = this;
    const G__54797_1529 = args54727.length;
    switch (G__54797_1529) {
      case 0:
        return impl54729_1526.call(self54731_1528);
        break;
      case 1:
        return impl54730_1527.call(self54731_1528, args54727[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args54727.length ?? ""}`);
    }
    ;
  }, "f54726");
  return f54726;
})();
var projInsertObjectSessionDestroy = /* @__PURE__ */ (() => {
  const impl54881_1531 = /* @__PURE__ */ __name(async function() {
    return projInsertObjectSessionDestroy({});
  }, "impl54881_1531");
  const impl54882_1532 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_insert_object_session_destroy", { "rettype": "void", "argtypes": [["context", "pointer"], ["session", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl54882_1532");
  const f54878 = /* @__PURE__ */ __name(function(...args54879) {
    const self54883_1533 = this;
    const G__54949_1534 = args54879.length;
    switch (G__54949_1534) {
      case 0:
        return impl54881_1531.call(self54883_1533);
        break;
      case 1:
        return impl54882_1532.call(self54883_1533, args54879[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args54879.length ?? ""}`);
    }
    ;
  }, "f54878");
  return f54878;
})();
var projCreateEngineeringCrs = /* @__PURE__ */ (() => {
  const impl55033_1536 = /* @__PURE__ */ __name(async function() {
    return projCreateEngineeringCrs({});
  }, "impl55033_1536");
  const impl55034_1537 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_create_engineering_crs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crsName", "string"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl55034_1537");
  const f55030 = /* @__PURE__ */ __name(function(...args55031) {
    const self55035_1538 = this;
    const G__55101_1539 = args55031.length;
    switch (G__55101_1539) {
      case 0:
        return impl55033_1536.call(self55035_1538);
        break;
      case 1:
        return impl55034_1537.call(self55035_1538, args55031[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args55031.length ?? ""}`);
    }
    ;
  }, "f55030");
  return f55030;
})();
var projCrsGetGeodeticCrs = /* @__PURE__ */ (() => {
  const impl55185_1541 = /* @__PURE__ */ __name(async function() {
    return projCrsGetGeodeticCrs({});
  }, "impl55185_1541");
  const impl55186_1542 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_crs_get_geodetic_crs", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl55186_1542");
  const f55182 = /* @__PURE__ */ __name(function(...args55183) {
    const self55187_1543 = this;
    const G__55253_1544 = args55183.length;
    switch (G__55253_1544) {
      case 0:
        return impl55185_1541.call(self55187_1543);
        break;
      case 1:
        return impl55186_1542.call(self55187_1543, args55183[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args55183.length ?? ""}`);
    }
    ;
  }, "f55182");
  return f55182;
})();
var projCreateFromWkt = /* @__PURE__ */ (() => {
  const impl55337_1546 = /* @__PURE__ */ __name(async function() {
    return projCreateFromWkt({});
  }, "impl55337_1546");
  const impl55338_1547 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_create_from_wkt", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["wkt", "string"], ["options", "pointer?"], ["out_warnings", "pointer?"], ["out_grammar_errors", "pointer?"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl55338_1547");
  const f55334 = /* @__PURE__ */ __name(function(...args55335) {
    const self55339_1548 = this;
    const G__55405_1549 = args55335.length;
    switch (G__55405_1549) {
      case 0:
        return impl55337_1546.call(self55339_1548);
        break;
      case 1:
        return impl55338_1547.call(self55339_1548, args55335[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args55335.length ?? ""}`);
    }
    ;
  }, "f55334");
  return f55334;
})();
var projCrsIsDynamic = /* @__PURE__ */ (() => {
  const impl55489_1551 = /* @__PURE__ */ __name(async function() {
    return projCrsIsDynamic({});
  }, "impl55489_1551");
  const impl55490_1552 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_crs_is_dynamic", { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl55490_1552");
  const f55486 = /* @__PURE__ */ __name(function(...args55487) {
    const self55491_1553 = this;
    const G__55557_1554 = args55487.length;
    switch (G__55557_1554) {
      case 0:
        return impl55489_1551.call(self55491_1553);
        break;
      case 1:
        return impl55490_1552.call(self55491_1553, args55487[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args55487.length ?? ""}`);
    }
    ;
  }, "f55486");
  return f55486;
})();
var projCrsGetHorizontalDatum = /* @__PURE__ */ (() => {
  const impl55641_1556 = /* @__PURE__ */ __name(async function() {
    return projCrsGetHorizontalDatum({});
  }, "impl55641_1556");
  const impl55642_1557 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_crs_get_horizontal_datum", { "rettype": "pointer", "argtypes": [["ctx", "pointer"], ["crs", "pointer"]], "proj-returns": "pj" }, opts__225__auto__, "camel");
  }, "impl55642_1557");
  const f55638 = /* @__PURE__ */ __name(function(...args55639) {
    const self55643_1558 = this;
    const G__55709_1559 = args55639.length;
    switch (G__55709_1559) {
      case 0:
        return impl55641_1556.call(self55643_1558);
        break;
      case 1:
        return impl55642_1557.call(self55643_1558, args55639[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args55639.length ?? ""}`);
    }
    ;
  }, "f55638");
  return f55638;
})();
var projGetCodesFromDatabase = /* @__PURE__ */ (() => {
  const impl55793_1561 = /* @__PURE__ */ __name(async function() {
    return projGetCodesFromDatabase({});
  }, "impl55793_1561");
  const impl55794_1562 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_get_codes_from_database", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["auth_name", "string"], ["type", "int32", "default", 8], ["allow_deprecated", "int32", "default", 1]], "proj-returns": "string-list" }, opts__225__auto__, "camel");
  }, "impl55794_1562");
  const f55790 = /* @__PURE__ */ __name(function(...args55791) {
    const self55795_1563 = this;
    const G__55861_1564 = args55791.length;
    switch (G__55861_1564) {
      case 0:
        return impl55793_1561.call(self55795_1563);
        break;
      case 1:
        return impl55794_1562.call(self55795_1563, args55791[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args55791.length ?? ""}`);
    }
    ;
  }, "f55790");
  return f55790;
})();
var projAsProjjson = /* @__PURE__ */ (() => {
  const impl55945_1566 = /* @__PURE__ */ __name(async function() {
    return projAsProjjson({});
  }, "impl55945_1566");
  const impl55946_1567 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_as_projjson", { "rettype": "string", "argtypes": [["context", "pointer"], ["pj", "pointer"], ["options", "pointer?"]], "argsemantics": [["options", "string-array?", "default", null]] }, opts__225__auto__, "camel");
  }, "impl55946_1567");
  const f55942 = /* @__PURE__ */ __name(function(...args55943) {
    const self55947_1568 = this;
    const G__56013_1569 = args55943.length;
    switch (G__56013_1569) {
      case 0:
        return impl55945_1566.call(self55947_1568);
        break;
      case 1:
        return impl55946_1567.call(self55947_1568, args55943[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args55943.length ?? ""}`);
    }
    ;
  }, "f55942");
  return f55942;
})();
var projGetNonDeprecated = /* @__PURE__ */ (() => {
  const impl56097_1571 = /* @__PURE__ */ __name(async function() {
    return projGetNonDeprecated({});
  }, "impl56097_1571");
  const impl56098_1572 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_get_non_deprecated", { "rettype": "pointer", "argtypes": [["context", "pointer"], ["obj", "pointer"]], "proj-returns": "pj-list" }, opts__225__auto__, "camel");
  }, "impl56098_1572");
  const f56094 = /* @__PURE__ */ __name(function(...args56095) {
    const self56099_1573 = this;
    const G__56165_1574 = args56095.length;
    switch (G__56165_1574) {
      case 0:
        return impl56097_1571.call(self56099_1573);
        break;
      case 1:
        return impl56098_1572.call(self56099_1573, args56095[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args56095.length ?? ""}`);
    }
    ;
  }, "f56094");
  return f56094;
})();
var projCoordoperationGetParamCount = /* @__PURE__ */ (() => {
  const impl56249_1576 = /* @__PURE__ */ __name(async function() {
    return projCoordoperationGetParamCount({});
  }, "impl56249_1576");
  const impl56250_1577 = /* @__PURE__ */ __name(async function(opts__225__auto__) {
    return dispatch_proj_fn("proj_coordoperation_get_param_count", { "rettype": "int32", "argtypes": [["ctx", "pointer"], ["coordoperation", "pointer"]] }, opts__225__auto__, "camel");
  }, "impl56250_1577");
  const f56246 = /* @__PURE__ */ __name(function(...args56247) {
    const self56251_1578 = this;
    const G__56317_1579 = args56247.length;
    switch (G__56317_1579) {
      case 0:
        return impl56249_1576.call(self56251_1578);
        break;
      case 1:
        return impl56250_1577.call(self56251_1578, args56247[0]);
        break;
      default:
        throw new Error(`${"Invalid arity: "}${args56247.length ?? ""}`);
    }
    ;
  }, "f56246");
  return f56246;
})();
var transform_batch = /* @__PURE__ */ __name(function(source_crs, target_crs, coord_array2) {
  throw ex_info("transform-batch: CLJS surface not yet implemented. Worker-side dispatch uses proj/proj-trans-array directly through the worker-router handler.", { "source-crs": source_crs, "target-crs": target_crs, "coord-array": coord_array2 });
}, "transform_batch");
var init = init_BANG_;
var shutdown = shutdown_BANG_2;
var flushPendingDisposes = flush_pending_disposes_BANG_2;
var getPoolDetail = get_pool_detail2;
var setCoords = set_coords_BANG_;
var getCoords = get_coords;
var getWorkerCount = get_worker_count2;
var contextCreate = context_create;
var contextPtr = context_ptr;
var contextDatabasePath = context_database_path;
var contextSetDatabasePath = context_set_database_path;
var contextSetEnableNetwork = context_set_enable_network;
var isContext = is_context_QMARK_;
var coordArray = coord_array;
var coordToCoordArray = coord__GT_coord_array;
var allocCoordArray = alloc_coord_array;
var setCoordArray = set_coord_array;
var getCoordArray = get_coord_array;
var handler_spec = spec;
var handler_default_init_args = default_init_args;
var handlerSpec = handler_spec;
var handlerDefaultInitArgs = handler_default_init_args;
init_fndefs();
export {
  PJ_CART2D_EASTING_NORTHING,
  PJ_CART2D_NORTHING_EASTING,
  PJ_CART2D_NORTH_POLE_EASTING_SOUTH_NORTHING_SOUTH,
  PJ_CART2D_SOUTH_POLE_EASTING_NORTH_NORTHING_NORTH,
  PJ_CART2D_WESTING_SOUTHING,
  PJ_CATEGORY_COORDINATE_OPERATION,
  PJ_CATEGORY_CRS,
  PJ_CATEGORY_DATUM,
  PJ_CATEGORY_DATUM_ENSEMBLE,
  PJ_CATEGORY_ELLIPSOID,
  PJ_CATEGORY_PRIME_MERIDIAN,
  PJ_COMP_EQUIVALENT,
  PJ_COMP_EQUIVALENT_EXCEPT_AXIS_ORDER_GEOGCRS,
  PJ_COMP_STRICT,
  PJ_CRS_EXTENT_BOTH,
  PJ_CRS_EXTENT_INTERSECTION,
  PJ_CRS_EXTENT_NONE,
  PJ_CRS_EXTENT_SMALLEST,
  PJ_CS_TYPE_CARTESIAN,
  PJ_CS_TYPE_DATETIMETEMPORAL,
  PJ_CS_TYPE_ELLIPSOIDAL,
  PJ_CS_TYPE_ORDINAL,
  PJ_CS_TYPE_PARAMETRIC,
  PJ_CS_TYPE_SPHERICAL,
  PJ_CS_TYPE_TEMPORALCOUNT,
  PJ_CS_TYPE_TEMPORALMEASURE,
  PJ_CS_TYPE_UNKNOWN,
  PJ_CS_TYPE_VERTICAL,
  PJ_ELLPS2D_LATITUDE_LONGITUDE,
  PJ_ELLPS2D_LONGITUDE_LATITUDE,
  PJ_ELLPS3D_LATITUDE_LONGITUDE_HEIGHT,
  PJ_ELLPS3D_LONGITUDE_LATITUDE_HEIGHT,
  PJ_FWD,
  PJ_GUESSED_NOT_WKT,
  PJ_GUESSED_WKT1_ESRI,
  PJ_GUESSED_WKT1_GDAL,
  PJ_GUESSED_WKT2_2015,
  PJ_GUESSED_WKT2_2018,
  PJ_GUESSED_WKT2_2019,
  PJ_IDENT,
  PJ_INV,
  PJ_LOG_DEBUG,
  PJ_LOG_DEBUG_MAJOR,
  PJ_LOG_DEBUG_MINOR,
  PJ_LOG_ERROR,
  PJ_LOG_NONE,
  PJ_LOG_TELL,
  PJ_LOG_TRACE,
  PJ_PROJ_4,
  PJ_PROJ_5,
  PJ_TYPE_BOUND_CRS,
  PJ_TYPE_COMPOUND_CRS,
  PJ_TYPE_CONCATENATED_OPERATION,
  PJ_TYPE_CONVERSION,
  PJ_TYPE_COORDINATE_METADATA,
  PJ_TYPE_CRS,
  PJ_TYPE_DATUM_ENSEMBLE,
  PJ_TYPE_DERIVED_PROJECTED_CRS,
  PJ_TYPE_DYNAMIC_GEODETIC_REFERENCE_FRAME,
  PJ_TYPE_DYNAMIC_VERTICAL_REFERENCE_FRAME,
  PJ_TYPE_ELLIPSOID,
  PJ_TYPE_ENGINEERING_CRS,
  PJ_TYPE_ENGINEERING_DATUM,
  PJ_TYPE_GEOCENTRIC_CRS,
  PJ_TYPE_GEODETIC_CRS,
  PJ_TYPE_GEODETIC_REFERENCE_FRAME,
  PJ_TYPE_GEOGRAPHIC_2D_CRS,
  PJ_TYPE_GEOGRAPHIC_3D_CRS,
  PJ_TYPE_GEOGRAPHIC_CRS,
  PJ_TYPE_OTHER_COORDINATE_OPERATION,
  PJ_TYPE_OTHER_CRS,
  PJ_TYPE_PARAMETRIC_DATUM,
  PJ_TYPE_PRIME_MERIDIAN,
  PJ_TYPE_PROJECTED_CRS,
  PJ_TYPE_TEMPORAL_CRS,
  PJ_TYPE_TEMPORAL_DATUM,
  PJ_TYPE_TRANSFORMATION,
  PJ_TYPE_UNKNOWN,
  PJ_TYPE_VERTICAL_CRS,
  PJ_TYPE_VERTICAL_REFERENCE_FRAME,
  PJ_UT_ANGULAR,
  PJ_UT_LINEAR,
  PJ_UT_PARAMETRIC,
  PJ_UT_SCALE,
  PJ_UT_TIME,
  PJ_WKT1_ESRI,
  PJ_WKT1_GDAL,
  PJ_WKT2_2015,
  PJ_WKT2_2015_SIMPLIFIED,
  PJ_WKT2_2018,
  PJ_WKT2_2018_SIMPLIFIED,
  PJ_WKT2_2019,
  PJ_WKT2_2019_SIMPLIFIED,
  PROJ_ERR_COORD_TRANSFM,
  PROJ_ERR_COORD_TRANSFM_GRID_AT_NODATA,
  PROJ_ERR_COORD_TRANSFM_INVALID_COORD,
  PROJ_ERR_COORD_TRANSFM_MISSING_TIME,
  PROJ_ERR_COORD_TRANSFM_NO_CONVERGENCE,
  PROJ_ERR_COORD_TRANSFM_NO_OPERATION,
  PROJ_ERR_COORD_TRANSFM_OUTSIDE_GRID,
  PROJ_ERR_COORD_TRANSFM_OUTSIDE_PROJECTION_DOMAIN,
  PROJ_ERR_INVALID_OP,
  PROJ_ERR_INVALID_OP_FILE_NOT_FOUND_OR_INVALID,
  PROJ_ERR_INVALID_OP_ILLEGAL_ARG_VALUE,
  PROJ_ERR_INVALID_OP_MISSING_ARG,
  PROJ_ERR_INVALID_OP_MUTUALLY_EXCLUSIVE_ARGS,
  PROJ_ERR_INVALID_OP_WRONG_SYNTAX,
  PROJ_ERR_OTHER,
  PROJ_ERR_OTHER_API_MISUSE,
  PROJ_ERR_OTHER_NETWORK_ERROR,
  PROJ_ERR_OTHER_NO_INVERSE_OP,
  PROJ_GRID_AVAILABILITY_DISCARD_OPERATION_IF_MISSING_GRID,
  PROJ_GRID_AVAILABILITY_IGNORED,
  PROJ_GRID_AVAILABILITY_KNOWN_AVAILABLE,
  PROJ_GRID_AVAILABILITY_USED_FOR_SORTING,
  PROJ_INTERMEDIATE_CRS_USE_ALWAYS,
  PROJ_INTERMEDIATE_CRS_USE_IF_NO_DIRECT_TRANSFORMATION,
  PROJ_INTERMEDIATE_CRS_USE_NEVER,
  PROJ_SPATIAL_CRITERION_PARTIAL_INTERSECTION,
  PROJ_SPATIAL_CRITERION_STRICT_CONTAINMENT,
  PROJ_VERSION_MAJOR,
  PROJ_VERSION_MINOR,
  PROJ_VERSION_PATCH,
  allocCoordArray,
  alloc_coord_array,
  call_native,
  contextCreate,
  contextDatabasePath,
  contextPtr,
  contextSetDatabasePath,
  contextSetEnableNetwork,
  context_create,
  context_database_path,
  context_ptr,
  context_set_database_path,
  context_set_enable_network,
  coordArray,
  coordToCoordArray,
  coord__GT_coord_array,
  coord_array,
  cs,
  dispatch_context_fn,
  dispatch_proj_fn,
  ensure_initialized_BANG_,
  error_code__GT_string,
  extract_args,
  ffi_QMARK_2 as ffi_QMARK_,
  flushPendingDisposes,
  flush_pending_disposes_BANG_2 as flush_pending_disposes_BANG_,
  fndefs,
  force_ffi_BANG_2 as force_ffi_BANG_,
  force_graal,
  force_graal_BANG_2 as force_graal_BANG_,
  getCoordArray,
  getCoords,
  getPoolDetail,
  getWorkerCount,
  get_context_atom,
  get_coord_array,
  get_coords,
  get_pool_detail2 as get_pool_detail,
  get_remaining_args,
  get_worker_count2 as get_worker_count,
  graal_QMARK_2 as graal_QMARK_,
  handlerDefaultInitArgs,
  handlerSpec,
  handler_default_init_args,
  handler_spec,
  implementation,
  init,
  init_BANG_,
  isContext,
  is_c_context_fn_QMARK_,
  is_context_QMARK_,
  lib,
  node_QMARK_2 as node_QMARK_,
  p2 as p,
  process_return_value_with_tracking,
  projAlterId,
  projAlterName,
  projAsProjString,
  projAsProjjson,
  projAsWkt,
  projCelestialBodyListDestroy,
  projClone,
  projConcatoperationGetStep,
  projConcatoperationGetStepCount,
  projContextClone,
  projContextCreate,
  projContextDestroy,
  projContextErrno,
  projContextErrnoString,
  projContextGetDatabaseMetadata,
  projContextGetDatabasePath,
  projContextGetDatabaseStructure,
  projContextGuessWktDialect,
  projContextIsNetworkEnabled,
  projContextSetAutocloseDatabase,
  projContextSetDatabasePath,
  projContextSetEnableNetwork,
  projContextSetNetworkCallbacks,
  projConvertConversionToOtherMethod,
  projCoord,
  projCoordinateMetadataCreate,
  projCoordinateMetadataGetEpoch,
  projCoordoperationCreateInverse,
  projCoordoperationGetAccuracy,
  projCoordoperationGetGridUsed,
  projCoordoperationGetGridUsedCount,
  projCoordoperationGetMethodInfo,
  projCoordoperationGetParam,
  projCoordoperationGetParamCount,
  projCoordoperationGetParamIndex,
  projCoordoperationGetTowgs84Values,
  projCoordoperationHasBallparkTransformation,
  projCoordoperationIsInstantiable,
  projCoordoperationRequiresPerCoordinateInputTime,
  projCreate,
  projCreateCartesian2DCs,
  projCreateCompoundCrs,
  projCreateConversion,
  projCreateCrsToCrs,
  projCreateCrsToCrsFromPj,
  projCreateCs,
  projCreateDerivedGeographicCrs,
  projCreateEllipsoidal2DCs,
  projCreateEllipsoidal3DCs,
  projCreateEngineeringCrs,
  projCreateFromDatabase,
  projCreateFromName,
  projCreateFromWkt,
  projCreateGeocentricCrs,
  projCreateGeocentricCrsFromDatum,
  projCreateGeographicCrs,
  projCreateGeographicCrsFromDatum,
  projCreateOperationFactoryContext,
  projCreateOperations,
  projCreateProjectedCrs,
  projCreateTransformation,
  projCreateVerticalCrs,
  projCreateVerticalCrsEx,
  projCrsAlterCsAngularUnit,
  projCrsAlterCsLinearUnit,
  projCrsAlterGeodeticCrs,
  projCrsAlterParametersLinearUnit,
  projCrsCreateBoundCrs,
  projCrsCreateBoundCrsToWGS84,
  projCrsCreateBoundVerticalCrs,
  projCrsCreateProjected3DCrsFrom2D,
  projCrsDemoteTo2D,
  projCrsGetCoordinateSystem,
  projCrsGetCoordoperation,
  projCrsGetDatum,
  projCrsGetDatumEnsemble,
  projCrsGetDatumForced,
  projCrsGetGeodeticCrs,
  projCrsGetHorizontalDatum,
  projCrsGetSubCrs,
  projCrsHasPointMotionOperation,
  projCrsInfoListDestroy,
  projCrsIsDerived,
  projCrsIsDynamic,
  projCrsPromoteTo3D,
  projCsGetAxisCount,
  projCsGetAxisInfo,
  projCsGetType,
  projDatumEnsembleGetAccuracy,
  projDatumEnsembleGetMember,
  projDatumEnsembleGetMemberCount,
  projDestroy,
  projDynamicDatumGetFrameReferenceEpoch,
  projEllipsoidGetParameters,
  projGetAreaOfUse,
  projGetAreaOfUseEx,
  projGetAuthoritiesFromDatabase,
  projGetCelestialBodyListFromDatabase,
  projGetCelestialBodyName,
  projGetCodesFromDatabase,
  projGetCrsInfoListFromDatabase,
  projGetCrsListParametersCreate,
  projGetCrsListParametersDestroy,
  projGetDomainCount,
  projGetEllipsoid,
  projGetGeoidModelsFromDatabase,
  projGetIdAuthName,
  projGetIdCode,
  projGetInsertStatements,
  projGetName,
  projGetNonDeprecated,
  projGetPrimeMeridian,
  projGetRemarks,
  projGetScope,
  projGetScopeEx,
  projGetSourceCrs,
  projGetSuggestedOperation,
  projGetTargetCrs,
  projGetType,
  projGetUnitsFromDatabase,
  projGridGetInfoFromDatabase,
  projIdentify,
  projInsertObjectSessionCreate,
  projInsertObjectSessionDestroy,
  projIntListDestroy,
  projIsCrs,
  projIsDeprecated,
  projIsDerivedCrs,
  projIsEquivalentTo,
  projIsEquivalentToWithCtx,
  projListDestroy,
  projListGet,
  projListGetCount,
  projLogFunc,
  projLogLevel,
  projNormalizeForVisualization,
  projOperationFactoryContextDestroy,
  projOperationFactoryContextSetAllowBallparkTransformations,
  projOperationFactoryContextSetAllowUseIntermediateCrs,
  projOperationFactoryContextSetAllowedIntermediateCrs,
  projOperationFactoryContextSetAreaOfInterest,
  projOperationFactoryContextSetAreaOfInterestName,
  projOperationFactoryContextSetCrsExtentUse,
  projOperationFactoryContextSetDesiredAccuracy,
  projOperationFactoryContextSetDiscardSuperseded,
  projOperationFactoryContextSetGridAvailabilityUse,
  projOperationFactoryContextSetSpatialCriterion,
  projOperationFactoryContextSetUseProjAlternativeGridNames,
  projPrimeMeridianGetParameters,
  projQueryGeodeticCrsFromDatum,
  projStringDestroy,
  projStringListDestroy,
  projSuggestsCodeFor,
  projTransArray,
  projTransGeneric,
  projUnitListDestroy,
  projUomGetInfoFromDatabase,
  projXyDist,
  proj_alter_id,
  proj_alter_name,
  proj_as_proj_string,
  proj_as_projjson,
  proj_as_wkt,
  proj_celestial_body_list_destroy,
  proj_clone,
  proj_concatoperation_get_step,
  proj_concatoperation_get_step_count,
  proj_context_clone,
  proj_context_create,
  proj_context_destroy,
  proj_context_errno,
  proj_context_errno_string,
  proj_context_get_database_metadata,
  proj_context_get_database_path,
  proj_context_get_database_structure,
  proj_context_guess_wkt_dialect,
  proj_context_is_network_enabled,
  proj_context_set_autoclose_database,
  proj_context_set_database_path,
  proj_context_set_enable_network,
  proj_context_set_network_callbacks,
  proj_convert_conversion_to_other_method,
  proj_coord,
  proj_coordinate_metadata_create,
  proj_coordinate_metadata_get_epoch,
  proj_coordoperation_create_inverse,
  proj_coordoperation_get_accuracy,
  proj_coordoperation_get_grid_used,
  proj_coordoperation_get_grid_used_count,
  proj_coordoperation_get_method_info,
  proj_coordoperation_get_param,
  proj_coordoperation_get_param_count,
  proj_coordoperation_get_param_index,
  proj_coordoperation_get_towgs84_values,
  proj_coordoperation_has_ballpark_transformation,
  proj_coordoperation_is_instantiable,
  proj_coordoperation_requires_per_coordinate_input_time,
  proj_create,
  proj_create_cartesian_2D_cs,
  proj_create_compound_crs,
  proj_create_conversion,
  proj_create_crs_to_crs,
  proj_create_crs_to_crs_from_pj,
  proj_create_cs,
  proj_create_derived_geographic_crs,
  proj_create_ellipsoidal_2D_cs,
  proj_create_ellipsoidal_3D_cs,
  proj_create_engineering_crs,
  proj_create_from_database,
  proj_create_from_name,
  proj_create_from_wkt,
  proj_create_geocentric_crs,
  proj_create_geocentric_crs_from_datum,
  proj_create_geographic_crs,
  proj_create_geographic_crs_from_datum,
  proj_create_operation_factory_context,
  proj_create_operations,
  proj_create_projected_crs,
  proj_create_transformation,
  proj_create_vertical_crs,
  proj_create_vertical_crs_ex,
  proj_crs_alter_cs_angular_unit,
  proj_crs_alter_cs_linear_unit,
  proj_crs_alter_geodetic_crs,
  proj_crs_alter_parameters_linear_unit,
  proj_crs_create_bound_crs,
  proj_crs_create_bound_crs_to_WGS84,
  proj_crs_create_bound_vertical_crs,
  proj_crs_create_projected_3D_crs_from_2D,
  proj_crs_demote_to_2D,
  proj_crs_get_coordinate_system,
  proj_crs_get_coordoperation,
  proj_crs_get_datum,
  proj_crs_get_datum_ensemble,
  proj_crs_get_datum_forced,
  proj_crs_get_geodetic_crs,
  proj_crs_get_horizontal_datum,
  proj_crs_get_sub_crs,
  proj_crs_has_point_motion_operation,
  proj_crs_info_list_destroy,
  proj_crs_is_derived,
  proj_crs_is_dynamic,
  proj_crs_promote_to_3D,
  proj_cs_get_axis_count,
  proj_cs_get_axis_info,
  proj_cs_get_type,
  proj_datum_ensemble_get_accuracy,
  proj_datum_ensemble_get_member,
  proj_datum_ensemble_get_member_count,
  proj_destroy,
  proj_dynamic_datum_get_frame_reference_epoch,
  proj_ellipsoid_get_parameters,
  proj_errno_result_check,
  proj_error_codes,
  proj_get_area_of_use,
  proj_get_area_of_use_ex,
  proj_get_authorities_from_database,
  proj_get_celestial_body_list_from_database,
  proj_get_celestial_body_name,
  proj_get_codes_from_database,
  proj_get_crs_info_list_from_database,
  proj_get_crs_list_parameters_create,
  proj_get_crs_list_parameters_destroy,
  proj_get_domain_count,
  proj_get_ellipsoid,
  proj_get_geoid_models_from_database,
  proj_get_id_auth_name,
  proj_get_id_code,
  proj_get_insert_statements,
  proj_get_name,
  proj_get_non_deprecated,
  proj_get_prime_meridian,
  proj_get_remarks,
  proj_get_scope,
  proj_get_scope_ex,
  proj_get_source_crs,
  proj_get_suggested_operation,
  proj_get_target_crs,
  proj_get_type,
  proj_get_units_from_database,
  proj_grid_get_info_from_database,
  proj_identify,
  proj_insert_object_session_create,
  proj_insert_object_session_destroy,
  proj_int_list_destroy,
  proj_is_crs,
  proj_is_deprecated,
  proj_is_derived_crs,
  proj_is_equivalent_to,
  proj_is_equivalent_to_with_ctx,
  proj_list_destroy,
  proj_list_get,
  proj_list_get_count,
  proj_log_func,
  proj_log_level,
  proj_normalize_for_visualization,
  proj_operation_factory_context_destroy,
  proj_operation_factory_context_set_allow_ballpark_transformations,
  proj_operation_factory_context_set_allow_use_intermediate_crs,
  proj_operation_factory_context_set_allowed_intermediate_crs,
  proj_operation_factory_context_set_area_of_interest,
  proj_operation_factory_context_set_area_of_interest_name,
  proj_operation_factory_context_set_crs_extent_use,
  proj_operation_factory_context_set_desired_accuracy,
  proj_operation_factory_context_set_discard_superseded,
  proj_operation_factory_context_set_grid_availability_use,
  proj_operation_factory_context_set_spatial_criterion,
  proj_operation_factory_context_set_use_proj_alternative_grid_names,
  proj_prime_meridian_get_parameters,
  proj_query_geodetic_crs_from_datum,
  proj_string_destroy,
  proj_string_list_destroy,
  proj_suggests_code_for,
  proj_trans_array,
  proj_trans_generic,
  proj_type__GT_destroy_fn,
  proj_unit_list_destroy,
  proj_uom_get_info_from_database,
  proj_xy_dist,
  setCoordArray,
  setCoords,
  set_coord_array,
  set_coords_BANG_,
  should_use_context_dispatch_QMARK_,
  shutdown,
  shutdown_BANG_2 as shutdown_BANG_,
  toggle_graal_BANG_2 as toggle_graal_BANG_,
  transform_batch
};
/*! Bundled license information:

comlink/dist/esm/comlink.mjs:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)
*/
