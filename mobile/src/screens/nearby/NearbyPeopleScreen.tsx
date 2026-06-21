import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Switch, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { nearbyApi, NearbyPerson } from "../../api/nearby";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "NearbyPeople">;

export function NearbyPeopleScreen({ navigation }: Props) {
  const [people, setPeople] = useState<NearbyPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(true);
  const [radius, setRadius] = useState(5);

  const search = useCallback(async () => {
    setLoading(true);
    try {
      await nearbyApi.updateLocation({ latitude: 41.2995, longitude: 69.2401, accuracy: 10 });
      const result = await nearbyApi.findNearby({ latitude: 41.2995, longitude: 69.2401, radiusKm: radius });
      setPeople(result);
    } catch {
      Alert.alert("Xatolik", "Yaqin odamlarni topib bo'lmadi");
    }
    setLoading(false);
  }, [radius]);

  useEffect(() => { search(); }, [search]);

  const handleVisibilityToggle = async (value: boolean) => {
    setVisible(value);
    try {
      await nearbyApi.setVisibility(value);
    } catch {}
  };

  const formatDistance = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <View style={styles.visibilityRow}>
          <Text style={styles.controlLabel}>Meni ko'rsatish</Text>
          <Switch value={visible} onValueChange={handleVisibilityToggle} trackColor={{ true: colors.primary }} />
        </View>

        <View style={styles.radiusRow}>
          <Text style={styles.controlLabel}>Radius: {radius} km</Text>
          <View style={styles.radiusBtns}>
            {[1, 5, 10, 25].map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.radiusBtn, radius === r && styles.radiusBtnActive]}
                onPress={() => setRadius(r)}
              >
                <Text style={[styles.radiusBtnText, radius === r && styles.radiusBtnTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={people}
          keyExtractor={(item) => item.user.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.personCard}
              onPress={() => navigation.navigate("UserProfile", { userId: item.user.id })}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.user.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.personInfo}>
                <Text style={styles.personName}>{item.user.displayName}</Text>
                <Text style={styles.personUsername}>@{item.user.username}</Text>
                {item.user.bio && <Text style={styles.personBio} numberOfLines={1}>{item.user.bio}</Text>}
              </View>
              <View style={styles.distanceContainer}>
                <Text style={styles.distanceText}>{formatDistance(item.distance)}</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📍</Text>
              <Text style={styles.emptyText}>Yaqinda hech kim topilmadi</Text>
              <Text style={styles.emptyHint}>Radiusni oshirib ko'ring</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  controls: { backgroundColor: "#fff", padding: 16, marginBottom: 8 },
  visibilityRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  controlLabel: { fontSize: 15, fontWeight: "600", color: "#333" },
  radiusRow: { gap: 8 },
  radiusBtns: { flexDirection: "row", gap: 8, marginTop: 8 },
  radiusBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8, backgroundColor: "#E5E5EA" },
  radiusBtnActive: { backgroundColor: colors.primary },
  radiusBtnText: { fontSize: 13, fontWeight: "600", color: "#666" },
  radiusBtnTextActive: { color: "#fff" },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  personCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "700", color: "#fff" },
  personInfo: { flex: 1 },
  personName: { fontSize: 15, fontWeight: "600", color: "#333" },
  personUsername: { fontSize: 13, color: "#888", marginTop: 1 },
  personBio: { fontSize: 12, color: "#666", marginTop: 2 },
  distanceContainer: { backgroundColor: "#F0F0F5", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  distanceText: { fontSize: 12, fontWeight: "600", color: colors.primary },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#333", marginTop: 12 },
  emptyHint: { fontSize: 13, color: "#888", marginTop: 4 },
});
