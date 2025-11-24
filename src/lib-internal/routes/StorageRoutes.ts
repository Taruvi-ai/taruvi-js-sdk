import type { QueryParams } from "../../lib/Storage/types.js"

/**
 * Storage Routes for Taruvi Data Service
 * Handles URL construction for data operations
 */
export const StorageRoutes = {
    /**
     * Base URL for app-scoped operations
     * /api/apps/{app_slug}
     */
    baseUrl: (appSlug: string): string => `api/apps/${appSlug}`,

    /**
     * Data tables path
     * /datatables/{table_name}/data
     */
    dataTable: (tableName: string): string => `/datatables/${tableName}/data`,

    /**
     * Single record path
     * /{record_id}
     */
    recordId: (recordId: string): string => `/${recordId}`,

    /**
     * Build query string from query parameters
     * Handles filtering, sorting, pagination, and population
     */
    buildQueryString: (params: QueryParams): string => {
        if (!params || Object.keys(params).length === 0) {
            return ''
        }

        const searchParams = new URLSearchParams()

        // Add all parameters to URLSearchParams
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                // Handle arrays (for operators like 'in', 'nin')
                if (Array.isArray(value)) {
                    searchParams.append(key, value.join(','))
                } else {
                    searchParams.append(key, String(value))
                }
            }
        })

        const queryString = searchParams.toString()
        return queryString ? `?${queryString}` : ''
    }
}
