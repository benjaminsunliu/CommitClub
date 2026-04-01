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
import { loginUser } from "../services/authService";

function getLoginErrorMessage(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return "Something went wrong. Please try again.";
  }

  switch (error.code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Email or password is incorrect.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait and try again.";
    case "auth/network-request-failed":
      return "Network issue. Check your connection and retry.";
    default:
      return "Could not sign in. Please try again.";
  }
}

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedEmail = useMemo(() => email.trim(), [email]);

  async function handleSignIn() {
    if (!trimmedEmail) {
      setError("Please enter your email.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await loginUser(trimmedEmail, password);
      router.replace("/(tabs)/home");
    } catch (loginError) {
      setError(getLoginErrorMessage(loginError));
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
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputShell}>
            <Feather name="mail" size={28} color="#66727D" />
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
            <Feather name="lock" size={28} color="#66727D" />
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

          <AppButton
            label={isSubmitting ? "Signing in..." : "Sign in"}
            size="tall"
            style={styles.signInButton}
            textStyle={styles.signInText}
            onPress={handleSignIn}
            disabled={isSubmitting}
          />

          {isSubmitting && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#2E7876" />
              <Text style={styles.loadingText}>Checking your account</Text>
            </View>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        <View style={styles.footer}>
          <Text style={styles.privacyText}>Your pod is private. No public rankings.</Text>

          <Pressable onPress={() => router.push("./sign-up")}>
            <Text style={styles.signupText}>Don&apos;t have an account? Sign up</Text>
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
    paddingTop: 24,
    paddingBottom: 30,
  },
  hero: {
    alignItems: "center",
  },
  logo: {
    width: 148,
    height: 148,
  },
  title: {
    marginTop: 18,
    fontSize: 32,
    lineHeight: 38,
    fontFamily: "Fraunces_600SemiBold",
    color: "#25323E",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 12,
    fontSize: 17,
    lineHeight: 22,
    color: "#5B6875",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  form: {
    marginTop: 30,
    gap: 12,
  },
  inputShell: {
    height: 70,
    borderRadius: 35,
    backgroundColor: "#F8F8F8",
    borderWidth: 2,
    borderColor: "#E1E4E8",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 17,
    color: "#2D3944",
    fontFamily: "Inter_400Regular",
  },
  signInButton: {
    marginTop: 14,
    height: 72,
  },
  signInText: {
    fontSize: 22,
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
  footer: {
    marginTop: 32,
    alignItems: "center",
    gap: 20,
  },
  privacyText: {
    color: "#5C6874",
    fontSize: 17,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  signupText: {
    color: "#2E7876",
    fontSize: 18,
    fontFamily: "Inter_500Medium",
  },
});
