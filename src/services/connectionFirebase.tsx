// services/connectionFirebase.tsx
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB5VNyyQ1fny44O1Yd2B1tJy5li7KXl9GQ",
  authDomain: "piscicultura-app-244f6.firebaseapp.com",
  databaseURL: "https://piscicultura-app-244f6-default-rtdb.firebaseio.com",
  projectId: "piscicultura-app-244f6",
  storageBucket: "piscicultura-app-244f6.appspot.com",
  messagingSenderId: "758916070691",
  appId: "1:758916070691:web:ce934ac8c5469a2083a096"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const database = getDatabase(app);

export default app;

