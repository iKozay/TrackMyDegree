import React, { useState } from "react";
import { Container, Tab, Tabs } from "react-bootstrap";
import { useAuth } from "../hooks/useAuth";
import MetricsTab from "../components/admin/MetricsTab";
import DegreeManagementTab from "../components/admin/DegreeManagementTab";
import UserManagementTab from "../components/admin/UserManagementTab";
import SeedingTab from "../components/admin/SeedingTab";

type AdminTab = "metrics" | "degrees" | "users" | "seeding";

const AdminPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("metrics");

  if (!isAuthenticated) {
    return <p>Please log in to see your data.</p>;
  }

  return (
    <Container fluid className="py-4">
      <div className="mb-4">
        <h2 className="mb-0">Admin Dashboard</h2>
        <small className="text-muted">Manage users, degrees, courses and database</small>
      </div>
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab((k ?? "metrics") as AdminTab)}
        className="mb-3"
      >
        <Tab eventKey="metrics" title="Metrics & Stats">
          <MetricsTab />
        </Tab>
        <Tab eventKey="degrees" title="Degrees & Courses">
          <DegreeManagementTab />
        </Tab>
        <Tab eventKey="users" title="Manage Users">
          <UserManagementTab />
        </Tab>
        <Tab eventKey="seeding" title="Seed Database">
          <SeedingTab />
        </Tab>
      </Tabs>
    </Container>
  );
};

export default AdminPage;
