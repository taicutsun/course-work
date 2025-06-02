import axios from 'axios';
import { refreshAccessToken} from "./api";

export const API_URL = "http://localhost:3001";

export const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

api.interceptors.response.use(//todo update it
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            await refreshAccessToken();

            return axios.request(error.config);
        }
        return Promise.reject(error);
    }
);