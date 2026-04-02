import { auth, db } from "@/services/firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

export type PrimaryHabitRecord = {
  id: string;
  title: string;
  category: string;
};

function getSignedInUser() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You need to sign in first.");
  }

  return user;
}

async function getPrimaryHabitSnapshotForCurrentUser() {
  const authUser = getSignedInUser();
  const userId = authUser.uid;
  const habitsQuery = query(
    collection(db, "habits"),
    where("userId", "==", userId),
    limit(1),
  );

  const habitsSnapshot = await getDocs(habitsQuery);

  return habitsSnapshot.empty ? null : habitsSnapshot.docs[0];
}

export async function getPrimaryHabitForCurrentUser(): Promise<PrimaryHabitRecord | null> {
  const habitSnapshot = await getPrimaryHabitSnapshotForCurrentUser();

  if (!habitSnapshot) {
    return null;
  }

  const habitData = habitSnapshot.data() as { title?: string; category?: string };

  return {
    id: habitSnapshot.id,
    title: habitData.title?.trim() || "",
    category: habitData.category?.trim() || "study",
  };
}

export async function upsertPrimaryHabitForCurrentUser({
  title,
  category,
}: {
  title: string;
  category: string;
}) {
  const authUser = getSignedInUser();
  const userId = authUser.uid;
  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    throw new Error("Please enter your habit.");
  }

  const userRef = doc(db, "users", userId);
  const userSnapshot = await getDoc(userRef);
  const userData = userSnapshot.data() as { podId?: string | null } | undefined;
  const podId = userData?.podId ?? null;

  if (!podId) {
    throw new Error("Create or join a pod first.");
  }

  const habitSnapshot = await getPrimaryHabitSnapshotForCurrentUser();

  if (!habitSnapshot) {
    const habitRef = doc(collection(db, "habits"));
    await setDoc(habitRef, {
      id: habitRef.id,
      userId,
      podId,
      title: trimmedTitle,
      category,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { habitId: habitRef.id };
  }

  await updateDoc(habitSnapshot.ref, {
    title: trimmedTitle,
    category,
    podId,
    updatedAt: serverTimestamp(),
  });

  return { habitId: habitSnapshot.id };
}

export async function deletePrimaryHabitForCurrentUser() {
  const habitSnapshot = await getPrimaryHabitSnapshotForCurrentUser();

  if (!habitSnapshot) {
    return { deleted: false };
  }

  await deleteDoc(habitSnapshot.ref);

  return { deleted: true };
}
