import { Fraunces_500Medium, Fraunces_600SemiBold } from "@expo-google-fonts/fraunces";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { Href, router, Stack, useRootNavigationState, useSegments } from "expo-router";
import Head from "expo-router/head";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, LogBox, StyleSheet, View } from "react-native";
import { auth, db } from "@/services/firebase";

const publicRoutes = new Set(["", "sign-in", "sign-up"]);
const podOnboardingRoutes = new Set(["pod-setup", "pod-create", "pod-habit-setup"]);

function isPublicRoute(segments: string[]) {
  if (segments.length === 0) {
    return true;
  }

  const rootSegment = segments[0] ?? "";
  return publicRoutes.has(rootSegment);
}

const podSetupPath = "/pod-setup" as Href;
const homePath = "/(tabs)/home" as Href;

function subscribeToUserPodId(
  user: FirebaseUser,
  onPodIdChange: (podId: string | null) => void,
) {
  const userDocRef = doc(db, "users", user.uid);

  return onSnapshot(
    userDocRef,
    (snapshot) => {
      const data = snapshot.data() as { podId?: string | null } | undefined;
      onPodIdChange(data?.podId ?? null);
    },
    (error) => {
      console.warn("Could not read user pod membership", error);
      onPodIdChange("");
    },
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const navigationState = useRootNavigationState();
  const segments = useSegments();
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [hasPod, setHasPod] = useState<boolean | null>(null);

  useEffect(() => {
    LogBox.ignoreLogs([
      "Clipboard has been extracted from react-native core",
    ]);
  }, []);

  useEffect(() => {
    let unsubscribeUserSnapshot: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeUserSnapshot?.();

      if (!user) {
        setIsSignedIn(false);
        setHasPod(null);
        setIsAuthReady(true);
        return;
      }

      setIsSignedIn(true);
      setHasPod(null);
      setIsAuthReady(true);
      unsubscribeUserSnapshot = subscribeToUserPodId(user, (podId) => {
        setHasPod(Boolean(podId));
      });
    });

    return () => {
      unsubscribeUserSnapshot?.();
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (!navigationState?.key || !isAuthReady) {
      return;
    }

    const rootSegment = String(segments[0] ?? "");
    const onPublicRoute = isPublicRoute(segments);
    const onPodOnboardingRoute = podOnboardingRoutes.has(rootSegment);

    if (!isSignedIn) {
      if (!onPublicRoute) {
        router.replace("/");
      }

      return;
    }

    if (hasPod === null) {
      return;
    }

    if (!hasPod) {
      if (!onPodOnboardingRoute) {
        router.replace(podSetupPath);
      }

      return;
    }

    if (onPublicRoute || onPodOnboardingRoute) {
      router.replace(homePath);
    }
  }, [segments, navigationState?.key, isAuthReady, isSignedIn, hasPod]);

  const shouldShowLoadingScreen =
    !fontsLoaded ||
    !navigationState?.key ||
    !isAuthReady ||
    (isSignedIn && hasPod === null);

  if (shouldShowLoadingScreen) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color="#2E7876" />
      </View>
    );
  }

  return (
    <>
      <Head>
        <title>CommitClub</title>
      </Head>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
          animationDuration: 180,
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F1EE",
  },
});
