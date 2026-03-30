import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { commonStyles } from "../../theme/commonStyles";

export default function PodScreen() {
    return (
        <SafeAreaView style={commonStyles.screenRoot} edges={["top"]}>
            <StatusBar style="dark" />
            <View style={commonStyles.pageContent}>
                <Text style={commonStyles.pageTitle}>Pod</Text>
                <Text style={commonStyles.pageSubtitle}>The private accountability pod will be here.</Text>
            </View>
        </SafeAreaView>
    );
}