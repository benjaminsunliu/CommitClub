import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { auth, db } from "@/services/firebase";

export type CheckInStatus = "done" | "partial" | "missed";
export type WeekStatus = CheckInStatus | "pending";

export type BasicCheckIn = {
    date: string;
    status: CheckInStatus;
};

type PodSupportEntry = {
    createdAt: Date | null;
    fromUserId: string | null;
};

export type WeekDay = {
    label: string;
    date: Date;
    dateKey: string;
    status: WeekStatus;
};

export const STATUS_COLORS: Record<WeekStatus, string> = {
    done: "#7EC089",
    partial: "#E9C36F",
    missed: "#BCAAD7",
    pending: "#DDDDDD",
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

type FirestoreTimestampLike = {
    toDate: () => Date;
};

type SecondsTimestampLike = {
    seconds: number;
    nanoseconds?: number;
};

export function isCheckInStatus(value: unknown): value is CheckInStatus {
    return value === "done" || value === "partial" || value === "missed";
}

export function startOfDay(value: Date) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
}

export function addDays(value: Date, count: number) {
    const date = new Date(value);
    date.setDate(date.getDate() + count);
    return date;
}

export function formatDateKey(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

export function getStartOfWeek(referenceDate: Date) {
    const normalizedReference = startOfDay(referenceDate);
    const currentDay = normalizedReference.getDay();
    const offset = currentDay === 0 ? -6 : 1 - currentDay;

    return addDays(normalizedReference, offset);
}

export function buildWeekDays(checkins: BasicCheckIn[], referenceDate: Date): WeekDay[] {
    const checkinsByDate = new Map<string, CheckInStatus>();

    for (const checkin of checkins) {
        checkinsByDate.set(checkin.date, checkin.status);
    }

    const start = getStartOfWeek(referenceDate);

    return WEEKDAY_LABELS.map((label, index) => {
        const date = addDays(start, index);
        const dateKey = formatDateKey(date);
        const status: WeekStatus = checkinsByDate.get(dateKey) ?? "pending";

        return {
            label,
            date,
            dateKey,
            status,
        };
    });
}

export function pluralizeDay(count: number) {
    return count === 1 ? "day" : "days";
}

export function pluralizeCheckIn(count: number) {
    return count === 1 ? "check-in" : "check-ins";
}

export function pluralizeReaction(count: number) {
    return count === 1 ? "reaction" : "reactions";
}

export function pluralizeTime(count: number) {
    return count === 1 ? "time" : "times";
}

export function getHeroMessage(checkInCount: number, missedCount: number) {
    if (checkInCount >= 5) {
        return "You're building consistency";
    }

    if (checkInCount >= 3) {
        return "You're keeping momentum";
    }

    if (checkInCount >= 1) {
        return "Every check-in still counts";
    }

    if (missedCount > 0) {
        return "Tomorrow is a fresh reset";
    }

    return "A new streak can start today";
}

export function getRecoveryInsight(
    weekDays: WeekDay[],
    checkInCount: number,
    missedCount: number,
) {
    let currentMissedStretch = 0;
    let recoveredAfterMisses: number | null = null;

    for (const day of weekDays) {
        if (day.status === "missed") {
            currentMissedStretch += 1;
            continue;
        }

        if (day.status === "done" || day.status === "partial") {
            if (currentMissedStretch > 0) {
                recoveredAfterMisses = currentMissedStretch;
            }

            currentMissedStretch = 0;
            continue;
        }

        currentMissedStretch = 0;
    }

    if (recoveredAfterMisses) {
        return `You came back after ${recoveredAfterMisses} missed ${pluralizeDay(recoveredAfterMisses)}. That's what builds lasting habits.`;
    }

    if (checkInCount >= 5) {
        return "You've kept showing up and that steady rhythm is starting to stick.";
    }

    if (missedCount === 0 && checkInCount > 0) {
        return "No missed days yet. Keep that steady rhythm going.";
    }

    if (checkInCount > 0) {
        return "Each check-in is a reset. Progress builds from small returns.";
    }

    return "Your next check-in can restart the rhythm for this week.";
}

export function getPodActiveDays(podCheckins: BasicCheckIn[], weekDays: WeekDay[]) {
    const currentWeekKeys = new Set(weekDays.map((day) => day.dateKey));
    const activeDays = new Set<string>();

    for (const checkin of podCheckins) {
        if (currentWeekKeys.has(checkin.date)) {
            activeDays.add(checkin.date);
        }
    }

    return activeDays.size;
}

export function getWeekRangeLabel(weekDays: WeekDay[]) {
    const formatter = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
    });

    const firstDay = weekDays[0];
    const lastDay = weekDays[weekDays.length - 1];

    return `${formatter.format(firstDay.date)} - ${formatter.format(lastDay.date)}`;
}

export function getWeekTitle(weekStart: Date) {
    return new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
    }).format(weekStart);
}

export function getMovingForwardMessage({
    checkInCount,
    partialCount,
    missedCount,
}: {
    checkInCount: number;
    partialCount: number;
    missedCount: number;
}) {
    if (checkInCount >= 5) {
        return "Consistency grows quietly. Focus on showing up, not being perfect.";
    }

    if (missedCount > 0 && checkInCount > 0) {
        return "Returning after a miss is part of the habit. Keep the next step simple.";
    }

    if (partialCount > 0) {
        return "Partial progress still keeps the habit alive. Momentum matters.";
    }

    if (checkInCount > 0) {
        return "Protect the rhythm you've started. One honest check-in at a time.";
    }

    return "A new week is a blank page. Start with one honest check-in.";
}

function toDate(value: unknown): Date | null {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return value;
    }

    if (typeof value === "string") {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    if (
        typeof value === "object" &&
        value !== null &&
        "toDate" in value &&
        typeof (value as FirestoreTimestampLike).toDate === "function"
    ) {
        return (value as FirestoreTimestampLike).toDate();
    }

    if (
        typeof value === "object" &&
        value !== null &&
        "seconds" in value &&
        typeof (value as SecondsTimestampLike).seconds === "number"
    ) {
        return new Date((value as SecondsTimestampLike).seconds * 1000);
    }

    return null;
}

function isDateWithinWeek(date: Date, weekStart: Date) {
    const weekEnd = addDays(weekStart, 7);
    return date >= weekStart && date < weekEnd;
}

export function useWeeklyProgressData() {
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [podId, setPodId] = useState<string | null>(null);
    const [userCheckins, setUserCheckins] = useState<BasicCheckIn[]>([]);
    const [podCheckins, setPodCheckins] = useState<BasicCheckIn[]>([]);
    const [podSupportEntries, setPodSupportEntries] = useState<PodSupportEntry[]>([]);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isPodMembershipLoading, setIsPodMembershipLoading] = useState(true);
    const [isUserCheckinsLoading, setIsUserCheckinsLoading] = useState(true);
    const [isPodCheckinsLoading, setIsPodCheckinsLoading] = useState(true);
    const [isPodSupportLoading, setIsPodSupportLoading] = useState(true);

    useEffect(() => {
        let unsubscribeUserDoc: (() => void) | undefined;

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            unsubscribeUserDoc?.();
            setIsAuthReady(true);

            if (!user) {
                setCurrentUserId(null);
                setPodId(null);
                setUserCheckins([]);
                setPodCheckins([]);
                setPodSupportEntries([]);
                setIsPodMembershipLoading(false);
                setIsUserCheckinsLoading(false);
                setIsPodCheckinsLoading(false);
                setIsPodSupportLoading(false);
                return;
            }

            setCurrentUserId(user.uid);
            setIsPodMembershipLoading(true);
            setIsUserCheckinsLoading(true);
            setIsPodCheckinsLoading(true);
            setIsPodSupportLoading(true);

            const userRef = doc(db, "users", user.uid);
            unsubscribeUserDoc = onSnapshot(
                userRef,
                (snapshot) => {
                    const data = snapshot.data() as { podId?: string | null } | undefined;
                    setPodId(data?.podId ?? null);
                    setIsPodMembershipLoading(false);
                },
                () => {
                    setPodId(null);
                    setIsPodMembershipLoading(false);
                    setIsPodCheckinsLoading(false);
                    setIsPodSupportLoading(false);
                },
            );
        });

        return () => {
            unsubscribeUserDoc?.();
            unsubscribeAuth();
        };
    }, []);

    useEffect(() => {
        if (!currentUserId) {
            setUserCheckins([]);
            setIsUserCheckinsLoading(false);
            return;
        }

        setIsUserCheckinsLoading(true);
        const userCheckinsQuery = query(
            collection(db, "checkins"),
            where("userId", "==", currentUserId),
        );

        const unsubscribe = onSnapshot(
            userCheckinsQuery,
            (snapshot) => {
                const nextCheckins = snapshot.docs
                    .map((docSnapshot) => {
                        const data = docSnapshot.data() as {
                            date?: unknown;
                            status?: unknown;
                        };
                        const date = typeof data.date === "string" ? data.date.trim() : "";

                        if (!date || !isCheckInStatus(data.status)) {
                            return null;
                        }

                        return {
                            date,
                            status: data.status,
                        };
                    })
                    .filter((checkin): checkin is BasicCheckIn => Boolean(checkin));

                setUserCheckins(nextCheckins);
                setIsUserCheckinsLoading(false);
            },
            () => {
                setUserCheckins([]);
                setIsUserCheckinsLoading(false);
            },
        );

        return () => {
            unsubscribe();
        };
    }, [currentUserId]);

    useEffect(() => {
        if (!podId) {
            setPodCheckins([]);
            setIsPodCheckinsLoading(false);
            return;
        }

        setIsPodCheckinsLoading(true);
        const podCheckinsQuery = query(
            collection(db, "checkins"),
            where("podId", "==", podId),
        );

        const unsubscribe = onSnapshot(
            podCheckinsQuery,
            (snapshot) => {
                const nextCheckins = snapshot.docs
                    .map((docSnapshot) => {
                        const data = docSnapshot.data() as {
                            date?: unknown;
                            status?: unknown;
                        };
                        const date = typeof data.date === "string" ? data.date.trim() : "";

                        if (!date || !isCheckInStatus(data.status)) {
                            return null;
                        }

                        return {
                            date,
                            status: data.status,
                        };
                    })
                    .filter((checkin): checkin is BasicCheckIn => Boolean(checkin));

                setPodCheckins(nextCheckins);
                setIsPodCheckinsLoading(false);
            },
            () => {
                setPodCheckins([]);
                setIsPodCheckinsLoading(false);
            },
        );

        return () => {
            unsubscribe();
        };
    }, [podId]);

    useEffect(() => {
        if (!podId) {
            setPodSupportEntries([]);
            setIsPodSupportLoading(false);
            return;
        }

        setIsPodSupportLoading(true);
        const podSupportQuery = query(
            collection(db, "podSupport"),
            where("podId", "==", podId),
        );

        const unsubscribe = onSnapshot(
            podSupportQuery,
            (snapshot) => {
                const nextSupportEntries = snapshot.docs.map((docSnapshot) => {
                    const data = docSnapshot.data() as {
                        createdAt?: unknown;
                        fromUserId?: unknown;
                    };

                    return {
                        createdAt: toDate(data.createdAt),
                        fromUserId:
                            typeof data.fromUserId === "string" ? data.fromUserId : null,
                    };
                });

                setPodSupportEntries(nextSupportEntries);
                setIsPodSupportLoading(false);
            },
            () => {
                setPodSupportEntries([]);
                setIsPodSupportLoading(false);
            },
        );

        return () => {
            unsubscribe();
        };
    }, [podId]);

    const weekStart = useMemo(() => getStartOfWeek(new Date()), []);
    const weekDays = buildWeekDays(userCheckins, weekStart);
    const doneCount = weekDays.filter((day) => day.status === "done").length;
    const partialCount = weekDays.filter((day) => day.status === "partial").length;
    const missedCount = weekDays.filter((day) => day.status === "missed").length;
    const checkInCount = doneCount + partialCount;
    const podActiveDays = getPodActiveDays(podCheckins, weekDays);
    const heroMessage = getHeroMessage(checkInCount, missedCount);
    const recoveryInsight = getRecoveryInsight(weekDays, checkInCount, missedCount);
    const weekRangeLabel = getWeekRangeLabel(weekDays);
    const weekTitle = getWeekTitle(weekStart);
    const podSupportCount = podSupportEntries.filter((entry) => {
        if (!entry.createdAt || !isDateWithinWeek(entry.createdAt, weekStart)) {
            return false;
        }

        if (!currentUserId) {
            return true;
        }

        return entry.fromUserId !== currentUserId;
    }).length;
    const movingForwardMessage = getMovingForwardMessage({
        checkInCount,
        partialCount,
        missedCount,
    });
    const isLoading =
        !isAuthReady ||
        isPodMembershipLoading ||
        isUserCheckinsLoading ||
        isPodCheckinsLoading ||
        isPodSupportLoading;

    return {
        currentUserId,
        podId,
        isLoading,
        weekStart,
        weekTitle,
        weekRangeLabel,
        weekDays,
        doneCount,
        partialCount,
        missedCount,
        checkInCount,
        podActiveDays,
        podSupportCount,
        heroMessage,
        recoveryInsight,
        movingForwardMessage,
    };
}
