import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyA1uNXg9YK5e5mj0vS6KZF-hWMJf_w9p-w',
  authDomain: 'task-manager-app-ab120.firebaseapp.com',
  projectId: 'task-manager-app-ab120',
  storageBucket: 'task-manager-app-ab120.firebasestorage.app',
  messagingSenderId: '76070932913',
  appId: '1:76070932913:web:945f848c70d9c2866c6d90',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
