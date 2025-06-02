import { setExist } from "../pages/user/User";
import {api} from "./interceptor";

export const axLogin = async (user: string, pass: string) => {
  const res = await api.post('/auth/login', {
    username: user,
    password: pass,
  });
  const cookieHeaders = `Path=/; SameSite=Strict${
      window.location.protocol === "https:" ? "; Secure" : ""
  }`;
  document.cookie = `accessToken=${
      res.data.accessToken
  }; ${cookieHeaders}`;

  document.cookie = `refreshToken=${
      res.data.refreshToken
  }; ${cookieHeaders}`;

  return res.data;
};

export async function refreshAccessToken() {
  const cookieAttributes = `Path=/; SameSite=Strict${
      window.location.protocol === "https:" ? "; Secure" : ""
  }`;

  api
    .post('/auth/token', {},)
    .then((res) => {
      document.cookie = `accessToken=${
          res.data.accessToken
      }; ${cookieAttributes}`;
    })
}

export function axCreateUser(username: string, password: string): void {
  api
    .post('/users/create', {
      username: username,
      password: password,
    })
    .then((res) => {
      setExist(res.data.donExist);
    })
}

export async function axGetPublicKeys() {
  const res = await api.get(`/blockchain/publicKeys`, {
    withCredentials: true,
  });

  return res.data.publicKeys;
}

