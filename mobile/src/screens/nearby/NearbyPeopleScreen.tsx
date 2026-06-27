import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Switch, Alert } from "react-native";
import * as Location from "expo-location";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { nearbyApi, NearbyPerson } from "../../api/nearby";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "NearbyPeople">;

export function NearbyPeopleScreen({ navigation }: Props) {
  const [people, setPeople] = useState<NearbyPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(true);
  const [radius, setRadius] = useState(5);
  const [locationError, setLocationError] = useState<string | null>(null);
  const locationRef = useRef<{ latitude: number; longitude: number } | null>(null);

  const getLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setLocationError("Joylashuvga ruxsat berilmagan");
      return null;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      locationRef.current = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setLocationError(null);
      return locationRef.current;
    } catch {
      setLocationError("Joylashuvni aniqlab bo'lmadi");
      return null;
    }
  }, []);

  const search = useCallback(async () => {
    setLoading(true);
    const loc = await getLocation();
    if (!loc) {
      setLoading(false);
      return;
    }
    try {
      await nearbyApi.updateLocation({ latitude: loc.latitude, longitude: loc.longitude, accuracy: 10 });
      const result = await nearbyApi.findNearby({ latitude: loc.latitude, longitude: loc.longitude, radiusKm: radius });
      setPeople(result);
    } catch {
      Alert.alert("Xatolik", "Yaqin odamlarni topib bo'lmadi");
    }
    setLoading(false);
  }, [radius, getLocation]);

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

      {locationError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>📍 {locationError}</Text>
          <TouchableOpacity onPress={search}>
            <Text style={styles.retryText}>Qayta urinish</Text>
          </TouchableOpacity>
        </View>
      )}

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
              <Avatar uri={item.user.avatarUrl} name={item.user.displayName} size={48} />
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
  errorBanner: { backgroundColor: "#FFF3CD", padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 12, borderRadius: 8, marginBottom: 8 },
  errorText: { fontSize: 13, color: "#856404", flex: 1 },
  retryText: { fontSize: 13, color: colors.primary, fontWeight: "600", marginLeft: 12 },
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
