import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";
import { useApiClient } from "../../hooks/useApiClient";
import { Loader2, Upload, Plus, Trash2, Edit2, Settings, Save } from "lucide-react";

type EquipmentData = {
  type: string;
  models: string[];
};

export function EquipmentManagement() {
  const [equipment, setEquipment] = useState<EquipmentData[]>([]);
  const [savedEquipment, setSavedEquipment] = useState<EquipmentData[]>([]);
  const [newEquipmentType, setNewEquipmentType] = useState("");
  const [newModel, setNewModel] = useState("");
  const [selectedEquipmentIndex, setSelectedEquipmentIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [csvInput, setCsvInput] = useState("");
  const { apiGet, apiPost } = useApiClient();

  const hasUnsavedChanges = JSON.stringify(equipment) !== JSON.stringify(savedEquipment);

  useEffect(() => {
    loadEquipment();
  }, []);

  const loadEquipment = async () => {
    setIsLoading(true);
    try {
      const data = await apiGet('/equipment');
      setEquipment(data.equipment || []);
      setSavedEquipment(data.equipment || []);
    } catch (error) {
      console.error("Error loading equipment:", error);
      toast.error("Failed to load equipment");
    } finally {
      setIsLoading(false);
    }
  };

  const saveEquipment = async (updatedEquipment?: EquipmentData[]) => {
    const equipmentToSave = updatedEquipment || equipment;
    setIsSaving(true);
    try {
      console.log('Saving equipment:', equipmentToSave);
      const response = await apiPost('/equipment', { equipment: equipmentToSave });
      console.log('Save equipment response:', response);
      
      // Reload from server to verify save
      await loadEquipment();
      toast.success("Equipment saved successfully!");
    } catch (error) {
      console.error("Error saving equipment:", error);
      toast.error(`Failed to save equipment: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddEquipmentType = () => {
    if (!newEquipmentType.trim()) {
      toast.error("Please enter an equipment type");
      return;
    }

    if (equipment.some(e => e.type === newEquipmentType.trim())) {
      toast.error("Equipment type already exists");
      return;
    }

    const updatedEquipment = [...equipment, { type: newEquipmentType.trim(), models: [] }];
    setEquipment(updatedEquipment);
    setNewEquipmentType("");
  };

  const handleRemoveEquipmentType = (index: number) => {
    const updatedEquipment = equipment.filter((_, i) => i !== index);
    setEquipment(updatedEquipment);
    if (selectedEquipmentIndex === index) {
      setSelectedEquipmentIndex(null);
    }
  };

  const handleAddModel = () => {
    if (selectedEquipmentIndex === null) {
      toast.error("Please select an equipment type first");
      return;
    }

    if (!newModel.trim()) {
      toast.error("Please enter a model name");
      return;
    }

    const updatedEquipment = [...equipment];
    const models = updatedEquipment[selectedEquipmentIndex].models;

    if (models.includes(newModel.trim())) {
      toast.error("Model already exists for this equipment type");
      return;
    }

    updatedEquipment[selectedEquipmentIndex].models = [...models, newModel.trim()];
    setEquipment(updatedEquipment);
    setNewModel("");
  };

  const handleRemoveModel = (equipmentIndex: number, modelIndex: number) => {
    const updatedEquipment = [...equipment];
    updatedEquipment[equipmentIndex].models = updatedEquipment[equipmentIndex].models.filter(
      (_, i) => i !== modelIndex
    );
    setEquipment(updatedEquipment);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvInput(text);
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (csv: string) => {
    const lines = csv.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length === 0) {
      toast.error("No valid data found in CSV");
      return;
    }

    const newEquipment: EquipmentData[] = [];

    for (const line of lines) {
      const parts = line.split(',').map(part => part.trim()).filter(part => part);
      
      if (parts.length < 2) continue;

      const type = parts[0];
      const models = parts.slice(1);

      const existingIndex = newEquipment.findIndex(e => e.type === type);
      if (existingIndex >= 0) {
        // Add models to existing type
        newEquipment[existingIndex].models = Array.from(
          new Set([...newEquipment[existingIndex].models, ...models])
        );
      } else {
        newEquipment.push({ type, models });
      }
    }

    // Merge with existing equipment
    const mergedEquipment = [...equipment];
    for (const newItem of newEquipment) {
      const existingIndex = mergedEquipment.findIndex(e => e.type === newItem.type);
      if (existingIndex >= 0) {
        mergedEquipment[existingIndex].models = Array.from(
          new Set([...mergedEquipment[existingIndex].models, ...newItem.models])
        );
      } else {
        mergedEquipment.push(newItem);
      }
    }

    saveEquipment(mergedEquipment);
    setCsvInput("");
  };

  const handleManualCSVParse = () => {
    if (!csvInput.trim()) {
      toast.error("Please enter equipment data");
      return;
    }
    parseCSV(csvInput);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Manage Equipment</h2>
        <Button 
          onClick={() => saveEquipment()} 
          disabled={isSaving || !hasUnsavedChanges}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Equipment
            </>
          )}
        </Button>
      </div>
      <p className="text-sm text-gray-600 mb-6">
        Add equipment types and their models. This data will populate the dropdowns in the Owned Equipment form.
        {hasUnsavedChanges && (
          <span className="ml-2 text-orange-600 font-semibold">● Unsaved changes</span>
        )}
      </p>

      <div className="space-y-8">
        {/* Add Equipment Type */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Add Equipment Type</h3>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Enter equipment type (e.g., Excavator, Crane)"
                value={newEquipmentType}
                onChange={(e) => setNewEquipmentType(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddEquipmentType();
                  }
                }}
              />
            </div>
            <Button onClick={handleAddEquipmentType} disabled={isSaving}>
              <Plus className="w-4 h-4 mr-2" />
              Add Type
            </Button>
          </div>
        </div>

        {/* Upload CSV */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Upload CSV or Enter Multiple</h3>
          <div className="space-y-2">
            <Label htmlFor="csv-upload">Upload CSV File</Label>
            <Input
              id="csv-upload"
              type="file"
              accept=".csv,.txt"
              onChange={handleCSVUpload}
              disabled={isSaving}
            />
            <p className="text-xs text-gray-500">
              Format: Equipment Type, Model1, Model2, Model3 (one equipment type per line)
            </p>
            <p className="text-xs text-blue-600">
              💡 Tip: Convert Excel tables to CSV in Excel → File → Save As → CSV
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="csv-input">Or Enter CSV Data Manually</Label>
            <Textarea
              id="csv-input"
              placeholder="Excavator, CAT 320, CAT 330, JCB 220&#10;Crane, Liebherr LTM 1100, Tadano GR-600XL&#10;Dump Truck, Volvo A40G, CAT 740"
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              rows={5}
            />
            <Button onClick={handleManualCSVParse} disabled={isSaving} variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Import Equipment
            </Button>
          </div>
        </div>

        {/* Current Equipment */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Current Equipment</h3>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : equipment.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No equipment added yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Equipment Types List */}
              <div className="border border-gray-200 rounded-lg">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <h4 className="font-semibold text-sm text-gray-900">Equipment Types</h4>
                </div>
                <div className="divide-y divide-gray-200">
                  {equipment.map((eq, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 ${
                        selectedEquipmentIndex === index ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedEquipmentIndex(index)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-900">{eq.type}</span>
                        <span className="text-xs text-gray-500">({eq.models.length} models)</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveEquipmentType(index);
                        }}
                        disabled={isSaving}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Models for Selected Equipment */}
              <div className="border border-gray-200 rounded-lg">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <h4 className="font-semibold text-sm text-gray-900">
                    {selectedEquipmentIndex !== null
                      ? `Models for ${equipment[selectedEquipmentIndex].type}`
                      : 'Select an equipment type'}
                  </h4>
                </div>
                {selectedEquipmentIndex !== null ? (
                  <>
                    <div className="p-3 border-b border-gray-200">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter model name"
                          value={newModel}
                          onChange={(e) => setNewModel(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleAddModel();
                            }
                          }}
                        />
                        <Button onClick={handleAddModel} disabled={isSaving} size="sm">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
                      {equipment[selectedEquipmentIndex].models.length === 0 ? (
                        <p className="text-sm text-gray-500 p-3">No models added yet.</p>
                      ) : (
                        equipment[selectedEquipmentIndex].models.map((model, modelIndex) => (
                          <div
                            key={modelIndex}
                            className="flex items-center justify-between p-2 hover:bg-gray-50"
                          >
                            <span className="text-sm text-gray-900">{model}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveModel(selectedEquipmentIndex, modelIndex)}
                              disabled={isSaving}
                            >
                              <Trash2 className="w-3 h-3 text-red-600" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center text-sm text-gray-500">
                    Select an equipment type to view and manage its models
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}