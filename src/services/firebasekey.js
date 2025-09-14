// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB3Cn8ex2Xw2RDQmGhh6AlARDf8VX8kiHc",
  authDomain: "link-toshan-kanwar.firebaseapp.com",
  projectId: "link-toshan-kanwar",
  storageBucket: "link-toshan-kanwar.firebasestorage.app",
  messagingSenderId: "896317303681",
  appId: "1:896317303681:web:db7ff87bdb80abb3969680",
  measurementId: "G-6QPKDGNXJS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);