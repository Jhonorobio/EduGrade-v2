import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AcademicReport } from '../components/AcademicReport';
import { Assignment, StudentGradeRecord, Activity, AcademicSettings } from '../types';
import { db } from '../services/db';
import { useToast } from '../components/Toast';
import { Loader2 } from 'lucide-react';

interface ReportPageProps {
  academicSettings: AcademicSettings;
}

export function ReportPage({ academicSettings }: ReportPageProps) {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [gradeData, setGradeData] = useState<StudentGradeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!assignmentId) return;
      
      try {
        setLoading(true);
        // Get all assignments (base assignments)
        const baseAssignments = await db.getAssignments();
        
        // Try to find by direct ID first
        let found = baseAssignments.find(a => a.id === assignmentId);
        
        // If not found, it might be an exploded assignment ID (format: originalId_gradeLevelId)
        if (!found && assignmentId.includes('_')) {
          const [originalId] = assignmentId.split('_');
          found = baseAssignments.find(a => a.id === originalId);
          
          if (found) {
            // Extract the grade level ID from the composite ID
            const gradeLevelId = assignmentId.split('_')[1];
            // Filter students for this specific grade level
            found = {
              ...found,
              id: assignmentId, // Keep the composite ID
              originalId: originalId,
              gradeLevelId: gradeLevelId,
              gradeLevelIds: [gradeLevelId],
              students: found.students.filter(s => s.gradeLevelId === gradeLevelId),
              gradeLevel: found.gradeLevels?.find(gl => gl.id === gradeLevelId)
            };
          }
        }
        
        if (!found) {
          addToast('Asignación no encontrada', 'error');
          navigate('/dashboard');
          return;
        }
        
        setAssignment(found);
        const grades = await db.getAssignmentGrades(
          found.originalId || found.id,
          found.students,
          academicSettings
        );
        setGradeData(grades);
      } catch (error) {
        console.error(error);
        addToast('Error al cargar los datos del informe', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [assignmentId, academicSettings, addToast, navigate]);

  const handleSave = async (
    updatedGrades: StudentGradeRecord[],
    updatedTaskActivities: { [p: number]: Activity[] },
    updatedWorkshopActivities: { [p: number]: Activity[] }
  ) => {
    if (!assignment) return;
    const assignmentId = assignment.originalId || assignment.id;

    try {
      await Promise.all([
        db.saveGrades(assignmentId, updatedGrades),
        db.saveAssignmentActivities(assignmentId, updatedTaskActivities, updatedWorkshopActivities),
      ]);
      setGradeData(updatedGrades);
      setAssignment({
        ...assignment,
        taskActivities: updatedTaskActivities,
        workshopActivities: updatedWorkshopActivities,
      });
    } catch (error) {
      console.error('Failed to save report changes:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin text-neutral-600" size={48} />
      </div>
    );
  }

  if (!assignment) {
    return <p>Asignación no encontrada</p>;
  }

  return (
    <div className="flex-1 -m-6 flex flex-col overflow-hidden">
      <AcademicReport
        students={assignment.students}
        data={gradeData}
        taskActivities={assignment.taskActivities}
        workshopActivities={assignment.workshopActivities}
        onSave={handleSave}
        onBackToGradeBook={() => navigate(`/gradebook/${assignment.id}`)}
        assignment={assignment}
        academicSettings={academicSettings}
      />
    </div>
  );
}
