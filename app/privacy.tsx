import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function PrivacyCard({
    icon,
    accentColor,
    backgroundColor,
    title,
    body,
}: {
    icon: React.ComponentProps<typeof Feather>["name"];
    accentColor: string;
    backgroundColor: string;
    title: string;
    body: string;
}) {
    return (
        <View style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor }]}>
                <Feather name={icon} size={28} color={accentColor} />
            </View>
            <View style={styles.cardTextWrap}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardBody}>{body}</Text>
            </View>
        </View>
    );
}

export default function PrivacyScreen() {
    function handleBack() {
        if (router.canGoBack()) {
            router.back();
            return;
        }

        router.replace("/(tabs)/profile");
    }

    return (
        <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
            <StatusBar style="dark" />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.content}>
                    <View style={styles.headerRow}>
                        <Pressable
                            style={({ pressed }) => [
                                styles.backButton,
                                pressed && styles.backButtonPressed,
                            ]}
                            onPress={handleBack}
                        >
                            <Feather name="arrow-left" size={30} color="#25323E" />
                        </Pressable>
                        <Text style={styles.pageTitle}>Privacy</Text>
                    </View>

                    <Text style={styles.pageSubtitle}>
                        CommitClub is built to keep accountability small, supportive, and
                        private.
                    </Text>

                    <PrivacyCard
                        icon="users"
                        accentColor="#2D6E71"
                        backgroundColor="#E6EBE8"
                        title="What your pod can see"
                        body="Your pod can see your display name, whether you marked a day done, partial, or missed, and the supportive reactions you send inside the pod."
                    />

                    <PrivacyCard
                        icon="mail"
                        accentColor="#72BE86"
                        backgroundColor="#E3F0E3"
                        title="What stays private"
                        body="Your email address, reminder settings, and account details are not shown to other pod members."
                    />

                    <PrivacyCard
                        icon="database"
                        accentColor="#E2B85B"
                        backgroundColor="#FBF3DE"
                        title="How your data is used"
                        body="We store your account, check-ins, and pod support activity so your pod, progress, recovery, and notification screens stay in sync."
                    />

                    <View style={styles.footerCard}>
                        <Text style={styles.footerTitle}>A simple rule of thumb</Text>
                        <Text style={styles.footerBody}>
                            CommitClub shares just enough with your pod to make support
                            feel real, without turning your habit into a public scoreboard.
                        </Text>
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
        paddingTop: 8,
        paddingBottom: 24,
    },
    content: {
        width: "100%",
        maxWidth: 520,
        alignSelf: "center",
        paddingHorizontal: 18,
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
    pageTitle: {
        color: "#25323E",
        fontSize: 34,
        lineHeight: 40,
        fontFamily: "Fraunces_600SemiBold",
    },
    pageSubtitle: {
        marginTop: 16,
        color: "#5C6874",
        fontSize: 17,
        lineHeight: 25,
        fontFamily: "Inter_400Regular",
    },
    card: {
        marginTop: 18,
        borderRadius: 24,
        backgroundColor: "#FBFAF9",
        paddingHorizontal: 18,
        paddingVertical: 18,
        flexDirection: "row",
        gap: 14,
    },
    iconWrap: {
        width: 68,
        height: 68,
        borderRadius: 34,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    cardTextWrap: {
        flex: 1,
    },
    cardTitle: {
        color: "#25323E",
        fontSize: 20,
        lineHeight: 26,
        fontFamily: "Fraunces_500Medium",
    },
    cardBody: {
        marginTop: 8,
        color: "#5C6874",
        fontSize: 16,
        lineHeight: 24,
        fontFamily: "Inter_400Regular",
    },
    footerCard: {
        marginTop: 18,
        borderRadius: 24,
        backgroundColor: "#FBFAF9",
        paddingHorizontal: 18,
        paddingVertical: 18,
    },
    footerTitle: {
        color: "#25323E",
        fontSize: 20,
        lineHeight: 26,
        fontFamily: "Fraunces_500Medium",
        textAlign: "center",
    },
    footerBody: {
        marginTop: 10,
        color: "#5C6874",
        fontSize: 16,
        lineHeight: 24,
        fontFamily: "Inter_400Regular",
        textAlign: "center",
    },
});
