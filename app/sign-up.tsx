import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { FirebaseError } from "firebase/app";
import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton } from "../components/AppButton";
import { registerUser } from "../services/authService";

function getRegisterErrorMessage(error: unknown) {
    if (!(error instanceof FirebaseError)) {
        return "Something went wrong. Please try again.";
    }

    switch (error.code) {
        case "auth/email-already-in-use":
            return "This email is already in use. Try signing in.";
        case "auth/invalid-email":
            return "Please enter a valid email address.";
        case "auth/weak-password":
            return "Password is too weak. Use at least 6 characters.";
        case "auth/network-request-failed":
            return "Network issue. Check your connection and retry.";
        default:
            return "Could not create your account. Please try again.";
    }
}

export default function SignUpScreen() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const trimmedName = useMemo(() => name.trim(), [name]);
    const trimmedEmail = useMemo(() => email.trim(), [email]);

    async function handleSignUp() {
        if (!trimmedName) {
            setError("Please enter your name.");
            return;
        }

        if (!trimmedEmail) {
            setError("Please enter your email.");
            return;
        }

        if (password.length < 6) {
            setError("Use at least 6 characters for your password.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setError(null);
        setSuccess(null);
        setIsSubmitting(true);

        try {
            await registerUser(trimmedName, trimmedEmail, password);
            setSuccess("Account created! Redirecting to Home...");
            setTimeout(() => {
                router.replace("/(tabs)/home");
            }, 700);
        } catch (registerError) {
            setError(getRegisterErrorMessage(registerError));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <SafeAreaView style={styles.root}>
            <StatusBar style="dark" />

            <View style={styles.content}>
                <View style={styles.hero}>
                    <Image source={require("../assets/images/logo/logo.png")} style={styles.logo} />
                    <Text style={styles.title}>Create your account</Text>
                    <Text style={styles.subtitle}>Start your first private pod in minutes</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputShell}>
                        <Feather name="user" size={26} color="#66727D" />
                        <TextInput
                            placeholder="Name"
                            placeholderTextColor="#66727D"
                            style={styles.input}
                            autoCapitalize="words"
                            autoCorrect={false}
                            value={name}
                            onChangeText={setName}
                            editable={!isSubmitting}
                        />
                    </View>

                    <View style={styles.inputShell}>
                        <Feather name="mail" size={26} color="#66727D" />
                        <TextInput
                            placeholder="Email"
                            placeholderTextColor="#66727D"
                            style={styles.input}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="email-address"
                            value={email}
                            onChangeText={setEmail}
                            editable={!isSubmitting}
                        />
                    </View>

                    <View style={styles.inputShell}>
                        <Feather name="lock" size={26} color="#66727D" />
                        <TextInput
                            placeholder="Password"
                            placeholderTextColor="#66727D"
                            style={styles.input}
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                            editable={!isSubmitting}
                        />
                    </View>

                    <View style={styles.inputShell}>
                        <Feather name="check-circle" size={26} color="#66727D" />
                        <TextInput
                            placeholder="Confirm password"
                            placeholderTextColor="#66727D"
                            style={styles.input}
                            secureTextEntry
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            editable={!isSubmitting}
                        />
                    </View>

                    <AppButton
                        label={isSubmitting ? "Creating account..." : "Create account"}
                        size="tall"
                        style={styles.signUpButton}
                        textStyle={styles.signUpText}
                        onPress={handleSignUp}
                        disabled={isSubmitting}
                    />

                    {isSubmitting && (
                        <View style={styles.loadingRow}>
                            <ActivityIndicator size="small" color="#2E7876" />
                            <Text style={styles.loadingText}>Setting up your account</Text>
                        </View>
                    )}

                    {error && <Text style={styles.errorText}>{error}</Text>}
                    {success && <Text style={styles.successText}>{success}</Text>}
                </View>

                <View style={styles.footer}>
                    <Text style={styles.privacyText}>Only your pod can see your check-ins.</Text>

                    <Pressable onPress={() => router.push("/sign-in")}>
                        <Text style={styles.signInText}>Already have an account? Sign in</Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#F3F1EE",
    },
    content: {
        flex: 1,
        width: "100%",
        maxWidth: 520,
        alignSelf: "center",
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 30,
    },
    hero: {
        alignItems: "center",
    },
    logo: {
        width: 132,
        height: 132,
    },
    title: {
        marginTop: 12,
        fontSize: 30,
        lineHeight: 36,
        fontFamily: "Fraunces_600SemiBold",
        color: "#25323E",
        textAlign: "center",
    },
    subtitle: {
        marginTop: 10,
        fontSize: 16,
        lineHeight: 22,
        color: "#5B6875",
        fontFamily: "Inter_400Regular",
        textAlign: "center",
    },
    form: {
        marginTop: 24,
        gap: 10,
    },
    inputShell: {
        height: 64,
        borderRadius: 32,
        backgroundColor: "#F8F8F8",
        borderWidth: 2,
        borderColor: "#E1E4E8",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 18,
        gap: 12,
    },
    input: {
        flex: 1,
        fontSize: 17,
        color: "#2D3944",
        fontFamily: "Inter_400Regular",
    },
    signUpButton: {
        marginTop: 14,
        height: 72,
    },
    signUpText: {
        fontSize: 21,
        fontFamily: "Inter_500Medium",
        letterSpacing: 0,
    },
    loadingRow: {
        marginTop: 2,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    loadingText: {
        color: "#5B6875",
        fontSize: 14,
        fontFamily: "Inter_400Regular",
    },
    errorText: {
        marginTop: 4,
        color: "#B23A3A",
        textAlign: "center",
        fontSize: 14,
        lineHeight: 20,
        fontFamily: "Inter_500Medium",
    },
    successText: {
        marginTop: 4,
        color: "#2E7876",
        textAlign: "center",
        fontSize: 14,
        lineHeight: 20,
        fontFamily: "Inter_500Medium",
    },
    footer: {
        marginTop: 22,
        alignItems: "center",
        gap: 16,
    },
    privacyText: {
        color: "#5C6874",
        fontSize: 16,
        fontFamily: "Inter_400Regular",
        textAlign: "center",
    },
    signInText: {
        color: "#2E7876",
        fontSize: 18,
        fontFamily: "Inter_500Medium",
    },
});
