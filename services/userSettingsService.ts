import { auth, db } from "@/services/firebase";
import { updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

export type ReminderWindow = "Morning" | "Afternoon" | "Evening";

export type ReminderPreferences = {
    dailyCheckInEnabled: boolean;
    reminderWindow: ReminderWindow;
    podSupportEnabled: boolean;
};

export const defaultReminderPreferences: ReminderPreferences = {
    dailyCheckInEnabled: true,
    reminderWindow: "Evening",
    podSupportEnabled: true,
};

function getSignedInUser() {
    const user = auth.currentUser;

    if (!user) {
        throw new Error("You need to sign in first.");
    }

    return user;
}

export function normalizeReminderPreferences(value: unknown): ReminderPreferences {
    if (!value || typeof value !== "object") {
        return defaultReminderPreferences;
    }

    const candidate = value as {
        dailyCheckInEnabled?: unknown;
        reminderWindow?: unknown;
        podSupportEnabled?: unknown;
    };

    const reminderWindow =
        candidate.reminderWindow === "Morning" ||
        candidate.reminderWindow === "Afternoon" ||
        candidate.reminderWindow === "Evening"
            ? candidate.reminderWindow
            : defaultReminderPreferences.reminderWindow;

    return {
        dailyCheckInEnabled:
            typeof candidate.dailyCheckInEnabled === "boolean"
                ? candidate.dailyCheckInEnabled
                : defaultReminderPreferences.dailyCheckInEnabled,
        reminderWindow,
        podSupportEnabled:
            typeof candidate.podSupportEnabled === "boolean"
                ? candidate.podSupportEnabled
                : defaultReminderPreferences.podSupportEnabled,
    };
}

export async function updateCurrentUserName(name: string) {
    const user = getSignedInUser();
    const trimmedName = name.trim();

    if (!trimmedName) {
        throw new Error("Please enter your name.");
    }

    await updateProfile(user, { displayName: trimmedName });
    await setDoc(
        doc(db, "users", user.uid),
        {
            id: user.uid,
            name: trimmedName,
            email: user.email ?? "",
            updatedAt: serverTimestamp(),
        },
        { merge: true },
    );
}

export async function updateCurrentUserReminderPreferences(
    reminders: ReminderPreferences,
) {
    const user = getSignedInUser();

    await setDoc(
        doc(db, "users", user.uid),
        {
            id: user.uid,
            reminders,
            updatedAt: serverTimestamp(),
        },
        { merge: true },
    );
}
