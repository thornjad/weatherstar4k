const isDebug = () => window.DEBUG === true;

const log = (...args) => { if (isDebug()) {console.log(...args);} };
const warn = (...args) => { if (isDebug()) {console.warn(...args);} };

export { log, warn };
