import React, { useState } from "react";
import { Container, Tab, Tabs } from "react-bootstrap";
import { useAuth } from "../hooks/useAuth";

type AdminTab = "metrics" | "degrees" | "users" | "seeding";

const AdminPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("metrics");

  if (!isAuthenticated) {
    return <p>Please log in to see your data.</p>;
  }

  return (
    <Container fluid className="py-4">
      <h2 className="mb-4">Admin Dashboard</h2>
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab((k ?? "metrics") as AdminTab)}
        className="mb-3"
      >
        <Tab eventKey="metrics" title="Metrics & Stats" />
        <Tab eventKey="degrees" title="Degrees & Courses" />
        <Tab eventKey="users" title="Manage Users" />
        <Tab eventKey="seeding" title="Seed Database" />
      </Tabs>
    </Container>
  );
};

export default AdminPage;
