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


export const QueryParams = {
    include: "include",
    depth: "depth",
    format: "format",
    graph_type: "graph_type",
}