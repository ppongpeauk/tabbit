/**
 * @description Bottom sheet for editing receipt totals (tax, subtotal, etc.)
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { View, TouchableOpacity, ScrollView, Alert } from "react-native";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import type { StoredReceipt } from "@/utils/storage";
import type { TaxBreakdownItem } from "@/utils/api";
import { BreakdownEditSheet } from "@/components/breakdown-edit-sheet";
import { formatCurrency } from "@/utils/format";

interface EditTotalsSheetProps {
    bottomSheetRef: React.RefObject<TrueSheet | null>;
    receipt: StoredReceipt | null;
    onSave: (updates: Partial<StoredReceipt["totals"]>) => void;
    onClose: () => void;
}

export function EditTotalsSheet({
    bottomSheetRef,
    receipt,
    onSave,
    onClose,
}: EditTotalsSheetProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    const [subtotal, setSubtotal] = useState("0");
    const [tax, setTax] = useState("0");
    const [fees, setFees] = useState("0");
    const [taxBreakdown, setTaxBreakdown] = useState<TaxBreakdownItem[]>([]);
    const [feesBreakdown, setFeesBreakdown] = useState<TaxBreakdownItem[]>([]);

    const [editingBreakdown, setEditingBreakdown] = useState<{
        type: "tax" | "fee";
        item: TaxBreakdownItem | null;
        index: number | null;
    } | null>(null);

    const breakdownSheetRef = useRef<TrueSheet | null>(null);

    useEffect(() => {
        if (receipt) {
            setSubtotal(receipt.totals.subtotal.toFixed(2));
            setTax(receipt.totals.tax.toFixed(2));
            setFees((receipt.totals.fees || 0).toFixed(2));
            setTaxBreakdown(receipt.totals.taxBreakdown || []);
            setFeesBreakdown(receipt.totals.feesBreakdown || []);
        }
    }, [receipt]);

    const handleClose = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        bottomSheetRef.current?.dismiss();
        onClose();
    }, [bottomSheetRef, onClose]);

    const handleAddBreakdown = useCallback((type: "tax" | "fee") => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setEditingBreakdown({ type, item: null, index: null });
        breakdownSheetRef.current?.present();
    }, []);

    const handleEditBreakdown = useCallback(
        (type: "tax" | "fee", index: number) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const item = type === "tax" ? taxBreakdown[index] : feesBreakdown[index];
            setEditingBreakdown({ type, item, index });
            breakdownSheetRef.current?.present();
        },
        [taxBreakdown, feesBreakdown]
    );

    const handleBreakdownSave = useCallback(
        (item: TaxBreakdownItem) => {
            if (!editingBreakdown) return;

            if (editingBreakdown.type === "tax") {
                const newBreakdown = [...taxBreakdown];
                if (editingBreakdown.index !== null) {
                    newBreakdown[editingBreakdown.index] = item;
                } else {
                    newBreakdown.push(item);
                }
                setTaxBreakdown(newBreakdown);
                const newTaxTotal = newBreakdown.reduce((sum, i) => sum + i.amount, 0);
                setTax(newTaxTotal.toFixed(2));
            } else {
                const newBreakdown = [...feesBreakdown];
                if (editingBreakdown.index !== null) {
                    newBreakdown[editingBreakdown.index] = item;
                } else {
                    newBreakdown.push(item);
                }
                setFeesBreakdown(newBreakdown);
                const newFeesTotal = newBreakdown.reduce((sum, i) => sum + i.amount, 0);
                setFees(newFeesTotal.toFixed(2));
            }
        },
        [editingBreakdown, taxBreakdown, feesBreakdown]
    );

    const handleBreakdownSheetClose = useCallback(() => {
        setEditingBreakdown(null);
    }, []);

    const removeBreakdown = useCallback(
        (type: "tax" | "fee", index: number) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Alert.alert(
                `Delete ${type === "tax" ? "Tax" : "Fee"}`,
                "Are you sure you want to delete this?",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            if (type === "tax") {
                                const newBreakdown = taxBreakdown.filter((_, i) => i !== index);
                                setTaxBreakdown(newBreakdown);
                                const newTaxTotal = newBreakdown.reduce((sum, i) => sum + i.amount, 0);
                                setTax(newTaxTotal.toFixed(2));
                            } else {
                                const newBreakdown = feesBreakdown.filter((_, i) => i !== index);
                                setFeesBreakdown(newBreakdown);
                                const newFeesTotal = newBreakdown.reduce((sum, i) => sum + i.amount, 0);
                                setFees(newFeesTotal.toFixed(2));
                            }
                        },
                    },
                ]
            );
        },
        [taxBreakdown, feesBreakdown]
    );

    const handleSave = useCallback(() => {
        const s = parseFloat(subtotal) || 0;
        const t = parseFloat(tax) || 0;
        const f = parseFloat(fees) || 0;

        const updates: Partial<StoredReceipt["totals"]> = {
            subtotal: s,
            tax: t,
            taxBreakdown: taxBreakdown.length > 0 ? taxBreakdown : undefined,
            fees: f,
            feesBreakdown: feesBreakdown.length > 0 ? feesBreakdown : undefined,
            total: s + t + f,
        };

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave(updates);
        bottomSheetRef.current?.dismiss();
    }, [subtotal, tax, fees, taxBreakdown, feesBreakdown, onSave, bottomSheetRef]);

    const iconColor = isDark ? Colors.dark.icon : Colors.light.icon;

    return (
        <TrueSheet
            ref={bottomSheetRef}
            detents={["auto"]}
            backgroundColor={
                isDark ? Colors.dark.background : Colors.light.background
            }
            scrollable
        >
            <ScrollView
                contentContainerClassName="px-6 py-8"
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
            >
                <View className="flex-row items-center justify-between mb-6">
                    <ThemedText size="xl" weight="bold">
                        Edit Totals
                    </ThemedText>
                    <TouchableOpacity
                        onPress={handleClose}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <SymbolView
                            name="xmark.circle.fill"
                            tintColor={iconColor}
                            size={28}
                        />
                    </TouchableOpacity>
                </View>


                <View className="mt-4">
                    <View className="mb-3">
                        <ThemedText size="lg" weight="semibold">
                            Taxes
                        </ThemedText>
                    </View>

                    {taxBreakdown.map((item, index) => (
                        <View
                            key={index}
                            className="mb-3 rounded-xl p-4 border flex-row items-center justify-between"
                            style={{
                                backgroundColor: isDark
                                    ? "rgba(255, 255, 255, 0.05)"
                                    : "rgba(0, 0, 0, 0.02)",
                                borderColor: isDark
                                    ? "rgba(255, 255, 255, 0.1)"
                                    : "rgba(0, 0, 0, 0.1)",
                            }}
                        >
                            <View className="flex-1">
                                <ThemedText size="base" weight="semibold">
                                    {item.label}
                                </ThemedText>
                            </View>
                            <View className="flex-row items-center gap-3">
                                <ThemedText size="base" weight="semibold" family="sans">
                                    {formatCurrency(item.amount, receipt?.totals.currency || "USD")}
                                </ThemedText>
                                <View className="flex-row gap-1">
                                    <TouchableOpacity
                                        onPress={() => handleEditBreakdown("tax", index)}
                                        className="p-2"
                                    >
                                        <SymbolView
                                            name="square.and.pencil"
                                            size={16}
                                            tintColor={isDark ? Colors.dark.tint : Colors.light.tint}
                                        />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => removeBreakdown("tax", index)}
                                        className="p-2"
                                    >
                                        <SymbolView name="trash" size={16} tintColor="#FF3B30" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    ))}

                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleAddBreakdown("tax")}
                        className={`rounded-xl p-4 mb-4 ${isDark ? "bg-[#1A1D1E]" : "bg-white"}`}
                        style={{
                            borderWidth: 1,
                            borderStyle: "dashed",
                            borderColor: isDark
                                ? "rgba(255, 255, 255, 0.2)"
                                : "rgba(0, 0, 0, 0.2)",
                        }}
                    >
                        <View className="flex-row items-center gap-3">
                            <View
                                className="w-8 h-8 rounded-full items-center justify-center"
                                style={{
                                    backgroundColor: isDark
                                        ? "rgba(255, 255, 255, 0.1)"
                                        : "rgba(0, 0, 0, 0.05)",
                                }}
                            >
                                <SymbolView
                                    name="plus"
                                    tintColor={isDark ? Colors.dark.tint : Colors.light.tint}
                                    size={18}
                                />
                            </View>
                            <View className="flex-1">
                                <ThemedText size="base" weight="semibold">
                                    Add Tax
                                </ThemedText>
                            </View>
                            <SymbolView
                                name="chevron.right"
                                tintColor={isDark ? Colors.dark.subtle : Colors.light.icon}
                                size={14}
                            />
                        </View>
                    </TouchableOpacity>

                </View>

                <View className="mt-4">
                    <View className="mb-3">
                        <ThemedText size="lg" weight="semibold">
                            Fees
                        </ThemedText>
                    </View>

                    {feesBreakdown.map((item, index) => (
                        <View
                            key={index}
                            className="mb-3 rounded-xl p-4 border flex-row items-center justify-between"
                            style={{
                                backgroundColor: isDark
                                    ? "rgba(255, 255, 255, 0.05)"
                                    : "rgba(0, 0, 0, 0.02)",
                                borderColor: isDark
                                    ? "rgba(255, 255, 255, 0.1)"
                                    : "rgba(0, 0, 0, 0.1)",
                            }}
                        >
                            <View className="flex-1">
                                <ThemedText size="base" weight="semibold">
                                    {item.label}
                                </ThemedText>
                            </View>
                            <View className="flex-row items-center gap-3">
                                <ThemedText size="base" weight="semibold" family="sans">
                                    {formatCurrency(item.amount, receipt?.totals.currency || "USD")}
                                </ThemedText>
                                <View className="flex-row gap-1">
                                    <TouchableOpacity
                                        onPress={() => handleEditBreakdown("fee", index)}
                                        className="p-2"
                                    >
                                        <SymbolView
                                            name="square.and.pencil"
                                            size={16}
                                            tintColor={isDark ? Colors.dark.tint : Colors.light.tint}
                                        />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => removeBreakdown("fee", index)}
                                        className="p-2"
                                    >
                                        <SymbolView name="trash" size={16} tintColor="#FF3B30" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    ))}

                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleAddBreakdown("fee")}
                        className={`rounded-xl p-4 mb-4 ${isDark ? "bg-[#1A1D1E]" : "bg-white"}`}
                        style={{
                            borderWidth: 1,
                            borderStyle: "dashed",
                            borderColor: isDark
                                ? "rgba(255, 255, 255, 0.2)"
                                : "rgba(0, 0, 0, 0.2)",
                        }}
                    >
                        <View className="flex-row items-center gap-3">
                            <View
                                className="w-8 h-8 rounded-full items-center justify-center"
                                style={{
                                    backgroundColor: isDark
                                        ? "rgba(255, 255, 255, 0.1)"
                                        : "rgba(0, 0, 0, 0.05)",
                                }}
                            >
                                <SymbolView
                                    name="plus"
                                    tintColor={isDark ? Colors.dark.tint : Colors.light.tint}
                                    size={18}
                                />
                            </View>
                            <View className="flex-1">
                                <ThemedText size="base" weight="semibold">
                                    Add Fee
                                </ThemedText>
                            </View>
                            <SymbolView
                                name="chevron.right"
                                tintColor={isDark ? Colors.dark.subtle : Colors.light.icon}
                                size={14}
                            />
                        </View>
                    </TouchableOpacity>

                </View>

                <View className="flex-row gap-4 mt-6">
                    <Button variant="secondary" onPress={handleClose} style={{ flex: 1 }}>
                        Cancel
                    </Button>
                    <Button variant="primary" onPress={handleSave} style={{ flex: 1 }}>
                        Save Changes
                    </Button>
                </View>
            </ScrollView>

            {editingBreakdown && (
                <BreakdownEditSheet
                    bottomSheetRef={breakdownSheetRef}
                    type={editingBreakdown.type}
                    item={editingBreakdown.item}
                    onSave={handleBreakdownSave}
                    onClose={handleBreakdownSheetClose}
                />
            )}
        </TrueSheet>
    );
}
