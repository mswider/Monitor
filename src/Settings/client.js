const settings = {
  Appearance: {
    constants: { LIGHT: 0, DARK: 1, SYSTEM: 2 },
    validate: function (value) { return Object.values(this.constants).includes(value) },
    get default() { return this.constants.SYSTEM }
  }
};

function write(key, value) {
  try {
    localStorage.setItem(`monitor${key}`, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to write local setting "${key}":`, error);
  }
}

function settingsReducer(existing, { key, value }) {
  return settings[key].validate(value) ? ( write(key, value), { ...existing, [key]: value } ) : existing;
}

function loadSettings() {
  const result = {};
  for (const [name, info] of Object.entries(settings)) {
    try {
      if (localStorage.getItem(`monitor${name}`) === null) throw new Error();
      const entry = JSON.parse(localStorage.getItem(`monitor${name}`));
      if (info.validate(entry)) {
        result[name] = entry;
      } else throw new Error();
    } catch {
      result[name] = info.default;
      write(name, info.default);
    }
  }
  return result;
}

export { settingsReducer, loadSettings, settings };