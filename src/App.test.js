import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./firebase', () => ({
  auth: {},
  db: {},
}));

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  onAuthStateChanged: (_auth, callback) => {
    callback(null);
    return jest.fn();
  },
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  updateProfile: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(),
  collection: jest.fn(() => ({})),
  deleteDoc: jest.fn(),
  doc: jest.fn(() => ({})),
  onSnapshot: (_query, callback) => {
    callback({ docs: [] });
    return jest.fn();
  },
  orderBy: jest.fn(() => ({})),
  query: jest.fn(() => ({})),
  updateDoc: jest.fn(),
}));

test('renders task manager homepage heading', () => {
  render(<App />);
  const heading = screen.getByRole('heading', { name: /homepage/i });
  expect(heading).toBeInTheDocument();
});
