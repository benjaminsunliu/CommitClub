import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { auth, db } from "@/services/firebase";

type CheckInStatus = "done" | "partial" | "missed";
type WeekStatus = CheckInStatus | "pending";

type BasicCheckIn = {
    date: string;
    status: CheckInStatus;
};

type WeekDay = {
    label: string;
    date: Date;
    dateKey: string;
    status: WeekStatus;
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const STATUS_COLORS: Record<WeekStatus, string> = {
    done: "#7EC089",
    partial: "#E9C36F",
    missed: "#BCAAD7",
    pending: "#DDDDDD",
};

function isCheckInStatus(value: unknown): value is CheckInStatus {
    return value === "done" || value === "partial" || value === "missed";
}

function startOfDay(value: Date) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
}

function addDays(value: Date, count: number) {
    const date = new Date(value);
    date.setDate(date.getDate() + count);
    return date;
}

function formatDateKey(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getStartOfWeek(referenceDate: Date) {
    const normalizedReference = startOfDay(referenceDate);
    const currentDay = normalizedReference.getDay();
    const offset = currentDay === 0 ? -6 : 1 - currentDay;

    return addDays(normalizedReference, offset);
}

function buildWeekDays(checkins: BasicCheckIn[], referenceDate: Date): WeekDay[] {
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

function pluralizeDay(count: number) {
    return count === 1 ? "day" : "days";
}

function pluralizeCheckIn(count: number) {
    return count === 1 ? "check-in" : "check-ins";
}

function getHeroMessage(checkInCount: number, missedCount: number) {
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

function getRecoveryInsight(weekDays: WeekDay[], checkInCount: number, missedCount: number) {
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
        return `You bounced back after ${recoveredAfterMisses} missed ${pluralizeDay(recoveredAfterMisses)}. That's what matters most.`;
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

function getPodActiveDays(podCheckins: BasicCheckIn[], weekDays: WeekDay[]) {
    const currentWeekKeys = new Set(weekDays.map((day) => day.dateKey));
    const activeDays = new Set<string>();

    for (const checkin of podCheckins) {
        if (currentWeekKeys.has(checkin.date)) {
            activeDays.add(checkin.date);
        }
    }

    return activeDays.size;
}

function getWeekRangeLabel(weekDays: WeekDay[]) {
    const formatter = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
    });

    const firstDay = weekDays[0];
    const lastDay = weekDays[weekDays.length - 1];

    return `${formatter.format(firstDay.date)} - ${formatter.format(lastDay.date)}`;
}

function createSummaryText({
    weekRangeLabel,
    checkInCount,
    doneCount,
    partialCount,
    missedCount,
    podActiveDays,
    recoveryInsight,
}: {
    weekRangeLabel: string;
    checkInCount: number;
    doneCount: number;
    partialCount: number;
    missedCount: number;
    podActiveDays: number;
    recoveryInsight: string;
}) {
    return [
        `Week of ${weekRangeLabel}`,
        `${checkInCount} ${pluralizeCheckIn(checkInCount)}`,
        `Done: ${doneCount} ${pluralizeDay(doneCount)}`,
        `Partial: ${partialCount} ${pluralizeDay(partialCount)}`,
        `Missed: ${missedCount} ${pluralizeDay(missedCount)}`,
        `Pod active: ${podActiveDays} out of 7 days`,
        recoveryInsight,
    ].join("\n");
}

type LegendRowProps = {
    color: string;
    label: string;
    value: number;
};

function LegendRow({ color, label, value }: LegendRowProps) {
    return (
        <View style={styles.legendRow}>
            <View style={styles.legendLabelWrap}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={styles.legendLabel}>{label}</Text>
            </View>
            <Text style={styles.legendValue}>
                {value} {pluralizeDay(value)}
            </Text>
        </View>
    );
}

export default function ProgressScreen() {
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [podId, setPodId] = useState<string | null>(null);
    const [userCheckins, setUserCheckins] = useState<BasicCheckIn[]>([]);
    const [podCheckins, setPodCheckins] = useState<BasicCheckIn[]>([]);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isPodMembershipLoading, setIsPodMembershipLoading] = useState(true);
    const [isUserCheckinsLoading, setIsUserCheckinsLoading] = useState(true);
    const [isPodCheckinsLoading, setIsPodCheckinsLoading] = useState(true);

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
                setIsPodMembershipLoading(false);
                setIsUserCheckinsLoading(false);
                setIsPodCheckinsLoading(false);
                return;
            }

            setCurrentUserId(user.uid);
            setIsPodMembershipLoading(true);
            setIsUserCheckinsLoading(true);
            setIsPodCheckinsLoading(true);

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

    const weekDays = buildWeekDays(userCheckins, new Date());
    const doneCount = weekDays.filter((day) => day.status === "done").length;
    const partialCount = weekDays.filter((day) => day.status === "partial").length;
    const missedCount = weekDays.filter((day) => day.status === "missed").length;
    const checkInCount = doneCount + partialCount;
    const podActiveDays = getPodActiveDays(podCheckins, weekDays);
    const heroMessage = getHeroMessage(checkInCount, missedCount);
    const recoveryInsight = getRecoveryInsight(weekDays, checkInCount, missedCount);
    const weekRangeLabel = getWeekRangeLabel(weekDays);
    const summaryText = createSummaryText({
        weekRangeLabel,
        checkInCount,
        doneCount,
        partialCount,
        missedCount,
        podActiveDays,
        recoveryInsight,
    });

    const isLoading =
        !isAuthReady ||
        isPodMembershipLoading ||
        isUserCheckinsLoading ||
        isPodCheckinsLoading;

    async function handleShareWeeklySummary() {
        try {
            await Share.share({
                message: summaryText,
            });
        } catch {
            Alert.alert("Could not open the share sheet right now.");
        }
    }

    function handleViewWeeklySummary() {
        if (isLoading) {
            return;
        }

        Alert.alert("Weekly summary", summaryText, [
            {
                text: "Close",
                style: "cancel",
            },
            {
                text: "Share",
                onPress: () => {
                    void handleShareWeeklySummary();
                },
            },
        ]);
    }

    return (
        <SafeAreaView style={styles.root} edges={["top"]}>
            <StatusBar style="dark" />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.content}>
                    <Text style={styles.pageTitle}>Your progress</Text>

                    <LinearGradient
                        colors={["#3E7E79", "#ABCDB9"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroCard}
                    >
                        <View style={styles.heroHeader}>
                            <Feather name="trending-up" size={28} color="#F7FAF8" />
                            <Text style={styles.heroLabel}>This week</Text>
                        </View>
                        <Text
                            style={styles.heroValue}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.72}
                        >
                            {isLoading ? "Loading..." : `${checkInCount} ${pluralizeCheckIn(checkInCount)}`}
                        </Text>
                        <Text style={styles.heroSubtitle}>
                            {isLoading ? "Pulling in your latest check-ins" : heroMessage}
                        </Text>
                    </LinearGradient>

                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Recent activity</Text>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.iconButton,
                                    pressed && styles.iconButtonPressed,
                                ]}
                                onPress={handleViewWeeklySummary}
                                disabled={isLoading}
                            >
                                <Feather name="calendar" size={26} color="#5E6A75" />
                            </Pressable>
                        </View>

                        <View style={styles.activityRow}>
                            {weekDays.map((day) => (
                                <View key={day.dateKey} style={styles.activityDay}>
                                    <Text style={styles.activityDayLabel}>{day.label}</Text>
                                    <View
                                        style={[
                                            styles.activityDot,
                                            { backgroundColor: STATUS_COLORS[day.status] },
                                        ]}
                                    />
                                </View>
                            ))}
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.legendList}>
                            <LegendRow color={STATUS_COLORS.done} label="Done" value={doneCount} />
                            <LegendRow
                                color={STATUS_COLORS.partial}
                                label="Partial"
                                value={partialCount}
                            />
                            <LegendRow
                                color={STATUS_COLORS.missed}
                                label="Missed"
                                value={missedCount}
                            />
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Recovery insight</Text>
                        <Text style={styles.cardBody}>
                            {isLoading ? "Looking at your recent pattern..." : recoveryInsight}
                        </Text>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Pod consistency</Text>
                        <Text style={styles.cardBody}>
                            {isLoading ? (
                                "Pulling in your pod activity..."
                            ) : (
                                <>
                                    Your pod stayed active{" "}
                                    <Text style={styles.cardHighlight}>
                                        {podActiveDays} out of 7 days
                                    </Text>{" "}
                                    this week.
                                </>
                            )}
                        </Text>
                        <Text style={styles.cardFooter}>Small circles, big support.</Text>
                    </View>

                    <AppButton
                        label="View weekly summary"
                        onPress={handleViewWeeklySummary}
                        disabled={isLoading}
                        style={styles.summaryButton}
                        textStyle={styles.summaryButtonText}
                    />
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
        paddingBottom: 132,
    },
    content: {
        width: "100%",
        maxWidth: 520,
        alignSelf: "center",
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    pageTitle: {
        color: "#25323E",
        fontSize: 36,
        lineHeight: 43,
        fontFamily: "Fraunces_600SemiBold",
    },
    heroCard: {
        marginTop: 20,
        borderRadius: 28,
        paddingHorizontal: 22,
        paddingVertical: 22,
    },
    heroHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    heroLabel: {
        color: "#F7FAF8",
        fontSize: 21,
        lineHeight: 28,
        fontFamily: "Fraunces_600SemiBold",
    },
    heroValue: {
        marginTop: 18,
        color: "#FBFDFC",
        fontSize: 48,
        lineHeight: 52,
        fontFamily: "Inter_400Regular",
    },
    heroSubtitle: {
        marginTop: 8,
        color: "#F2F7F4",
        fontSize: 17,
        lineHeight: 24,
        fontFamily: "Inter_500Medium",
    },
    card: {
        marginTop: 20,
        borderRadius: 28,
        paddingHorizontal: 22,
        paddingVertical: 22,
        backgroundColor: "#FBFAF9",
        shadowColor: "#22313D",
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.04,
        shadowRadius: 18,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    cardTitle: {
        color: "#25323E",
        fontSize: 23,
        lineHeight: 30,
        fontFamily: "Fraunces_600SemiBold",
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    iconButtonPressed: {
        opacity: 0.7,
    },
    activityRow: {
        marginTop: 22,
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 6,
    },
    activityDay: {
        flex: 1,
        alignItems: "center",
    },
    activityDayLabel: {
        color: "#5C6874",
        fontSize: 14,
        lineHeight: 20,
        fontFamily: "Inter_500Medium",
    },
    activityDot: {
        width: 38,
        height: 38,
        borderRadius: 999,
        marginTop: 12,
    },
    divider: {
        height: 1,
        marginTop: 24,
        backgroundColor: "#E0E3E6",
    },
    legendList: {
        marginTop: 20,
        gap: 16,
    },
    legendRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    legendLabelWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 999,
    },
    legendLabel: {
        color: "#5C6874",
        fontSize: 17,
        lineHeight: 23,
        fontFamily: "Inter_500Medium",
    },
    legendValue: {
        color: "#25323E",
        fontSize: 17,
        lineHeight: 23,
        fontFamily: "Inter_600SemiBold",
    },
    cardBody: {
        marginTop: 16,
        color: "#5C6874",
        fontSize: 17,
        lineHeight: 28,
        fontFamily: "Inter_400Regular",
    },
    cardHighlight: {
        color: "#2E7876",
        fontFamily: "Inter_600SemiBold",
    },
    cardFooter: {
        marginTop: 18,
        color: "#5C6874",
        fontSize: 17,
        lineHeight: 24,
        fontFamily: "Inter_500Medium",
    },
    summaryButton: {
        marginTop: 24,
        height: 64,
        backgroundColor: "#A8CBB8",
    },
    summaryButtonText: {
        color: "#25323E",
        fontFamily: "Inter_600SemiBold",
        fontSize: 17,
    },
});
