import { apiClient } from "./client";
import { ReportReason } from "../types";

export interface CreateReportInput {
  reportedUserId: string;
  conversationId?: string;
  messageId?: string;
  reason: ReportReason;
  description?: string;
}

export const reportsApi = {
  create(input: CreateReportInput) {
    return apiClient.post("/reports", input);
  },
};
