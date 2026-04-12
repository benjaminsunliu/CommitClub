import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { auth, db } from "@/services/firebase";
import { updateCurrentUserName } from "@/services/userSettingsService";

export default function PersonalInfoScreen() {
    const [name, setName] = useState("");
    const [savedName, setSavedName] = useState("");
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const savedNameRef = useRef("");

    const trimmedName = useMemo(() => name.trim(), [name]);
    const saveDisabled =
        isLoading || isSaving || !trimmedName || trimmedName === savedName;

    useEffect(() => {
        let unsubscribeUserDoc: (() => void) | undefined;

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            unsubscribeUserDoc?.();

            if (!user) {
                setName("");
                setSavedName("");
                savedNameRef.current = "";
                setEmail("");
                setIsLoading(false);
                return;
            }

            const fallbackName =
                user.displayName?.trim() ||
                user.email?.split("@")[0]?.trim() ||
                "Member";

            setEmail(user.email?.trim() || "");
            setSavedName(fallbackName);
            savedNameRef.current = fallbackName;
            setName(fallbackName);
            setIsLoading(true);

            const userRef = doc(db, "users", user.uid);
            unsubscribeUserDoc = onSnapshot(
                userRef,
                (snapshot) => {
                    const userData = snapshot.data() as
                        | { name?: string; email?: string }
                        | undefined;
                    const resolvedName = userData?.name?.trim() || fallbackName;
                    const resolvedEmail = userData?.email?.trim() || user.email?.trim() || "";
                    const previousSavedName = savedNameRef.current;

                    setSavedName(resolvedName);
                    savedNameRef.current = resolvedName;
                    setName((currentName) => {
                        const currentTrimmed = currentName.trim();

                        if (
                            !currentTrimmed ||
                            currentTrimmed === previousSavedName
                        ) {
                            return resolvedName;
                        }

                        return currentName;
                    });
                    setEmail(resolvedEmail);
                    setIsLoading(false);
                },
                () => {
                    setSavedName(fallbackName);
                    savedNameRef.current = fallbackName;
                    setName(fallbackName);
                    setEmail(user.email?.trim() || "");
                    setIsLoading(false);
                },
            );
        });

        return () => {
            unsubscribeUserDoc?.();
            unsubscribeAuth();
        };
    }, []);

    async function handleSave() {
        if (saveDisabled) {
            return;
        }

        setError(null);
        setSuccess(null);
        setIsSaving(true);

        try {
            await updateCurrentUserName(trimmedName);
            setSavedName(trimmedName);
            savedNameRef.current = trimmedName;
            setName(trimmedName);
            setSuccess("Your profile has been updated.");
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : "Could not save your changes. Please try again.",
            );
        } finally {
            setIsSaving(false);
        }
    }

    function handleBack() {
        if (router.canGoBack()) {
            router.back();
            return;
        }

        router.replace("/(tabs)/profile");
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
                        <Text style={styles.pageTitle}>Personal Info</Text>
                    </View>

                    <Text style={styles.pageSubtitle}>
                        This is the name your pod sees when you check in and send support.
                    </Text>

                    <View style={styles.formCard}>
                        <Text style={styles.fieldLabel}>Display name</Text>
                        <View style={styles.inputShell}>
                            <Feather name="user" size={22} color="#66727D" />
                            <TextInput
                                placeholder="Your name"
                                placeholderTextColor="#8A96A0"
                                style={styles.input}
                                autoCapitalize="words"
                                autoCorrect={false}
                                value={name}
                                onChangeText={(nextValue) => {
                                    setName(nextValue);
                                    setError(null);
                                    setSuccess(null);
                                }}
                                editable={!isSaving}
                            />
                        </View>

                        <Text style={[styles.fieldLabel, styles.secondaryFieldLabel]}>
                            Email
                        </Text>
                        <View style={styles.readonlyShell}>
                            <Feather name="mail" size={22} color="#66727D" />
                            <Text style={styles.readonlyValue}>
                                {email || "No email available"}
                            </Text>
                        </View>

                        {isLoading ? (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator size="small" color="#2E7876" />
                                <Text style={styles.loadingText}>
                                    Loading your profile details
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    <View style={styles.noteCard}>
                        <Text style={styles.noteTitle}>A quick note</Text>
                        <Text style={styles.noteBody}>
                            Your email stays private. Only your display name is shown to your
                            pod.
                        </Text>
                    </View>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    {success ? <Text style={styles.successText}>{success}</Text> : null}

                    <AppButton
                        label={isSaving ? "Saving..." : "Save changes"}
                        onPress={handleSave}
                        disabled={saveDisabled}
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
    formCard: {
        marginTop: 18,
        borderRadius: 24,
        backgroundColor: "#FBFAF9",
        paddingHorizontal: 18,
        paddingVertical: 18,
    },
    fieldLabel: {
        color: "#25323E",
        fontSize: 15,
        lineHeight: 20,
        fontFamily: "Inter_600SemiBold",
    },
    secondaryFieldLabel: {
        marginTop: 16,
    },
    inputShell: {
        marginTop: 8,
        minHeight: 62,
        borderRadius: 20,
        backgroundColor: "#F3F5F4",
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    input: {
        flex: 1,
        color: "#25323E",
        fontSize: 17,
        lineHeight: 24,
        fontFamily: "Inter_500Medium",
    },
    readonlyShell: {
        marginTop: 8,
        minHeight: 62,
        borderRadius: 20,
        backgroundColor: "#F3F5F4",
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    readonlyValue: {
        flex: 1,
        color: "#5C6874",
        fontSize: 16,
        lineHeight: 23,
        fontFamily: "Inter_400Regular",
    },
    loadingRow: {
        marginTop: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    loadingText: {
        color: "#5C6874",
        fontSize: 14,
        lineHeight: 20,
        fontFamily: "Inter_500Medium",
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
