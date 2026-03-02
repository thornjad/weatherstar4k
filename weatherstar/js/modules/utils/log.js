const isDebug = () => window.DEBUG === true;

const log = (...args) => {
  if (isDebug()) console.log(...args);
};

// warnings always pass through -- they indicate operational issues
const warn = (...args) => {
  console.warn(...args);
};

export { log, warn };
