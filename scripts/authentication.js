// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBqaqMiGkPNocVLpYYTrsybLFrW7JliPpI",
    authDomain: "nutrition-tracking-c98bd.firebaseapp.com",
    projectId: "nutrition-tracking-c98bd",
    storageBucket: "nutrition-tracking-c98bd.appspot.com",
    messagingSenderId: "264877786232",
    appId: "1:264877786232:web:e45ac9f37649c5b57ad98d",
    measurementId: "G-0VB4P3TVFH"
};

// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    FacebookAuthProvider,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail,
    fetchSignInMethodsForEmail,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize providers
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

// Email/password registration
export async function registerWithEmail(name, email, password) {
    try {
        // Create user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Update profile with display name
        await updateProfile(userCredential.user, {
            displayName: name
        });
        
        // Create user document in Firestore
        await setDoc(doc(db, "users", userCredential.user.uid), {
            name: name,
            email: email,
            createdAt: serverTimestamp(),
            preferences: {
                calorieGoal: 2000,
                proteinGoal: 150,
                carbsGoal: 225,
                fatGoal: 65
            }
        });
        
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error("Registration error:", error);
        return { success: false, error: error };
    }
}

// Email login
export async function loginWithEmail(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error("Login error:", error);
        return { success: false, error: error };
    }
}

// Google login
export async function loginWithGoogle() {
    try {
        // Add persistence to keep user logged in
        await setPersistence(auth, browserLocalPersistence);
        
        const result = await signInWithPopup(auth, googleProvider);
        
        // Create user document if it doesn't exist
        const userDoc = await getDoc(doc(db, "users", result.user.uid));
        if (!userDoc.exists()) {
            await setDoc(doc(db, "users", result.user.uid), {
                name: result.user.displayName || "",
                email: result.user.email,
                photoURL: result.user.photoURL || "",
                createdAt: serverTimestamp(),
                preferences: {
                    calorieGoal: 2000,
                    proteinGoal: 150,
                    carbsGoal: 225,
                    fatGoal: 65
                }
            });
        }
        
        return { success: true, user: result.user };
    } catch (error) {
        console.error("Google login error:", error);
        
        // Special handling for unauthorized domain
        if (error.code === 'auth/unauthorized-domain') {
            console.error("Domain not authorized. Please add this domain to Firebase Auth settings.");
            const domain = window.location.hostname;
            const errorMessage = `This domain (${domain}) is not authorized for Firebase authentication. Please go to Firebase Console > Authentication > Settings > Authorized domains and add "${domain}".`;
            return { 
                success: false, 
                error: {
                    ...error,
                    message: errorMessage
                }
            };
        }
        
        return { success: false, error: error };
    }
}

// Facebook login
export async function loginWithFacebook() {
    try {
        // Add persistence to keep user logged in
        await setPersistence(auth, browserLocalPersistence);
        
        const result = await signInWithPopup(auth, facebookProvider);
        
        // Create user document if it doesn't exist
        const userDoc = await getDoc(doc(db, "users", result.user.uid));
        if (!userDoc.exists()) {
            await setDoc(doc(db, "users", result.user.uid), {
                name: result.user.displayName || "",
                email: result.user.email,
                photoURL: result.user.photoURL || "",
                createdAt: serverTimestamp(),
                preferences: {
                    calorieGoal: 2000,
                    proteinGoal: 150,
                    carbsGoal: 225,
                    fatGoal: 65
                }
            });
        }
        
        return { success: true, user: result.user };
    } catch (error) {
        console.error("Facebook login error:", error);
        
        // Special handling for unauthorized domain
        if (error.code === 'auth/unauthorized-domain') {
            console.error("Domain not authorized. Please add this domain to Firebase Auth settings.");
            const domain = window.location.hostname;
            const errorMessage = `This domain (${domain}) is not authorized for Firebase authentication. Please go to Firebase Console > Authentication > Settings > Authorized domains and add "${domain}".`;
            return { 
                success: false, 
                error: {
                    ...error,
                    message: errorMessage
                }
            };
        }
        
        return { success: false, error: error };
    }
}

// Logout
export async function logout() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        console.error("Logout error:", error);
        return { success: false, error: error };
    }
}

// Reset password
export async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true };
    } catch (error) {
        console.error("Password reset error:", error);
        return { success: false, error: error };
    }
}

// Check auth state
export function onAuthStateChange(callback) {
    return onAuthStateChanged(auth, callback);
}

// Check if email exists using fetchSignInMethodsForEmail
export async function checkIfEmailExists(email) {
    try {
        // Use fetchSignInMethodsForEmail instead of trying to sign in
        const methods = await fetchSignInMethodsForEmail(auth, email);
        
        // If methods array has any items, the email exists
        return { exists: methods.length > 0, methods: methods };
    } catch (error) {
        console.error("Email check error:", error);
        
        // Default to false for auth/invalid-email errors
        if (error.code === 'auth/invalid-email') {
            return { exists: false, error: error };
        }
        
        // For other errors, return the error
        return { error: error };
    }
}

// Alternative method to check for email existence (fallback)
export async function checkEmailExistsFallback(email) {
    try {
        // Try to sign in with a dummy password
        await signInWithEmailAndPassword(auth, email, "TemporaryPassword123!");
        // If we get here, sign in succeeded, meaning the email exists with this password
        return { exists: true };
    } catch (error) {
        if (error.code === 'auth/wrong-password') {
            // Wrong password means the email exists
            return { exists: true };
        } else if (error.code === 'auth/user-not-found') {
            // User not found means the email doesn't exist
            return { exists: false };
        } else {
            // Some other error occurred
            console.error("Email check fallback error:", error);
            return { error: error };
        }
    }
}

// Export Firebase instances
export { auth, db };

// Init auth state
document.addEventListener('DOMContentLoaded', function() {
    onAuthStateChange(user => {
        if (user) {
            console.log("User is signed in:", user.displayName);
        } else {
            console.log("User is signed out");
        }
    });
}); 