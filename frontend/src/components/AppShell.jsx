import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import ConnectionBanner from "./ConnectionBanner";

export default function AppShell({ currentPath, navigate, connected, checking, error, lastChecked, onRefresh, title, subtitle, children }) {
  return (
    <div className="app-shell">
      <Sidebar currentPath={currentPath} navigate={navigate} />
      <div className="main-shell">
        <Topbar
          connected={connected}
          title={title}
          subtitle={subtitle}
          lastChecked={lastChecked}
          onRefresh={onRefresh}
        />
        <main className="page-content">
          <ConnectionBanner connected={connected} checking={checking} error={error} />
          {children}
        </main>
      </div>
    </div>
  );
}
