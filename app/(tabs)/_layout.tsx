import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: "#4F847D",
                tabBarInactiveTintColor: "#5C6874",
                tabBarLabelStyle: {
                    fontSize: 15,
                    fontFamily: "Inter_500Medium",
                    marginBottom: 2,
                },
                tabBarStyle: {
                    minHeight: 84,
                    paddingTop: 8,
                    paddingBottom: 10,
                    borderTopColor: "#CAD0D3",
                    backgroundColor: "#F8F8F8",
                },
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color }: { color: string }) => (
                        <Feather name="home" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="pod"
                options={{
                    title: "Pod",
                    tabBarIcon: ({ color }: { color: string }) => (
                        <Feather name="users" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="progress"
                options={{
                    title: "Progress",
                    tabBarIcon: ({ color }: { color: string }) => (
                        <Feather name="trending-up" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color }: { color: string }) => (
                        <Feather name="user" size={24} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}