// Status enum-like constants
const STATUS = {
  loading: 'loading',
  loaded: 'loaded',
  failed: 'failed',
  noData: 'noData',
  disabled: 'disabled',
  retrying: 'retrying',
};

// Status enum for TypeScript-like validation
const StatusEnum = {
  LOADING: 'loading',
  LOADED: 'loaded',
  FAILED: 'failed',
  NO_DATA: 'noData',
  DISABLED: 'disabled',
  RETRYING: 'retrying',
};

const calcStatusClass = statusCode => {
  switch (statusCode) {
    case STATUS.loading:
      return 'loading';
    case STATUS.loaded:
      return 'press-here';
    case STATUS.failed:
      return 'failed';
    case STATUS.noData:
      return 'no-data';
    case STATUS.disabled:
      return 'disabled';
    case STATUS.retrying:
      return 'retrying';
    default:
      return '';
  }
};

const statusClasses = ['loading', 'press-here', 'failed', 'no-data', 'disabled', 'retrying'];

export default STATUS;
export { calcStatusClass, statusClasses, StatusEnum };
