import React, { useState, useEffect } from 'react';
import { Loader2, Save, AlertCircle } from 'lucide-react';
import { db } from '../services/db';
import { AcademicSettings as AcademicSettingsType } from '../types';
import { useToast } from './Toast';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';

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
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Ajustes Académicos</CardTitle>
        <CardDescription>Configura los periodos y ponderaciones para el año lectivo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-700">Número de Periodos</h3>
            <p className="text-sm text-muted-foreground mb-3">Selecciona cuántos periodos tendrá el año lectivo. Esto reajustará las ponderaciones.</p>
            <Select 
              value={settings.periodCount.toString()}
              onValueChange={(value) => handlePeriodCountChange({ target: { value } } as any)}
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 Periodos (Semestral)</SelectItem>
                <SelectItem value="3">3 Periodos (Trimestral)</SelectItem>
                <SelectItem value="4">4 Periodos (Bimestral)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-4">
           <div>
             <h3 className="text-lg font-semibold text-slate-700">Ponderación de Periodos</h3>
             <p className="text-sm text-muted-foreground mb-4">Asigna el porcentaje de la nota final para cada periodo. La suma debe ser 100%.</p>
           </div>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: settings.periodCount }, (_, i) => i + 1).map(period => (
                <div key={period} className="space-y-2">
                  <Label htmlFor={`period-${period}`}>Periodo {period}</Label>
                  <div className="relative">
                    <Input 
                      id={`period-${period}`}
                      type="number"
                      value={settings.periodWeights[period] || 0}
                      onChange={(e) => handleWeightChange(period, e.target.value)}
                      className="pr-8"
                    />
                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-muted-foreground pointer-events-none">%</span>
                  </div>
                </div>
              ))}
           </div>
           {totalWeight !== 100 ? (
             <Alert variant="destructive">
               <AlertCircle className="h-4 w-4" />
               <AlertDescription>
                 Suma Total: {totalWeight}% - La suma debe ser exactamente 100%
               </AlertDescription>
             </Alert>
           ) : (
             <Alert className="border-green-200 bg-green-50 text-green-800">
               <AlertDescription className="flex items-center gap-2">
                 <span className="font-semibold">✓ Suma Total: {totalWeight}%</span>
               </AlertDescription>
             </Alert>
           )}
        </div>
      </CardContent>
      <CardFooter className="bg-slate-50 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving || totalWeight !== 100}
          className="gap-2"
        >
          {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />}
          Guardar Cambios
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AcademicSettings;