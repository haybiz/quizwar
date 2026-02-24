import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getDatabase, Database } from 'firebase/database';
import { environment } from '../environments/environment';

let app: FirebaseApp;
let auth: Auth;
let db: Database;

export function getFirebaseApp(): FirebaseApp {
    if (!app) {
        app = initializeApp(environment.firebase);
    }
    return app;
}

export function getFirebaseAuth(): Auth {
    if (!auth) {
        auth = getAuth(getFirebaseApp());
    }
    return auth;
}

export function getFirebaseDb(): Database {
    if (!db) {
        db = getDatabase(getFirebaseApp());
    }
    return db;
}
