import { useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import './App.css';
import { auth, db } from './firebase';

function getAuthMessage(error) {
  if (!error || !error.code) {
    return 'Something went wrong. Please try again.';
  }

  switch (error.code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please login instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 6 characters.';
    default:
      return error.message || 'Authentication failed. Please try again.';
  }
}

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [tasks, setTasks] = useState([]);
  const [taskInput, setTaskInput] = useState('');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [signupError, setSignupError] = useState('');
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskError, setTaskError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      setTasksLoading(false);
      setTaskError('');
      return;
    }

    setTasksLoading(true);
    setTaskError('');

    const tasksQuery = query(
      collection(db, 'users', user.uid, 'tasks'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      tasksQuery,
      (snapshot) => {
        setTasks(
          snapshot.docs.map((taskDoc) => ({
            id: taskDoc.id,
            ...taskDoc.data(),
          }))
        );
        setTasksLoading(false);
      },
      () => {
        setTaskError('Could not load tasks from Firestore.');
        setTasksLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  const completedCount = useMemo(
    () => tasks.filter((task) => task.completed).length,
    [tasks]
  );

  const handleAddTask = async (event) => {
    event.preventDefault();
    setTaskError('');

    if (!taskInput.trim() || !user) {
      return;
    }

    try {
      await addDoc(collection(db, 'users', user.uid, 'tasks'), {
        text: taskInput.trim(),
        completed: false,
        createdAt: Date.now(),
      });
      setTaskInput('');
    } catch (error) {
      setTaskError(error.message || 'Could not save task to Firestore.');
    }
  };

  const handleToggleTask = async (taskId, currentValue) => {
    if (!user) {
      return;
    }

    setTaskError('');

    try {
      await updateDoc(doc(db, 'users', user.uid, 'tasks', taskId), {
        completed: !currentValue,
      });
    } catch (error) {
      setTaskError(error.message || 'Could not update task.');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!user) {
      return;
    }

    setTaskError('');

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'tasks', taskId));
    } catch (error) {
      setTaskError(error.message || 'Could not delete task.');
    }
  };

  const handleInputChange = (setter) => (event) => {
    const { name, value } = event.target;
    setter((prev) => ({ ...prev, [name]: value }));
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setLoginError('');

    try {
      await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
      setLoginForm({ email: '', password: '' });
      setCurrentPage('home');
    } catch (error) {
      setLoginError(getAuthMessage(error));
    }
  };

  const handleSignupSubmit = async (event) => {
    event.preventDefault();
    setSignupError('');

    if (signupForm.password !== signupForm.confirmPassword) {
      setSignupError('Passwords do not match.');
      return;
    }

    try {
      const credentials = await createUserWithEmailAndPassword(
        auth,
        signupForm.email,
        signupForm.password
      );

      if (signupForm.name.trim()) {
        await updateProfile(credentials.user, {
          displayName: signupForm.name.trim(),
        });
      }

      setSignupForm({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
      });
      setCurrentPage('home');
    } catch (error) {
      setSignupError(getAuthMessage(error));
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentPage('login');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>Task Manager</h1>
        <nav>
          <button
            type="button"
            className={currentPage === 'home' ? 'active' : ''}
            onClick={() => setCurrentPage('home')}
          >
            Homepage
          </button>
          <button
            type="button"
            className={currentPage === 'login' ? 'active' : ''}
            onClick={() => setCurrentPage('login')}
          >
            Login
          </button>
          <button
            type="button"
            className={currentPage === 'signup' ? 'active' : ''}
            onClick={() => setCurrentPage('signup')}
          >
            Signup
          </button>
        </nav>
      </header>

      <main className="content">
        {currentPage === 'home' && (
          <section className="card">
            <h2>Homepage</h2>
            <p>Track your daily tasks and keep progress clear.</p>

            {authLoading && <p className="info-text">Checking authentication...</p>}

            {!authLoading && !user && (
              <div className="auth-required">
                <p>Please login or signup to manage your tasks.</p>
                <button type="button" onClick={() => setCurrentPage('login')}>
                  Go to Login
                </button>
              </div>
            )}

            {!authLoading && user && (
              <>
                <div className="user-row">
                  <span>
                    Signed in as {user.displayName || user.email}
                  </span>
                  <button type="button" className="secondary-btn" onClick={handleLogout}>
                    Logout
                  </button>
                </div>

                <form onSubmit={handleAddTask} className="task-form">
                  <input
                    type="text"
                    placeholder="Enter a new task"
                    value={taskInput}
                    onChange={(event) => setTaskInput(event.target.value)}
                  />
                  <button type="submit">Add Task</button>
                </form>

                <div className="task-summary">
                  <span>Total: {tasks.length}</span>
                  <span>Completed: {completedCount}</span>
                </div>

                {tasksLoading && <p className="info-text">Loading tasks...</p>}
                {taskError && <p className="error-text">{taskError}</p>}
                {!tasksLoading && tasks.length === 0 && (
                  <p className="info-text">No tasks yet. Add your first task.</p>
                )}

                <ul className="task-list">
                  {tasks.map((task) => (
                    <li key={task.id} className={task.completed ? 'done' : ''}>
                      <label>
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => handleToggleTask(task.id, task.completed)}
                        />
                        {task.text}
                      </label>
                      <button
                        type="button"
                        className="delete-btn"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        {currentPage === 'login' && (
          <section className="card">
            <h2>Login Page</h2>
            <form onSubmit={handleLoginSubmit} className="auth-form">
              <label>
                Email
                <input
                  type="email"
                  name="email"
                  required
                  value={loginForm.email}
                  onChange={handleInputChange(setLoginForm)}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  name="password"
                  required
                  value={loginForm.password}
                  onChange={handleInputChange(setLoginForm)}
                />
              </label>
              {loginError && <p className="error-text">{loginError}</p>}
              <button type="submit">Login</button>
            </form>
          </section>
        )}

        {currentPage === 'signup' && (
          <section className="card">
            <h2>Signup Page</h2>
            <form onSubmit={handleSignupSubmit} className="auth-form">
              <label>
                Full Name
                <input
                  type="text"
                  name="name"
                  required
                  value={signupForm.name}
                  onChange={handleInputChange(setSignupForm)}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  name="email"
                  required
                  value={signupForm.email}
                  onChange={handleInputChange(setSignupForm)}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  name="password"
                  required
                  value={signupForm.password}
                  onChange={handleInputChange(setSignupForm)}
                />
              </label>
              <label>
                Confirm Password
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  value={signupForm.confirmPassword}
                  onChange={handleInputChange(setSignupForm)}
                />
              </label>
              {signupError && <p className="error-text">{signupError}</p>}
              <button type="submit">Create Account</button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
