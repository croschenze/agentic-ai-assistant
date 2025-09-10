// Firebase Configuration and Initialization
const firebaseConfig = {
    apiKey: "AIzaSyB_EW0wpN4bC-p-w_bckEEU2dX3ZhgzdnA",
    authDomain: "cros-thesis-experiment.firebaseapp.com",
    databaseURL: "https://cros-thesis-experiment-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "cros-thesis-experiment",
    storageBucket: "cros-thesis-experiment.firebasestorage.app",
    messagingSenderId: "168353913279",
    appId: "1:168353913279:web:cbba6630e3cb12e10de90a",
    measurementId: "G-FKBY3WQ8LH"
};

// Initialize Firebase
let app, database;

// Firebase initialization function
function initializeFirebase() {
    try {
        // Import Firebase modules (using CDN)
        if (typeof firebase === 'undefined') {
            console.error('Firebase SDK not loaded. Please include Firebase CDN scripts.');
            return false;
        }
        
        // Initialize Firebase app
        app = firebase.initializeApp(firebaseConfig);
        
        // Initialize Realtime Database
        database = firebase.database();
        
        console.log('Firebase initialized successfully');
        return true;
    } catch (error) {
        console.error('Firebase initialization failed:', error);
        return false;
    }
}

// Get database reference
function getDatabase() {
    if (!database) {
        console.error('Firebase database not initialized');
        return null;
    }
    return database;
}

// Export for use in other modules
window.FirebaseConfig = {
    initializeFirebase,
    getDatabase,
    config: firebaseConfig
};