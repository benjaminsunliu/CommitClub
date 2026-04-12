import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { auth, db } from "@/services/firebase";
import {
    defaultReminderPreferences,
    normalizeReminderPreferences,
    ReminderPreferences,
    ReminderWindow,
    updateCurrentUserReminderPreferences,
} from "@/services/userSettingsService";

const REMINDER_WINDOWS: ReminderWindow[] = ["Morning", "Afternoon", "Evening"];

function ReminderOption({
    label,
    selected,
    disabled,
    onPress,
}: {
    label: ReminderWindow;
    selected: boolean;
    disabled: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            style={({ pressed }) => [
                styles.windowChip,
                selected && styles.windowChipSelected,
                disabled && styles.windowChipDisabled,
                pressed && !disabled && styles.windowChipPressed,
            ]}
            onPress={onPress}
            disabled={disabled}
        >
            <Text
                style={[
                    styles.windowChipText,
                    selected && styles.windowChipTextSelected,
                    disabled && styles.windowChipTextDisabled,
                ]}
            >
                {label}
            </Text>
        </Pressable>
    );
}

export default function RemindersScreen() {
    const [preferences, setPreferences] = useState<ReminderPreferences>(
        defaultReminderPreferences,
    );
    const [savedPreferences, setSavedPreferences] = useState<ReminderPreferences>(
        defaultReminderPreferences,
    );
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const hasChanges = useMemo(
        () =>
            preferences.dailyCheckInEnabled !== savedPreferences.dailyCheckInEnabled ||
            preferences.reminderWindow !== savedPreferences.reminderWindow ||
            preferences.podSupportEnabled !== savedPreferences.podSupportEnabled,
        [preferences, savedPreferences],
    );

    useEffect(() => {
        let unsubscribeUserDoc: (() => void) | undefined;

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            unsubscribeUserDoc?.();

            if (!user) {
                setPreferences(defaultReminderPreferences);
                setSavedPreferences(defaultReminderPreferences);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);

            const userRef = doc(db, "users", user.uid);
            unsubscribeUserDoc = onSnapshot(
                userRef,
                (snapshot) => {
                    const data = snapshot.data() as { reminders?: unknown } | undefined;
                    const nextPreferences = normalizeReminderPreferences(data?.reminders);

                    setPreferences(nextPreferences);
                    setSavedPreferences(nextPreferences);
                    setIsLoading(false);
                },
                () => {
                    setPreferences(defaultReminderPreferences);
                    setSavedPreferences(defaultReminderPreferences);
                    setIsLoading(false);
                },
            );
        });

        return () => {
            unsubscribeUserDoc?.();
            unsubscribeAuth();
        };
    }, []);

    function handleBack() {
        if (router.canGoBack()) {
            router.back();
            return;
        }

        router.replace("/(tabs)/profile");
    }

    async function handleSave() {
        if (isLoading || isSaving || !hasChanges) {
            return;
        }

        setError(null);
        setSuccess(null);
        setIsSaving(true);

        try {
            await updateCurrentUserReminderPreferences(preferences);
            setSavedPreferences(preferences);
            setSuccess("Reminder settings updated.");
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : "Could not update reminders. Please try again.",
            );
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
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
                            onPress={handleBack}
                        >
                            <Feather name="arrow-left" size={30} color="#25323E" />
                        </Pressable>
                        <Text style={styles.pageTitle}>Reminders</Text>
                    </View>

                    <Text style={styles.pageSubtitle}>
                        Choose how gently CommitClub nudges you back into your habit.
                    </Text>

                    <View style={styles.preferenceCard}>
                        <View style={styles.preferenceHeader}>
                            <View style={styles.preferenceTextWrap}>
                                <Text style={styles.preferenceTitle}>
                                    Daily check-in reminders
                                </Text>
                                <Text style={styles.preferenceBody}>
                                    Show check-in reminders in your notifications feed.
                                </Text>
                            </View>
                            <Switch
                                value={preferences.dailyCheckInEnabled}
                                onValueChange={(value) => {
                                    setPreferences((current) => ({
                                        ...current,
                                        dailyCheckInEnabled: value,
                                    }));
                                    setError(null);
                                    setSuccess(null);
                                }}
                                trackColor={{ false: "#D7DDDA", true: "#A8CBB8" }}
                                thumbColor="#FFFFFF"
                            />
                        </View>

                        <Text style={styles.windowLabel}>Best time for reminders</Text>
                        <View style={styles.windowRow}>
                            {REMINDER_WINDOWS.map((windowLabel) => (
                                <ReminderOption
                                    key={windowLabel}
                                    label={windowLabel}
                                    selected={preferences.reminderWindow === windowLabel}
                                    disabled={!preferences.dailyCheckInEnabled}
                                    onPress={() => {
                                        setPreferences((current) => ({
                                            ...current,
                                            reminderWindow: windowLabel,
                                        }));
                                        setError(null);
                                        setSuccess(null);
                                    }}
                                />
                            ))}
                        </View>
                    </View>

                    <View style={styles.preferenceCard}>
                        <View style={styles.preferenceHeader}>
                            <View style={styles.preferenceTextWrap}>
                                <Text style={styles.preferenceTitle}>
                                    Pod support notifications
                                </Text>
                                <Text style={styles.preferenceBody}>
                                    Show encouraging reactions from your pod in notifications.
                                </Text>
                            </View>
                            <Switch
                                value={preferences.podSupportEnabled}
                                onValueChange={(value) => {
                                    setPreferences((current) => ({
                                        ...current,
                                        podSupportEnabled: value,
                                    }));
                                    setError(null);
                                    setSuccess(null);
                                }}
                                trackColor={{ false: "#D7DDDA", true: "#A8CBB8" }}
                                thumbColor="#FFFFFF"
                            />
                        </View>
                    </View>

                    <View style={styles.noteCard}>
                        <Text style={styles.noteTitle}>How this works</Text>
                        <Text style={styles.noteBody}>
                            These settings shape what shows up on your notifications page.
                            You can still open CommitClub and check in anytime.
                        </Text>
                    </View>

                    {isLoading ? (
                        <Text style={styles.metaText}>Loading your reminder settings...</Text>
                    ) : null}
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    {success ? <Text style={styles.successText}>{success}</Text> : null}

                    <AppButton
                        label={isSaving ? "Saving..." : "Save reminders"}
                        onPress={handleSave}
                        disabled={isLoading || isSaving || !hasChanges}
                        style={styles.saveButton}
                        textStyle={styles.saveButtonText}
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
        marginLeft: -6,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
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
    pageSubtitle: {
        marginTop: 16,
        color: "#5C6874",
        fontSize: 17,
        lineHeight: 25,
        fontFamily: "Inter_400Regular",
    },
    preferenceCard: {
        marginTop: 18,
        borderRadius: 24,
        backgroundColor: "#FBFAF9",
        paddingHorizontal: 18,
        paddingVertical: 18,
    },
    preferenceHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    preferenceTextWrap: {
        flex: 1,
    },
    preferenceTitle: {
        color: "#25323E",
        fontSize: 20,
        lineHeight: 26,
        fontFamily: "Fraunces_500Medium",
    },
    preferenceBody: {
        marginTop: 6,
        color: "#5C6874",
        fontSize: 16,
        lineHeight: 24,
        fontFamily: "Inter_400Regular",
    },
    windowLabel: {
        marginTop: 16,
        color: "#25323E",
        fontSize: 15,
        lineHeight: 20,
        fontFamily: "Inter_600SemiBold",
    },
    windowRow: {
        marginTop: 10,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    windowChip: {
        minWidth: 104,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#D5DDDA",
        backgroundColor: "#F3F5F4",
        paddingHorizontal: 16,
        paddingVertical: 10,
        alignItems: "center",
    },
    windowChipSelected: {
        borderColor: "#2E7876",
        backgroundColor: "#DDEBDF",
    },
    windowChipDisabled: {
        opacity: 0.5,
    },
    windowChipPressed: {
        opacity: 0.82,
    },
    windowChipText: {
        color: "#5C6874",
        fontSize: 15,
        lineHeight: 20,
        fontFamily: "Inter_500Medium",
    },
    windowChipTextSelected: {
        color: "#2E7876",
        fontFamily: "Inter_600SemiBold",
    },
    windowChipTextDisabled: {
        color: "#8A96A0",
    },
    noteCard: {
        marginTop: 16,
        borderRadius: 24,
        backgroundColor: "#FBFAF9",
        paddingHorizontal: 18,
        paddingVertical: 18,
    },
    noteTitle: {
        color: "#25323E",
        fontSize: 20,
        lineHeight: 26,
        fontFamily: "Fraunces_500Medium",
    },
    noteBody: {
        marginTop: 8,
        color: "#5C6874",
        fontSize: 16,
        lineHeight: 24,
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
    saveButton: {
        marginTop: 18,
        height: 60,
        backgroundColor: "#2E7876",
    },
    saveButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontFamily: "Inter_600SemiBold",
    },
});
