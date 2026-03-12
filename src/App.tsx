import { Routes, Route } from "react-router";
import { BottomNav } from "@/components/layout/BottomNav";
import { ChatProvider } from "@/lib/ai/ChatProvider";
import { HomePage } from "@/pages/HomePage";
import { HabitsPage } from "@/pages/HabitsPage";
import { ChecklistPage } from "@/pages/ChecklistPage";
import { FoodPage } from "@/pages/FoodPage";
import { CalendarPage } from "@/pages/CalendarPage";
import { SettingsPage } from "@/pages/SettingsPage";

export function App() {
  return (
    <ChatProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/habits" element={<HabitsPage />} />
        <Route path="/checklist" element={<ChecklistPage />} />
        <Route path="/food" element={<FoodPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <BottomNav />
    </ChatProvider>
  );
}
