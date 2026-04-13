import { Feather } from "@expo/vector-icons";
import { Href, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
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
  deletePrimaryHabitForCurrentUser,
  getPrimaryHabitForCurrentUser,
  upsertPrimaryHabitForCurrentUser,
} from "@/services/habitService";

const homePath = "/(tabs)/home" as Href;
const profilePath = "/(tabs)/profile" as Href;

const habitCategories = [
  { id: "study", label: "Study", icon: "book-open" as const },
  { id: "fitness", label: "Fitness", icon: "activity" as const },
  { id: "sleep", label: "Sleep", icon: "moon" as const },
  { id: "coding", label: "Coding", icon: "code" as const },
];

function getHabitActionErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export default function HabitSetupScreen() {
  const [habitTitle, setHabitTitle] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("study");
  const [hasExistingHabit, setHasExistingHabit] = useState(false);
  const [isLoadingExistingHabit, setIsLoadingExistingHabit] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const trimmedHabitTitle = useMemo(() => habitTitle.trim(), [habitTitle]);
  const isBusy = isSubmitting || isRemoving || isLoadingExistingHabit;

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentHabit() {
      try {
        const currentHabit = await getPrimaryHabitForCurrentUser();

        if (!isMounted) {
          return;
        }

        if (!currentHabit) {
          setHasExistingHabit(false);
          setHabitTitle("");
          setSelectedCategoryId("study");
          return;
        }

        const isValidCategory = habitCategories.some(
          (category) => category.id === currentHabit.category,
        );

        setHasExistingHabit(true);
        setHabitTitle(currentHabit.title);
        setSelectedCategoryId(isValidCategory ? currentHabit.category : "study");
      } catch {
        if (!isMounted) {
          return;
        }

        setError("Could not load your habit right now.");
      } finally {
        if (isMounted) {
          setIsLoadingExistingHabit(false);
        }
      }
    }

    void loadCurrentHabit();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSaveHabit() {
    if (isLoadingExistingHabit) {
      return;
    }

    if (!trimmedHabitTitle) {
      setError("Please enter your habit.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await upsertPrimaryHabitForCurrentUser({
        title: trimmedHabitTitle,
        category: selectedCategoryId,
      });

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace(homePath);
      }
    } catch (actionError) {
      setError(getHabitActionErrorMessage(actionError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveHabit() {
    if (isLoadingExistingHabit || !hasExistingHabit) {
      return;
    }

    setError(null);
    setIsRemoving(true);

    try {
      await deletePrimaryHabitForCurrentUser();

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace(homePath);
      }
    } catch (actionError) {
      setError(getHabitActionErrorMessage(actionError));
    } finally {
      setIsRemoving(false);
    }
  }

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(hasExistingHabit ? profilePath : homePath);
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
            <View style={styles.headerRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && styles.backButtonPressed,
                ]}
                onPress={handleBack}
                disabled={isBusy}
              >
                <Feather name="arrow-left" size={30} color="#25323E" />
              </Pressable>
              <Text style={styles.title}>
                {hasExistingHabit ? "Edit your habit" : "Set up your habit"}
              </Text>
            </View>

            <Text style={styles.subtitle}>
              {hasExistingHabit
                ? "Update your habit or remove it for now."
                : "Start with one habit. You can update this any time."}
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
              editable={!isBusy}
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
                      pressed && !isBusy && styles.categoryCardPressed,
                    ]}
                    onPress={() => setSelectedCategoryId(category.id)}
                    disabled={isBusy}
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
              label={isSubmitting ? "Saving..." : hasExistingHabit ? "Save changes" : "Save habit"}
              onPress={handleSaveHabit}
              size="tall"
              disabled={isBusy}
            />

            {isBusy && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#2E7876" />
                <Text style={styles.loadingText}>
                  {isLoadingExistingHabit
                    ? "Loading your habit"
                    : isRemoving
                      ? "Removing your habit"
                      : "Saving your habit"}
                </Text>
              </View>
            )}

            {hasExistingHabit && (
              <AppButton
                label={isRemoving ? "Removing..." : "Remove habit"}
                onPress={handleRemoveHabit}
                variant="secondary"
                size="tall"
                disabled={isBusy}
                style={styles.removeButton}
                textStyle={styles.removeButtonText}
              />
            )}

            {error && <Text style={styles.errorText}>{error}</Text>}
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
  removeButton: {
    borderColor: "#D9B8B8",
    backgroundColor: "#F8F3F3",
  },
  removeButtonText: {
    color: "#B23A3A",
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
