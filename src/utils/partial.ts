export const partial = (func, ...args) => (...rest) => func(...args, ...rest);
