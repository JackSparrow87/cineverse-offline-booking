
import BetterSqlite3 from 'better-sqlite3';
import { useEffect, useState } from 'react';

// Initialize the database
let db: BetterSqlite3.Database | null = null;

// Function to initialize the database
export const initializeDB = () => {
  try {
    db = new BetterSqlite3('theatre_booking.db');
    createTables();
    seedData();
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return null;
  }
};

// Create all required tables
const createTables = () => {
  if (!db) return;

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Shows table
  db.exec(`
    CREATE TABLE IF NOT EXISTS shows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      poster TEXT,
      duration INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Show times table
  db.exec(`
    CREATE TABLE IF NOT EXISTS show_times (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      show_id INTEGER NOT NULL,
      show_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      price REAL NOT NULL,
      seating_map TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (show_id) REFERENCES shows (id)
    )
  `);

  // Bookings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      show_time_id INTEGER NOT NULL,
      seats TEXT NOT NULL,
      total_price REAL NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (show_time_id) REFERENCES show_times (id)
    )
  `);

  // Products table (for snacks and drinks)
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      price REAL NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Order items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings (id),
      FOREIGN KEY (product_id) REFERENCES products (id)
    )
  `);
  
  // System logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      details TEXT,
      user_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);
};

// Seed initial data
const seedData = () => {
  if (!db) return;

  // Check if admin user exists, if not create one
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin');
  
  if (adminCount && adminCount.count === 0) {
    // Insert admin user with password "admin123"
    db.prepare(`
      INSERT INTO users (username, password, email, role)
      VALUES (?, ?, ?, ?)
    `).run('admin', 'admin123', 'admin@theatre.com', 'admin');
    
    // Add a few sample shows
    const shows = [
      {
        title: 'The Phantom Menace',
        description: 'An epic space saga about a young hero\'s journey to save the galaxy.',
        poster: '/images/phantom_menace.jpg',
        duration: 136
      },
      {
        title: 'Love in Paris',
        description: 'A romantic comedy about finding love in the city of lights.',
        poster: '/images/love_paris.jpg',
        duration: 118
      },
      {
        title: 'The Last Detective',
        description: 'A gripping mystery thriller with unexpected twists.',
        poster: '/images/last_detective.jpg',
        duration: 142
      },
    ];
    
    const insertShow = db.prepare(`
      INSERT INTO shows (title, description, poster, duration)
      VALUES (?, ?, ?, ?)
    `);
    
    shows.forEach(show => {
      insertShow.run(show.title, show.description, show.poster, show.duration);
    });
    
    // Add some products (snacks and drinks)
    const products = [
      { name: 'Large Popcorn', type: 'snack', price: 8.99 },
      { name: 'Medium Popcorn', type: 'snack', price: 6.99 },
      { name: 'Small Popcorn', type: 'snack', price: 4.99 },
      { name: 'Large Soda', type: 'drink', price: 5.99 },
      { name: 'Medium Soda', type: 'drink', price: 4.99 },
      { name: 'Small Soda', type: 'drink', price: 3.99 },
      { name: 'Chocolate Bar', type: 'snack', price: 3.99 },
      { name: 'Nachos', type: 'snack', price: 7.99 },
      { name: 'Hot Dog', type: 'snack', price: 6.99 },
      { name: 'Water Bottle', type: 'drink', price: 2.99 },
    ];
    
    const insertProduct = db.prepare(`
      INSERT INTO products (name, type, price)
      VALUES (?, ?, ?)
    `);
    
    products.forEach(product => {
      insertProduct.run(product.name, product.type, product.price);
    });
    
    // Create some default show times
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(today.getDate() + 2);
    
    // Generate a basic 8x10 seating map (all available)
    const generateSeatingMap = () => {
      const rows = 8;
      const cols = 10;
      const seats = [];
      
      for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
          // 0 = available, 1 = reserved, 2 = space/aisle
          row.push(0);
        }
        seats.push(row);
      }
      
      // Add center aisle
      for (let r = 0; r < rows; r++) {
        seats[r][4] = 2;
        seats[r][5] = 2;
      }
      
      return JSON.stringify(seats);
    };
    
    const showTimes = [
      { show_id: 1, date: today.toISOString().split('T')[0], time: '14:00', price: 12.99 },
      { show_id: 1, date: today.toISOString().split('T')[0], time: '19:30', price: 14.99 },
      { show_id: 2, date: today.toISOString().split('T')[0], time: '16:30', price: 12.99 },
      { show_id: 2, date: tomorrow.toISOString().split('T')[0], time: '18:00', price: 14.99 },
      { show_id: 3, date: tomorrow.toISOString().split('T')[0], time: '20:30', price: 14.99 },
      { show_id: 3, date: dayAfterTomorrow.toISOString().split('T')[0], time: '15:00', price: 12.99 },
    ];
    
    const insertShowTime = db.prepare(`
      INSERT INTO show_times (show_id, show_date, start_time, price, seating_map)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    showTimes.forEach(showTime => {
      insertShowTime.run(
        showTime.show_id, 
        showTime.date, 
        showTime.time, 
        showTime.price,
        generateSeatingMap()
      );
    });
    
    // Log the initial setup
    db.prepare(`
      INSERT INTO system_logs (action, details)
      VALUES (?, ?)
    `).run('System initialized', 'Database created with initial data');
  }
};

// Function to get the database instance
export const getDB = () => {
  if (!db) {
    initializeDB();
  }
  return db;
};

// Log actions to system logs
export const logAction = (action: string, details: string, userId?: number) => {
  const database = getDB();
  if (!database) return;
  
  const stmt = database.prepare(`
    INSERT INTO system_logs (action, details, user_id)
    VALUES (?, ?, ?)
  `);
  
  stmt.run(action, details, userId || null);
};

// Custom hook for user authentication
export function useAuth() {
  const [currentUser, setCurrentUser] = useState<{
    id: number;
    username: string;
    email: string;
    role: 'admin' | 'customer';
  } | null>(null);
  
  useEffect(() => {
    // Check if user is already logged in from local storage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('currentUser');
      }
    }
  }, []);
  
  const login = (username: string, password: string) => {
    const database = getDB();
    if (!database) return { success: false, message: 'Database not accessible' };
    
    try {
      const user = database.prepare(`
        SELECT id, username, email, role FROM users
        WHERE username = ? AND password = ?
      `).get(username, password);
      
      if (user) {
        setCurrentUser(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        logAction('User login', `User ${username} logged in`, user.id);
        return { success: true, user };
      } else {
        return { success: false, message: 'Invalid username or password' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'An error occurred during login' };
    }
  };
  
  const register = (username: string, password: string, email: string) => {
    const database = getDB();
    if (!database) return { success: false, message: 'Database not accessible' };
    
    try {
      // Check if username or email already exists
      const existingUser = database.prepare(`
        SELECT username FROM users WHERE username = ? OR email = ?
      `).get(username, email);
      
      if (existingUser) {
        return { success: false, message: 'Username or email already exists' };
      }
      
      // Insert the new user
      const result = database.prepare(`
        INSERT INTO users (username, password, email, role)
        VALUES (?, ?, ?, ?)
      `).run(username, password, email, 'customer');
      
      if (result.changes > 0) {
        const newUser = {
          id: result.lastInsertRowid as number,
          username,
          email,
          role: 'customer' as const
        };
        
        setCurrentUser(newUser);
        localStorage.setItem('currentUser', JSON.stringify(newUser));
        logAction('User registration', `New user ${username} registered`, newUser.id);
        
        return { success: true, user: newUser };
      } else {
        return { success: false, message: 'Failed to create user' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'An error occurred during registration' };
    }
  };
  
  const logout = () => {
    if (currentUser) {
      logAction('User logout', `User ${currentUser.username} logged out`, currentUser.id);
    }
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
  };
  
  return {
    currentUser,
    login,
    register,
    logout,
    isAuthenticated: !!currentUser,
    isAdmin: currentUser?.role === 'admin'
  };
}

// Database initialization on app startup
initializeDB();
