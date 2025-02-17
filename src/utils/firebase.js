import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuración de Firebase para ViajeSeguro
const firebaseConfig = {
  apiKey: "TU_API_KEY_CORRECTA",
  authDomain: "viajeseguro-b204d.firebaseapp.com",
  projectId: "viajeseguro-b204d",
  storageBucket: "viajeseguro-b204d.appspot.com",
  messagingSenderId: "488344172437",
  appId: "1:488344172437:web:6971b45207b8d3db20e89c"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
