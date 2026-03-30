import { StyleSheet } from "react-native";
import { colors, fonts } from "./tokens";

export const commonStyles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pageContent: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 24,
  },
  pageTitle: {
    fontFamily: fonts.displaySemibold,
    color: colors.textPrimary,
    fontSize: 32,
    lineHeight: 40,
  },
  pageSubtitle: {
    marginTop: 12,
    color: colors.textSecondary,
    fontFamily: fonts.bodyRegular,
    fontSize: 17,
    lineHeight: 24,
  },
  buttonPressed: {
    opacity: 0.86,
  },
  buttonPillBase: {
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    height: 68,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.buttonPrimary,
  },
  primaryButtonText: {
    color: colors.buttonPrimaryText,
    fontSize: 21,
    fontFamily: fonts.bodySemibold,
    letterSpacing: 0.2,
  },
  secondaryButton: {
    height: 68,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.buttonSecondaryBorder,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.buttonSecondaryBg,
  },
  secondaryButtonText: {
    color: colors.buttonSecondaryText,
    fontSize: 18,
    fontFamily: fonts.bodyMedium,
  },
});
