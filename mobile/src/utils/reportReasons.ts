import { ReportReason } from "../types";

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "SPAM", label: "Spam" },
  { value: "HARASSMENT", label: "Tazyiq/bezovta qilish" },
  { value: "VIOLENCE", label: "Zo'ravonlik" },
  { value: "ILLEGAL_CONTENT", label: "Noqonuniy kontent" },
  { value: "IMPERSONATION", label: "Soxta profil" },
  { value: "OTHER", label: "Boshqa" },
];
