import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
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
import {
  createPodAndInitialHabitForCurrentUser,
  createPodForCurrentUser,
} from "@/services/podService";

const habitCategories = [
  { id: "study", label: "Study", icon: "book-open" as const },
  { id: "fitness", label: "Fitness", icon: "activity" as const },
  { id: "sleep", label: "Sleep", icon: "moon" as const },
  { id: "coding", label: "Coding", icon: "code" as const },
];

function getPodActionErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export default function PodHabitSetupScreen() {
  const { podName } = useLocalSearchParams<{ podName?: string }>();
  const [habitTitle, setHabitTitle] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("study");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resolvedPodName = useMemo(
    () => (typeof podName === "string" ? podName.trim() : ""),
    [podName],
  );
  const trimmedHabitTitle = useMemo(() => habitTitle.trim(), [habitTitle]);

  async function handleStartBuilding() {
    if (!resolvedPodName) {
      setError("Pod details are missing. Please go back and try again.");
      return;
    }

    if (!trimmedHabitTitle) {
      setError("Please enter your first habit.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    let completed = false;

    try {
      await createPodAndInitialHabitForCurrentUser({
        podName: resolvedPodName,
        habitTitle: trimmedHabitTitle,
        habitCategory: selectedCategoryId,
      });
      completed = true;
    } catch (actionError) {
      setError(getPodActionErrorMessage(actionError));
    } finally {
      if (!completed) {
        setIsSubmitting(false);
      }
    }
  }

  async function handleSetupLater() {
    if (!resolvedPodName) {
      setError("Pod details are missing. Please go back and try again.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    let completed = false;

    try {
      await createPodForCurrentUser(resolvedPodName);
      completed = true;
    } catch (actionError) {
      setError(getPodActionErrorMessage(actionError));
    } finally {
      if (!completed) {
        setIsSubmitting(false);
      }
    }
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
            <Text style={styles.title}>Set up your habit</Text>
            <Text style={styles.subtitle}>
              Start with one habit. You can add more later.
            </Text>

            <Text style={styles.fieldLabel}>What habit do you want to build?</Text>
            <TextInput
              value={habitTitle}
              onChangeText={setHabitTitle}
              placeholder="e.g., Study for 30 minutes"
              placeholderTextColor="#5F6C77"
              style={styles.input}
              autoCorrect={false}
              maxLength={80}
              editable={!isSubmitting}
            />

            <Text style={[styles.fieldLabel, styles.categoryLabel]}>Category</Text>
            <View style={styles.categoryGrid}>
              {habitCategories.map((category) => {
                const isSelected = selectedCategoryId === category.id;

                return (
                  <Pressable
                    key={category.id}
                    style={({ pressed }) => [
                      styles.categoryCard,
                      isSelected && styles.categoryCardSelected,
                      pressed && !isSubmitting && styles.categoryCardPressed,
                    ]}
                    onPress={() => setSelectedCategoryId(category.id)}
                    disabled={isSubmitting}
                  >
                    <Feather
                      name={category.icon}
                      size={40}
                      color={isSelected ? "#25323E" : "#5F6C77"}
                    />
                    <Text
                      style={[
                        styles.categoryText,
                        isSelected && styles.categoryTextSelected,
                      ]}
                    >
                      {category.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                You&apos;ll check in daily with Done, Partial, or Missed. All responses are
                valid and help you stay connected.
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <AppButton
              label={isSubmitting ? "Starting..." : "Start building"}
              onPress={handleStartBuilding}
              size="tall"
              disabled={isSubmitting}
            />

            {isSubmitting && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#2E7876" />
                <Text style={styles.loadingText}>Finalizing your pod</Text>
              </View>
            )}

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Pressable
              onPress={handleSetupLater}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.setupLaterButton,
                pressed && !isSubmitting && styles.setupLaterButtonPressed,
              ]}
            >
              <Text style={styles.setupLaterText}>Set up later</Text>
            </Pressable>
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
    paddingHorizontal: 0,
    paddingTop: 2,
    paddingBottom: 16,
  },
  panel: {
    flex: 1,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    marginTop: -6,
    backgroundColor: "#F3F1EE",
    borderRadius: 34,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    justifyContent: "space-between",
    minHeight: 760,
  },
  title: {
    color: "#25323E",
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 26,
    lineHeight: 32,
  },
  subtitle: {
    marginTop: 8,
    color: "#5C6874",
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    lineHeight: 22,
  },
  fieldLabel: {
    marginTop: 26,
    color: "#25323E",
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    lineHeight: 26,
  },
  input: {
    marginTop: 12,
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
  categoryLabel: {
    marginTop: 18,
  },
  categoryGrid: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  categoryCard: {
    width: "48%",
    minHeight: 132,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#D3D6D8",
    backgroundColor: "#F8F8F8",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 10,
  },
  categoryCardSelected: {
    borderColor: "#2E7876",
    backgroundColor: "#A8C9B8",
  },
  categoryCardPressed: {
    opacity: 0.86,
  },
  categoryText: {
    color: "#5C6874",
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    lineHeight: 24,
  },
  categoryTextSelected: {
    color: "#25323E",
  },
  infoCard: {
    marginTop: 14,
    borderRadius: 24,
    backgroundColor: "#F8F8F8",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  infoText: {
    color: "#5C6874",
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    lineHeight: 24,
  },
  actions: {
    marginTop: 8,
    gap: 10,
  },
  setupLaterButton: {
    marginTop: 2,
    alignSelf: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  setupLaterButtonPressed: {
    opacity: 0.75,
  },
  setupLaterText: {
    color: "#5C6874",
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 18,
    textDecorationLine: "underline",
  },
  loadingRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: "#5C6874",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: "#B23A3A",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_500Medium",
  },
});
