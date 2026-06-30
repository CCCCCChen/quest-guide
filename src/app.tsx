import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import NotFoundPage from "@/pages/NotFoundPage/NotFoundPage";
import TodayPage from "@/pages/Today/TodayPage";
import QuestPoolPage from "@/pages/QuestPool/QuestPoolPage";
import SkillTreePage from "@/pages/SkillTree/SkillTreePage";
import ShopPage from "@/pages/Shop/ShopPage";
import StatsPage from "@/pages/Stats/StatsPage";
import SettingsPage from "@/pages/Settings/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<TodayPage />} />
        <Route path="quest-pool" element={<QuestPoolPage />} />
        <Route path="skill-tree" element={<SkillTreePage />} />
        <Route path="shop" element={<ShopPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
