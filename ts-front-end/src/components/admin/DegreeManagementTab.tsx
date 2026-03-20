import React from 'react';
import { Tab, Tabs } from 'react-bootstrap';

const DegreeManagementTab: React.FC = () => (
  <div className="py-3">
    <Tabs defaultActiveKey="degrees" className="mb-3">
      <Tab eventKey="degrees" title="Degrees">
        <p className="text-muted py-3">Degrees panel coming soon.</p>
      </Tab>
      <Tab eventKey="pools" title="Course Pools">
        <p className="text-muted py-3">Course pools panel coming soon.</p>
      </Tab>
      <Tab eventKey="courses" title="Courses">
        <p className="text-muted py-3">Courses panel coming soon.</p>
      </Tab>
    </Tabs>
  </div>
);

export default DegreeManagementTab;
