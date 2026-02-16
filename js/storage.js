// storage.js — localStorage abstraction layer

import { DEFAULT_GOALS } from './models.js';

const PREFIX = 'eclipse_eq_';
const SCHEMA_VERSION = '1';

function getKey(name) {
  return PREFIX + name;
}

function save(name, data) {
  try {
    localStorage.setItem(getKey(name), JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Storage save failed:', e);
    return false;
  }
}

function load(name, defaultValue = null) {
  try {
    const raw = localStorage.getItem(getKey(name));
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    console.error('Storage load failed:', e);
    return defaultValue;
  }
}

export const Storage = {
  init() {
    const version = localStorage.getItem(getKey('version'));
    if (!version) {
      localStorage.setItem(getKey('version'), SCHEMA_VERSION);
    }
  },

  savePositions(positions) { return save('positions', positions); },
  loadPositions() { return load('positions', []); },

  saveClosedPositions(positions) { return save('closed_positions', positions); },
  loadClosedPositions() { return load('closed_positions', []); },

  saveGoals(goals) { return save('goals', goals); },
  loadGoals() { return load('goals', DEFAULT_GOALS); },

  saveApiKey(key) {
    localStorage.setItem(getKey('api_key'), key);
  },
  loadApiKey() {
    return localStorage.getItem(getKey('api_key')) || '';
  },

  clearAll() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(PREFIX)) keys.push(key);
    }
    keys.forEach(k => localStorage.removeItem(k));
  }
};
