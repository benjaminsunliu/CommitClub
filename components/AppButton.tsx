import { Pressable, StyleProp, Text, TextStyle, ViewStyle } from "react-native";
import { commonStyles } from "../theme/commonStyles";

type AppButtonProps = {
    label: string;
    onPress: () => void;
    variant?: "primary" | "secondary";
    size?: "regular" | "tall";
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
};

export function AppButton({
    label,
    onPress,
    variant = "primary",
    size = "regular",
    style,
    textStyle,
}: AppButtonProps) {
    const containerStyle =
        variant === "primary" ? commonStyles.primaryButton : commonStyles.secondaryButton;
    const labelStyle =
        variant === "primary" ? commonStyles.primaryButtonText : commonStyles.secondaryButtonText;

    return (
        <Pressable
            style={({ pressed }) => [
                containerStyle,
                size === "tall" && { height: 72 },
                pressed && commonStyles.buttonPressed,
                style,
            ]}
            onPress={onPress}
        >
            <Text style={[labelStyle, textStyle]}>{label}</Text>
        </Pressable>
    );
}