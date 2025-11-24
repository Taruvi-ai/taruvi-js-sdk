const _window = typeof window !== 'undefined' ? window : undefined
const _global = typeof global !== 'undefined' ? global : undefined
const _process = typeof process !== 'undefined' ? process : undefined
const _navigator = typeof navigator !== 'undefined' ? navigator : undefined
const _document = typeof document !== 'undefined' ? document : undefined
const _self = typeof self !== 'undefined' ? self : undefined

export const isBrowser = (): boolean => {
    return _window !== undefined && _document !== undefined
}

export const isReactNative = (): boolean => {
    return _navigator !== undefined &&
        // @ts-ignore - navigator.product is deprecated but still used in RN detection
        _navigator.product === 'ReactNative'
}

export const getRuntimeEnvironment = (): string => {
    if (isBrowser()) return 'Browser'
    if (isReactNative()) return 'ReactNative'
    return 'Server'
}