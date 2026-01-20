/**
 * @description Bottom sheet for adding/editing fees or taxes breakdown items
 */

import { useEffect, useCallback, useRef } from "react";
import { ScrollView, View, TouchableOpacity, TextInput } from "react-native";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { useForm, Controller } from "react-hook-form";
import { ThemedText } from "@/components/themed-text";
import { FormTextInput } from "@/components/form-text-input";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import type React from "react";
import type { TaxBreakdownItem } from "@/utils/api";

interface BreakdownFormData {
    label: string;
    amount: string;
}

interface BreakdownEditSheetProps {
    bottomSheetRef: React.RefObject<TrueSheet | null>;
    type: "tax" | "fee";
    item?: TaxBreakdownItem | null; // null for new item
    onSave: (item: TaxBreakdownItem) => void;
    onClose: () => void;
}

export function BreakdownEditSheet({
    bottomSheetRef,
    type,
    item,
    onSave,
    onClose,
}: BreakdownEditSheetProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    const labelInputRef = useRef<TextInput>(null);
    const shouldAutoFocus = useRef(false);

    const {
        control,
        handleSubmit,
        reset,
        formState: { isValid },
    } = useForm<BreakdownFormData>({
        defaultValues: {
            label: "",
            amount: "",
        },
        mode: "onChange",
    });

    const isEditing = item !== null && item !== undefined;

    useEffect(() => {
        if (item) {
            reset({
                label: item.label || "",
                amount: item.amount?.toFixed(2) || "",
            });
            shouldAutoFocus.current = false;
        } else {
            reset({
                label: "",
                amount: "",
            });
            shouldAutoFocus.current = true;
        }
    }, [item, reset]);

    const handleLabelInputLayout = useCallback(() => {
        if (shouldAutoFocus.current && labelInputRef.current) {
            shouldAutoFocus.current = false;
            setTimeout(() => {
                labelInputRef.current?.focus();
            }, 100);
        }
    }, []);

    const handleSave = handleSubmit((data) => {
        const amountNum = parseFloat(data.amount) || 0;

        const newItem: TaxBreakdownItem = {
            label: data.label.trim(),
            amount: amountNum,
        };

        onSave(newItem);
        bottomSheetRef.current?.dismiss();
        onClose();
    });

    return (
        <TrueSheet
            ref={bottomSheetRef}
            backgroundColor={
                isDark ? Colors.dark.background : Colors.light.background
            }
            scrollable
        >
            <ScrollView
                contentContainerClassName="px-6 py-8"
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
            >
                <View className="flex-row items-center justify-between mb-6">
                    <View>
                        <ThemedText size="lg" weight="semibold">
                            {isEditing ? `Edit ${type === "tax" ? "Tax" : "Fee"}` : `Add ${type === "tax" ? "Tax" : "Fee"}`}
                        </ThemedText>
                    </View>

                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={!isValid}
                        activeOpacity={0.7}
                        className="px-4 py-2 rounded-lg"
                        style={{
                            backgroundColor: isValid
                                ? isDark
                                    ? Colors.dark.tint
                                    : Colors.light.tint
                                : isDark
                                    ? "rgba(255, 255, 255, 0.1)"
                                    : "rgba(0, 0, 0, 0.1)",
                            opacity: isValid ? 1 : 0.5,
                        }}
                    >
                        <ThemedText
                            size="base"
                            weight="semibold"
                            style={{
                                color: isValid
                                    ? isDark
                                        ? "#000000"
                                        : "#FFFFFF"
                                    : isDark
                                        ? "rgba(255, 255, 255, 0.5)"
                                        : "rgba(0, 0, 0, 0.5)",
                            }}
                        >
                            Save
                        </ThemedText>
                    </TouchableOpacity>
                </View>

                <Controller
                    control={control}
                    name="label"
                    rules={{ required: true }}
                    render={({ field: { onChange, onBlur, value } }) => (
                        <FormTextInput
                            ref={labelInputRef}
                            label={`${type === "tax" ? "Tax" : "Fee"} Label *`}
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            placeholder={`e.g. ${type === "tax" ? "Sales Tax" : "Service Fee"}`}
                            onLayout={handleLabelInputLayout}
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="amount"
                    rules={{ required: true }}
                    render={({ field: { onChange, onBlur, value } }) => (
                        <FormTextInput
                            label="Amount *"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            numericOnly
                            min={0}
                            placeholder="0.00"
                        />
                    )}
                />
            </ScrollView>
        </TrueSheet>
    );
}
