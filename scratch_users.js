import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDGiPUDoSNQzYA5UXRwomU3axP-tKdSN0s",
  authDomain: "chronograde-3a6f8.firebaseapp.com",
  projectId: "chronograde-3a6f8",
  storageBucket: "chronograde-3a6f8.firebasestorage.app",
  messagingSenderId: "920777032782",
  appId: "1:920777032782:web:e7505865311f96625a2f1f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const get_users = async () => {
  const snapshot = await getDocs(collection(db, "users"));
  snapshot.forEach(doc => {
    console.log(doc.id, "=>", doc.data());
  });
  process.exit(0);
};

get_users().catch(console.error);
