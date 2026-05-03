/* eslint-env jest */

let _state;

function init() {
  _state = {
    files: new Map(),
    dirs: new Set(['file:///mock/documents/']),
  };
}

init();

function getInfoAsync(uri) {
  const u = uri;
  const asDir = u.endsWith('/') ? u : `${u}/`;
  if (_state.dirs.has(asDir)) {
    return Promise.resolve({ exists: true, isDirectory: true, uri: u });
  }
  if (_state.files.has(u)) {
    const contents = _state.files.get(u);
    return Promise.resolve({
      exists: true,
      isDirectory: false,
      uri: u,
      size: typeof contents === 'string' ? contents.length : 0,
    });
  }
  return Promise.resolve({ exists: false, isDirectory: false });
}

function makeDirectoryAsync(uri) {
  const u = uri.endsWith('/') ? uri : `${uri}/`;
  _state.dirs.add(u);
  return Promise.resolve();
}

function deleteAsync(uri) {
  const u = uri;
  const asDir = u.endsWith('/') ? u : `${u}/`;
  _state.dirs.delete(asDir);
  _state.files.delete(u);
  for (const f of Array.from(_state.files.keys())) {
    if (f.startsWith(asDir)) _state.files.delete(f);
  }
  for (const d of Array.from(_state.dirs)) {
    if (d !== asDir && d.startsWith(asDir)) _state.dirs.delete(d);
  }
  return Promise.resolve();
}

function readDirectoryAsync(uri) {
  const base = uri.endsWith('/') ? uri : `${uri}/`;
  const out = new Set();
  for (const f of _state.files.keys()) {
    if (f.startsWith(base)) {
      const rest = f.slice(base.length).split('/')[0];
      if (rest) out.add(rest);
    }
  }
  for (const d of _state.dirs) {
    if (d !== base && d.startsWith(base)) {
      const rest = d.slice(base.length).split('/')[0];
      if (rest) out.add(rest);
    }
  }
  return Promise.resolve(Array.from(out));
}

function writeAsStringAsync(uri, contents) {
  _state.files.set(uri, contents ?? '');
  return Promise.resolve();
}

function readAsStringAsync(uri) {
  return Promise.resolve(_state.files.get(uri) ?? '');
}

function copyAsync() {
  return Promise.resolve();
}

function __reset() {
  init();
}

module.exports = {
  documentDirectory: 'file:///mock/documents/',
  cacheDirectory: 'file:///mock/cache/',
  getInfoAsync,
  makeDirectoryAsync,
  deleteAsync,
  readDirectoryAsync,
  writeAsStringAsync,
  readAsStringAsync,
  copyAsync,
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
  __reset,
};
