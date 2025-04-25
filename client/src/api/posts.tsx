import axios from "axios";
import { setExist } from "../pages/user/User"; //todo delete

const API_URL = "http://localhost:3001";

let tokens = {
  accessToken: "",
  refreshToken: "",
};

//for loginPage
export const axLogin = async (user: string, pass: string) => {
  const res = await axios.post(`${API_URL}/auth/login`, {
    username: user,
    password: pass,
  });
  if (res.data.status) {
    tokens.accessToken = res.data.accessToken;
    tokens.refreshToken = res.data.refreshToken;
  } else if (res.data.status === false) {
    console.log("err in auth func");
  }
  return res.data;
};

//for loginPage

//for userPage
export async function sendAccToken() {
  //todo mb delete
  axios
    .post(
      `${API_URL}/posts`,
      {},
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      }
    )
    .then((res) => {
      console.log("sended acc");
    })
    .catch((err) => {
      if (err.response) console.log("error in acctoken");
      else if (err.request) console.log("req");
      else console.log("me AcT");
    });
} //todo delete

export async function sendRefToken() {
  axios
    .post(
      `${API_URL}/auth/token`,
      {
        token: `${tokens.refreshToken}`,
      },
      { withCredentials: true }
    )
    .then((res) => {
      console.log("sended ref");
      tokens.accessToken = res.data.accessToken;
    })
    .catch((err) => {
      if (err.response) console.log("error in reftoken");
      else if (err.request) console.log("req refT");
      else console.log("me refT");
    });
}

export function axCreateUser(username: string, password: string): void {
  axios
    .post(`${API_URL}/users/create`, {
      username: username,
      password: password,
    })
    .then((res) => {
      setExist(res.data.donExist);

      console.log(res.data);
    })
    .catch((err) => {
      if (err.response) console.log("error in create");
      else if (err.request) console.log("req create");
      else console.log("me create");
    });
}

//for bC func
/*
export function axGetBalance(cryptoI: number): void {
  axios
    .post(`http://localhost:3001/create`, {
      cryptoI: cryptoI,
    })
    .then((res) => {
     
      console.log(res.data);
    })
    .catch((err) => {
      if (err.response) console.log("error in bal");
      else if (err.request) console.log("req bal");
      else console.log("me bal");
      
      window.location.href  = "http://localhost:3000/";
    });
}
*/

export async function axGetPublicKeys() {
  const res = await axios.get(`${API_URL}/blockchain/publicKeys`, {
    withCredentials: true,
  });

  if (res.data.status === false) console.log("err in auth func");

  return res.data;
}

export async function axSendMoney(
  cryptoI: number,
  _to: string,
  amountEther: string
) {
  const res = await axios.post(
    `${API_URL}/blockchain/sendEther`,
    {
      cryptoI: cryptoI,
      _to: _to,
      amountEther: amountEther,
    },
    {
      withCredentials: true,
    }
  );

  return res.data;
}
