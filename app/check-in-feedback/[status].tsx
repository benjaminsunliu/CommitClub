import { Feather, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type CheckInStatus = "done" | "partial" | "missed";

type FeedbackConfig = {
    badgeColor: string;
    title: string;
    subtitle: string;
    showSupportCard: boolean;
    showRecoveryCta: boolean;
};

const feedbackByStatus: Record<CheckInStatus, FeedbackConfig> = {
    done: {
        badgeColor: "#7DB38E",
        title: "Nice work",
        subtitle: "You showed up today.",
        showSupportCard: true,
        showRecoveryCta: false,
    },
    partial: {
        badgeColor: "#E0BF78",
        title: "Partial still counts",
        subtitle: "Progress is progress.",
        showSupportCard: true,
        showRecoveryCta: false,
    },
    missed: {
        badgeColor: "#B6A6CC",
        title: "That's okay",
        subtitle: "You can start fresh tomorrow.",
        showSupportCard: false,
        showRecoveryCta: true,
    },
};

function getStatusParam(value: string | string[] | undefined): CheckInStatus {
    const status = Array.isArray(value) ? value[0] : value;

    if (status === "done" || status === "partial" || status === "missed") {
        return status;
    }

    return "done";
}

function StatusBadge({ status }: { status: CheckInStatus }) {
    if (status === "done") {
        return <Feather name="check-circle" size={96} color="#22313D" />;
    }

    if (status === "partial") {
        return <View style={styles.partialRing} />;
    }

    return <View style={styles.missedRing} />;
}

export default function CheckInFeedbackScreen() {
    const params = useLocalSearchParams<{ status?: string | string[] }>();
    const status = getStatusParam(params.status);
    const config = feedbackByStatus[status];
    const badgeOpacity = useRef(new Animated.Value(0)).current;
    const badgeScale = useRef(new Animated.Value(0.96)).current;
    const badgeTranslateY = useRef(new Animated.Value(8)).current;
    const headingOpacity = useRef(new Animated.Value(0)).current;
    const headingTranslateY = useRef(new Animated.Value(12)).current;
    const supportOpacity = useRef(new Animated.Value(0)).current;
    const supportTranslateY = useRef(new Animated.Value(12)).current;
    const actionsOpacity = useRef(new Animated.Value(0)).current;
    const actionsTranslateY = useRef(new Animated.Value(12)).current;

    useEffect(() => {
        const showSupport = config.showSupportCard;

        badgeOpacity.setValue(0);
        badgeScale.setValue(0.96);
        badgeTranslateY.setValue(8);
        headingOpacity.setValue(0);
        headingTranslateY.setValue(12);
        supportOpacity.setValue(showSupport ? 0 : 1);
        supportTranslateY.setValue(showSupport ? 12 : 0);
        actionsOpacity.setValue(0);
        actionsTranslateY.setValue(12);

        const sequence: Animated.CompositeAnimation[] = [
            Animated.parallel([
                Animated.timing(badgeOpacity, {
                    toValue: 1,
                    duration: 220,
                    useNativeDriver: true,
                }),
                Animated.timing(badgeScale, {
                    toValue: 1,
                    duration: 260,
                    useNativeDriver: true,
                }),
                Animated.timing(badgeTranslateY, {
                    toValue: 0,
                    duration: 260,
                    useNativeDriver: true,
                }),
            ]),
            Animated.parallel([
                Animated.timing(headingOpacity, {
                    toValue: 1,
                    duration: 220,
                    useNativeDriver: true,
                }),
                Animated.timing(headingTranslateY, {
                    toValue: 0,
                    duration: 220,
                    useNativeDriver: true,
                }),
            ]),
        ];

        if (showSupport) {
            sequence.push(
                Animated.parallel([
                    Animated.timing(supportOpacity, {
                        toValue: 1,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                    Animated.timing(supportTranslateY, {
                        toValue: 0,
                        duration: 220,
                        useNativeDriver: true,
                    }),
                ]),
            );
        }

        sequence.push(
            Animated.parallel([
                Animated.timing(actionsOpacity, {
                    toValue: 1,
                    duration: 220,
                    useNativeDriver: true,
                }),
                Animated.timing(actionsTranslateY, {
                    toValue: 0,
                    duration: 220,
                    useNativeDriver: true,
                }),
            ]),
        );

        Animated.sequence(sequence).start();
    }, [
        actionsOpacity,
        actionsTranslateY,
        badgeOpacity,
        badgeScale,
        badgeTranslateY,
        config.showSupportCard,
        headingOpacity,
        headingTranslateY,
        supportOpacity,
        supportTranslateY,
    ]);

    return (
        <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
            <StatusBar style="dark" />
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <Animated.View
                    style={[
                        styles.badgeCircle,
                        { backgroundColor: config.badgeColor },
                        {
                            opacity: badgeOpacity,
                            transform: [{ translateY: badgeTranslateY }, { scale: badgeScale }],
                        },
                    ]}
                >
                    <StatusBadge status={status} />
                </Animated.View>

                <Animated.View
                    style={[
                        styles.headingGroup,
                        {
                            opacity: headingOpacity,
                            transform: [{ translateY: headingTranslateY }],
                        },
                    ]}
                >
                    <Text style={styles.title}>{config.title}</Text>
                    <Text style={styles.subtitle}>{config.subtitle}</Text>
                </Animated.View>

                {config.showSupportCard && (
                    <Animated.View
                        style={[
                            styles.supportCard,
                            {
                                opacity: supportOpacity,
                                transform: [{ translateY: supportTranslateY }],
                            },
                        ]}
                    >
                        <Ionicons
                            name="sparkles-outline"
                            size={32}
                            color="#2E7876"
                            style={styles.supportIcon}
                        />
                        <Text style={styles.supportText}>
                            Your pod is here for you. Send a supportive reaction or check on your
                            friends.
                        </Text>
                    </Animated.View>
                )}

                <Animated.View
                    style={[
                        styles.actions,
                        {
                            opacity: actionsOpacity,
                            transform: [{ translateY: actionsTranslateY }],
                        },
                    ]}
                >
                    {config.showRecoveryCta && (
                        <Pressable
                            onPress={() => {
                                router.replace("/(tabs)/progress");
                            }}
                            style={({ pressed }) => [
                                styles.actionButton,
                                styles.recoveryButton,
                                pressed && styles.buttonPressed,
                            ]}
                        >
                            <Text style={styles.recoveryButtonText}>View recovery tips</Text>
                        </Pressable>
                    )}

                    <Pressable
                        onPress={() => {
                            router.replace("/(tabs)/home");
                        }}
                        style={({ pressed }) => [
                            styles.actionButton,
                            styles.homeButton,
                            pressed && styles.buttonPressed,
                        ]}
                    >
                        <Text style={styles.homeButtonText}>Back to home</Text>
                    </Pressable>
                </Animated.View>
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
        width: "100%",
        maxWidth: 520,
        alignSelf: "center",
        alignItems: "center",
        paddingHorizontal: 22,
        paddingTop: 76,
        paddingBottom: 40,
    },
    badgeCircle: {
        width: 190,
        height: 190,
        borderRadius: 95,
        alignItems: "center",
        justifyContent: "center",
    },
    partialRing: {
        width: 92,
        height: 92,
        borderRadius: 999,
        borderWidth: 7,
        borderStyle: "dashed",
        borderColor: "#22313D",
    },
    missedRing: {
        width: 92,
        height: 92,
        borderRadius: 999,
        borderWidth: 7,
        borderColor: "#22313D",
    },
    headingGroup: {
        marginTop: 36,
        alignItems: "center",
    },
    title: {
        color: "#25323E",
        fontFamily: "Fraunces_600SemiBold",
        fontSize: 32,
        lineHeight: 40,
        textAlign: "center",
    },
    subtitle: {
        marginTop: 12,
        color: "#5C6874",
        fontFamily: "Inter_500Medium",
        fontSize: 17,
        lineHeight: 24,
        textAlign: "center",
    },
    supportCard: {
        marginTop: 36,
        width: "100%",
        backgroundColor: "#F8F8F8",
        borderRadius: 28,
        flexDirection: "row",
        alignItems: "flex-start",
        paddingHorizontal: 20,
        paddingVertical: 22,
    },
    supportIcon: {
        marginTop: 2,
        marginRight: 14,
    },
    supportText: {
        flex: 1,
        color: "#5C6874",
        fontFamily: "Inter_400Regular",
        fontSize: 18,
        lineHeight: 24,
    },
    actions: {
        width: "100%",
        marginTop: 34,
        gap: 18,
    },
    actionButton: {
        height: 68,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
    },
    recoveryButton: {
        backgroundColor: "#9ABFAE",
    },
    homeButton: {
        backgroundColor: "#2E7876",
    },
    recoveryButtonText: {
        color: "#25323E",
        fontFamily: "Inter_600SemiBold",
        fontSize: 20,
    },
    homeButtonText: {
        color: "#F6F6F6",
        fontFamily: "Inter_600SemiBold",
        fontSize: 20,
    },
    buttonPressed: {
        opacity: 0.86,
    },
});
