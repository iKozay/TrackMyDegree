import React, { useState } from "react";
import { Container, Tab, Tabs } from "react-bootstrap";
import { useAuth } from "../hooks/useAuth";
import MetricsTab from "../components/admin/MetricsTab";
import DegreeManagementTab from "../components/admin/DegreeManagementTab";
import UserManagementTab from "../components/admin/UserManagementTab";
import SeedingTab from "../components/admin/SeedingTab";
import BackupManagementTab from "../components/admin/BackupManagementTab";

type AdminTab =
  | "metrics"
  | "degrees"
  | "users"
  | "seeding"
  | "backups";

const AdminPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("metrics");
  // Increment this key each time the degrees tab is activated to force a fresh fetch.
  const [degreeTabKey, setDegreeTabKey] = useState(0);

  if (!isAuthenticated) {
    return <p>Please log in to see your data.</p>;
  }

  const handleTabSelect = (k: string | null) => {
    const tab = (k ?? "metrics") as AdminTab;
    if (tab === "degrees") setDegreeTabKey((n) => n + 1);
    setActiveTab(tab);
  };

  return (
    <Container fluid className="py-4">
      <div className="mb-4">
        <h2 className="mb-0">Admin Dashboard</h2>
        <small className="text-muted">Manage users, degrees, courses and database</small>
      </div>
      <Tabs
        activeKey={activeTab}
        onSelect={handleTabSelect}
        className="mb-3"
        mountOnEnter
      >
        <Tab eventKey="metrics" title="Metrics & Stats">
          <MetricsTab />
        </Tab>
        <Tab eventKey="degrees" title="Degrees & Courses">
          <DegreeManagementTab key={degreeTabKey} />
        </Tab>
        <Tab eventKey="users" title="Manage Users">
          <UserManagementTab />
        </Tab>
        <Tab eventKey="seeding" title="Seed Database">
          <SeedingTab />
        </Tab>
        <Tab eventKey="backups" title="Backups">
          <BackupManagementTab />
        </Tab>
      </Tabs>
    </Container>
  );
};

export default AdminPage;
