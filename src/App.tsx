import { Toaster as SonnerToaster } from "sonner";
import { Toaster } from "./components/ui/toaster";
import { ThemeProvider } from "./components/ThemeProvider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { Suspense, lazy } from "react";
import { LandingPage } from "./LandingPage";
import { ContactPage } from "./ContactPage";
import { HelpPage } from "./HelpPage";
import { PrivacyPolicyPage } from "./PrivacyPolicyPage";
import { TermsOfServicePage } from "./TermsOfServicePage";
import { SitemapPage } from "./SitemapPage";
import { StatusPage } from "./StatusPage";
import { RouteMetadataManager } from "./components/RouteMetadataManager";
import { AppErrorBoundary } from "./components/AppErrorBoundary";

const AuthPage = lazy(async () => {
  const module = await import("./AuthPage");
  return { default: module.AuthPage };
});

const ForgotPasswordPage = lazy(async () => {
  const module = await import("./ForgotPasswordPage");
  return { default: module.ForgotPasswordPage };
});

const ResetPasswordPage = lazy(async () => {
  const module = await import("./ResetPasswordPage");
  return { default: module.ResetPasswordPage };
});

const AppLayout = lazy(async () => {
  const module = await import("./AppLayout");
  return { default: module.AppLayout };
});

const GalaxyDashboard = lazy(async () => {
  const module = await import("./components/GalaxyDashboard");
  return { default: module.GalaxyDashboard };
});

const TimelinePage = lazy(async () => {
  const module = await import("./components/timeline/TimelinePage");
  return { default: module.TimelinePage };
});

const MissionsPage = lazy(async () => {
  const module = await import("./components/MissionsPage");
  return { default: module.MissionsPage };
});

const AchievementsPage = lazy(async () => {
  const module = await import("./components/AchievementsPage");
  return { default: module.AchievementsPage };
});

const SkillsPage = lazy(async () => {
  const module = await import("./components/SkillsPage");
  return { default: module.SkillsPage };
});

const ResumePage = lazy(async () => {
  const module = await import("./components/ResumePage");
  return { default: module.ResumePage };
});

const ArcConnectPage = lazy(async () => {
  const module = await import("./components/ArcConnectPage");
  return { default: module.ArcConnectPage };
});

const GoalDetailWrapper = lazy(async () => {
  const module = await import("./GoalDetailWrapper");
  return { default: module.GoalDetailWrapper };
});

const LeaderboardPage = lazy(async () => {
  const module = await import("./LeaderboardPage");
  return { default: module.LeaderboardPage };
});

const SettingsPage = lazy(async () => {
  const module = await import("./SettingsPage");
  return { default: module.SettingsPage };
});

const BlogPage = lazy(async () => {
  const module = await import("./BlogPage");
  return { default: module.BlogPage };
});

const BlogPostPage = lazy(async () => {
  const module = await import("./BlogPostPage");
  return { default: module.BlogPostPage };
});

const PublicProfilePage = lazy(async () => {
  const module = await import("./PublicProfilePage");
  return { default: module.PublicProfilePage };
});

const NotFoundPage = lazy(async () => {
  const module = await import("./NotFoundPage");
  return { default: module.NotFoundPage };
});

const EmailTrackingDashboard = lazy(async () => {
  const module = await import("./components/EmailTrackingDashboard");
  return { default: module.EmailTrackingDashboard };
});

const AdminPage = lazy(async () => {
  const module = await import("./AdminPage");
  return { default: module.AdminPage };
});

function RouteLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-space-900)]">
      <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-[var(--accent-cyan)]" />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="daybridge-theme">
      <Router>
        <RouteMetadataManager />
        <AppShell />
      </Router>
    </ThemeProvider>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<AppLayout />}>
          {/* /dashboard shows the Day Map visual view (used by tutorial). /missions is the default landing view. */}
          <Route path="/dashboard" element={<GalaxyDashboard />} />
          <Route path="/missions" element={<MissionsPage />} />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="/resume" element={<ResumePage />} />
          <Route path="/connect" element={<ArcConnectPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/goal/:goalId" element={<GoalDetailWrapper />} />
        </Route>
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/email-tracking" element={<EmailTrackingDashboard />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:postId" element={<BlogPostPage />} />
        <Route path="/profile/:userId" element={<PublicProfilePage />} />
        <Route path="/sitemap" element={<SitemapPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

function RoutedAppContent() {
  const location = useLocation();

  return (
    <AppErrorBoundary resetKey={location.pathname}>
      <AppRoutes />
    </AppErrorBoundary>
  );
}

export function AppShell() {
  return (
    <div className="min-h-screen bg-[var(--bg-space-900)] text-[var(--star)]">
      <Toaster />
      <SonnerToaster 
        position="bottom-left"
        duration={3000}
        theme="dark"
        toastOptions={{
          style: {
            background: '#000000',
            color: '#ffffff',
            border: '1px solid #333333',
          },
        }}
      />
      <RoutedAppContent />
      <Analytics mode={import.meta.env.PROD ? "production" : "development"} />
      <SpeedInsights />
    </div>
  );
}
