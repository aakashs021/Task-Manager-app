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

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [tasks, setTasks] = useState([]);
  const [taskInput, setTaskInput] = useState('');

  const [editTaskId, setEditTaskId] = useState(null);
  const [editText, setEditText] = useState('');

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [user, setUser] = useState(null);
  const [loginError, setLoginError] = useState('');
  const [signupError, setSignupError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      return;
    }

    const q = query(
      collection(db, 'users', user.uid, 'tasks'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })));
    });
  }, [user]);

  const completedCount = useMemo(
    () => tasks.filter((t) => t.completed).length,
    [tasks]
  );

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskInput.trim()) return;

    await addDoc(collection(db, 'users', user.uid, 'tasks'), {
      text: taskInput,
      completed: false,
      createdAt: Date.now(),
    });

    setTaskInput('');
  };

  const handleToggleTask = async (id, value) => {
    await updateDoc(doc(db, 'users', user.uid, 'tasks', id), {
      completed: !value,
    });
  };

  const handleDeleteTask = async (id) => {
    await deleteDoc(doc(db, 'users', user.uid, 'tasks', id));
  };

  const handleEditTask = async (id) => {
    await updateDoc(doc(db, 'users', user.uid, 'tasks', id), {
      text: editText,
    });
    setEditTaskId(null);
  };

  const handleInputChange = (setter) => (e) => {
    const { name, value } = e.target;
    setter((prev) => ({ ...prev, [name]: value }));
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
      setCurrentPage('home');
    } catch {
      setLoginError('Invalid email or password');
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();

    if (signupForm.password !== signupForm.confirmPassword) {
      setSignupError('Passwords do not match');
      return;
    }

    try {
      const userCred = await createUserWithEmailAndPassword(
        auth,
        signupForm.email,
        signupForm.password
      );

      if (signupForm.name) {
        await updateProfile(userCred.user, {
          displayName: signupForm.name,
        });
      }

      setCurrentPage('home');
    } catch {
      setSignupError('Signup failed');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div className="app-shell">

      {/* NAVBAR */}
      <header className="topbar">
        <h1>Task Manager</h1>
        <nav>
          <button onClick={() => setCurrentPage('home')}>Home</button>
          <button onClick={() => setCurrentPage('login')}>Login</button>
          <button onClick={() => setCurrentPage('signup')}>Signup</button>
        </nav>
      </header>

      <main className="content">

        {/* HOME */}
        {currentPage === 'home' && (
          <section className="card">

            {!user ? (
              <div className="auth-required">
                <p>Please login to continue</p>
                <button onClick={() => setCurrentPage('login')}>
                  Go to Login
                </button>
              </div>
            ) : (
              <>
                <div className="user-row">
                  <span>Welcome {user.email}</span>
                  <button className="logout-btn" onClick={handleLogout}>
                    Logout
                  </button>
                </div>

                <form onSubmit={handleAddTask} className="task-form">
                  <input
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    placeholder="Add new task"
                  />
                  <button>Add</button>
                </form>

                <div className="task-summary">
                  <span>Total: {tasks.length}</span>
                  <span>Completed: {completedCount}</span>
                </div>

                <ul className="task-list">
                  {tasks.map((task) => (
                    <li key={task.id}>

                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() =>
                          handleToggleTask(task.id, task.completed)
                        }
                      />

                      {editTaskId === task.id ? (
                        <>
                          <input
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                          />
                          <button className="save-btn" onClick={() => handleEditTask(task.id)}>Save</button>
                          <button className="cancel-btn" onClick={() => setEditTaskId(null)}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <span className={task.completed ? "completed" : ""}>
                            {task.text}
                          </span>

                          <button
                            className="edit-btn"
                            onClick={() => {
                              setEditTaskId(task.id);
                              setEditText(task.text);
                            }}
                          >
                            Edit
                          </button>

                          <button
                            className="delete-btn"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        {/* LOGIN */}
        {currentPage === 'login' && (
          <section className="card">
            <h2>Login</h2>

            <form onSubmit={handleLoginSubmit} className="auth-form">
              <label>
                Email
                <input
                  type="email"
                  name="email"
                  value={loginForm.email}
                  onChange={handleInputChange(setLoginForm)}
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  name="password"
                  value={loginForm.password}
                  onChange={handleInputChange(setLoginForm)}
                />
              </label>

              {loginError && <p className="error-text">{loginError}</p>}

              <button type="submit">Login</button>
            </form>
          </section>
        )}

        {/* SIGNUP */}
        {currentPage === 'signup' && (
          <section className="card">
            <h2>Signup</h2>

            <form onSubmit={handleSignupSubmit} className="auth-form">
              <label>
                Full Name
                <input
                  name="name"
                  value={signupForm.name}
                  onChange={handleInputChange(setSignupForm)}
                />
              </label>

              <label>
                Email
                <input
                  name="email"
                  value={signupForm.email}
                  onChange={handleInputChange(setSignupForm)}
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  name="password"
                  value={signupForm.password}
                  onChange={handleInputChange(setSignupForm)}
                />
              </label>

              <label>
                Confirm Password
                <input
                  type="password"
                  name="confirmPassword"
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