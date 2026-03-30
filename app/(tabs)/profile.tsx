import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { commonStyles } from "../../theme/commonStyles";

export default function ProfileScreen() {
    return (
        <SafeAreaView style={commonStyles.screenRoot} edges={["top"]}>
            <StatusBar style="dark" />
            <View style={commonStyles.pageContent}>
                <Text style={commonStyles.pageTitle}>Profile</Text>
                <Text style={commonStyles.pageSubtitle}>Account settings and preferences on this page.</Text>
            </View>
        </SafeAreaView>
    );
}