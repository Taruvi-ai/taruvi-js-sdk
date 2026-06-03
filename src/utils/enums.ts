export const MimeTypeCategory = {
    IMAGE: 'image',
    VIDEO: 'video',
    AUDIO: 'audio',
    APPLICATION: 'application',
    TEXT: 'text'
} as const

export type MimeTypeCategory = typeof MimeTypeCategory[keyof typeof MimeTypeCategory]

export const Visibility = {
    PUBLIC: 'public',
    PRIVATE: 'private'
} as const

export type Visibility = typeof Visibility[keyof typeof Visibility]

export const SortOrder = {
    ASC: 'asc',
    DESC: 'desc'
} as const

export type SortOrder = typeof SortOrder[keyof typeof SortOrder]

export const DataFormat = {
    FLAT: 'flat',
    TREE: 'tree',
    GRAPH: 'graph'
} as const

export type DataFormat = typeof DataFormat[keyof typeof DataFormat]

export const GraphInclude = {
    DESCENDANTS: 'descendants',
    ANCESTORS: 'ancestors',
    BOTH: 'both'
} as const

export type GraphInclude = typeof GraphInclude[keyof typeof GraphInclude]
