const _window = typeof window !== 'undefined' ? window : undefined
const _navigator = typeof navigator !== 'undefined' ? navigator : undefined
const _document = typeof document !== 'undefined' ? document : undefined

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

export function buildQueryString(queryParams: Record<string, unknown> | undefined): string {
    if (!queryParams || Object.keys(queryParams).length === 0) {
        return ''
    }
    const params = new URLSearchParams()
    Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            params.append(key, String(value))
        }
    })
    const queryString = params.toString()
    return queryString ? `?${queryString}` : ''
}
