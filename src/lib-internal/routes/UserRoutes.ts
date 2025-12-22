import type { UserList } from "../../lib/user/types.js";

export const UserRoutes = {
    baseUrl: "api/users/",
    getCurrentUser: () => `${UserRoutes.baseUrl}me/`,
    updateUser: (username: string) => `${UserRoutes.baseUrl}${username}/`,
    deleteUser: (username: string) => `${UserRoutes.baseUrl}${username}/`,
    listUser: (filter: string) => `${UserRoutes.baseUrl}${filter}`,
    getUserApps: (username: string) => `${UserRoutes.baseUrl}${username}/apps/`
} as const