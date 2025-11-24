import type { Client } from "../../client.js";
import { User } from "../user/UserClient.js";

// handles user auth not dev auth
export class Auth {
    private client: Client

    constructor(client: Client) {
        this.client = client
    }

    async authenticateUser() {
        const myHeaders = new Headers();
        myHeaders.append("sec-ch-ua-platform", "\"Linux\"");
        myHeaders.append("Referer", "http://localhost:5173/");
        myHeaders.append("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36");
        myHeaders.append("sec-ch-ua", "\"Chromium\";v=\"142\", \"Google Chrome\";v=\"142\", \"Not_A Brand\";v=\"99\"");
        myHeaders.append("Content-Type", "application/json");
        myHeaders.append("sec-ch-ua-mobile", "?0");

        const raw = JSON.stringify({
            "password": "admin123",
            "email": "admin@example.com"
        });

        const requestOptions: RequestInit = {
            method: "POST",
            headers: myHeaders,
            body: raw,
            redirect: "follow"
        };

        await fetch("https://test-api.taruvi.cloud/api/v1/auth/login", requestOptions)
            .then((response) => response.json())
            .then((result) => {
                localStorage.setItem("sessionid", result.meta.session_token)
                localStorage.setItem("is_authenticated", result.meta.is_authenticated)
            })
            .catch((error) => console.error(error));
    }

    async isUserAuthenticated(): Promise<boolean> {
        //replace with real userAuthCode
        const authValue = localStorage.getItem("sessionid")
        return authValue ? true : false
    }

    // TODO: Implement authentication methods
    // - signInWithSSO
    // - signInWithPassword ?
    // - signOut
    // - isUserAuthenticated
    // - refreshSession
    // - redirectToLogin
}