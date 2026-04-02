import { Href, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";

const podSetupPath = "/pod-setup" as Href;

function getHabitSetupPath(podName: string) {
  return `/pod-habit-setup?podName=${encodeURIComponent(podName)}` as Href;
}

export default function PodCreateScreen() {
  const [podName, setPodName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const trimmedPodName = useMemo(() => podName.trim(), [podName]);

  function handleContinue() {
    if (!trimmedPodName) {
      setError("Please enter a pod name.");
      return;
    }

    setError(null);
    router.push(getHabitSetupPath(trimmedPodName));
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.panel}>
          <View>
            <Text style={styles.title}>Create your pod</Text>
            <Text style={styles.subtitle}>Give your pod a name that feels right</Text>

            <TextInput
              value={podName}
              onChangeText={setPodName}
              placeholder="Pod name"
              placeholderTextColor="#5F6C77"
              style={styles.input}
              autoCorrect={false}
              maxLength={40}
            />

            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                You can invite up to 3 friends after setup. Your pod is a safe space for honest
                check-ins.
              </Text>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>

          <View style={styles.actions}>
            <AppButton label="Create pod" onPress={handleContinue} size="tall" />
            <AppButton
              label="Back"
              onPress={() => router.replace(podSetupPath)}
              variant="secondary"
              size="tall"
            />
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
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
  },
  panel: {
    flex: 1,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    backgroundColor: "#F3F1EE",
    borderRadius: 34,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
    justifyContent: "space-between",
    minHeight: 700,
  },
  title: {
    color: "#25323E",
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 27,
    lineHeight: 33,
  },
  subtitle: {
    marginTop: 8,
    color: "#5C6874",
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    lineHeight: 23,
  },
  input: {
    marginTop: 24,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "#D3D6D8",
    backgroundColor: "#F8F8F8",
    paddingHorizontal: 20,
    color: "#25323E",
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  infoCard: {
    marginTop: 16,
    borderRadius: 24,
    backgroundColor: "#F8F8F8",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  infoText: {
    color: "#5C6874",
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    lineHeight: 24,
  },
  errorText: {
    marginTop: 10,
    color: "#B23A3A",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_500Medium",
  },
  actions: {
    gap: 10,
  },
});
