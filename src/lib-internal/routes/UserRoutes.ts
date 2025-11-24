export const UserRoutes = {
    getCurrentUser: "api/users/me/",
    createNewUser: "api/users/",
    updateUser: (username: string) => `api/users/${username}`,
    deleteUser: (username: string) => `api/users/${username}`
} as const