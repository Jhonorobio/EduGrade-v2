import React from 'react';
import { Navigate } from 'react-router-dom';
import GroupDirectorDashboard from '../components/GroupDirectorDashboard';
import { GradeLevel, AcademicSettings } from '../types';

interface GroupDirectorPageProps {
  directedGrade: GradeLevel | null;
  academicSettings: AcademicSettings;
}

export function GroupDirectorPage({ directedGrade, academicSettings }: GroupDirectorPageProps) {
  if (!directedGrade) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex-1 -m-6 flex flex-col overflow-hidden">
      <GroupDirectorDashboard gradeLevel={directedGrade} academicSettings={academicSettings} />
    </div>
  );
}
