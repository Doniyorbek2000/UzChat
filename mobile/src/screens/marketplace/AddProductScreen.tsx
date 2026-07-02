import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { marketplaceApi } from "../../api/marketplace";
import { colors } from "../../theme/colors";
import { tr } from "../../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "AddProduct">;

export function AddProductScreen({ route, navigation }: Props) {
  const { storeId } = route.params;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("general");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !price.trim()) {
      Alert.alert(tr("Xatolik"), tr("Nom va narxni kiriting"));
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert(tr("Xatolik"), tr("Narx noto'g'ri"));
      return;
    }
    setSubmitting(true);
    try {
      await marketplaceApi.addProduct(storeId, {
        name: name.trim(),
        description: description.trim() || undefined,
        sku: sku.trim() || undefined,
        price: priceNum,
        stock: parseInt(stock) || 0,
        category: category || "general",
      });
      navigation.goBack();
    } catch {
      Alert.alert(tr("Xatolik"), tr("Mahsulot qo'shib bo'lmadi"));
    }
    setSubmitting(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView keyboardDismissMode="on-drag" style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>{tr("Mahsulot nomi *")}</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={tr("Nom")} placeholderTextColor={colors.textSecondary} maxLength={200} />

      <Text style={styles.label}>{tr("Tavsif")}</Text>
      <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder={tr("Tavsif")} placeholderTextColor={colors.textSecondary} multiline maxLength={2000} />

      <Text style={styles.label}>{tr("SKU (ixtiyoriy)")}</Text>
      <TextInput style={styles.input} value={sku} onChangeText={setSku} placeholder={tr("Mahsulot kodi")} placeholderTextColor={colors.textSecondary} maxLength={50} />

      <Text style={styles.label}>{tr("Kategoriya")}</Text>
      <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder={tr("general")} placeholderTextColor={colors.textSecondary} maxLength={50} />

      <Text style={styles.label}>{tr("Narx (UZS) *")}</Text>
      <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="0" placeholderTextColor={colors.textSecondary} keyboardType="numeric" />

      <Text style={styles.label}>{tr("Zaxira")}</Text>
      <TextInput style={styles.input} value={stock} onChangeText={setStock} placeholder="0" placeholderTextColor={colors.textSecondary} keyboardType="numeric" />

      <TouchableOpacity
        style={[styles.submitBtn, (!name.trim() || !price.trim() || submitting) && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={!name.trim() || !price.trim() || submitting}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{tr("Mahsulot qo'shish")}</Text>}
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16 },
  label: { fontSize: 14, fontWeight: "600", color: colors.text, marginTop: 16, marginBottom: 6 },
  input: {
    backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 15, borderWidth: 1, borderColor: colors.border, color: colors.text,
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 10, alignItems: "center", marginTop: 24 },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
