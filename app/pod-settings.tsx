import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "@/services/firebase";
import { leaveCurrentPod } from "@/services/podService";
import {
    defaultReminderPreferences,
    normalizeReminderPreferences,
    ReminderPreferences,
    updateCurrentUserReminderPreferences,
} from "@/services/userSettingsService";

const podPath = "/(tabs)/pod" as const;
const podSetupPath = "/pod-setup" as const;

type TimestampLike = {
    toDate: () => Date;
};

type SecondsTimestampLike = {
    seconds: number;
    nanoseconds?: number;
};

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
        typeof (value as TimestampLike).toDate === "function"
    ) {
        return (value as TimestampLike).toDate();
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

function formatCreatedOnText(date: Date | null) {
    if (!date) {
        return "Created recently";
    }

    return `Created on ${date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    })}`;
}

export default function PodSettingsScreen() {
    const [podId, setPodId] = useState<string | null>(null);
    const [podName, setPodName] = useState("Your Pod");
    const [podInviteCode, setPodInviteCode] = useState("------");
    const [podCreatedAt, setPodCreatedAt] = useState<Date | null>(null);
    const [preferences, setPreferences] = useState<ReminderPreferences>(
        defaultReminderPreferences,
    );
    const [isSavingNotifications, setIsSavingNotifications] = useState(false);
    const [isLeaveConfirmationVisible, setIsLeaveConfirmationVisible] = useState(false);
    const [isLeavingPod, setIsLeavingPod] = useState(false);
    const [settingsError, setSettingsError] = useState<string | null>(null);
    const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
    const [leaveError, setLeaveError] = useState<string | null>(null);

    useEffect(() => {
        let unsubscribeUserDoc: (() => void) | undefined;

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            unsubscribeUserDoc?.();

            if (!user) {
                setPodId(null);
                setPreferences(defaultReminderPreferences);
                return;
            }

            const userRef = doc(db, "users", user.uid);
            unsubscribeUserDoc = onSnapshot(
                userRef,
                (snapshot) => {
                    const data = snapshot.data() as
                        | {
                              podId?: string | null;
                              reminders?: unknown;
                          }
                        | undefined;

                    setPodId(data?.podId ?? null);
                    setPreferences(normalizeReminderPreferences(data?.reminders));
                },
                () => {
                    setPodId(null);
                    setPreferences(defaultReminderPreferences);
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
            setPodName("Your Pod");
            setPodInviteCode("------");
            setPodCreatedAt(null);
            return;
        }

        const podRef = doc(db, "pods", podId);
        const unsubscribePod = onSnapshot(
            podRef,
            (snapshot) => {
                if (!snapshot.exists()) {
                    setPodName("Your Pod");
                    setPodInviteCode("------");
                    setPodCreatedAt(null);
                    return;
                }

                const data = snapshot.data() as {
                    name?: string;
                    inviteCode?: string;
                    createdAt?: unknown;
                };

                setPodName(data.name?.trim() || "Your Pod");
                setPodInviteCode(data.inviteCode?.trim().toUpperCase() || "------");
                setPodCreatedAt(toDate(data.createdAt));
            },
            () => {
                setPodName("Your Pod");
                setPodInviteCode("------");
                setPodCreatedAt(null);
            },
        );

        return () => {
            unsubscribePod();
        };
    }, [podId]);

    function handleBack() {
        if (router.canGoBack()) {
            router.back();
            return;
        }

        router.replace(podPath);
    }

    async function handleTogglePodNotifications(value: boolean) {
        if (isSavingNotifications) {
            return;
        }

        const previousPreferences = preferences;
        const nextPreferences = {
            ...preferences,
            podSupportEnabled: value,
        };

        setPreferences(nextPreferences);
        setSettingsError(null);
        setSettingsSuccess(null);
        setIsSavingNotifications(true);

        try {
            await updateCurrentUserReminderPreferences(nextPreferences);
            setSettingsSuccess(
                value ? "Pod notifications are on." : "Pod notifications are muted.",
            );
        } catch (error) {
            setPreferences(previousPreferences);
            setSettingsError(
                error instanceof Error
                    ? error.message
                    : "Could not update pod notifications. Please try again.",
            );
        } finally {
            setIsSavingNotifications(false);
        }
    }

    function handleOpenLeaveConfirmation() {
        setLeaveError(null);
        setIsLeaveConfirmationVisible(true);
    }

    function handleCloseLeaveConfirmation() {
        if (isLeavingPod) {
            return;
        }

        setIsLeaveConfirmationVisible(false);
    }

    async function handleConfirmLeavePod() {
        if (isLeavingPod) {
            return;
        }

        setLeaveError(null);
        setIsLeavingPod(true);

        try {
            await leaveCurrentPod();
            setIsLeaveConfirmationVisible(false);
            router.replace(podSetupPath);
        } catch (error) {
            setLeaveError(
                error instanceof Error
                    ? error.message
                    : "Could not leave the pod right now. Please try again.",
            );
        } finally {
            setIsLeavingPod(false);
        }
    }

    return (
        <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
            <StatusBar style="dark" />
            <Modal
                transparent
                animationType="fade"
                visible={isLeaveConfirmationVisible}
                onRequestClose={handleCloseLeaveConfirmation}
            >
                <View style={styles.modalOverlay}>
                    <Pressable
                        style={StyleSheet.absoluteFillObject}
                        onPress={handleCloseLeaveConfirmation}
                        disabled={isLeavingPod}
                    />

                    <View style={styles.modalCard}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={styles.modalTitle}>Leave {podName}?</Text>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.modalCloseButton,
                                    pressed && !isLeavingPod && styles.modalCloseButtonPressed,
                                ]}
                                onPress={handleCloseLeaveConfirmation}
                                disabled={isLeavingPod}
                            >
                                <Feather name="x" size={28} color="#25323E" />
                            </Pressable>
                        </View>

                        <Text style={styles.modalBody}>
                            You&apos;ll lose access to this pod&apos;s activity, check-ins, and
                            support messages.
                        </Text>

                        <View style={styles.modalNoteCard}>
                            <Text style={styles.modalNoteTitle}>
                                Consider these options first:
                            </Text>
                            <Text style={styles.modalNoteBody}>
                                • Mute notifications to take a break from updates
                            </Text>
                            <Text style={styles.modalNoteBody}>
                                • Keep your progress and rejoin when you&apos;re ready
                            </Text>
                        </View>

                        <Pressable
                            style={({ pressed }) => [
                                styles.confirmLeaveButton,
                                pressed && !isLeavingPod && styles.confirmLeaveButtonPressed,
                                isLeavingPod && styles.confirmLeaveButtonDisabled,
                            ]}
                            onPress={handleConfirmLeavePod}
                            disabled={isLeavingPod}
                        >
                            {isLeavingPod ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.confirmLeaveButtonText}>
                                    Yes, leave pod
                                </Text>
                            )}
                        </Pressable>

                        <Pressable
                            style={({ pressed }) => [
                                styles.stayButton,
                                pressed && !isLeavingPod && styles.stayButtonPressed,
                                isLeavingPod && styles.stayButtonDisabled,
                            ]}
                            onPress={handleCloseLeaveConfirmation}
                            disabled={isLeavingPod}
                        >
                            <Text style={styles.stayButtonText}>Stay in pod</Text>
                        </Pressable>

                        <Text style={styles.modalFootnote}>
                            After leaving, you can create or join another pod anytime.
                        </Text>
                    </View>
                </View>
            </Modal>

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
                            onPress={handleBack}
                        >
                            <Feather name="arrow-left" size={30} color="#25323E" />
                        </Pressable>
                        <Text style={styles.pageTitle}>Pod Settings</Text>
                    </View>

                    <View style={styles.detailsCard}>
                        <Text style={styles.podName}>{podName}</Text>
                        <Text style={styles.createdOnText}>
                            {formatCreatedOnText(podCreatedAt)}
                        </Text>

                        <View style={styles.detailsRow}>
                            <Text style={styles.detailsLabel}>Pod code</Text>

                            <View style={styles.codePill}>
                                <Text style={styles.codeText}>{podInviteCode}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.notificationCard}>
                        <View style={styles.notificationIconWrap}>
                            <Feather name="bell" size={26} color="#3E8885" />
                        </View>

                        <View style={styles.notificationTextWrap}>
                            <Text style={styles.notificationTitle}>Notifications active</Text>
                            <Text style={styles.notificationBody}>
                                Get updates from your pod
                            </Text>
                        </View>

                        <Switch
                            value={preferences.podSupportEnabled}
                            onValueChange={handleTogglePodNotifications}
                            disabled={isSavingNotifications}
                            trackColor={{ false: "#D7DDDA", true: "#3E8885" }}
                            thumbColor="#FFFFFF"
                        />
                    </View>

                    <View style={styles.breakCard}>
                        <Text style={styles.breakTitle}>Need a break?</Text>
                        <Text style={styles.breakBody}>
                            If you&apos;re feeling overwhelmed, try muting notifications first.
                            You can still check in and see pod updates whenever you&apos;re ready.
                        </Text>
                    </View>

                    {isSavingNotifications ? (
                        <Text style={styles.metaText}>Updating your pod notification setting...</Text>
                    ) : null}
                    {settingsError ? <Text style={styles.errorText}>{settingsError}</Text> : null}
                    {settingsSuccess ? (
                        <Text style={styles.successText}>{settingsSuccess}</Text>
                    ) : null}

                    <Pressable
                        style={({ pressed }) => [
                            styles.leaveButton,
                            pressed && podId && styles.leaveButtonPressed,
                            (!podId || isLeavingPod) && styles.leaveButtonDisabled,
                        ]}
                        onPress={handleOpenLeaveConfirmation}
                        disabled={!podId || isLeavingPod}
                    >
                        <Feather name="log-out" size={22} color="#5C6874" />
                        <Text style={styles.leaveButtonText}>Leave pod</Text>
                    </Pressable>

                    {leaveError ? <Text style={styles.errorText}>{leaveError}</Text> : null}
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
        paddingBottom: 28,
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
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: "#FBFAF9",
        alignItems: "center",
        justifyContent: "center",
    },
    backButtonPressed: {
        opacity: 0.74,
    },
    pageTitle: {
        color: "#25323E",
        fontSize: 34,
        lineHeight: 40,
        fontFamily: "Fraunces_600SemiBold",
    },
    detailsCard: {
        marginTop: 18,
        borderRadius: 28,
        backgroundColor: "#FBFAF9",
        paddingHorizontal: 18,
        paddingVertical: 22,
    },
    podName: {
        color: "#25323E",
        fontSize: 30,
        lineHeight: 36,
        fontFamily: "Fraunces_600SemiBold",
    },
    createdOnText: {
        marginTop: 10,
        color: "#5C6874",
        fontSize: 16,
        lineHeight: 22,
        fontFamily: "Inter_400Regular",
    },
    detailsRow: {
        marginTop: 26,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    detailsLabel: {
        color: "#5C6874",
        fontSize: 17,
        lineHeight: 22,
        fontFamily: "Inter_400Regular",
    },
    codePill: {
        minWidth: 148,
        minHeight: 58,
        borderRadius: 20,
        backgroundColor: "#F1EEE7",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 20,
    },
    codeText: {
        color: "#2E7876",
        fontSize: 18,
        lineHeight: 22,
        letterSpacing: 1.3,
        fontFamily: "Inter_600SemiBold",
    },
    notificationCard: {
        marginTop: 18,
        borderRadius: 28,
        backgroundColor: "#FBFAF9",
        paddingHorizontal: 18,
        paddingVertical: 20,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
    },
    notificationIconWrap: {
        width: 46,
        alignItems: "center",
        justifyContent: "center",
    },
    notificationTextWrap: {
        flex: 1,
    },
    notificationTitle: {
        color: "#25323E",
        fontSize: 20,
        lineHeight: 26,
        fontFamily: "Fraunces_500Medium",
    },
    notificationBody: {
        marginTop: 6,
        color: "#5C6874",
        fontSize: 16,
        lineHeight: 22,
        fontFamily: "Inter_400Regular",
    },
    breakCard: {
        marginTop: 18,
        borderRadius: 28,
        backgroundColor: "#E6F1F0",
        paddingHorizontal: 18,
        paddingVertical: 20,
    },
    breakTitle: {
        color: "#25323E",
        fontSize: 21,
        lineHeight: 27,
        fontFamily: "Fraunces_500Medium",
    },
    breakBody: {
        marginTop: 10,
        color: "#5C6874",
        fontSize: 16,
        lineHeight: 28,
        fontFamily: "Inter_400Regular",
    },
    metaText: {
        marginTop: 14,
        color: "#5C6874",
        fontSize: 14,
        lineHeight: 20,
        fontFamily: "Inter_500Medium",
    },
    errorText: {
        marginTop: 14,
        color: "#B23A3A",
        fontSize: 14,
        lineHeight: 20,
        fontFamily: "Inter_500Medium",
    },
    successText: {
        marginTop: 14,
        color: "#2E7876",
        fontSize: 14,
        lineHeight: 20,
        fontFamily: "Inter_500Medium",
    },
    leaveButton: {
        marginTop: 28,
        minHeight: 72,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: "#CAD0D3",
        backgroundColor: "#FBFAF9",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        paddingHorizontal: 20,
    },
    leaveButtonPressed: {
        opacity: 0.82,
    },
    leaveButtonDisabled: {
        opacity: 0.62,
    },
    leaveButtonText: {
        color: "#5C6874",
        fontSize: 17,
        lineHeight: 22,
        fontFamily: "Inter_600SemiBold",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(37, 50, 62, 0.48)",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 18,
    },
    modalCard: {
        width: "100%",
        maxWidth: 520,
        borderRadius: 34,
        backgroundColor: "#FBFAF9",
        paddingHorizontal: 18,
        paddingTop: 18,
        paddingBottom: 20,
        shadowColor: "#22313D",
        shadowOffset: {
            width: 0,
            height: 12,
        },
        shadowOpacity: 0.16,
        shadowRadius: 24,
        elevation: 10,
    },
    modalHeaderRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
    },
    modalTitle: {
        flex: 1,
        color: "#25323E",
        fontSize: 30,
        lineHeight: 36,
        fontFamily: "Fraunces_600SemiBold",
    },
    modalCloseButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: "#F1EEE7",
        alignItems: "center",
        justifyContent: "center",
    },
    modalCloseButtonPressed: {
        opacity: 0.8,
    },
    modalBody: {
        marginTop: 12,
        color: "#5C6874",
        fontSize: 16,
        lineHeight: 28,
        fontFamily: "Inter_400Regular",
    },
    modalNoteCard: {
        marginTop: 20,
        borderRadius: 24,
        backgroundColor: "#E6F1F0",
        paddingHorizontal: 18,
        paddingVertical: 18,
    },
    modalNoteTitle: {
        color: "#25323E",
        fontSize: 20,
        lineHeight: 26,
        fontFamily: "Fraunces_500Medium",
    },
    modalNoteBody: {
        marginTop: 10,
        color: "#5C6874",
        fontSize: 16,
        lineHeight: 24,
        fontFamily: "Inter_400Regular",
    },
    confirmLeaveButton: {
        marginTop: 22,
        minHeight: 72,
        borderRadius: 999,
        backgroundColor: "#3E8885",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 20,
    },
    confirmLeaveButtonPressed: {
        opacity: 0.86,
    },
    confirmLeaveButtonDisabled: {
        opacity: 0.74,
    },
    confirmLeaveButtonText: {
        color: "#FFFFFF",
        fontSize: 17,
        lineHeight: 22,
        fontFamily: "Inter_600SemiBold",
    },
    stayButton: {
        marginTop: 12,
        minHeight: 72,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: "#3E8885",
        backgroundColor: "#FBFAF9",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 20,
    },
    stayButtonPressed: {
        opacity: 0.82,
    },
    stayButtonDisabled: {
        opacity: 0.62,
    },
    stayButtonText: {
        color: "#3E8885",
        fontSize: 17,
        lineHeight: 22,
        fontFamily: "Inter_600SemiBold",
    },
    modalFootnote: {
        marginTop: 18,
        color: "#5C6874",
        fontSize: 14,
        lineHeight: 20,
        fontFamily: "Inter_400Regular",
        textAlign: "center",
    },
});
