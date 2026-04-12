import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import {
    pluralizeReaction,
    pluralizeTime,
    useWeeklyProgressData,
} from "@/hooks/useWeeklyProgress";

function PartialRing() {
    return <View style={styles.partialRing} />;
}

type SummaryCardProps = {
    accentBackground: string;
    title: string;
    value?: string;
    body: string;
    icon: ReactNode;
};

function SummaryCard({ accentBackground, title, value, body, icon }: SummaryCardProps) {
    return (
        <View style={styles.summaryCard}>
            <View style={[styles.summaryIconWrap, { backgroundColor: accentBackground }]}>
                {icon}
            </View>
            <View style={styles.summaryTextWrap}>
                <Text style={styles.summaryCardTitle}>{title}</Text>
                {value ? <Text style={styles.summaryCardValue}>{value}</Text> : null}
                <Text style={styles.summaryCardBody}>{body}</Text>
            </View>
        </View>
    );
}

export default function WeeklySummaryScreen() {
    const {
        isLoading,
        weekTitle,
        checkInCount,
        partialCount,
        podSupportCount,
        recoveryInsight,
        movingForwardMessage,
    } = useWeeklyProgressData();

    function handleBack() {
        if (router.canGoBack()) {
            router.back();
            return;
        }

        router.replace("/(tabs)/progress");
    }

    function handleStartWeek() {
        router.replace("/(tabs)/home");
    }

    const totalCheckinsValue = isLoading ? "..." : String(checkInCount);
    const partialsValue = isLoading ? "..." : String(partialCount);
    const totalCheckinsBody = isLoading
        ? "Pulling in your latest weekly check-ins."
        : `You checked in ${checkInCount} ${pluralizeTime(checkInCount)} this week.`;
    const partialsBody = isLoading
        ? "Checking how many partial days kept your streak alive."
        : partialCount > 0
            ? "Partial progress kept momentum alive."
            : "No partial days this week. Your check-ins were all or nothing.";
    const recoveryBody = isLoading
        ? "Looking at how you responded after tougher days."
        : recoveryInsight;
    const podSupportBody = isLoading
        ? "Checking in with your pod support this week."
        : `Your pod sent you ${podSupportCount} supportive ${pluralizeReaction(podSupportCount)} this week. You're not alone in this.`;
    const movingForwardBody = isLoading
        ? "Finding the most helpful next step for this week."
        : movingForwardMessage;

    return (
        <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
            <StatusBar style="dark" />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Pressable
                    style={({ pressed }) => [
                        styles.backButton,
                        pressed && styles.backButtonPressed,
                    ]}
                    onPress={handleBack}
                >
                    <Feather name="arrow-left" size={30} color="#25323E" />
                </Pressable>

                <View style={styles.heroWrap}>
                    <View style={styles.heroIconCircle}>
                        <Feather name="calendar" size={38} color="#2D6E71" />
                    </View>
                    <Text style={styles.pageTitle}>
                        {isLoading ? "This week" : `Week of ${weekTitle}`}
                    </Text>
                    <Text style={styles.pageSubtitle}>Here&apos;s how you did</Text>
                </View>

                <SummaryCard
                    accentBackground="#E3F0E3"
                    title="Total check-ins"
                    value={totalCheckinsValue}
                    body={totalCheckinsBody}
                    icon={<Feather name="check-circle" size={36} color="#72BE86" />}
                />

                <SummaryCard
                    accentBackground="#FBF3DE"
                    title="Partials count"
                    value={partialsValue}
                    body={partialsBody}
                    icon={<PartialRing />}
                />

                <SummaryCard
                    accentBackground="#F0EAF8"
                    title="Recovery"
                    body={recoveryBody}
                    icon={<Feather name="heart" size={34} color="#C5B0DE" />}
                />

                <LinearGradient
                    colors={["#A8CBB8", "#3E7E79"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.supportCard}
                >
                    <Text style={styles.supportTitle}>Pod support</Text>
                    <Text style={styles.supportBody}>{podSupportBody}</Text>
                </LinearGradient>

                <View style={styles.movingForwardCard}>
                    <Text style={styles.movingForwardTitle}>Moving forward</Text>
                    <Text style={styles.movingForwardBody}>{movingForwardBody}</Text>
                </View>

                <AppButton
                    label="Start this week"
                    onPress={handleStartWeek}
                    style={styles.startButton}
                    textStyle={styles.startButtonText}
                />
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
        paddingHorizontal: 18,
        paddingBottom: 24,
    },
    backButton: {
        width: 40,
        height: 40,
        marginTop: 6,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    backButtonPressed: {
        opacity: 0.7,
    },
    heroWrap: {
        alignItems: "center",
        marginTop: 28,
        marginBottom: 24,
    },
    heroIconCircle: {
        width: 112,
        height: 112,
        borderRadius: 56,
        backgroundColor: "#A8CBB8",
        alignItems: "center",
        justifyContent: "center",
    },
    pageTitle: {
        marginTop: 24,
        color: "#25323E",
        fontSize: 32,
        lineHeight: 39,
        fontFamily: "Fraunces_600SemiBold",
        textAlign: "center",
    },
    pageSubtitle: {
        marginTop: 8,
        color: "#5C6874",
        fontSize: 17,
        lineHeight: 24,
        fontFamily: "Inter_500Medium",
        textAlign: "center",
    },
    summaryCard: {
        marginTop: 16,
        borderRadius: 24,
        backgroundColor: "#FBFAF9",
        paddingHorizontal: 16,
        paddingVertical: 18,
        flexDirection: "row",
        gap: 14,
        shadowColor: "#22313D",
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.04,
        shadowRadius: 18,
        elevation: 1,
    },
    summaryIconWrap: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    summaryTextWrap: {
        flex: 1,
        paddingRight: 4,
    },
    summaryCardTitle: {
        color: "#25323E",
        fontSize: 20,
        lineHeight: 27,
        fontFamily: "Fraunces_600SemiBold",
    },
    summaryCardValue: {
        marginTop: 8,
        color: "#2E7876",
        fontSize: 28,
        lineHeight: 33,
        fontFamily: "Inter_500Medium",
    },
    summaryCardBody: {
        marginTop: 8,
        color: "#5C6874",
        fontSize: 16,
        lineHeight: 24,
        fontFamily: "Inter_400Regular",
    },
    partialRing: {
        width: 28,
        height: 28,
        borderRadius: 999,
        borderWidth: 2.5,
        borderStyle: "dashed",
        borderColor: "#E0BF78",
    },
    supportCard: {
        marginTop: 16,
        borderRadius: 24,
        paddingHorizontal: 18,
        paddingVertical: 20,
        minHeight: 118,
        justifyContent: "center",
    },
    supportTitle: {
        color: "#FFFFFF",
        fontSize: 20,
        lineHeight: 27,
        fontFamily: "Fraunces_600SemiBold",
    },
    supportBody: {
        marginTop: 12,
        color: "#F6FCF8",
        fontSize: 16,
        lineHeight: 25,
        fontFamily: "Inter_500Medium",
    },
    movingForwardCard: {
        marginTop: 16,
        borderRadius: 24,
        backgroundColor: "#FBFAF9",
        paddingHorizontal: 20,
        paddingVertical: 22,
        shadowColor: "#22313D",
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.04,
        shadowRadius: 18,
        elevation: 1,
    },
    movingForwardTitle: {
        color: "#25323E",
        fontSize: 21,
        lineHeight: 28,
        fontFamily: "Fraunces_600SemiBold",
        textAlign: "center",
    },
    movingForwardBody: {
        marginTop: 16,
        color: "#5C6874",
        fontSize: 17,
        lineHeight: 28,
        fontFamily: "Inter_400Regular",
        textAlign: "center",
    },
    startButton: {
        marginTop: 16,
        height: 60,
        backgroundColor: "#2E7876",
    },
    startButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontFamily: "Inter_600SemiBold",
    },
});
