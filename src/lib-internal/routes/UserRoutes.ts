export const UserRoutes = {
    baseUrl: "api/users/",
    getCurrentUser: () => `${UserRoutes.baseUrl}me/`,
    getUser: (username: string) => `${UserRoutes.baseUrl}${username}/`,
    updateUser: (username: string) => `${UserRoutes.baseUrl}${username}/`,
    deleteUser: (username: string) => `${UserRoutes.baseUrl}${username}/`,
    listUser: (filter: string) => `${UserRoutes.baseUrl}${filter}`,
    getUserApps: (username: string) => `${UserRoutes.baseUrl}${username}/apps/`,
    assignRoles: () => `api/assign/roles/`,
    revokeRoles: () => `api/revoke/roles/`
} as const