import { auth, db } from "@/services/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

export async function registerUser(
  name: string,
  email: string,
  password: string,
) {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );

  const user = userCredential.user;

  if (name.trim()) {
    await updateProfile(user, { displayName: name.trim() });
  }

  void setDoc(doc(db, "users", user.uid), {
    id: user.uid,
    name: name.trim(),
    email: user.email,
    podId: null,
    createdAt: serverTimestamp(),
  }).catch((error) => {
    console.warn("Failed to create user profile document", error);
  });

  return user;
}

export async function loginUser(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );

  return userCredential.user;
}

export async function logoutUser() {
  await signOut(auth);
}
