import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    doc,
    limit,
    onSnapshot,
    query,
    where,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "@/services/firebase";

type CheckInStatus = "done" | "partial" | "missed";

type NotificationTone = "neutral" | "support" | "reminder" | "active";

type NotificationItem = {
    id: string;
    icon: React.ComponentProps<typeof Feather>["name"];
    iconColor: string;
    title: string;
    body: string;
    timeLabel: string;
    tone: NotificationTone;
    highlighted?: boolean;
};

type PodCheckinRecord = {
    userId: string | null;
    date: string;
    status: CheckInStatus;
    activityAt: Date | null;
};

type PodSupportRecord = {
    senderName: string;
    fromUserId: string | null;
    message: string;
    createdAt: Date | null;
};

type FirestoreTimestampLike = {
    toDate: () => Date;
};

type SecondsTimestampLike = {
    seconds: number;
    nanoseconds?: number;
};

function isCheckInStatus(value: unknown): value is CheckInStatus {
    return value === "done" || value === "partial" || value === "missed";
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

function getTodayDateKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getDateAtHour(hour: number, dayOffset = 0) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + dayOffset);
    date.setHours(hour, 0, 0, 0);
    return date;
}

function getRelativeTimeText(date: Date | null) {
    if (!date) {
        return "just now";
    }

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));

    if (diffMinutes < 60) {
        return `${diffMinutes}m ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
        return `${diffHours}h ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}

function getCheckInStatusLabel(status: CheckInStatus) {
    if (status === "done") {
        return "done";
    }

    if (status === "partial") {
        return "partial";
    }

    return "missed";
}

function NotificationCard({ item }: { item: NotificationItem }) {
    const iconBackgroundColor =
        item.tone === "support"
            ? "#E4F1E5"
            : item.tone === "active"
                ? "#E6EBE8"
                : "#EDF2EF";

    return (
        <View
            style={[
                styles.notificationCard,
                item.highlighted && styles.notificationCardHighlighted,
            ]}
        >
            <View style={[styles.notificationIconWrap, { backgroundColor: iconBackgroundColor }]}>
                <Feather name={item.icon} size={26} color={item.iconColor} />
            </View>

            <View style={styles.notificationTextWrap}>
                <Text style={styles.notificationTitle}>{item.title}</Text>
                <Text style={styles.notificationBody}>{item.body}</Text>
                <Text style={styles.notificationTime}>{item.timeLabel}</Text>
            </View>
        </View>
    );
}

export default function NotificationsScreen() {
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [podId, setPodId] = useState<string | null>(null);
    const [memberCount, setMemberCount] = useState(0);
    const [podCheckins, setPodCheckins] = useState<PodCheckinRecord[]>([]);
    const [podSupports, setPodSupports] = useState<PodSupportRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let unsubscribeUserDoc: (() => void) | undefined;

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            unsubscribeUserDoc?.();

            if (!user) {
                setCurrentUserId(null);
                setPodId(null);
                setMemberCount(0);
                setPodCheckins([]);
                setPodSupports([]);
                setIsLoading(false);
                return;
            }

            setCurrentUserId(user.uid);
            setIsLoading(true);

            const userRef = doc(db, "users", user.uid);
            unsubscribeUserDoc = onSnapshot(
                userRef,
                (snapshot) => {
                    const data = snapshot.data() as { podId?: string | null } | undefined;
                    setPodId(data?.podId ?? null);
                },
                () => {
                    setPodId(null);
                    setIsLoading(false);
                },
            );
        });

        return () => {
            unsubscribeUserDoc?.();
            unsubscribeAuth();
        };
    }, []);

    useEffect(() => {
        if (!podId) {
            setMemberCount(0);
            setIsLoading(false);
            return;
        }

        const podRef = doc(db, "pods", podId);
        const unsubscribe = onSnapshot(
            podRef,
            (snapshot) => {
                const data = snapshot.data() as { memberIds?: string[] } | undefined;
                setMemberCount(Array.isArray(data?.memberIds) ? data.memberIds.length : 0);
            },
            () => {
                setMemberCount(0);
            },
        );

        return () => {
            unsubscribe();
        };
    }, [podId]);

    useEffect(() => {
        if (!podId) {
            setPodCheckins([]);
            return;
        }

        const checkinsQuery = query(
            collection(db, "checkins"),
            where("podId", "==", podId),
            limit(300),
        );

        const unsubscribe = onSnapshot(
            checkinsQuery,
            (snapshot) => {
                const nextCheckins = snapshot.docs
                    .map((docSnapshot) => {
                        const data = docSnapshot.data() as {
                            userId?: unknown;
                            date?: unknown;
                            status?: unknown;
                            updatedAt?: unknown;
                            createdAt?: unknown;
                        };

                        if (
                            typeof data.date !== "string" ||
                            !isCheckInStatus(data.status)
                        ) {
                            return null;
                        }

                        return {
                            userId: typeof data.userId === "string" ? data.userId : null,
                            date: data.date,
                            status: data.status,
                            activityAt: toDate(data.updatedAt) || toDate(data.createdAt),
                        };
                    })
                    .filter((checkin): checkin is PodCheckinRecord => Boolean(checkin));

                setPodCheckins(nextCheckins);
                setIsLoading(false);
            },
            () => {
                setPodCheckins([]);
                setIsLoading(false);
            },
        );

        return () => {
            unsubscribe();
        };
    }, [podId]);

    useEffect(() => {
        if (!podId) {
            setPodSupports([]);
            return;
        }

        const supportQuery = query(
            collection(db, "podSupport"),
            where("podId", "==", podId),
            limit(30),
        );

        const unsubscribe = onSnapshot(
            supportQuery,
            (snapshot) => {
                const nextSupports = snapshot.docs
                    .map((docSnapshot) => {
                        const data = docSnapshot.data() as {
                            fromName?: unknown;
                            fromUserId?: unknown;
                            message?: unknown;
                            createdAt?: unknown;
                        };

                        return {
                            senderName:
                                typeof data.fromName === "string" && data.fromName.trim()
                                    ? data.fromName.trim()
                                    : "Pod mate",
                            fromUserId:
                                typeof data.fromUserId === "string" ? data.fromUserId : null,
                            message:
                                typeof data.message === "string" && data.message.trim()
                                    ? data.message.trim()
                                    : "You got this",
                            createdAt: toDate(data.createdAt),
                        };
                    })
                    .sort(
                        (a, b) =>
                            (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
                    );

                setPodSupports(nextSupports);
            },
            () => {
                setPodSupports([]);
            },
        );

        return () => {
            unsubscribe();
        };
    }, [podId]);

    const notifications = useMemo<NotificationItem[]>(() => {
        const todayKey = getTodayDateKey();
        const todayCheckins = podCheckins.filter((checkin) => checkin.date === todayKey);
        const checkedInTodayCount = new Set(
            todayCheckins
                .filter((checkin) => checkin.userId)
                .map((checkin) => checkin.userId as string),
        ).size;
        const latestPodCheckin = [...todayCheckins]
            .sort((a, b) => (b.activityAt?.getTime() ?? 0) - (a.activityAt?.getTime() ?? 0))[0];
        const latestSupport = podSupports.find((support) => support.fromUserId !== currentUserId) ?? podSupports[0];
        const todayUserCheckin =
            todayCheckins.find((checkin) => checkin.userId === currentUserId) ?? null;

        const items: NotificationItem[] = [];

        items.push({
            id: "pod-activity",
            icon: "users",
            iconColor: "#2F6F6D",
            title:
                checkedInTodayCount > 0
                    ? "Your pod has been active today"
                    : "Your pod is still warming up",
            body:
                memberCount > 0
                    ? `${checkedInTodayCount} of ${memberCount} members checked in`
                    : "Your pod activity will show up here.",
            timeLabel: getRelativeTimeText(latestPodCheckin?.activityAt ?? getDateAtHour(10)),
            tone: "active",
        });

        if (latestSupport) {
            items.push({
                id: "latest-support",
                icon: "heart",
                iconColor: "#72BE86",
                title: `New support from ${latestSupport.senderName}`,
                body: latestSupport.message,
                timeLabel: getRelativeTimeText(latestSupport.createdAt),
                tone: "support",
            });
        } else {
            items.push({
                id: "support-nudge",
                icon: "heart",
                iconColor: "#72BE86",
                title: "A little support goes a long way",
                body: "Send a supportive reaction to lift someone in your pod today.",
                timeLabel: getRelativeTimeText(getDateAtHour(9)),
                tone: "support",
            });
        }

        if (todayUserCheckin) {
            items.push({
                id: "today-checkin",
                icon: "bell",
                iconColor: "#A8CBB8",
                title: "Today's check-in is in",
                body: `You marked today as ${getCheckInStatusLabel(todayUserCheckin.status)}.`,
                timeLabel: getRelativeTimeText(todayUserCheckin.activityAt),
                tone: "reminder",
            });

            items.push({
                id: "next-step",
                icon: "bell",
                iconColor: "#A8CBB8",
                title: "Nice work showing up",
                body: "Your next small check-in tomorrow will keep the rhythm going.",
                timeLabel: getRelativeTimeText(getDateAtHour(8, -1)),
                tone: "reminder",
                highlighted: true,
            });
        } else {
            items.push({
                id: "checkin-reminder",
                icon: "bell",
                iconColor: "#A8CBB8",
                title: "Quick check-in for today?",
                body: "How did your habit go today?",
                timeLabel: getRelativeTimeText(getDateAtHour(12)),
                tone: "reminder",
            });

            items.push({
                id: "new-day",
                icon: "bell",
                iconColor: "#A8CBB8",
                title: "New day, new start",
                body: "Ready to check in?",
                timeLabel: getRelativeTimeText(getDateAtHour(8, -1)),
                tone: "reminder",
                highlighted: true,
            });
        }

        return items;
    }, [currentUserId, memberCount, podCheckins, podSupports]);

    return (
        <SafeAreaView style={styles.root} edges={["top"]}>
            <StatusBar style="dark" />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.content}>
                    <View style={styles.headerRow}>
                        <Pressable
                            style={({ pressed }) => [
                                styles.backButton,
                                pressed && styles.backButtonPressed,
                            ]}
                            onPress={() => {
                                if (router.canGoBack()) {
                                    router.back();
                                } else {
                                    router.replace("/(tabs)/home");
                                }
                            }}
                        >
                            <Feather name="arrow-left" size={30} color="#25323E" />
                        </Pressable>
                        <Text style={styles.pageTitle}>Notifications</Text>
                    </View>

                    <View style={styles.notificationsList}>
                        {notifications.map((item) => (
                            <NotificationCard key={item.id} item={item} />
                        ))}
                    </View>

                    <View style={styles.footerCard}>
                        <Text style={styles.footerText}>
                            {isLoading
                                ? "Loading your latest notifications..."
                                : "You're all caught up! We'll let you know when there's something new."}
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#F3F1EE",
    },
    scrollContent: {
        paddingTop: 8,
        paddingBottom: 24,
    },
    content: {
        width: "100%",
        maxWidth: 520,
        alignSelf: "center",
        paddingHorizontal: 18,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: -6,
    },
    backButtonPressed: {
        opacity: 0.72,
    },
    pageTitle: {
        color: "#25323E",
        fontSize: 34,
        lineHeight: 40,
        fontFamily: "Fraunces_600SemiBold",
    },
    notificationsList: {
        marginTop: 18,
        gap: 14,
    },
    notificationCard: {
        borderRadius: 24,
        backgroundColor: "#FBFAF9",
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: "row",
        gap: 14,
    },
    notificationCardHighlighted: {
        borderWidth: 2,
        borderColor: "#A8C4C3",
    },
    notificationIconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    notificationTextWrap: {
        flex: 1,
        justifyContent: "center",
    },
    notificationTitle: {
        color: "#25323E",
        fontSize: 19,
        lineHeight: 25,
        fontFamily: "Fraunces_600SemiBold",
    },
    notificationBody: {
        marginTop: 8,
        color: "#5C6874",
        fontSize: 16,
        lineHeight: 23,
        fontFamily: "Inter_500Medium",
    },
    notificationTime: {
        marginTop: 10,
        color: "#5C6874",
        fontSize: 14,
        lineHeight: 20,
        fontFamily: "Inter_600SemiBold",
    },
    footerCard: {
        marginTop: 24,
        borderRadius: 24,
        backgroundColor: "#FBFAF9",
        paddingHorizontal: 20,
        paddingVertical: 22,
    },
    footerText: {
        color: "#5C6874",
        textAlign: "center",
        fontSize: 17,
        lineHeight: 28,
        fontFamily: "Inter_400Regular",
    },
});
