import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import {
    pluralizeTime,
    useWeeklyProgressData,
} from "@/hooks/useWeeklyProgress";

export default function RecoveryTipsScreen() {
    const {
        isLoading,
        checkInCount,
        weeklySupportMessages,
    } = useWeeklyProgressData();

    const supportChips =
        weeklySupportMessages.length > 0
            ? weeklySupportMessages
            : ["You got this", "New day, new start"];

    const weeklyCheckInText = isLoading
        ? "Loading your check-ins for this week."
        : `You checked in ${checkInCount} ${pluralizeTime(checkInCount)}. That's ${checkInCount} moments of showing up.`;

    return (
        <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
            <StatusBar style="dark" />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.content}>
                    <View style={styles.heroIconCircle}>
                        <Feather name="refresh-cw" size={38} color="#2D6E71" />
                    </View>

                    <Text style={styles.pageTitle}>
                        Missing a day doesn&apos;t erase your effort
                    </Text>
                    <Text style={styles.pageSubtitle}>
                        One day is just one day. You&apos;re building a pattern, not a
                        perfect record.
                    </Text>

                    <View style={styles.infoCard}>
                        <View style={[styles.infoIconWrap, styles.supportIconWrap]}>
                            <Feather name="heart" size={30} color="#72BE86" />
                        </View>

                        <View style={styles.infoContent}>
                            <Text style={styles.infoTitle}>Your pod sent you support</Text>
                            <View style={styles.supportChips}>
                                {supportChips.map((message) => (
                                    <View key={message} style={styles.supportChip}>
                                        <Text style={styles.supportChipText}>{message}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>

                    <View style={styles.infoCard}>
                        <View style={[styles.infoIconWrap, styles.weekIconWrap]}>
                            <Feather name="calendar" size={30} color="#E2B85B" />
                        </View>

                        <View style={styles.infoContent}>
                            <Text style={styles.infoTitle}>This week so far</Text>
                            <Text style={styles.infoBody}>{weeklyCheckInText}</Text>
                        </View>
                    </View>

                    <View style={styles.actions}>
                        <AppButton
                            label="Check in today"
                            onPress={() => {
                                router.replace("/(tabs)/home");
                            }}
                            style={styles.primaryAction}
                            textStyle={styles.primaryActionText}
                        />

                        <AppButton
                            label="Back to home"
                            onPress={() => {
                                router.replace("/(tabs)/home");
                            }}
                            style={styles.secondaryAction}
                            textStyle={styles.secondaryActionText}
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
        paddingTop: 40,
        paddingBottom: 22,
    },
    content: {
        width: "100%",
        maxWidth: 520,
        alignSelf: "center",
        alignItems: "center",
        paddingHorizontal: 18,
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
        fontSize: 27,
        lineHeight: 34,
        fontFamily: "Fraunces_600SemiBold",
        textAlign: "center",
    },
    pageSubtitle: {
        marginTop: 12,
        color: "#5C6874",
        fontSize: 16,
        lineHeight: 25,
        fontFamily: "Inter_400Regular",
        textAlign: "center",
        maxWidth: 720,
    },
    infoCard: {
        width: "100%",
        marginTop: 22,
        borderRadius: 22,
        backgroundColor: "#FBFAF9",
        paddingHorizontal: 14,
        paddingVertical: 14,
        flexDirection: "row",
        gap: 12,
        shadowColor: "#22313D",
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.04,
        shadowRadius: 18,
        elevation: 1,
    },
    infoIconWrap: {
        width: 68,
        height: 68,
        borderRadius: 34,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    supportIconWrap: {
        backgroundColor: "#E3F0E3",
    },
    weekIconWrap: {
        backgroundColor: "#FBF3DE",
    },
    infoContent: {
        flex: 1,
        justifyContent: "center",
    },
    infoTitle: {
        color: "#25323E",
        fontSize: 19,
        lineHeight: 25,
        fontFamily: "Fraunces_600SemiBold",
    },
    supportChips: {
        marginTop: 10,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    supportChip: {
        borderRadius: 999,
        backgroundColor: "#A8CBB8",
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    supportChipText: {
        color: "#25323E",
        fontSize: 15,
        lineHeight: 19,
        fontFamily: "Inter_500Medium",
    },
    infoBody: {
        marginTop: 10,
        color: "#5C6874",
        fontSize: 16,
        lineHeight: 24,
        fontFamily: "Inter_400Regular",
    },
    actions: {
        width: "100%",
        marginTop: 24,
        gap: 12,
    },
    primaryAction: {
        height: 58,
        backgroundColor: "#2E7876",
    },
    primaryActionText: {
        color: "#FFFFFF",
        fontFamily: "Inter_600SemiBold",
        fontSize: 16,
    },
    secondaryAction: {
        height: 58,
        backgroundColor: "#A8CBB8",
    },
    secondaryActionText: {
        color: "#25323E",
        fontFamily: "Inter_600SemiBold",
        fontSize: 16,
    },
});
