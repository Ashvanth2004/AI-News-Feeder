import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// 🔧 Replace these values with your own Firebase project config
// Go to https://console.firebase.google.com → Project Settings → General → Your apps → Web
const firebaseConfig = {
  apiKey: 'AIzaSyYourApiKeyHere',
  authDomain: 'your-project.firebaseapp.com',
  projectId: 'your-project-id',
  storageBucket: 'your-project.appspot.com',
  messagingSenderId: '123456789012',
  appId: '1:123456789012:web:abcdef1234567890',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;