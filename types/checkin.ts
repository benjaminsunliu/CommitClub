type CheckInStatus = "done" | "partial" | "missed";

type CheckIn = {
  id: string;
  userId: string;
  podId: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  status: CheckInStatus;
  createdAt: string;
};