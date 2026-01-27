
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDPYn_CXgtQE9lW1dtcUdnE94aLB9KlbbY",
  authDomain: "hedera-certification-program.firebaseapp.com",
  databaseURL: "https://hedera-certification-program-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "hedera-certification-program",
  storageBucket: "hedera-certification-program.firebasestorage.app",
  messagingSenderId: "516209856130",
  appId: "1:516209856130:web:1cb999ba68f8d189b56e9b",
  measurementId: "G-17XTCLTVNJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services for use in components
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

export default app;
