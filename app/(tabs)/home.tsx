import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Href, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    doc,
    getDocs,
    limit,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "@/services/firebase";

type CheckInStatus = "done" | "partial" | "missed";
const habitSetupPath = "/habit-setup" as Href;

type CheckInCardProps = {
    title: string;
    subtitle: string;
    icon: React.ComponentProps<typeof Feather>["name"];
    backgroundColor: string;
    selected: boolean;
    disabled: boolean;
    onPress: () => void;
    iconDashed?: boolean;
};

function CheckInCard({
    title,
    subtitle,
    icon,
    backgroundColor,
    selected,
    disabled,
    onPress,
    iconDashed = false,
}: CheckInCardProps) {
    return (
        <TouchableOpacity
            style={[
                styles.optionCard,
                { backgroundColor },
                selected && styles.optionCardSelected,
                disabled && styles.optionCardDisabled,
            ]}
            activeOpacity={0.9}
            onPress={onPress}
            disabled={disabled}
        >
            <View style={[styles.optionIconWrap, iconDashed && styles.optionIconWrapDashed]}>
                <Feather name={icon} size={36} color="#22313D" />
            </View>
            <View>
                <Text style={styles.optionTitle}>{title}</Text>
                <Text style={styles.optionSubtitle}>{subtitle}</Text>
            </View>
        </TouchableOpacity>
    );
}

function getTimeGreeting() {
    const hour = new Date().getHours();

    if (hour < 12) {
        return "Good morning";
    }

    if (hour < 18) {
        return "Good afternoon";
    }

    return "Good evening";
}

function getHabitCategoryLabel(category: string | undefined) {
    if (!category) {
        return "General";
    }

    return `${category.charAt(0).toUpperCase()}${category.slice(1)}`;
}

function getTodayDateKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

export default function HomeScreen() {
    const [timeGreeting, setTimeGreeting] = useState(getTimeGreeting());
    const [userName, setUserName] = useState("there");
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentPodId, setCurrentPodId] = useState<string | null>(null);
    const [currentHabitId, setCurrentHabitId] = useState<string | null>(null);
    const [habitTitle, setHabitTitle] = useState("Set up your first habit");
    const [habitCategory, setHabitCategory] = useState("General");
    const [isHabitLoading, setIsHabitLoading] = useState(true);
    const [todayCheckInStatus, setTodayCheckInStatus] = useState<CheckInStatus | null>(null);
    const [isSavingCheckIn, setIsSavingCheckIn] = useState(false);
    const [checkInFeedback, setCheckInFeedback] = useState<string | null>(null);
    const hasHabit = Boolean(currentHabitId);

    const greetingText = useMemo(
        () => `${timeGreeting},\n${userName}`,
        [timeGreeting, userName],
    );
    const goalMetaText = isHabitLoading
        ? "Daily • ..."
        : hasHabit
            ? `Daily • ${habitCategory}`
            : "Tap to set your habit";

    useEffect(() => {
        function updateTimeGreeting() {
            setTimeGreeting(getTimeGreeting());
        }

        updateTimeGreeting();
        const greetingInterval = setInterval(updateTimeGreeting, 60 * 1000);

        return () => {
            clearInterval(greetingInterval);
        };
    }, []);

    useEffect(() => {
        let unsubscribeUserProfile: (() => void) | undefined;
        let unsubscribeHabit: (() => void) | undefined;
        let unsubscribeTodayCheckin: (() => void) | undefined;

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            unsubscribeUserProfile?.();
            unsubscribeHabit?.();
            unsubscribeTodayCheckin?.();

            if (!user) {
                setUserName("there");
                setCurrentUserId(null);
                setCurrentPodId(null);
                setCurrentHabitId(null);
                setHabitTitle("Set up your first habit");
                setHabitCategory("General");
                setIsHabitLoading(false);
                setTodayCheckInStatus(null);
                setCheckInFeedback(null);
                return;
            }

            const fallbackName =
                user.displayName?.trim() ||
                user.email?.split("@")[0]?.trim() ||
                "there";
            setUserName(fallbackName);
            setCurrentUserId(user.uid);

            const userRef = doc(db, "users", user.uid);
            unsubscribeUserProfile = onSnapshot(
                userRef,
                (snapshot) => {
                    const userData = snapshot.data() as
                        | { name?: string; podId?: string | null }
                        | undefined;
                    const profileName = userData?.name?.trim();

                    if (profileName) {
                        setUserName(profileName);
                    } else {
                        setUserName(fallbackName);
                    }

                    setCurrentPodId(userData?.podId ?? null);
                },
                () => {
                    setUserName(fallbackName);
                    setCurrentPodId(null);
                },
            );

            setIsHabitLoading(true);
            const habitsQuery = query(
                collection(db, "habits"),
                where("userId", "==", user.uid),
                limit(1),
            );
            unsubscribeHabit = onSnapshot(
                habitsQuery,
                (snapshot) => {
                    if (snapshot.empty) {
                        setCurrentHabitId(null);
                        setHabitTitle("Set up your first habit");
                        setHabitCategory("General");
                        setIsHabitLoading(false);
                        return;
                    }

                    const habitData = snapshot.docs[0].data() as {
                        title?: string;
                        category?: string;
                    };

                    setCurrentHabitId(snapshot.docs[0].id);
                    setHabitTitle(habitData.title?.trim() || "Set up your first habit");
                    setHabitCategory(getHabitCategoryLabel(habitData.category?.trim()));
                    setIsHabitLoading(false);
                },
                () => {
                    setCurrentHabitId(null);
                    setHabitTitle("Set up your first habit");
                    setHabitCategory("General");
                    setIsHabitLoading(false);
                },
            );

            const checkinsQuery = query(
                collection(db, "checkins"),
                where("userId", "==", user.uid),
                limit(60),
            );
            unsubscribeTodayCheckin = onSnapshot(
                checkinsQuery,
                (snapshot) => {
                    const todayKey = getTodayDateKey();
                    const todayCheckin = snapshot.docs
                        .map((docSnapshot) => docSnapshot.data() as { date?: string; status?: CheckInStatus })
                        .find((checkin) => checkin.date === todayKey);

                    setTodayCheckInStatus(todayCheckin?.status ?? null);
                },
                () => {
                    setTodayCheckInStatus(null);
                },
            );
        });

        return () => {
            unsubscribeUserProfile?.();
            unsubscribeHabit?.();
            unsubscribeTodayCheckin?.();
            unsubscribeAuth();
        };
    }, []);

    async function handleCheckIn(status: CheckInStatus) {
        if (!currentUserId) {
            return;
        }

        if (!currentPodId || !currentHabitId) {
            setCheckInFeedback("Set up your pod and habit first.");
            return;
        }

        setIsSavingCheckIn(true);
        setCheckInFeedback(null);

        try {
            const todayKey = getTodayDateKey();
            const existingCheckinsQuery = query(
                collection(db, "checkins"),
                where("userId", "==", currentUserId),
                limit(100),
            );
            const existingCheckinsSnapshot = await getDocs(existingCheckinsQuery);
            const existingTodayCheckin = existingCheckinsSnapshot.docs.find((docSnapshot) => {
                const checkinData = docSnapshot.data() as { date?: string };
                return checkinData.date === todayKey;
            });

            if (existingTodayCheckin) {
                await updateDoc(existingTodayCheckin.ref, {
                    status,
                    podId: currentPodId,
                    habitId: currentHabitId,
                    updatedAt: serverTimestamp(),
                });
            } else {
                const checkinRef = doc(collection(db, "checkins"));
                await setDoc(checkinRef, {
                    id: checkinRef.id,
                    userId: currentUserId,
                    podId: currentPodId,
                    habitId: currentHabitId,
                    date: todayKey,
                    status,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
            }

            setTodayCheckInStatus(status);
            setCheckInFeedback("Check-in saved.");
        } catch {
            setCheckInFeedback("Could not save check-in. Try again.");
        } finally {
            setIsSavingCheckIn(false);
        }
    }

    return (
        <View style={styles.root}>
            <StatusBar style="dark" />
            <SafeAreaView edges={["top"]} style={styles.safeTop}>
                <View style={styles.content}>
                    <View style={styles.topRow}>
                        <Text style={styles.greeting}>{greetingText}</Text>
                        <TouchableOpacity style={styles.bellButton} activeOpacity={0.85}>
                            <Feather name="bell" size={30} color="#5E6A75" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        activeOpacity={isHabitLoading ? 1 : 0.9}
                        onPress={() => {
                            if (!isHabitLoading) {
                                router.push(habitSetupPath);
                            }
                        }}
                    >
                        <LinearGradient
                            colors={["#A8C9B8", "#2F6F6D"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.goalCard}
                        >
                            <Text style={styles.goalTitle}>
                                {isHabitLoading ? "Loading your habit..." : habitTitle}
                            </Text>
                            <Text style={styles.goalMeta}>{goalMetaText}</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <Text style={styles.prompt}>How did today go?</Text>

                    <View style={styles.options}>
                        <CheckInCard
                            title="Done"
                            subtitle="Completed my goal"
                            icon="check-circle"
                            backgroundColor="#7DB38E"
                            selected={todayCheckInStatus === "done"}
                            disabled={isSavingCheckIn}
                            onPress={() => {
                                void handleCheckIn("done");
                            }}
                        />
                        <CheckInCard
                            title="Partial"
                            subtitle="Made some progress"
                            icon="circle"
                            iconDashed
                            backgroundColor="#E0BF78"
                            selected={todayCheckInStatus === "partial"}
                            disabled={isSavingCheckIn}
                            onPress={() => {
                                void handleCheckIn("partial");
                            }}
                        />
                        <CheckInCard
                            title="Missed"
                            subtitle="Not today"
                            icon="circle"
                            backgroundColor="#B6A6CC"
                            selected={todayCheckInStatus === "missed"}
                            disabled={isSavingCheckIn}
                            onPress={() => {
                                void handleCheckIn("missed");
                            }}
                        />
                    </View>

                    {checkInFeedback && (
                        <Text style={styles.checkInFeedback}>{checkInFeedback}</Text>
                    )}
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#F3F1EE",
    },
    safeTop: {
        flex: 1,
    },
    content: {
        flex: 1,
        width: "100%",
        maxWidth: 520,
        alignSelf: "center",
        paddingHorizontal: 22,
        paddingTop: 12,
    },
    topRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    greeting: {
        fontFamily: "Fraunces_600SemiBold",
        color: "#25323E",
        fontSize: 34,
        lineHeight: 46,
    },
    bellButton: {
        width: 52,
        height: 52,
        borderRadius: 999,
        backgroundColor: "#F8F8F8",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 2,
    },
    goalCard: {
        marginTop: 16,
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 22,
        overflow: "hidden",
    },
    goalTitle: {
        color: "#F3F5F2",
        fontFamily: "Fraunces_500Medium",
        fontSize: 22,
        lineHeight: 30,
    },
    goalMeta: {
        marginTop: 10,
        color: "#ECF2EE",
        fontSize: 18,
        fontFamily: "Inter_400Regular",
    },
    prompt: {
        marginTop: 22,
        textAlign: "center",
        color: "#25323E",
        fontFamily: "Fraunces_500Medium",
        fontSize: 24,
    },
    options: {
        marginTop: 16,
        gap: 14,
    },
    optionCard: {
        minHeight: 110,
        borderRadius: 24,
        paddingHorizontal: 18,
        paddingVertical: 18,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
    },
    optionCardSelected: {
        borderWidth: 2,
        borderColor: "#25323E",
    },
    optionCardDisabled: {
        opacity: 0.75,
    },
    optionIconWrap: {
        width: 50,
        alignItems: "center",
        justifyContent: "center",
    },
    optionIconWrapDashed: {
        borderRadius: 999,
        borderWidth: 2,
        borderColor: "#22313D",
        borderStyle: "dashed",
        width: 50,
        height: 50,
    },
    optionTitle: {
        fontSize: 20,
        fontFamily: "Inter_700Bold",
        color: "#22313D",
        marginBottom: 3,
    },
    optionSubtitle: {
        fontSize: 18,
        color: "#364652",
        fontFamily: "Inter_400Regular",
    },
    checkInFeedback: {
        marginTop: 2,
        textAlign: "center",
        color: "#5C6874",
        fontSize: 14,
        lineHeight: 20,
        fontFamily: "Inter_500Medium",
    },
});
