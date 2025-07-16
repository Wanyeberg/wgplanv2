// js/firebase-config.js

// Importiere die richtigen Funktionen
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
// GEÄNDERT: Importiere das REALTIME DATABASE SDK
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

// Deine Konfigurationsdaten sind korrekt
const firebaseConfig = {
  apiKey: "AIzaSyC_NKrtyJw2yI8YF9lUq-DLY-rJNvWs_B0",
  authDomain: "bersorgungsmatrix.firebaseapp.com",
  projectId: "bersorgungsmatrix",
  databaseURL: "https://bersorgungsmatrix-default-rtdb.europe-west1.firebasedatabase.app/",
  storageBucket: "bersorgungsmatrix.firebasestorage.app",
  messagingSenderId: "931340249531",
  appId: "1:931340249531:web:06bd834e0f40e4b6577c9e"
};

// Initialisiere Firebase
const app = initializeApp(firebaseConfig);

// GEÄNDERT: Initialisiere die REALTIME DATABASE und exportiere sie
export const db = getDatabase(app);