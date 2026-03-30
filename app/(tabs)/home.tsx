import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type CheckInCardProps = {
    title: string;
    subtitle: string;
    icon: React.ComponentProps<typeof Feather>["name"];
    backgroundColor: string;
    iconDashed?: boolean;
};

function CheckInCard({
    title,
    subtitle,
    icon,
    backgroundColor,
    iconDashed = false,
}: CheckInCardProps) {
    return (
        <TouchableOpacity style={[styles.optionCard, { backgroundColor }]} activeOpacity={0.9}>
            <View style={[styles.optionIconWrap, iconDashed && styles.optionIconWrapDashed]}>
                <Feather name={icon} size={36} color="#22313D" />
            </View>
            <View>
                <Text style={styles.optionTitle}>{title}</Text>
                <Text style={styles.optionSubtitle}>{subtitle}</Text>
            </View>
        </TouchableOpacity>
    );
}

export default function HomeScreen() {
    return (
        <View style={styles.root}>
            <StatusBar style="dark" />
            <SafeAreaView edges={["top"]} style={styles.safeTop}>
                <View style={styles.content}>
                    <View style={styles.topRow}>
                        <Text style={styles.greeting}>Good evening,{"\n"}Benjamin</Text>
                        <TouchableOpacity style={styles.bellButton} activeOpacity={0.85}>
                            <Feather name="bell" size={30} color="#5E6A75" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity activeOpacity={0.9}>
                        <LinearGradient
                            colors={["#A8C9B8", "#2F6F6D"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.goalCard}
                        >
                            <Text style={styles.goalTitle}>Study for 30 minutes</Text>
                            <Text style={styles.goalMeta}>Daily • Study</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <Text style={styles.prompt}>How did today go?</Text>

                    <View style={styles.options}>
                        <CheckInCard
                            title="Done"
                            subtitle="Completed my goal"
                            icon="check-circle"
                            backgroundColor="#7DB38E"
                        />
                        <CheckInCard
                            title="Partial"
                            subtitle="Made some progress"
                            icon="circle"
                            iconDashed
                            backgroundColor="#E0BF78"
                        />
                        <CheckInCard
                            title="Missed"
                            subtitle="Not today"
                            icon="circle"
                            backgroundColor="#B6A6CC"
                        />
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#F3F1EE",
    },
    safeTop: {
        flex: 1,
    },
    content: {
        flex: 1,
        width: "100%",
        maxWidth: 520,
        alignSelf: "center",
        paddingHorizontal: 22,
        paddingTop: 12,
    },
    topRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    greeting: {
        fontFamily: "Fraunces_600SemiBold",
        color: "#25323E",
        fontSize: 34,
        lineHeight: 46,
    },
    bellButton: {
        width: 52,
        height: 52,
        borderRadius: 999,
        backgroundColor: "#F8F8F8",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 2,
    },
    goalCard: {
        marginTop: 16,
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 22,
        overflow: "hidden",
    },
    goalTitle: {
        color: "#F3F5F2",
        fontFamily: "Fraunces_500Medium",
        fontSize: 22,
        lineHeight: 30,
    },
    goalMeta: {
        marginTop: 10,
        color: "#ECF2EE",
        fontSize: 18,
        fontFamily: "Inter_400Regular",
    },
    prompt: {
        marginTop: 22,
        textAlign: "center",
        color: "#25323E",
        fontFamily: "Fraunces_500Medium",
        fontSize: 24,
    },
    options: {
        marginTop: 16,
        gap: 14,
    },
    optionCard: {
        minHeight: 110,
        borderRadius: 24,
        paddingHorizontal: 18,
        paddingVertical: 18,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
    },
    optionIconWrap: {
        width: 50,
        alignItems: "center",
        justifyContent: "center",
    },
    optionIconWrapDashed: {
        borderRadius: 999,
        borderWidth: 2,
        borderColor: "#22313D",
        borderStyle: "dashed",
        width: 50,
        height: 50,
    },
    optionTitle: {
        fontSize: 20,
        fontFamily: "Inter_700Bold",
        color: "#22313D",
        marginBottom: 3,
    },
    optionSubtitle: {
        fontSize: 18,
        color: "#364652",
        fontFamily: "Inter_400Regular",
    },
});