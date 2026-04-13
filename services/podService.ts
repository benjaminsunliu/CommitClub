import { auth, db } from "@/services/firebase";
import { User as FirebaseUser } from "firebase/auth";
import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";

const INVITE_CODE_LENGTH = 6;
const INVITE_CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_INVITE_CODE_ATTEMPTS = 8;
const MAX_POD_MEMBERS = 4;

function getSignedInUser() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You need to sign in first.");
  }

  return user;
}

function createDefaultProfile(user: FirebaseUser) {
  const fallbackName =
    user.displayName?.trim() ||
    user.email?.split("@")[0]?.trim() ||
    "CommitClub Member";

  return {
    id: user.uid,
    name: fallbackName,
    email: user.email ?? "",
    podId: null,
    createdAt: serverTimestamp(),
  };
}

function createInviteCode() {
  return Array.from({ length: INVITE_CODE_LENGTH }, () => {
    const randomIndex = Math.floor(Math.random() * INVITE_CODE_CHARSET.length);
    return INVITE_CODE_CHARSET[randomIndex];
  }).join("");
}

async function inviteCodeExists(inviteCode: string) {
  const inviteQuery = query(
    collection(db, "pods"),
    where("inviteCode", "==", inviteCode),
  );
  const snapshot = await getDocs(inviteQuery);

  return !snapshot.empty;
}

async function createUniqueInviteCode() {
  for (let attempt = 0; attempt < MAX_INVITE_CODE_ATTEMPTS; attempt += 1) {
    const inviteCode = createInviteCode();

    if (!(await inviteCodeExists(inviteCode))) {
      return inviteCode;
    }
  }

  throw new Error("Could not generate an invite code. Please try again.");
}

function resolvePodName({
  requestedName,
  fallbackName,
}: {
  requestedName?: string;
  fallbackName?: string;
}) {
  const trimmedRequestedName = requestedName?.trim();
  if (trimmedRequestedName) {
    return trimmedRequestedName;
  }

  const trimmedFallbackName = fallbackName?.trim();
  if (trimmedFallbackName) {
    return `${trimmedFallbackName}'s Pod`;
  }

  return "CommitClub Pod";
}

export async function createPodForCurrentUser(podName?: string) {
  const authUser = getSignedInUser();
  const userId = authUser.uid;
  const userRef = doc(db, "users", userId);
  const podRef = doc(collection(db, "pods"));
  const inviteCode = await createUniqueInviteCode();

  await runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const fallbackProfile = createDefaultProfile(authUser);
    let userData: {
      name?: string;
      podId?: string | null;
    };

    if (!userSnapshot.exists()) {
      transaction.set(userRef, fallbackProfile);
      userData = fallbackProfile;
    } else {
      userData = userSnapshot.data() as {
        name?: string;
        podId?: string | null;
      };
    }

    if (userData.podId) {
      throw new Error("You are already in a pod.");
    }

    const resolvedPodName = resolvePodName({
      requestedName: podName,
      fallbackName: userData.name,
    });

    transaction.set(podRef, {
      id: podRef.id,
      name: resolvedPodName,
      inviteCode,
      memberIds: [userId],
      createdBy: userId,
      createdAt: serverTimestamp(),
    });
    transaction.set(userRef, { podId: podRef.id }, { merge: true });
  });

  return {
    podId: podRef.id,
    inviteCode,
  };
}

export async function createPodAndInitialHabitForCurrentUser({
  podName,
  habitTitle,
  habitCategory,
}: {
  podName: string;
  habitTitle: string;
  habitCategory: string;
}) {
  const authUser = getSignedInUser();
  const userId = authUser.uid;
  const userRef = doc(db, "users", userId);
  const podRef = doc(collection(db, "pods"));
  const habitRef = doc(collection(db, "habits"));
  const inviteCode = await createUniqueInviteCode();
  const trimmedHabitTitle = habitTitle.trim();

  await runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const fallbackProfile = createDefaultProfile(authUser);
    let userData: {
      name?: string;
      podId?: string | null;
    };

    if (!userSnapshot.exists()) {
      transaction.set(userRef, fallbackProfile);
      userData = fallbackProfile;
    } else {
      userData = userSnapshot.data() as {
        name?: string;
        podId?: string | null;
      };
    }

    if (userData.podId) {
      throw new Error("You are already in a pod.");
    }

    const resolvedPodName = resolvePodName({
      requestedName: podName,
      fallbackName: userData.name,
    });

    transaction.set(podRef, {
      id: podRef.id,
      name: resolvedPodName,
      inviteCode,
      memberIds: [userId],
      createdBy: userId,
      createdAt: serverTimestamp(),
    });

    transaction.set(habitRef, {
      id: habitRef.id,
      userId,
      podId: podRef.id,
      title: trimmedHabitTitle,
      category: habitCategory,
      createdAt: serverTimestamp(),
    });

    transaction.set(userRef, { podId: podRef.id }, { merge: true });
  });

  return {
    podId: podRef.id,
    inviteCode,
    habitId: habitRef.id,
  };
}

export async function joinPodWithInviteCode(rawInviteCode: string) {
  const authUser = getSignedInUser();
  const userId = authUser.uid;
  const inviteCode = rawInviteCode.trim().toUpperCase();

  if (!inviteCode) {
    throw new Error("Enter an invite code.");
  }

  const podQuery = query(
    collection(db, "pods"),
    where("inviteCode", "==", inviteCode),
  );
  const podSnapshot = await getDocs(podQuery);

  if (podSnapshot.empty) {
    throw new Error("Invite code not found. Double-check and try again.");
  }

  const podDocument = podSnapshot.docs[0];
  const userRef = doc(db, "users", userId);

  await runTransaction(db, async (transaction) => {
    const podSnapshotInTransaction = await transaction.get(podDocument.ref);

    if (!podSnapshotInTransaction.exists()) {
      throw new Error("That pod no longer exists.");
    }

    const podData = podSnapshotInTransaction.data() as { memberIds?: string[] };
    const memberIds = Array.isArray(podData.memberIds) ? podData.memberIds : [];
    const isAlreadyInMemberList = memberIds.includes(userId);

    const userSnapshot = await transaction.get(userRef);
    const fallbackProfile = createDefaultProfile(authUser);
    let existingPodId: string | null = null;

    if (!userSnapshot.exists()) {
      existingPodId = null;
    } else {
      const userData = userSnapshot.data() as { podId?: string | null };
      existingPodId = userData.podId ?? null;
    }

    if (existingPodId) {
      if (existingPodId === podDocument.id) {
        return;
      }

      throw new Error("You are already in a pod.");
    }

    if (!isAlreadyInMemberList && memberIds.length >= MAX_POD_MEMBERS) {
      throw new Error("This pod is full. Pods can have up to 4 members.");
    }

    if (!userSnapshot.exists()) {
      transaction.set(userRef, {
        ...fallbackProfile,
        podId: podDocument.id,
      });
    } else {
      transaction.update(userRef, { podId: podDocument.id });
    }

    if (!isAlreadyInMemberList) {
      transaction.update(podDocument.ref, {
        memberIds: arrayUnion(userId),
      });
    }
  });

  return { podId: podDocument.id };
}

export async function leaveCurrentPod() {
  const authUser = getSignedInUser();
  const userId = authUser.uid;
  const userRef = doc(db, "users", userId);

  await runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);

    if (!userSnapshot.exists()) {
      transaction.set(
        userRef,
        {
          ...createDefaultProfile(authUser),
          podId: null,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      return;
    }

    const userData = userSnapshot.data() as { podId?: string | null };
    const podId = userData.podId ?? null;

    if (!podId) {
      transaction.set(
        userRef,
        {
          podId: null,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      return;
    }

    const podRef = doc(db, "pods", podId);
    const podSnapshot = await transaction.get(podRef);

    if (podSnapshot.exists()) {
      const podData = podSnapshot.data() as { memberIds?: string[] };
      const memberIds = Array.isArray(podData.memberIds) ? podData.memberIds : [];
      const nextMemberIds = memberIds.filter((memberId) => memberId !== userId);

      if (nextMemberIds.length === 0) {
        transaction.delete(podRef);
      } else if (nextMemberIds.length !== memberIds.length) {
        transaction.update(podRef, {
          memberIds: nextMemberIds,
          updatedAt: serverTimestamp(),
        });
      }
    }

    transaction.set(
      userRef,
      {
        podId: null,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });

  return { leftPod: true };
}
