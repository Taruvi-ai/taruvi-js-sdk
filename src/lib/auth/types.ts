export interface SignInWithPassword {
    username: string,
    password: string
}

export interface AuthClientInterface {
    baseUrl: string,
    apiKey?: string
}