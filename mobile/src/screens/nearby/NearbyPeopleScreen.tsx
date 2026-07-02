import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Switch, Alert } from "react-native";
import * as Location from "expo-location";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { nearbyApi, NearbyPerson } from "../../api/nearby";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";
import { tr } from "../../i18n";

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
      Alert.alert(tr("Xatolik"), tr("Yaqin odamlarni topib bo'lmadi"));
    }
    setLoading(false);
  }, [radius, getLocation]);

  useEffect(() => { search(); }, [search]);

  const handleVisibilityToggle = async (value: boolean) => {
    setVisible(value);
    try {
      await nearbyApi.setVisibility(value);
    } catch {
      setVisible(!value);
      Alert.alert(tr("Xatolik"), tr("Ko'rinishni o'zgartirib bo'lmadi"));
    }
  };

  const formatDistance = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <View style={styles.visibilityRow}>
          <View style={styles.visibilityLabel}>
            <Text style={styles.controlIcon}>👁</Text>
            <Text style={styles.controlLabelText}>{tr("Meni ko'rsatish")}</Text>
          </View>
          <Switch value={visible} onValueChange={handleVisibilityToggle} trackColor={{ true: colors.primary }} />
        </View>

        <View style={styles.radiusSection}>
          <Text style={styles.radiusLabel}>📍 Radius: {radius} km</Text>
          <View style={styles.radiusBtns}>
            {[1, 5, 10, 25].map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.radiusBtn, radius === r && styles.radiusBtnActive]}
                onPress={() => setRadius(r)}
                activeOpacity={0.7}
              >
                <Text style={[styles.radiusBtnText, radius === r && styles.radiusBtnTextActive]}>{r} km</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {locationError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>📍 {locationError}</Text>
          <TouchableOpacity onPress={search} activeOpacity={0.7}>
            <Text style={styles.retryText}>{tr("Qayta urinish")}</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={people}
          keyExtractor={(item) => item.user.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.personCard}
              activeOpacity={0.7}
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
          ListHeaderComponent={
            people.length > 0 ? (
              <Text style={styles.resultCount}>{people.length} kishi yaqinda</Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📍</Text>
              <Text style={styles.emptyTitle}>{tr("Yaqinda hech kim topilmadi")}</Text>
              <Text style={styles.emptyHint}>{tr("Radiusni oshirib ko'ring")}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  controls: {
    backgroundColor: colors.surface,
    padding: 16,
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  visibilityRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  visibilityLabel: { flexDirection: "row", alignItems: "center", gap: 8 },
  controlIcon: { fontSize: 18 },
  controlLabelText: { fontSize: 15, fontWeight: "600", color: colors.text },
  radiusSection: { gap: 8 },
  radiusLabel: { fontSize: 14, fontWeight: "500", color: colors.text },
  radiusBtns: { flexDirection: "row", gap: 8 },
  radiusBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.background, alignItems: "center" },
  radiusBtnActive: { backgroundColor: colors.primary },
  radiusBtnText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  radiusBtnTextActive: { color: "#fff" },
  errorBanner: {
    backgroundColor: "#FFF3CD",
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    borderRadius: 10,
    marginTop: 8,
  },
  errorText: { fontSize: 13, color: "#856404", flex: 1 },
  retryText: { fontSize: 13, color: colors.primary, fontWeight: "600", marginLeft: 12 },
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 20 },
  resultCount: { fontSize: 13, color: colors.textSecondary, marginBottom: 8, marginTop: 8 },
  personCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 6,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  personInfo: { flex: 1 },
  personName: { fontSize: 15, fontWeight: "600", color: colors.text },
  personUsername: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  personBio: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  distanceContainer: { backgroundColor: colors.primary + "15", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  distanceText: { fontSize: 12, fontWeight: "600", color: colors.primary },
  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 6 },
  emptyHint: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
});
