import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged } from "firebase/auth";
import {
    addDoc,
    collection,
    doc,
    documentId,
    limit,
    onSnapshot,
    query,
    serverTimestamp,
    where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Clipboard,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "@/services/firebase";

const MAX_POD_MEMBERS = 4;
const supportiveMessages = [
    "💚 You got this",
    "👏 Keep going",
    "🌟 Proud of you",
    "🫶 We are with you",
    "🔥 Great momentum",
];

type PodMember = {
    id: string;
    name: string;
    initial: string;
};

type SupportEntry = {
    id: string;
    senderName: string;
    message: string;
    createdAt: Date | null;
};

type TimestampLike = {
    toDate: () => Date;
};

type SecondsTimestampLike = {
    seconds: number;
    nanoseconds?: number;
};

function getTodayDateKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
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

function getInitialFromName(name: string) {
    return name.trim().charAt(0).toUpperCase() || "M";
}

function pickRandomSupportiveMessage() {
    const index = Math.floor(Math.random() * supportiveMessages.length);
    return supportiveMessages[index];
}

export default function PodScreen() {
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentUserName, setCurrentUserName] = useState("Member");
    const [podId, setPodId] = useState<string | null>(null);

    const [podName, setPodName] = useState("Your Pod");
    const [podInviteCode, setPodInviteCode] = useState("------");
    const [memberIds, setMemberIds] = useState<string[]>([]);
    const [members, setMembers] = useState<PodMember[]>([]);
    const [checkedInTodayCount, setCheckedInTodayCount] = useState(0);
    const [recentSupports, setRecentSupports] = useState<SupportEntry[]>([]);

    const [isSendingSupport, setIsSendingSupport] = useState(false);
    const [sendSupportFeedback, setSendSupportFeedback] = useState<string | null>(null);
    const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);

    const memberCount = memberIds.length;
    const displayedMembers =
        members.length > 0
            ? members
            : podId && currentUserId
                ? [
                    {
                        id: currentUserId,
                        name: currentUserName,
                        initial: getInitialFromName(currentUserName),
                    },
                ]
                : [];

    useEffect(() => {
        let unsubscribeUserDoc: (() => void) | undefined;

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            unsubscribeUserDoc?.();

            if (!user) {
                setCurrentUserId(null);
                setCurrentUserName("Member");
                setPodId(null);
                return;
            }

            const fallbackName =
                user.displayName?.trim() ||
                user.email?.split("@")[0]?.trim() ||
                "Member";

            setCurrentUserId(user.uid);
            setCurrentUserName(fallbackName);

            const userRef = doc(db, "users", user.uid);
            unsubscribeUserDoc = onSnapshot(
                userRef,
                (snapshot) => {
                    const data = snapshot.data() as
                        | { name?: string; podId?: string | null }
                        | undefined;

                    setCurrentUserName(data?.name?.trim() || fallbackName);
                    setPodId(data?.podId ?? null);
                },
                () => {
                    setCurrentUserName(fallbackName);
                    setPodId(null);
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
            setMemberIds([]);
            setCheckedInTodayCount(0);
            setRecentSupports([]);
            return;
        }

        const podRef = doc(db, "pods", podId);
        const unsubscribePod = onSnapshot(
            podRef,
            (snapshot) => {
                if (!snapshot.exists()) {
                    setPodName("Your Pod");
                    setMemberIds([]);
                    return;
                }

                const data = snapshot.data() as {
                    name?: string;
                    inviteCode?: string;
                    memberIds?: string[];
                };

                setPodName(data.name?.trim() || "Your Pod");
                setPodInviteCode(data.inviteCode?.trim().toUpperCase() || "------");
                setMemberIds(Array.isArray(data.memberIds) ? data.memberIds : []);
            },
            () => {
                setPodName("Your Pod");
                setPodInviteCode("------");
                setMemberIds([]);
            },
        );

        return () => {
            unsubscribePod();
        };
    }, [podId]);

    useEffect(() => {
        if (!memberIds.length) {
            setMembers([]);
            return;
        }

        const queryIds = memberIds.slice(0, 10);
        const membersQuery = query(
            collection(db, "users"),
            where(documentId(), "in", queryIds),
        );

        const unsubscribeMembers = onSnapshot(
            membersQuery,
            (snapshot) => {
                const byId = new Map(
                    snapshot.docs.map((docSnapshot) => {
                        const data = docSnapshot.data() as { name?: string };
                        return [docSnapshot.id, data.name?.trim() || "Member"] as const;
                    }),
                );

                const orderedMembers = memberIds.map((id) => {
                    const name = byId.get(id) || "Member";

                    return {
                        id,
                        name,
                        initial: getInitialFromName(name),
                    };
                });

                setMembers(orderedMembers);
            },
            () => {
                const fallbackMembers = memberIds.map((id) => ({
                    id,
                    name: "Member",
                    initial: "M",
                }));
                setMembers(fallbackMembers);
            },
        );

        return () => {
            unsubscribeMembers();
        };
    }, [memberIds]);

    useEffect(() => {
        if (!podId) {
            setCheckedInTodayCount(0);
            return;
        }

        const todayDateKey = getTodayDateKey();
        const checkinsQuery = query(
            collection(db, "checkins"),
            where("podId", "==", podId),
            limit(300),
        );

        const unsubscribeCheckins = onSnapshot(
            checkinsQuery,
            (snapshot) => {
                const checkedInUserIds = new Set(
                    snapshot.docs
                        .map((checkinDoc) => checkinDoc.data() as { userId?: string; date?: string })
                        .filter((checkin) => checkin.date === todayDateKey && checkin.userId)
                        .map((checkin) => checkin.userId as string),
                );
                setCheckedInTodayCount(checkedInUserIds.size);
            },
            () => {
                setCheckedInTodayCount(0);
            },
        );

        return () => {
            unsubscribeCheckins();
        };
    }, [podId]);

    useEffect(() => {
        if (!podId) {
            setRecentSupports([]);
            return;
        }

        const supportQuery = query(
            collection(db, "podSupport"),
            where("podId", "==", podId),
            limit(30),
        );

        const unsubscribeSupport = onSnapshot(
            supportQuery,
            (snapshot) => {
                if (snapshot.empty) {
                    setRecentSupports([]);
                    return;
                }

                const entries = snapshot.docs
                    .map((supportDoc) => {
                        const data = supportDoc.data() as {
                            fromName?: string;
                            message?: string;
                            createdAt?: unknown;
                        };

                        const createdAt = toDate(data.createdAt);
                        const hasPendingWrite = supportDoc.metadata.hasPendingWrites;
                        const sortTimeMs = createdAt?.getTime() ?? (hasPendingWrite ? Date.now() : 0);

                        return {
                            id: supportDoc.id,
                            senderName: data.fromName?.trim() || "Pod mate",
                            message: data.message?.trim() || "💚 You got this",
                            createdAt,
                            sortTimeMs,
                        };
                    })
                    .sort((a, b) => b.sortTimeMs - a.sortTimeMs)
                    .slice(0, 3)
                    .map(({ id, senderName, message, createdAt }) => ({
                        id,
                        senderName,
                        message,
                        createdAt,
                    }));

                setRecentSupports(entries);
            },
            () => {
                setRecentSupports([]);
            },
        );

        return () => {
            unsubscribeSupport();
        };
    }, [podId]);

    async function handleSendSupportReaction() {
        if (!podId || !currentUserId) {
            setSendSupportFeedback("Join a pod first.");
            return;
        }

        setIsSendingSupport(true);
        setSendSupportFeedback(null);

        try {
            await addDoc(collection(db, "podSupport"), {
                podId,
                fromUserId: currentUserId,
                fromName: currentUserName,
                message: pickRandomSupportiveMessage(),
                createdAt: serverTimestamp(),
            });

            setSendSupportFeedback("Sent to your pod.");
        } catch {
            setSendSupportFeedback("Could not send right now. Try again.");
        } finally {
            setIsSendingSupport(false);
        }
    }

    async function handleShareInviteCode() {
        if (!podId || !podInviteCode || podInviteCode === "------") {
            return;
        }

        try {
            await Share.share({
                message: `Join my CommitClub pod "${podName}" with invite code: ${podInviteCode}`,
            });
        } catch {
            // User cancelled or share failed; no-op keeps the flow lightweight.
        }
    }

    async function handleCopyInviteCode() {
        if (!podId || !podInviteCode || podInviteCode === "------") {
            return;
        }

        try {
            Clipboard.setString(podInviteCode);
            setInviteFeedback("Code copied");
        } catch {
            setInviteFeedback("Could not copy right now");
        }
    }

    const canSendSupport = Boolean(podId) && !isSendingSupport;

    return (
        <SafeAreaView style={styles.root} edges={["top"]}>
            <StatusBar style="dark" />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.panel}>
                    <Text style={styles.podTitle}>{podName}</Text>

                    <View style={styles.membersCard}>
                        <View style={styles.membersHeadingRow}>
                            <Text style={styles.membersHeading}>Pod members</Text>
                            <Text style={styles.membersCount}>
                                {memberCount}/{MAX_POD_MEMBERS}
                            </Text>
                        </View>

                        <View style={styles.membersRow}>
                            {displayedMembers.map((member, index) => (
                                <View
                                    key={member.id}
                                    style={[
                                        styles.memberBubble,
                                        index > 0 && styles.memberBubbleOverlap,
                                    ]}
                                >
                                    <Text style={styles.memberBubbleText}>{member.initial}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    <LinearGradient
                        colors={["#3E8885", "#A8C9B8"]}
                        start={{ x: 0, y: 1 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.energyCard}
                    >
                        <Text style={styles.energyTitle}>Today&apos;s pod energy</Text>
                        <Text style={styles.energyCount}>
                            {checkedInTodayCount} of {memberCount || MAX_POD_MEMBERS}
                        </Text>
                        <Text style={styles.energySubtitle}>checked in today</Text>
                    </LinearGradient>

                    <View style={styles.supportCard}>
                        <Text style={styles.supportHeading}>Recent support</Text>

                        {recentSupports.length > 0 ? (
                            <View style={styles.supportFeed}>
                                {recentSupports.map((entry) => {
                                    const supportInitial = getInitialFromName(entry.senderName);
                                    const supportTime = getRelativeTimeText(entry.createdAt);

                                    return (
                                        <View key={entry.id} style={styles.supportRow}>
                                            <View style={styles.supportAvatar}>
                                                <Text style={styles.supportAvatarText}>{supportInitial}</Text>
                                            </View>

                                            <View style={styles.supportContent}>
                                                <View style={styles.supportMetaRow}>
                                                    <Text style={styles.supportName}>{entry.senderName}</Text>
                                                    <Text style={styles.supportTime}>{supportTime}</Text>
                                                </View>
                                                <View style={styles.supportMessagePill}>
                                                    <Text style={styles.supportMessage}>{entry.message}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        ) : (
                            <Text style={styles.emptySupportText}>
                                No support yet today. Send one to boost the pod.
                            </Text>
                        )}
                    </View>

                    <Pressable
                        style={({ pressed }) => [
                            styles.sendSupportButton,
                            pressed && canSendSupport && styles.sendSupportButtonPressed,
                            !canSendSupport && styles.sendSupportButtonDisabled,
                        ]}
                        onPress={handleSendSupportReaction}
                        disabled={!canSendSupport}
                    >
                        {isSendingSupport ? (
                            <ActivityIndicator size="small" color="#23323D" />
                        ) : (
                            <Text style={styles.sendSupportButtonText}>Send supportive reaction</Text>
                        )}
                    </Pressable>

                    {sendSupportFeedback && (
                        <Text style={styles.sendSupportFeedback}>{sendSupportFeedback}</Text>
                    )}

                    <View style={styles.inviteCard}>
                        <Text style={styles.inviteHeading}>Invite friends</Text>

                        <View style={styles.inviteRow}>
                            <View style={styles.inviteCodePill}>
                                <Text style={styles.inviteCodeText}>{podInviteCode}</Text>
                            </View>

                            <Pressable
                                style={({ pressed }) => [
                                    styles.inviteActionButton,
                                    pressed && styles.inviteActionButtonPressed,
                                ]}
                                onPress={handleCopyInviteCode}
                                disabled={!podId || podInviteCode === "------"}
                            >
                                <Feather name="copy" size={23} color="#25323E" />
                            </Pressable>

                            <Pressable
                                style={({ pressed }) => [
                                    styles.inviteActionButton,
                                    pressed && styles.inviteActionButtonPressed,
                                ]}
                                onPress={handleShareInviteCode}
                                disabled={!podId || podInviteCode === "------"}
                            >
                                <Feather name="share-2" size={24} color="#25323E" />
                            </Pressable>
                        </View>

                        {inviteFeedback && (
                            <Text style={styles.inviteFeedback}>{inviteFeedback}</Text>
                        )}
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
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 18,
    },
    panel: {
        width: "100%",
        maxWidth: 520,
        alignSelf: "center",
        gap: 14,
    },
    podTitle: {
        color: "#25323E",
        fontFamily: "Fraunces_600SemiBold",
        fontSize: 28,
        lineHeight: 34,
    },
    membersCard: {
        borderRadius: 24,
        backgroundColor: "#F8F8F8",
        borderWidth: 1,
        borderColor: "#E5E7E9",
        paddingHorizontal: 20,
        paddingVertical: 18,
    },
    membersHeadingRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    membersHeading: {
        color: "#25323E",
        fontFamily: "Fraunces_500Medium",
        fontSize: 19,
        lineHeight: 24,
    },
    membersCount: {
        color: "#5C6874",
        fontFamily: "Inter_500Medium",
        fontSize: 16,
        lineHeight: 20,
    },
    membersRow: {
        marginTop: 12,
        flexDirection: "row",
        alignItems: "center",
        minHeight: 58,
    },
    memberBubble: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: "#A8C9B8",
        borderWidth: 2,
        borderColor: "#F8F8F8",
        alignItems: "center",
        justifyContent: "center",
    },
    memberBubbleOverlap: {
        marginLeft: -10,
    },
    memberBubbleText: {
        color: "#25323E",
        fontFamily: "Inter_500Medium",
        fontSize: 16,
        lineHeight: 20,
    },
    energyCard: {
        borderRadius: 26,
        paddingHorizontal: 22,
        paddingVertical: 20,
    },
    energyTitle: {
        color: "#F2F4F2",
        fontFamily: "Fraunces_500Medium",
        fontSize: 20,
        lineHeight: 25,
    },
    energyCount: {
        marginTop: 8,
        color: "#F2F4F2",
        fontFamily: "Fraunces_500Medium",
        fontSize: 52,
        lineHeight: 58,
    },
    energySubtitle: {
        marginTop: 0,
        color: "#EEF3F0",
        fontFamily: "Inter_400Regular",
        fontSize: 14,
        lineHeight: 19,
    },
    supportCard: {
        borderRadius: 24,
        backgroundColor: "#F8F8F8",
        borderWidth: 1,
        borderColor: "#E5E7E9",
        paddingHorizontal: 20,
        paddingVertical: 18,
    },
    supportHeading: {
        color: "#25323E",
        fontFamily: "Fraunces_500Medium",
        fontSize: 19,
        lineHeight: 24,
    },
    supportFeed: {
        marginTop: 12,
        gap: 10,
    },
    supportRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    supportAvatar: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: "#A8C9B8",
        alignItems: "center",
        justifyContent: "center",
    },
    supportAvatarText: {
        color: "#25323E",
        fontFamily: "Inter_500Medium",
        fontSize: 16,
        lineHeight: 20,
    },
    supportContent: {
        flex: 1,
        gap: 8,
    },
    supportMetaRow: {
        flexDirection: "row",
        alignItems: "baseline",
        gap: 8,
    },
    supportName: {
        color: "#25323E",
        fontFamily: "Inter_500Medium",
        fontSize: 17,
        lineHeight: 21,
    },
    supportTime: {
        color: "#5C6874",
        fontFamily: "Inter_400Regular",
        fontSize: 14,
        lineHeight: 18,
    },
    supportMessagePill: {
        alignSelf: "flex-start",
        borderRadius: 999,
        backgroundColor: "#DDE9E1",
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    supportMessage: {
        color: "#25323E",
        fontFamily: "Inter_500Medium",
        fontSize: 16,
        lineHeight: 20,
    },
    emptySupportText: {
        marginTop: 12,
        color: "#5C6874",
        fontFamily: "Inter_400Regular",
        fontSize: 16,
        lineHeight: 22,
    },
    sendSupportButton: {
        marginTop: 2,
        minHeight: 74,
        borderRadius: 999,
        backgroundColor: "#A8C9B8",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 20,
    },
    sendSupportButtonPressed: {
        opacity: 0.88,
    },
    sendSupportButtonDisabled: {
        opacity: 0.65,
    },
    sendSupportButtonText: {
        color: "#25323E",
        fontFamily: "Inter_500Medium",
        fontSize: 17,
        lineHeight: 22,
    },
    sendSupportFeedback: {
        marginTop: -4,
        color: "#5C6874",
        textAlign: "center",
        fontFamily: "Inter_400Regular",
        fontSize: 14,
        lineHeight: 20,
    },
    inviteCard: {
        marginTop: 2,
        borderRadius: 24,
        backgroundColor: "#F8F8F8",
        borderWidth: 1,
        borderColor: "#E5E7E9",
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    inviteHeading: {
        color: "#25323E",
        fontFamily: "Fraunces_500Medium",
        fontSize: 17,
        lineHeight: 22,
    },
    inviteRow: {
        marginTop: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    inviteCodePill: {
        flex: 1,
        minHeight: 56,
        borderRadius: 16,
        backgroundColor: "#EFEDE8",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 18,
    },
    inviteCodeText: {
        color: "#2E7876",
        fontFamily: "Inter_600SemiBold",
        fontSize: 17,
        lineHeight: 22,
        letterSpacing: 0.8,
    },
    inviteActionButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#A8C9B8",
        alignItems: "center",
        justifyContent: "center",
    },
    inviteActionButtonPressed: {
        opacity: 0.85,
    },
    inviteFeedback: {
        marginTop: 8,
        color: "#5C6874",
        textAlign: "center",
        fontFamily: "Inter_400Regular",
        fontSize: 13,
        lineHeight: 18,
    },
});
