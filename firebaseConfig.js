// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDAVT4ViwoCBzbdor4L7On3dGEuAV-mxTs",
  authDomain: "crudsipac.firebaseapp.com",
  projectId: "crudsipac",
  storageBucket: "crudsipac.firebasestorage.app",
  messagingSenderId: "1051512645063",
  appId: "1:1051512645063:web:f0dbc4676cf7957350a5e2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
