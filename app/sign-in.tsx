import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton } from "../components/AppButton";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
            />
          </View>

          <AppButton
            label="Sign in"
            size="tall"
            style={styles.signInButton}
            textStyle={styles.signInText}
            onPress={() => router.replace("/home")}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.privacyText}>Your pod is private. No public rankings.</Text>

          <Pressable onPress={() => router.replace("/")}>
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
