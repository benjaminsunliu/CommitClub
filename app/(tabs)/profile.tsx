import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";
import { Href, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, limit, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "@/services/firebase";
import { logoutUser } from "@/services/authService";

const landingPath = "/" as Href;
const habitSetupPath = "/habit-setup" as Href;

type HabitRecord = {
    title: string;
    category: string;
};

type FirestoreTimestampLike = {
    toDate: () => Date;
};

function formatMemberSince(value: unknown) {
    const formatter = new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
    });

    if (!value) {
        return null;
    }

    if (typeof value === "string") {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : formatter.format(date);
    }

    if (value instanceof Date) {
        return formatter.format(value);
    }

    if (
        typeof value === "object" &&
        value !== null &&
        "toDate" in value &&
        typeof (value as FirestoreTimestampLike).toDate === "function"
    ) {
        return formatter.format((value as FirestoreTimestampLike).toDate());
    }

    return null;
}

function getCategoryLabel(category: string) {
    if (!category) {
        return "General";
    }

    return `${category.charAt(0).toUpperCase()}${category.slice(1)}`;
}

function getCategoryEmoji(category: string) {
    switch (category.toLowerCase()) {
        case "study":
            return "📚";
        case "fitness":
            return "🏋️";
        case "sleep":
            return "🌙";
        case "coding":
            return "💻";
        default:
            return "🎯";
    }
}

function getDefaultUserName() {
    const user = auth.currentUser;

    return (
        user?.displayName?.trim() ||
        user?.email?.split("@")[0]?.trim() ||
        "Member"
    );
}

type SettingCardProps = {
    icon: React.ComponentProps<typeof Feather>["name"];
    title: string;
    subtitle: string;
    href: Href;
};

function SettingCard({ icon, title, subtitle, href }: SettingCardProps) {
    return (
        <Pressable
            style={({ pressed }) => [
                styles.settingCard,
                pressed && styles.settingCardPressed,
            ]}
            onPress={() => {
                router.push(href);
            }}
        >
            <View style={styles.settingIconWrap}>
                <Feather name={icon} size={28} color="#5F6C77" />
            </View>
            <View style={styles.settingTextWrap}>
                <Text style={styles.settingTitle}>{title}</Text>
                <Text style={styles.settingSubtitle}>{subtitle}</Text>
            </View>
            <Feather name="chevron-right" size={22} color="#8D99A3" />
        </Pressable>
    );
}

export default function ProfileScreen() {
    const [userName, setUserName] = useState(getDefaultUserName());
    const [memberSinceText, setMemberSinceText] = useState("Recently");
    const [currentHabit, setCurrentHabit] = useState<HabitRecord | null>(null);
    const [loadingHabit, setLoadingHabit] = useState(true);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [signOutError, setSignOutError] = useState<string | null>(null);

    const avatarInitial = useMemo(
        () => userName.trim().charAt(0).toUpperCase() || "M",
        [userName],
    );
    const appVersion = Constants.expoConfig?.version ?? "1.0.0";

    useEffect(() => {
        let unsubscribeUserDoc: (() => void) | undefined;
        let unsubscribeHabits: (() => void) | undefined;

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            unsubscribeUserDoc?.();
            unsubscribeHabits?.();

            if (!user) {
                setUserName("Member");
                setMemberSinceText("Recently");
                setCurrentHabit(null);
                setLoadingHabit(false);
                return;
            }

            const fallbackName =
                user.displayName?.trim() ||
                user.email?.split("@")[0]?.trim() ||
                "Member";
            const fallbackMemberSince =
                formatMemberSince(user.metadata.creationTime ?? null) || "Recently";

            setUserName(fallbackName);
            setMemberSinceText(fallbackMemberSince);
            setLoadingHabit(true);

            const userRef = doc(db, "users", user.uid);
            unsubscribeUserDoc = onSnapshot(
                userRef,
                (snapshot) => {
                    const userData = snapshot.data() as
                        | { name?: string; createdAt?: unknown }
                        | undefined;
                    const profileName = userData?.name?.trim();
                    const resolvedMemberSince =
                        formatMemberSince(userData?.createdAt) || fallbackMemberSince;

                    setUserName(profileName || fallbackName);
                    setMemberSinceText(resolvedMemberSince);
                },
                () => {
                    setUserName(fallbackName);
                    setMemberSinceText(fallbackMemberSince);
                },
            );

            const habitsQuery = query(
                collection(db, "habits"),
                where("userId", "==", user.uid),
                limit(1),
            );
            unsubscribeHabits = onSnapshot(
                habitsQuery,
                (snapshot) => {
                    if (snapshot.empty) {
                        setCurrentHabit(null);
                        setLoadingHabit(false);
                        return;
                    }

                    const habitData = snapshot.docs[0].data() as {
                        title?: string;
                        category?: string;
                    };

                    setCurrentHabit({
                        title: habitData.title?.trim() || "Your habit",
                        category: habitData.category?.trim() || "general",
                    });
                    setLoadingHabit(false);
                },
                () => {
                    setCurrentHabit(null);
                    setLoadingHabit(false);
                },
            );
        });

        return () => {
            unsubscribeUserDoc?.();
            unsubscribeHabits?.();
            unsubscribeAuth();
        };
    }, []);

    async function handleSignOut() {
        setSignOutError(null);
        setIsSigningOut(true);

        try {
            await logoutUser();
            router.replace(landingPath);
        } catch {
            setSignOutError("Could not sign out. Please try again.");
        } finally {
            setIsSigningOut(false);
        }
    }

    return (
        <SafeAreaView style={styles.root} edges={["top"]}>
            <StatusBar style="dark" />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.panel}>
                    <Text style={styles.pageTitle}>Profile</Text>

                    <View style={styles.profileCard}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{avatarInitial}</Text>
                        </View>
                        <Text style={styles.profileName}>{userName}</Text>
                        <Text style={styles.memberSince}>
                            Member since {memberSinceText}
                        </Text>
                    </View>

                    <Pressable
                        style={({ pressed }) => [
                            styles.habitCard,
                            pressed && styles.settingCardPressed,
                        ]}
                        onPress={() => {
                            router.push(habitSetupPath);
                        }}
                    >
                        <Text style={styles.habitHeader}>Current habit</Text>
                        <View style={styles.habitRow}>
                            <View style={styles.habitIconWrap}>
                                {loadingHabit ? (
                                    <ActivityIndicator size="small" color="#2E7876" />
                                ) : (
                                    <Text style={styles.habitEmoji}>
                                        {getCategoryEmoji(currentHabit?.category || "general")}
                                    </Text>
                                )}
                            </View>

                            <View style={styles.habitTextWrap}>
                                <Text style={styles.habitTitle}>
                                    {currentHabit?.title || "No habit set yet"}
                                </Text>
                                <Text style={styles.habitMeta}>
                                    {currentHabit
                                        ? `Daily • ${getCategoryLabel(currentHabit.category)}`
                                        : "Tap to set up your habit"}
                                </Text>
                            </View>

                            <Feather
                                name="chevron-right"
                                size={22}
                                color="#8D99A3"
                                style={styles.habitChevron}
                            />
                        </View>
                    </Pressable>

                    <SettingCard
                        icon="user"
                        title="Personal Info"
                        subtitle="Name and email"
                        href="/personal-info"
                    />
                    <SettingCard
                        icon="bell"
                        title="Reminders"
                        subtitle="Check-in and support alerts"
                        href="/reminders"
                    />
                    <SettingCard
                        icon="shield"
                        title="Privacy"
                        subtitle="What your pod can see"
                        href="/privacy"
                    />

                    <Pressable
                        style={({ pressed }) => [
                            styles.signOutButton,
                            pressed && !isSigningOut && styles.signOutButtonPressed,
                            isSigningOut && styles.signOutButtonDisabled,
                        ]}
                        onPress={handleSignOut}
                        disabled={isSigningOut}
                    >
                        <View style={styles.signOutIconWrap}>
                            <Feather name="log-out" size={26} color="#5F6C77" />
                        </View>
                        <Text style={styles.signOutButtonText}>
                            {isSigningOut ? "Signing out..." : "Sign out"}
                        </Text>
                    </Pressable>

                    {signOutError && <Text style={styles.signOutError}>{signOutError}</Text>}

                    <View style={styles.footerBlock}>
                        <Text style={styles.versionText}>CommitClub v{appVersion}</Text>
                        <Text style={styles.taglineText}>
                            Stay consistent together. No shame required.
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
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 16,
    },
    panel: {
        width: "100%",
        maxWidth: 520,
        alignSelf: "center",
        gap: 12,
    },
    pageTitle: {
        marginTop: 2,
        color: "#25323E",
        fontFamily: "Fraunces_600SemiBold",
        fontSize: 28,
        lineHeight: 34,
    },
    profileCard: {
        marginTop: 4,
        borderRadius: 24,
        backgroundColor: "#F8F8F8",
        borderWidth: 1,
        borderColor: "#ECEDEE",
        paddingHorizontal: 18,
        paddingVertical: 18,
        alignItems: "center",
    },
    avatar: {
        width: 78,
        height: 78,
        borderRadius: 39,
        backgroundColor: "#A8C9B8",
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        color: "#25323E",
        fontSize: 30,
        lineHeight: 34,
        fontFamily: "Inter_500Medium",
    },
    profileName: {
        marginTop: 10,
        color: "#25323E",
        fontFamily: "Fraunces_600SemiBold",
        fontSize: 24,
        lineHeight: 30,
    },
    memberSince: {
        marginTop: 4,
        color: "#5C6874",
        fontFamily: "Inter_400Regular",
        fontSize: 15,
        lineHeight: 21,
    },
    habitCard: {
        borderRadius: 24,
        backgroundColor: "#F8F8F8",
        borderWidth: 1,
        borderColor: "#ECEDEE",
        paddingHorizontal: 18,
        paddingVertical: 16,
    },
    habitHeader: {
        color: "#25323E",
        fontFamily: "Fraunces_500Medium",
        fontSize: 19,
        lineHeight: 25,
    },
    habitRow: {
        marginTop: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
    },
    habitIconWrap: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#D6E3E2",
        alignItems: "center",
        justifyContent: "center",
    },
    habitEmoji: {
        fontSize: 30,
        lineHeight: 34,
    },
    habitTextWrap: {
        flex: 1,
    },
    habitChevron: {
        marginLeft: 8,
    },
    habitTitle: {
        color: "#25323E",
        fontFamily: "Inter_700Bold",
        fontSize: 20,
        lineHeight: 26,
    },
    habitMeta: {
        marginTop: 2,
        color: "#5C6874",
        fontFamily: "Inter_400Regular",
        fontSize: 15,
        lineHeight: 21,
    },
    settingCard: {
        borderRadius: 24,
        backgroundColor: "#F8F8F8",
        borderWidth: 1,
        borderColor: "#ECEDEE",
        paddingHorizontal: 18,
        paddingVertical: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
    },
    settingCardPressed: {
        opacity: 0.82,
    },
    settingIconWrap: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#D6E3E2",
        alignItems: "center",
        justifyContent: "center",
    },
    settingTextWrap: {
        flex: 1,
    },
    settingTitle: {
        color: "#25323E",
        fontFamily: "Inter_600SemiBold",
        fontSize: 18,
        lineHeight: 24,
    },
    settingSubtitle: {
        marginTop: 2,
        color: "#5C6874",
        fontFamily: "Inter_400Regular",
        fontSize: 15,
        lineHeight: 21,
    },
    signOutButton: {
        marginTop: 8,
        minHeight: 88,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: "#D3D6D8",
        backgroundColor: "#F8F8F8",
        alignItems: "center",
        flexDirection: "row",
        paddingHorizontal: 24,
        gap: 16,
    },
    signOutButtonPressed: {
        opacity: 0.85,
    },
    signOutButtonDisabled: {
        opacity: 0.72,
    },
    signOutButtonText: {
        color: "#5C6874",
        fontFamily: "Inter_500Medium",
        fontSize: 19,
        lineHeight: 24,
    },
    signOutIconWrap: {
        width: 66,
        height: 66,
        borderRadius: 33,
        backgroundColor: "#ECEDEE",
        alignItems: "center",
        justifyContent: "center",
    },
    signOutError: {
        marginTop: 6,
        textAlign: "center",
        color: "#B23A3A",
        fontFamily: "Inter_500Medium",
        fontSize: 14,
        lineHeight: 20,
    },
    footerBlock: {
        marginTop: 12,
        marginBottom: 2,
        alignItems: "center",
        gap: 10,
    },
    versionText: {
        color: "#5C6874",
        fontFamily: "Inter_500Medium",
        fontSize: 18,
        lineHeight: 24,
    },
    taglineText: {
        color: "#5C6874",
        fontFamily: "Inter_400Regular",
        fontSize: 16,
        lineHeight: 22,
        textAlign: "center",
    },
});
