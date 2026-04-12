import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import {
    STATUS_COLORS,
    pluralizeCheckIn,
    pluralizeDay,
    useWeeklyProgressData,
} from "@/hooks/useWeeklyProgress";

type LegendRowProps = {
    color: string;
    label: string;
    value: number;
};

function LegendRow({ color, label, value }: LegendRowProps) {
    return (
        <View style={styles.legendRow}>
            <View style={styles.legendLabelWrap}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={styles.legendLabel}>{label}</Text>
            </View>
            <Text style={styles.legendValue}>
                {value} {pluralizeDay(value)}
            </Text>
        </View>
    );
}

export default function ProgressScreen() {
    const {
        isLoading,
        weekDays,
        doneCount,
        partialCount,
        missedCount,
        checkInCount,
        podActiveDays,
        heroMessage,
        recoveryInsight,
    } = useWeeklyProgressData();

    function handleViewWeeklySummary() {
        if (isLoading) {
            return;
        }

        router.push("/weekly-summary");
    }

    return (
        <SafeAreaView style={styles.root} edges={["top"]}>
            <StatusBar style="dark" />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.content}>
                    <Text style={styles.pageTitle}>Your progress</Text>

                    <LinearGradient
                        colors={["#3E7E79", "#ABCDB9"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroCard}
                    >
                        <View style={styles.heroHeader}>
                            <Feather name="trending-up" size={28} color="#F7FAF8" />
                            <Text style={styles.heroLabel}>This week</Text>
                        </View>
                        <Text
                            style={styles.heroValue}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.72}
                        >
                            {isLoading ? "Loading..." : `${checkInCount} ${pluralizeCheckIn(checkInCount)}`}
                        </Text>
                        <Text style={styles.heroSubtitle}>
                            {isLoading ? "Pulling in your latest check-ins" : heroMessage}
                        </Text>
                    </LinearGradient>

                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Recent activity</Text>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.iconButton,
                                    pressed && styles.iconButtonPressed,
                                ]}
                                onPress={handleViewWeeklySummary}
                                disabled={isLoading}
                            >
                                <Feather name="calendar" size={26} color="#5E6A75" />
                            </Pressable>
                        </View>

                        <View style={styles.activityRow}>
                            {weekDays.map((day) => (
                                <View key={day.dateKey} style={styles.activityDay}>
                                    <Text style={styles.activityDayLabel}>{day.label}</Text>
                                    <View
                                        style={[
                                            styles.activityDot,
                                            { backgroundColor: STATUS_COLORS[day.status] },
                                        ]}
                                    />
                                </View>
                            ))}
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.legendList}>
                            <LegendRow color={STATUS_COLORS.done} label="Done" value={doneCount} />
                            <LegendRow
                                color={STATUS_COLORS.partial}
                                label="Partial"
                                value={partialCount}
                            />
                            <LegendRow
                                color={STATUS_COLORS.missed}
                                label="Missed"
                                value={missedCount}
                            />
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Recovery insight</Text>
                        <Text style={styles.cardBody}>
                            {isLoading
                                ? "Looking at your recent pattern..."
                                : recoveryInsight}
                        </Text>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Pod consistency</Text>
                        <Text style={styles.cardBody}>
                            {isLoading ? (
                                "Pulling in your pod activity..."
                            ) : (
                                <>
                                    Your pod stayed active{" "}
                                    <Text style={styles.cardHighlight}>
                                        {podActiveDays} out of 7 days
                                    </Text>{" "}
                                    this week.
                                </>
                            )}
                        </Text>
                        <Text style={styles.cardFooter}>Small circles, big support.</Text>
                    </View>

                    <AppButton
                        label="View weekly summary"
                        onPress={handleViewWeeklySummary}
                        disabled={isLoading}
                        style={styles.summaryButton}
                        textStyle={styles.summaryButtonText}
                    />
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
        paddingBottom: 132,
    },
    content: {
        width: "100%",
        maxWidth: 520,
        alignSelf: "center",
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    pageTitle: {
        color: "#25323E",
        fontSize: 36,
        lineHeight: 43,
        fontFamily: "Fraunces_600SemiBold",
    },
    heroCard: {
        marginTop: 20,
        borderRadius: 28,
        paddingHorizontal: 22,
        paddingVertical: 22,
    },
    heroHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    heroLabel: {
        color: "#F7FAF8",
        fontSize: 21,
        lineHeight: 28,
        fontFamily: "Fraunces_600SemiBold",
    },
    heroValue: {
        marginTop: 18,
        color: "#FBFDFC",
        fontSize: 48,
        lineHeight: 52,
        fontFamily: "Inter_400Regular",
    },
    heroSubtitle: {
        marginTop: 8,
        color: "#F2F7F4",
        fontSize: 17,
        lineHeight: 24,
        fontFamily: "Inter_500Medium",
    },
    card: {
        marginTop: 20,
        borderRadius: 28,
        paddingHorizontal: 22,
        paddingVertical: 22,
        backgroundColor: "#FBFAF9",
        shadowColor: "#22313D",
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.04,
        shadowRadius: 18,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    cardTitle: {
        color: "#25323E",
        fontSize: 23,
        lineHeight: 30,
        fontFamily: "Fraunces_600SemiBold",
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    iconButtonPressed: {
        opacity: 0.7,
    },
    activityRow: {
        marginTop: 22,
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 6,
    },
    activityDay: {
        flex: 1,
        alignItems: "center",
    },
    activityDayLabel: {
        color: "#5C6874",
        fontSize: 14,
        lineHeight: 20,
        fontFamily: "Inter_500Medium",
    },
    activityDot: {
        width: 38,
        height: 38,
        borderRadius: 999,
        marginTop: 12,
    },
    divider: {
        height: 1,
        marginTop: 24,
        backgroundColor: "#E0E3E6",
    },
    legendList: {
        marginTop: 20,
        gap: 16,
    },
    legendRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    legendLabelWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 999,
    },
    legendLabel: {
        color: "#5C6874",
        fontSize: 17,
        lineHeight: 23,
        fontFamily: "Inter_500Medium",
    },
    legendValue: {
        color: "#25323E",
        fontSize: 17,
        lineHeight: 23,
        fontFamily: "Inter_600SemiBold",
    },
    cardBody: {
        marginTop: 16,
        color: "#5C6874",
        fontSize: 17,
        lineHeight: 28,
        fontFamily: "Inter_400Regular",
    },
    cardHighlight: {
        color: "#2E7876",
        fontFamily: "Inter_600SemiBold",
    },
    cardFooter: {
        marginTop: 18,
        color: "#5C6874",
        fontSize: 17,
        lineHeight: 24,
        fontFamily: "Inter_500Medium",
    },
    summaryButton: {
        marginTop: 24,
        height: 64,
        backgroundColor: "#A8CBB8",
    },
    summaryButtonText: {
        color: "#25323E",
        fontFamily: "Inter_600SemiBold",
        fontSize: 17,
    },
});
