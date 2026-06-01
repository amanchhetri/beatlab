import '@testing-library/jest-dom';

const store = new Map<string, string>();
const localStorageMock: Storage = {
  get length() {
    return store.size;
  },
  clear() {
    store.clear();
  },
  getItem(key) {
    return store.has(key) ? (store.get(key) as string) : null;
  },
  key(index) {
    return Array.from(store.keys())[index] ?? null;
  },
  removeItem(key) {
    store.delete(key);
  },
  setItem(key, value) {
    store.set(key, String(value));
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: localStorageMock,
});
