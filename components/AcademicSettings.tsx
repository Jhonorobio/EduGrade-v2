import React, { useState, useEffect } from 'react';
import { Loader2, Save, AlertCircle } from 'lucide-react';
import { db } from '../services/db';
import { AcademicSettings as AcademicSettingsType } from '../types';
import { useToast } from './Toast';

const AcademicSettings: React.FC = () => {
  const [settings, setSettings] = useState<AcademicSettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const { settings: data } = await db.getAcademicSettings();
        setSettings(data);
      } catch (error) {
        addToast('Error al cargar los ajustes.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [addToast]);

  const handlePeriodCountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCount = parseInt(e.target.value, 10);
    if (!settings || newCount === settings.periodCount) return;

    const newWeights: { [p: number]: number } = {};
    const equalWeight = Math.floor(100 / newCount);
    for (let i = 1; i <= newCount; i++) {
        newWeights[i] = equalWeight;
    }
    // Distribute remainder
    let remainder = 100 - (equalWeight * newCount);
    for (let i = 1; i <= remainder; i++) {
        newWeights[i]++;
    }

    setSettings({
        periodCount: newCount,
        periodWeights: newWeights,
    });
  };

  const handleWeightChange = (period: number, value: string) => {
    if (!settings) return;
    const newWeight = parseInt(value, 10);
    if (isNaN(newWeight) || newWeight < 0 || newWeight > 100) return;
    
    setSettings({
        ...settings,
        periodWeights: {
            ...settings.periodWeights,
            [period]: newWeight,
        },
    });
  };
  
  const handleSave = async () => {
    if (!settings) return;
    
    const totalWeight = Object.values(settings.periodWeights).reduce((sum: number, weight) => sum + Number(weight), 0);
    if (totalWeight !== 100) {
        addToast('La suma de los porcentajes debe ser exactamente 100%.', 'error');
        return;
    }

    setSaving(true);
    try {
        await db.saveAcademicSettings(settings);
        addToast('Ajustes guardados con éxito.', 'success');
    } catch (error: any) {
        console.error("Error saving academic settings:", error);

        if (error?.code === '42501' || error?.message?.toLowerCase().includes('unauthorized')) {
            addToast("Error de autorización: Revise los permisos (RLS) en la tabla 'settings' de Supabase.", 'error');
        } else if (error?.code === '42703' || error?.message?.includes('column')) {
            // Handle schema mismatch errors (e.g., missing 'period_count' or 'period_weights' column)
            addToast("Error de esquema: asegúrese de que la tabla 'settings' tenga columnas 'period_count' (integer) y 'period_weights' (jsonb).", 'error');
        } else {
            // Generic error for other issues
            const message = error instanceof Error ? `Error al guardar: ${error.message}` : 'Error desconocido al guardar los ajustes.';
            addToast(message, 'error');
        }
    } finally {
        setSaving(false);
    }
  };

  if (loading || !settings) {
    return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={48} /></div>;
  }
  
  const totalWeight = Object.values(settings.periodWeights).reduce((sum: number, weight) => sum + Number(weight), 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border h-full">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold text-slate-800">Ajustes Académicos</h2>
        <p className="text-sm text-slate-500">Configura los periodos y ponderaciones para el año lectivo.</p>
      </div>
      <div className="p-6 space-y-8">
        <div>
          <h3 className="text-lg font-semibold text-slate-700">Número de Periodos</h3>
          <p className="text-sm text-slate-500 mb-2">Selecciona cuántos periodos tendrá el año lectivo. Esto reajustará las ponderaciones.</p>
          <select 
            value={settings.periodCount}
            onChange={handlePeriodCountChange}
            className="p-2 border rounded-md bg-white w-full max-w-xs"
          >
            <option value="2">2 Periodos (Semestral)</option>
            <option value="3">3 Periodos (Trimestral)</option>
            <option value="4">4 Periodos (Bimestral)</option>
          </select>
        </div>
        
        <div>
           <h3 className="text-lg font-semibold text-slate-700">Ponderación de Periodos</h3>
           <p className="text-sm text-slate-500 mb-4">Asigna el porcentaje de la nota final para cada periodo. La suma debe ser 100%.</p>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: settings.periodCount }, (_, i) => i + 1).map(period => (
                <div key={period}>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Periodo {period}</label>
                  <div className="relative">
                    <input 
                      type="number"
                      value={settings.periodWeights[period] || 0}
                      onChange={(e) => handleWeightChange(period, e.target.value)}
                      className="w-full p-2 border rounded-md"
                    />
                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-slate-400">%</span>
                  </div>
                </div>
              ))}
           </div>
           <div className={`mt-4 text-sm font-semibold flex items-center gap-2 ${totalWeight === 100 ? 'text-green-600' : 'text-red-600'}`}>
              {totalWeight !== 100 && <AlertCircle size={16} />}
              <span>Suma Total: {totalWeight}%</span>
           </div>
        </div>
      </div>
       <div className="p-4 border-t bg-slate-50 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || totalWeight !== 100}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />}
            Guardar Cambios
          </button>
       </div>
    </div>
  );
};

export default AcademicSettings;