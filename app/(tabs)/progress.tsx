import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { commonStyles } from "../../theme/commonStyles";

export default function ProgressScreen() {
    return (
        <SafeAreaView style={commonStyles.screenRoot} edges={["top"]}>
            <StatusBar style="dark" />
            <View style={commonStyles.pageContent}>
                <Text style={commonStyles.pageTitle}>Progress</Text>
                <Text style={commonStyles.pageSubtitle}>Consistency trends and check-in history.</Text>
            </View>
        </SafeAreaView>
    );
}