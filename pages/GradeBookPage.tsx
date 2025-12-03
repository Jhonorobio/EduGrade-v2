import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GradeBook } from '../components/GradeBook';
import { Assignment, StudentGradeRecord, Activity, AcademicSettings } from '../types';
import { db } from '../services/db';
import { useToast } from '../components/Toast';
import { Loader2 } from 'lucide-react';

interface GradeBookPageProps {
  academicSettings: AcademicSettings;
}

export function GradeBookPage({ academicSettings }: GradeBookPageProps) {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [gradeData, setGradeData] = useState<StudentGradeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  console.log('🎯 GradeBookPage mounted with assignmentId:', assignmentId);

  useEffect(() => {
    const loadData = async () => {
      if (!assignmentId) {
        console.log('⚠️ No assignmentId provided');
        return;
      }
      
      console.log('🚀 Starting loadData with assignmentId:', assignmentId);
      
      try {
        setLoading(true);
        // Get all assignments (base assignments)
        console.log('📡 Fetching assignments from db...');
        const baseAssignments = await db.getAssignments();
        console.log('✅ Received assignments:', baseAssignments.length);
        
        console.log('🔍 Looking for assignmentId:', assignmentId);
        console.log('📦 Available assignments:', baseAssignments.map(a => ({ id: a.id, subject: a.subject?.name })));
        
        // Try to find by direct ID first
        let found = baseAssignments.find(a => a.id === assignmentId);
        
        console.log('✅ Found by direct ID:', found ? 'YES' : 'NO');
        
        // If not found, it might be an exploded assignment ID (format: originalId_gradeLevelId)
        if (!found && assignmentId.includes('_')) {
          console.log('🔄 Trying to parse composite ID...');
          const [originalId] = assignmentId.split('_');
          console.log('🔑 Original ID:', originalId);
          found = baseAssignments.find(a => a.id === originalId);
          
          if (found) {
            console.log('✅ Found base assignment:', found.subject?.name);
            // Extract the grade level ID from the composite ID
            const gradeLevelId = assignmentId.split('_')[1];
            console.log('🎓 Grade Level ID:', gradeLevelId);
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
            console.log('👥 Filtered students:', found.students.length);
          }
        }
        
        if (!found) {
          console.error('❌ Assignment not found!');
          addToast('Asignación no encontrada', 'error');
          navigate('/dashboard');
          return;
        }
        
        console.log('✅ Final assignment:', { id: found.id, students: found.students.length });
        
        setAssignment(found);
        const grades = await db.getAssignmentGrades(
          found.originalId || found.id,
          found.students,
          academicSettings
        );
        setGradeData(grades);
      } catch (error) {
        console.error('💥 Error in loadData:', error);
        addToast('Error al cargar las calificaciones', 'error');
      } finally {
        console.log('🏁 Finished loading (success or error)');
        setLoading(false);
      }
    };

    console.log('🎬 About to call loadData()');
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
      console.error('Failed to save gradebook changes:', error);
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
    <div className="flex-1 -m-6 flex flex-col overflow-auto">
      <GradeBook
        key={assignment.id}
        assignmentId={assignment.id}
        students={assignment.students}
        data={gradeData}
        taskActivities={assignment.taskActivities}
        workshopActivities={assignment.workshopActivities}
        onSave={handleSave}
        onViewReport={() => navigate(`/report/${assignment.id}`)}
        academicSettings={academicSettings}
      />
    </div>
  );
}
