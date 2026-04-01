import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton } from "../components/AppButton";

export default function Index() {
  return (
    <LinearGradient colors={["#A8C9B8", "#F7F4EE"]} style={styles.root}>
      <StatusBar style="dark" />

      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <View style={styles.hero}>
            <Image source={require("../assets/images/logo/logo.png")} style={styles.logo} />

            <Text style={styles.title}>CommitClub</Text>
            <Text style={styles.subtitle}>
              Stay consistent together.{"\n"}No shame required.
            </Text>

            <View style={styles.messageCard}>
              <Text style={styles.messageText}>
                Build habits with a small private pod.{"\n"}Check in daily. Miss a
                day without spiraling
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <AppButton label="Get started" onPress={() => router.push("/sign-up")} />

            <AppButton
              label="I have a pod code"
              variant="secondary"
              onPress={() => router.push("/sign-in")}
            />
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    alignSelf: "center",
    width: "100%",
    maxWidth: 520,
    paddingHorizontal: 22,
    paddingBottom: 14,
  },
  hero: {
    alignItems: "center",
    paddingTop: 20,
  },
  logo: {
    width: 148,
    height: 148,
  },
  title: {
    marginTop: 18,
    fontSize: 34,
    lineHeight: 40,
    color: "#25323E",
    fontFamily: "Fraunces_600SemiBold",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: "#5D6875",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  messageCard: {
    width: "100%",
    marginTop: 30,
    backgroundColor: "#F8F8F8",
    borderRadius: 30,
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  messageText: {
    color: "#2D3944",
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "Inter_400Regular",
  },
  actions: {
    gap: 12,
    paddingBottom: 4,
  },
});
