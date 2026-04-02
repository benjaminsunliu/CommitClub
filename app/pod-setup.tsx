import { Feather } from "@expo/vector-icons";
import { Href, router } from "expo-router";
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
import { joinPodWithInviteCode } from "@/services/podService";

const createPodPath = "/pod-create" as Href;

type PodOptionCardProps = {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  subtitle: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

function PodOptionCard({
  icon,
  title,
  subtitle,
  onPress,
  loading = false,
  disabled = false,
}: PodOptionCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.optionCard,
        pressed && !disabled && styles.optionCardPressed,
        disabled && styles.optionCardDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.iconBadge}>
        {loading ? (
          <ActivityIndicator size="small" color="#2E7876" />
        ) : (
          <Feather name={icon} size={34} color="#2E7876" />
        )}
      </View>

      <View style={styles.optionTextBlock}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

function getPodActionErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export default function PodSetupScreen() {
  const [inviteCode, setInviteCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoiningPod, setIsJoiningPod] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);

  const normalizedInviteCode = useMemo(
    () => inviteCode.trim().toUpperCase(),
    [inviteCode],
  );

  async function handleJoinPod() {
    if (!normalizedInviteCode) {
      setJoinError("Enter an invite code.");
      return;
    }

    setJoinError(null);
    setIsJoiningPod(true);

    try {
      await joinPodWithInviteCode(normalizedInviteCode);
    } catch (error) {
      setJoinError(getPodActionErrorMessage(error));
    } finally {
      setIsJoiningPod(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.panel}>
          <Text style={styles.title}>Create or join a pod</Text>
          <Text style={styles.subtitle}>Small circles. Big support.</Text>

          <View style={styles.options}>
            <PodOptionCard
              icon="plus"
              title="Create a pod"
              subtitle="Start your own private circle"
              onPress={() => router.push(createPodPath)}
              disabled={isJoiningPod}
            />

            <PodOptionCard
              icon="tag"
              title="Join with invite code"
              subtitle="Enter your friend's code"
              onPress={() => setShowJoinForm(true)}
              loading={isJoiningPod}
              disabled={isJoiningPod}
            />

            {showJoinForm && (
              <View style={styles.joinSection}>
                <TextInput
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholder="Invite code"
                  placeholderTextColor="#7A8690"
                  style={styles.inviteInput}
                  editable={!isJoiningPod}
                  maxLength={12}
                />

                <AppButton
                  label={isJoiningPod ? "Joining..." : "Join pod"}
                  onPress={handleJoinPod}
                  disabled={isJoiningPod}
                  size="tall"
                  style={styles.joinButton}
                />

                {joinError && <Text style={styles.errorText}>{joinError}</Text>}
              </View>
            )}
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
    paddingBottom: 20,
  },
  panel: {
    flex: 1,
    backgroundColor: "#F3F1EE",
    borderRadius: 34,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
  },
  title: {
    fontSize: 27,
    lineHeight: 33,
    color: "#25323E",
    fontFamily: "Fraunces_600SemiBold",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 23,
    color: "#5C6874",
    fontFamily: "Inter_400Regular",
  },
  options: {
    marginTop: 24,
    gap: 14,
  },
  optionCard: {
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#D3D6D8",
    backgroundColor: "#F8F8F8",
    paddingHorizontal: 18,
    paddingVertical: 18,
    minHeight: 150,
  },
  optionCardPressed: {
    opacity: 0.86,
  },
  optionCardDisabled: {
    opacity: 0.8,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#2E7876",
    alignItems: "center",
    justifyContent: "center",
  },
  optionTextBlock: {
    marginTop: 14,
    alignItems: "center",
  },
  optionTitle: {
    color: "#25323E",
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "Fraunces_600SemiBold",
    textAlign: "center",
  },
  optionSubtitle: {
    marginTop: 8,
    color: "#5C6874",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  joinSection: {
    marginTop: 2,
    paddingHorizontal: 4,
    gap: 8,
  },
  inviteInput: {
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#D3D6D8",
    backgroundColor: "#F8F8F8",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#25323E",
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.7,
  },
  joinButton: {
    height: 56,
  },
  errorText: {
    color: "#B23A3A",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
});
